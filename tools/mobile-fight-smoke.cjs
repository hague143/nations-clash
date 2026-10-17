'use strict';

// Browser acceptance for the actual generated Android assets. These checks use
// real touch input and the production RAF loop. They do not run an Android
// emulator or establish performance on a physical phone.
// Generate assets first: python3 tools/build-android-assets.py
// Run: node tools/mobile-fight-smoke.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const http=require('node:http');
const ROOT=path.resolve(__dirname,'..');
const ASSETS=path.resolve(process.env.NATIONCLASH_ANDROID_ASSETS||path.join(ROOT,'artifacts/android-assets'));
const OUT=path.resolve(process.env.NATIONCLASH_ARTIFACT_DIR||path.join(ROOT,'artifacts/mobile-fight'));
const VIEWPORTS=[{width:390,height:844},{width:360,height:740},{width:412,height:915},{width:844,height:390},{width:740,height:360},{width:320,height:568}];
const REMOVED='#sound,#volume,#music-volume,#effects-volume,.keys,#combat-hint,#signature-hint,#reach-hint';
const report={startedAt:new Date().toISOString(),type:'Chromium touch-browser acceptance of generated Android assets; not native Android/emulator validation',assets:ASSETS,checks:[],errors:[],externalRequests:[],screenshots:[],status:'running'};
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml','.wav':'audio/wav','.json':'application/json'};
let browser,server,url;
function check(name,details={}){report.checks.push({name,status:'passed',...details});console.log('PASS '+name);}
function watch(page,label){
 page.on('pageerror',error=>report.errors.push(label+': '+error.message));
 page.on('console',message=>{if(message.type()==='error')report.errors.push(label+': '+message.text());});
 page.on('request',request=>{if(/^https?:/.test(request.url())&&!request.url().startsWith(url))report.externalRequests.push(request.url());});
 page.route(/^https?:\/\//,route=>route.request().url().startsWith(url)?route.continue():route.abort());
}
async function shot(page,name){const file=path.join(OUT,name+'.png');await page.screenshot({path:file});report.screenshots.push(file);return file;}
function sourceFreshness(){
 const manifestBytes=fs.readFileSync(path.join(ASSETS,'asset-manifest.json')),manifest=JSON.parse(manifestBytes);
 report.assetManifestSha256=hash(manifestBytes);report.documentSha256=hash(fs.readFileSync(path.join(ASSETS,'index.html')));
 for(const [relative,expected]of Object.entries(manifest.sourceInputs))assert.equal(hash(fs.readFileSync(path.join(ROOT,relative))),expected,'Regenerate stale Android assets: '+relative);
 for(const entry of Object.values(manifest.modules))assert.equal(hash(fs.readFileSync(path.join(ROOT,entry.sourcePath))),entry.sourceSha256,'Regenerate stale Android module: '+entry.sourcePath);
 assert.equal(Object.keys(manifest.countries).length,196);assert.equal(Object.keys(manifest.arenas).length,30);
 check('Generated Android document and modules match the current game and UI sources',{assetManifestSha256:report.assetManifestSha256,documentSha256:report.documentSha256,countries:196,arenas:30});
}
async function captureActualPaint(page){
 // Observe the real canvas transform at supplied-sheet/background draw calls.
 // This catches stretched artwork even if a camera debug flag incorrectly says
 // uniform. Nothing changes the renderer's image, coordinates or return value.
 await page.addInitScript(()=>{
  window.__mobileFighterPaints={};window.__mobileArenaPaint=null;window.__mobileHits=[];
  addEventListener('nation-hit',event=>window.__mobileHits.push(event.detail));
  const original=CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage=function(...args){
   const result=original.apply(this,args),game=window.NationClash;
   if(this.canvas.id!=='arena'||!game?.fight)return result;
   const image=args[0],actor=[game.fight.left,game.fight.right].find(f=>game.assets?.countrySprites?.[f.data.id]===image);
   const background=!actor&&image?.naturalWidth===1280&&image?.naturalHeight===720;
   if(!actor&&!background)return result;
   if(actor&&(actor.move||actor.y||actor.guard||actor.low||actor.hp<=0))return result;
   const box=this.canvas.getBoundingClientRect(),matrix=this.getTransform();
   const sourceW=args.length===9?args[3]:image.naturalWidth,sourceH=args.length===9?args[4]:image.naturalHeight;
   const x=args.length===9?args[5]:args[1],y=args.length===9?args[6]:args[2];
   const w=args.length===9?args[7]:args.length===5?args[3]:image.naturalWidth,h=args.length===9?args[8]:args.length===5?args[4]:image.naturalHeight;
   const sx=box.width/this.canvas.width,sy=box.height/this.canvas.height;
   const corners=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([px,py])=>({x:(matrix.a*px+matrix.c*py+matrix.e)*sx,y:(matrix.b*px+matrix.d*py+matrix.f)*sy}));
   const painted={frame:game.fight.frame,left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y)),sourceWidth:sourceW,sourceHeight:sourceH,scaleX:Math.hypot(matrix.a,matrix.b)*w/sourceW*sx,scaleY:Math.hypot(matrix.c,matrix.d)*h/sourceH*sy};
   if(actor)window.__mobileFighterPaints[actor.data.id]=painted;else window.__mobileArenaPaint=painted;
   return result;
  };
 });
}
async function ready(page){await page.waitForFunction(()=>window.NationClash?.assetsReady);}
async function start(page){await page.selectOption('#mode','local');await page.locator('#start').tap();await page.waitForFunction(()=>NationClash.fight?.phase==='fight');await page.waitForFunction(()=>NationClash.cameraDebug?.mobile&&NationClash.cameraDebug.width>0);}
async function fixture(page,distance=1.1){
 await page.evaluate(distance=>{
  const f=NationClash.fight;f.resetRound();f.phase='fight';f.left.x=-distance/2;f.right.x=distance/2;f.left.facing=1;f.right.facing=-1;window.__mobileHits=[];
 },distance);
}
async function camera(page){
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const state=await page.evaluate(()=>{
  const canvas=document.getElementById('arena'),box=canvas.getBoundingClientRect(),d=NationClash.cameraDebug;
  const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  let min=255,max=0;for(let i=0;i<pixels.length;i+=Math.max(4,Math.floor(pixels.length/2048/4)*4)){const l=(pixels[i]+pixels[i+1]+pixels[i+2])/3;min=Math.min(min,l);max=Math.max(max,l);}
  return {debug:d,box:{width:box.width,height:box.height},backing:{width:canvas.width,height:canvas.height},ratio:devicePixelRatio,actors:structuredClone(__mobileFighterPaints),arena:__mobileArenaPaint,pixelRange:max-min,ids:[NationClash.fight.left.data.id,NationClash.fight.right.data.id]};
 });
 const {debug:d}=state;
 assert.ok(d.mobile&&d.uniform&&d.scale>0&&Number.isFinite(d.translateX)&&Number.isFinite(d.translateY),'measured mobile camera is finite and uniform');
 assert.ok(Math.abs(d.width-state.box.width)<1.1&&Math.abs(d.height-state.box.height)<1.1,'camera dimensions match the visible canvas');
 assert.ok(Math.abs(state.backing.width-state.box.width*Math.min(state.ratio,2))<2.1&&Math.abs(state.backing.height-state.box.height*Math.min(state.ratio,2))<2.1,'canvas backing matches visible dimensions and capped DPR');
 assert.ok(state.pixelRange>35,'the measured canvas contains a rendered scene, not a blank fill');
 for(const id of state.ids){
  const paint=state.actors[id],bounds=d.bounds.find(b=>b.countryId===id);
  assert.ok(paint&&bounds,'supplied sprite '+id+' was painted and projected');
  assert.ok(Math.abs(paint.scaleX/paint.scaleY-1)<.012,id+' actual supplied idle artwork keeps its source aspect ratio');
  assert.ok(paint.left>=-8&&paint.right<=d.width+8&&paint.top>=-8&&paint.bottom<=d.height+8,id+' actual painted sprite frame fits camera');
  assert.ok(bounds.feetX>=0&&bounds.feetX<=d.width&&bounds.feetY>=0&&bounds.feetY<=d.height,id+' feet are on screen');
  for(const side of ['left','right','top','bottom'])assert.ok(Math.abs(paint[side]-bounds[side])<9,id+' '+side+' reported bound matches actual image draw');
 }
 assert.ok(state.arena&&Math.abs(state.arena.scaleX/state.arena.scaleY-1)<.012,'actual arena image also retains its source aspect ratio');
 return state;
}
async function layout(page,viewport){
 const state=await page.evaluate(()=>{
  const rect=element=>{const r=element.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const controls=[...document.querySelectorAll('.touch button')].map(b=>({label:b.textContent.trim(),...rect(b)}));
  return {width:innerWidth,height:innerHeight,scrollX,scrollY,scrollHeight:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth,bodyHeight:document.body.getBoundingClientRect().height,header:rect(document.querySelector('header')),logo:rect(document.querySelector('.brand-logo')),pause:rect(document.getElementById('pause')),game:rect(document.getElementById('game')),arena:rect(document.querySelector('.arena-wrap')),touch:rect(document.querySelector('.touch')),controls,rows:new Set(controls.map(b=>b.top.toFixed(1))).size,columns:new Set(controls.map(b=>b.left.toFixed(1))).size};
 });
 const fits=r=>r.left>=-.6&&r.top>=-.6&&r.right<=state.width+.6&&r.bottom<=state.height+.6;
 assert.equal(state.width,viewport.width);assert.equal(state.height,viewport.height);
 assert.ok(state.scrollWidth<=state.width+1&&state.scrollHeight<=state.height+1,'fight document does not scroll in either direction');
 assert.ok(Math.abs(state.bodyHeight-state.height)<1.1&&Math.abs(state.scrollY)<1,'fight fills the viewport without a retained landing-page scroll offset');
 assert.ok(state.header.height<=32.5&&state.logo.width<=28.5&&state.logo.height<=28.5,'compact header and 28px brand preserve room for gameplay');
 assert.ok(fits(state.pause)&&state.pause.width>=44&&state.pause.height>=44,'pause icon remains a visible 44px control');
 assert.equal(state.controls.length,12);assert.ok(state.controls.every(b=>b.width>=44-.1&&b.height>=44-.1&&fits(b)),'all twelve controls remain visible and at least44px');
 assert.ok(fits(state.arena)&&fits(state.touch)&&state.touch.top>=state.arena.bottom-.6,'arena and bottom controls fit without overlap');
 const landscape=viewport.width>viewport.height;
 assert.equal(state.rows,landscape?2:3);assert.equal(state.columns,landscape?6:4);
 assert.ok(state.arena.height/state.height>(landscape?.55:state.height<=568?.55:.60),'arena occupies most of the screen');
 assert.equal(await page.locator(REMOVED).count(),0,'removed sound controls, keyboard panels and combat hints are absent from DOM');
 assert.equal(await page.locator('#game kbd,#game small').count(),0,'touch controls have no keyboard-key subtitles');
 return state;
}
async function touchDamage(page,action,distance){
 await fixture(page,distance);const before=await page.evaluate(()=>NationClash.fight.right.hp);
 await page.locator('[data-action="'+action+'"]').tap();
 await page.waitForFunction(({action,before})=>NationClash.fight.right.hp<before&&__mobileHits.some(e=>e.action===action&&e.attackerId==='pk'&&e.damage>0),{action,before});
 const result=await page.evaluate(()=>({hp:NationClash.fight.right.hp,hits:__mobileHits.map(e=>({action:e.action,kind:e.kind,damage:e.damage,country:e.countryId})),audio:NationClash.audioDebug.impactCounts,signature:NationClash.audioDebug.signatureCounts}));
 assert.ok(before-result.hp>0,'touch '+action+' damages opponent via the real game loop');
 return {action,distance,damage:before-result.hp,events:result.hits};
}
async function viewportCase(viewport,index){
 const page=await browser.newPage({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:index===0?3:2});watch(page,viewport.width+'x'+viewport.height);await captureActualPaint(page);
 await page.goto(url);await ready(page);await start(page);
 const geometry=await layout(page,viewport),rendering=await camera(page),damage=[];
 await shot(page,'mobile-fight-'+viewport.width+'x'+viewport.height);
 for(const [action,distance]of [['light',1.1],['heavy',1.2],['special',1.3],['signature',3.8]])damage.push(await touchDamage(page,action,distance));
 const audio=await page.evaluate(()=>NationClash.audioDebug);
 assert.ok(audio.enabled&&audio.active&&audio.contextState==='running'&&audio.musicRunning&&audio.musicGain>0&&audio.effectsGain>0,'sound remains active without sound UI');
 assert.deepEqual([...audio.decodedCues].sort(),['fight','getready','ko','timeover']);assert.ok(audio.cueCounts.fight>=1&&audio.cueCounts.getready>=1);
 assert.ok(audio.impactCounts.punch>0&&audio.impactCounts.kick>0&&audio.signatureCounts.launch>0&&audio.signatureCounts.impact>0);assert.equal(audio.lastError,null);
 check(viewport.width+'×'+viewport.height+' fight fits its viewport, preserves natural artwork and accepts real touch attacks',{geometry,rendering,damage,audio});
 if(index===0)return page;
 await page.locator('#pause').tap();await page.locator('#back').tap();assert.equal(await page.evaluate(()=>NationClash.fight),null);await page.close();return null;
}
async function center(page,selector){const r=await page.locator(selector).boundingBox();assert.ok(r);return{x:r.x+r.width/2,y:r.y+r.height/2};}
async function multitouch(page){
 await fixture(page,3);const cdp=await page.context().newCDPSession(page),right=await center(page,'[data-hold="right"]'),guard=await center(page,'[data-hold="guard"]');
 const before=await page.evaluate(()=>NationClash.fight.left.x);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...right},{id:2,...guard}]});
 await page.waitForFunction(()=>NationClash.fight.left.guard&&NationClash.fight.left.axis===1);
 const held=await page.evaluate(()=>({x:NationClash.fight.left.x,guard:NationClash.fight.left.guard,axis:NationClash.fight.left.axis,pressed:document.querySelectorAll('.touch .pressed').length}));assert.equal(held.pressed,2);assert.ok(Math.abs(held.x-before)<.001,'guard intentionally prevents movement while both fingers are held');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{id:2,...guard}]});
 await page.waitForFunction(x=>!NationClash.fight.left.guard&&NationClash.fight.left.x>x+.06,before);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>!NationClash.fight.left.guard&&NationClash.fight.left.axis===0&&!document.querySelector('.touch .pressed'));
 const released=await page.evaluate(()=>NationClash.fight.left.x);await page.waitForTimeout(160);assert.ok(Math.abs(await page.evaluate(()=>NationClash.fight.left.x)-released)<.001,'released movement cannot remain stuck');
 const left=await center(page,'[data-hold="left"]');await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:3,...left}]});await page.waitForFunction(x=>NationClash.fight.left.x<x-.06,released);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForFunction(()=>NationClash.fight.left.axis===0&&!document.querySelector('.touch .pressed'));
 await cdp.detach();
 check('Two real touches register movement and guard, releasing guard resumes movement, and release/cancel clear every hold',{before,held,released});
}
async function rotateAndLifecycle(page){
 await fixture(page,2.6);await page.locator('[data-action="jump"]').tap();await page.waitForFunction(()=>NationClash.fight.left.y>.6);await page.locator('#pause').tap();await page.waitForFunction(()=>NationClash.paused&&NationClash.audioDebug.contextState==='suspended');
 const before=await page.evaluate(()=>{window.__rotationFight=NationClash.fight;return {ids:NationClash.selectedIds,hp:[__rotationFight.left.hp,__rotationFight.right.hp],round:__rotationFight.round,wins:[...__rotationFight.wins],frame:__rotationFight.frame,time:__rotationFight.time,jump:__rotationFight.left.y,cues:NationClash.audioDebug.cueCounts};});
 assert.ok(before.jump>0,'actual touch jump remains airborne when paused');
 const jump=await page.evaluate(()=>NationClash.cameraDebug);assert.ok(jump.bounds.every(b=>b.top>=-8&&b.bottom<=jump.height+8),'camera keeps jumping and standing fighters on screen');
 for(const viewport of [{width:844,height:390},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.waitForFunction(()=>Math.abs(NationClash.cameraDebug.width-document.getElementById('arena').getBoundingClientRect().width)<1.1);
  const geometry=await layout(page,viewport),state=await page.evaluate(()=>({sameFight:NationClash.fight===__rotationFight,ids:NationClash.selectedIds,hp:[NationClash.fight.left.hp,NationClash.fight.right.hp],round:NationClash.fight.round,wins:[...NationClash.fight.wins],frame:NationClash.fight.frame,time:NationClash.fight.time,paused:NationClash.paused,audio:NationClash.audioDebug,camera:NationClash.cameraDebug}));
  assert.ok(state.sameFight&&state.paused);for(const key of ['ids','hp','round','wins','frame','time'])assert.deepEqual(state[key],before[key],key+' survives rotation unchanged');assert.ok(state.audio.paused&&!state.audio.musicRunning);
  assert.ok(state.camera.bounds.every(b=>b.top>=-8&&b.bottom<=state.camera.height+8),'resized camera fits airborne fighters');
  await shot(page,'mobile-fight-rotated-'+viewport.width+'x'+viewport.height);report.rotations??=[];report.rotations.push({viewport,geometry,state});
 }
 check('Touch jump and portrait/landscape rotation preserve the same fight, HP, round, frame and pause state',{before,rotations:report.rotations});
 const frozen=await page.evaluate(()=>NationClash.fight.frame);await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>NationClash.fight.frame),frozen);
 await page.locator('#resume').tap();await page.waitForFunction(()=>!NationClash.paused&&NationClash.audioDebug.contextState==='running'&&NationClash.audioDebug.musicRunning);
 const resumed=await page.evaluate(()=>NationClash.audioDebug);assert.deepEqual(resumed.cueCounts,before.cues,'resume repeats no round announcements');
 await page.locator('#pause').tap();await page.waitForFunction(()=>NationClash.audioDebug.contextState==='suspended');await page.locator('#back').tap();
 const menu=await page.evaluate(()=>({fight:NationClash.fight,selection:!document.getElementById('selection').classList.contains('hidden'),bodyInFight:document.body.classList.contains('in-fight'),audio:NationClash.audioDebug}));
 assert.equal(menu.fight,null);assert.ok(menu.selection&&!menu.bodyInFight);assert.ok(!menu.audio.active&&!menu.audio.musicRunning&&menu.audio.activeVoices===0);assert.equal(await page.locator(REMOVED).count(),0);
 check('Pause freezes gameplay/audio, Resume restores sound, and Back returns to selection with audio stopped',{resumed,menu});
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 try{
  sourceFreshness();
  server=http.createServer((request,response)=>{
   let pathname;try{pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);}catch{response.writeHead(400);response.end();return;}
   if(pathname==='/favicon.ico'){response.writeHead(204);response.end();return;}
   const file=path.resolve(ASSETS,'.'+(pathname==='/'?'/index.html':pathname));
   if(!file.startsWith(ASSETS+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404);response.end();return;}
   response.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url='http://127.0.0.1:'+server.address().port+'/';
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--autoplay-policy=user-gesture-required']});
  let primary;
  for(let i=0;i<VIEWPORTS.length;i++){const page=await viewportCase(VIEWPORTS[i],i);if(page)primary=page;}
  await primary.bringToFront();if(await primary.evaluate(()=>NationClash.paused))await primary.locator('#resume').tap();
  await multitouch(primary);await rotateAndLifecycle(primary);await primary.close();
  assert.deepEqual(report.errors,[],'no page/runtime console errors');assert.deepEqual(report.externalRequests,[],'no external HTTP requests');check('Mobile browser sessions have zero runtime errors and zero external requests');
  report.status='passed';console.log('Mobile fight acceptance passed: '+report.checks.length+' groups.');
 }catch(error){report.status='failed';report.failure={message:error.message,stack:error.stack};console.error(error);process.exitCode=1;}
 finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(OUT,'mobile-fight-acceptance.json'),JSON.stringify(report,null,2)+'\n');}
})();
