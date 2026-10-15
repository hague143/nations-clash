(function(root){
 'use strict';

 // Canvas lighting and solid facets give the powers depth without a 3D runtime.
 // Every solid projectile is clipped to its actual circular collision volume.
 // Bloom, sparse wake particles and ground reflections are decorative only.
 const TAU=Math.PI*2;
 const KINDS=Object.freeze(['energy','crystal','metal','leaf','sand','water','wind','ember','star']);
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const number=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
 function hash(value){let n=2166136261;for(const c of String(value??'')){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;}
 function random(seed,index){let n=(seed+Math.imul(index+1,0x9e3779b9))>>>0;n^=n>>>16;n=Math.imul(n,0x21f0aaad);n^=n>>>15;n=Math.imul(n,0x735a2d97);return ((n^(n>>>15))>>>0)/4294967296;}
 function hex(value,fallback){return /^#[\da-f]{6}$/i.test(value||'')?value:/^#[\da-f]{3}$/i.test(value||'')?'#'+value.slice(1).split('').map(c=>c+c).join(''):fallback;}
 function rgb(value){return [1,3,5].map(i=>parseInt(value.slice(i,i+2),16));}
 function shade(value,amount){const target=amount>0?255:0,t=Math.abs(amount);return '#'+rgb(value).map(c=>Math.round(c+(target-c)*t).toString(16).padStart(2,'0')).join('');}
 function rgba(value,alpha){return 'rgba('+rgb(value).join(',')+','+clamp(alpha,0,1)+')';}
 function palette(power){
  const color=hex(power?.color,'#70e8ff'),accent=hex(power?.accent,'#fff6cf');
  return {color,accent,light:shade(color,.7),dark:shade(color,-.75),edge:shade(color,.35)};
 }
 function resolve(power,entity){
  if(!power&&root.NationPowers?.get)power=root.NationPowers.get(entity?.powerId||entity?.data?.id||entity?.ownerId);
  const p=power||{},seed=Number.isFinite(p.seed)?p.seed>>>0:hash(p.seed??p.id??entity?.powerId??'power');
  return {...p,kind:KINDS.includes(p.kind)?p.kind:'energy',seed,motif:String(p.motif?.id||p.motif?.shape||p.motif||'').toLowerCase()};
 }
 function config(view={}){
  return {floor:number(view.floor,600),originX:number(view.originX,640),pixelsPerUnit:Number.isFinite(view.pixelsPerUnit)&&view.pixelsPerUnit>0?view.pixelsPerUnit:78,
   time:number(view.time),frame:number(view.frame),reducedMotion:!!view.reducedMotion,width:number(view.width,1280),height:number(view.height,720),hand:view.hand};
 }
 function position(entity,v){
  if(!entity||!Number.isFinite(entity.x)||!Number.isFinite(entity.y))return null;
  const x=v.originX+entity.x*v.pixelsPerUnit,y=v.floor-entity.y*v.pixelsPerUnit;
  return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
 }
 function circle(ctx,x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,TAU);}
 function ellipse(ctx,x,y,rx,ry,angle=0){ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,TAU);}
 function polygon(ctx,points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
 function radial(ctx,x,y,r,stops){const g=ctx.createRadialGradient(x,y,0,x,y,r);for(const [at,color]of stops)g.addColorStop(at,color);return g;}
 function saved(ctx,draw){ctx.save();try{return draw();}finally{ctx.restore();}}
 function bloom(ctx,r,c,strength=1){
  ctx.fillStyle=radial(ctx,0,0,r*2.4,[[0,rgba(c,.25*strength)],[.35,rgba(c,.16*strength)],[1,rgba(c,0)]]);
  circle(ctx,0,0,r*2.4);ctx.fill();
 }
 function starPath(ctx,x,y,r,points=5,angle=-Math.PI/2,inner=.43){
  ctx.beginPath();for(let i=0;i<points*2;i++){const a=angle+i*Math.PI/points,l=i%2?r*inner:r;const px=x+Math.cos(a)*l,py=y+Math.sin(a)*l;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();
 }
 function leafPath(ctx,x,y,r,angle){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(-r,0);ctx.bezierCurveTo(-r*.25,-r*.68,r*.72,-r*.68,r,0);ctx.bezierCurveTo(r*.32,r*.56,-r*.38,r*.5,-r,0);ctx.closePath();
 }
 function crescent(ctx,r,p,c,rotation=0){
  ctx.save();ctx.rotate(rotation);const g=ctx.createLinearGradient(-r,-r,r,r);g.addColorStop(0,c.light);g.addColorStop(.4,c.color);g.addColorStop(.7,c.accent);g.addColorStop(1,c.dark);
  ctx.beginPath();ctx.arc(-r*.04,0,r*.86,-.98,.98,true);ctx.quadraticCurveTo(-r*.7,0,r*.44,-r*.714);ctx.closePath();ctx.fillStyle=g;ctx.fill();
  ctx.strokeStyle=rgba(c.accent,.9);ctx.lineWidth=Math.max(.7,r*.05);ctx.stroke();
  ctx.beginPath();ctx.arc(-r*.04,0,r*.68,2.04,4.1);ctx.strokeStyle=rgba(c.light,.6);ctx.stroke();
  starPath(ctx,r*.48,-r*.29,r*.25,5,-Math.PI/2+random(p.seed,51)*.3);ctx.fillStyle=c.accent;ctx.fill();ctx.restore();
 }
 function coreSurface(ctx,r,c,kind){
  const alpha=kind==='wind'?.55:kind==='water'?.86:1;
  ctx.globalAlpha*=alpha;
  ctx.fillStyle=radial(ctx,-r*.32,-r*.37,r*1.45,[[0,c.light],[.22,c.color],[.62,shade(c.color,-.25)],[1,c.dark]]);
  circle(ctx,0,0,r);ctx.fill();ctx.globalAlpha/=alpha;
 }
 function energy(ctx,r,p,c,phase){
  const segments=7+p.seed%4,twist=(random(p.seed,4)-.5)*.8;
  for(let i=0;i<segments;i++){
   const a=i*TAU/segments+twist,b=a+TAU/segments;
   polygon(ctx,[[0,0],[Math.cos(a)*r*.94,Math.sin(a)*r*.94],[Math.cos(b)*r*.94,Math.sin(b)*r*.94]],rgba(i%2?c.light:c.dark,.3));
  }
  ctx.save();ctx.rotate(phase*.55);
  for(let i=0;i<3;i++){
   ctx.save();ctx.rotate(i*Math.PI/3+random(p.seed,7)*.8);ellipse(ctx,0,0,r*.91,r*.32);ctx.strokeStyle=rgba(i===1?c.accent:c.light,.85);ctx.lineWidth=r*.065;ctx.stroke();ctx.restore();
  }
  ctx.restore();ctx.fillStyle=radial(ctx,-r*.1,-r*.14,r*.48,[[0,'#ffffff'],[.25,c.accent],[1,rgba(c.color,0)]]);circle(ctx,0,0,r*.48);ctx.fill();
 }
 function crystal(ctx,r,p,c,phase){
  const turn=Math.sin(phase*.7)*.1;
  ctx.save();ctx.rotate(turn+(random(p.seed,1)-.5)*.45);
  const tips=4+p.seed%3;
  for(let i=0;i<tips;i++){
   const a=-Math.PI*.68+i*Math.PI*1.36/(tips-1),scale=.5+random(p.seed,i+2)*.4;
   ctx.save();ctx.translate(Math.sin(a)*r*.37,Math.cos(a)*r*.25);ctx.rotate(a*.38);
   const top=[0,-r*scale],left=[-r*.27,-r*.04],bottom=[0,r*.63],right=[r*.28,-r*.04],ridge=[-r*.035,-r*.01];
   polygon(ctx,[top,left,bottom,right],c.dark,c.edge);
   polygon(ctx,[top,left,ridge],shade(c.color,.25));polygon(ctx,[top,right,ridge],c.light);
   polygon(ctx,[bottom,left,ridge],shade(c.color,-.25));polygon(ctx,[bottom,right,ridge],c.color);
   ctx.lineWidth=r*.025;ctx.strokeStyle=rgba(c.accent,.9);ctx.beginPath();ctx.moveTo(...top);ctx.lineTo(...ridge);ctx.lineTo(...bottom);ctx.stroke();ctx.restore();
  }
  ctx.restore();
 }
 function metal(ctx,r,p,c,phase){
  ctx.save();ctx.rotate(phase*.4);
  const count=5+p.seed%3;
  for(let i=0;i<count;i++){
   const a=i*TAU/count+random(p.seed,6),d=r*(i===0?0:.35),length=r*(.51+random(p.seed,i+20)*.48),w=r*(.16+random(p.seed,i+30)*.14);
   ctx.save();ctx.translate(Math.cos(a)*d,Math.sin(a)*d);ctx.rotate(a+.3);
   const pts=[[-w,-length*.25],[0,-length],[w,-length*.15],[w*.72,length*.64],[-w*.72,length*.58]];
   polygon(ctx,pts,c.dark);polygon(ctx,pts.map(([x,y])=>[x-r*.065,y-r*.065]),c.color,c.edge);
   polygon(ctx,[[0,-length-r*.065],[-w-r*.065,-length*.25-r*.065],[-r*.065,length*.58-r*.065]],c.light);
   polygon(ctx,[[0,-length-r*.065],[w-r*.065,-length*.15-r*.065],[-r*.065,length*.58-r*.065]],shade(c.color,-.13));
   ctx.strokeStyle=rgba(c.accent,.9);ctx.lineWidth=r*.045;ctx.beginPath();ctx.moveTo(-w*.65,-length*.2);ctx.lineTo(-r*.06,-length*.69);ctx.stroke();ctx.restore();
  }
  ctx.restore();
 }
 function leaves(ctx,r,p,c,phase){
  const count=5+p.seed%3;
  for(let i=0;i<count;i++){
   const a=i*TAU/count+phase*.55,d=(.24+random(p.seed,i+41)*.3)*r;
   leafPath(ctx,Math.cos(a)*d,Math.sin(a)*d,r*(.35+random(p.seed,i+49)*.2),a+.9);
   const g=ctx.createLinearGradient(0,-r*.4,0,r*.4);g.addColorStop(0,c.light);g.addColorStop(.45,c.color);g.addColorStop(1,c.dark);ctx.fillStyle=g;ctx.fill();
   ctx.strokeStyle=rgba(c.accent,.8);ctx.lineWidth=r*.035;ctx.beginPath();ctx.moveTo(-r*.4,0);ctx.quadraticCurveTo(0,-r*.04,r*.4,0);ctx.stroke();ctx.restore();
  }
  ctx.strokeStyle=rgba(c.light,.8);ctx.lineWidth=r*.035;ctx.beginPath();for(let i=0;i<34;i++){const a=i*.24+phase*.55,d=i/34*r*.7;i?ctx.lineTo(Math.cos(a)*d,Math.sin(a)*d):ctx.moveTo(0,0);}ctx.stroke();
 }
 function sand(ctx,r,p,c,phase){
  for(let i=0;i<4;i++){
   const y=(i-1.5)*r*.42,shift=Math.sin(phase*.5+i)*r*.08;
   ctx.beginPath();ctx.moveTo(-r,y+r*.19);ctx.bezierCurveTo(-r*.4,y-r*.55,r*.25,y+r*.35,r,y-r*.1+shift);ctx.lineTo(r,y+r*.32);ctx.bezierCurveTo(r*.2,y+r*.65,-r*.4,y-r*.2,-r,y+r*.4);ctx.closePath();
   ctx.fillStyle=i%2?shade(c.color,.25):c.dark;ctx.fill();ctx.strokeStyle=rgba(c.accent,.65);ctx.lineWidth=r*.035;ctx.stroke();
  }
  for(let i=0;i<16;i++){const a=random(p.seed,i+77)*TAU+phase*.15,d=Math.sqrt(random(p.seed,i+97))*r*.9;circle(ctx,Math.cos(a)*d,Math.sin(a)*d,r*(.025+random(p.seed,i+117)*.035));ctx.fillStyle=i%3?c.light:c.accent;ctx.fill();}
 }
 function water(ctx,r,p,c,phase){
  for(let i=0;i<3;i++){
   const a=i*TAU/3+phase*.32,d=i===0?r*.18:r*.36,size=r*(i===0?.76:.48);
   const x=Math.cos(a)*d,y=Math.sin(a)*d;
   ctx.fillStyle=radial(ctx,x-size*.29,y-size*.3,size*1.25,[[0,'#eaffff'],[.13,rgba(c.light,.95)],[.4,rgba(c.color,.65)],[.8,rgba(c.dark,.9)],[1,c.color]]);
   circle(ctx,x,y,size);ctx.fill();ctx.strokeStyle=rgba(c.light,.8);ctx.lineWidth=r*.035;ctx.stroke();
   ctx.beginPath();ctx.arc(x-size*.1,y-size*.08,size*.69,3.5,4.65);ctx.strokeStyle=rgba('#ffffff',.9);ctx.lineWidth=r*.09;ctx.lineCap='round';ctx.stroke();
  }
  ctx.beginPath();ctx.moveTo(-r*.9,r*.2);ctx.bezierCurveTo(-r*.2,r*.8,r*.1,-r*.6,r*.86,-r*.16);ctx.strokeStyle=rgba(c.accent,.8);ctx.lineWidth=r*.08;ctx.stroke();
 }
 function wind(ctx,r,p,c,phase){
  ctx.save();ctx.rotate(-.4+(random(p.seed,4)-.5)*.6);
  for(let i=0;i<4;i++){
   const size=r*(.28+i*.2),offset=(i-1.5)*r*.15;
   ctx.beginPath();ctx.ellipse(offset,0,size,size*.43,phase*.06,Math.PI*.13,Math.PI*1.76);
   ctx.strokeStyle=rgba(i%2?c.accent:c.light,1-i*.13);ctx.lineWidth=r*(.13-i*.018);ctx.lineCap='round';ctx.stroke();
  }
  ctx.beginPath();ctx.moveTo(-r*.85,r*.27);ctx.bezierCurveTo(-r*.2,-r*.15,r*.25,r*.38,r*.91,-r*.32);ctx.strokeStyle=c.light;ctx.lineWidth=r*.1;ctx.stroke();ctx.restore();
 }
 function ember(ctx,r,p,c,phase){
  for(let i=0;i<5;i++){
   const x=(i-2)*r*.32,h=r*(.68+random(p.seed,i+140)*.3),bend=Math.sin(phase*1.2+i)*r*.12;
   ctx.beginPath();ctx.moveTo(x-r*.26,r*.82);ctx.bezierCurveTo(x-r*.42,r*.2,x-r*.1,-h*.25,x+bend,-h);ctx.bezierCurveTo(x+r*.1,-h*.13,x+r*.48,r*.3,x+r*.29,r*.78);ctx.closePath();
   const g=ctx.createLinearGradient(0,-r,0,r);g.addColorStop(0,c.color);g.addColorStop(.45,c.accent);g.addColorStop(.78,c.light);g.addColorStop(1,c.dark);ctx.fillStyle=g;ctx.fill();
  }
  ctx.fillStyle=radial(ctx,0,r*.24,r*.58,[[0,'#fffef1'],[.35,c.accent],[1,rgba(c.color,0)]]);ellipse(ctx,0,r*.25,r*.6,r*.55);ctx.fill();
 }
 function stars(ctx,r,p,c,phase){
  const points=4+p.seed%4,a=phase*.55-Math.PI/2;
  ctx.save();ctx.rotate(a);const pts=[];for(let i=0;i<points*2;i++){const angle=i*Math.PI/points,d=i%2?r*.44:r*.94;pts.push([Math.cos(angle)*d,Math.sin(angle)*d]);}
  polygon(ctx,pts,c.dark,c.light);
  for(let i=0;i<pts.length;i++)polygon(ctx,[[0,0],pts[i],pts[(i+1)%pts.length]],i%2?c.color:c.light);
  starPath(ctx,-r*.03,-r*.03,r*.38,points,0,.5);ctx.fillStyle=c.accent;ctx.fill();ctx.restore();
 }
 const MATERIALS={energy,crystal,metal,leaf:leaves,sand,water,wind,ember,star:stars};
 function motif(ctx,r,p,c,phase){
  const m=p.motif+' '+(p.name||'').toLowerCase(),isCrescent=/crescent/.test(m)||p.id==='pk';
  if(isCrescent){crescent(ctx,r,p,c,phase*.38);return;}
  // Small inset emblems do not replace the material's much stronger silhouette.
  ctx.save();ctx.globalAlpha*=.42;ctx.strokeStyle=c.accent;ctx.fillStyle=c.accent;ctx.lineWidth=Math.max(.65,r*.045);ctx.lineJoin='round';
  const type=/crown|royal/.test(m)?'crown':/mountain|peak|atlas|alpine|volcan/.test(m)?'mountain':/sun|solar|dawn/.test(m)?'sun':/wave|tide|ocean|river|sea/.test(m)?'wave':/leaf|lotus|palm|forest|olive|cedar|maple|bamboo/.test(m)?'leaf':/star|astral/.test(m)?'star':/shield|aegis/.test(m)?'shield':/wing|bird|eagle|falcon|phoenix|feather/.test(m)?'wing':p.kind==='energy'&&/atom|uranium|nuclear/.test(m)?'atom':'';
  const s=r*.49;
  if(type==='crown')polygon(ctx,[[-s,s*.5],[-s,-s*.65],[-s*.45,-s*.1],[0,-s],[s*.4,-s*.1],[s,-s*.65],[s,s*.5]],null,c.accent);
  else if(type==='mountain'){polygon(ctx,[[-s,s*.45],[-s*.12,-s*.8],[s*.28,-s*.15],[s*.48,-s*.5],[s,s*.45]],null,c.accent);ctx.beginPath();ctx.moveTo(-s*.4,-s*.27);ctx.lineTo(-s*.12,-s*.05);ctx.lineTo(s*.07,-s*.36);ctx.stroke();}
  else if(type==='sun'){circle(ctx,0,0,s*.48);ctx.stroke();for(let i=0;i<8;i++){const a=i*TAU/8;ctx.beginPath();ctx.moveTo(Math.cos(a)*s*.66,Math.sin(a)*s*.66);ctx.lineTo(Math.cos(a)*s,Math.sin(a)*s);ctx.stroke();}}
  else if(type==='wave'){for(let i=0;i<2;i++){ctx.beginPath();ctx.moveTo(-s,(i-.5)*s*.65);ctx.bezierCurveTo(-s*.25,-s*.7+i*s*.65,s*.25,s*.7+i*s*.65,s,(i-.5)*s*.65);ctx.stroke();}}
  else if(type==='leaf'){leafPath(ctx,0,0,s,-.7);ctx.stroke();ctx.beginPath();ctx.moveTo(-s,0);ctx.lineTo(s,0);ctx.stroke();ctx.restore();}
  else if(type==='star'){starPath(ctx,0,0,s,5,-Math.PI/2,.45);ctx.stroke();}
  else if(type==='shield'){ctx.beginPath();ctx.moveTo(-s,-s*.6);ctx.lineTo(s,-s*.6);ctx.quadraticCurveTo(s,s*.4,0,s);ctx.quadraticCurveTo(-s,s*.4,-s,-s*.6);ctx.stroke();}
  else if(type==='wing'){ctx.beginPath();ctx.moveTo(-s,s*.65);ctx.quadraticCurveTo(-s*.2,-s,s,-s*.6);ctx.lineTo(s*.15,-s*.05);ctx.lineTo(s*.7,-s*.1);ctx.lineTo(0,s*.35);ctx.lineTo(s*.35,s*.3);ctx.closePath();ctx.stroke();}
  else if(type==='atom'){for(let i=0;i<3;i++){ellipse(ctx,0,0,s,s*.38,i*Math.PI/3);ctx.stroke();}circle(ctx,0,0,s*.15);ctx.fill();}
  ctx.restore();
 }
 function surface(ctx,r,p,c,phase){
  coreSurface(ctx,r,c,p.kind);ctx.save();circle(ctx,0,0,r);ctx.clip();
  if(/crescent/.test(p.motif+' '+p.name)||p.id==='pk')crescent(ctx,r,p,c,phase*.38);
  else{MATERIALS[p.kind](ctx,r,p,c,phase);motif(ctx,r,p,c,phase);}
  // A lens-like specular glint and a dark lower rim are shared physical cues.
  ctx.fillStyle=radial(ctx,-r*.37,-r*.46,r*.55,[[0,rgba('#ffffff',.64)],[.28,rgba('#ffffff',.2)],[1,rgba('#ffffff',0)]]);circle(ctx,-r*.25,-r*.35,r*.72);ctx.fill();
  ctx.restore();ctx.strokeStyle=rgba(c.light,.85);ctx.lineWidth=Math.max(.8,r*.055);circle(ctx,0,0,Math.max(.1,r-ctx.lineWidth*.5));ctx.stroke();
  ctx.beginPath();ctx.arc(-r*.04,-r*.03,r*.84,3.63,4.7);ctx.strokeStyle=rgba('#ffffff',.8);ctx.lineWidth=r*.075;ctx.lineCap='round';ctx.stroke();
 }
 function wake(ctx,r,p,c,phase,facing,reduced){
  const count=reduced?3:8;
  for(let i=0;i<count;i++){
   const t=(i+.5)/count,d=r*(1.2+t*2.25),a=random(p.seed,i+180)*TAU+phase*.12;
   const x=-facing*d,y=Math.sin(a)*r*.48*(.5+t),size=r*(.12-.07*t),alpha=(1-t)*.42;
   ctx.globalAlpha=alpha;ctx.fillStyle=i%2?c.accent:c.color;
   if(p.kind==='metal'||p.kind==='crystal')polygon(ctx,[[x-size,y+size],[x,y-size*1.5],[x+size*1.5,y],[x,y+size*.8]],ctx.fillStyle);
   else if(p.kind==='leaf'){leafPath(ctx,x,y,size*2,a);ctx.fill();ctx.restore();}
   else{circle(ctx,x,y,size);ctx.fill();}
  }
  ctx.globalAlpha=1;
 }
 function groundLight(ctx,point,r,c,v){
  const distance=Math.abs(v.floor-point.y),strength=.18/(1+distance/120),width=Math.max(14,r*2.8);
  ctx.save();ctx.translate(point.x,v.floor+2);ctx.scale(1,.2);circle(ctx,0,0,width);ctx.fillStyle=radial(ctx,0,0,width,[[0,rgba(c.color,strength)],[1,rgba(c.color,0)]]);ctx.fill();ctx.restore();
 }
 function projectileGeometry(projectile,view={}){
  const v=config(view),point=position(projectile,v),radius=projectile?.radius??.2;
  if(!point||!Number.isFinite(radius)||radius<=0||!Number.isFinite(radius*v.pixelsPerUnit))return null;
  return {...point,radius:radius*v.pixelsPerUnit,world:{x:projectile.x,y:projectile.y,radius}};
 }
 function drawProjectile(ctx,projectile,power,view={}){
  const v=config(view),core=projectileGeometry(projectile,v);if(!ctx||!core)return null;
  const p=resolve(power,projectile),c=palette(p),facing=projectile.facing===-1?-1:1;
  const phase=v.reducedMotion?0:number(projectile.age,v.frame)*.075+v.time*.3+random(p.seed,9)*TAU;
  saved(ctx,()=>{
   ctx.globalCompositeOperation='source-over';groundLight(ctx,core,core.radius,c,v);ctx.translate(core.x,core.y);
   wake(ctx,core.radius,p,c,phase,facing,v.reducedMotion);bloom(ctx,core.radius,c.color);
   // Facing mirrors the material and its emblem, while the collider stays put.
   ctx.scale(facing,1);surface(ctx,core.radius,p,c,phase);
  });
  return {kind:p.kind,powerId:p.id||projectile.powerId,core:{x:core.x,y:core.y,radius:core.radius},worldCore:core.world,particleCount:v.reducedMotion?3:8,decorative:true};
 }
 function drawCharge(ctx,fighter,power,view={}){
  const v=config(view);if(!ctx||!fighter||!Number.isFinite(fighter.x)||!Number.isFinite(fighter.y))return null;
  const p=resolve(power,fighter),c=palette(p),facing=fighter.facing===-1?-1:1,start=Math.max(1,number(fighter.move?.start,20));
  const progress=clamp(number(fighter.moveFrame)/start,0,1),hand=v.hand&&Number.isFinite(v.hand.x)&&Number.isFinite(v.hand.y)?v.hand:{x:fighter.x+facing*.65,y:fighter.y+number(fighter.move?.height,fighter.low?.65:1.65)};
  const point=position(hand,v);if(!point)return null;
  const r=(.1+progress*.13)*v.pixelsPerUnit,phase=v.reducedMotion?0:v.time*3+number(fighter.moveFrame)*.035;
  saved(ctx,()=>{
   ctx.globalCompositeOperation='source-over';ctx.translate(point.x,point.y);bloom(ctx,r,c.color,.6+progress*.4);
   ctx.save();ctx.rotate(v.reducedMotion?-.35:phase*.35-.35);
   for(let i=0;i<3;i++){
    const distance=r*(1.25+(1-progress)*.45),angle=i*TAU/3+phase;
    ellipse(ctx,0,0,distance,distance*.4,i*Math.PI/3);ctx.strokeStyle=rgba(i===1?c.accent:c.color,.35+progress*.3);ctx.lineWidth=1+progress;ctx.stroke();
    const x=Math.cos(angle)*distance,y=Math.sin(angle)*distance*.5;circle(ctx,x,y,1.2+progress*1.5);ctx.fillStyle=c.accent;ctx.fill();
   }
   ctx.restore();ctx.scale(facing,1);surface(ctx,r,p,c,phase);
   // Four tiny inward sparks make anticipation readable at normal game scale.
   if(!v.reducedMotion)for(let i=0;i<4;i++){
    const a=i*TAU/4+random(p.seed,200)*TAU,travel=(number(fighter.moveFrame)*.075+random(p.seed,i+201))%1,d=r*(1.3+(1-travel)*1.4);
    ctx.globalAlpha=travel*.6;ctx.strokeStyle=c.light;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(Math.cos(a)*d,Math.sin(a)*d);ctx.lineTo(Math.cos(a)*(d+3),Math.sin(a)*(d+3));ctx.stroke();
   }
  });
  return {kind:p.kind,powerId:p.id||fighter.data?.id,core:{x:point.x,y:point.y,radius:r},progress,particleCount:v.reducedMotion?3:7};
 }
 function fragment(ctx,x,y,size,a,p,c,index){
  ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=index%3?c.color:c.accent;ctx.strokeStyle=c.light;ctx.lineWidth=.7;
  if(p.kind==='crystal'||p.kind==='metal'){
   polygon(ctx,[[-size*.4,0],[0,-size],[size*.55,0],[0,size*.8]],ctx.fillStyle,c.light);polygon(ctx,[[0,-size],[0,size*.8],[size*.55,0]],rgba(c.dark,.65));
  }else if(p.kind==='leaf'){leafPath(ctx,0,0,size,a*.2);ctx.fill();ctx.restore();}
  else if(p.kind==='star'){starPath(ctx,0,0,size,4,-Math.PI/2,.3);ctx.fill();}
  else if(p.kind==='water'){circle(ctx,0,0,size*.8);ctx.fillStyle=rgba(c.color,.4);ctx.fill();ctx.stroke();circle(ctx,-size*.2,-size*.25,size*.2);ctx.fillStyle=c.light;ctx.fill();}
  else if(p.kind==='wind'){ctx.beginPath();ctx.moveTo(-size,0);ctx.quadraticCurveTo(0,-size*.7,size,0);ctx.stroke();}
  else if(p.kind==='ember'){ellipse(ctx,0,0,size*.45,size);ctx.fillStyle=index%2?c.accent:c.color;ctx.fill();}
  else{circle(ctx,0,0,p.kind==='sand'?size*.55:size*.7);ctx.fill();}
  ctx.restore();
 }
 function deflection(ctx,point,p,c,v,life,progress,facing){
  const fade=clamp(life/14,0,1),r=v.pixelsPerUnit*(.28+progress*.12),count=v.reducedMotion?4:7;
  saved(ctx,()=>{
   ctx.globalCompositeOperation='source-over';ctx.translate(point.x,point.y);ctx.scale(facing,1);ctx.globalAlpha=fade;
   // A tall, tilted lens reads as a shield absorbing a projectile from the left.
   ctx.fillStyle=radial(ctx,0,0,r*1.15,[[0,rgba(c.light,.18)],[.8,rgba(c.color,.07)],[1,rgba(c.color,0)]]);ellipse(ctx,0,0,r*.45,r*1.15,-.12);ctx.fill();
   ctx.strokeStyle=rgba(c.light,.9);ctx.lineWidth=2.6*(1-progress)+.7;ctx.beginPath();ctx.ellipse(r*.18,0,r*.55,r*1.1,-.12,Math.PI*.52,Math.PI*1.48);ctx.stroke();
   ctx.strokeStyle=rgba(c.accent,.5);ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(r*.24,0,r*.7,r*1.23,-.12,Math.PI*.58,Math.PI*1.42);ctx.stroke();
   for(let i=0;i<count;i++){
    const a=Math.PI*.62+i/(count-1)*Math.PI*.76,d=v.pixelsPerUnit*(.15+progress*.45)*( .6+random(p.seed,i+350)*.4);
    ctx.globalAlpha=fade*.8;fragment(ctx,Math.cos(a)*d,Math.sin(a)*d,2+random(p.seed,i+370)*2,v.reducedMotion?0:a,p,c,i);
   }
  });
  return {kind:p.kind,powerId:p.id,blocked:true,core:{...point,radius:r},particleCount:count,progress};
 }
 function drawImpact(ctx,effect,power,view={}){
  const v=config(view),point=position(effect,v);if(!ctx||!point)return null;
  const p=resolve(power,effect),c=palette(p),life=clamp(number(effect.life,36),0,36),progress=1-life/36;
  if(life<=0)return {kind:p.kind,particleCount:0,core:{...point,radius:0}};
  if(effect.kind==='block'||effect.type==='block')return deflection(ctx,point,p,c,v,life,progress,effect.facing===-1?-1:1);
  const fade=clamp(life/14,0,1),r=(.16+progress*.62)*v.pixelsPerUnit,count=v.reducedMotion?8:18;
  saved(ctx,()=>{
   ctx.globalCompositeOperation='source-over';ctx.translate(point.x,point.y);ctx.globalAlpha=fade;
   const glow=r*(v.reducedMotion?1:1.3);ctx.fillStyle=radial(ctx,0,0,glow,[[0,rgba(c.light,(1-progress)*.7)],[.3,rgba(c.color,(1-progress)*.28)],[1,rgba(c.color,0)]]);circle(ctx,0,0,glow);ctx.fill();
   ctx.lineWidth=Math.max(.7,3*(1-progress));ctx.strokeStyle=rgba(c.light,(1-progress)*.9);circle(ctx,0,0,v.reducedMotion?v.pixelsPerUnit*.31:r);ctx.stroke();
   ctx.save();ctx.rotate(-.35);ellipse(ctx,0,0,r*1.25,r*.35);ctx.strokeStyle=rgba(c.accent,(1-progress)*.7);ctx.lineWidth=1.3;ctx.stroke();ctx.restore();
   for(let i=0;i<count;i++){
    const a=i*TAU/count+(random(p.seed,i+240)-.5)*.38,d=(v.reducedMotion?.3:.1+progress*.9)*v.pixelsPerUnit*(.3+random(p.seed,i+260)*.65);
    const size=(2+random(p.seed,i+280)*3.2)*(1-progress*.65),x=Math.cos(a)*d,y=Math.sin(a)*d+(v.reducedMotion?0:progress*progress*12);
    ctx.globalAlpha=fade*(.55+random(p.seed,i+300)*.45);fragment(ctx,x,y,size,v.reducedMotion?0:a+progress*(random(p.seed,i+320)-.5)*4,p,c,i);
   }
   if(progress<.45){ctx.globalAlpha=fade*(1-progress/.45);ctx.fillStyle=c.accent;starPath(ctx,0,0,(1-progress)*v.pixelsPerUnit*.27,4,-Math.PI/2,.16);ctx.fill();}
  });
  return {kind:p.kind,powerId:p.id||effect.powerId,core:{...point,radius:r},particleCount:count,progress};
 }
 function drawStageLighting(ctx,view={}){
  if(!ctx)return null;const v=config(view),w=v.width,h=v.height;
  if(w<=0||h<=0)return null;
  saved(ctx,()=>{
   // Inset clipping keeps all four source-art corners completely untouched.
   ctx.beginPath();ctx.rect(w*.08,h*.07,w*.84,h*.86);ctx.clip();
   const top=h*.09,bottom=Math.min(v.floor+45,h*.92),sway=v.reducedMotion?0:Math.sin(v.time*.13)*w*.012;
   for(const [side,color]of [[.24,'#a9d7ff'],[.76,'#ffe3a4']]){
    const x=w*side+sway,light=ctx.createLinearGradient(x,top,x,bottom);light.addColorStop(0,rgba(color,.025));light.addColorStop(.65,rgba(color,.012));light.addColorStop(1,rgba(color,0));
    polygon(ctx,[[x-w*.018,top],[x+w*.018,top],[x+w*.22,bottom],[x-w*.22,bottom]],light);
   }
   ctx.fillStyle=radial(ctx,w*.5,v.floor+5,w*.37,[[0,rgba('#96c9ef',.035)],[1,rgba('#96c9ef',0)]]);ellipse(ctx,w*.5,v.floor+5,w*.37,h*.048);ctx.fill();
   for(const side of ['left','right']){
    if(!Number.isFinite(view[side+'X']))continue;
    const x=v.originX+view[side+'X']*v.pixelsPerUnit,color=hex(view[side+'Color'],'#b9d7ed'),radius=v.pixelsPerUnit*1.2;
    ctx.save();ctx.translate(x,v.floor+4);ctx.scale(1,.15);ctx.fillStyle=radial(ctx,0,0,radius,[[0,rgba(color,.095)],[.45,rgba(color,.045)],[1,rgba(color,0)]]);circle(ctx,0,0,radius);ctx.fill();ctx.restore();
    ellipse(ctx,x,v.floor+3,radius*.63,radius*.085);ctx.strokeStyle=rgba(color,.06);ctx.lineWidth=1;ctx.stroke();
   }
  });
  return {inset:true};
 }
 const api={KINDS,drawProjectile,drawCharge,drawImpact,drawStageLighting,projectileGeometry};
 root.NationPowerFX=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
