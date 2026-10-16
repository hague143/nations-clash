(() => {
 'use strict';
 const T=window.THREE,C=window.Nation3DCombat,$=id=>document.getElementById(id),canvas=$('arena3d'),viewport=$('viewport');
 let renderer,scene,camera,arena,rigs=[],fight=null,paused=false,ready=false,starting=false,last=0,accumulator=0,elapsed=0,fps=0,view=0,lastEvent=0,quality='balanced',renderedFrame=-1;
 const keys=new Set(),holds=new Map(),queue=[[],[]],projectileMeshes=new Map(),effectMeshes=new Map(),resources=[];
 const audio=new window.NationAudio.AudioDirector({volume:.65,musicVolume:.65,effectsVolume:.85});
 window.NationPowers={get:id=>({id,name:C.FIGHTERS[id]?.power||'World Pulse',sound:id==='pk'?'earth':'wind',seed:id==='pk'?1947:1964})};
 const createMaterial=(color,extra={})=>new T.MeshBasicMaterial({color,...extra});
 const actionKeys={KeyJ:'punch',KeyK:'kick',KeyH:'special',KeyW:'jump'},secondKeys={Numpad1:'punch',Numpad2:'kick',Numpad3:'special',ArrowUp:'jump'};
 function clear(){keys.clear();holds.clear();queue[0]=[];queue[1]=[];document.querySelectorAll('.pressed').forEach(e=>e.classList.remove('pressed'));}
 function status(text){$('status').textContent=text;}
 function setup(){
  try{
   renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.23;
   renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
   scene=new T.Scene();scene.background=new T.Color('#c69c94');camera=new T.PerspectiveCamera(46,16/9,.1,180);camera.position.set(0,2.6,7.4);camera.lookAt(0,1.85,-.8);
   scene.add(new T.HemisphereLight(0xb6d4ff,0x82735d,2.15));const key=new T.DirectionalLight(0xffdfb0,3.1);key.position.set(-4,8,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=6;key.shadow.camera.bottom=-5;key.shadow.camera.far=30;key.shadow.normalBias=.025;key.shadow.bias=-.00015;scene.add(key);
   const rim=new T.DirectionalLight(0x9ccaff,1.7);rim.position.set(3,5,-4);scene.add(rim);
   arena=window.Nation3DArena.create(T,scene);createRigs('pk','jp');resize();ready=true;status('3D arena ready. Choose a fighter and start your match.');$('start').disabled=false;
  }catch(error){status('3D could not start: '+error.message+'. Try current Chrome or Edge with hardware acceleration enabled.');$('start').disabled=true;console.error(error);}
 }
 function createRigs(left,right){
  for(const rig of rigs){scene.remove(rig.root);rig.dispose();}rigs=[left,right].map(id=>{const rig=window.Nation3DModels.createFighter(T,id);scene.add(rig.root);return rig;});renderedFrame=-1;
 }
 function applyQuality(){quality=$('quality').value;renderer.shadowMap.enabled=quality!=='low';renderer.setPixelRatio(quality==='low'?.75:quality==='high'?Math.min(devicePixelRatio,1.5):1);resize();}
 function resize(){if(!renderer)return;const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setPixelRatio(quality==='low'?.75:quality==='high'?Math.min(devicePixelRatio,1.5):1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=camera.aspect<1.3?56:46;camera.updateProjectionMatrix();}
 function clearFX(){for(const m of [...projectileMeshes.values(),...effectMeshes.values()]){scene.remove(m);m.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}projectileMeshes.clear();effectMeshes.clear();}
 async function start(){if(!ready||starting)return;starting=true;clear();audio.stop();
  const left=$('fighter').value,right=left==='pk'?'jp':'pk';createRigs(left,right);clearFX();fight=new C.Fight(left,right,{mode:$('mode').value,difficulty:$('difficulty').value,intro:85});lastEvent=0;paused=false;accumulator=0;view=0;
  document.body.classList.add('in-fight');$('setup').classList.add('hidden');$('overlay').classList.add('hidden');$('hud').classList.remove('hidden');canvas.tabIndex=0;canvas.focus({preventScroll:true});status('Move into range. J punch · K kick · H country power.');applyQuality();
  try{await audio.unlock();}finally{starting=false;}hud();render(true);
 }
 function pause(value=!paused){if(!fight||fight.phase==='complete')return;paused=value;clear();accumulator=0;audio.setPaused(value);$('overlay').classList.toggle('hidden',!value);$('resume').classList.toggle('hidden',!value);$('rematch').classList.toggle('hidden',value);$('result-title').textContent='MATCH PAUSED';$('result-copy').textContent='Take a breath. Resume when you are ready.';$('pause').textContent=value?'RESUME':'PAUSE';}
 function back(){fight=null;paused=false;clear();clearFX();audio.stop();document.body.classList.remove('in-fight');$('setup').classList.remove('hidden');$('overlay').classList.add('hidden');$('hud').classList.add('hidden');$('pause').textContent='PAUSE';view=0;createRigs($('fighter').value,$('fighter').value==='pk'?'jp':'pk');status('Choose a fighter. Pakistan and Japan are ready.');}
 function input(i){const h=name=>[...holds.values()].includes(name);return i?{axis:(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),guard:keys.has('ControlRight'),low:keys.has('ArrowDown'),action:queue[1].shift()}:{axis:(keys.has('KeyD')||h('right')?1:0)-(keys.has('KeyA')||h('left')?1:0),guard:keys.has('KeyF')||h('guard'),low:keys.has('KeyS')||h('low'),action:queue[0].shift()};}
 function events(){if(!fight)return;for(const e of fight.events){if(e.serial<=lastEvent)continue;lastEvent=e.serial;const power=C.FIGHTERS[e.actor];if(e.type==='move'&&e.action!=='special')window.dispatchEvent(new CustomEvent('nation-move',{detail:{move:e.action==='punch'?'light':'heavy'}}));if(e.type==='launch')window.dispatchEvent(new CustomEvent('nation-move',{detail:{move:'signature',actorId:e.actor,powerId:e.actor,power:{id:e.actor,name:power.power,kind:e.actor==='pk'?'energy':'petal',color:power.color,accent:'#ffffff'}}}));if(e.type==='hit')window.dispatchEvent(new CustomEvent('nation-hit',{detail:{move:e.action==='punch'?'light':e.action==='kick'?'heavy':'signature',kind:e.kind,actorId:e.actor,powerId:e.actor,power:{id:e.actor,name:power.power,kind:e.actor==='pk'?'energy':'petal',color:power.color,accent:'#ffffff'}}}));if(e.type==='round')window.dispatchEvent(new CustomEvent('nation-round',{detail:{type:e.kind,round:e.round,reason:e.reason}}));}}
 function hud(){
  if(!fight)return;for(const [side,a,i]of [['left',fight.left,0],['right',fight.right,1]]){$(side+'-name').textContent=a.data.country;$(side+'-hp').textContent=a.hp+' / 1000';$(side+'-health').style.width=a.hp/10+'%';$(side+'-rounds').textContent=[0,1].map(n=>fight.wins[i]>n?'●':'○').join(' ');$(side+'-power').textContent=a.data.power+' · '+(a.signatureCooldown?(a.signatureCooldown/60).toFixed(1)+'s':'READY');}
  $('timer').textContent=Math.ceil(Math.max(0,fight.time)/60);$('round').textContent='ROUND '+fight.round;
  $('announcement').textContent=fight.phase==='intro'?'GET READY':fight.phase==='intermission'?fight.message:fight.frame<115?'FIGHT':'';
  $('hint').textContent=Math.abs(fight.left.x-fight.right.x)<1.7?'IN RANGE · J PUNCH / K KICK':'MOVE CLOSER · A / D';
  if(fight.phase==='complete'){$('overlay').classList.remove('hidden');$('resume').classList.add('hidden');$('rematch').classList.remove('hidden');$('result-title').textContent=fight.winner<0?'DRAW':(fight.winner?fight.right:fight.left).data.country.toUpperCase()+' WINS';$('result-copy').textContent='First to two rounds · '+fight.wins.join(' — ')+'. Play again or return to the arena preview.';}
  for(const button of document.querySelectorAll('[data-action="special"]'))button.disabled=fight.left.signatureCooldown>0||fight.phase!=='fight'||paused;
 }
 function createProjectile(p){const group=new T.Group(),color=C.FIGHTERS[p.ownerId].color;group.name='Actual '+p.ownerId+' travelling power';const core=new T.Mesh(new T.SphereGeometry(p.radius,16,12),createMaterial(color));core.name='Power collision core';group.add(core);const halo=new T.Mesh(new T.SphereGeometry(p.radius*1.7,16,12),createMaterial(color,{transparent:true,opacity:.14,depthWrite:false,blending:T.AdditiveBlending}));group.add(halo);const orbit=new T.Mesh(new T.TorusGeometry(p.radius*1.65,.023,6,28),createMaterial('#efffff'));orbit.rotation.y=Math.PI/2;group.add(orbit);for(let i=0;i<6;i++){const petal=new T.Mesh(new T.OctahedronGeometry(.045),createMaterial(i%2?color:'#ffffff'));petal.position.set(Math.sin(i)*.13,Math.cos(i)*.21,Math.sin(i*2)*.16);group.add(petal);}scene.add(group);projectileMeshes.set(p.id,group);return group;}
 function fx(){
  const ps=fight?.projectiles||[],effects=fight?.effects||[];
  for(const [id,m]of projectileMeshes)if(!ps.some(p=>p.id===id)){scene.remove(m);m.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});projectileMeshes.delete(id);}
  for(const p of ps){const m=projectileMeshes.get(p.id)||createProjectile(p);m.position.set(p.x,p.y,p.z);m.rotation.x=p.age*.12;m.children[2].rotation.z=p.age*.18;}
  for(const [e,m]of effectMeshes)if(!effects.includes(e)){scene.remove(m);m.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});effectMeshes.delete(e);}
  for(const e of effects){let m=effectMeshes.get(e);if(!m){m=new T.Group();m.position.set(e.point.x,e.point.y,e.point.z);for(let i=0;i<9;i++){const spark=new T.Mesh(new T.OctahedronGeometry(i===0?.1:.035),createMaterial(e.color,{transparent:true}));m.add(spark);}scene.add(m);effectMeshes.set(e,m);}const age=(fight.frame-e.frame)/28;for(let i=0;i<m.children.length;i++){const a=i*2.399;m.children[i].position.set(Math.cos(a)*age*.65,Math.sin(a)*age*.65-age*age*.3,Math.sin(i*1.4)*age*.35);m.children[i].scale.setScalar(Math.max(.05,1-age));m.children[i].material.opacity=1-age;}}
 }
 function render(force=false){
  if(!ready)return;const actors=fight?[fight.left,fight.right]:[{id:$('fighter').value,x:-1.6,y:0,facing:1,hp:1000,axis:0},{id:$('fighter').value==='pk'?'jp':'pk',x:1.6,y:0,facing:-1,hp:1000,axis:0}],frame=fight?fight.frame:Math.floor(elapsed*60),time=frame/60;
  if(force||frame!==renderedFrame){actors.forEach((a,i)=>{const rig=rigs[i];rig.root.position.set(a.x,a.y,0);rig.root.scale.set(a.facing,1,1);const p=C.samplePose(a,frame);p.time=time;rig.update(p);rig.setFlash((a.flash||0)/9);});arena.update(time);fx();renderedFrame=frame;}
  if(!paused||force){
   const mid=(actors[0].x+actors[1].x)/2,gap=Math.abs(actors[0].x-actors[1].x),z=Math.max(6.8,5+gap*.75),angle=view?Math.sin(time*.16)*.20+.25:0;
   const desired=new T.Vector3(mid*.7+Math.sin(angle)*z,view?3.8:2.6,Math.cos(angle)*z);camera.position.lerp(desired,force?1:.06);camera.lookAt(mid*.7,view?2.2:1.85,-.8);
  }
  renderer.render(scene,camera);
 }
 function animate(timestamp){const dt=Math.min(.1,Math.max(0,(timestamp-last)/1000));last=timestamp;elapsed+=dt;fps=fps*.95+(dt>0?1/dt:60)*.05;
  if(fight&&!paused){accumulator+=dt;let steps=0;while(accumulator>=1/60&&steps++<6){fight.step(input(0),fight.options.mode==='ai'?fight.ai(1):input(1));accumulator-=1/60;}events();hud();}
  render();requestAnimationFrame(animate);
 }
 $('start').onclick=start;$('rematch').onclick=start;$('back').onclick=back;$('resume').onclick=()=>pause(false);$('pause').onclick=()=>pause();
 $('fighter').onchange=()=>{if(!fight){createRigs($('fighter').value,$('fighter').value==='pk'?'jp':'pk');render(true);}};$('mode').onchange=()=>{$('difficulty').disabled=$('mode').value!=='ai';};$('quality').onchange=applyQuality;
 $('camera-view').onclick=()=>{view=1-view;$('camera-view').textContent=view?'FIGHT CAMERA':'ARENA VIEW';render(true);};
 $('sound').onclick=()=>{audio.setEnabled(!audio.enabled);$('sound').textContent=audio.enabled?'SOUND ON':'SOUND OFF';$('sound').setAttribute('aria-pressed',String(audio.enabled));};
 $('music-volume').oninput=e=>audio.setMusicVolume(Number(e.target.value)/100);$('effects-volume').oninput=e=>audio.setEffectsVolume(Number(e.target.value)/100);
 document.addEventListener('keydown',e=>{if(e.target.closest?.('input,select,textarea'))return;if(e.code==='Escape'&&!e.repeat){pause();return;}if(!fight||paused||fight.phase!=='fight')return;if([...Object.keys(actionKeys),...Object.keys(secondKeys),'KeyA','KeyD','KeyS','KeyF','ArrowLeft','ArrowRight','ArrowDown','ControlRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(!e.repeat){if(actionKeys[e.code])queue[0].push(actionKeys[e.code]);if(secondKeys[e.code])queue[1].push(secondKeys[e.code]);}});
 document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{clear();if(fight&&!paused&&fight.phase!=='complete')pause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();if(fight&&!paused&&fight.phase!=='complete')pause(true);}});
 for(const button of document.querySelectorAll('#touch button')){button.addEventListener('pointerdown',e=>{e.preventDefault();if(!fight||paused||fight.phase!=='fight')return;button.setPointerCapture(e.pointerId);button.classList.add('pressed');if(button.dataset.hold)holds.set(e.pointerId,button.dataset.hold);if(button.dataset.action)queue[0].push(button.dataset.action);});const release=e=>{holds.delete(e.pointerId);button.classList.remove('pressed');};for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,release);}
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(fight&&!paused)pause(true);ready=false;status('Graphics paused. Reload this file to restore the 3D scene.');$('start').disabled=true;});
 window.addEventListener('resize',()=>{resize();render(true);});
 function resetFixture(config={}){
  if(!ready)throw new Error('3D not ready');const left=config.leftId||config.left?.id||'pk',right=config.rightId||config.right?.id||'jp';fight=new C.Fight(left,right,{mode:config.mode||'local',intro:config.intro??0,seconds:600});
  for(const [a,value]of [[fight.left,config.left],[fight.right,config.right]])if(value)Object.assign(a,value,{id:a.id,data:C.FIGHTERS[a.id]});if(config.wins)fight.wins=[...config.wins];paused=config.paused!==false;clear();createRigs(left,right);clearFX();lastEvent=fight.serial;document.body.classList.add('in-fight');$('setup').classList.add('hidden');$('hud').classList.remove('hidden');$('overlay').classList.add('hidden');render(true);hud();return {frame:fight.frame};
 }
 function stepFrames(n,inputs={}){if(!fight)throw new Error('No fight');for(let i=0;i<n;i++){const left={...(inputs.left||{})},right={...(inputs.right||{})};if(i>0){delete left.action;delete right.action;}fight.step(left,right);}events();hud();render(true);return {frame:fight.frame,leftHP:fight.left.hp,rightHP:fight.right.hp};}
 window.NationClash3D={get ready(){return ready;},get fight(){return fight;},get paused(){return paused;},start,pause,back,resetFixture,stepFrames,render:()=>render(true),get debug(){
  return {renderer:renderer?.constructor.name,isWebGLRenderer:!!renderer?.isWebGLRenderer,isPerspectiveCamera:!!camera?.isPerspectiveCamera,webglVersion:renderer?.getContext().getParameter(renderer.getContext().VERSION),arena:arena?.debug,fps:Math.round(fps),drawCalls:renderer?.info.render.calls,triangles:renderer?.info.render.triangles,quality,audio:audio.debug,frame:fight?.frame,paused,
   fighters:rigs.map((rig,i)=>{const meshCounts={meshes:0,sprites:0};rig.root.traverse(o=>{if(o.isMesh)meshCounts.meshes++;if(o.isSprite)meshCounts.sprites++;});const a=fight?(i?fight.right:fight.left):null;return {id:a?.id||rig.debug.country,...meshCounts,...rig.debug,strikePoints:{punch:rig.getStrikePoint('punch').toArray(),kick:rig.getStrikePoint('kick').toArray()},bounds:new T.Box3().setFromObject(rig.root).getSize(new T.Vector3()).toArray(),position:rig.root.position.toArray()};}),projectiles:[...projectileMeshes.entries()].map(([id,m])=>({id,position:m.getWorldPosition(new T.Vector3()).toArray(),coreRadius:m.children[0].geometry.parameters.radius})),camera:{position:camera?.position.toArray(),fov:camera?.fov}};
 }};
 setup();requestAnimationFrame(animate);
})();
