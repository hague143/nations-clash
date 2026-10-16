'use strict';
// Landing acceptance runs against the built source page or the exact extracted
// offline HTML. It checks the real supplied sprite renderer and combat specs;
// previews must never run the match simulation or change fighter selections.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../..');
const OUT=path.resolve(process.env.NATIONCLASH_ARTIFACT_DIR||'artifacts/neon-landing/browser');
const file=path.resolve(process.env.NATIONCLASH_HTML||'browser/index.html'),html=fs.readFileSync(file),filesRoot=path.dirname(file);
const report={startedAt:new Date().toISOString(),document:{path:file,bytes:html.length,sha256:crypto.createHash('sha256').update(html).digest('hex')},checks:[],errors:[],externalRequests:[],screenshots:[]};
let browser,server,url;
function check(name,details={}){report.checks.push({name,status:'passed',...details});console.log('PASS '+name);}
function watch(page){page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(url))report.externalRequests.push(r.url());});}
async function shot(page,name){const p=path.join(OUT,name+'.png');await page.screenshot({path:p,fullPage:true});report.screenshots.push(p);}
async function ready(page){await page.goto(url);await page.waitForFunction(()=>window.NationClash?.assetsReady&&window.NationFighterPreview?.show);}
async function stopped(page){await page.waitForFunction(()=>!NationFighterPreview.debug.playing&&!document.querySelector('.preview-active'));}
async function eventAudit(page){await page.evaluate(()=>{window.__previewEvents={};for(const name of ['nation-round','nation-move','nation-hit','nation-projectile']){window.__previewEvents[name]=0;addEventListener(name,()=>window.__previewEvents[name]++);}});}
async function hoverAndFocus(page){
 await eventAudit(page);
 const before=await page.evaluate(()=>NationClash.selectedIds),card=page.locator('#roster .card').first();
 const id=await card.evaluate(e=>NationClash.catalog[Number(e.dataset.fighter)].id);
 await card.hover();await page.waitForFunction(id=>{const d=NationFighterPreview.debug;return d.ready&&d.playing&&d.countryId===id;},id);
 // Observe a real, unmodified hover cycle before seeking exact active frames.
 await page.waitForFunction(()=>{const d=NationFighterPreview.debug,c=NationClash.catalog.find(c=>c.id===d.countryId);if(!c)return false;const s=NationCombat.getMoveSpec(c,d.action);if(s&&d.pose===s.visualPose){window.__hoverActions=window.__hoverActions||{};window.__hoverActions[d.action]=true;}return ['light','heavy','signature'].every(a=>window.__hoverActions?.[a]);},null,{timeout:20000});
 const d=await page.evaluate(()=>({...NationFighterPreview.debug,events:window.__previewEvents,selectedIds:NationClash.selectedIds,canvasCount:document.querySelectorAll('.fighter-preview-canvas').length}));
 assert.equal(d.renderer,'supplied-country-art');assert.equal(d.canvasCount,1);assert.ok(d.pendingLoads<=1);assert.deepEqual(d.selectedIds,before);assert.ok(Object.values(d.events).every(n=>n===0),'preview does not dispatch match or combat sound events');
 await shot(page,'neon-landing-hover');
 await page.mouse.move(0,0);await stopped(page);
 await card.focus();await page.waitForFunction(id=>NationFighterPreview.debug.ready&&NationFighterPreview.debug.countryId===id&&NationFighterPreview.debug.playing,id);
 await page.locator('#country-search').focus();await stopped(page);
 check('real mouse hover and keyboard focus cycle punch, kick and country power without selecting a fighter or dispatching match events',{countryId:id,actions:['light','heavy','signature']});
}
async function allCountries(page){
 const result=await page.evaluate(async()=>{
  const host=document.createElement('div');host.className='hero-art';host.id='preview-audit-host';host.style.cssText='position:fixed;left:0;top:0;width:480px;height:360px;z-index:999';document.body.appendChild(host);
  const results=[];let canvas=null,reused=true,maxPending=0;
  try{
   for(const country of NationClash.catalog){
    await NationFighterPreview.show(country.id,host,{manual:true,action:'light'});
    for(const action of ['light','heavy','signature']){
     const spec=NationCombat.getMoveSpec(country,action),frame=spec.start+1;
     NationFighterPreview.seek(action,frame);
     const d=NationFighterPreview.debug,c=host.querySelector('.fighter-preview-canvas');
     if(canvas&&c!==canvas)reused=false;canvas=c;maxPending=Math.max(maxPending,d.pendingLoads||0);
     const ctx=c?.getContext('2d'),pixels=ctx?.getImageData(0,0,c.width,c.height).data;let painted=0;
     if(pixels)for(let i=3;i<pixels.length;i+=4)if(pixels[i])painted++;
     results.push({countryId:country.id,action,country:d.countryId,ready:d.ready,renderer:d.renderer,pose:d.pose,expectedPose:spec.visualPose,sourceIndex:d.sourceIndex,expectedIndex:NationCountrySprites.METADATA[country.id].frames[spec.visualPose].sourceIndex,powerName:d.powerName,expectedPower:NationPowers.get(country.id).name,moveFrame:d.moveFrame,expectedFrame:frame,moveId:d.moveSpec?.id,projectile:d.projectile,powerKind:d.powerKind,expectedKind:NationPowers.get(country.id).kind,expectedProjectile:action==='signature'?{x:spec.reach+spec.projectileSpeed/60,y:spec.height,radius:spec.projectileRadius}:null,painted});
    }
   }
  }finally{NationFighterPreview.stop();host.remove();}
  return {results,reused,maxPending,selectedIds:NationClash.selectedIds,events:window.__previewEvents};
 });
 assert.equal(result.results.length,588);assert.equal(result.reused,true,'one reusable canvas is moved between preview hosts');assert.ok(result.maxPending<=1);
 for(const r of result.results){assert.equal(r.country,r.countryId,r.countryId+' correct country');assert.equal(r.ready,true);assert.equal(r.renderer,'supplied-country-art');assert.equal(r.pose,r.expectedPose,r.countryId+' '+r.action+' supplied pose');assert.equal(r.sourceIndex,r.expectedIndex,r.countryId+' '+r.action+' exact authored frame');assert.equal(r.moveFrame,r.expectedFrame);assert.equal(r.moveId,r.action);assert.equal(r.powerName,r.expectedPower);assert.equal(r.powerKind,r.expectedKind);if(r.action==='signature'){assert.equal(r.projectile?.powerId,r.countryId);assert.equal(r.projectile?.ownerId,r.countryId);for(const key of ['x','y','radius'])assert.ok(Math.abs(r.projectile[key]-r.expectedProjectile[key])<1e-9,r.countryId+' signature '+key);}else assert.equal(r.projectile,null);assert.ok(r.painted>1000,r.countryId+' '+r.action+' paints supplied fighter');}
 assert.ok(Object.values(result.events).every(n=>n===0),'all 588 preview fixtures remain outside game simulation and audio event stream');
 fs.writeFileSync(path.join(OUT,'all-country-preview-fixtures.json'),JSON.stringify(result,null,2)+'\n');
 check('all 196 fighters preview their exact authored punch, kick and signature frames from the real combat specifications',{countries:196,fixtures:result.results.length,reusedCanvas:result.reused,maxPendingLoads:result.maxPending});
}
async function signatureShots(page){
 for(const [name,selector]of [['hero','#hero-left'],['card','#roster .card:first-child']]){
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.evaluate(async selector=>{
   const element=document.querySelector(selector),id=element.dataset.countryId||NationClash.catalog[Number(element.dataset.fighter)].id,host=element.querySelector('.hero-art,.portrait');
   await NationFighterPreview.show(id,host,{manual:true,action:'signature'});NationFighterPreview.seek('signature',NationCombat.getMoveSpec(NationClash.catalog.find(c=>c.id===id),'signature').start+5);
  },selector);
  const staticHidden=await page.locator(selector).evaluate(e=>{const img=e.querySelector('.hero-art>img,.fighter-portrait'),style=getComputedStyle(img);return style.visibility==='hidden'||style.display==='none'||Number(style.opacity)===0;});assert.ok(staticHidden,name+' static portrait hides while real sprite animation is active');
  await shot(page,'neon-signature-'+name);await page.evaluate(()=>NationFighterPreview.stop());
 }
}
async function staleLoads(page){
 const d=await page.evaluate(async()=>{
  const host=document.createElement('div');host.className='portrait';host.style.cssText='position:fixed;width:480px;height:360px;left:0;top:0';document.body.appendChild(host);
  const ids=NationClash.catalog.slice(0,5).map(c=>c.id),samples=[];
  const timer=setInterval(()=>samples.push(NationFighterPreview.debug.pendingLoads),1);
  try{
   const jobs=ids.map(id=>NationFighterPreview.show(id,host,{manual:true}));await Promise.allSettled(jobs);
   const current={...NationFighterPreview.debug,canvases:document.querySelectorAll('.fighter-preview-canvas').length};NationFighterPreview.stop();
   await NationFighterPreview.show(ids[0],host,{manual:true});NationFighterPreview.stop();await new Promise(r=>setTimeout(r,80));
   return {expected:ids[ids.length-1],current,after: {...NationFighterPreview.debug},maxPending:Math.max(0,...samples),active:document.querySelectorAll('.preview-active').length};
  }finally{clearInterval(timer);NationFighterPreview.stop();host.remove();}
 });
 assert.equal(d.current.countryId,d.expected,'latest requested fighter wins rapid hover race');assert.equal(d.current.ready,true);assert.equal(d.current.canvases,1);assert.ok(d.maxPending<=1,'decode work stays serialized');assert.equal(d.after.playing,false);assert.equal(d.active,0);
 check('rapid fighter changes retain the latest country, serialize decoding and remove the preview on stop',{maxPendingLoads:d.maxPending});
}
async function visibilityGuards(page){
 const guards=await page.evaluate(async()=>{
  NationFighterPreview.stop();const host=document.createElement('div');host.className='hero-art';host.style.cssText='position:fixed;left:0;top:0;padding:0;width:1px;height:1px';document.body.appendChild(host);
  try{
   const tiny=await NationFighterPreview.show('iq',host,{manual:true});host.style.cssText+=';display:none;width:480px;height:360px';
   const hidden=await NationFighterPreview.show('ir',host,{manual:true});host.style.display='block';
   await NationFighterPreview.show('iq',host,{manual:true});const active=NationFighterPreview.debug.ready;host.style.width='1px';host.style.height='1px';
   await new Promise(r=>setTimeout(r,120));return {tiny,hidden,active,playing:NationFighterPreview.debug.playing,activeCount:document.querySelectorAll('.preview-active').length};
  }finally{NationFighterPreview.stop();host.remove();}
 });
 assert.equal(guards.tiny,false);assert.equal(guards.hidden,false);assert.equal(guards.active,true);assert.equal(guards.playing,false);assert.equal(guards.activeCount,0);
 await page.locator('#roster .card').first().hover();await page.waitForFunction(()=>NationFighterPreview.debug.ready&&NationFighterPreview.debug.playing);
 await page.evaluate(()=>window.scrollTo({top:document.body.scrollHeight,behavior:'instant'}));await stopped(page);
 check('tiny, hidden, resized and offscreen hosts stop safely without negative canvas geometry');
}
async function chooseCountry(page,id,side=0){
 await page.locator(side?'#pick-opponent':'#pick-player').click();await page.selectOption('#region-filter','All');
 const country=await page.evaluate(id=>NationClash.catalog.find(c=>c.id===id).country,id);await page.locator('#country-search').fill(country);
 const index=await page.evaluate(id=>NationClash.catalog.findIndex(c=>c.id===id),id);await page.locator('[data-fighter="'+index+'"]').click();
}
async function heroAndFight(page){
 const hero=page.locator('#hero-left'),id=await hero.getAttribute('data-country-id');
 await page.locator('#hero-left .preview-play').click();await page.waitForFunction(id=>NationFighterPreview.debug.ready&&NationFighterPreview.debug.countryId===id,id);
 assert.equal(await page.evaluate(()=>NationFighterPreview.debug.playing),true);
 await page.selectOption('#mode','local');
 // A pending preview must not replace match art after the start transaction.
 await page.evaluate(()=>{const h=document.querySelector('#hero-left .hero-art');window.__startRace=NationFighterPreview.show(NationClash.catalog[1].id,h,{manual:true});void NationClash.start();});
 await page.waitForFunction(()=>NationClash.fight?.phase==='fight');await page.locator('#pause').click();await page.evaluate(()=>window.__startRace);
 await stopped(page);
 const before=await page.evaluate(()=>({frame:NationClash.fight.frame,left:NationClash.fight.left.data.id,right:NationClash.fight.right.data.id,hp:[NationClash.fight.left.hp,NationClash.fight.right.hp]}));
 const after=await page.evaluate(async()=>{await NationFighterPreview.show('iq',document.querySelector('#hero-left .hero-art'),{manual:true});await new Promise(r=>setTimeout(r,100));const f=NationClash.fight;return {frame:f.frame,left:f.left.data.id,right:f.right.data.id,hp:[f.left.hp,f.right.hp],previewPlaying:NationFighterPreview.debug.playing,art:[f.left,f.right].map(p=>NationClash.assets.countrySprites[p.data.id]?.naturalWidth||0),diagnostics:NationClash.rendererDiagnostics};});
 assert.deepEqual({frame:after.frame,left:after.left,right:after.right,hp:after.hp},before,'preview API cannot mutate a live paused fight');assert.equal(after.previewPlaying,false);assert.ok(after.art.every(n=>n>0),'both actual match atlases remain decoded');assert.equal(after.diagnostics.length,2);assert.ok(after.diagnostics.every(d=>d.renderer==='supplied-country-art'));assert.equal(await page.evaluate(()=>Object.keys(NationClash.assets.countrySprites).length),2,'live match retains only its two atlases');
 await page.locator('#back').click();await page.waitForFunction(()=>!NationClash.fight);
 const retained=[];for(const pair of [['ir','ae'],['gb','fr']]){
  await chooseCountry(page,pair[0]);await chooseCountry(page,pair[1],1);await page.locator('#start').click();await page.waitForFunction(()=>NationClash.fight?.phase==='fight');await page.locator('#pause').click();
  const ids=await page.evaluate(()=>Object.keys(NationClash.assets.countrySprites).sort());assert.deepEqual(ids,[...pair].sort(),'a new match replaces the prior retained atlas references');retained.push(ids);
  await page.locator('#back').click();await page.waitForFunction(()=>!NationClash.fight);
 }
 check('hero manual preview works, stops when a match starts and cannot change live fight state or artwork',{successiveMatchArt:retained});
}
async function mobileAndReduced(){
 for(const viewport of [{width:390,height:844},{width:844,height:390}]){
  const page=await browser.newPage({viewport,isMobile:true,hasTouch:true});watch(page);await ready(page);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile landing has no horizontal overflow');
  const button=page.locator('#hero-left .preview-play');await button.tap();const id=await page.locator('#hero-left').getAttribute('data-country-id');
  await page.waitForFunction(id=>NationFighterPreview.debug.countryId===id&&NationFighterPreview.debug.ready&&NationFighterPreview.debug.playing,id);
  const box=await button.boundingBox();assert.ok(box.width>=44&&box.height>=44,'touch preview target is at least 44px');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot(page,'neon-landing-mobile-'+viewport.width);await page.close();
  check(viewport.width+'px touch landing has a working explicit preview button and no horizontal overflow');
 }
 const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});watch(page);await ready(page);
 const card=page.locator('#roster .card').first(),id=await card.evaluate(e=>NationClash.catalog[Number(e.dataset.fighter)].id);await card.hover();
 await page.waitForFunction(id=>NationFighterPreview.debug.countryId===id&&NationFighterPreview.debug.ready,id);assert.equal(await page.evaluate(()=>NationFighterPreview.debug.playing),false,'reduced-motion hover uses a still preview');
 const frame=await page.evaluate(()=>NationFighterPreview.debug.frame);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>NationFighterPreview.debug.frame),frame);
 await page.locator('#hero-left .preview-play').click();await page.waitForFunction(()=>NationFighterPreview.debug.playing);await page.waitForFunction(()=>!NationFighterPreview.debug.playing,null,{timeout:20000});
 await shot(page,'neon-landing-reduced-motion');await page.close();check('reduced motion freezes automatic hover and limits explicit playback to one cycle');
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname;if(p==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);}else if(/^\/country-art\/[a-z]{2}\.js$/.test(p)){const f=path.join(filesRoot,p);if(fs.existsSync(f)){res.writeHead(200,{'Content-Type':'text/javascript'});fs.createReadStream(f).pipe(res);}else{res.writeHead(404);res.end();}}else{res.writeHead(204);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port+'/';
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--autoplay-policy=user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1440,height:1050}});watch(page);await ready(page);await hoverAndFocus(page);await allCountries(page);await signatureShots(page);await staleLoads(page);await visibilityGuards(page);await heroAndFight(page);await shot(page,'neon-landing-desktop');await page.close();await mobileAndReduced();
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);check('no runtime errors or external network requests');report.status='passed';report.finishedAt=new Date().toISOString();console.log('Landing preview acceptance passed: '+report.checks.length+' groups.');
})().catch(error=>{report.status='failed';report.failure={message:error.message,stack:error.stack};console.error(error);process.exitCode=1;}).finally(async()=>{fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'landing-preview-acceptance.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));});
