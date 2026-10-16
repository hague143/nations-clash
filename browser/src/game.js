(() => {
 'use strict';
 const C=window.NationCombat,{Fight,ROSTER,clamp,contact,active,getMoveSpec}=C;
 const F=window.NationFighters,S=window.NationSprites,T=window.NationCountrySprites,A=window.NationArenas;
 const P=window.NationPresentation,Q=window.NationPowers,V=window.NationPowerFX,Preview=window.NationFighterPreview;
 const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 const $=id=>document.getElementById(id),canvas=$('arena'),ctx=canvas.getContext('2d');
 const IMAGE_DATA={japan:'/* JAPAN_IMAGE_DATA */',pakistan:'/* PAKISTAN_IMAGE_DATA */',heads:'/* HEADS_IMAGE_DATA */',body:'/* BODY_IMAGE_DATA */'};
 const audio=new window.NationAudio.AudioDirector({enabled:true,volume:.75});
 let selected=[ROSTER.findIndex(c=>c.id==='pk'),ROSTER.findIndex(c=>c.id==='jp')],picking=0,pageIndex=0;
 let fight=null,match=null,paused=false,last=0,accumulator=0,assets=null,assetsReady=false,starting=false,startRevision=0,previousPhase=null;
 const PAGE_SIZE=24,keys=new Set(),holds=new Map(),actions=[[],[]],diagnostics=[],powerDiagnostics=[];
 Preview.initialize(()=>assets,()=>assetsReady&&!starting&&!fight);
 const keyboard={KeyJ:'light',KeyK:'heavy',KeyL:'special',KeyU:'break',KeyI:'throw',KeyO:'ultimate',KeyH:'signature',KeyW:'jump'};
 const second={Numpad1:'light',Numpad2:'heavy',Numpad3:'special',Numpad4:'break',Numpad5:'throw',Numpad6:'ultimate',Numpad7:'signature',ArrowUp:'jump'};
 const fold=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function loadImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Embedded artwork could not load'));image.src=src;});}
 function filtered(){const query=fold($('country-search').value),region=$('region-filter').value;
  return ROSTER.map((data,index)=>({data,index})).filter(({data})=>(region==='All'||data.region===region)&&(!query||fold([data.country,data.name,...(data.aliases||[])].join(' ')).includes(query)));
 }
 function portrait(c){return T.hasArt(c.id)?T.portrait(c):S.METADATA[c.id]?S.portrait(c,assets):F.portrait(c,assets,{width:240,height:270});}
 function selectionView(fighters=selected.map(i=>ROSTER[i])){
  return {left:fighters[0],right:fighters[1],portraits:assetsReady?fighters.map(portrait):[],
   flags:fighters.map(c=>assets?.flags[c.id]?.src||''),powers:fighters.map(c=>Q.get(c.id)),
   arena:A.getArena($('arena-select').value),picking,ready:assetsReady};
 }
 function roster(){
  Preview.stop();
  const matches=filtered(),pages=Math.max(1,Math.ceil(matches.length/PAGE_SIZE));pageIndex=clamp(pageIndex,0,pages-1);
  $('roster').innerHTML=matches.slice(pageIndex*PAGE_SIZE,(pageIndex+1)*PAGE_SIZE).map(({data:c,index:i})=>{
   const flag=assets?.flags[c.id]?.src||'',art=assetsReady?portrait(c):'';
   return `<button class="card ${selected[picking]===i?'selected':''}" style="--color:${c.colors[0]}55" data-fighter="${i}" aria-pressed="${selected[picking]===i}" aria-describedby="preview-hint" aria-label="Select ${escape(c.country)}: ${escape(c.name)}"><div class="portrait">${art?`<img class="fighter-portrait" src="${art}" alt="${escape(c.country)} fighter in flag costume">`:''}<span class="flag" title="${escape(c.flagVariant||c.country)}">${flag?`<img src="${flag}" alt="${escape(c.country)} flag">`:escape(c.flag)}</span><span class="assigned">${selected[0]===i?'YOU':selected[1]===i?'RIVAL':''}</span><span class="preview-cue" aria-hidden="true">HOVER · MOVE PREVIEW</span></div><div class="card-body"><div class="country">${escape(c.country)}</div><div class="fighter-name">${escape(c.name)}</div><div class="card-bottom"><span>${escape(c.style.toUpperCase())}</span><span>${c.hp} HP</span></div></div></button>`;
  }).join('');
  $('roster-empty').classList.toggle('hidden',matches.length>0);$('page-label').textContent=`PAGE ${pageIndex+1} OF ${pages} · ${matches.length} FIGHTERS`;
  $('count').textContent=`${ROSTER.length} FIGHTERS`;$('prev-page').disabled=pageIndex===0;$('next-page').disabled=pageIndex>=pages-1;
  $('selected-left').textContent=ROSTER[selected[0]].country;$('selected-right').textContent=ROSTER[selected[1]].country;
  for(const [id,index]of [['pick-player',0],['pick-opponent',1]]){$(id).classList.toggle('active',picking===index);$(id).setAttribute('aria-pressed',String(picking===index));}
  P.updateSelection(selectionView());
 }
 $('roster').addEventListener('click',e=>{const card=e.target.closest('[data-fighter]');if(card){selected[picking]=Number(card.dataset.fighter);roster();}});
 $('pick-player').onclick=()=>{picking=0;roster();};$('pick-opponent').onclick=()=>{picking=1;roster();};
 $('country-search').addEventListener('input',()=>{pageIndex=0;roster();});$('region-filter').onchange=()=>{pageIndex=0;roster();};
 $('prev-page').onclick=()=>{pageIndex--;roster();};$('next-page').onclick=()=>{pageIndex++;roster();};
 $('random-fighter').onclick=()=>{const list=filtered();if(list.length){const chosen=list[Math.floor(Math.random()*list.length)];selected[picking]=chosen.index;pageIndex=Math.floor(list.findIndex(c=>c.index===chosen.index)/PAGE_SIZE);roster();}};
 $('mode').onchange=()=>{$('difficulty').disabled=$('mode').value==='local';};
 $('arena-select').innerHTML=A.ARENAS.map(stage=>`<option value="${stage.id}">${escape(stage.name)} · ${escape(stage.city)}</option>`).join('');$('arena-select').value='lahore';
 let previewRequest=0;
 async function previewArena(){
  const request=++previewRequest,id=$('arena-select').value,stage=A.getArena(id),preview=$('stage-preview');
  preview.dataset.arena=id;preview.dataset.ready='false';A.drawScene(preview.getContext('2d'),id,0,{width:preview.width,height:preview.height});
  $('arena-description').textContent=stage.description||stage.city;P.updateSelection(selectionView());
  try{
   await A.ensure(id);
   if(request!==previewRequest||$('arena-select').value!==id)return;
   A.drawScene(preview.getContext('2d'),id,0,{width:preview.width,height:preview.height});preview.dataset.ready='true';
  }catch(error){if(request===previewRequest)$('arena-description').textContent=error.message;}
 }
 $('arena-select').onchange=previewArena;
 function clearInputs(){keys.clear();holds.clear();actions[0]=[];actions[1]=[];document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
 async function start(){
  if(!assetsReady||starting)return;const revision=++startRevision;starting=true;Preview.stop();$('start').disabled=true;
  const chosen=selected.map(i=>ROSTER[i]),settings={mode:$('mode').value,difficulty:$('difficulty').value,arena:$('arena-select').value};
  const matchArt={countrySprites:{}};
  try{
   audio.stop();audio.setArena(settings.arena);const audioUnlock=audio.unlock();
   $('start').textContent='LOADING SELECTED FIGHTERS…';P.setStatus({state:'loading',message:'Preparing your fighters and arena…'});
   A.retain(settings.arena);
   await Promise.all([T.ensure(chosen.map(c=>c.id),matchArt),A.ensure(settings.arena),audioUnlock]);
   if(revision!==startRevision)return;
   assets.countrySprites=matchArt.countrySprites;
   match=settings;
   fight=new Fight(chosen[0],chosen[1]);P.updateMatch(selectionView(chosen));P.setFight(true);P.setStatus({state:'ready',message:'Your match is ready.'});paused=false;accumulator=0;previousPhase=fight.phase;clearInputs();
   $('selection').classList.add('hidden');$('game').classList.remove('hidden');$('overlay').classList.add('hidden');
   $('left-name').textContent=fight.left.data.country;$('right-name').textContent=fight.right.data.country;$('left-style').textContent=fight.left.data.style;$('right-style').textContent=fight.right.data.style;
   $('stage-name').textContent=A.ARENAS.find(a=>a.id===match.arena).name.toUpperCase();$('match-mode').textContent=match.mode==='ai'?'YOU VS COMPUTER · FIRST TO TWO ROUNDS':'LOCAL TWO PLAYER · FIRST TO TWO ROUNDS';
   $('combat-hint').textContent=match.mode==='local'?'Player 2: arrows move/jump/crouch, right Ctrl block, numpad 1–6 attacks. H / Numpad 7 uses each country power. Both players follow the same combat rules.':'Move into range with A / D. J → J → K launches; L follows with a slam. Hold S for low attacks. Press I quickly to escape a grab. O needs a full meter. H launches your country power; it recharges in four seconds.';
   window.scrollTo({top:0,behavior:'smooth'});canvas.tabIndex=0;canvas.focus({preventScroll:true});hud();draw(0);
   $('start').textContent='ENTER THE ARENA';
  }catch(error){if(revision!==startRevision)return;A.release();audio.stop();console.error(error);$('start').textContent='START FAILED · RETRY';$('arena-description').textContent=error.message;P.setStatus({state:'error',message:error.message});}
  finally{if(revision===startRevision){starting=false;$('start').disabled=!assetsReady;}}
 }
 $('start').onclick=start;$('rematch').onclick=start;
 $('back').onclick=()=>{startRevision++;starting=false;audio.stop();A.release();P.setFight(false);$('start').textContent='ENTER THE ARENA';$('start').disabled=!assetsReady;P.setStatus({state:'ready',message:'Choose your fighters, country powers and arena.'});fight=null;match=null;paused=false;clearInputs();$('game').classList.add('hidden');$('selection').classList.remove('hidden');roster();$('start').focus({preventScroll:true});};
 function showPause(){if(!fight||fight.phase==='complete')return;paused=!paused;audio.setPaused(paused);accumulator=0;clearInputs();$('overlay').classList.toggle('hidden',!paused);$('resume').classList.toggle('hidden',!paused);$('rematch').classList.toggle('hidden',paused);$('result-label').textContent='TAKE A BREATHER';$('result-title').textContent='Match paused';$('result-description').textContent='Press Escape or Resume to continue.';if(paused)$('resume').focus({preventScroll:true});else canvas.focus({preventScroll:true});}
 $('pause').onclick=showPause;$('resume').onclick=showPause;
 document.addEventListener('keydown',e=>{if(e.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;if(e.code==='Escape'&&!e.repeat){showPause();return;}if(!fight||paused||fight.phase==='complete')return;if([...Object.keys(keyboard),...Object.keys(second),'KeyA','KeyD','KeyS','KeyF','ArrowLeft','ArrowRight','ArrowDown','ControlRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(!e.repeat){if(keyboard[e.code])actions[0].push(keyboard[e.code]);if(second[e.code])actions[1].push(second[e.code]);}});
 document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{clearInputs();if(fight&&!paused&&fight.phase!=='complete')showPause();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInputs();if(fight&&!paused&&fight.phase!=='complete')showPause();}});
 document.querySelectorAll('.touch button').forEach(button=>{button.addEventListener('pointerdown',e=>{e.preventDefault();if(!fight||paused||fight.phase!=='fight')return;button.setPointerCapture(e.pointerId);button.classList.add('pressed');if(button.dataset.hold)holds.set(e.pointerId,button.dataset.hold);if(button.dataset.action)actions[0].push(button.dataset.action);});const release=e=>{button.classList.remove('pressed');holds.delete(e.pointerId);};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);});
 const held=action=>Array.from(holds.values()).includes(action);
 function input(player){return player===0?{axis:(keys.has('KeyD')||held('right')?1:0)-(keys.has('KeyA')||held('left')?1:0),guard:keys.has('KeyF')||held('guard'),low:keys.has('KeyS')||held('low'),action:actions[0].shift()}:{axis:(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),guard:keys.has('ControlRight'),low:keys.has('ArrowDown'),action:actions[1].shift()};}
 function hud(){
  if(!fight)return;for(const [side,f,index]of [['left',fight.left,0],['right',fight.right,1]]){$(side+'-health').style.width=`${f.hp/f.data.hp*100}%`;$(side+'-health').parentElement.classList.toggle('damaged',fight.frame-f.damagedAt<18);$(side+'-hp').textContent=`${f.hp} / ${f.data.hp} HP`;$(side+'-meter').firstElementChild.style.width=`${f.meter}%`;$(side+'-meter').classList.toggle('ready',f.meter>=100);$(side+'-rounds').innerHTML=[0,1].map(n=>`<span class="round-dot ${n<fight.wins[index]?'won':''}"></span>`).join('');}
  for(const [side,f]of [['left',fight.left],['right',fight.right]]){
   const power=Q.get(f.data.id),cooldown=f.signatureCooldown||0,label=$(side+'-signature');
   label.textContent=power.name+' · '+(cooldown>0?(cooldown/60).toFixed(1)+'s':'READY');
   label.dataset.ready=String(cooldown===0);label.style.setProperty('--power-color',power.color);
   label.style.setProperty('--charge',((1-cooldown/(f.signatureTotalCooldown||240))*100)+'%');label.title=power.description;
  }
  const power=Q.get(fight.left.data.id),cooldown=fight.left.signatureCooldown||0;
  $('signature-hint').textContent='H · '+power.name.toUpperCase()+' · '+(cooldown>0?(cooldown/60).toFixed(1)+'s':'READY');
  const powerButton=document.querySelector('[data-action="signature"]');
  powerButton.disabled=cooldown>0||fight.phase!=='fight'||paused;
  powerButton.dataset.ready=String(cooldown===0);powerButton.title=power.description;
  powerButton.setAttribute('aria-label',power.name+(cooldown>0?', recharging':', country power'));
  $('timer').textContent=String(Math.max(0,Math.ceil(fight.time/60))).padStart(2,'0');$('round-label').textContent='ROUND '+fight.round;
  const gap=Math.abs(fight.left.x-fight.right.x),reach=getMoveSpec(fight.left.data,'light').reach+C.GEOMETRY.bodyRadius+C.GEOMETRY.strikeRadius;$('reach-hint').textContent=gap<=reach?'IN RANGE · J / K / L':'MOVE CLOSER · A / D';$('reach-hint').classList.toggle('in-range',gap<=reach);
  $('announcement').textContent=fight.phase==='intro'?'GET READY':fight.phase==='intermission'?fight.message:fight.frame-fight.messageAt<65?fight.message:'';
  if(fight.phase==='complete'){const winner=fight.winner===0?fight.left:fight.right;$('overlay').classList.remove('hidden');$('resume').classList.add('hidden');$('rematch').classList.remove('hidden');$('result-label').textContent=`MATCH COMPLETE · ${fight.wins[0]} — ${fight.wins[1]}`;$('result-title').textContent=winner.data.country+' wins';$('result-description').textContent=winner.data.quote;}
 }
 $('sound').onclick=()=>{audio.setEnabled(!audio.enabled);$('sound').textContent=audio.enabled?'SOUND ON':'SOUND OFF';$('sound').classList.toggle('sound-on',audio.enabled);$('sound').setAttribute('aria-pressed',String(audio.enabled));};$('volume').addEventListener('input',()=>audio.setVolume(Number($('volume').value)/100));
 $('music-volume').addEventListener('input',()=>audio.setMusicVolume(Number($('music-volume').value)/100));
 $('effects-volume').addEventListener('input',()=>audio.setEffectsVolume(Number($('effects-volume').value)/100));
 const line=(a,b,width,color)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();},screen=x=>640+x*C.GEOMETRY.pixelsPerUnit;
 function renderFighter(target,f,view={}){const options={time:0,frame:fight?.frame||0,originX:640,floor:551,pixelsPerUnit:78,...view};const result=T.hasArt(f.data.id)?T.draw(target,f,options,assets):S.METADATA[f.data.id]?S.draw(target,f,options,assets):F.draw(target,f,options,assets);if(result)diagnostics.push(result.diagnostic||{countryId:f.data.id,facing:f.facing,flagMirrored:false,pose:f.move?.id||f.pose});return result;}
 function renderFighters(target,actors,view={}){
  // A striking hand/foot must remain visible over the defender at impact.
  // Keep results and diagnostics in player order even when paint order changes.
  const priority=f=>f.move&&f.moveFrame>=f.move.start&&C.extension(f)>.55?1:0;
  const order=actors.map((f,i)=>i).sort((a,b)=>priority(actors[a])-priority(actors[b]));
  const before=diagnostics.length,results=[];
  for(const index of order)results[index]=renderFighter(target,actors[index],view);
  const painted=diagnostics.splice(before);
  diagnostics.push(...actors.map((f,i)=>results[i]?.diagnostic||painted.find(d=>d.countryId===f.data.id)));
  return results;
 }
 function draw(t){
  if(!fight||!assetsReady)return;
  const floor=A.getArena(match?.arena).floorY,simTime=fight.frame/60;
  const view={time:simTime,frame:fight.frame,floor,originX:640,pixelsPerUnit:78,reducedMotion:motion.matches};
  ctx.clearRect(0,0,1280,720);A.drawScene(ctx,match?.arena||$('arena-select').value,t);
  V.drawStageLighting(ctx,{...view,leftX:fight.left.x,rightX:fight.right.x,leftColor:Q.get(fight.left.data.id).color,rightColor:Q.get(fight.right.data.id).color});
  diagnostics.length=0;powerDiagnostics.length=0;
  ctx.save();ctx.translate(!motion.matches&&!paused&&fight.hitstop>0?Math.sin(fight.hitstop*2.5)*Math.min(3,fight.hitstop*.5):0,0);
  const results=renderFighters(ctx,[fight.left,fight.right],view);
  [fight.left,fight.right].forEach((f,i)=>{
   const x=screen(f.x);ctx.textAlign=f.facing===1?'right':'left';ctx.font='600 11px "Segoe UI",sans-serif';
   ctx.lineWidth=4;ctx.strokeStyle='#061018';ctx.strokeText(f.data.name.toUpperCase(),x-f.facing*24,floor+35);
   ctx.fillStyle=f.data.colors[0];ctx.fillText(f.data.name.toUpperCase(),x-f.facing*24,floor+35);
   if(f.meter>=100&&f.hp>0){ctx.save();ctx.globalAlpha=.6;ctx.strokeStyle='#f9dc80';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,floor-3,48,11,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
   if(f.move?.id==='signature'&&f.moveFrame<f.move.start&&f.hp>0){
    // A startup aura forms ahead of the guarded stance. The travelling core
    // is released from the authored punching fist once startup completes.
    const hand={x:f.x+f.facing*Math.min(f.move.reach,.7),y:f.y+f.move.height};
    V.drawCharge(ctx,f,Q.get(f.data.id),{...view,hand});
   }
   if(!active(f))return;
   const point=contact(f),ranged=['special','ultimate'].includes(f.move.id),hand=results[i]?.hand||{x:f.x+f.facing*.6,y:point.y};
   if(ranged){ctx.save();ctx.globalAlpha=.7;line([screen(hand.x),floor-hand.y*78],[screen(point.x),floor-point.y*78],f.move.ultimate?18:10,f.data.colors[0]);ctx.restore();}
  });
  for(const projectile of fight.projectiles||[]){
   const diagnostic=V.drawProjectile(ctx,projectile,Q.get(projectile.powerId||projectile.ownerId),view);
   if(diagnostic)powerDiagnostics.push({id:projectile.id,ownerId:projectile.ownerId,powerId:projectile.powerId,...diagnostic});
  }
  for(const effect of fight.effects){
   const x=screen(effect.x),y=floor-effect.y*78,p=clamp(1-effect.life/(effect.type==='block'?16:effect.type==='tech'?22:36),0,1);
   if(effect.type==='signature')V.drawImpact(ctx,effect,Q.get(effect.powerId||effect.countryId),view);
   ctx.save();ctx.globalAlpha=clamp(effect.life/15,0,1);ctx.strokeStyle=effect.color;
   if(effect.type==='block'||effect.type==='tech'){ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,18+p*18,-1.2,1.2);ctx.stroke();}
   else if(effect.type!=='signature')for(let i=0;i<10;i++){const angle=i*Math.PI*.2,inner=8+p*18,outer=18+p*(effect.type==='ultimate'?100:42);line([x+Math.cos(angle)*inner,y+Math.sin(angle)*inner],[x+Math.cos(angle)*outer,y+Math.sin(angle)*outer],3,effect.color);}
   if(effect.damage){ctx.textAlign='center';ctx.font='bold 24px "Segoe UI",sans-serif';ctx.lineWidth=5;ctx.strokeStyle='#101821';ctx.strokeText('−'+effect.damage,x,y-32-p*38);ctx.fillStyle='#ffdd93';ctx.fillText('−'+effect.damage,x,y-32-p*38);}
   ctx.restore();
  }
  ctx.restore();
 }
 function animate(timestamp){const dt=Math.min(.1,Math.max(0,(timestamp-last)/1000));last=timestamp;if(fight&&!paused){accumulator+=dt;while(accumulator>=1/60){if(fight.phase==='fight')fight.step(input(0),match.mode==='ai'?fight.ai(match.difficulty):input(1));else{actions[0]=[];actions[1]=[];if(fight.phase==='complete')fight.settle();else fight.step();}accumulator-=1/60;if(previousPhase!==fight.phase){actions[0]=[];actions[1]=[];previousPhase=fight.phase;}}}if(fight){hud();draw(timestamp/1000);}requestAnimationFrame(animate);}
 window.NationClash={get fight(){return fight;},get paused(){return paused;},get catalog(){return ROSTER;},get assetsReady(){return assetsReady;},get artReady(){return assetsReady;},get assets(){return assets;},get flagDecodeStatus(){return Object.fromEntries(ROSTER.map(c=>[c.id,{loaded:!!assets?.flags[c.id]?.naturalWidth,width:assets?.flags[c.id]?.naturalWidth||0,height:assets?.flags[c.id]?.naturalHeight||0}]))},get selectedIds(){return selected.map(i=>ROSTER[i].id);},get selectedArena(){return match?.arena||$('arena-select').value;},get audioReadiness(){return audio.debug;},get audioDebug(){return audio.debug;},get rendererDiagnostics(){return [...diagnostics];},get powerDiagnostics(){return [...powerDiagnostics];},renderFighter,renderFighters,start};
 $('start').disabled=true;$('start').textContent='PREPARING CHAMPIONS…';P.setStatus({state:'preparing',message:'Preparing 196 champions and 30 arenas…'});roster();previewArena();requestAnimationFrame(animate);
 Promise.all([loadImage(IMAGE_DATA.japan),loadImage(IMAGE_DATA.pakistan),loadImage(IMAGE_DATA.heads),loadImage(IMAGE_DATA.body),A.ensure($('arena-select').value)]).then(async([japanImage,pakistanImage,headAtlas,bodyAtlas])=>{assets=await F.prepareAssets(ROSTER,{flags:window.NationRoster.FLAG_SVGS,headAtlas,headAtlasMeta:{columns:4,rows:4,drawWidth:42,drawHeight:48},bodyAtlas,bodyAtlasMeta:{columns:4,rows:2}});Object.assign(assets,{japanImage,pakistanImage,bodyAtlas,headAtlas,sprites:{jp:japanImage,pk:pakistanImage}});assetsReady=true;P.setStatus({state:'ready',message:'Choose your fighters, country powers and arena.'});$('start').disabled=false;$('start').innerHTML='ENTER THE ARENA <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';roster();}).catch(error=>{console.error(error);$('start').textContent='ARTWORK LOAD FAILED';$('arena-description').textContent=error.message;P.setStatus({state:'error',message:error.message});});
})();
