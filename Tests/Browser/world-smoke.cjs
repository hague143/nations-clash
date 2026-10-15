'use strict';

// Acceptance tests for the generated offline document. Real controls are tested
// in the live RAF loop; repeatable combat/render fixtures are labeled separately.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const crypto=require('node:crypto');
const http=require('node:http');

const ROOT=path.resolve(__dirname,'../..');
const OUT=process.env.NATIONCLASH_ARTIFACT_DIR||'/workspace/artifacts';
const EXPECTED_CODES=(`af al dz ad ao ag ar am au at az bs bh bd bb by be bz bj bt bo ba bw br bn bg bf bi cv kh cm ca cf td cl cn co km cg cd cr ci hr cu cy cz dk dj dm do ec eg sv gq er ee sz et fj fi fr ga gm ge de gh gr gd gt gn gw gy ht hn hu is in id ir iq ie il it jm jp jo kz ke ki kp kr kw kg la lv lb ls lr ly li lt lu mg mw my mv ml mt mh mr mu mx fm md mc mn me ma mz mm na nr np nl nz ni ne ng mk no om pk pw pa pg py pe ph pl pt qa ro ru rw kn lc vc ws sm st sa sn rs sc sl sg sk si sb so za ss es lk sd sr se ch sy tj tz th tl tg to tt tn tr tm tv ug ua ae gb us uy uz vu ve vn ye zm zw ps va tw`).split(/\s+/).sort();
assert.equal(EXPECTED_CODES.length,196,'acceptance country list itself must contain 196 entries');

