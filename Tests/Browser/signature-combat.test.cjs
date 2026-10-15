const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../../browser/src/combat.js');
require('../../browser/src/sprites.js');
const T=require('../../browser/src/country-sprites.js');
const country=id=>C.ROSTER.find(data=>data.id===id);
function fixture(data=country('jp'),facing=1,distance=4.5,enemy=country('za')){
 const f=new C.Fight(data,enemy,{intro:0,intermission:1});
 f.left.x=0;f.right.x=facing*distance;f.left.facing=facing;f.right.facing=-facing;return f;
}
function ticks(f,n,a={},b={}){for(let i=0;i<n;i++)f.step(a,b);}
function until(f,predicate,b={}){
 for(let i=0;i<150&&!predicate();i++)f.step({},b);
 assert.ok(predicate(),'expected signature outcome within 150 ticks');
}
function launch(f,low=false){f.step({action:'signature',low});until(f,()=>f.projectiles.length>0);return f.projectiles[0];}
function finiteProjectile(p){
 for(const key of ['x','y','previousX','originX','facing','radius','age','life','distance','maxDistance','speed'])
  assert.ok(Number.isFinite(p[key]),'finite projectile '+key);
 assert.ok(p.distance>=0&&p.distance<=p.maxDistance);assert.ok(p.radius>0);
}

test('all 196 signatures share balanced mechanics and launch from natural authored punch tips',()=>{
 assert.equal(C.ROSTER.length,196);assert.equal(Object.keys(C.MOVES).length,6,'all original actions remain available');
 for(const data of C.ROSTER)for(const low of [false,true])for(const facing of [-1,1]){
  const f=fixture(data,facing),spec=C.getMoveSpec(data,'signature',{low});
  assert.equal(spec.damage,120);assert.equal(spec.cooldown,240);assert.equal(spec.start,18);
  assert.equal(spec.projectileSpeed,8);assert.equal(spec.projectileRadius,.2);assert.equal(spec.projectileRange,6);
  assert.ok(['punch','powerPunch','lowPunch'].includes(spec.visualPose),data.id+' is a punch');
  assert.equal(spec.visualScaleX,1,data.id+' does not stretch the painted body to missile range');
  const p=launch(f,low),art=T.METADATA[data.id],frame=art.frames[spec.visualPose];finiteProjectile(p);
  assert.equal(p.ownerId,data.id);assert.equal(p.ownerIndex,0);assert.equal(p.facing,facing);
  assert.equal(p.powerId,spec.power.id);assert.equal(p.power.id,spec.powerId);
  assert.ok(Math.abs(p.x-(f.left.x+facing*(frame.tipX-frame.pivot)*art.scale))<1e-10);
  const ctx=new Proxy({},{get(target,key){return target[key]||(()=>{});},set(target,key,value){target[key]=value;return true;}});
  const rendered=T.draw(ctx,f.left,{frame:f.frame},{countrySprites:{[data.id]:{naturalWidth:art.width}}});
  assert.ok(Math.abs(rendered.strikeTip.x-p.x)<1e-10,data.id+' visible launch X');
  assert.ok(Math.abs(rendered.strikeTip.y-p.y)<1e-10,data.id+' visible launch Y');
 }
});

test('every country signature lands exactly once at close and travelling range in both directions and stances',()=>{
 let cases=0;
 for(const data of C.ROSTER)for(const low of [false,true])for(const facing of [-1,1])for(const distance of [.8,4.5]){
  const f=fixture(data,facing,distance),hp=f.right.hp;f.step({action:'signature',low});
  let first=null;
  for(let frame=0;frame<115;frame++){
   f.step();for(const p of f.projectiles)finiteProjectile(p);
   if(f.right.hp<hp&&first===null)first=f.right.hp;
  }
  assert.equal(first,hp-120,`${data.id} low=${low} facing=${facing} distance=${distance}`);
  assert.equal(f.right.hp,first,data.id+' one damage event');assert.equal(f.projectiles.length,0);
  cases++;
 }
 assert.equal(cases,1568);
});

