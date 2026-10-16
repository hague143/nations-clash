'use strict';
const {Fight}=require('../browser3d/src/combat.js'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const results=[];let steps=0;
for(const left of ['pk','jp'])for(const difficulty of ['easy','normal','hard'])for(let seed=1;seed<=16;seed++){
 const f=new Fight(left,left==='pk'?'jp':'pk',{intro:0,mode:'ai',difficulty,seconds:45});f.seed=seed*8753;let i=0;
 for(;i<24000&&f.phase!=='complete';i++){
  f.step(f.ai(0),f.ai(1));steps++;
  for(const a of [f.left,f.right]){assert.ok([a.x,a.y,a.hp,a.meter,a.signatureCooldown].every(Number.isFinite));assert.ok(a.x>=-4.4&&a.x<=4.4&&a.y>=0&&a.hp>=0&&a.hp<=1000);}
 }
 assert.equal(f.phase,'complete',left+'/'+difficulty+'/'+seed+' completes');assert.ok(f.wins.some(n=>n===2));results.push({left,difficulty,seed,winner:f.winner,wins:f.wins,frames:i});
}
const out=process.env.NATIONCLASH_3D_AUDIT_OUT||'artifacts/prototype3d/ai-audit.json';fs.mkdirSync(require('node:path').dirname(out),{recursive:true});const report={status:'passed',matches:results.length,completed:results.length,stepChecks:steps,combatSha256:crypto.createHash('sha256').update(fs.readFileSync('browser3d/src/combat.js')).digest('hex'),results};fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log('Passed '+results.length+' complete AI matches; '+steps+' finite-state step checks.');
