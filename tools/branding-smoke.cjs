'use strict';

// Verify the shared NationClash logo in the canonical browser and Android web
// builds. Actual APK/WebView acceptance is separate. Prerequisites: run
// `node tools/build-browser.mjs` and `python3 tools/build-android-assets.py`;
// install Node.js, Playwright and Chromium (/usr/bin/chromium or CHROMIUM_PATH).
// Usage from any cwd: node tools/branding-smoke.cjs
// Optional paths: NATIONCLASH_ANDROID_ASSETS, NATIONCLASH_ARTIFACT_DIR.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');

const ROOT=path.resolve(__dirname,'..');
const ANDROID=path.resolve(process.env.NATIONCLASH_ANDROID_ASSETS||path.join(ROOT,'artifacts/android-assets'));
const BROWSER=path.join(ROOT,'browser');
const OUT=path.resolve(process.env.NATIONCLASH_ARTIFACT_DIR||path.join(ROOT,'artifacts'));
const report={startedAt:new Date().toISOString(),checks:[],errors:[],externalRequests:[],screenshots:[],passed:false};
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.json':'application/json'};
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
let browser,server,origin;

function watch(page,label){
 page.on('pageerror',error=>report.errors.push(label+': '+error.message));
 page.on('console',message=>{if(message.type()==='error')report.errors.push(label+': '+message.text());});
 page.on('request',request=>{
  if(/^https?:/.test(request.url())&&!request.url().startsWith(origin+'/'))report.externalRequests.push(request.url());
 });
 page.route(/^https?:\/\//,route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
}

(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 try{
  const sourceLogo=fs.readFileSync(path.join(BROWSER,'assets/branding/nation-clash-logo.webp'));
  const manifestBytes=fs.readFileSync(path.join(ANDROID,'asset-manifest.json'));
  const manifest=JSON.parse(manifestBytes);
  assert.equal(manifest.branding.sourceSha256,digest(sourceLogo));
  assert.deepEqual(fs.readFileSync(path.join(ANDROID,manifest.branding.path)),sourceLogo,'Android logo preserves the exact supplied WebP bytes');
  const browserHTML=fs.readFileSync(path.join(BROWSER,'index.html'),'utf8');
  const logoURI='data:image/webp;base64,'+sourceLogo.toString('base64');
  assert.equal(browserHTML.split(logoURI).length-1,2,'Browser embeds the same exact logo twice');
  report.logoSha256=digest(sourceLogo);report.androidManifestSha256=digest(manifestBytes);

  server=http.createServer((request,response)=>{
   let pathname;
   try{pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);}
   catch{response.writeHead(400);response.end();return;}
   if(pathname.endsWith('/favicon.ico')){response.writeHead(204);response.end();return;}
   const match=/^\/(browser|android)\/(.*)$/.exec(pathname);
   if(!match){response.writeHead(404);response.end();return;}
   const base=match[1]==='browser'?BROWSER:ANDROID,file=path.resolve(base,match[2]||'index.html');
   if(!file.startsWith(base+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
    response.writeHead(404);response.end();return;
   }
   response.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
   fs.createReadStream(file).pipe(response);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  for(const [kind,viewport]of[
   ['android',{width:1440,height:900}],['android',{width:390,height:844}],
   ['android',{width:844,height:390}],['browser',{width:1440,height:900}],
  ]){
   const label=kind+' '+viewport.width+'px';
   const page=await browser.newPage({viewport,isMobile:viewport.width<900,hasTouch:viewport.width<900});watch(page,label);
   await page.goto(origin+'/'+kind+'/index.html');
   await page.waitForFunction(()=>window.NationClash?.assetsReady);
   await page.waitForFunction(()=>[...document.querySelectorAll('.brand-logo,.landing-brand-logo')].every(image=>image.complete&&image.naturalWidth>0));
   const branding=await page.evaluate(()=>({
    images:[...document.querySelectorAll('.brand-logo,.landing-brand-logo')].map(image=>{
     const rect=image.getBoundingClientRect(),embedded=image.src.startsWith('data:');
     return {
      alt:image.alt,embedded,localPath:embedded?null:new URL(image.src).pathname,
      naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,
      width:rect.width,height:rect.height,left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,
     };
    }),
    scrollWidth:document.documentElement.scrollWidth,width:innerWidth,height:innerHeight,
   }));
   assert.equal(branding.images.length,2);
   for(const image of branding.images){
    assert.ok(image.alt.includes('NationClash'),'Each logo has a meaningful accessible name');
    assert.equal(image.naturalWidth,manifest.branding.width);assert.equal(image.naturalHeight,manifest.branding.height);
    assert.equal(image.embedded,kind==='browser');
    if(kind==='android')assert.equal(image.localPath,'/android/'+manifest.branding.path);
    assert.ok(image.left>=0&&image.right<=branding.width&&image.top>=0&&image.bottom<=branding.height,'Both logos are fully above the fold');
   }
   assert.ok(branding.scrollWidth<=branding.width,'Branding introduces no horizontal overflow');
   const minimum=viewport.width>=1180?176:viewport.width<640?150:110;
   assert.ok(branding.images[1].width>=minimum,'Landing logo remains clearly sized');
   const screenshot=path.join(OUT,'branding-'+kind+'-'+viewport.width+'.png');
   await page.screenshot({path:screenshot});report.screenshots.push(screenshot);
   report.checks.push({name:label+' shared logo decode, accessible name, size and above-fold layout',status:'passed',kind,viewport,branding});
   console.log('PASS '+label+' branding');await page.close();
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);
  assert.equal(report.checks.length,4);report.passed=true;
 }catch(error){report.failure=error.stack||error.message;throw error;}
 finally{
  if(browser)await browser.close();
  if(server)await new Promise(resolve=>server.close(resolve));
  report.finishedAt=new Date().toISOString();
  fs.writeFileSync(path.join(OUT,'android-branding-smoke.json'),JSON.stringify(report,null,2)+'\n');
 }
 console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,logoSha256:report.logoSha256,androidManifestSha256:report.androidManifestSha256,errors:report.errors,externalRequests:report.externalRequests},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