const report={startedAt:new Date().toISOString(),document:null,checks:[],screenshots:[],errors:[],externalRequests:[]};
let browser,server,siteURL;
const check=(name,details={})=>{report.checks.push({name,status:'passed',...details});console.log(`PASS ${name}`);};
const snapshot=async(page,name)=>{
 const file=path.join(OUT,`NationClash-World-${name}.png`);
 await page.screenshot({path:file,fullPage:true});report.screenshots.push(file);
};
function watch(page,label){
 page.on('pageerror',e=>report.errors.push(`${label}: ${e.message}`));
 page.on('console',m=>{if(m.type()==='error')report.errors.push(`${label}: ${m.text()}`);});
 page.on('request',request=>{if(/^https?:/i.test(request.url())&&!request.url().startsWith(siteURL))report.externalRequests.push(request.url());});
 page.route(/^https?:\/\//,route=>route.request().url().startsWith(siteURL)?route.continue():route.abort());
}
const emptySearch=async(page)=>{await page.locator('#country-search').fill('');await page.selectOption('#region-filter','All');};
const choose=async(page,id,side=0)=>{
 await page.locator(side?'#pick-opponent':'#pick-player').click();
 const fighter=await page.evaluate(id=>NationClash.catalog.find(c=>c.id===id),id);
 assert.ok(fighter,`country ${id} exists`);
 await page.selectOption('#region-filter','All');
 await page.locator('#country-search').fill(fighter.country);
 const index=await page.evaluate(id=>NationClash.catalog.findIndex(c=>c.id===id),id);
 await page.locator(`[data-fighter="${index}"]`).click();
 assert.equal(await page.locator(side?'#selected-right':'#selected-left').textContent(),fighter.country);
};
const waitFight=page=>page.waitForFunction(()=>NationClash.fight?.phase==='fight');
async function fixture(page,{left='pk',right='jp',facing=1,distance=1,paused=false}={}){
 if(paused&&!await page.evaluate(()=>NationClash.paused))await page.locator('#pause').click();
 await page.evaluate(async({left,right,facing,distance})=>{
  await NationCountrySprites.ensure([left,right],NationClash.assets);
  const f=NationClash.fight;
  f.left.data=NationClash.catalog.find(c=>c.id===left);f.right.data=NationClash.catalog.find(c=>c.id===right);
  f.resetRound();f.phase='fight';f.left.x=0;f.right.x=facing*distance;f.left.facing=facing;f.right.facing=-facing;
  document.getElementById('mode').value='local';
 },{left,right,facing,distance});
}

async function rosterAcceptance(page){
 const inventory=await page.evaluate(()=>({
  catalog:NationClash.catalog.map(c=>({id:c.id,country:c.country,name:c.name,region:c.region,appearance:c.look||c.appearance})),
  flagIds:Object.keys(NationRoster.FLAG_SVGS).sort(),
  flags:Object.entries(NationClash.assets.flags).map(([id,image])=>({id,w:image.naturalWidth,h:image.naturalHeight,complete:image.complete})),
  supplied:Object.entries(NationClash.assets).filter(([key])=>/pakistan|japan/i.test(key)).map(([key,value])=>({key,w:value?.naturalWidth,h:value?.naturalHeight}))
 }));
 assert.deepEqual(inventory.catalog.map(c=>c.id).sort(),EXPECTED_CODES,'exact agreed countries, no missing/substitute country');
 assert.deepEqual(inventory.flagIds,EXPECTED_CODES,'every country has an inline SVG flag');
 assert.deepEqual(inventory.flags.map(x=>x.id).sort(),EXPECTED_CODES,'every cached flag was decoded');
 assert.ok(inventory.flags.every(x=>x.complete&&x.w>0&&x.h>0),'all cached flag images decode successfully');
 assert.equal(new Set(inventory.catalog.map(c=>c.name)).size,196,'individual fighter names');
 assert.ok(inventory.supplied.some(x=>/pakistan/i.test(x.key)&&x.w>0),'supplied Pakistan art decoded');
 assert.ok(inventory.supplied.some(x=>/japan/i.test(x.key)&&x.w>0),'supplied Japan art decoded');
 // Individual appearance parameters are checked in addition to flag identity.
 const procedural=inventory.catalog.filter(c=>c.id!=='pk'&&c.id!=='jp');
 assert.ok(procedural.every(c=>c.appearance&&typeof c.appearance==='object'),'procedural fighters carry appearance parameters');
 assert.equal(new Set(procedural.map(c=>JSON.stringify(c.appearance))).size,194,'194 individual appearance profiles');
 check('196 canonical countries, decoded flags, individual looks and supplied art',{countries:196});

 await emptySearch(page);
 assert.equal(await page.locator('.card').count(),24,'portrait pagination renders only 24 fighters at a time');
 await snapshot(page,'roster-desktop');
 const first=await page.locator('.card').first().getAttribute('data-fighter');
 await page.locator('#next-page').click();
 assert.notEqual(await page.locator('.card').first().getAttribute('data-fighter'),first,'next page changes fighters');
 await page.locator('#prev-page').click();assert.equal(await page.locator('.card').first().getAttribute('data-fighter'),first);
 await page.locator('#country-search').fill('definitely-not-a-country');assert.equal(await page.locator('.card').count(),0);
 await page.locator('#country-search').fill('jApAn');assert.equal(await page.locator('.card').count(),1,'case-insensitive search');
 await page.locator('#country-search').fill('');
 const europe=await page.locator('#region-filter option').evaluateAll(options=>options.find(o=>/europe/i.test(o.textContent))?.value);
 assert.ok(europe,'Europe region filter is present');await page.selectOption('#region-filter',europe);
 const visible=await page.locator('.card').evaluateAll(cards=>cards.map(c=>Number(c.dataset.fighter)));
 assert.ok(visible.length>0,'region filter yields fighters');
 assert.ok(visible.every(i=>/europe/i.test(inventory.catalog[i].region)),'region filter excludes other regions');
 await emptySearch(page);

 // This walks the live country search and button handler, not direct selection state.
 for(const c of inventory.catalog){await choose(page,c.id);}
 await page.locator('#random-fighter').click();
 const randomCountry=await page.locator('#selected-left').textContent();
 assert.ok(inventory.catalog.some(c=>c.country===randomCountry),'random pick resolves to a roster country');
 await choose(page,'pk');await choose(page,'jp',1);await emptySearch(page);
 await page.selectOption('#mode','local');assert.equal(await page.locator('#difficulty').isDisabled(),true,'difficulty disabled for local play');
 await page.selectOption('#mode','ai');assert.equal(await page.locator('#difficulty').isDisabled(),false,'difficulty enabled for computer play');
 check('live search, regions, pagination, random pick and every country card',{countrySelections:196});
}

async function flagOrientation(page){
 const result=await page.evaluate(()=>{
  const samples=['pk','jp','us','br','sa','gb','in','kr','za','np','va','tw'];
  const preview=document.createElement('canvas');preview.width=660;preview.height=samples.length*104+38;
  const previewCtx=preview.getContext('2d');previewCtx.fillStyle='#101923';previewCtx.fillRect(0,0,preview.width,preview.height);
  previewCtx.fillStyle='#e1edf3';previewCtx.font='bold 17px sans-serif';previewCtx.fillText('Costume emblems: facing right / facing left',18,25);
  const digest=[];
  for(const [row,id] of samples.entries()){
   const a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=180;a.height=b.height=140;
   for(const [canvas,facing]of [[a,1],[b,-1]]){
    const ctx=canvas.getContext('2d');ctx.translate(90,70);ctx.scale(facing,1);
    // The local bounds also change side: after the actor transform, both panels
    // occupy the same world-space rectangle. The production flag helper must
    // cancel only the actor's horizontal reflection within that rectangle.
    NationFighters.drawFlagCloth(ctx,id,{x:facing===1?-65:-65,y:-45,w:130,h:90},NationClash.assets,{facing,clip:null});
   }
   const aa=a.getContext('2d').getImageData(0,0,180,140).data,bb=b.getContext('2d').getImageData(0,0,180,140).data;
   let different=0,nonempty=0;for(let i=0;i<aa.length;i++){if(aa[i]!==bb[i])different++;if(i%4===3&&aa[i])nonempty++;}
   digest.push({id,different,nonempty});
   previewCtx.fillStyle='#e1edf3';previewCtx.font='bold 14px sans-serif';previewCtx.fillText(id.toUpperCase(),20,100+row*104);
   previewCtx.drawImage(a,0,0,180,140,90,35+row*104,240,100);previewCtx.drawImage(b,0,0,180,140,350,35+row*104,240,100);
  }return {rows:digest,preview:preview.toDataURL('image/png')};
 });
 for(const row of result.rows){assert.ok(row.nonempty>2000,`${row.id}: flag pixels drawn`);assert.equal(row.different,0,`${row.id}: flag reads the same facing left and right`);}
 const previewPath=path.join(OUT,'NationClash-World-flag-orientation.png');fs.writeFileSync(previewPath,Buffer.from(result.preview.split(',')[1],'base64'));report.screenshots.push(previewPath);
 check('fallback fighter flag drawing preserves emblem orientation',{sampleCountries:result.rows.map(x=>x.id)});
}

async function renderedRosterAcceptance(page){
 const rendered=await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=360;canvas.height=400;
  const ctx=canvas.getContext('2d');
  const countries=[];for(const c of NationClash.catalog){
   await NationCountrySprites.ensure([c.id],NationClash.assets);
   const f=new NationCombat.Fight(c,NationClash.catalog[0],{intro:0}).left;f.x=0;f.facing=1;
   ctx.clearRect(0,0,360,400);
   const result=NationClash.renderFighter(ctx,f,{time:0,frame:0,floor:355,pixelsPerUnit:78,originX:180});
   const image=ctx.getImageData(0,0,360,400).data;let pixels=0;
   for(let i=3;i<image.length;i+=4)if(image[i]>0)pixels++;
   countries.push({id:c.id,pixels,image:canvas.toDataURL('image/png'),diagnostic:result?.diagnostic});
  }
  const heroes=['pk','jp'];
  const seen=new Set();for(const c of NationClash.catalog)if(!seen.has(c.style)){heroes.push(c.id);seen.add(c.style);}
  const poses=[];
  for(const id of [...new Set(heroes)])for(const facing of [1,-1])for(const action of ['light','heavy','special','break','throw','ultimate']){
   await NationCountrySprites.ensure([id],NationClash.assets);
   const c=NationClash.catalog.find(c=>c.id===id),fight=new NationCombat.Fight(c,NationClash.catalog[0],{intro:0}),f=fight.left;
   f.x=0;f.facing=facing;f.meter=100;fight.start(f,{action});f.moveFrame=f.move.start;
   ctx.clearRect(0,0,360,400);
   NationClash.renderFighter(ctx,f,{time:0,frame:f.move.start,floor:355,pixelsPerUnit:78,originX:180});
   const image=ctx.getImageData(0,0,360,400).data;let pixels=0;
   for(let i=3;i<image.length;i+=4)if(image[i]>0)pixels++;
   const contact=NationCombat.contact(f);
   poses.push({id,facing,action,pixels,contact});
  }
  return {countries,poses};
 });
 assert.ok(rendered.countries.every(c=>c.pixels>3500),'every country fighter actually draws body pixels beyond its small floor shadow');
 const supplied=rendered.countries.filter(c=>c.diagnostic?.renderer==='supplied-country-art');
 assert.equal(supplied.length,196,'all 196 supplied images use the new renderer');
 const intake=JSON.parse(fs.readFileSync(path.join(ROOT,'artwork/country-fighters/intake.json'),'utf8'));
 const overrides=JSON.parse(fs.readFileSync(path.join(ROOT,'artwork/country-fighters/assignments.json'),'utf8')).overrides;
 for(const entry of intake.images){
  const sourceId=overrides[entry.id]?.sourceId||entry.id;
  const original=intake.images.find(e=>e.id===sourceId);
  assert.equal(supplied.find(c=>c.id===entry.id)?.diagnostic.source,original.originalName,'reviewed country-to-source assignment');
 }
 const unique=new Set(rendered.countries.map(c=>crypto.createHash('sha256').update(c.image).digest('hex')));
 assert.equal(unique.size,196,'every rendered fighter has a distinct appearance including its costume');
 assert.ok(rendered.poses.every(p=>p.pixels>3500),'shared rigs and every archetype render all six moves in both directions');
 assert.ok(rendered.poses.every(p=>Number.isFinite(p.contact.x)&&Number.isFinite(p.contact.y)),'all rendered attack contacts are finite');
 check('196 supplied country sprites, zero retained fighters and every archetype attack pose',{fighters:196,supplied:196,retained:0,poseFixtures:rendered.poses.length});
}

