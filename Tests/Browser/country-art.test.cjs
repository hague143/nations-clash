const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const C=require('../../browser/src/combat.js');
require('../../browser/src/sprites.js');
const T=require('../../browser/src/country-sprites.js');
const root=path.resolve(__dirname,'../..');
const intake=require('../../artwork/country-fighters/intake.json');
const assignments=require('../../artwork/country-fighters/assignments.json');
const sourceFor=id=>assignments.overrides[id]?.sourceId||id;
const actions=['light','heavy','special','break','throw','ultimate'];

test('all 196 country mappings preserve the exact supplied PNGs with no country missing',()=>{
 assert.equal(intake.images.length,196);assert.equal(intake.missing.length,0);
 assert.equal(Object.keys(T.METADATA).length,196);
 assert.equal(new Set(Object.values(T.METADATA).map(m=>m.sourceCountryId)).size,196,'no source reused for two countries');
 assert.equal(new Set(intake.images.map(e=>e.sha256)).size,196,'no duplicate source PNG files');
 const ids=new Set();
 for(const entry of intake.images){
  assert.ok(!ids.has(entry.id));ids.add(entry.id);
  const assigned=intake.images.find(e=>e.id===sourceFor(entry.id));
  assert.equal(T.METADATA[entry.id].sourceName,assigned.originalName);
  assert.equal(T.METADATA[entry.id].sourceCountryId,assigned.id);
  const bytes=fs.readFileSync(path.join(root,'artwork/country-fighters/source',entry.id+'.png'));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.sha256,entry.originalName+' retained intact');
  assert.equal(T.METADATA[entry.id].sourceSha256,assigned.sha256);
 }
 for(const c of intake.missing)assert.equal(T.hasArt(c.id),false,c.country+' not falsely marked as supplied');
 assert.equal(new Set([...ids,...intake.missing.map(c=>c.id)]).size,196);
});

test('every supplied pose is inside its atlas with finite pivots and opaque-contact coordinates',()=>{
 for(const [id,art]of Object.entries(T.METADATA)){
  assert.equal(art.poseRecords.length,8,id);
  assert.deepEqual(art.poseRecords.map(r=>r.index),[0,1,2,3,4,5,6,7]);
  for(const [pose,f]of Object.entries(art.frames)){
   for(const k of ['x','y','w','h','pivot','baseline'])assert.ok(Number.isFinite(f[k]),id+' '+pose+' '+k);
   assert.ok(f.w>0&&f.h>0&&f.x>=0&&f.y>=0&&f.x+f.w<=art.width&&f.y+f.h<=art.height,id+' '+pose+' atlas bounds');
   if(f.tipX!==undefined){assert.ok(f.tipX>f.pivot,id+' '+pose+' contact is forward');assert.ok(f.tipY<f.baseline,id+' '+pose+' contact is above ground');}
  }
 }
});

test('196 supplied fighters land all six attacks once, at standing and low stances, facing either way',()=>{
 let count=0;
 for(const data of C.ROSTER.filter(c=>T.hasArt(c.id)))for(const low of [false,true])for(const facing of [-1,1])for(const action of actions){
  const enemy=C.ROSTER.find(c=>c.id==='za');
  const specForRange=C.getMoveSpec(data,action,{low});
  const distance=Math.max(.75,Math.min(.92,specForRange.reach+.30));
  const fight=new C.Fight(data,enemy,{intro:0});fight.left.x=0;fight.right.x=facing*distance;fight.left.facing=facing;fight.right.facing=-facing;fight.left.meter=100;
  const original=fight.right.hp;fight.step({action,low});
  const spec=fight.left.move;assert.ok(spec,data.country+' '+action+' starts');
  assert.ok(spec.reach>0&&spec.height>0,data.country+' '+action+' finite positive contact');
  let first=null;
  for(let n=0;n<110;n++){fight.step();if(fight.right.hp<original&&first===null)first=fight.right.hp;}
  assert.ok(first!==null,`${data.id} ${action} low=${low} facing=${facing} actually hits`);
  assert.equal(fight.right.hp,first,data.id+' single damage event');
  count++;
 }
 assert.equal(count,4704);
});

test('supplied fighters whiff from across the arena and obey low/standing guard rules',()=>{
 for(const data of C.ROSTER.filter(c=>T.hasArt(c.id)))for(const facing of [-1,1]){
  const enemy=C.ROSTER.find(c=>c.id==='za');
  for(const action of actions){const f=new C.Fight(data,enemy,{intro:0});f.left.x=-6*facing;f.right.x=6*facing;f.left.facing=facing;f.right.facing=-facing;f.left.meter=100;const hp=f.right.hp;f.step({action});for(let i=0;i<110;i++)f.step();assert.equal(f.right.hp,hp,data.id+' '+action+' genuine whiff');}
  for(const [low,guardLow,blocked]of [[false,false,true],[true,false,false],[true,true,true]]){
   const f=new C.Fight(data,enemy,{intro:0});f.left.x=0;f.right.x=facing*.92;f.left.facing=facing;f.right.facing=-facing;const hp=f.right.hp;
   f.step({action:'light',low},{guard:true,low:guardLow});for(let i=0;i<90;i++)f.step({}, {guard:true,low:guardLow});
   assert.equal(f.right.hp===hp,blocked,data.id+' guard at low='+low+' guardLow='+guardLow);
  }
 }
});

test('blocked impact uses the authored guard pose and a buffered low attack keeps its lowered hurtbox',()=>{
 const data=C.ROSTER.find(c=>c.id==='pk'),enemy=C.ROSTER.find(c=>c.id==='us');
 const fight=new C.Fight(data,enemy,{intro:0});const defender=fight.right;
 defender.pose='block';defender.guard=true;defender.stun=12;
 assert.equal(T.sourcePose(defender),'block','block stun must not show a hit pose');
 const f=fight.left;fight.start(f,{action:'light',low:true});f.low=false;
 assert.equal(T.sourcePose(f),'crouch','low startup remains crouched after key release');
 assert.ok(C.hurtbox(f).top<2,'hurtbox follows the committed low strike, not the released input');
});

// These regressions encode the independently reviewed painted emblems, rather
// than trusting the misleading archive filename as the expected country.
test('reviewed flag swap cycles place Korean, Swiss, Somali and Spanish artwork in the correct country',()=>{
 for(const [id,name]of Object.entries({kr:'Sweden.png',ch:'Suriname.png',so:'Spain.png',es:'South Africa.png',ee:'Georgia.png',fj:'Gabon.png'}))
  assert.equal(T.METADATA[id].sourceName,name,id+' reviewed costume mapping');
});
