'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../../browser/src/combat.js');
const T=require('../../browser/src/country-sprites.js');
const pk=C.ROSTER.find(c=>c.id==='pk');
const noopContext=()=>new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
function knockOut(data,{slot=1,facing=1,air=false,final=true,intermission=90}={}){
 const f=new C.Fight(slot?pk:data,slot?data:pk,{intro:0,intermission});
 const loser=slot?f.right:f.left,winner=slot?f.left:f.right;
 winner.x=0;loser.x=facing*.92;winner.facing=facing;loser.facing=-facing;
 loser.hp=1;if(air)loser.y=1.2;
 if(final)f.wins[slot?0:1]=1;
 f.step(slot?{action:'light'}:{},slot?{}:{action:'light'});
 for(let i=0;i<30&&f.phase==='fight';i++)f.step();
 assert.equal(loser.hp,0);assert.equal(f.phase,final?'complete':'intermission');
 return {f,winner,loser};
}
function invariant(f){return {hp:[f.left.hp,f.right.hp],meter:[f.left.meter,f.right.meter],wins:[...f.wins],round:f.round,time:f.time,phase:f.phase,winner:f.winner,reason:f.reason,cooldowns:[f.left.signatureCooldown,f.right.signatureCooldown]};}
function visualTick(f){if(f.settle)f.settle();else f.step();}

test('every deciding KO finishes its defeat pose, airborne fall, hit flash, effects and winner recovery',()=>{
 let cases=0;
 for(const data of C.ROSTER)for(const slot of [0,1])for(const facing of [-1,1])for(const air of [false,true]){
  const {f,winner,loser}=knockOut(data,{slot,facing,air}),before=invariant(f),frame=f.frame;
  assert.ok(loser.flash>0&&f.effects.length>0&&winner.move,'fixture contains an actual lethal impact');
  for(let i=0;i<100;i++)visualTick(f);
  assert.deepEqual(invariant(f),before,data.id+' outcome stays locked');assert.ok(f.frame>frame+10,'presentation advances');
  assert.equal(f.hitstop,0);assert.equal(loser.y,0,data.id+' reaches the floor');assert.equal(loser.vy,0);
  assert.equal(loser.flash,0,data.id+' hit flash fades');assert.equal(f.effects.length,0,'impact particles expire');
  assert.equal(winner.move,null,'winner finishes recovery');assert.equal(winner.pose,'idle');
  const draw=T.draw(noopContext(),loser,{frame:f.frame,floor:600},{countrySprites:{[data.id]:{naturalWidth:T.METADATA[data.id].width}}});
  assert.equal(draw.diagnostic.pose,'ko',data.id+' uses its defeated pose');
  assert.equal(!!draw.diagnostic.adaptedKo,!!T.METADATA[data.id].adaptedKo);
  assert.ok(Math.abs(winner.x)<=6.6&&Math.abs(loser.x)<=6.6);cases++;
 }
 assert.equal(cases,1568);
});

test('between-round animation settles while the existing round delay and reset stay intact',()=>{
 const {f,winner,loser}=knockOut(C.ROSTER[0],{final:false}),before=invariant(f),wait=f.wait;
 for(let i=0;i<60;i++)f.step({action:'signature',axis:1},{action:'ultimate',guard:true});
 assert.deepEqual(invariant(f),before);assert.equal(f.wait,wait-60);assert.equal(loser.flash,0);assert.equal(f.effects.length,0);assert.equal(winner.move,null);
 assert.equal(f.left.buffer,null);assert.equal(f.right.buffer,null);assert.equal(f.projectiles.length,0);
 for(let i=0;i<wait-60;i++)f.step();
 assert.equal(f.round,2);assert.equal(f.phase,'fight');assert.deepEqual(f.wins,[1,0]);
 assert.equal(f.left.hp,f.left.data.hp);assert.equal(f.right.hp,f.right.data.hp);assert.equal(f.time,60*60);
});

test('settling is presentation-only, accepts no new attacks, emits no repeated outcomes and clamps recoil',()=>{
 const {f,loser}=knockOut(C.ROSTER[0]);
 let events=0;const oldDispatch=globalThis.dispatchEvent,oldEvent=globalThis.CustomEvent;
 globalThis.CustomEvent=class{constructor(type,{detail}){this.type=type;this.detail=detail;}};globalThis.dispatchEvent=()=>events++;
 try{
  loser.x=6.6;loser.recoil=.6;f.left.buffer={action:'signature',low:false};const before=invariant(f);
  for(let i=0;i<150;i++){f.step({action:'ultimate'},{action:'signature'});visualTick(f);}
  assert.deepEqual(invariant(f),before);assert.equal(events,0);assert.equal(f.left.buffer,null);assert.equal(f.projectiles.length,0);assert.ok(loser.x<=6.6);
  const live=new C.Fight(pk,C.ROSTER[0],{intro:0}),state=JSON.stringify(live);
  live.settle();assert.equal(JSON.stringify(live),state,'settle cannot advance an active fight');
 }finally{globalThis.dispatchEvent=oldDispatch;globalThis.CustomEvent=oldEvent;}
});