async function suppliedContactAcceptance(page){
 const result=await page.evaluate(async()=>{
  const failures=[],coverage=[],canvas=document.createElement('canvas');canvas.width=720;canvas.height=500;
  const ctx=canvas.getContext('2d',{willReadFrequently:true}),C=NationCombat,T=NationCountrySprites,assets=NationClash.assets;
  let fixtures=0;
  for(const data of NationClash.catalog.filter(c=>T.hasArt(c.id))){
   await T.ensure([data.id],assets);const used=new Set();
   for(const facing of [-1,1])for(const low of [false,true])for(const action of ['light','heavy','break','throw']){
    const fight=new C.Fight(data,NationClash.catalog[0],{intro:0}),f=fight.left;f.x=0;f.facing=facing;f.low=low;
    fight.start(f,{action,low});f.moveFrame=f.move.start;
    ctx.clearRect(0,0,720,500);
    const drawn=NationClash.renderFighter(ctx,f,{floor:440,originX:360,pixelsPerUnit:78,frame:30,time:0});
    const contact=C.contact(f);used.add(drawn.diagnostic.sourceIndex);
    if(Math.abs(drawn.strikeTip.x-contact.x)>1e-8||Math.abs(drawn.strikeTip.y-contact.y)>1e-8)failures.push(`${data.id}/${action}/${low}/${facing}: geometry mismatch`);
    const x=Math.round(360+contact.x*78),y=Math.round(440-contact.y*78);
    if(x<4||x>715||y<4||y>495)failures.push(`${data.id}: contact outside fixture`);
    else{
     const pixels=ctx.getImageData(x-3,y-3,7,7).data;let opaque=0;
     for(let i=3;i<pixels.length;i+=4)if(pixels[i]>100)opaque++;
     if(opaque<2)failures.push(`${data.id}/${action}/${low}/${facing}: no visible knuckle/toe at collision point`);
    }
    fixtures++;
   }
   for(const state of ['idle','walk','block','crouch','hit','ko','jump']){
    const f=new C.Fight(data,NationClash.catalog[0],{intro:0}).left;f.x=0;f.pose=state;
    if(state==='block')f.guard=true;if(state==='crouch')f.low=true;if(state==='hit')f.stun=8;if(state==='ko')f.hp=0;if(state==='jump')f.y=.4;
    ctx.clearRect(0,0,720,500);const drawn=NationClash.renderFighter(ctx,f,{floor:440,originX:360,pixelsPerUnit:78,frame:8,time:0});
    used.add(drawn.diagnostic.sourceIndex);
   }
   coverage.push({id:data.id,used:[...used].sort()});
   if(T.loadedIds.length>T.MAX_DECODED)failures.push('decoded atlas cache exceeded bound');
  }
  return {fixtures,failures,coverage,loadedIds:T.loadedIds};
 });
 assert.deepEqual(result.failures,[],'actual renderer must paint a visible strike at the actual collision point');
 assert.equal(result.fixtures,3136);
 const metadata=JSON.parse(fs.readFileSync(path.join(ROOT,'browser/assets/countries/metadata.json'),'utf8'));
 assert.ok(result.coverage.every(c=>c.used.length===metadata[c.id].poseRecords.length),'every available source pose participates, including all four Turkey poses');
 check('196 supplied fighters: 3136 visible melee contacts, both stances/facings, every supplied pose, bounded decoded cache',{fixtures:result.fixtures,countries:196,maxDecodedAtlases:6});
}

