'use strict';

// Acceptance checks for the generated offline Android web assets. This runs
// Chromium against local HTTP files; actual APK/WebView checks are separate.
// Prerequisites: `python3 tools/build-android-assets.py`, Node.js, the Playwright
// package, and Chromium (/usr/bin/chromium or CHROMIUM_PATH). Run from any cwd:
//   node tools/android-assets-smoke.cjs
// Optional paths: NATIONCLASH_ANDROID_ASSETS, NATIONCLASH_ARTIFACT_DIR.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');

const ROOT=path.resolve(__dirname,'..');
const ASSETS=path.resolve(process.env.NATIONCLASH_ANDROID_ASSETS||path.join(ROOT,'artifacts/android-assets'));
const OUT=path.resolve(process.env.NATIONCLASH_ARTIFACT_DIR||path.join(ROOT,'artifacts'));
const report={startedAt:new Date().toISOString(),assets:ASSETS,checks:[],errors:[],externalRequests:[],screenshots:[],passed:false};
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.webp':'image/webp','.json':'application/json','.txt':'text/plain'};
let browser,server,url;

function check(name,details={}){
 report.checks.push({name,status:'passed',...details});
 console.log('PASS '+name);
}
function watch(page,label){
 page.on('pageerror',error=>report.errors.push(label+': '+error.message));
 page.on('console',message=>{if(message.type()==='error')report.errors.push(label+': '+message.text());});
 page.on('request',request=>{
  if(/^https?:/.test(request.url())&&!request.url().startsWith(url))report.externalRequests.push(request.url());
 });
 page.route(/^https?:\/\//,route=>route.request().url().startsWith(url)?route.continue():route.abort());
}
async function shot(page,name){
 const file=path.join(OUT,name+'.png');
 await page.screenshot({path:file});report.screenshots.push(file);
}
async function waitReady(page){
 await page.waitForFunction(()=>window.NationClash?.assetsReady);
 await page.waitForFunction(()=>document.querySelector('#hero-left-portrait').naturalWidth>0);
}
async function start(page,touch=false){
 await page.selectOption('#mode','local');
 if(touch)await page.locator('#start').tap();else await page.locator('#start').click();
 await page.waitForFunction(()=>NationClash.fight?.phase==='fight');
}

(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 try{
  const manifestPath=path.join(ASSETS,'asset-manifest.json');
  assert.ok(fs.existsSync(manifestPath),'Generate Android assets with tools/build-android-assets.py first');
  const manifestBytes=fs.readFileSync(manifestPath),manifest=JSON.parse(manifestBytes);
  report.manifestSha256=crypto.createHash('sha256').update(manifestBytes).digest('hex');
  assert.equal(Object.keys(manifest.countries).length,196);
  assert.equal(Object.keys(manifest.arenas).length,30);
  for(const [relative,file]of Object.entries(manifest.files)){
   const bytes=fs.readFileSync(path.join(ASSETS,relative));
   assert.equal(bytes.length,file.bytes,relative+' size matches manifest');
   assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),file.sha256,relative+' hash matches manifest');
  }
  server=http.createServer((request,response)=>{
   let pathname;
   try{pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);}
   catch{response.writeHead(400);response.end();return;}
   if(pathname==='/favicon.ico'){response.writeHead(204);response.end();return;}
   const file=path.resolve(ASSETS,'.'+(pathname==='/'?'/index.html':pathname));
   if(!file.startsWith(ASSETS+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
    response.writeHead(404);response.end();return;
   }
   response.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
   fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  url='http://127.0.0.1:'+server.address().port+'/';
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});

  const page=await browser.newPage({viewport:{width:1440,height:1000}});watch(page,'desktop');
  await page.goto(url);await waitReady(page);
  assert.equal(await page.locator('.card').count(),24);
  assert.deepEqual(await page.evaluate(()=>NationClash.selectedIds),['pk','jp']);
  assert.ok(await page.evaluate(()=>Object.values(NationClash.assets.flags).every(image=>image.naturalWidth>0)));
  check('Local JavaScript, flags, legacy sheets, portraits and default arena boot',{verifiedFiles:Object.keys(manifest.files).length});

  const inventory=await page.evaluate(async()=>{
   const assets={flags:NationClash.assets.flags},countries=[],arenas=[];
   for(const country of NationClash.catalog){
    await NationCountrySprites.ensure([country.id],assets);
    const image=assets.countrySprites[country.id],metadata=NationCountrySprites.METADATA[country.id];
    if(image.naturalWidth!==metadata.width||image.naturalHeight!==metadata.height)throw Error(country.id+' atlas dimensions');
    const portrait=new Image();portrait.src=NationCountrySprites.portrait(country);await portrait.decode();
    if(!portrait.naturalWidth)throw Error(country.id+' portrait');
    countries.push(country.id);
    if(NationCountrySprites.loadedIds.length>NationCountrySprites.MAX_DECODED)throw Error('unbounded country cache');
   }
   for(const arena of NationArenas.ARENAS){
    const image=await NationArenas.ensure(arena.id);
    if(image.naturalWidth!==1280||image.naturalHeight!==720)throw Error(arena.id+' arena dimensions');
    if(NationArenas.loadedIds.length>NationArenas.MAX_DECODED)throw Error('unbounded arena cache');
    arenas.push(arena.id);
   }
   return {countries,arenas};
  });
  assert.equal(new Set(inventory.countries).size,196);assert.equal(new Set(inventory.arenas).size,30);
  check('All country sheets, portraits and arenas decode locally with bounded caches',{countries:196,portraits:196,arenas:30});

  await start(page);
  for(const [key,distance]of[['j',1.1],['k',1.6],['h',3.8]]){
   await page.evaluate(distance=>{
    const fight=NationClash.fight;fight.resetRound();fight.phase='fight';
    fight.left.x=-distance/2;fight.right.x=distance/2;fight.left.facing=1;fight.right.facing=-1;
   },distance);
   const before=await page.evaluate(()=>NationClash.fight.right.hp);
   await page.keyboard.press(key);
   if(key==='h'){
    assert.equal(await page.evaluate(()=>NationClash.fight.right.hp),before,'Signature input cannot cause instant remote damage');
    await page.waitForFunction(()=>NationClash.fight.projectiles.length>0);
   }
   await page.waitForFunction(hp=>NationClash.fight.right.hp<hp,before);
   const damage=before-await page.evaluate(()=>NationClash.fight.right.hp);
   assert.ok(damage>0);
   check('Real keyboard '+key+' causes correctly timed damage',{damage,distance});
  }
  await shot(page,'android-assets-desktop');
  const audio=await page.evaluate(()=>NationClash.audioDebug);
  assert.ok(audio.musicRunning&&audio.musicGain>0);
  assert.deepEqual(audio.decodedCues.sort(),['fight','getready','ko','timeover']);
  assert.ok(audio.cueCounts.getready>0&&audio.cueCounts.fight>0);
  assert.ok(audio.impactCounts.punch>0&&audio.impactCounts.kick>0);
  assert.ok(audio.signatureCounts.launch>0&&audio.signatureCounts.impact>0);
  assert.equal(audio.lastError,null);
  check('Original synthesized music, impact effects and all embedded announcer clips work');

  for(const viewport of[{width:390,height:844},{width:844,height:390}]){
   const mobile=await browser.newPage({viewport,isMobile:true,hasTouch:true});watch(mobile,viewport.width+'px');
   await mobile.goto(url);await waitReady(mobile);
   assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await start(mobile,true);
   await mobile.evaluate(()=>{const fight=NationClash.fight;fight.left.x=-1.9;fight.right.x=1.9;});
   await mobile.locator('[data-action="signature"]').tap();
   await mobile.waitForFunction(()=>NationClash.fight.right.hp<NationClash.fight.right.data.hp);
   assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.ok(await mobile.locator('.touch button').evaluateAll(buttons=>buttons.every(button=>{
    const rect=button.getBoundingClientRect();return rect.width>=44&&rect.height>=44;
   })),'Touch targets remain at least44px');
   if(viewport.width>viewport.height){
    assert.ok(await mobile.locator('.touch button').evaluateAll(buttons=>buttons.every(button=>{
     const rect=button.getBoundingClientRect();return rect.left>=0&&rect.top>=0&&rect.right<=innerWidth+.5&&rect.bottom<=innerHeight+.5;
    })),'Landscape controls fit the screen');
   }
   await shot(mobile,'android-assets-mobile-'+viewport.width);
   check(viewport.width+'px touch signature, responsive controls and layout');await mobile.close();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);
  assert.equal(report.checks.length,8);report.passed=true;
 }catch(error){report.failure=error.stack||error.message;throw error;}
 finally{
  if(browser)await browser.close();
  if(server)await new Promise(resolve=>server.close(resolve));
  report.finishedAt=new Date().toISOString();
  fs.writeFileSync(path.join(OUT,'android-assets-smoke.json'),JSON.stringify(report,null,2)+'\n');
 }
 console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
