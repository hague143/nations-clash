const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const FX=require(path.join(root,'browser/src/power-fx.js'));
const {POWERS}=require(path.join(root,'browser/src/powers.js'));

test('projectile geometry uses the exact world collision circle in either direction',()=>{
  for(const facing of [-1,1])for(const power of Object.values(POWERS)){
    const p={x:-1.73,y:1.92,radius:.2,facing,powerId:power.id};
    const actual=FX.projectileGeometry(p,{originX:604,floor:613,pixelsPerUnit:78});
    assert.equal(actual.x,604+p.x*78);assert.equal(actual.y,613-p.y*78);assert.equal(actual.radius,p.radius*78);
    assert.deepEqual(actual.world,{x:p.x,y:p.y,radius:p.radius});
  }
  for(const p of [{x:NaN,y:1},{x:1,y:Infinity},{x:0,y:0,radius:-1},{x:0,y:0,radius:NaN}])assert.equal(FX.projectileGeometry(p),null);
  assert.equal(FX.drawProjectile(null,{x:0,y:1},POWERS.pk),null);
  assert.equal(FX.drawCharge(null,{x:0,y:1},POWERS.pk),null);
  assert.equal(FX.drawImpact(null,{x:0,y:1},POWERS.pk),null);
});

test('real Canvas powers are distinct, aligned, bounded, deterministic and preserve state',{timeout:60000},async()=>{
  const {chromium}=require('playwright');
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1320,height:1050},deviceScaleFactor:1}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const source=['powers','power-fx'].map(name=>fs.readFileSync(path.join(root,'browser/src',name+'.js'),'utf8')).join('\n;\n');
    await page.setContent(`<style>body{margin:0;background:#081521;color:#e9f8ff;font:14px system-ui;padding:30px}h1{font-size:25px;margin:0 0 8px}p{color:#adc4d6;margin:0 0 24px}#grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}article{background:linear-gradient(135deg,#102a40,#0a1527);border:1px solid #315064;border-radius:14px;overflow:hidden}canvas{display:block;width:100%}label{display:block;padding:0 16px 16px;font-size:13px;letter-spacing:.06em}small{display:block;color:#8faec6;margin-top:4px;font-size:11px}</style><h1>World signatures · nine materials, 196 powers</h1><p>Charge · live collision core and short wake · impact · shield deflection</p><div id="grid"></div><script>${source}</script>`);
    const checks=await page.evaluate(()=>{
      const FX=NationPowerFX,powers=Object.values(NationPowers.POWERS),canvas=document.createElement('canvas');canvas.width=400;canvas.height=240;
      const ctx=canvas.getContext('2d',{willReadFrequently:true}),view={floor:190,originX:200,pixelsPerUnit:78,time:1.25,frame:75};
      const projectile={x:0,y:1.1,radius:.2,facing:1,age:23};
      const raster=(p,changes={},v={})=>{ctx.clearRect(0,0,400,240);FX.drawProjectile(ctx,{...projectile,...changes},p,{...view,...v});return ctx.getImageData(0,0,400,240).data;};
      const key=data=>{let hash=2166136261;for(let i=0;i<data.length;i++)hash=Math.imul(hash^data[i],16777619);return hash>>>0;};
      const hashes=powers.map(p=>key(raster(p))),materialHashes=[],bounds=[];
      for(const kind of FX.KINDS){
        const p=powers.find(p=>p.kind===kind),data=raster(p),core=FX.projectileGeometry(projectile,view);materialHashes.push(key(data));
        let maxDistance=0,opaque=0;
        for(let y=0;y<240;y++)for(let x=0;x<400;x++)if(data[(y*400+x)*4+3]>200){opaque++;maxDistance=Math.max(maxDistance,Math.hypot(x+.5-core.x,y+.5-core.y));}
        const centerAlpha=data[(Math.floor(core.y)*400+Math.floor(core.x))*4+3];
        bounds.push({kind,maxDistance,radius:core.radius,opaque,centerAlpha});
        const article=document.createElement('article'),tile=document.createElement('canvas');tile.width=400;tile.height=240;article.appendChild(tile);
        const t=tile.getContext('2d'),v={floor:190,originX:0,pixelsPerUnit:110,time:2.3,frame:138};
        t.fillStyle='rgba(134,190,220,.07)';t.fillRect(22,188,356,1);
        FX.drawCharge(t,{x:0,y:0,facing:1,moveFrame:14,move:{start:20,height:1.1},data:{id:p.id}},p,{...v,originX:35,hand:{x:0,y:.84}});
        FX.drawProjectile(t,{x:0,y:.84,radius:.31,facing:1,age:28},p,{...v,originX:145});
        FX.drawImpact(t,{x:0,y:.84,life:24,type:'signature',facing:1},p,{...v,originX:258});
        FX.drawImpact(t,{x:0,y:.84,life:27,type:'signature',kind:'block',facing:1},p,{...v,originX:344});
        const label=document.createElement('label');label.textContent=kind.toUpperCase()+' · '+p.name;const small=document.createElement('small');small.textContent=p.motif;label.appendChild(small);article.appendChild(label);document.getElementById('grid').appendChild(article);
      }
      const p=NationPowers.get('ir'),first=key(raster(p)),again=key(raster(p)),later=key(raster(p,{age:85},{time:8}));
      const stillA=key(raster(p,{age:20},{time:1,reducedMotion:true})),stillB=key(raster(p,{age:85},{time:8,reducedMotion:true}));
      const right=raster(p),left=raster(p,{facing:-1});let mirrorError=0;
      // Compare premultiplied color: invisible RGB at almost-zero alpha is not
      // perceptually meaningful and can vary with the browser's raster rounding.
      for(let y=0;y<240;y++)for(let x=0;x<400;x++){
        const a=(y*400+x)*4,b=(y*400+399-x)*4;
        for(let k=0;k<3;k++)mirrorError+=Math.abs(right[a+k]*right[a+3]/255-left[b+k]*left[b+3]/255);
        mirrorError+=Math.abs(right[a+3]-left[b+3]);
      }
      mirrorError/=right.length;
      ctx.clearRect(0,0,400,240);ctx.translate(7,3);ctx.scale(1.2,.9);ctx.globalAlpha=.73;ctx.globalCompositeOperation='xor';ctx.lineWidth=7;ctx.strokeStyle='#e477a1';ctx.fillStyle='#bc9876';ctx.lineCap='square';ctx.shadowColor='#aaccdd';ctx.shadowBlur=2;
      const snapshot=()=>JSON.stringify({matrix:[...['a','b','c','d','e','f'].map(k=>ctx.getTransform()[k])],alpha:ctx.globalAlpha,composite:ctx.globalCompositeOperation,lineWidth:ctx.lineWidth,stroke:ctx.strokeStyle,fill:ctx.fillStyle,lineCap:ctx.lineCap,shadow:ctx.shadowColor,blur:ctx.shadowBlur});
      const state=snapshot(),invalid=[];let depth=0,maxDepth=0;
      const instrumented=new Proxy(ctx,{get(target,name){const value=target[name];if(typeof value!=='function')return value;return (...args)=>{for(const n of args)if(typeof n==='number'&&!Number.isFinite(n))invalid.push(name);if(name==='save'){depth++;maxDepth=Math.max(depth,maxDepth);}if(name==='restore')depth--;return value.apply(target,args);};},set(target,name,value){target[name]=value;return true;}});
      const states=[];
      for(const power of powers){
        FX.drawProjectile(instrumented,{...projectile,powerId:power.id},power,{...view,time:Infinity,frame:NaN});states.push(snapshot()===state);
        FX.drawCharge(instrumented,{x:-1,y:.2,facing:-1,data:{id:power.id},move:{start:22,height:1.6},moveFrame:15},power,view);states.push(snapshot()===state);
        for(const kind of ['hit','block']){const result=FX.drawImpact(instrumented,{x:1,y:1.6,life:25,kind,powerId:power.id,facing:-1},power,view);states.push(snapshot()===state&&result.particleCount<=20);}
      }
      const stage=document.createElement('canvas');stage.width=1280;stage.height=720;const s=stage.getContext('2d');s.fillStyle='#345678';s.fillRect(0,0,1280,720);
      FX.drawStageLighting(s,{floor:600,time:7,leftX:-2,rightX:2,leftColor:'#20e990',rightColor:'#f6cb58'});const corners=[[25,25],[1220,25],[25,680],[1220,680]].map(([x,y])=>[...s.getImageData(x,y,1,1).data]);
      return {powerCount:powers.length,unique:new Set(hashes).size,materialUnique:new Set(materialHashes).size,bounds,first,again,later,stillA,stillB,mirrorError,states:states.every(Boolean),invalid,depth,maxDepth,corners};
    });
    assert.equal(checks.powerCount,196);assert.equal(checks.unique,196,'every catalog power has a unique seeded raster');assert.equal(checks.materialUnique,9);
    for(const b of checks.bounds){assert.ok(b.opaque>20,`${b.kind} has a visible solid core`);assert.ok(b.centerAlpha>=128,`${b.kind} remains visible at the collider center`);assert.ok(b.maxDistance<=b.radius+1.4,`${b.kind} solid pixels stay inside the collision circle`);}
    assert.equal(checks.first,checks.again,'same input produces identical pixels');assert.notEqual(checks.first,checks.later,'normal powers animate');assert.equal(checks.stillA,checks.stillB,'reduced motion removes projectile rotation and throb');
    assert.ok(checks.mirrorError<.2,`facing mirrors the surface and sparse wake (mean error ${checks.mirrorError})`);
    assert.ok(checks.states,'all 196 projectile, charge, impact and block calls preserve drawing state');assert.deepEqual(checks.invalid,[]);assert.equal(checks.depth,0);assert.ok(checks.maxDepth<=5);
    assert.deepEqual(checks.corners,Array(4).fill([52,86,120,255]),'optional lighting leaves source-art corners unchanged');assert.deepEqual(errors,[]);
    fs.mkdirSync('/workspace/artifacts',{recursive:true});await page.screenshot({path:'/workspace/artifacts/NationClash-signature-effects.png',fullPage:true});
  }finally{await browser.close();}
});
