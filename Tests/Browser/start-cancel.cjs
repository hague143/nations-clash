'use strict';
// A completed match keeps Back visible while Rematch loads. Cancelling that
// load must leave the selection screen usable, even if a new start is pending.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const packageDir=path.resolve(process.env.NATIONCLASH_PACKAGE_DIR||'artifacts/country-package-check');
const file=path.resolve(process.env.NATIONCLASH_HTML||path.join(packageDir,'NationClash.html'));
const filesRoot=path.dirname(file),html=fs.readFileSync(file);
const out=path.resolve(process.env.NATIONCLASH_ARTIFACT_DIR||'artifacts');
const report={status:'running',document:file,checks:[],errors:[]};
let browser,server;
const passed=(name,details={})=>{report.checks.push({name,status:'passed',...details});console.log('PASS '+name);};
async function completeMatch(page){
 await page.evaluate(()=>{const f=NationClash.fight;f.phase='fight';f.hitstop=0;f.wins=[1,0];f.right.hp=0;f.step();});
 await page.waitForFunction(()=>NationClash.fight?.phase==='complete');
 await page.locator('#rematch').waitFor({state:'visible'});
}
async function installGates(page,count){
 await page.evaluate(count=>{
  const ensure=NationCountrySprites.ensure,rematch=document.getElementById('rematch'),start=document.getElementById('start');
  const rematchHandler=rematch.onclick,startHandler=start.onclick;
  const gates=Array.from({length:count},()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};});
  const state={calls:0,gates};
  NationCountrySprites.ensure=async(...args)=>{const gate=gates[state.calls++];if(gate)await gate.promise;return ensure(...args);};
  rematch.onclick=event=>{state.oldStart=rematchHandler(event);return state.oldStart;};
  start.onclick=event=>{state.freshStart=startHandler(event);return state.freshStart;};
  state.restore=()=>{NationCountrySprites.ensure=ensure;rematch.onclick=rematchHandler;start.onclick=startHandler;};
  window.cancelArt=state;
 },count);
}
async function beginRematchAndBack(page){
 await page.locator('#rematch').click();
 await page.waitForFunction(()=>window.cancelArt.calls===1);
 await page.locator('#back').click();
 const state=await page.evaluate(()=>({fight:!!NationClash.fight,selectionVisible:!document.getElementById('selection').classList.contains('hidden'),startDisabled:document.getElementById('start').disabled,status:NationPresentation.debug.status}));
 assert.equal(state.fight,false);assert.equal(state.selectionVisible,true);
 assert.equal(state.startDisabled,false,'Back must immediately allow a fresh start while cancelled artwork is pending');
 assert.equal(state.status,'ready','cancelled load restores selection readiness');return state;
}
async function selectCountry(page,id){
 await page.locator('#pick-player').click();await page.selectOption('#region-filter','All');
 const data=await page.evaluate(id=>{const index=NationClash.catalog.findIndex(c=>c.id===id);return {index,country:NationClash.catalog[index].country};},id);
 await page.locator('#country-search').fill(data.country);await page.locator('[data-fighter="'+data.index+'"]').click();
}
(async()=>{
 server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname;
  if(p==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return;}
  if(/^\/country-art\/[a-z]{2}\.js$/.test(p)){const source=path.join(filesRoot,p);if(fs.existsSync(source)){res.writeHead(200,{'Content-Type':'text/javascript'});fs.createReadStream(source).pipe(res);return;}}
  res.writeHead(204);res.end();
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();page.on('pageerror',error=>report.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
 await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.waitForFunction(()=>window.NationClash?.assetsReady);
 await page.selectOption('#mode','local');await page.locator('#start').click();await page.waitForFunction(()=>NationClash.fight?.phase==='fight');

 await completeMatch(page);await installGates(page,1);const cancelled=await beginRematchAndBack(page);
 await selectCountry(page,'us');await page.locator('#start').click();
 await page.waitForFunction(()=>NationClash.fight?.left.data.id==='us');
 await page.evaluate(()=>{window.freshFight=NationClash.fight;});
 await page.evaluate(async()=>{cancelArt.gates[0].resolve();await cancelArt.oldStart;});
 const resolved=await page.evaluate(()=>({sameFight:NationClash.fight===window.freshFight,left:NationClash.fight?.left.data.id,selectionVisible:!document.getElementById('selection').classList.contains('hidden'),status:NationPresentation.debug.status}));
 assert.equal(resolved.sameFight,true,'cancelled rematch must not replace the newer match');assert.equal(resolved.left,'us');assert.equal(resolved.selectionVisible,false);assert.equal(resolved.status,'ready');
 await page.evaluate(()=>cancelArt.restore());passed('Back cancels pending completed-match Rematch and a stale success cannot replace a fresh Start',{cancelled,resolved});

 await completeMatch(page);await installGates(page,2);await beginRematchAndBack(page);
 await selectCountry(page,'ir');await page.locator('#start').click();await page.waitForFunction(()=>window.cancelArt.calls===2);
 const pending=await page.evaluate(()=>({button:document.getElementById('start').textContent,disabled:document.getElementById('start').disabled,status:NationPresentation.debug.status}));
 assert.equal(pending.disabled,true);assert.equal(pending.status,'loading');
 await page.evaluate(async()=>{cancelArt.gates[0].reject(new Error('Cancelled rematch artwork'));await cancelArt.oldStart;});
 const afterReject=await page.evaluate(()=>({button:document.getElementById('start').textContent,disabled:document.getElementById('start').disabled,status:NationPresentation.debug.status,fight:!!NationClash.fight}));
 assert.deepEqual({button:afterReject.button,disabled:afterReject.disabled,status:afterReject.status},pending,'stale catch/finally must not overwrite newer loading status or re-enable its button');
 assert.equal(afterReject.fight,false,'new start still waits for its own artwork');
 await page.evaluate(async()=>{cancelArt.gates[1].resolve();await cancelArt.freshStart;});
 const fresh=await page.evaluate(()=>({left:NationClash.fight?.left.data.id,status:NationPresentation.debug.status,arena:NationClash.selectedArena,retained:NationArenas.retainedId,audioArena:NationClash.audioDebug.arena}));
 assert.equal(fresh.left,'ir');assert.equal(fresh.status,'ready');assert.equal(fresh.retained,fresh.arena);assert.equal(fresh.audioArena,fresh.arena);
 await page.evaluate(()=>cancelArt.restore());passed('stale rejected artwork cannot overwrite a newer pending Start or release its arena',{pending,afterReject,fresh});
 assert.deepEqual(report.errors,[]);report.status='passed';
})().catch(error=>{report.status='failed';report.failure={message:error.message,stack:error.stack};console.error(error);process.exitCode=1;}).finally(async()=>{
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'start-cancel-check.json'),JSON.stringify(report,null,2)+'\n');
 if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
});
