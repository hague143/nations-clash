#!/usr/bin/env node
'use strict';
// Standalone, read-only live-engine replay. Run from any working directory:
// node tools/audit-fighter-matches.cjs [--pilot]
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const C=require(path.join(root,'browser/src/combat.js'));
require(path.join(root,'browser/src/country-sprites.js'));
const {Fight,ROSTER,SPRITE_ART}=C;
const pilot=process.argv.includes('--pilot');
const resultDir=path.resolve(process.env.NATIONCLASH_AUDIT_DIR||path.join(root,'artifacts/fighter-retest/ai'),pilot?'pilot':'full');
fs.mkdirSync(resultDir,{recursive:true});
const output=fs.openSync(path.join(resultDir,'matches.jsonl'),'w');
const started=Date.now();
const styles=[...new Set(ROSTER.map(c=>c.style))];
const difficulties=['easy','normal','hard'];
const seeds=pilot?[37]:[37,19421];
const targets=pilot?ROSTER.slice(0,8):ROSTER;
const phases=new Set(['intro','fight','intermission','complete']);
const validActions=new Set(['light','heavy','special','break','throw','ultimate','signature','jump']);
let current=null,frameChecks=0;
const violations=[];
const byCountry={};
const totals={matches:0,completed:0,unfinished:0,steps:0,combatFrames:0,rounds:0,
  outcomes:{},profiles:{},acceptedActions:{},contacts:{},damage:0,projectiles:0,
  longestNoDamageFrames:0,maximumRound:0};
function incr(obj,key,n=1){obj[key]=(obj[key]||0)+n;}
function metrics(){return {requested:{},actions:{},hits:{},blocks:{},damage:0,projectiles:0,
  signatureEligibleFrames:0,signatureReadyRangeFrames:0,normalHits:0,signatureHits:0};}