async function impactLayerAcceptance(page){
 const result=await page.evaluate(async()=>{
  const C=NationCombat,T=NationCountrySprites,assets=NationClash.assets,failures=[];let fixtures=0,legacyHidden=0;
  const canvases=Array.from({length:4},()=>{const c=document.createElement('canvas');c.width=720;c.height=500;return c;});
  const contexts=canvases.map(c=>c.getContext('2d',{willReadFrequently:true}));
  for(const data of NationClash.catalog){
   const enemy=NationClash.catalog.find(c=>c.id===(data.id==='jp'?'iq':'jp'));
   await T.ensure([data.id,enemy.id],assets);
   for(const facing of [-1,1])for(const low of [false,true])for(const action of ['light','heavy'])for(const slot of [0,1]){
    const f=new C.Fight(slot?enemy:data,slot?data:enemy,{intro:0});const actors=[f.left,f.right],a=actors[slot],d=actors[1-slot];
    a.x=0;a.facing=facing;f.start(a,{action,low});a.moveFrame=a.move.start;d.x=facing*Math.max(.75,Math.min(1.4,a.move.reach+.2));d.facing=-facing;
    const view={floor:440,originX:360,pixelsPerUnit:78,time:0,frame:20};
    contexts.forEach(ctx=>ctx.clearRect(0,0,720,500));
    NationClash.renderFighter(contexts[0],a,view);
    NationClash.renderFighters(contexts[1],actors,view);
    actors.forEach(actor=>NationClash.renderFighter(contexts[2],actor,view));
    NationClash.renderFighter(contexts[3],d,view);NationClash.renderFighter(contexts[3],a,view);
    const p=C.contact(a),x=Math.round(360+p.x*78),y=Math.round(440-p.y*78);
    const sample=contexts.map(ctx=>ctx.getImageData(x-3,y-3,7,7).data);
    let opaque=0,hidden=0;
    for(let n=0;n<sample[0].length;n+=4)if(sample[0][n+3]>100){
     opaque++;if([0,1,2,3].some(k=>sample[1][n+k]!==sample[3][n+k]))failures.push(`${data.id}/${facing}/${low}/${action}/${slot}: striking pixels hidden`);
     if([0,1,2,3].some(k=>sample[2][n+k]!==sample[3][n+k]))hidden++;
    }
    if(!opaque)failures.push(`${data.id}: no opaque strike pixels`);
    if(hidden)legacyHidden++;fixtures++;
   }
  }
  return {fixtures,legacyHidden,failures};
 });
 assert.deepEqual(result.failures,[],'the actual two-fighter painter composites contact pixels with the attacker in front');
 assert.equal(result.fixtures,3136);assert.ok(result.legacyHidden>0,'the previous fixed paint order demonstrably obscured contact pixels');
 check('196 fighters: striking hand/foot stays visible over defender in both player slots and facings',{fixtures:result.fixtures,previouslyObscuredFixtures:result.legacyHidden});
}

