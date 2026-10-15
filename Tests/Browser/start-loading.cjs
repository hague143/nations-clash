const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(process.env.NATIONCLASH_PACKAGE_DIR||'artifacts/country-package-check');let browser;
 const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname;const file=p==='/'?path.join(root,'NationClash.html'):/^\/country-art\/[a-z]{2}\.js$/.test(p)?path.join(root,p):null;if(!file||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':p==='/'?'text/html':'text/javascript'});fs.createReadStream(file).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.waitForFunction(()=>window.NationClash?.assetsReady);
  const before=await page.evaluate(()=>({ids:NationClash.selectedIds,arena:NationClash.selectedArena}));
  await page.evaluate(()=>{const original=NationCountrySprites.ensure;let release;const gate=new Promise(r=>release=r);window.releaseArt=release;NationCountrySprites.ensure=async(...args)=>{await gate;return original(...args);};});
  await page.locator('#start').click();await page.waitForFunction(()=>document.getElementById('start').textContent.includes('LOADING SELECTED'));
  await page.locator('#country-search').fill('United States');await page.locator('.card').click();await page.selectOption('#arena-select','times-square');
  await page.evaluate(()=>releaseArt());await page.waitForFunction(()=>NationClash.fight?.phase==='fight');
  const after=await page.evaluate(()=>({ids:[NationClash.fight.left.data.id,NationClash.fight.right.data.id],arena:NationClash.selectedArena,audioArena:NationClash.audioDebug.arena,rendered:NationClash.rendererDiagnostics.map(d=>d.countryId),retainedArena:NationArenas.retainedId,loadedArenas:NationArenas.loadedIds}));
  assert.deepEqual(after.ids,before.ids);assert.equal(after.arena,before.arena);assert.equal(after.audioArena,before.arena);assert.deepEqual(after.rendered,before.ids);assert.deepEqual(errors,[]);
  assert.equal(after.retainedArena,before.arena);assert.ok(after.loadedArenas.includes(before.arena)&&after.loadedArenas.length<=3);
  fs.writeFileSync('artifacts/start-race-check.json',JSON.stringify({status:'passed',before,after},null,2)+'\n');console.log('PASS changing country/arena while artwork loads cannot change or blank the match already starting');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