test('every signature hits its actual travel boundary and whiffs beyond it, mirrored and low too',()=>{
 for(const data of C.ROSTER)for(const low of [false,true])for(const facing of [-1,1])for(const outside of [false,true]){
  const spec=C.getMoveSpec(data,'signature',{low}),f=fixture(data,facing),hp=f.right.hp;
  const extent=spec.reach+spec.projectileRange+spec.projectileRadius+C.GEOMETRY.bodyRadius;
  f.left.x=-5*facing;f.right.x=f.left.x+facing*(extent+(outside?.03:-.03));
  f.step({action:'signature',low});ticks(f,115);
  assert.equal(f.right.hp,outside?hp:hp-120,`${data.id} low=${low} facing=${facing} outside=${outside}`);
  assert.equal(f.projectiles.length,0);
 }
});

test('all 196 signatures obey standing guard, crouching guard and low-punch guard rules',()=>{
 for(const data of C.ROSTER)for(const facing of [-1,1])for(const [low,guardLow,blocked] of [
  [false,false,true],[false,true,true],[true,false,false],[true,true,true]
 ]){
  const f=fixture(data,facing),hp=f.right.hp;
  f.step({action:'signature',low},{guard:true,low:guardLow});ticks(f,115,{}, {guard:true,low:guardLow});
  assert.equal(f.right.hp,blocked?hp:hp-120,`${data.id} facing=${facing} low=${low} guardLow=${guardLow}`);
  assert.equal(f.projectiles.length,0,'guard or range consumes the projectile');
 }
});

test('all low country signatures hit the smallest crouched fighter and stay low after key release',()=>{
 const smallest=C.ROSTER.reduce((a,b)=>T.METADATA[a.id].crouchHeight<T.METADATA[b.id].crouchHeight?a:b);
 for(const data of C.ROSTER)for(const facing of [-1,1]){
  const f=fixture(data,facing,4.5,smallest),hp=f.right.hp;
  f.step({action:'signature',low:true},{low:true});assert.equal(T.sourcePose(f.left),'crouch');
  f.step({}, {low:true});assert.equal(f.left.low,false);assert.equal(f.left.move.low,true);
  assert.equal(T.sourcePose(f.left),'crouch','committed low startup stays crouched');
  ticks(f,115,{}, {low:true});assert.equal(f.right.hp,hp-120,data.id+' reaches crouched '+smallest.id);
 }
});

test('signature startup, one projectile cap and a four-second cooldown are enforced without spending meter',()=>{
 const f=fixture(),hp=f.right.hp;f.left.meter=45;f.step({action:'signature'});
 assert.equal(f.left.signatureCooldown,240);assert.equal(f.left.signatureTotalCooldown,240);assert.equal(f.left.meter,45);
 ticks(f,17);assert.equal(f.projectiles.length,0);assert.equal(f.right.hp,hp);
 f.step();assert.equal(f.projectiles.length,1);const shot=f.projectiles[0];assert.equal(shot.age,1);
 ticks(f,2);assert.equal(f.projectiles.length,1);assert.equal(f.projectiles[0],shot);
 f.left.move=null;const cooldown=f.left.signatureCooldown;f.start(f.left,{action:'signature'});
 assert.equal(f.left.move,null);assert.equal(f.left.signatureCooldown,cooldown,'rejected action does not restart cooldown');
 f.left.signatureCooldown=0;f.start(f.left,{action:'signature'});assert.equal(f.left.move,null,'one missile per owner');
 f.left.signatureCooldown=cooldown;until(f,()=>!f.projectiles.length);
 ticks(f,f.left.signatureCooldown+f.hitstop);assert.equal(f.left.signatureCooldown,0);
 f.step({action:'signature'});assert.equal(f.left.move.id,'signature');assert.equal(f.left.signatureCooldown,240);
 const air=fixture();air.left.y=1;air.start(air.left,{action:'signature'});
 assert.equal(air.left.move,null);assert.equal(air.left.signatureCooldown,0,'airborne rejection spends no cooldown');
});

