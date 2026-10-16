'use strict';
// Actual RAF outcome checks complement all-country simulation tests. Fixtures
// only place opponents in range and lower HP; real keyboard input ends matches.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const file=path.resolve(process.env.NATIONCLASH_HTML||'browser/index.html'),html=fs.readFileSync(file),root=path.dirname(file);
const out=path.resolve(process.env.NATIONCLASH_ARTIFACT_DIR||'artifacts/round-settle-browser');
const report={status:'running',document:{path:file,bytes:html.length,sha256:crypto.createHash('sha256').update(html).digest('hex')},checks:[],errors:[],externalRequests:[],countries:[],cases:[],screenshots:[]};
let browser,server,url;
async function choose(page,id,side){
 await page.locator(side?'#pick-opponent':'#pick-player').click();await page.selectOption('#region-filter','All');
 const data=await page.evaluate(id=>{const i=NationClash.catalog.findIndex(c=>c.id===id);return {i,country:NationClash.catalog[i].country};},id);
 await page.locator('#country-search').fill(data.country);await page.locator('[data-fighter="'+data.i+'"]').click();
}
function check(name,details={}){report.checks.push({name,status:'passed',...details});console.log('PASS '+name);}
(async()=>{
 fs.mkdirSync(out,{recursive:true});server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname;
  if(p==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return;}
  if(/^\/country-art\/[a-z]{2}\.js$/.test(p)){const f=path.join(root,p);if(fs.existsSync(f)){res.writeHead(200,{'Content-Type':'text/javascript'});fs.createReadStream(f).pipe(res);return;}}
  res.writeHead(204);res.end();
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));url='http://127.0.0.1:'+server.address().port+'/';
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1050}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(url))report.externalRequests.push(r.url());});
 await page.goto(url,{timeout:90000});await page.waitForFunction(()=>window.NationClash?.assetsReady,{},{timeout:90000});
 if(process.env.NATIONCLASH_KO_UI_ONLY!=='1'){
  report.countries=await page.evaluate(async()=>{
   const result=[],canvas=document.createElement('canvas');canvas.width=800;canvas.height=720;
   const ctx=canvas.getContext('2d',{willReadFrequently:true}),C=NationCombat,pk=NationClash.catalog.find(c=>c.id==='pk');
   for(const data of NationClash.catalog){
    await NationCountrySprites.ensure([data.id],NationClash.assets);
    const f=new C.Fight(pk,data,{intro:0}),a=f.left,d=f.right;f.wins=[1,0];a.x=0;d.x=.92;d.hp=1;d.y=1.2;
    f.step({action:'light'});for(let i=0;i<30&&f.phase==='fight';i++)f.step();
    for(let i=0;i<100;i++)f.settle();
    d.x=0;ctx.clearRect(0,0,800,720);const drawn=NationClash.renderFighter(ctx,d,{originX:400,floor:600,pixelsPerUnit:78,frame:f.frame,time:f.frame/60});
    const pixels=ctx.getImageData(0,0,800,720).data;let count=0,maxY=-1;
    for(let y=0;y<720;y++)for(let x=0;x<800;x++)if(pixels[(y*800+x)*4+3]>100){count++;maxY=y;}
    result.push({id:data.id,phase:f.phase,pose:drawn?.diagnostic.pose,adapted:!!drawn?.diagnostic.adaptedKo,y:d.y,flash:d.flash,effects:f.effects.length,winnerRecovering:!!a.move,pixels:count,bottom:maxY});
   }return result;
  });
  assert.equal(report.countries.length,196);
  for(const c of report.countries){assert.equal(c.phase,'complete');assert.equal(c.pose,'ko',c.id);assert.equal(c.y,0);assert.equal(c.flash,0);assert.equal(c.effects,0);assert.equal(c.winnerRecovering,false);assert.ok(c.pixels>1000,c.id+' still draws its supplied defeat artwork');assert.ok(c.bottom<=612,c.id+' body stays on the stage floor');}
  check('all 196 supplied defeated poses render after actual lethal hits and visual settling',{countries:196});
 }
 for(const [id,slot,air] of [['jp',1,false],['tr',1,false],['mk',1,false],['no',1,false],['pl',1,false],['pk',0,true]]){
  const other=id==='pk'?'jp':'pk';await choose(page,slot?other:id,0);await choose(page,slot?id:other,1);await page.selectOption('#mode','local');
  await page.locator('#start').click();await page.waitForFunction(()=>NationClash.fight?.phase==='fight');
  await page.evaluate(({slot,air})=>{
   const f=NationClash.fight,d=slot?f.right:f.left,a=slot?f.left:f.right;f.wins=slot?[1,0]:[0,1];a.x=0;d.x=.92;a.facing=1;d.facing=-1;d.hp=1;if(air)d.y=1.2;
   window.outcomeInitial={hp:[a.hp,d.hp],wins:[...f.wins]};
  },{slot,air});
  await page.keyboard.press(slot?'j':'Numpad1');await page.waitForFunction(()=>NationClash.fight.phase==='complete');
  const locked=await page.evaluate(()=>({hp:[NationClash.fight.left.hp,NationClash.fight.right.hp],wins:[...NationClash.fight.wins],time:NationClash.fight.time,round:NationClash.fight.round}));
  await page.waitForFunction(slot=>{
   const f=NationClash.fight,d=slot?f.right:f.left,a=slot?f.left:f.right;
   return d.y===0&&d.flash===0&&!f.effects.length&&!a.move&&NationClash.rendererDiagnostics[slot]?.pose==='ko';
  },slot,{timeout:6500});
  assert.deepEqual(await page.evaluate(()=>({hp:[NationClash.fight.left.hp,NationClash.fight.right.hp],wins:[...NationClash.fight.wins],time:NationClash.fight.time,round:NationClash.fight.round})),locked,'result remains locked while animation finishes');
  assert.equal(await page.locator('#overlay').isVisible(),true);await page.locator('#overlay').evaluate(e=>e.style.visibility='hidden');
  const screenshot=path.join(out,'deciding-ko-'+id+'.png');await page.screenshot({path:screenshot,fullPage:true});report.screenshots.push(screenshot);
  await page.locator('#overlay').evaluate(e=>e.style.visibility='');report.cases.push({id,slot,air,...locked,pose:'ko'});await page.locator('#back').click();
 }
 check('actual keyboard deciding KOs finish in the live animation loop for ground, adapted, kneeling and airborne states',{cases:report.cases.length});
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);check('no runtime errors or external requests');report.status='passed';
})().catch(error=>{report.status='failed';report.failure={message:error.message,stack:error.stack};console.error(error);process.exitCode=1;}).finally(async()=>{
 report.finishedAt=new Date().toISOString();fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'round-settle-acceptance.json'),JSON.stringify(report,null,2)+'\n');
 if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));
});