globalThis.CustomEvent=class{constructor(type,{detail}){this.type=type;this.detail=detail;}};
globalThis.dispatchEvent=event=>{
  const c=current;if(!c)return;
  const e=event.detail;
  if(event.type==='nation-round'){
    c.events.push({type:e.type,round:e.round,frame:e.frame,winner:e.winner,reason:e.reason,wins:e.wins});
    if(e.type==='round-end'){incr(totals.outcomes,e.reason);totals.rounds++;}
    return;
  }
  const id=e.actorId||e.attackerId;
  const slot=c.ids.indexOf(id);
  if(slot<0){c.fail('event actor absent',e);return;}
  const stats=c.stats[slot];
  if(event.type==='nation-move'){
    incr(stats.actions,e.action);incr(totals.acceptedActions,e.action);
    if(!validActions.has(e.action))c.fail('unknown accepted action',e);
    if(e.action==='signature'){
      const key=slot+':'+c.f.round;
      if(c.lastSignature[key]!==undefined&&e.frame-c.lastSignature[key]<C.SIGNATURE_COOLDOWN)
        c.fail('signature starts before cooldown',e);
      c.lastSignature[key]=e.frame;
    }
  }else if(event.type==='nation-hit'){
    incr(totals.contacts,e.kind);
    if(e.kind==='block'){incr(stats.blocks,e.action);}
    if(e.damage>0){
      incr(stats.hits,e.action);stats.damage+=e.damage;totals.damage+=e.damage;
      if(e.action==='signature')stats.signatureHits++;else stats.normalHits++;
      c.lastDamageFrame=c.f.frame;
    }
  }else if(event.type==='nation-projectile'){
    stats.projectiles++;totals.projectiles++;
  }
};
function aiFor(f,slot,difficulty){
  if(slot===1)return f.ai(difficulty);
  // Only perspective is swapped: projectile owners retain original references,
  // coordinates stay in world space, and both AIs share the live Fight RNG.
  return Fight.prototype.ai.call({phase:f.phase,left:f.right,right:f.left,
    projectiles:f.projectiles,random:()=>f.random()},difficulty);
}
// Verify the facade's path uses exactly the native decision and RNG behavior.
for(const difficulty of difficulties){
  const f=new Fight(ROSTER[0],ROSTER[1],{intro:0,seed:999});
  for(let n=0;n<100;n++){
    const before=f.seed,native=f.ai(difficulty),after=f.seed;
    f.seed=before;
    const facade=Fight.prototype.ai.call({phase:f.phase,left:f.left,right:f.right,
      projectiles:f.projectiles,random:()=>f.random()},difficulty);
    assert.deepEqual(facade,native);assert.equal(f.seed,after);
    f.step({},native);
  }
}
function validateFighter(f,c){
  if(!Number.isFinite(f.x)||!Number.isFinite(f.y)||!Number.isFinite(f.vy)||
     !Number.isFinite(f.hp)||!Number.isFinite(f.meter)||!Number.isFinite(f.signatureCooldown))
    c.fail('nonfinite fighter state',{id:f.data.id,x:f.x,y:f.y,hp:f.hp,meter:f.meter});
  if(Math.abs(f.x)>6.600000001||f.y<0||f.hp<0||f.hp>f.data.hp||f.meter<0||f.meter>100||
     f.signatureCooldown<0||f.signatureCooldown>C.SIGNATURE_COOLDOWN)
    c.fail('fighter bounds',{id:f.data.id,x:f.x,y:f.y,hp:f.hp,meter:f.meter,cooldown:f.signatureCooldown});
  if(f.move&&(!validActions.has(f.move.id)||!Number.isFinite(f.move.reach)||!Number.isFinite(f.move.height)))
    c.fail('invalid move',{id:f.data.id,move:f.move});
  if(f.pending&&!c.f.validGrab(f.pending))c.fail('invalid pending grab',{id:f.data.id});
}
function runMatch(target,opponent,difficulty,seed,targetSlot,profile){
  const data=targetSlot===0?[target,opponent]:[opponent,target];
  const f=new Fight(...data,{seed,intro:2,intermission:2});
  if(profile==='ranged'){
    const reset=f.resetRound.bind(f);
    f.resetRound=()=>{reset();f.left.x=-2.2;f.right.x=2.2;};
    f.left.x=-2.2;f.right.x=2.2;
  }
  const record={target:target.id,country:target.country,targetSlot,opponent:opponent.id,
    opposingStyle:opponent.style,difficulty,seed,profile,ids:data.map(d=>d.id),stats:[metrics(),metrics()],
    events:[],violations:[],lastSignature:{},f,steps:0,lastDamageFrame:0,longestNoDamage:0};
  record.fail=(kind,detail)=>{
    if(record.violations.length>=5)return;
    const violation={kind,frame:f.frame,round:f.round,phase:f.phase,detail};
    record.violations.push(violation);
    if(violations.length<100)violations.push({...violation,target:target.id,targetSlot,opponent:opponent.id,difficulty,seed,profile});
  };
  current=record;
  // Constructor emitted the initial intro event before current was installed.
  let previousRound=1,previousPhase=f.phase;
  for(;record.steps<60000&&f.phase!=='complete';record.steps++){
    const fighting=f.phase==='fight';
    if(fighting){
      const dist=Math.abs(f.left.x-f.right.x);
      if(dist>=3&&dist<=5){
        for(let slot=0;slot<2;slot++){
          const actor=slot===0?f.left:f.right;
          if(!actor.signatureCooldown){
            record.stats[slot].signatureReadyRangeFrames++;
            if(!actor.stun&&!actor.move&&!actor.y&&!actor.pending)
              record.stats[slot].signatureEligibleFrames++;
          }
        }
      }
    }
    const a=aiFor(f,0,difficulty),b=aiFor(f,1,difficulty);
    if(a.action)incr(record.stats[0].requested,a.action);
    if(b.action)incr(record.stats[1].requested,b.action);
    f.step(a,b);frameChecks++;
    validateFighter(f.left,record);validateFighter(f.right,record);
    if(!phases.has(f.phase)||f.round<previousRound||f.round>previousRound+1)
      record.fail('invalid phase or round transition',{previousRound,round:f.round,previousPhase,phase:f.phase});
    if(!Number.isFinite(f.time)||f.time<0||f.time>3600)record.fail('invalid clock',f.time);
    if(f.phase!=='fight'&&f.projectiles.length)record.fail('projectiles survive round transition',f.projectiles.length);
    const owners=new Set();
    for(const p of f.projectiles){
      if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.distance)||
         p.spent||p.life<=0||p.distance>=p.maxDistance||p.owner.hp<=0||
         (p.owner!==f.left&&p.owner!==f.right)||owners.has(p.owner))
        record.fail('invalid live projectile',{id:p.id,x:p.x,y:p.y,distance:p.distance,life:p.life,spent:p.spent});
      owners.add(p.owner);
    }
    if(f.round!==previousRound)record.lastDamageFrame=f.frame;
    if(fighting&&f.phase==='fight')record.longestNoDamage=Math.max(record.longestNoDamage,f.frame-record.lastDamageFrame);
    previousRound=f.round;previousPhase=f.phase;
    if(record.violations.some(v=>v.kind==='nonfinite fighter state'))break;
  }
  const complete=f.phase==='complete';
  if(!complete)record.fail('match did not complete within 60000 calls',{round:f.round,wins:f.wins,time:f.time,phase:f.phase});
  if(complete){
    if(f.wins[f.winner]!==2||!record.events.some(e=>e.type==='match-end'))record.fail('invalid match completion',{winner:f.winner,wins:f.wins});
    const frozen=JSON.stringify({frame:f.frame,hp:[f.left.hp,f.right.hp],time:f.time,wins:f.wins,projectiles:f.projectiles});
    f.step({action:'signature'},{action:'heavy'});
    if(frozen!==JSON.stringify({frame:f.frame,hp:[f.left.hp,f.right.hp],time:f.time,wins:f.wins,projectiles:f.projectiles}))record.fail('completed match changed after step',{});
  }
  const stats=record.stats[targetSlot];
  const country=byCountry[target.id]||=( {id:target.id,country:target.country,style:target.style,matches:0,
    completed:0,wins:0,losses:0,steps:0,damageDealt:0,damageReceived:0,actions:{},hits:{},blocks:{},
    signatures:0,signatureHits:0,signatureProjectiles:0,signatureEligibleFrames:0,signatureReadyRangeFrames:0,
    normalHits:0,byDifficulty:{},bySlot:{},profiles:{},violations:0} );
  country.matches++;country.completed+=complete;country.wins+=complete&&f.winner===targetSlot;
  country.losses+=complete&&f.winner!==targetSlot;country.steps+=record.steps;
  country.damageDealt+=stats.damage;country.damageReceived+=record.stats[1-targetSlot].damage;
  for(const key of ['actions','hits','blocks'])for(const [action,n]of Object.entries(stats[key]))incr(country[key],action,n);
  country.signatures+=stats.actions.signature||0;country.signatureHits+=stats.signatureHits;
  country.signatureProjectiles+=stats.projectiles;country.normalHits+=stats.normalHits;
  country.signatureEligibleFrames+=stats.signatureEligibleFrames;country.signatureReadyRangeFrames+=stats.signatureReadyRangeFrames;
  country.violations+=record.violations.length;
  incr(country.byDifficulty,difficulty);incr(country.bySlot,String(targetSlot));incr(country.profiles,profile);
  totals.matches++;totals.completed+=complete;totals.unfinished+=!complete;totals.steps+=record.steps;
  totals.combatFrames+=f.frame;incr(totals.profiles,profile);
  totals.maximumRound=Math.max(totals.maximumRound,f.round);
  totals.longestNoDamageFrames=Math.max(totals.longestNoDamageFrames,record.longestNoDamage);
  const result={target:target.id,country:target.country,targetSlot,opponent:opponent.id,opposingStyle:opponent.style,
    difficulty,seed,profile,completed:complete,winner:f.winner,wins:f.wins,round:f.round,
    steps:record.steps,frame:f.frame,reason:f.reason,stats:record.stats,rounds:record.events,
    longestNoDamageFrames:record.longestNoDamage,violations:record.violations};
  fs.writeSync(output,JSON.stringify(result)+'\n');
  current=null;
}
for(const [index,target]of targets.entries()){
  for(const style of styles){
    const opponent=ROSTER.find(c=>c.style===style&&c.id!==target.id);
    for(const difficulty of difficulties)for(const seed of seeds)for(const slot of [0,1])
      runMatch(target,opponent,difficulty,seed,slot,'natural');
  }
  const rangedOpponent=ROSTER.find(c=>c.style==='Zoner'&&c.id!==target.id);
  for(const difficulty of difficulties)for(const slot of [0,1])
    runMatch(target,rangedOpponent,difficulty,4821,slot,'ranged');
  if((index+1)%10===0||index===targets.length-1)
    console.log(JSON.stringify({countries:index+1,matches:totals.matches,completed:totals.completed,
      violations:violations.length,seconds:((Date.now()-started)/1000).toFixed(1)}));
}
fs.closeSync(output);
const countries=Object.values(byCountry);
const summary={generatedAt:new Date().toISOString(),elapsedSeconds:(Date.now()-started)/1000,
  command:'node tools/audit-fighter-matches.cjs'+(pilot?' --pilot':''),
  combatSourceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'browser/src/combat.js'))).digest('hex'),
  methodology:{rosterCount:ROSTER.length,authoredGeometryCountries:ROSTER.filter(c=>SPRITE_ART[c.id]).length,
    testedCountries:targets.length,opposingStyles:styles,difficulties,seeds,naturalOpeningDistance:2.6,
    rangedOpeningDistance:4.4,rangedSeed:4821,rangedOpponentStyle:'Zoner',defaultRoundSeconds:60,
    introFrames:2,intermissionFrames:2,aiBothSlots:true,facadeVerificationDecisions:300,
    maxCallsPerMatch:60000,frameChecks,resultsAreNotBalanceProof:true},totals,
  coverage:{countriesWithNormalHits:countries.filter(c=>c.normalHits>0).length,
    countriesWithSignatureStarts:countries.filter(c=>c.signatures>0).length,
    countriesWithSignatureLaunches:countries.filter(c=>c.signatureProjectiles>0).length,
    countriesWithSignatureHits:countries.filter(c=>c.signatureHits>0).length,
    noNormalHits:countries.filter(c=>!c.normalHits).map(c=>c.id),
    noSignatureStarts:countries.filter(c=>!c.signatures).map(c=>c.id),
    noSignatureHits:countries.filter(c=>!c.signatureHits).map(c=>c.id)},
  violations,countries,
  limitations:['Representative opponents are one country per style (a second country substitutes self matchups); this is not the exhaustive 196 × 196 matchup matrix.',
    'Both fighters use the production AI. No human reaction model, keyboard/touch, rendering, art decoding or audio behavior is established by this runner.',
    'The ranged profile changes round opening positions to ±2.2 and otherwise uses the live engine and production AI.',
    'Win counts are deterministic simulation observations, not proven balance ratings.',
    'Round intro/intermission are shortened to two ticks; round clock stays at the production default 60 seconds.']};
fs.writeFileSync(path.join(resultDir,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({elapsedSeconds:summary.elapsedSeconds,totals,coverage:summary.coverage,violations:violations.length}));
process.exitCode=violations.length?1:0;