test('travelling energy cannot hit before arrival or hit backwards along its old path',()=>{
 for(const facing of [-1,1]){
  const f=fixture(country('jp'),facing,4.8),hp=f.right.hp,p=launch(f);
  assert.equal(f.right.hp,hp,'launch does not damage distant opponents');
  let travellingFrames=0;
  while(f.projectiles.length&&f.right.hp===hp){
   const body=C.hurtbox(f.right),nextX=p.x+p.facing*Math.min(p.speed/60,p.maxDistance-p.distance);
   const cannotReach=p.facing>0?nextX+p.radius<body.left:nextX-p.radius>body.right;
   f.step();if(cannotReach)assert.equal(f.right.hp,hp,'no future-range damage');travellingFrames++;
  }
  assert.ok(travellingFrames>10,'opponent has time to react');assert.equal(f.right.hp,hp-120);
  const behind=fixture(country('jp'),facing,6.5),oldHp=behind.right.hp,shot=launch(behind);
  until(behind,()=>shot.distance>1.5);behind.right.x=shot.x-facing*1.1;
  ticks(behind,65);assert.equal(behind.right.hp,oldHp,'missile does not damage enemies behind its current sweep');
 }
});

test('swept missiles cannot tunnel at high speed and collision height permits jumping over them',()=>{
 for(const facing of [-1,1]){
  const f=fixture(country('jp'),facing),hp=f.right.hp,p=launch(f);p.speed=240;
  f.step();assert.equal(f.right.hp,hp-120,'fast missile hits the crossed body');assert.equal(f.projectiles.length,0);
  const jump=fixture(country('jp'),facing),jumpHp=jump.right.hp;launch(jump);
  for(let i=0;i<65;i++){jump.right.y=4;jump.right.vy=0;jump.step();}
  assert.equal(jump.right.hp,jumpHp,'energy below an airborne hurtbox whiffs');assert.equal(jump.projectiles.length,0);
 }
});

test('hitstop freezes both travel and cooldown; interruption prevents a startup launch',()=>{
 const f=fixture(),shot=launch(f),snapshot={x:shot.x,age:shot.age,life:shot.life,cooldown:f.left.signatureCooldown,frame:f.frame};
 f.hitstop=5;ticks(f,5);
 assert.deepEqual({x:shot.x,age:shot.age,life:shot.life,cooldown:f.left.signatureCooldown,frame:f.frame},snapshot);
 f.step();assert.ok(shot.age>snapshot.age);assert.equal(f.left.signatureCooldown,snapshot.cooldown-1);
 const interrupted=fixture(country('jp'),1,.8),hp=interrupted.left.hp;
 interrupted.step({action:'signature'},{action:'light'});ticks(interrupted,100);
 assert.ok(interrupted.left.hp<hp);assert.equal(interrupted.projectiles.length,0);
 assert.equal(interrupted.right.hp,interrupted.right.data.hp,'interrupted power never launches later');
 assert.ok(interrupted.left.signatureCooldown>0,'startup was committed');
});

test('a delayed projectile preserves a newer attack and its combo; recoil uses the launch direction',()=>{
 const f=fixture(country('jp'),1,6),hp=f.right.hp;launch(f);
 until(f,()=>!f.left.move);assert.ok(f.projectiles.length);
 f.left.combo=2;f.left.hits=2;f.left.lastHit=f.frame;f.step({action:'light'});const newer=f.left.move;
 until(f,()=>f.right.hp<hp);
 assert.equal(f.left.move,newer,'newer attack remains active');assert.equal(f.left.resolved,false,'newer attack can still hit');
 assert.equal(f.left.combo,2,'delayed hit does not erase the newer combo');
 const crossed=fixture(),crossHp=crossed.right.hp,p=launch(crossed);
 crossed.left.move=null;crossed.left.x=6;crossed.left.stun=0;
 until(crossed,()=>crossed.right.hp<crossHp);
 assert.equal(crossed.left.facing,-1);assert.equal(p.facing,1);assert.ok(crossed.right.recoil>0,'recoil follows energy travel');
});

