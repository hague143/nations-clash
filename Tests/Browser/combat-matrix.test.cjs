const test=require('node:test');
const assert=require('node:assert/strict');
const {Fight,ROSTER,MOVES,getMoveSpec,contact,hurtbox}=require('../../browser/src/combat.js');
// Match production load order so Pakistan's supplied poses participate in
// every world matrix assertion rather than the generic Grappler geometry.
const {PAKISTAN_ART}=require('../../browser/src/sprites.js');
const ACTIONS=Object.keys(MOVES);
const opponent=ROSTER.find(f=>f.id==='ng')||ROSTER[1];
function ticks(f,n,a={},b={}){for(let i=0;i<n;i++)f.step(a,b);}
function fixture(data,facing=1,far=false){
  const f=new Fight(data,opponent,{intro:0,intermission:1});
  f.left.x=far?-6*facing:0;f.right.x=far?6*facing:.9*facing;
  f.left.facing=facing;f.right.facing=-facing;return f;
}
function finiteFighter(f,label){
  for(const key of ['x','y','vy','hp','meter','stun'])assert.ok(Number.isFinite(f[key]),label+' '+key+' is finite');
  assert.ok(f.hp>=0&&f.hp<=f.data.hp,label+' valid HP');
  assert.ok(f.meter>=0&&f.meter<=100,label+' valid meter');
  assert.ok(f.y>=0&&Math.abs(f.x)<=6.6,label+' arena bounds');
  const box=hurtbox(f);assert.ok(Object.values(box).every(Number.isFinite),label+' finite hurtbox');
  if(f.move)assert.ok(Object.values(contact(f)).every(Number.isFinite),label+' finite strike');
}
test('world roster has 196 bounded fighter profiles with all eight archetypes',()=>{
  assert.equal(ROSTER.length,196);assert.equal(new Set(ROSTER.map(f=>f.id)).size,196);
  assert.equal(new Set(ROSTER.map(f=>f.country)).size,196);assert.equal(new Set(ROSTER.map(f=>f.style)).size,8);
  for(const data of ROSTER){
    assert.ok(data.hp>=850&&data.hp<=1200,data.country+' balanced health');
    assert.ok(data.speed>=2.5&&data.speed<=5,data.country+' balanced speed');
    assert.ok(['light','medium','heavy'].includes(data.weight),data.country+' defined weight');
    for(const action of ACTIONS){const move=getMoveSpec(data,action);
      for(const key of ['damage','reach','height','start','active','recovery','stun'])
        assert.ok(Number.isFinite(move[key])&&move[key]>0,data.country+' '+action+' '+key);
    }
  }
});
test('Pakistan uses its registered authored attack tips in the world fixtures',()=>{
  const data=ROSTER.find(f=>f.id==='pk');
  for(const action of ACTIONS)for(const low of [false,true])for(const facing of [-1,1]){
    const spec=getMoveSpec(data,action,{low}),pose=PAKISTAN_ART.frames[spec.visualPose];
    assert.ok(pose,'Pakistan '+action+' selects an authored attack pose');
    const f=fixture(data,facing);f.left.meter=100;f.step({action,low});const strike=contact(f.left);
    const tipX=f.left.x+facing*(pose.tipX-pose.pivot)*PAKISTAN_ART.scale*spec.visualScaleX;
    const tipY=f.left.y+(pose.baseline-pose.tipY)*PAKISTAN_ART.scale*spec.visualScaleY;
    assert.ok(Math.abs(strike.x-tipX)<1e-10,'Pakistan '+action+' horizontal authored contact');
    assert.ok(Math.abs(strike.y-tipY)<1e-10,'Pakistan '+action+' vertical authored contact');
  }
});
test('all 196 fighters land all six attacks in both directions exactly once',()=>{
  let cases=0;
  for(const data of ROSTER)for(const action of ACTIONS)for(const facing of [-1,1]){
    const f=fixture(data,facing),hp=f.right.hp;f.left.meter=100;f.step({action});
    assert.ok(f.left.move,data.country+' starts '+action);
    assert.ok(Object.values(contact(f.left)).every(Number.isFinite));
    let firstDamage=null;
    for(let frame=0;frame<100;frame++){
      f.step();finiteFighter(f.left,data.country);finiteFighter(f.right,opponent.country);
      if(f.right.hp<hp&&firstDamage===null)firstDamage=f.right.hp;
    }
    assert.ok(firstDamage!==null,data.country+' '+action+' hits facing '+facing);
    assert.equal(f.right.hp,firstDamage,data.country+' '+action+' cannot hit twice');
    assert.ok(f.right.lastDamage>0,data.country+' '+action+' damage feedback');cases++;
  }
  assert.equal(cases,2352);
});
test('all 196 fighters genuinely whiff every attack outside its reach, mirrored too',()=>{
  let cases=0;
  for(const data of ROSTER)for(const action of ACTIONS)for(const facing of [-1,1]){
    const f=fixture(data,facing,true),hp=f.right.hp;f.left.meter=100;f.step({action});ticks(f,100);
    assert.equal(f.right.hp,hp,data.country+' '+action+' must not damage from across arena');
    assert.equal(f.right.lastDamage,0);assert.equal(f.right.pending,null);cases++;
  }
  assert.equal(cases,2352);
});
test('all country fighters obey standing guard, low guard and guard break rules',()=>{
  for(const data of ROSTER)for(const facing of [-1,1]){
    let f=fixture(data,facing),hp=f.right.hp;
    f.step({action:'light'},{guard:true});ticks(f,90,{}, {guard:true});assert.equal(f.right.hp,hp,data.country+' standing guard');
    f=fixture(data,facing);hp=f.right.hp;
    f.step({action:'light',low:true},{guard:true});ticks(f,90,{}, {guard:true});assert.ok(f.right.hp<hp,data.country+' low beats standing guard');
    f=fixture(data,facing);hp=f.right.hp;
    f.step({action:'light',low:true},{guard:true,low:true});ticks(f,90,{}, {guard:true,low:true});assert.equal(f.right.hp,hp,data.country+' low guard');
    f=fixture(data,facing);hp=f.right.hp;
    f.step({action:'break'},{guard:true});ticks(f,100,{}, {guard:true});assert.ok(f.right.hp<hp,data.country+' guard break');
  }
});
test('each of the 196 AI fighters completes a match with finite state and valid bounds',()=>{
  for(let index=0;index<ROSTER.length;index++){
    const data=ROSTER[index];
    const f=new Fight(opponent,data,{intro:0,intermission:1,seconds:12,seed:90210+index});
    for(let frame=0;frame<6000&&f.phase!=='complete';frame++){
      f.step({},f.ai('normal'));finiteFighter(f.left,opponent.country);finiteFighter(f.right,data.country);
    }
    assert.equal(f.phase,'complete',data.country+' AI match finishes');
    assert.equal(f.wins[1],2,data.country+' AI can defeat a passive target');
  }
});
test('archetype AI mirror matches remain bounded through throws, juggles and round resets',()=>{
  const representatives=[...new Map(ROSTER.map(data=>[data.style,data])).values()];
  for(const data of representatives){
    const f=new Fight(data,data,{intro:0,intermission:1,seconds:8,seed:28});
    // ai() controls the right fighter. Swap references briefly to obtain its
    // opponent's decision from the same production controller.
    for(let frame=0;frame<9000&&f.phase!=='complete';frame++){
      const right=f.ai('hard');[f.left,f.right]=[f.right,f.left];const left=f.ai('hard');[f.left,f.right]=[f.right,f.left];
      f.step(left,right);finiteFighter(f.left,data.style);finiteFighter(f.right,data.style);
    }
    assert.equal(f.phase,'complete',data.style+' decisive mirror match finishes');
  }
});
