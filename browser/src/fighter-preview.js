(() => {
 'use strict';
 const root=window,C=root.NationCombat,T=root.NationCountrySprites,Q=root.NationPowers,V=root.NationPowerFX;
 const reduced=root.matchMedia('(prefers-reduced-motion: reduce)');
 const canvas=document.createElement('canvas'),label=document.createElement('span');
 canvas.className='fighter-preview-canvas';canvas.setAttribute('aria-hidden','true');
 label.className='preview-label';label.setAttribute('aria-hidden','true');
 const actions=['light','heavy','signature'],names={light:'PUNCH',heavy:'KICK',signature:'COUNTRY POWER'},keys={light:'J',heavy:'K',signature:'H'};
 let getAssets=()=>null,canPreview=()=>false,revision=0,current=null,host=null,raf=0,hoverTimer=0,queue=Promise.resolve(),pendingLoads=0,lastError=null;
 let snapshot={countryId:null,ready:false,playing:false,loading:false};
 const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.target===host&&!entry.isIntersecting))stop();});
 function clean(){
  root.clearTimeout(hoverTimer);hoverTimer=0;
  if(raf)root.cancelAnimationFrame(raf);raf=0;
  if(host){observer.unobserve(host);host.classList.remove('preview-active','preview-loading');delete host.dataset.previewAction;}
  canvas.remove();label.remove();host=null;current=null;
 }
 function stop(){revision++;clean();snapshot={countryId:null,ready:false,playing:false,loading:false};}
 function badge(action,power){
  label.replaceChildren();
  const key=document.createElement('span'),move=document.createElement('span');
  key.className='preview-key';key.textContent=keys[action];move.className='preview-move';
  move.textContent=action==='signature'?power.name:names[action];label.append(key,move);
 }
 function actor(data){return {data,x:0,y:0,vy:0,facing:1,hp:data.hp,meter:0,move:null,moveFrame:0,pose:'idle',guard:false,low:false,pending:null,flash:0,recoil:0,damagedAt:-999};}
 function paint(action,moveFrame){
  const state=current;if(!state||!host?.isConnected)return;
  const {data,assets,fighter,power}=state,move=C.getMoveSpec(data,action);
  fighter.move=moveFrame<move.start+move.active+move.recovery?move:null;fighter.moveFrame=moveFrame;fighter.pose='idle';
  const w=host.clientWidth,h=host.clientHeight,dpr=Math.min(root.devicePixelRatio||1,2);
  if(w<48||h<64){stop();return;}
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const art=T.METADATA[data.id];let minX=0,maxX=0,height=0;
  // Frame every authored strike without stretching the supplied artwork.
  for(const action of actions){
   const spec=C.getMoveSpec(data,action),frame=art.frames[spec.visualPose],sx=spec.projectile?1:spec.visualScaleX||1,sy=(spec.projectile?1:spec.visualScaleY||1)*(frame.drawScaleY||1);
   minX=Math.min(minX,(frame.x-frame.pivot)*art.scale*sx);maxX=Math.max(maxX,(frame.x+frame.w-frame.pivot)*art.scale*sx);
   height=Math.max(height,(frame.baseline-frame.y)*art.scale*sy);
  }
  for(const pose of ['idle','block']){
   const frame=art.frames[pose];minX=Math.min(minX,(frame.x-frame.pivot)*art.scale);maxX=Math.max(maxX,(frame.x+frame.w-frame.pivot)*art.scale);
   height=Math.max(height,(frame.baseline-frame.y)*art.scale*(frame.drawScaleY||1));
  }
  if(action==='signature')maxX=Math.max(maxX,move.reach+2.4+move.projectileRadius);
  const ppu=Math.min((w-16)/Math.max(1,maxX-minX),(h-42)/Math.max(1,height)),originX=(w-(maxX-minX)*ppu)/2-minX*ppu,floor=h-26;
  const frame=state.frame,view={frame,time:frame/60,originX,floor,pixelsPerUnit:ppu,reducedMotion:reduced.matches};
  ctx.save();ctx.strokeStyle='#31eaff60';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(originX,floor+3,Math.min(w*.36,ppu*1.6),7,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  const result=T.draw(ctx,fighter,view,assets);let projectile=null;
  if(action==='signature'){
   if(moveFrame<move.start)V.drawCharge(ctx,fighter,power,{...view,hand:{x:Math.min(move.reach,.7),y:move.height}});
   else{
    const age=moveFrame-move.start,travel=age*move.projectileSpeed/60;
    if(travel<=move.projectileRange){
     projectile={powerId:data.id,ownerId:data.id,x:move.reach+travel,y:move.height,radius:move.projectileRadius,age,facing:1};
     V.drawProjectile(ctx,projectile,power,view);
    }
   }
  }
  if(state.action!==action){badge(action,power);state.action=action;}
  host.dataset.previewAction=action;
  snapshot={...snapshot,action,moveFrame,frame,moveSpec:{id:move.id,start:move.start,active:move.active,recovery:move.recovery,visualPose:move.visualPose,projectile:!!move.projectile},powerName:power.name,powerId:power.id,powerKind:power.kind,projectile,...result?.diagnostic};
 }
 function tick(now){
  raf=0;const state=current;
  if(!state||!host?.isConnected||!canPreview()||document.hidden){stop();return;}
  if(!state.startedAt)state.startedAt=now;
  // A slower demonstration keeps the real startup, contact and recovery readable.
  const frame=Math.floor((now-state.startedAt)*.042);state.frame=frame;
  let offset=frame,index=0;
  for(;index<actions.length;index++){
   const spec=C.getMoveSpec(state.data,actions[index]),length=spec.start+spec.active+spec.recovery+24;
   if(offset<length)break;offset-=length;
  }
  if(index===actions.length){
   if(state.once){const spec=C.getMoveSpec(state.data,'signature');paint('signature',spec.start+spec.active+spec.recovery+24);snapshot.playing=false;return;}
   state.startedAt=now;index=0;offset=0;
  }
  paint(actions[index],offset);raf=root.requestAnimationFrame(tick);
 }
 async function show(id,target,options={}){
  const data=C.ROSTER.find(c=>c.id===id);
  if(!data||!T.hasArt(id)||!target?.isConnected||target.clientWidth<48||target.clientHeight<64||!canPreview())return false;
  stop();const ticket=revision;host=target;observer.observe(host);host.classList.add('preview-loading');label.textContent='LOADING MOVES…';host.append(label);
  snapshot={countryId:id,ready:false,playing:false,loading:true};lastError=null;
  // Serialize atlas decoding and skip superseded hovers before they start.
  // Preview assets are isolated: delayed loads cannot evict a live match's images.
  const task=queue.then(async()=>{
   if(ticket!==revision||!canPreview()||!target.isConnected)return false;
   const assets={flags:getAssets()?.flags||{},countrySprites:{}};
   pendingLoads++;
   try{await T.ensure([id],assets);}
   catch(error){
    if(ticket===revision){lastError=error.message;host?.classList.remove('preview-loading');label.textContent='PREVIEW UNAVAILABLE';snapshot={...snapshot,loading:false};}
    return false;
   }finally{pendingLoads--;}
   if(ticket!==revision||!canPreview()||!target.isConnected)return false;
   current={data,assets,power:Q.get(id),fighter:actor(data),action:null,frame:0,startedAt:0,once:!!options.manual};
   target.classList.remove('preview-loading');target.classList.add('preview-active');target.prepend(canvas);target.append(label);
   snapshot={countryId:id,ready:true,playing:!reduced.matches||!!options.manual,loading:false};
   const action=actions.includes(options.action)?options.action:'light';
   if(snapshot.playing){
    // Start an explicitly requested action at its own segment of the sequence.
    const preceding=actions.slice(0,actions.indexOf(action)).reduce((n,a)=>{const s=C.getMoveSpec(data,a);return n+s.start+s.active+s.recovery+24;},0);
    current.startedAt=performance.now()-preceding/.042;paint(action,0);raf=root.requestAnimationFrame(tick);
   }else paint(action,C.getMoveSpec(data,action).start+1);
   return true;
  });
  queue=task.catch(()=>false);return task;
 }
 function seek(action,moveFrame){
  if(!current||!actions.includes(action)||!Number.isFinite(moveFrame))return false;
  if(raf)root.cancelAnimationFrame(raf);raf=0;snapshot.playing=false;current.frame=moveFrame;paint(action,moveFrame);return {...snapshot};
 }
 function initialize(assets,available){getAssets=assets;canPreview=available;}
 function targetFor(element){
  const card=element?.closest?.('.card[data-fighter]');
  if(card)return {element:card,id:C.ROSTER[Number(card.dataset.fighter)]?.id,host:card.querySelector('.portrait')};
  const hero=element?.closest?.('.hero-fighter');
  return hero?{element:hero,id:hero.dataset.countryId,host:hero.querySelector('.hero-art')}:null;
 }
 const selection=document.getElementById('selection');
 selection.addEventListener('pointerover',event=>{
  if(event.pointerType==='touch')return;
  const target=targetFor(event.target);if(!target||target.element.contains(event.relatedTarget))return;
  root.clearTimeout(hoverTimer);
  hoverTimer=root.setTimeout(()=>{hoverTimer=0;if(target.element.matches(':hover'))show(target.id,target.host);},140);
 });
 selection.addEventListener('pointerout',event=>{
  if(event.pointerType==='touch')return;
  const target=targetFor(event.target);if(target&&!target.element.contains(event.relatedTarget)){root.clearTimeout(hoverTimer);hoverTimer=0;if(target.host===host)stop();}
 });
 selection.addEventListener('focusin',event=>{const target=targetFor(event.target);if(target)show(target.id,target.host);});
 selection.addEventListener('focusout',event=>{const target=targetFor(event.target);if(target&&target.host===host&&!target.element.contains(event.relatedTarget))stop();});
 selection.addEventListener('click',event=>{
  if(!event.target.closest('.preview-play'))return;
  const target=targetFor(event.target);if(target)show(target.id,target.host,{manual:true});
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 root.addEventListener('blur',stop);root.addEventListener('pagehide',stop);reduced.addEventListener('change',stop);
 root.NationFighterPreview={initialize,show,stop,seek,get debug(){return {...snapshot,pendingLoads,error:lastError,canvasCount:document.querySelectorAll('.fighter-preview-canvas').length};}};
})();