test('simultaneous signature punches and signature-versus-melee contacts can double KO',()=>{
 const data=country('jp'),f=fixture(data,1,4,data);f.left.hp=f.right.hp=80;
 f.step({action:'signature'},{action:'signature'});until(f,()=>f.phase!=='fight');
 assert.equal(f.left.hp,0);assert.equal(f.right.hp,0);assert.equal(f.reason,'DOUBLE KO');
 assert.equal(f.effects.filter(effect=>effect.type==='signature'&&effect.damage).length,2);
 assert.equal(f.projectiles.length,0);
 const mixed=fixture(data,1,.8,data);mixed.left.hp=mixed.right.hp=40;
 mixed.start(mixed.left,{action:'signature'});mixed.start(mixed.right,{action:'light'});
 mixed.left.moveFrame=mixed.left.move.start-1;mixed.right.moveFrame=mixed.right.move.start-1;mixed.step();
 assert.equal(mixed.left.hp,0);assert.equal(mixed.right.hp,0);assert.equal(mixed.reason,'DOUBLE KO');
});

test('launched energy survives an interruption but is cleared on owner death, round end and reset',()=>{
 const f=fixture(),hp=f.right.hp;launch(f);f.left.move=null;f.left.stun=60;
 until(f,()=>f.right.hp<hp);assert.equal(f.right.hp,hp-120,'already visible energy keeps travelling');
 const dead=fixture(),deadHp=dead.right.hp;launch(dead);dead.left.hp=0;dead.step();
 assert.equal(dead.projectiles.length,0);assert.equal(dead.right.hp,deadHp);
 const end=fixture();launch(end);end.time=1;end.step();assert.equal(end.projectiles.length,0);
 const reset=fixture();launch(reset);reset.resetRound();
 assert.equal(reset.projectiles.length,0);assert.equal(reset.left.signatureCooldown,0);assert.equal(reset.right.signatureCooldown,0);
});

test('signature move, launch, hit and block events carry country/power metadata exactly once',()=>{
 const events=[],oldDispatch=globalThis.dispatchEvent,oldEvent=globalThis.CustomEvent;
 globalThis.CustomEvent=class{constructor(type,{detail}){this.type=type;this.detail=detail;}};
 globalThis.dispatchEvent=event=>events.push(event);
 try{
  for(const blocked of [false,true]){
   events.length=0;const f=fixture(country('ir')),hp=f.right.hp;
   f.step({action:'signature'},{guard:blocked});ticks(f,115,{}, {guard:blocked});
   const moves=events.filter(event=>event.type==='nation-move'),launches=events.filter(event=>event.type==='nation-projectile');
   const hits=events.filter(event=>event.type==='nation-hit');
   assert.equal(moves.length,1);assert.equal(launches.length,1);assert.equal(hits.length,1);
   for(const event of [...moves,...launches,...hits]){assert.equal(event.detail.attackerId,'ir');assert.ok(event.detail.powerId);}
   assert.equal(hits[0].detail.move,'signature');assert.equal(hits[0].detail.countryId,'ir');
   assert.equal(hits[0].detail.kind,blocked?'block':'hit');assert.equal(hits[0].detail.damage,blocked?0:120);
   assert.equal(f.right.hp,blocked?hp:hp-120);
  }
 }finally{
  if(oldDispatch===undefined)delete globalThis.dispatchEvent;else globalThis.dispatchEvent=oldDispatch;
  if(oldEvent===undefined)delete globalThis.CustomEvent;else globalThis.CustomEvent=oldEvent;
 }
});

test('AI uses a ready signature at a readable midrange and respects its cooldown',()=>{
 const f=fixture();f.random=()=>0;
 assert.equal(f.ai().action,'signature');f.right.signatureCooldown=1;assert.notEqual(f.ai().action,'signature');
});
