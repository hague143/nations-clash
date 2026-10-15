(function(root){
 'use strict';
 const C=root.NationCombat||(typeof require==='function'?require('./combat.js'):null);
 const ART=root.NationCountryArt||(typeof require==='function'?require('./country-art.js'):null);
 const METADATA=ART.METADATA;
 const ASSET_FILES=/* COUNTRY_ASSET_FILES */null;
 const PORTRAIT_DATA=/* COUNTRY_PORTRAIT_DATA */null;
 for(const [id,art]of Object.entries(METADATA))C.registerSpriteGeometry(id,art);
 const hasArt=id=>Object.prototype.hasOwnProperty.call(METADATA,id);
 const pending=new Map(),cache=new Map();
 const MAX_DECODED=6;
 const requests=new Map();
 function register(id,uri){
  const request=requests.get(id);if(!request)return;
  request.registered=true;
  const image=new Image();image.onload=()=>{requests.delete(id);request.resolve(image);};
  image.onerror=()=>{requests.delete(id);request.reject(new Error('Country fighter artwork could not decode'));};image.src=uri;
 }
 function loadImage(id){return new Promise((resolve,reject)=>{
  const embedded=document.getElementById('country-art-'+id);
  if(embedded){const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Embedded country fighter artwork could not decode'));image.src='data:image/webp;base64,'+embedded.textContent.trim();return;}
  const request={resolve,reject,registered:false};requests.set(id,request);
  const script=document.createElement('script');script.src=ASSET_FILES[id];
  script.onerror=()=>{script.remove();requests.delete(id);reject(new Error('Fighter artwork is missing. Extract the entire ZIP, including its country-art folder, before opening NationClash.html.'));};
  script.onload=()=>{script.remove();if(!request.registered){requests.delete(id);reject(new Error('Country fighter artwork did not register'));}};
  document.head.appendChild(script);
 });}
 async function ensure(ids,assets){
  assets.countrySprites=assets.countrySprites||{};
  for(const id of ids){
   if(!hasArt(id))continue;
   if(cache.has(id)){const image=cache.get(id);cache.delete(id);cache.set(id,image);assets.countrySprites[id]=image;continue;}
   if(!pending.has(id))pending.set(id,loadImage(id));
   try{const image=await pending.get(id);cache.set(id,image);assets.countrySprites[id]=image;}
   finally{pending.delete(id);}
  }
  for(const id of [...cache.keys()]){
   if(cache.size<=MAX_DECODED)break;
   if(ids.includes(id))continue;
   cache.delete(id);delete assets.countrySprites[id];
  }
 }
 function portrait(data){return PORTRAIT_DATA?.[data.id]||'';}
 function sourcePose(f){
  const art=METADATA[f.data.id];if(!art)return null;
  if(f.hp<=0)return 'ko';
  if(f.move){
   if(f.moveFrame>=f.move.start&&f.moveFrame<f.move.start+f.move.active)return f.move.visualPose;
   if(f.moveFrame>=f.move.start+f.move.active&&C.extension(f)>.55)return f.move.visualPose;
   return f.move.low?'crouch':'block';
  }
  if(f.pose==='hit'||f.pending)return 'hit';
  if(f.y>0)return art.frames.jump?'jump':'crouch';
  if(f.low)return 'crouch';
  if(f.pose==='block'||f.guard)return 'block';
  if(f.pose==='walk'&&art.hasWalkPose)return (Math.floor((f.walkTime||0)/7)%2)?'walk':'idle';
  return 'idle';
 }
 function drawFrame(ctx,image,frame,lowWarp){
  const dx=frame.x-frame.pivot,dy=frame.y-frame.baseline;
  if(!lowWarp){ctx.drawImage(image,frame.x,frame.y,frame.w,frame.h,dx,dy,frame.w,frame.h);return;}
  // Preserve the head, shoulders and arm pixels at their natural aspect ratio.
  // Only the area below the strike folds down into the lowered stance.
  const contactY=frame.tipY,upper=Math.max(0,contactY-frame.y),below=frame.baseline-contactY;
  const lowerScale=lowWarp.targetPixels/below;
  ctx.drawImage(image,frame.x,frame.y,frame.w,upper,dx,-lowWarp.targetPixels-upper,frame.w,upper);
  ctx.drawImage(image,frame.x,contactY,frame.w,frame.h-upper,dx,-lowWarp.targetPixels,frame.w,(frame.h-upper)*lowerScale);
 }
 function draw(ctx,f,view={},assets={}){
  const art=METADATA[f.data.id],image=assets.countrySprites?.[f.data.id];
  if(!art||!image?.naturalWidth)return null;
  const ppu=view.pixelsPerUnit||78,origin=view.originX??640,floor=view.floor??551;
  const frameNumber=view.frame??0,time=view.time||0;
  if(f.pose==='walk')f.walkTime=frameNumber;
  const pose=f.hp<=0&&art.hasGroundKo&&frameNumber-f.damagedAt<7?'hit':sourcePose(f),frame=art.frames[pose]||art.frames.idle;
  const attacking=!!f.move&&pose===f.move.visualPose;
  const ranged=attacking&&['special','ultimate'].includes(f.move.id);
  const sx=attacking&&!ranged?(f.move.visualScaleX||1):1;
  const sy=(attacking&&!ranged&&!f.move.visualLowWarp?(f.move.visualScaleY||1):1)*(frame.drawScaleY||1);
  const lowWarp=attacking&&f.move.visualLowWarp?{targetPixels:f.move.height/art.scale}:null;
  const x=origin+f.x*ppu,y=floor-f.y*ppu,scale=art.scale*ppu;
  ctx.save();ctx.globalAlpha=.25;ctx.fillStyle='#020b13';ctx.beginPath();ctx.ellipse(x,floor+5,Math.max(12,45-f.y*3),10,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.save();ctx.translate(x,y);
  // Contact frames never bob, rotate or translate independently of collision.
  if(!attacking&&f.hp>0){
   if(f.pose==='walk')ctx.translate(0,-Math.abs(Math.sin(time*11))*1.7);
   else if(f.pose==='hit')ctx.translate(-f.facing*Math.min(5,f.recoil*3||0),0);
   else if(!f.guard&&!f.low&&f.y===0)ctx.translate(0,Math.sin(time*3)*.7);
  }
  ctx.scale(f.facing*scale*sx,scale*sy);
  if(f.flash>0)ctx.filter='brightness(1.65) saturate(.65)';
  const adaptedKo=f.hp<=0&&art.adaptedKo;
  if(adaptedKo){
   const progress=C.clamp((frameNumber-f.damagedAt)/10,0,1),ease=1-Math.pow(1-progress,3),angle=-Math.PI/2*ease;
   const cos=Math.cos(angle),sin=Math.sin(angle),xs=[frame.x-frame.pivot,frame.x+frame.w-frame.pivot],ys=[frame.y-frame.baseline,frame.y+frame.h-frame.baseline];
   const corners=xs.flatMap(x=>ys.map(y=>({x:x*cos-y*sin,y:x*sin+y*cos})));
   const center=(Math.min(...corners.map(p=>p.x))+Math.max(...corners.map(p=>p.x)))/2;
   ctx.translate(-center*ease,-Math.max(...corners.map(p=>p.y))*ease);ctx.rotate(angle);
  }
  drawFrame(ctx,image,frame,lowWarp);ctx.restore();
  // The official badge remains readable; the supplied painted costume turns
  // with its wearer, as normal mirrored sprite artwork does.
  const flag=assets.flags?.[f.data.id];
  if(flag&&f.hp>0){ctx.save();const low=f.move?f.move.low:f.low,height=low?Math.min(art.crouchHeight,1.8):1.2;ctx.fillStyle='#071018b8';ctx.fillRect(x-13,y-height*ppu-2,27,19);ctx.drawImage(flag,x-11,y-height*ppu,23,15);ctx.restore();}
  let tip={x:f.x+f.facing*.5,y:f.y+1.5};
  if(attacking&&Number.isFinite(frame.tipX))tip={x:f.x+f.facing*(frame.tipX-frame.pivot)*art.scale*sx,y:f.y+(lowWarp?f.move.height:(frame.baseline-frame.tipY)*art.scale*sy)};
  return {hand:tip,foot:tip,energyTip:tip,strikeTip:tip,diagnostic:{countryId:f.data.id,
   renderer:'supplied-country-art',source:art.sourceName,pose,sourceIndex:frame.sourceIndex,
   facing:f.facing,flagMirrored:false,paintedCostumeMirrored:f.facing===-1,
   active:C.active(f),adaptedKo,adaptedCrouch:!!art.adaptedCrouch&&pose==='crouch',strikeTip:tip,contact:C.contact(f),lowWarp:!!lowWarp}};
 }
 const api={METADATA,hasArt,ensure,portrait,sourcePose,draw,register,get loadedIds(){return [...cache.keys()];},MAX_DECODED};
 root.NationCountrySprites=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
