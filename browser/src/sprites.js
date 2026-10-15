(function(root){
 'use strict';
 const C=root.NationCombat||(typeof require==='function'?require('./combat.js'):null);
 const PAKISTAN_ART={width:2172,height:724,scale:2.72/623,frames:{
  idle:{x:0,y:40,w:485,h:650,pivot:245,baseline:668,clip:[[0,0],[425,0],[425,380],[485,560],[485,650],[0,650]]},
  punch:{x:420,y:60,w:735,h:630,pivot:810,baseline:668,tipX:1133,tipY:190,clip:[[80,0],[735,0],[735,195],[610,240],[610,510],[650,630],[60,630],[60,485],[20,370],[20,165],[80,125]]},
  kick:{x:1060,y:40,w:750,h:650,pivot:1425,baseline:668,tipX:1795,tipY:147,clip:[[165,0],[750,0],[750,265],[600,325],[555,650],[190,650],[190,420],[0,300],[75,205],[165,145]]},
  block:{x:1680,y:65,w:492,h:625,pivot:1950,baseline:668,clip:[[195,0],[492,0],[492,625],[0,625],[0,360],[80,270],[195,200]]}
 }};
 C.registerSpriteGeometry('pk',PAKISTAN_ART);const METADATA={jp:C.JAPAN_ART,pk:PAKISTAN_ART};
 function imageFor(id,assets){return assets.sprites?.[id]||(id==='pk'?assets.pakistanImage:assets.japanImage);}
 function sourcePose(f){if(f.move&&f.moveFrame>=f.move.start&&C.extension(f)>.25)return f.move.visualPose||(['heavy','special','ultimate'].includes(f.move.id)?'kick':'punch');return f.pose==='block'||(f.guard&&!f.move)?'block':'idle';}
 function paint(ctx,image,frame){if(frame.clip){ctx.beginPath();frame.clip.forEach(([x,y],i)=>i?ctx.lineTo(frame.x+x,frame.y+y):ctx.moveTo(frame.x+x,frame.y+y));ctx.closePath();ctx.clip();}ctx.drawImage(image,frame.x,frame.y,frame.w,frame.h,frame.x,frame.y,frame.w,frame.h);}

 // Keep the supplied green/gold cloth unchanged when a fighter turns around.
 // Only its white painted national emblem is counter-mirrored. The original
 // hand covering part of the kick cape remains in front of the emblem.
 const CAPE_REGIONS={
  idle:{x:64,y:267,w:74,h:82},punch:{x:575,y:247,w:84,h:91},
  kick:{x:1168,y:291,w:76,h:88},block:{x:1817,y:303,w:71,h:94}
 };
 const capeCache=new WeakMap();
 function canvasOf(w,h){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;return canvas;}
 function correctedCape(image,pose){
  let cache=capeCache.get(image);if(!cache){cache={};capeCache.set(image,cache);}if(cache[pose])return cache[pose];
  const region=CAPE_REGIONS[pose];if(!region||typeof document==='undefined')return null;
  const {x,y,w,h}=region,canvas=canvasOf(w,h),context=canvas.getContext('2d',{willReadFrequently:true});
  context.drawImage(image,x,y,w,h,0,0,w,h);const raw=context.getImageData(0,0,w,h),source=new Uint8ClampedArray(raw.data),output=raw.data,white=new Uint8Array(w*h);
  const foreground=(px,py)=>pose==='kick'&&x+px>=1220&&y+py<=347;
  const green=i=>source[i*4+3]>180&&source[i*4+1]>source[i*4]*1.22&&source[i*4+1]>source[i*4+2]*1.07;
  for(let py=0;py<h;py++)for(let px=0;px<w;px++){
   const i=py*w+px,r=source[i*4],g=source[i*4+1],b=source[i*4+2];
   white[i]=!foreground(px,py)&&source[i*4+3]>180&&Math.min(r,g,b)>83&&Math.max(r,g,b)-Math.min(r,g,b)<45&&r>g*.77&&b>g*.76?1:0;
  }
  for(let py=0;py<h;py++)for(let px=0;px<w;px++){
   const i=py*w+px;if(!white[i])continue;let sum=[0,0,0],count=0;
   for(let radius=1;radius<52&&!count;radius+=2)for(let n=0;n<16;n++){
    const angle=n*Math.PI/8,sx=Math.round(px+Math.cos(angle)*radius),sy=Math.round(py+Math.sin(angle)*radius);
    if(sx<0||sx>=w||sy<0||sy>=h)continue;const j=sy*w+sx;if(!green(j)||white[j])continue;
    for(let k=0;k<3;k++)sum[k]+=source[j*4+k];count++;
   }
   for(let k=0;k<3;k++)output[i*4+k]=count?Math.round(sum[k]/count):[8,65,42][k];
  }
  for(let py=0;py<h;py++)for(let px=0;px<w;px++){
   const i=py*w+px;if(!white[i])continue;const dx=w-1-px,j=py*w+dx;
   if(foreground(dx,py))continue;
   for(let k=0;k<4;k++)output[j*4+k]=source[i*4+k];
  }
  context.putImageData(raw,0,0);cache[pose]={canvas,region};return cache[pose];
 }
 function draw(ctx,f,view={},assets={}){
  const art=METADATA[f.data.id],image=imageFor(f.data.id,assets);if(!art||!image?.naturalWidth)return null;
  const ppu=view.pixelsPerUnit||78,origin=view.originX??640,floor=view.floor??551,t=view.time||0,pose=sourcePose(f),frame=art.frames[pose],scale=art.scale*ppu;
  const age=Math.max(0,(view.frame??0)-f.damagedAt),low=f.low&&f.y===0?C.GEOMETRY.crouchHeight/C.GEOMETRY.height:1;
  const ranged=f.move&&['special','ultimate'].includes(f.move.id),attacking=pose!=='idle'&&pose!=='block';
  const xRatio=attacking&&!ranged?(f.move?.visualScaleX||1):1,yRatio=attacking?(f.move?.visualScaleY||1):low;
  const x=origin+f.x*ppu,y=floor-f.y*ppu;ctx.save();ctx.fillStyle='#020b13';ctx.globalAlpha=.25;ctx.beginPath();ctx.ellipse(x,floor+5,45-f.y*3,10,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.save();ctx.translate(x,y);if(f.hp<=0){ctx.translate(0,-3);ctx.rotate(-f.facing*1.35);}else if(f.pose==='hit')ctx.rotate(-f.facing*.09*C.clamp(age/4,0,1));else if(f.pose==='walk')ctx.translate(0,-Math.abs(Math.sin(t*10))*3);else if(!f.move)ctx.translate(0,Math.sin(t*3)*1.1);
  ctx.scale(f.facing*scale*xRatio,scale*yRatio);ctx.translate(-frame.pivot,-frame.baseline);if(f.flash>0)ctx.filter='brightness(1.7) saturate(.55)';paint(ctx,image,frame);let capeCorrected=false;if(f.data.id==='pk'&&f.facing===-1){const patch=correctedCape(image,pose);if(patch){ctx.drawImage(patch.canvas,patch.region.x,patch.region.y);capeCorrected=true;}}ctx.restore();
  const flag=assets.flags?.[f.data.id];if(flag&&f.hp>0){ctx.save();ctx.globalAlpha=.85;ctx.drawImage(flag,x-10,y-90*low,22,16);ctx.restore();}
  const tip=frame.tipX?{x:f.x+f.facing*(frame.tipX-frame.pivot)*art.scale*xRatio,y:f.y+(frame.baseline-frame.tipY)*art.scale*yRatio}:{x:f.x+f.facing*.6,y:f.y+1.8};
  return {hand:tip,foot:tip,energyTip:tip,strikeTip:C.contact(f)?{x:C.contact(f).x,y:C.contact(f).y}:tip,diagnostic:{countryId:f.data.id,facing:f.facing,flagMirrored:f.data.id==='pk'&&f.facing===-1&&!capeCorrected,capeEmblemCorrect:f.data.id!=='pk'||f.facing===1||capeCorrected,pose}};
 }
 const portraits=new Map();
 function portrait(data,assets){if(portraits.has(data.id))return portraits.get(data.id);const art=METADATA[data.id],image=imageFor(data.id,assets);if(!art||!image?.naturalWidth)return '';
  const frame=art.frames.idle,canvas=document.createElement('canvas');canvas.width=240;canvas.height=270;const ctx=canvas.getContext('2d');const g=ctx.createRadialGradient(120,200,0,120,150,230);g.addColorStop(0,data.colors[0]+'77');g.addColorStop(1,'#0b172400');ctx.fillStyle=g;ctx.fillRect(0,0,240,270);
  ctx.save();const scale=.58;ctx.translate(120,365);ctx.scale(scale,scale);ctx.translate(-frame.pivot,-frame.baseline);paint(ctx,image,frame);ctx.restore();const uri=canvas.toDataURL('image/webp',.9);portraits.set(data.id,uri);return uri;
 }
 root.NationSprites={METADATA,PAKISTAN_ART,draw,portrait,sourcePose,CAPE_REGIONS};if(typeof module!=='undefined'&&module.exports)module.exports=root.NationSprites;
})(typeof window!=='undefined'?window:globalThis);
