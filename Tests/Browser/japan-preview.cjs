const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'../..');
const OUT=process.env.NATIONCLASH_ARTIFACT_DIR||'/workspace/artifacts';
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push(request.url());});
  await page.route(/^https?:\/\//,route=>route.abort());
  await page.setContent(fs.readFileSync(process.env.NATIONCLASH_HTML||path.join(ROOT,'browser/index.html'),'utf8'));
  await page.waitForFunction(()=>NationClash.assetsReady,{},{timeout:60000});
  assert.equal(await page.evaluate(()=>NationClash.catalog.length),196);
  assert.ok(await page.evaluate(()=>NationClash.assets.japanImage.complete&&NationClash.assets.japanImage.naturalWidth>0),'supplied Japan artwork decoded');
  // Pakistan is the world edition's initial player. Select Japan explicitly
  // through the real search/card handlers so this remains a Japan-only preview.
  for(const [id,side]of [['jp',0],['pk',1]]){
   await page.locator(side?'#pick-opponent':'#pick-player').click();
   await page.selectOption('#region-filter','All');
   const country=await page.evaluate(id=>NationClash.catalog.find(c=>c.id===id).country,id);
   await page.locator('#country-search').fill(country);
   const index=await page.evaluate(id=>NationClash.catalog.findIndex(c=>c.id===id),id);
   await page.locator(`[data-fighter="${index}"]`).click();
  }
  await page.locator('#country-search').fill('');
  assert.equal(await page.locator('#selected-left').textContent(),'Japan');
  assert.equal(await page.locator('#selected-right').textContent(),'Pakistan');
  await page.screenshot({path:path.join(OUT,'NationClash-Japan-roster.png'),fullPage:true});
  await page.selectOption('#mode','local');await page.locator('#start').click();
  await page.waitForFunction(()=>NationClash.fight?.phase==='fight');
  await page.locator('#pause').click();await page.evaluate(()=>document.getElementById('overlay').classList.add('hidden'));
  // Freeze the live RAF simulation while taking reproducible impact snapshots.
  // Each pose is driven by the production combat state, not a renderer override.
  for(const [name,command,facing]of [['idle',null,1],['punch','light',1],['kick','heavy',1],['mirrored','light',-1],['block',null,1]]){
   const state=await page.evaluate(({name,command,facing})=>{
    const f=NationClash.fight;f.resetRound();f.phase='fight';f.left.x=0;f.right.x=facing*1.62;
    f.left.facing=facing;f.right.facing=-facing;
    if(name==='block'){f.left.pose='block';f.left.guard=true;}
    if(command){f.step({action:command});for(let i=0;i<40&&f.right.hp===f.right.data.hp;i++)f.step();}
    return {hp:f.right.hp,max:f.right.data.hp,damage:f.right.lastDamage,pose:f.left.move?.id,frame:f.left.moveFrame};
   },{name,command,facing});
   await page.waitForTimeout(60);
   await page.screenshot({path:path.join(OUT,`NationClash-Japan-${name}.png`),fullPage:true});
   if(command){
    assert.ok(state.hp<state.max);assert.ok(state.damage>0);
    assert.equal(await page.locator('#right-hp').textContent(),`${state.hp} / ${state.max} HP`);
    assert.ok(await page.locator('#right-health').evaluate(el=>el.parentElement.classList.contains('damaged')));
   }
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(requests,[],'Japan preview works without external assets');
  console.log('PASS Japan preview: 196-country catalog, supplied art loaded, explicit Japan/Pakistan selection, idle/punch/kick/block, mirrored impact, damage and HP feedback, zero errors/network requests.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