async function fourPoseAcceptance(page){
 const result=await page.evaluate(async()=>{
  await NationCountrySprites.ensure(['tr'],NationClash.assets);const data=NationClash.catalog.find(c=>c.id==='tr');
  const c=document.createElement('canvas');c.width=720;c.height=500;const ctx=c.getContext('2d',{willReadFrequently:true}),rows=[];
  for(const pose of ['crouch','ko']){
   const f=new NationCombat.Fight(data,NationClash.catalog[0],{intro:0}).left;f.x=0;f.low=pose==='crouch';if(pose==='ko'){f.hp=0;f.damagedAt=0;}
   ctx.clearRect(0,0,720,500);const result=NationClash.renderFighter(ctx,f,{floor:440,originX:360,pixelsPerUnit:78,time:0,frame:20});
   const pixels=ctx.getImageData(0,0,720,500).data;let minX=720,minY=500,maxX=0,maxY=0;
   for(let y=0;y<500;y++)for(let x=0;x<720;x++)if(pixels[(y*720+x)*4+3]>100){minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(y,minY);maxY=Math.max(y,maxY);}
   rows.push({pose,diagnostic:result.diagnostic,bounds:{width:maxX-minX+1,height:maxY-minY+1,bottom:maxY}});
  }return rows;
 });
 const ko=result.find(r=>r.pose==='ko'),crouch=result.find(r=>r.pose==='crouch');
 assert.equal(ko.diagnostic.adaptedKo,true);assert.ok(ko.bounds.width>ko.bounds.height,'KO rotates down instead of standing in an absent pose');assert.ok(ko.bounds.bottom<=442,'KO is grounded');
 assert.equal(crouch.diagnostic.adaptedCrouch,true);assert.ok(crouch.bounds.height<150,'crouch lowers the four-pose guard');
 check('four-pose Turkey sheet has grounded adapted crouch and KO',{states:result.map(r=>({pose:r.pose,bounds:r.bounds}))});
}

async function iraqKeyboardAcceptance(page){
 await page.locator('#back').click();await choose(page,'iq');await choose(page,'ir',1);
 await page.selectOption('#mode','local');await page.locator('#start').click();await waitFight(page);
 assert.equal(await page.locator('#left-name').textContent(),'Iraq');assert.equal(await page.locator('#right-name').textContent(),'Iran');
 await page.locator('#pause').click();
 let hits=0,whiffs=0;
 for(const facing of [-1,1])for(const low of [false,true])for(const key of ['j','k']){
  await fixture(page,{left:'iq',right:'ir',facing,distance:1});
  const hp=await page.evaluate(()=>NationClash.fight.right.hp);await page.locator('#resume').click();
  if(low)await page.keyboard.down('s');await page.keyboard.press(key);
  await page.waitForFunction(hp=>NationClash.fight.right.hp<hp,hp);if(low)await page.keyboard.up('s');
  assert.ok(await page.evaluate(()=>NationClash.fight.right.lastDamage>0&&NationClash.fight.effects.some(e=>e.damage>0)),'Iraq keyboard strike gives damage and impact feedback');
  if(facing===1&&!low&&key==='k')await snapshot(page,'iraq-kick-impact');
  await page.locator('#pause').click();hits++;
  await fixture(page,{left:'iq',right:'ir',facing,distance:4});await page.locator('#resume').click();
  if(low)await page.keyboard.down('s');await page.keyboard.press(key);await page.waitForFunction(()=>NationClash.fight.message.includes('MISSED'));if(low)await page.keyboard.up('s');
  assert.equal(await page.evaluate(()=>NationClash.fight.right.hp),await page.evaluate(()=>NationClash.fight.right.data.hp));await page.locator('#pause').click();whiffs++;
 }
 await page.locator('#back').click();await choose(page,'pk');await choose(page,'jp',1);
 await page.locator('#start').click();await waitFight(page);await page.locator('#pause').click();
 check('Iraq versus Iran: real keyboard punch/kick hits and genuine whiffs, both stances and directions',{hits,whiffs});
}

async function actualControls(page){
 await page.selectOption('#mode','local');await page.locator('#start').click();await waitFight(page);
 const x=await page.evaluate(()=>NationClash.fight.left.x);
 await page.keyboard.down('d');await page.waitForFunction(x=>NationClash.fight.left.x>x+.22,x);await page.keyboard.up('d');
 assert.ok(await page.evaluate(x=>NationClash.fight.left.x>x+.2,x),'keyboard adapter moves fighter');
 // Position only is controlled; input, frame advancement, collisions and HUD are live.
 await fixture(page,{distance:1.1});
 const hp=await page.evaluate(()=>NationClash.fight.right.hp);
 await page.keyboard.press('j');await page.waitForFunction(hp=>NationClash.fight.right.hp<hp,hp);
 const impact=await page.evaluate(()=>({damage:NationClash.fight.right.lastDamage,stun:NationClash.fight.right.stun,recoil:NationClash.fight.right.recoil,effect:NationClash.fight.effects.some(e=>e.damage>0),hp:NationClash.fight.right.hp}));
 assert.ok(impact.damage>0&&impact.stun>0&&impact.recoil>0&&impact.effect,'actual attack causes damage, recoil, reaction and hit effect');
 assert.match(await page.locator('#right-hp').textContent(),new RegExp(`^${impact.hp} /`),'HUD reflects actual damage');
 await snapshot(page,'pakistan-impact');
 await fixture(page,{distance:1.1});await page.keyboard.down('ControlRight');await page.keyboard.press('j');
 await page.waitForFunction(()=>NationClash.fight.message.startsWith('BLOCKED'));await page.keyboard.up('ControlRight');
 assert.equal(await page.evaluate(()=>NationClash.fight.right.hp),await page.evaluate(()=>NationClash.fight.right.data.hp),'live guarded strike has zero HP damage');
 await fixture(page,{distance:1.1,facing:-1});await page.keyboard.press('k');
 await page.waitForFunction(()=>NationClash.fight.right.hp<NationClash.fight.right.data.hp);
 assert.ok(await page.evaluate(()=>NationClash.fight.right.y>0),'mirrored heavy attack launches');
 await snapshot(page,'mirrored-kick');
 await fixture(page,{distance:4});await page.keyboard.press('j');
 await page.waitForFunction(()=>NationClash.fight.message.includes('MISSED'));
 assert.equal(await page.evaluate(()=>NationClash.fight.right.hp),await page.evaluate(()=>NationClash.fight.right.data.hp),'out-of-range strike misses');
 await fixture(page,{distance:1.1});await page.keyboard.press('w');await page.waitForFunction(()=>NationClash.fight.left.y>0);
 await page.locator('#pause').click();const frozen=await page.evaluate(()=>({frame:NationClash.fight.frame,time:NationClash.fight.time}));
 await page.waitForTimeout(180);assert.deepEqual(await page.evaluate(()=>({frame:NationClash.fight.frame,time:NationClash.fight.time})),frozen,'pause freezes actual simulation');
 await page.locator('#resume').click();assert.equal(await page.evaluate(()=>NationClash.paused),false);await page.locator('#pause').click();
 check('real keyboard movement, punch, guard, mirrored kick, whiff, jump and pause');
}

