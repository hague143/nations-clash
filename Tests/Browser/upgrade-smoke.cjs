'use strict';
// New-presentation acceptance on the actual built document. The original world
// suite separately checks every authored punch/kick and all 30 arena matches.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../..'),OUT=path.resolve(process.env.NATIONCLASH_ARTIFACT_DIR||'artifacts/presentation-upgrade/browser');
const file=path.resolve(process.env.NATIONCLASH_HTML||'browser/index.html'),html=fs.readFileSync(file),filesRoot=path.dirname(file);
const report={startedAt:new Date().toISOString(),document:{path:file,bytes:html.length,sha256:crypto.createHash('sha256').update(html).digest('hex')},checks:[],errors:[],externalRequests:[],screenshots:[]};
let browser,server,url;
function check(name,details={}){report.checks.push({name,status:'passed',...details});console.log('PASS '+name);}
function watch(page){page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(url))report.externalRequests.push(r.url());});}
async function shot(page,name){const p=path.join(OUT,name+'.png');await page.screenshot({path:p,fullPage:true});report.screenshots.push(p);}
async function choose(page,id,side=0){
 await page.locator(side?'#pick-opponent':'#pick-player').click();await page.selectOption('#region-filter','All');
 const country=await page.evaluate(id=>NationClash.catalog.find(c=>c.id===id).country,id);await page.locator('#country-search').fill(country);
 const index=await page.evaluate(id=>NationClash.catalog.findIndex(c=>c.id===id),id);await page.locator('[data-fighter="'+index+'"]').click();
}
async function reset(page,{left='ir',right='ae',distance=3.8,facing=1}={}){
 await page.evaluate(async({left,right,distance,facing})=>{
  await NationCountrySprites.ensure([left,right],NationClash.assets);
  const f=NationClash.fight;f.left.data=NationClash.catalog.find(c=>c.id===left);f.right.data=NationClash.catalog.find(c=>c.id===right);
  f.resetRound();f.phase='fight';f.left.x=-distance/2*facing;f.right.x=distance/2*facing;f.left.facing=facing;f.right.facing=-facing;
 },{left,right,distance,facing});
}
async function start(page){await page.selectOption('#mode','local');await page.locator('#start').click();await page.waitForFunction(()=>NationClash.fight?.phase==='fight');}
async function back(page){if(!await page.evaluate(()=>NationClash.paused))await page.locator('#pause').click();await page.locator('#back').click();}
async function modalShot(page,name){await page.locator('#overlay').evaluate(e=>e.style.visibility='hidden');await shot(page,name);await page.locator('#overlay').evaluate(e=>e.style.visibility='');}
async function selection(page){
 await page.waitForFunction(()=>window.NationClash?.assetsReady);
 await choose(page,'ir');await choose(page,'ae',1);await page.selectOption('#arena-select','dubai');
 await page.waitForFunction(()=>document.getElementById('stage-preview').dataset.ready==='true');
 const hero=await page.evaluate(()=>({left:document.getElementById('hero-left').dataset.countryId,right:document.getElementById('hero-right').dataset.countryId,power:document.getElementById('hero-left-power').textContent,other:document.getElementById('hero-right-power').textContent,ready:document.getElementById('hero-stage').dataset.ready,portraits:['left','right'].map(s=>{const i=document.getElementById('hero-'+s+'-portrait');return {width:i.naturalWidth,src:i.src};}),powers:Object.keys(NationPowers.POWERS).length,stage:document.getElementById('hero-arena').textContent}));
 assert.equal(hero.left,'ir');assert.equal(hero.right,'ae');assert.equal(hero.powers,196);assert.equal(hero.ready,'true');assert.match(hero.power,/Uranium Pulse/);assert.match(hero.other,/Golden Falcon/);assert.ok(hero.portraits.every(p=>p.width>0&&p.src.startsWith('data:image/')));assert.match(hero.stage,/Burj Khalifa/);
 await shot(page,'country-power-selection');check('selected supplied portraits, countries, stage and signature names update together',hero);
}
async function renderedPowers(page){
 await start(page);await page.locator('#pause').click();
 const data=await page.evaluate(async()=>{
  const results=[],f=NationClash.fight;
  for(const data of NationClash.catalog)for(const facing of [-1,1]){
   await NationCountrySprites.ensure([data.id,'jp'],NationClash.assets);f.left.data=data;f.right.data=NationClash.catalog.find(c=>c.id==='jp');f.resetRound();f.phase='fight';f.left.x=-2*facing;f.right.x=2*facing;f.left.facing=facing;f.right.facing=-facing;
   f.step({action:'signature'});for(let i=0;i<25&&!f.projectiles.length;i++)f.step();
   await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
   const p=f.projectiles[0],d=NationClash.powerDiagnostics[0],floor=NationArenas.getArena(NationClash.selectedArena).floorY;
   results.push({id:data.id,facing,powerId:p?.powerId,owner:p?.ownerId,core:d?.core,expected:p?{x:640+p.x*78,y:floor-p.y*78,radius:p.radius*78}:null});
  }
  return results;
 });
 assert.equal(data.length,392);
 for(const p of data){assert.equal(p.powerId,p.id);assert.equal(p.owner,p.id);assert.ok(p.core&&p.expected,p.id+' renders its actual travelling core');for(const k of ['x','y','radius'])assert.ok(Math.abs(p.core[k]-p.expected[k])<1e-6,p.id+' '+k+' visible collider alignment');}
 check('all 196 country projectiles render their own power at exact collision coordinates in both directions',{fixtures:data.length,countries:196});
 await back(page);
}
async function keyboardPowers(page){
 await choose(page,'ir');await choose(page,'ae',1);await start(page);await reset(page,{distance:6.2});
 await page.evaluate(()=>{window.__signatureAudioAtHit=null;addEventListener('nation-hit',event=>{if((event.detail.move||event.detail.action)==='signature')window.__signatureAudioAtHit={event:event.detail,audio:NationClash.audioDebug,paused:NationClash.paused};});});
 const before=await page.evaluate(()=>({hp:NationClash.fight.right.hp,sound:NationClash.audioDebug.signatureCounts}));
 await page.keyboard.press('h');
 assert.equal(await page.evaluate(()=>NationClash.fight.right.hp),before.hp,'a keypress cannot cause remote instant damage');
 await page.waitForFunction(()=>NationClash.fight.projectiles.length===1);
 assert.equal(await page.evaluate(()=>NationClash.fight.right.hp),before.hp,'launch precedes impact');
 assert.equal(await page.evaluate(()=>NationClash.fight.projectiles[0].powerId),'ir');
 // Escape is a real production pause input without button actionability waits.
 // The longer, still-valid flight leaves time to capture it on a loaded CI host.
 await page.keyboard.press('Escape');await page.waitForFunction(()=>NationClash.paused);
 const frozen=await page.evaluate(()=>({frame:NationClash.fight.frame,x:NationClash.fight.projectiles[0].x,cooldown:NationClash.fight.left.signatureCooldown,canvas:document.getElementById('arena').toDataURL()}));
 await page.waitForTimeout(180);
 const still=await page.evaluate(()=>({frame:NationClash.fight.frame,x:NationClash.fight.projectiles[0].x,cooldown:NationClash.fight.left.signatureCooldown,canvas:document.getElementById('arena').toDataURL()}));
 assert.deepEqual(still,frozen,'pause freezes mechanics and visible projectile animation');
 await modalShot(page,'iran-uranium-projectile');await page.locator('#resume').click();
 await page.waitForFunction(hp=>NationClash.fight.right.hp<hp,before.hp);
 assert.equal(await page.evaluate(()=>NationClash.fight.right.lastDamage),120);
 assert.match(await page.locator('#left-signature').textContent(),/Uranium Pulse/);
 const after=await page.evaluate(()=>NationClash.audioDebug);
 assert.equal(after.signatureCounts.launch,before.sound.launch+1);assert.equal(after.signatureCounts.impact,before.sound.impact+1,'signature impact sound remains audible across pause/resume: '+JSON.stringify(await page.evaluate(()=>__signatureAudioAtHit)));assert.ok(after.musicRunning&&after.musicGain>0);
 await page.keyboard.press('h');await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>NationClash.fight.projectiles.length),0,'cooldown prevents a second projectile');
 await page.locator('#pause').click();await modalShot(page,'uranium-impact');await page.locator('#resume').click();
 check('real H launches Iran power, travels before damage, plays sound, recharges and freezes on pause',{signatureAudioBefore:before.sound,signatureAudioAfter:after.signatureCounts,atImpact:await page.evaluate(()=>__signatureAudioAtHit)});
 await reset(page);const guardedHP=await page.evaluate(()=>NationClash.fight.right.hp);await page.keyboard.down('ControlRight');await page.keyboard.press('h');
 await page.waitForFunction(()=>NationClash.fight.effects.some(e=>e.type==='signature'&&e.kind==='block'));
 await page.keyboard.up('ControlRight');assert.equal(await page.evaluate(()=>NationClash.fight.right.hp),guardedHP,'standing guard blocks standing power');
 await reset(page,{distance:12});const missHP=await page.evaluate(()=>NationClash.fight.right.hp);await page.keyboard.press('h');await page.waitForFunction(()=>NationClash.fight.projectiles.length>0);await page.waitForFunction(()=>NationClash.fight.projectiles.length===0);assert.equal(await page.evaluate(()=>NationClash.fight.right.hp),missHP,'out of range shot causes no damage');
 await reset(page);await page.keyboard.press('Numpad7');await page.waitForFunction(()=>NationClash.fight.projectiles.some(p=>p.ownerIndex===1));await page.locator('#pause').click();await modalShot(page,'golden-falcon-projectile');await page.locator('#resume').click();await page.waitForFunction(()=>NationClash.fight.left.hp<NationClash.fight.left.data.hp);
 check('real guard, finite-range miss and player-two Numpad7 gold power work');
}
async function mix(page){
 assert.equal(await page.locator('#sound,#volume,#music-volume,#effects-volume').count(),0,'removed audio controls are absent, not hidden');
 const playing=await page.evaluate(()=>NationClash.audioDebug);
 assert.ok(playing.enabled&&playing.active&&playing.musicRunning&&playing.musicGain>0&&playing.effectsGain>0,'music and effects remain enabled without controls');
 assert.equal(playing.contextState,'running');assert.equal(playing.lastError,null);
 assert.deepEqual([...playing.decodedCues].sort(),['fight','getready','ko','timeover']);
 await page.locator('#pause').click();await page.waitForFunction(()=>NationClash.audioDebug.contextState==='suspended');
 const paused=await page.evaluate(()=>NationClash.audioDebug);
 assert.equal(paused.paused,true);assert.equal(paused.musicRunning,false);assert.equal(paused.activeVoices,0);
 await page.locator('#resume').click();await page.waitForFunction(()=>NationClash.audioDebug.musicRunning&&NationClash.audioDebug.contextState==='running');
 const resumed=await page.evaluate(()=>NationClash.audioDebug);
 assert.deepEqual(resumed.cueCounts,paused.cueCounts,'resume does not replay round announcements');
 for(const key of ['volume','musicVolume','effectsVolume'])assert.equal(resumed[key],playing[key],key+' is preserved through pause');
 await back(page);
 const stopped=await page.evaluate(()=>NationClash.audioDebug);
 assert.equal(stopped.active,false);assert.equal(stopped.musicRunning,false);assert.equal(stopped.activeVoices,0);
 const before=stopped.cueCounts;await start(page);
 const restarted=await page.evaluate(()=>NationClash.audioDebug);
 assert.ok(restarted.enabled&&restarted.musicRunning&&restarted.musicGain>0);
 assert.equal(restarted.cueCounts.getready,before.getready+1);assert.equal(restarted.cueCounts.fight,before.fight+1);
 assert.equal(restarted.lastError,null);await back(page);
 check('music, effects and announcers work without audio UI, pause/resume cleanly and restart once per match');
}
async function mobile(viewport){
 const page=await browser.newPage({viewport,isMobile:true,hasTouch:true});watch(page);await page.goto(url);await page.waitForFunction(()=>window.NationClash?.assetsReady);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await choose(page,'ir');await choose(page,'ae',1);await start(page);await reset(page);
 const signature=page.locator('[data-action="signature"]');await signature.tap();await page.waitForFunction(()=>NationClash.fight.left.signatureCooldown>0);await page.waitForFunction(()=>NationClash.fight.right.hp<NationClash.fight.right.data.hp);
 const box=await signature.boundingBox();assert.ok(box.width>=44&&box.height>=44);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if(viewport.height<viewport.width){await page.evaluate(()=>window.scrollTo(0,0));const fits=await page.locator('.touch button').evaluateAll(bs=>bs.every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=0&&r.top>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5;}));assert.ok(fits,'all landscape controls fit');}
 await page.locator('#pause').click();await modalShot(page,'country-power-mobile-'+viewport.width);await page.close();check(viewport.width+'px mobile country-power touch, layout and controls');
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname;if(p==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);}else if(/^\/country-art\/[a-z]{2}\.js$/.test(p)){const f=path.join(filesRoot,p);if(fs.existsSync(f)){res.writeHead(200,{'Content-Type':'text/javascript'});fs.createReadStream(f).pipe(res);}else{res.writeHead(404);res.end();}}else{res.writeHead(204);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port+'/';
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--autoplay-policy=user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1440,height:1050}});watch(page);await page.goto(url);await selection(page);await renderedPowers(page);await keyboardPowers(page);await mix(page);await page.close();
 await mobile({width:390,height:844});await mobile({width:844,height:390});
 const reduced=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});watch(reduced);await reduced.goto(url);await reduced.waitForFunction(()=>window.NationClash?.assetsReady);assert.equal(await reduced.evaluate(()=>NationPresentation.debug.reducedMotion),true);await start(reduced);await reset(reduced);await reduced.keyboard.press('h');await reduced.waitForFunction(()=>NationClash.fight.right.hp<NationClash.fight.right.data.hp);await reduced.close();check('reduced motion preserves playable country powers');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);check('no runtime errors or external network requests');report.status='passed';report.finishedAt=new Date().toISOString();console.log('Upgrade browser acceptance passed: '+report.checks.length+' groups.');
})().catch(error=>{report.status='failed';report.failure={message:error.message,stack:error.stack};console.error(error);process.exitCode=1;}).finally(async()=>{fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'upgrade-acceptance.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));});
