const test=require('node:test');
const assert=require('node:assert/strict');
const {Fight,ROSTER,GEOMETRY,JAPAN_ART,SPRITE_ART,registerSpriteGeometry,getMoveSpec,
  contact,hurtbox,active,extension}=require('../../browser/src/combat.js');
const country=id=>ROSTER.find(f=>f.id===id);
function world(){const f=new Fight(country('pk'),country('jp'),{intro:0,intermission:1});f.left.x=-.45;f.right.x=.45;return f;}
function step(f,n,a={},b={}){for(let i=0;i<n;i++)f.step(a,b);}
function until(f,p,b={}){for(let i=0;i<180&&!p();i++)f.step({},b);assert.ok(p(),'expected combat outcome within 180 ticks');}
test('country catalog contains unique fighters and all eight archetypes',()=>{assert.equal(new Set(ROSTER.map(r=>r.id)).size,ROSTER.length);assert.equal(new Set(ROSTER.map(r=>r.style)).size,8);});
test('startup, active damage, and one hit per move',()=>{const f=world(),hp=f.right.hp;f.step({action:'light'});assert.equal(f.right.hp,hp);until(f,()=>f.right.hp<hp);const hit=f.right.hp;step(f,60);assert.equal(f.right.hp,hit);});
test('guard is zero chip, low beats standing guard, crouch blocks low',()=>{let f=world(),hp=f.right.hp;f.step({action:'light'},{guard:true});step(f,40,{}, {guard:true});assert.equal(f.right.hp,hp);f=world();f.step({action:'light',low:true},{guard:true});until(f,()=>f.right.hp<hp,{guard:true});f=world();f.step({action:'light',low:true},{guard:true,low:true});step(f,40,{}, {guard:true,low:true});assert.equal(f.right.hp,hp);});
test('guard break bypasses guarding',()=>{const f=world(),hp=f.right.hp;f.step({action:'break'},{guard:true});until(f,()=>f.right.hp<hp,{guard:true});assert.equal(f.message,'GUARD BREAK');});
test('light-light-heavy chain launches',()=>{const f=world();let hp=f.right.hp;f.step({action:'light'});until(f,()=>f.right.hp<hp);hp=f.right.hp;f.step({action:'light'});until(f,()=>f.right.hp<hp);hp=f.right.hp;f.step({action:'heavy'});until(f,()=>f.right.hp<hp);assert.equal(f.left.hits,3);assert.ok(f.right.y>0&&f.right.vy>0);});
test('throw tech and unbroken throw damage',()=>{let f=world(),hp=f.right.hp;f.step({action:'throw'});until(f,()=>!!f.right.pending);f.step({},{action:'throw'});step(f,40);assert.equal(f.right.hp,hp);f=world();f.step({action:'throw'});until(f,()=>f.right.hp<hp);assert.equal(hp-f.right.hp,175);});
test('ultimate requires meter and spends a full bar',()=>{const f=world();f.step({action:'ultimate'});assert.equal(f.left.move,null);f.left.meter=100;f.step({action:'ultimate'});assert.ok(f.left.move.ultimate);assert.equal(f.left.meter,0);});
test('double KO draws; first to two wins resets rounds',()=>{let f=world();f.left.hp=f.right.hp=0;f.step();assert.equal(f.winner,-1);assert.deepEqual(f.wins,[0,0]);f=world();f.right.hp=0;f.step();f.step();assert.equal(f.right.hp,f.right.data.hp);f.right.hp=0;f.step();assert.equal(f.phase,'complete');assert.deepEqual(f.wins,[2,0]);});
test('timeout uses normalized health percentages',()=>{const f=world();f.left.hp=525;f.right.hp=510;f.time=1;f.step();assert.equal(f.winner,1);assert.equal(f.reason,'TIME OVER');});
test('seeded AI completes a decisive match and maintains bounds',()=>{const f=new Fight(ROSTER[0],ROSTER[5],{intro:0,intermission:1,seed:37});for(let i=0;i<18000&&f.phase!=='complete';i++){f.step({},f.ai());for(const c of [f.left,f.right]){assert.ok(c.hp>=0&&c.hp<=c.data.hp);assert.ok(c.y>=0&&Math.abs(c.x)<=6.6);assert.ok(c.meter>=0&&c.meter<=100);}}assert.equal(f.phase,'complete');assert.equal(f.wins[1],2);});
test('Japan leads the roster and supplied punch/kick match authored sprite pivots',()=>{
  assert.equal(ROSTER[0].id,'jp');
  for(const [action,pose]of [['light','punch'],['heavy','kick']]){
    const f=new Fight(country('jp'),country('pk'),{intro:0});f.step({action});
    const meta=JAPAN_ART.frames[pose];assert.equal(f.left.move.reach,(meta.tipX-meta.pivot)*JAPAN_ART.scale);
    assert.equal(f.left.move.height,(meta.baseline-meta.tipY)*JAPAN_ART.scale);
  }
});
test('visible attack contact hits the opponent, mirrored or facing right',()=>{
  for(const facing of [1,-1])for(const action of ['light','heavy','special','break']){
    const f=new Fight(country('jp'),country('pk'),{intro:0});f.left.x=0;f.right.x=facing;
    f.step({action});const move=f.left.move;
    f.right.x=facing*(move.reach+GEOMETRY.bodyRadius+GEOMETRY.strikeRadius-.04);
    const hp=f.right.hp;until(f,()=>f.right.hp<hp);
    assert.ok(f.right.lastDamage>0);assert.equal(f.right.pose,'hit');assert.ok(f.effects.some(e=>e.damage>0));
    assert.equal(extension(f.left),1,'drawn limb stays extended on active impact frame');
  }
});
test('outside the visible strike radius genuinely whiffs and asks player to approach',()=>{
  const f=new Fight(country('jp'),country('pk'),{intro:0});f.left.x=0;f.right.x=1;
  f.step({action:'light'});f.right.x=f.left.move.reach+GEOMETRY.bodyRadius+GEOMETRY.strikeRadius+.05;
  const hp=f.right.hp;step(f,40);assert.equal(f.right.hp,hp);assert.equal(f.message,'MISSED · MOVE CLOSER');
});
test('collision overlaps actual hurtbox, high attack misses above target and low uses low contact',()=>{
  let f=world();f.step({action:'light'});const m=f.left.move;f.left.moveFrame=m.start;
  const box=hurtbox(f.right),point=contact(f.left);assert.ok(active(f.left));assert.ok(point.bottom<=box.top);
  assert.ok(f.detect(f.left,f.right));f.left.y=4;assert.equal(f.detect(f.left,f.right),null);
  f=world();f.step({action:'light',low:true});assert.equal(contact(f.left).y,.65);
});
test('blocked impact stays in block reaction without HP damage',()=>{
  const f=world(),hp=f.right.hp;f.step({action:'light'},{guard:true});
  until(f,()=>f.message.startsWith('BLOCKED'),{guard:true});assert.equal(f.right.pose,'block');
  step(f,4,{}, {guard:true});assert.equal(f.right.pose,'block');assert.equal(f.right.hp,hp);
});
test('simultaneous real attacks trade without losing the second contact snapshot',()=>{
  const f=world();f.left.hp=40;f.right.hp=40;
  f.step({action:'light'},{action:'light'});until(f,()=>f.phase==='intermission');
  assert.equal(f.left.hp,0);assert.equal(f.right.hp,0);assert.equal(f.reason,'DOUBLE KO');
  assert.equal(f.effects.filter(e=>e.damage>0).length,2);
});
test('a strike interrupting a simultaneous throw cancels its delayed damage',()=>{
  const f=world(),hp=f.right.hp;
  f.start(f.left,{action:'throw'});f.start(f.right,{action:'light'});
  f.left.moveFrame=f.left.move.start-1;f.right.moveFrame=f.right.move.start-1;
  f.step();assert.ok(f.left.stun>0,'punch interrupts thrower');
  assert.equal(f.right.pending,null,'interrupted grab is released immediately');
  step(f,60);assert.equal(f.right.hp,hp,'cancelled throw must never deal delayed damage');
});
test('an interrupted or knocked-out thrower cannot retain a grab',()=>{
  for(const interruption of ['move','stun','ko']){
    const f=world(),hp=f.right.hp;f.step({action:'throw'});until(f,()=>!!f.right.pending);
    if(interruption==='move')f.left.move=null;
    if(interruption==='stun')f.left.stun=20;
    if(interruption==='ko')f.left.hp=0;
    f.step();assert.equal(f.right.pending,null,interruption+' releases opponent');
    step(f,40);assert.equal(f.right.hp,hp);
  }
});
test('expired stun buffer cannot produce a late unrequested attack',()=>{
  const f=world(),hp=f.right.hp;f.left.stun=25;f.step({action:'light'});step(f,60);
  assert.equal(f.left.buffer,null);assert.equal(f.left.move,null);assert.equal(f.right.hp,hp);
});
test('recovery buffers a command briefly and jumps never double jump',()=>{
  const f=world();f.right.x=5;f.step({action:'light'});
  const duration=f.left.move.start+f.left.move.active+f.left.move.recovery;
  step(f,duration-4);f.step({action:'heavy'});step(f,3);
  assert.equal(f.left.move?.id,'heavy');
  const jump=world();jump.step({action:'jump'});step(jump,3);const velocity=jump.left.vy;
  jump.step({action:'jump'});assert.ok(jump.left.vy<velocity,'airborne jump does not reset vertical speed');
});
test('registered authored sprites share exact contact geometry for every attack',()=>{
  const id='test-authored';
  const metadata={scale:.01,frames:{
    punch:{pivot:100,baseline:300,tipX:225,tipY:90},
    kick:{pivot:100,baseline:300,tipX:280,tipY:65}
  }};
  registerSpriteGeometry(id,metadata);
  try{
    const data={...country('pk'),id};
    for(const action of ['light','heavy','special','break','throw','ultimate'])for(const low of [false,true]){
      const move=getMoveSpec(data,action,{low});const pose=metadata.frames[move.visualPose];
      assert.ok(Math.abs((pose.tipX-pose.pivot)*metadata.scale*move.visualScaleX-move.reach)<1e-10);
      assert.ok(Math.abs((pose.baseline-pose.tipY)*metadata.scale*move.visualScaleY-move.height)<1e-10);
    }
    assert.throws(()=>registerSpriteGeometry('bad',{...metadata,scale:0}),TypeError);
    assert.throws(()=>registerSpriteGeometry('bad',{...metadata,frames:{...metadata.frames,punch:{...metadata.frames.punch,tipX:100}}}),TypeError);
  }finally{delete SPRITE_ART[id];}
});
test('move, impact, throw, escape and round audio events fire once with useful metadata',()=>{
  const events=[],oldDispatch=globalThis.dispatchEvent,oldEvent=globalThis.CustomEvent;
  globalThis.CustomEvent=class{constructor(type,{detail}){this.type=type;this.detail=detail;}};
  globalThis.dispatchEvent=event=>events.push(event);
  try{
    let f=world();f.step({action:'light'},{guard:true});step(f,50,{}, {guard:true});
    const blocks=events.filter(e=>e.type==='nation-hit'&&e.detail.kind==='block');
    assert.equal(blocks.length,1);assert.equal(blocks[0].detail.action,'light');assert.equal(blocks[0].detail.damage,0);
    assert.equal(blocks[0].detail.attackerId,'pk');assert.equal(blocks[0].detail.defenderId,'jp');
    assert.equal(events.filter(e=>e.type==='nation-move').length,1);
    events.length=0;f=world();f.step({action:'throw'});until(f,()=>!!f.right.pending);
    assert.equal(events.filter(e=>e.type==='nation-hit').length,0,'grab damage sound waits for actual impact');
    until(f,()=>f.right.hp<f.right.data.hp);step(f,35);
    assert.equal(events.filter(e=>e.type==='nation-hit'&&e.detail.kind==='throw').length,1);
    events.length=0;f=world();f.step({action:'throw'});until(f,()=>!!f.right.pending);f.step({},{action:'throw'});step(f,40);
    assert.equal(events.filter(e=>e.type==='nation-hit'&&e.detail.kind==='tech').length,1);
    assert.equal(events.filter(e=>e.type==='nation-hit'&&e.detail.kind==='throw').length,0);
    events.length=0;f=world();f.right.hp=0;f.step();f.step();f.right.hp=0;f.step();step(f,5);
    assert.deepEqual(events.filter(e=>e.type==='nation-round').map(e=>e.detail.type),['fight','round-end','fight','round-end','match-end']);
  }finally{
    if(oldDispatch===undefined)delete globalThis.dispatchEvent;else globalThis.dispatchEvent=oldDispatch;
    if(oldEvent===undefined)delete globalThis.CustomEvent;else globalThis.CustomEvent=oldEvent;
  }
});