async function roundsAcceptance(page){
 await fixture(page,{distance:1.1});
 await page.evaluate(()=>{NationClash.fight.wins=[0,0];NationClash.fight.round=1;NationClash.fight.right.hp=1;});
 await page.locator('#resume').click();await page.keyboard.press('j');
 await page.waitForFunction(()=>NationClash.fight.phase==='intermission');
 assert.deepEqual(await page.evaluate(()=>NationClash.fight.wins),[1,0],'first real KO awards one round');
 await waitFight(page);
 assert.equal(await page.evaluate(()=>NationClash.fight.round),2,'round manager starts second round');
 assert.equal(await page.evaluate(()=>NationClash.fight.right.hp),await page.evaluate(()=>NationClash.fight.right.data.hp),'new round restores HP');
 await page.evaluate(()=>{const f=NationClash.fight;f.left.x=0;f.right.x=1.1;f.right.hp=1;});
 await page.keyboard.press('j');await page.waitForFunction(()=>NationClash.fight.phase==='complete');
 assert.deepEqual(await page.evaluate(()=>NationClash.fight.wins),[2,0],'first to two ends match');
 await page.waitForSelector('#overlay:not(.hidden)');assert.match(await page.locator('#result-title').textContent(),/Pakistan wins/i);
 await snapshot(page,'match-result');await page.locator('#rematch').click();
 await page.waitForFunction(()=>NationClash.fight?.phase!=='complete'&&NationClash.fight?.wins.every(w=>w===0));
 assert.deepEqual(await page.evaluate(()=>NationClash.fight.wins),[0,0],'rematch starts fresh score');
 await page.locator('#pause').click();check('actual knockout rounds, first-to-two result and rematch reset');
}

