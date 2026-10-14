/* NationClash's original shared fighter rig. National flag artwork is drawn as
 * unmirrored cloth; all embedded assets remain usable from an offline HTML file. */
(function (root) {
 'use strict';
 const MODEL_PPU=78, TAU=Math.PI*2;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const hash=s=>{let n=2166136261;for(const c of String(s)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
 function rgb(value){const n=parseInt((value||'#aa8064').slice(1),16);return [n>>16&255,n>>8&255,n&255];}
 function mix(color,to,amount){const a=rgb(color),b=rgb(to);return '#'+a.map((c,i)=>Math.round(c+(b[i]-c)*amount).toString(16).padStart(2,'0')).join('');}
 function lookFor(data){const n=hash(data.id);return {faceIndex:n%16,skin:'#b67c59',hairColor:'#221b18',hairstyle:'crop',beard:'none',physique:'athletic',costumeCut:'vest',accessory:'belt',signature:String(n),...data.look};}
 function path(ctx,points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();}
 function line(ctx,a,b,w,color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();ctx.restore();}
 function ellipse(ctx,x,y,rx,ry,color,rotation=0){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rotation,0,TAU);ctx.fill();}
 function grad(ctx,a,b,colors){const g=ctx.createLinearGradient(...a,...b);colors.forEach(([p,c])=>g.addColorStop(p,c));return g;}

 const BODY_PARTS=['torso','upperArm','forearm','fist','pelvis','thigh','shin','boot'];
 function newCanvas(width,height){const c=typeof OffscreenCanvas==='function'?new OffscreenCanvas(width,height):typeof document!=='undefined'?document.createElement('canvas'):null;if(c){c.width=width;c.height=height;}return c;}
 function findBodyParts(assets){
   const atlas=assets.bodyAtlas,meta=assets.bodyAtlasMeta||{},cols=meta.columns||4,rows=meta.rows||2;
   if(!atlas?.naturalWidth)return {};
   const canvas=newCanvas(atlas.naturalWidth,atlas.naturalHeight);if(!canvas)return {};
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(atlas,0,0);const parts={};
   BODY_PARTS.forEach((name,i)=>{
     if(meta.parts?.[name]){parts[name]=meta.parts[name];return;}
     const x=Math.round(i%cols*atlas.naturalWidth/cols),y=Math.round(Math.floor(i/cols)*atlas.naturalHeight/rows),w=Math.round((i%cols+1)*atlas.naturalWidth/cols)-x,h=Math.round((Math.floor(i/cols)+1)*atlas.naturalHeight/rows)-y;
     const pixels=ctx.getImageData(x,y,w,h).data;let left=w,right=0,top=h,bottom=0;
     for(let py=2;py<h-2;py++)for(let px=2;px<w-2;px++){if(pixels[(py*w+px)*4+3]<48)continue;left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);}
     parts[name]={x:x+Math.max(0,left-1),y:y+Math.max(0,top-1),width:right-left+3,height:bottom-top+3};
   });return parts;
 }
 function bodyTexture(assets,name,color='#ffffff',brightness=1.2){
   const source=assets.bodyParts?.[name];if(!assets.bodyAtlas?.naturalWidth||!source)return null;
   const key=name+':'+color+':'+brightness,cache=assets.bodyTextureCache||(assets.bodyTextureCache=new Map());if(cache.has(key))return cache.get(key);
   const canvas=newCanvas(Math.ceil(source.width),Math.ceil(source.height));if(!canvas)return null;
   const c=canvas.getContext('2d');c.filter='brightness('+brightness+')';c.drawImage(assets.bodyAtlas,source.x,source.y,source.width,source.height,0,0,canvas.width,canvas.height);c.filter='none';
   c.globalCompositeOperation='multiply';c.fillStyle=color;c.fillRect(0,0,canvas.width,canvas.height);c.globalCompositeOperation='destination-in';c.drawImage(assets.bodyAtlas,source.x,source.y,source.width,source.height,0,0,canvas.width,canvas.height);c.globalCompositeOperation='source-over';
   cache.set(key,canvas);if(cache.size>96)cache.delete(cache.keys().next().value);return canvas;
 }
 function texturedSegment(ctx,name,assets,color,a,b,r1,r2){
   const image=bodyTexture(assets,name,color);if(!image)return false;
   const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)-Math.PI/2;
   ctx.save();segmentPath(ctx,a,b,r1,r2);ctx.clip();ctx.translate(...a);ctx.rotate(angle);ctx.drawImage(image,-r1*1.13,-r1*.23,r1*2.26,length+r1*.4);ctx.restore();return true;
 }
 function textureRect(ctx,name,assets,color,bounds,brightness=1.2){const image=bodyTexture(assets,name,color,brightness);if(!image)return false;ctx.drawImage(image,bounds.x,bounds.y,bounds.width,bounds.height);return true;}

 function segmentPath(ctx,a,b,r1,r2){
   const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length;
   ctx.beginPath();ctx.moveTo(a[0]+nx*r1,a[1]+ny*r1);
   ctx.bezierCurveTo(a[0]+dx*.3+nx*r1*1.12,a[1]+dy*.3+ny*r1*1.12,b[0]-dx*.15+nx*r2,b[1]-dy*.15+ny*r2,b[0]+nx*r2,b[1]+ny*r2);
   ctx.quadraticCurveTo(b[0]+dx*.13,b[1]+dy*.13,b[0]-nx*r2,b[1]-ny*r2);
   ctx.bezierCurveTo(b[0]-dx*.28-nx*r2*1.18,b[1]-dy*.28-ny*r2*1.18,a[0]+dx*.16-nx*r1,a[1]+dy*.16-ny*r1,a[0]-nx*r1,a[1]-ny*r1);
   ctx.quadraticCurveTo(a[0]-dx*.12,a[1]-dy*.12,a[0]+nx*r1,a[1]+ny*r1);ctx.closePath();
   return {nx,ny,dx,dy};
 }
 function muscle(ctx,a,b,r1,r2,skin,back=false,assets={},part='upperArm'){
   const {nx,ny,dx,dy}=segmentPath(ctx,a,b,r1,r2);
   ctx.fillStyle=grad(ctx,[a[0]-nx*r1,a[1]-ny*r1],[a[0]+nx*r1,a[1]+ny*r1],[[0,mix(skin,'#0b0709',back?.6:.48)],[.28,mix(skin,'#1a0e0a',.13)],[.55,mix(skin,'#fff2d0',back?.08:.31)],[.77,skin],[1,mix(skin,'#201318',.5)]]);ctx.fill();
   texturedSegment(ctx,part,assets,skin,a,b,r1,r2);segmentPath(ctx,a,b,r1,r2);ctx.strokeStyle='rgba(7,10,17,.32)';ctx.lineWidth=.65;ctx.stroke();
   ctx.save();ctx.globalAlpha=back?.1:.35;line(ctx,[a[0]+dx*.18-nx*r1*.35,a[1]+dy*.18-ny*r1*.35],[a[0]+dx*.63-nx*r2*.3,a[1]+dy*.63-ny*r2*.3],1.2,'#ffe5ba');ctx.restore();
   line(ctx,[a[0]+dx*.34+nx*r1*.62,a[1]+dy*.34+ny*r1*.62],[a[0]+dx*.74+nx*r2*.6,a[1]+dy*.74+ny*r2*.6],.8,'#341e1b',.45);
 }
 /** Draw an actual flag inside a cloth panel. Call after the rig's facing scale.
  * The inverse horizontal transform keeps symbols and lettering readable. */
 function drawFlagCloth(ctx,id,bounds,assets={},options={}){
   const image=assets.flags?.[id]||assets.flagImages?.[id],facing=options.facing===-1?-1:1;
   if(!image||!image.complete||!image.naturalWidth)return false;
   const {x,y}=bounds,width=bounds.width??bounds.w,height=bounds.height??bounds.h;
   ctx.save();if(options.clip)options.clip(ctx);if(options.clip)ctx.clip();
   ctx.globalAlpha*=options.opacity??1;
   if(facing===-1){ctx.scale(-1,1);ctx.drawImage(image,-x-width,y,width,height);}
   else ctx.drawImage(image,x,y,width,height);
   ctx.restore();return true;
 }
 function flagLayer(ctx,data,points,bounds,assets,facing,base){
   path(ctx,points);ctx.fillStyle=base;ctx.fill();
   drawFlagCloth(ctx,data.id,bounds,assets,{facing,clip:c=>path(c,points)});
   path(ctx,points);ctx.fillStyle=grad(ctx,[bounds.x,bounds.y],[bounds.x+bounds.width,bounds.y+bounds.height],[[0,'rgba(0,2,12,.68)'],[.26,'rgba(255,245,219,.12)'],[.44,'rgba(255,255,255,.22)'],[.58,'rgba(0,0,0,.08)'],[1,'rgba(0,0,9,.65)']]);ctx.fill();
   ctx.strokeStyle='#10151d';ctx.lineWidth=1.1;ctx.stroke();
   ctx.save();path(ctx,points);ctx.clip();for(let i=0;i<3;i++){const fx=bounds.x+bounds.width*(.2+i*.27);ctx.beginPath();ctx.moveTo(fx,bounds.y);ctx.bezierCurveTo(fx-3,bounds.y+bounds.height*.3,fx+3,bounds.y+bounds.height*.62,fx-2,bounds.y+bounds.height);ctx.strokeStyle=i%2?'rgba(0,0,15,.25)':'rgba(255,244,207,.18)';ctx.lineWidth=i%2?2.2:1;ctx.stroke();}ctx.restore();
 }
 function elbow(a,b,bend,length=.5){const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy)||1;return [a[0]+dx*length-dy/d*bend,a[1]+dy*length+dx/d*bend];}
 function geometry(f,time=0){
   const data=f.data||{},look=lookFor(data),crouch=f.low&&f.y===0?1:0;
   const moving=f.pose==='walk'&&!f.move,step=moving?Math.sin(time*11+(f.x||0)*.15):0;
   let bob=moving?-Math.abs(step)*2:Math.sin(time*2.8)*1.1;
   const ext=root.NationCombat?.extension?root.NationCombat.extension(f):f.move?1:0;
   let lean=f.move?ext*7:0;
   if(f.pose==='hit')lean=-Math.min(15,(f.stun||0)*.55);
   const powerful=look.physique==='powerful',broad=look.physique==='broad'||powerful;
   const width=(look.physique==='lean'?.87:broad?1.15:1)*(data.style==='Brawler'?1.07:data.style==='Kicker'?.95:1);
   const hip=[lean*.35,-83+crouch*31+bob],shoulder=[lean,-144+crouch*44+bob];
   const head=[lean-1,-164+crouch*60+bob];
   let frontHand=[46+lean,-135+crouch*39+bob],rearHand=[7+lean,-150+crouch*45+bob];
   let frontFoot=[43+step*20,-Math.max(0,step)*16],rearFoot=[-22-step*18,-Math.max(0,-step)*16];
   const stance={Striker:[[46,-138],[5,-152]],Grappler:[[52,-127],[2,-137]],Brawler:[[42,-151],[-7,-158]],Kicker:[[35,-155],[3,-157]],Trickster:[[49,-133],[-9,-149]],Duelist:[[55,-132],[-6,-150]],'Dual-Stance':[[46,-149],[11,-156]],Zoner:[[51,-137],[-4,-148]]}[data.style];
   if(stance){frontHand=[stance[0][0]+lean,stance[0][1]+crouch*42+bob];rearHand=[stance[1][0]+lean,stance[1][1]+crouch*45+bob];}
   if(data.style==='Kicker'){frontFoot[0]+=7;rearFoot[0]-=3;}
   if(data.style==='Grappler'){frontFoot[0]+=3;rearFoot[0]-=6;}
   if(f.y>0){frontFoot=[47,-29];rearFoot=[-25,-18];}
   if(f.guard||f.pose==='block'){frontHand=[35+lean,-165+crouch*51+bob];rearHand=[4+lean,-170+crouch*51+bob];}
   if(f.pose==='hit'){frontHand=[35+lean,-105+crouch*22+bob];rearHand=[-25+lean,-131+crouch*39+bob];}
   let strikeTip=null,energyTip=null,strikeLimb='hand';
   if(f.move){
     const m=f.move,kick=m.visualPose==='kick'||m.id==='heavy'||m.id==='break'||(data.style==='Kicker'&&m.id==='light');
     strikeLimb=kick?'foot':'hand';
     const point=root.NationCombat?.contact?root.NationCombat.contact(f):{x:f.x+f.facing*m.reach,y:f.y+m.height};
     const target=[(point.x-f.x)*f.facing*MODEL_PPU,-(point.y-f.y)*MODEL_PPU];
     energyTip=target;
     // Long ranged techniques launch energy from the hand. The energy endpoint,
     // rather than an impossibly stretched limb, remains at engine contact.
     const ranged=['special','ultimate'].includes(m.id)&&target[0]>165;
     const rest=kick?frontFoot:frontHand,tip=ranged?[112,-140+crouch*45]:target;
     strikeTip=[rest[0]+(tip[0]-rest[0])*ext,rest[1]+(tip[1]-rest[1])*ext];
     if(ranged){strikeLimb='hand';frontHand=strikeTip;rearHand=[11+lean,-150+crouch*42];}
     else if(kick){frontFoot=strikeTip;frontHand=[35+lean,-153+crouch*45];rearHand=[4+lean,-165+crouch*51];}
     else {frontHand=strikeTip;rearHand=m.id==='throw'?[31+ext*37,-131+crouch*34]:[5+lean,-161+crouch*47];}
   }
   const frontWrist=[frontHand[0]-17,frontHand[1]+1],rearWrist=[rearHand[0]-15,rearHand[1]+2];
   const frontShoulder=[shoulder[0]+19*width,shoulder[1]+2],rearShoulder=[shoulder[0]-20*width,shoulder[1]+5];
   const frontAnkle=[frontFoot[0]-22,frontFoot[1]-6],rearAnkle=[rearFoot[0]-18,rearFoot[1]-5];
   let frontKnee=elbow([hip[0]+12*width,hip[1]],frontAnkle,-7-crouch*15,.55);
   let rearKnee=elbow([hip[0]-12*width,hip[1]],rearAnkle,4+crouch*12,.51);
   if(strikeLimb==='foot'&&f.move){frontKnee=elbow([hip[0]+12*width,hip[1]],frontAnkle,12*(1-ext),.48);}
   return {look,width,bob,lean,crouch,hip,shoulder,head,frontHand,rearHand,frontWrist,rearWrist,frontShoulder,rearShoulder,
    frontElbow:elbow(frontShoulder,frontWrist,14*(1-ext*.7),.53),rearElbow:elbow(rearShoulder,rearWrist,18,.5),
    frontFoot,rearFoot,frontAnkle,rearAnkle,frontKnee,rearKnee,strikeTip,energyTip,strikeLimb,extension:ext};
 }
 function clothLeg(ctx,data,a,knee,ankle,tip,width,assets,facing,back){
   const primary=data.colors?.[0]||'#3d785f',secondary=data.colors?.[1]||'#e5c188';
   const n=segmentPath(ctx,a,knee,width,width*.8);ctx.fillStyle=grad(ctx,[a[0]-width,a[1]],[a[0]+width,a[1]],[[0,mix(primary,'#080b17',.65)],[.4,primary],[.66,mix(primary,'#ffffff',.12)],[1,mix(primary,'#050c14',.7)]]);ctx.fill();ctx.strokeStyle='#111621';ctx.lineWidth=1.3;ctx.stroke();
   // Upper trouser panels show the entire emblem as tailored flag cloth.
   const textured=texturedSegment(ctx,'thigh',assets,'#ffffff',a,knee,width,width*.8);
   const bounds={x:Math.min(a[0],knee[0])-width,y:Math.min(a[1],knee[1])-4,width:Math.abs(a[0]-knee[0])+width*2,height:Math.abs(a[1]-knee[1])+10};
   ctx.save();if(textured)ctx.globalCompositeOperation='multiply';drawFlagCloth(ctx,data.id,bounds,assets,{facing,opacity:textured?1:back?.42:.82,clip:c=>segmentPath(c,a,knee,width*.94,width*.7)});ctx.restore();
   segmentPath(ctx,a,knee,width*.97,width*.78);ctx.fillStyle=grad(ctx,[a[0]-width,a[1]],[a[0]+width,a[1]+8],[[0,'rgba(0,0,15,.66)'],[.3,'rgba(255,246,221,.05)'],[.57,'rgba(255,255,255,.13)'],[1,'rgba(0,0,15,.6)']]);ctx.fill();
   const g=segmentPath(ctx,knee,ankle,width*.83,width*.49);ctx.fillStyle=grad(ctx,[knee[0]-width,knee[1]],[knee[0]+width,knee[1]],[[0,mix(primary,'#050713',.73)],[.42,mix(primary,'#f7ebd0',.05)],[1,mix(primary,'#07101c',.78)]]);ctx.fill();texturedSegment(ctx,'shin',assets,mix(primary,'#ffffff',.28),knee,ankle,width*.83,width*.49);segmentPath(ctx,knee,ankle,width*.83,width*.49);ctx.strokeStyle='#111621';ctx.lineWidth=1;ctx.stroke();
   const stitch=mix(secondary,'#e6d59a',.35);line(ctx,[a[0]+n.nx*width*.7,a[1]+n.ny*width*.7],[knee[0]+n.nx*width*.48,knee[1]+n.ny*width*.48],1,stitch,.7);
   for(let i=0;i<3;i++){const t=.28+i*.21;line(ctx,[a[0]+n.dx*t-width*.5,a[1]+n.dy*t],[a[0]+n.dx*t+width*.38,a[1]+n.dy*t+3],.7,'#ffffff',.13);}
   line(ctx,[knee[0]-width*.5,knee[1]],[knee[0]+width*.3,knee[1]-3],2,mix(primary,'#05030c',.6));
   boot(ctx,ankle,tip,secondary,back,assets);
 }
 function boot(ctx,ankle,tip,accent,back,assets={}){
   const top=[ankle[0]-4,ankle[1]-10],toe=[tip[0],tip[1]];
   ctx.beginPath();ctx.moveTo(top[0]-7,top[1]);ctx.lineTo(top[0]+8,top[1]-2);ctx.quadraticCurveTo(ankle[0]+12,ankle[1],toe[0],toe[1]-4);ctx.quadraticCurveTo(toe[0],toe[1]+1,toe[0]-6,toe[1]+1);ctx.lineTo(ankle[0]-9,ankle[1]+5);ctx.closePath();
   ctx.fillStyle=grad(ctx,[top[0],top[1]],[toe[0],toe[1]],[[0,'#10131f'],[.35,'#49505b'],[.65,'#151923'],[1,'#070b11']]);ctx.fill();ctx.save();ctx.clip();textureRect(ctx,'boot',assets,'#b4becb',{x:ankle[0]-12,y:top[1]-3,width:tip[0]-ankle[0]+12,height:22},1.2);ctx.restore();ctx.strokeStyle='#05080d';ctx.lineWidth=1;ctx.stroke();
   line(ctx,[ankle[0]-5,ankle[1]+4],[toe[0]-4,toe[1]+1],2.3,accent,back?.5:.9);
   for(let i=0;i<3;i++)line(ctx,[top[0]-3+i*1.7,top[1]+4+i*3],[top[0]+6+i*2.4,top[1]+3+i*3],.8,'#c2c8c6',.65);
 }
 function glove(ctx,tip,skin,primary,back=false,assets={}){
   const cx=tip[0]-10,cy=tip[1];
   // Knuckle edge is the actual collision point, not the centre of a circle.
   ctx.beginPath();ctx.moveTo(cx-12,cy-7);ctx.quadraticCurveTo(cx+4,cy-13,tip[0],cy-5);ctx.lineTo(tip[0],cy+4);ctx.quadraticCurveTo(cx+5,cy+11,cx-9,cy+8);ctx.closePath();
   ctx.fillStyle=grad(ctx,[cx,cy-11],[cx+4,cy+10],[[0,'#63646b'],[.23,'#292e39'],[.72,'#10141d'],[1,'#040811']]);ctx.fill();ctx.save();ctx.clip();textureRect(ctx,'fist',assets,'#b6bec5',{x:cx-13,y:cy-13,width:23,height:25},1.35);ctx.restore();ctx.strokeStyle='#080c15';ctx.lineWidth=1;ctx.stroke();
   ctx.save();ctx.globalAlpha=back?.55:.9;line(ctx,[cx-10,cy-5],[cx-9,cy+7],4,primary);ctx.restore();
   for(let i=0;i<3;i++){line(ctx,[cx+1+i*3,cy-5],[cx+2+i*3,cy+2],.8,'#bac0c8',.48);}
   line(ctx,[cx-1,cy-8],[cx+7,cy-7],1.2,'#dce3e8',.6);
   ellipse(ctx,cx-5,cy+7,4,2.8,mix(skin,'#1b1020',.32),-.4);
 }
 function arm(ctx,data,shoulder,elbowPoint,wrist,tip,size,assets,back){
   const look=lookFor(data),skin=look.skin,primary=data.colors?.[0]||'#52afad';
   muscle(ctx,shoulder,elbowPoint,size,size*.77,skin,back,assets,'upperArm');ellipse(ctx,elbowPoint[0],elbowPoint[1],size*.77,size*.82,mix(skin,'#1c1013',back?.26:.1));
   muscle(ctx,elbowPoint,wrist,size*.77,size*.45,skin,back,assets,'forearm');
   const d=[wrist[0]-elbowPoint[0],wrist[1]-elbowPoint[1]],length=Math.hypot(...d)||1,n=[-d[1]/length,d[0]/length];
   for(let i=0;i<3;i++){const t=.64+i*.09,p=[elbowPoint[0]+d[0]*t,elbowPoint[1]+d[1]*t];line(ctx,[p[0]+n[0]*size*.57,p[1]+n[1]*size*.57],[p[0]-n[0]*size*.57,p[1]-n[1]*size*.57],2.2,look.accessory==='arm-wrap'?primary:'#202735');line(ctx,[p[0]+n[0]*size*.5,p[1]+n[1]*size*.5],[p[0]-n[0]*size*.5,p[1]-n[1]*size*.5],.55,'#ded7b3',.65);}
   glove(ctx,tip,skin,primary,back,assets);
 }
 function cape(ctx,data,p,assets,facing,time){
   const look=p.look;if(!['mantle','gi','sash'].includes(look.costumeCut)&&look.accessory!=='scarf')return;
   const s=p.shoulder,h=p.hip,flow=Math.sin(time*3+(hash(data.id)%20))*5+(facing>0?0:1);
   const points=[[s[0]-25,s[1]-6],[s[0]-8,s[1]+3],[h[0]-13,h[1]+6],[h[0]-43+flow,-20+p.crouch*5],[h[0]-60+flow,-35+p.crouch*5],[s[0]-44,s[1]+20]];
   const minX=Math.min(...points.map(v=>v[0])),minY=Math.min(...points.map(v=>v[1]));
   flagLayer(ctx,data,points,{x:minX,y:minY,width:60,height:128-p.crouch*40},assets,facing,data.colors?.[0]||'#428973');
   for(let i=0;i<4;i++)line(ctx,[s[0]-26-i*3,s[1]+4],[h[0]-24-i*8+flow,-34+i*2],1.3,i%2?'#020817':'#eee6c0',.25);
   line(ctx,points[3],points[4],2,data.colors?.[1]||'#f4d684',.8);
 }
 function torso(ctx,data,p,assets,facing){
   const {hip:h,shoulder:s,width:w,look}=p,skin=look.skin,primary=data.colors?.[0]||'#61aa86',secondary=data.colors?.[1]||'#dddacc';
   const shoulderWidth=29*w,waistWidth=18*w;
   const body=[[s[0]-shoulderWidth,s[1]],[s[0]-23*w,s[1]-5],[s[0]+20*w,s[1]-6],[s[0]+shoulderWidth,s[1]+1],[h[0]+waistWidth,h[1]-2],[h[0]-waistWidth,h[1]+1]];
   ctx.beginPath();ctx.moveTo(...body[0]);ctx.quadraticCurveTo(s[0]-28*w,s[1]-7,...body[1]);ctx.quadraticCurveTo(s[0],s[1]-9,...body[2]);ctx.quadraticCurveTo(s[0]+28*w,s[1]-4,...body[3]);ctx.bezierCurveTo(s[0]+33*w,s[1]+17,h[0]+19*w,h[1]-29,...body[4]);ctx.quadraticCurveTo(h[0],h[1]+4,...body[5]);ctx.bezierCurveTo(h[0]-19*w,h[1]-29,s[0]-34*w,s[1]+20,...body[0]);ctx.closePath();ctx.fillStyle=grad(ctx,[s[0]-shoulderWidth,s[1]],[s[0]+shoulderWidth,s[1]],[[0,mix(skin,'#140e1a',.64)],[.33,skin],[.55,mix(skin,'#fff3d2',.31)],[.76,skin],[1,mix(skin,'#1b1020',.45)]]);ctx.fill();ctx.save();ctx.clip();textureRect(ctx,'torso',assets,skin,{x:s[0]-shoulderWidth*1.05,y:s[1]-9,width:shoulderWidth*2.1,height:h[1]-s[1]+14});ctx.restore();ctx.strokeStyle='#110e1a';ctx.lineWidth=.8;ctx.stroke();
   // Pectorals, obliques, abdomen, and collar bones are shaded surfaces.
   if(!assets.bodyAtlas)for(const direction of [-1,1]){
     ctx.beginPath();ctx.moveTo(s[0],s[1]+4);ctx.quadraticCurveTo(s[0]+direction*24*w,s[1]-3,s[0]+direction*25*w,s[1]+14);ctx.quadraticCurveTo(s[0]+direction*16*w,s[1]+27,s[0]+direction*2,s[1]+22);ctx.closePath();ctx.fillStyle=grad(ctx,[s[0],s[1]],[s[0],s[1]+25],[[0,mix(skin,'#fff7dc',.18)],[.48,skin],[1,mix(skin,'#271219',.32)]]);ctx.fill();
     line(ctx,[s[0]+direction*3,s[1]+2],[s[0]+direction*20*w,s[1]+5],.9,'#ffedcc',.4);
     line(ctx,[s[0]+direction*3,s[1]+23],[s[0]+direction*16*w,s[1]+24],1,mix(skin,'#14080e',.56),.75);
   }
   if(!assets.bodyAtlas)for(let i=0;i<3;i++)for(const direction of [-1,1]){
     const y=s[1]+31+i*9,x=s[0]+direction*6;
     ellipse(ctx,x,y,5.7,4,mix(skin,'#fce3ba',.08));line(ctx,[x-direction*4,y+4],[x+direction*4,y+3],.8,mix(skin,'#26101b',.47),.8);
   }
   if(!assets.bodyAtlas)line(ctx,[s[0],s[1]+27],[h[0],h[1]-7],1,mix(skin,'#28131a',.45),.7);
   const lowerY=h[1]-4,height=lowerY-s[1]+4,bounds={x:s[0]-shoulderWidth,y:s[1]-5,width:shoulderWidth*2,height};
   if(look.faceIndex%2===1||look.costumeCut==='jacket'||look.costumeCut==='armored'){
     flagLayer(ctx,data,body,bounds,assets,facing,primary);if(assets.bodyAtlas){ctx.save();path(ctx,body);ctx.clip();ctx.globalCompositeOperation='multiply';textureRect(ctx,'torso',assets,'#ffffff',{x:s[0]-shoulderWidth*1.05,y:s[1]-9,width:shoulderWidth*2.1,height:h[1]-s[1]+14},1.6);ctx.restore();}
     const inner=[[s[0]-9,s[1]-1],[s[0]+7,s[1]-1],[h[0]+4,h[1]-8],[h[0]-4,h[1]-8]];path(ctx,inner);ctx.fillStyle='#111923';ctx.fill();
     for(const direction of [-1,1]){line(ctx,[s[0]+direction*11,s[1]+1],[h[0]+direction*8,h[1]-6],2,secondary,.7);line(ctx,[s[0]+direction*22*w,s[1]+19],[h[0]+direction*13*w,h[1]-10],1,'#e9f4ee',.3);}
     if(look.costumeCut==='armored')for(const direction of [-1,1]){const x=s[0]+direction*17*w;path(ctx,[[x-9,s[1]+9],[x+9,s[1]+10],[x+7,s[1]+28],[x-6,s[1]+26]]);ctx.fillStyle=grad(ctx,[x-10,s[1]],[x+10,s[1]+28],[[0,'#152033'],[.4,'#9babb3'],[.7,'#283645'],[1,'#0b1019']]);ctx.fill();ctx.strokeStyle=secondary;ctx.lineWidth=.7;ctx.stroke();}
   }else{
     // Tailored flag vest/gi/mantle: broad national fabric, open central chest.
     const left=[[s[0]-shoulderWidth,s[1]-3],[s[0]-12,s[1]-8],[h[0]-4,h[1]-6],[h[0]-waistWidth,h[1]],[s[0]-shoulderWidth+4,s[1]+27]],
       right=[[s[0]+12,s[1]-8],[s[0]+shoulderWidth,s[1]-3],[s[0]+shoulderWidth-4,s[1]+24],[h[0]+waistWidth,h[1]],[h[0]+3,h[1]-6]];
     if(look.costumeCut==='vest'||look.costumeCut==='gi'){
       flagLayer(ctx,data,left,bounds,assets,facing,primary);flagLayer(ctx,data,right,bounds,assets,facing,primary);
       line(ctx,left[1],left[2],2,secondary,.9);line(ctx,right[0],right[4],2,secondary,.9);
     }else{
       const sash=[[s[0]-24*w,s[1]-3],[s[0]-14*w,s[1]-6],[h[0]+19*w,h[1]-8],[h[0]+10*w,h[1]-2]];
       flagLayer(ctx,data,sash,bounds,assets,facing,primary);line(ctx,sash[0],sash[3],1.4,secondary,.85);
     }
     // One uninterrupted fabric panel carries the emblem on the waist apron.
     const apron=[[h[0]-20*w,h[1]-18],[h[0]+19*w,h[1]-18],[h[0]+22*w,h[1]+9],[h[0]-22*w,h[1]+9]];
     flagLayer(ctx,data,apron,{x:h[0]-20*w,y:h[1]-18,width:40*w,height:27},assets,facing,primary);
   }
   // Leather belt, metallic clasp, rivets and per-fighter thread details.
   line(ctx,[h[0]-20*w,h[1]-2],[h[0]+19*w,h[1]-3],8,'#111520');line(ctx,[h[0]-19*w,h[1]-4],[h[0]+18*w,h[1]-5],1.3,secondary,.9);
   path(ctx,[[h[0]-4,h[1]-8],[h[0]+6,h[1]-8],[h[0]+6,h[1]+1],[h[0]-4,h[1]+1]]);ctx.fillStyle=grad(ctx,[h[0]-4,h[1]-8],[h[0]+6,h[1]+1],[[0,'#fff0b7'],[.4,secondary],[1,'#584832']]);ctx.fill();
   for(const x of [-14,13])ellipse(ctx,h[0]+x*w,h[1]-3,1.1,1.1,'#d4dedb');
   if(look.accessory==='shoulder-guard'){
     const x=s[0]+18*w;ctx.beginPath();ctx.moveTo(x-10,s[1]-7);ctx.quadraticCurveTo(x+22,s[1]-10,x+18,s[1]+13);ctx.lineTo(x+4,s[1]+17);ctx.closePath();ctx.fillStyle=grad(ctx,[x-10,s[1]-5],[x+15,s[1]+15],[[0,'#b9c9d0'],[.25,'#253445'],[.56,'#738898'],[1,'#111823']]);ctx.fill();ctx.strokeStyle=secondary;ctx.lineWidth=1;ctx.stroke();
   }
 }
 function proceduralHead(ctx,look,p){
   const [x,y]=p.head,skin=look.skin,hair=look.hairColor;
   // A three-quarter face has a jaw, temple, nose bridge and eye sockets.
   ctx.beginPath();ctx.moveTo(x-16,y-10);ctx.quadraticCurveTo(x-21,y+11,x-8,y+20);ctx.lineTo(x+5,y+20);ctx.quadraticCurveTo(x+17,y+10,x+18,y-6);ctx.quadraticCurveTo(x+18,y-25,x-1,y-25);ctx.quadraticCurveTo(x-18,y-25,x-16,y-10);ctx.closePath();
   ctx.fillStyle=grad(ctx,[x-18,y],[x+19,y],[[0,mix(skin,'#150d19',.52)],[.28,skin],[.55,mix(skin,'#fff3d5',.23)],[.79,skin],[1,mix(skin,'#2b0f19',.37)]]);ctx.fill();ctx.strokeStyle='#211624';ctx.lineWidth=.8;ctx.stroke();
   ellipse(ctx,x-16,y+1,4,6,mix(skin,'#170d18',.24));line(ctx,[x-17,y],[x-15,y+4],.8,skin);
   const brow=-5+(hash(look.signature)%3);line(ctx,[x-6,y+brow],[x+1,y+brow-1],2.1,hair);line(ctx,[x+9,y+brow-1],[x+15,y+brow+1],2.1,hair);
   line(ctx,[x-5,y+brow+3],[x,y+brow+3],1.2,'#e1d5c2');line(ctx,[x+10,y+brow+4],[x+14,y+brow+4],1.2,'#ded8c8');
   ellipse(ctx,x-1,y+brow+3,1.1,1.5,'#161f22');ellipse(ctx,x+12,y+brow+4,1,1.4,'#181e20');
   ctx.beginPath();ctx.moveTo(x+4,y-2);ctx.lineTo(x+8,y+8);ctx.lineTo(x+3,y+9);ctx.strokeStyle=mix(skin,'#311020',.43);ctx.lineWidth=1;ctx.stroke();line(ctx,[x+5,y-1],[x+7,y+6],1,'#ffd4ac',.56);
   line(ctx,[x-1,y+14],[x+11,y+13],1.2,mix(skin,'#391220',.52));line(ctx,[x+2,y+16],[x+9,y+16],.7,'#e5baa6',.5);
   if(look.beard!=='none'){
     ctx.beginPath();ctx.moveTo(x-14,y+5);ctx.quadraticCurveTo(x-9,y+19,x+1,y+23);ctx.quadraticCurveTo(x+15,y+18,x+16,y+8);ctx.lineTo(x+12,y+16);ctx.quadraticCurveTo(x+3,y+13,x-4,y+17);ctx.closePath();ctx.fillStyle=look.beard==='stubble'?mix(skin,hair,.4):hair;ctx.fill();
     if(look.beard==='goatee'){ellipse(ctx,x+6,y+19,4,4,hair);}
   }
   const seed=hash(look.signature),style=look.hairstyle;
   if(style!=='shaved'){
     ctx.beginPath();ctx.moveTo(x-17,y+1);ctx.lineTo(x-20,y-15);ctx.quadraticCurveTo(x-20,y-34,x+5,y-28);ctx.quadraticCurveTo(x+23,y-27,x+18,y-10);ctx.lineTo(x+9,y-15);ctx.lineTo(x+3,y-12);ctx.lineTo(x-2,y-18);ctx.lineTo(x-10,y-9);ctx.closePath();ctx.fillStyle=grad(ctx,[x-17,y-23],[x+14,y-12],[[0,mix(hair,'#a9b6bd',.2)],[.35,hair],[1,mix(hair,'#080c12',.42)]]);ctx.fill();
     if(style==='curls')for(let i=0;i<13;i++){const angle=Math.PI+i*.25;ellipse(ctx,x+Math.cos(angle)*15,y-16+Math.sin(angle)*11,3.8,4,mix(hair,'#d0b68e',(i%3)*.055));}
     if(style==='mohawk'){path(ctx,[[x-1,y-20],[x-3,y-36],[x+8,y-35],[x+15,y-19]]);ctx.fillStyle=hair;ctx.fill();}
     if(style==='long'||style==='braid'||style==='tied'){ctx.beginPath();ctx.moveTo(x-17,y-15);ctx.quadraticCurveTo(x-25,y+7,x-15,y+26);ctx.lineTo(x-10,y+11);ctx.lineTo(x-10,y-15);ctx.fillStyle=hair;ctx.fill();}
     for(let i=0;i<6;i++)line(ctx,[x-12+i*4,y-23-(seed%3)],[x-8+i*4,y-14],.65,mix(hair,'#c2bca6',.32),.7);
   }else{line(ctx,[x-13,y-14],[x+7,y-21],1.5,mix(skin,hair,.32),.5);}
 }
 function head(ctx,data,p,assets,facing){
   const look=p.look,[x,y]=p.head,skin=look.skin;
   ctx.beginPath();ctx.moveTo(x-7,y+17);ctx.lineTo(x+7,y+17);ctx.quadraticCurveTo(x+6,p.shoulder[1]-3,x+13,p.shoulder[1]+4);ctx.quadraticCurveTo(x,p.shoulder[1]+9,x-12,p.shoulder[1]+3);ctx.quadraticCurveTo(x-5,p.shoulder[1]-3,x-7,y+17);ctx.closePath();ctx.fillStyle=grad(ctx,[x-8,y],[x+8,y],[[0,mix(skin,'#251424',.38)],[.45,mix(skin,'#fff0c8',.22)],[1,mix(skin,'#2f1920',.4)]]);ctx.fill();line(ctx,[x+4,y+19],[x+6,p.shoulder[1]+1],.8,'#ffe7c9',.25);
   const atlas=assets.headAtlas||assets.heads,meta=assets.headAtlasMeta||{};
   if(atlas?.complete&&atlas.naturalWidth){
     const cols=meta.columns||4,rows=meta.rows||4,index=look.faceIndex% (cols*rows),cw=meta.cellWidth||atlas.naturalWidth/cols,ch=meta.cellHeight||atlas.naturalHeight/rows;
     const crop=meta.crop||{x:0,y:0,width:1,height:1};
     const cell=meta.cells?.[index]||{x:(index%cols)*cw+crop.x*cw,y:Math.floor(index/cols)*ch+crop.y*ch,width:cw*crop.width,height:ch*crop.height};
     const w=meta.drawWidth||42,h=meta.drawHeight||48;
     ctx.drawImage(atlas,cell.x,cell.y,cell.width,cell.height,x-w*.52,y-h*.58,w,h);
     // A subtle rim light joins the painted head to the shaded rig.
     line(ctx,[x-16,y+15],[x-9,y+21],.8,mix(skin,'#ffe5c0',.28),.35);
   }else proceduralHead(ctx,look,p);
   if(look.accessory==='headband'){
     line(ctx,[x-18,y-12],[x+18,y-12],4,data.colors?.[0]||'#ddcc88');line(ctx,[x-17,y-13],[x+17,y-13],.7,data.colors?.[1]||'#fff4bd');
     line(ctx,[x-16,y-12],[x-27,y+1],3,data.colors?.[0]||'#ddcc88');
   }
 }
 function draw(ctx,f,view={},assets={}){
   if(!f?.data)return null;
   if(typeof view==='number')view={time:view};
   const time=view.time||0,ppu=view.pixelsPerUnit||MODEL_PPU,floor=view.floor??551,originX=view.originX??640,facing=f.facing===-1?-1:1;
   const p=geometry(f,time),scale=ppu/MODEL_PPU,x=originX+(f.x||0)*ppu,y=floor-(f.y||0)*ppu;
   if(view.shadow!==false){ctx.save();ctx.globalAlpha=.3;ellipse(ctx,x,floor+5,Math.max(18,45-(f.y||0)*7),8,'#01060e');ctx.restore();}
   ctx.save();ctx.translate(x,y);ctx.scale(facing*scale,scale);
   if(f.hp===0){ctx.translate(0,-5);ctx.rotate(-1.36);}
   if(f.flash>0)ctx.filter='brightness(1.55) saturate(.6)';
   cape(ctx,f.data,p,assets,facing,time);
   const legWidth=12.5*p.width,hip=p.hip;
   clothLeg(ctx,f.data,[hip[0]-10*p.width,hip[1]],p.rearKnee,p.rearAnkle,p.rearFoot,legWidth*.9,assets,facing,true);
   arm(ctx,f.data,p.rearShoulder,p.rearElbow,p.rearWrist,p.rearHand,10.5*p.width,assets,true);
   clothLeg(ctx,f.data,[hip[0]+10*p.width,hip[1]],p.frontKnee,p.frontAnkle,p.frontFoot,legWidth,assets,facing,false);
   torso(ctx,f.data,p,assets,facing);
   head(ctx,f.data,p,assets,facing);
   arm(ctx,f.data,p.frontShoulder,p.frontElbow,p.frontWrist,p.frontHand,11.8*p.width,assets,false);
   // Distinct silhouette gear is decorative and never changes reach.
   if(f.data.style==='Duelist'){line(ctx,[hip[0]-20,hip[1]-4],[hip[0]-42,hip[1]+40],4,'#171c29');line(ctx,[hip[0]-20,hip[1]-4],[hip[0]-40,hip[1]+36],1.3,'#9cafbe');line(ctx,[hip[0]-25,hip[1]+1],[hip[0]-13,hip[1]-5],2,f.data.colors?.[1]||'#d7c684');}
   if(f.data.style==='Zoner'){const wrist=p.frontWrist;line(ctx,[wrist[0]-8,wrist[1]-6],[wrist[0]-6,wrist[1]+6],3,'#aabecb');line(ctx,[wrist[0]-8,wrist[1]-5],[wrist[0]-6,wrist[1]+5],1.1,f.data.colors?.[0]||'#82dfff');}
   if(f.data.style==='Dual-Stance'){const sh=p.frontShoulder;line(ctx,[sh[0]-1,sh[1]+3],[sh[0]+5,sh[1]+10],2.5,f.data.colors?.[1]||'#ecdea1',.9);}
   if(f.data.style==='Brawler'||f.data.style==='Grappler'){line(ctx,[p.frontWrist[0]-5,p.frontWrist[1]-6],[p.frontWrist[0]+4,p.frontWrist[1]+7],2,f.data.colors?.[1]||'#ddcb88');}
   ctx.restore();
   const world=tip=>tip?{x:(f.x||0)+tip[0]*facing/MODEL_PPU,y:(f.y||0)-tip[1]/MODEL_PPU}:null;
   return {geometry:p,hand:world(p.frontHand),foot:world(p.frontFoot),energyTip:world(p.energyTip),strikeTip:world(p.strikeTip)};
 }
 function drawPortrait(ctx,data,assets={},options={}){
   const width=options.width||ctx.canvas.width,height=options.height||ctx.canvas.height,look=lookFor(data);
   ctx.save();ctx.clearRect(0,0,width,height);
   if(options.background!==false){ctx.fillStyle=grad(ctx,[0,0],[width,height],[[0,mix(data.colors?.[0]||'#3e777e','#07111d',.83)],[.5,'#182535'],[1,'#060d16']]);ctx.fillRect(0,0,width,height);ctx.globalAlpha=.12;ellipse(ctx,width*.72,height*.25,width*.56,height*.65,data.colors?.[0]||'#65c49b');ctx.globalAlpha=1;}
   const scale=width/97;ctx.translate(width*.47,height*.90+89*scale);ctx.scale(scale,scale);
   const f={data,x:0,y:0,facing:1,hp:data.hp,pose:'idle',guard:false,low:false,move:null};
   const p=geometry(f,0);p.frontHand=[52,-116];p.frontWrist=[35,-115];p.frontElbow=[40,-122];p.rearHand=[-29,-128];p.rearWrist=[-44,-126];
   cape(ctx,data,p,assets,1,0);arm(ctx,data,p.rearShoulder,p.rearElbow,p.rearWrist,p.rearHand,10*p.width,assets,true);torso(ctx,data,p,assets,1);head(ctx,data,p,assets,1);arm(ctx,data,p.frontShoulder,p.frontElbow,p.frontWrist,p.frontHand,11*p.width,assets,false);
   ctx.restore();return {faceIndex:look.faceIndex};
 }
 const portraitCache=new Map();
 function portrait(data,assets={},options={}){
   if(typeof document==='undefined')return '';
   const key=data.id+':'+(assets.generation||0)+':'+(options.width||180)+':'+(options.height||208);
   if(portraitCache.has(key))return portraitCache.get(key);
   const canvas=document.createElement('canvas');canvas.width=options.width||180;canvas.height=options.height||208;drawPortrait(canvas.getContext('2d'),data,assets,options);
   const uri=canvas.toDataURL('image/webp',.88);portraitCache.set(key,uri);if(portraitCache.size>60)portraitCache.delete(portraitCache.keys().next().value);return uri;
 }
 async function readyImage(image){if(image?.complete&&image.naturalWidth)return image;if(image?.decode){await image.decode();return image;}return image;}
 function loadImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Embedded fighter asset could not decode'));image.src=src;});}
 async function prepareAssets(roster,options={}){
   const assets={...options,flags:{},generation:Date.now()};
   const flags=options.flags||root.NationRoster?.FLAG_SVGS||{};
   const errors=[];
   await Promise.all(roster.map(async data=>{
     const value=flags[data.id];if(!value){errors.push(data.id+': missing flag');return;}
     if(typeof value!=='string'){assets.flags[data.id]=value;return;}
     try{assets.flags[data.id]=await loadImage(value.startsWith('data:')?value:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(value));}catch(error){errors.push(data.id+': '+error.message);}
   }));
   if(typeof options.headAtlas==='string')assets.headAtlas=await loadImage(options.headAtlas);else if(options.headAtlas)assets.headAtlas=await readyImage(options.headAtlas);
   if(typeof options.bodyAtlas==='string')assets.bodyAtlas=await loadImage(options.bodyAtlas);else if(options.bodyAtlas)assets.bodyAtlas=await readyImage(options.bodyAtlas);
   if(assets.bodyAtlas)assets.bodyParts=findBodyParts(assets);
   if(errors.length)throw new Error('Flag asset errors: '+errors.join(', '));
   assets.flagImage=id=>assets.flags[id]||null;return assets;
 }
 const api={draw,drawPortrait,portrait,prepareAssets,drawFlagCloth,geometry,lookFor,MODEL_PPU};
 root.NationFighters=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