async function arenaAcceptance(page){
 await page.locator('#back').click();
 const arenas=await page.locator('#arena-select option').evaluateAll(options=>options.map(o=>({id:o.value,name:NationArenas.ARENAS.find(a=>a.id===o.value)?.name,label:o.textContent})));
 assert.equal(arenas.length,10,'ten user-selectable arenas');assert.equal(new Set(arenas.map(a=>a.id)).size,10);
 assert.ok(arenas.some(a=>/minar.*pakistan/i.test(a.name)),'Minar-e-Pakistan selectable');
 assert.ok(arenas.some(a=>/times? square/i.test(a.name)),'Times Square selectable');
 const fixedScenes=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const ctx=canvas.getContext('2d');
  return NationArenas.ARENAS.map(a=>{ctx.clearRect(0,0,1280,720);NationArenas.drawScene(ctx,a.id,0);return canvas.toDataURL('image/png');});
 });
 const fixedHashes=fixedScenes.map(png=>crypto.createHash('sha256').update(png).digest('hex'));
 assert.equal(new Set(fixedHashes).size,10,'ten scenery backgrounds differ at the exact same animation time');
 const hashes=[];
 for(const arena of arenas){
  await page.selectOption('#arena-select',arena.id);
  const expectedDescription=await page.evaluate(id=>{const stage=NationArenas.ARENAS.find(a=>a.id===id);return stage.description||stage.city;},arena.id);
  assert.equal((await page.locator('#arena-description').textContent()).trim(),expectedDescription,'arena description matches the selected venue');
  await page.locator('#start').click();await waitFight(page);await page.locator('#pause').click();
  assert.equal(await page.evaluate(()=>NationClash.selectedArena),arena.id,'selected arena enters match');
  assert.match(await page.locator('#stage-name').textContent(),new RegExp(arena.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'));
  // Hide only the pause modal while the real simulation remains frozen so the
  // complete landmark can be reviewed. Restore it before exercising Back.
  await page.locator('#overlay').evaluate(el=>{el.style.visibility='hidden';});
  const png=await page.locator('#arena').screenshot();hashes.push(crypto.createHash('sha256').update(png).digest('hex'));
  await snapshot(page,`arena-${arena.id}`);await page.locator('#overlay').evaluate(el=>{el.style.visibility='';});await page.locator('#back').click();
 }
 assert.equal(new Set(hashes).size,10,'ten selected live matches render distinct scenes');
 check('ten selectable landmarks enter matches and render distinct scenes',{arenas:arenas.map(x=>x.name)});
}

async function audioAcceptance(page){
 await choose(page,'pk');await choose(page,'jp',1);
 const startCounts=await page.evaluate(()=>NationClash.audioReadiness.cueCounts);
 await page.locator('#start').click();
 // Sound must be enabled/unlocked by a real user gesture, not autoplay assumptions.
 if(await page.locator('#sound').getAttribute('aria-pressed')!=='true')await page.locator('#sound').click();
 await page.waitForFunction(()=>NationClash.audioReadiness?.contextState==='running');
 await waitFight(page);
 let state=await page.evaluate(()=>NationClash.audioReadiness);
 assert.ok(state.enabled&&state.musicRunning,'enabled audio schedules background music');
 assert.deepEqual([...state.decodedCues].sort(),['fight','getready','ko','timeover'],'all four bundled announcer cues decode');
 assert.equal(state.cueCounts.fight,startCounts.fight+1,'this match plays FIGHT once');
 assert.equal(state.cueCounts.getready,startCounts.getready+1,'this match plays GET READY once');
 const before={...state.impactCounts};await fixture(page,{distance:1.1});await page.keyboard.press('j');
 await page.waitForFunction(()=>NationClash.fight.right.hp<NationClash.fight.right.data.hp);
 state=await page.evaluate(()=>NationClash.audioReadiness);assert.ok(state.impactCounts.punch>(before.punch||0),'actual punch emits punch sound');
 await fixture(page,{distance:1.1});await page.keyboard.press('k');await page.waitForFunction(()=>NationClash.fight.right.hp<NationClash.fight.right.data.hp);
 state=await page.evaluate(()=>NationClash.audioReadiness);assert.ok(state.impactCounts.kick>(before.kick||0),'actual kick emits kick sound');
 await page.locator('#pause').click();state=await page.evaluate(()=>NationClash.audioReadiness);
 assert.equal(state.musicRunning,false,'pause stops music scheduler');assert.equal(state.activeVoices,0,'pause cancels scheduled/live voices');
 const pausedCounts={...state.cueCounts};await page.waitForTimeout(200);assert.deepEqual(await page.evaluate(()=>NationClash.audioReadiness.cueCounts),pausedCounts,'paused frames repeat no cues');
 await page.locator('#resume').click();await page.waitForFunction(()=>NationClash.audioReadiness.musicRunning);
 assert.equal(await page.evaluate(()=>NationClash.audioReadiness.cueCounts.fight),pausedCounts.fight,'resume does not repeat FIGHT');
 // Drive real phase detection with a fixture KO; cue must fire once per ended round.
 const ko=await page.evaluate(()=>NationClash.audioReadiness.cueCounts.ko||0);await page.evaluate(()=>{NationClash.fight.right.hp=0;});
 await page.waitForFunction(()=>NationClash.fight.phase==='intermission');
 await page.waitForFunction(ko=>NationClash.audioReadiness.cueCounts.ko===ko+1,ko);
 await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>NationClash.audioReadiness.cueCounts.ko),ko+1,'KO cue is deduplicated');
 await page.locator('#volume').focus();await page.locator('#volume').press('Home');
 state=await page.evaluate(()=>NationClash.audioReadiness);assert.equal(state.volume,0,'volume slider affects master gain');
 await page.locator('#volume').evaluate(el=>{el.value='65';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await page.evaluate(()=>NationClash.audioReadiness.volume),.65);
 await page.locator('#sound').click();state=await page.evaluate(()=>NationClash.audioReadiness);
 assert.equal(state.enabled,false);assert.equal(state.musicRunning,false);assert.equal(state.activeVoices,0,'mute cancels audio voices');
 await page.locator('#pause').click();await page.locator('#back').click();
 assert.equal(await page.evaluate(()=>NationClash.audioReadiness.musicRunning),false,'return to selection leaves music stopped');
 check('bundled start/KO audio, background music, punch/kick sounds, volume, mute, pause and deduplication');
}

async function mobileAcceptance(html){
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});watch(page,'mobile');
 await page.goto(siteURL);await page.waitForFunction(()=>NationClash.assetsReady);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile selection has no horizontal overflow');
 await snapshot(page,'mobile-roster');await choose(page,'pk');await choose(page,'jp',1);await page.selectOption('#mode','local');
 await page.locator('#start').tap();await waitFight(page);await fixture(page,{distance:1.1});
 await page.locator('[data-action="light"]').tap();await page.waitForFunction(()=>NationClash.fight.right.hp<NationClash.fight.right.data.hp);
 await fixture(page,{distance:1.1});await page.locator('[data-action="jump"]').tap();await page.waitForFunction(()=>NationClash.fight.left.y>0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile arena has no horizontal overflow');
 const sizes=await page.locator('.touch button').evaluateAll(buttons=>buttons.map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height})));
 assert.ok(sizes.every(x=>x.w>=44&&x.h>=44),'touch controls have at least 44px targets');
 await snapshot(page,'mobile-fight');await page.close();check('390px mobile touch attack/jump, target sizes and layout');

 const landscape=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});watch(landscape,'mobile-landscape');
 await landscape.goto(siteURL);await landscape.waitForFunction(()=>NationClash.assetsReady);
 assert.equal(await landscape.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'landscape selection has no horizontal overflow');
 await choose(landscape,'pk');await choose(landscape,'jp',1);await landscape.selectOption('#mode','local');
 await landscape.locator('#start').tap();await waitFight(landscape);
 await landscape.waitForFunction(()=>window.scrollY<1);
 const layout=await landscape.evaluate(()=>{
  const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  return {width:innerWidth,height:innerHeight,arena:rect('.arena-wrap'),touch:rect('.touch'),controls:[...document.querySelectorAll('.touch button')].map(button=>{
   const r=button.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
  })};
 });
 const fits=rect=>rect.left>=-.5&&rect.top>=-.5&&rect.right<=layout.width+.5&&rect.bottom<=layout.height+.5;
 assert.ok(fits(layout.arena),'landscape arena remains fully in viewport');
 assert.ok(fits(layout.touch)&&layout.controls.every(fits),'all landscape touch controls remain fully in viewport without scrolling');
 assert.ok(layout.touch.left>=layout.arena.right,'landscape touch controls sit beside the arena');
 assert.ok(layout.controls.every(r=>r.width>=44&&r.height>=44),'landscape controls preserve 44px touch targets');
 assert.equal(await landscape.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'landscape arena has no horizontal overflow');
 await fixture(landscape,{distance:1.1});await landscape.locator('[data-action="light"]').tap();
 await landscape.waitForFunction(()=>NationClash.fight.right.hp<NationClash.fight.right.data.hp);
 await fixture(landscape,{distance:1.1});await landscape.locator('[data-action="jump"]').tap();
 await landscape.waitForFunction(()=>NationClash.fight.left.y>0);
 await snapshot(landscape,'mobile-landscape-fight');await landscape.close();
 check('844×390 landscape touch attack/jump, side controls, viewport fit and target sizes');
}

async function computerAcceptance(page){
 await choose(page,'jp');await choose(page,'pk',1);await page.selectOption('#mode','ai');await page.selectOption('#difficulty','hard');
 await page.locator('#start').click();await waitFight(page);
 const leftHP=await page.evaluate(()=>NationClash.fight.left.hp),rightX=await page.evaluate(()=>NationClash.fight.right.x);
 await page.waitForFunction(x=>Math.abs(NationClash.fight.right.x-x)>.1,rightX);
 await page.waitForFunction(hp=>NationClash.fight.left.hp<hp,leftHP,{timeout:15000});
 assert.ok(await page.evaluate(()=>NationClash.fight.left.lastDamage>0),'computer opponent damages player through production AI adapter');
 assert.match(await page.locator('#match-mode').textContent(),/COMPUTER/i);
 await snapshot(page,'computer-match');await page.locator('#pause').click();await page.locator('#back').click();
 check('computer mode movement and combat through live AI adapter');
}

(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const documentPath=process.env.NATIONCLASH_HTML||path.join(ROOT,'browser/index.html');
 const html=fs.readFileSync(documentPath,'utf8');report.document={path:documentPath,bytes:Buffer.byteLength(html),sha256:crypto.createHash('sha256').update(html).digest('hex')};
 const filesRoot=path.dirname(documentPath);
 server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),asset=url.pathname.match(/^\/country-art\/([a-z]{2})\.js$/);
  if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);}
  else if(asset){const file=path.join(filesRoot,'country-art',asset[1]+'.js');if(!fs.existsSync(file)){res.writeHead(404);res.end('Missing country asset');return;}res.writeHead(200,{'Content-Type':'text/javascript'});fs.createReadStream(file).pipe(res);}
  else if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();}
  else{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));siteURL='http://127.0.0.1:'+server.address().port+'/';
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--autoplay-policy=user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1440,height:1050}});watch(page,'desktop');
 await page.goto(siteURL,{timeout:60000});await page.waitForFunction(()=>NationClash.assetsReady,{},{timeout:60000});
 await rosterAcceptance(page);await renderedRosterAcceptance(page);await suppliedContactAcceptance(page);await impactLayerAcceptance(page);await fourPoseAcceptance(page);await flagOrientation(page);await actualControls(page);await roundsAcceptance(page);await iraqKeyboardAcceptance(page);await arenaAcceptance(page);await audioAcceptance(page);await computerAcceptance(page);await mobileAcceptance(html);
 assert.deepEqual(report.errors,[],'no browser runtime or console errors');assert.deepEqual(report.externalRequests,[],'offline document makes no external requests');
 check('zero runtime errors and zero external network requests');
 report.status='passed';report.finishedAt=new Date().toISOString();
 fs.writeFileSync(path.join(OUT,'NationClash-World-acceptance.json'),JSON.stringify(report,null,2));
 console.log(`World browser acceptance passed: ${report.checks.length} groups.`);
})().catch(error=>{
 report.status='failed';report.failure={message:error.message,stack:error.stack};report.finishedAt=new Date().toISOString();
 fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'NationClash-World-acceptance.json'),JSON.stringify(report,null,2));
 console.error(error);process.exitCode=1;
}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
