const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const {ARENAS}=require(path.join(root,'browser/src/arenas.js'));

test('Ten unique, recognizable venues have varied original musical arrangements',()=>{
  assert.equal(ARENAS.length,10);assert.equal(new Set(ARENAS.map(a=>a.id)).size,10);
  assert.ok(ARENAS.some(a=>a.name==='Minar-e-Pakistan'));
  assert.ok(ARENAS.some(a=>a.name==='Times Square'));
  for(const arena of ARENAS){assert.ok(arena.city&&arena.subtitle&&/^#[a-f0-9]{6}$/i.test(arena.accent));assert.ok(arena.music.tempo>=90&&arena.music.tempo<=130);assert.ok(arena.music.scale.length>=5);assert.equal(arena.music.melody.length,8);}
  assert.equal(new Set(ARENAS.map(a=>JSON.stringify(a.music))).size,10);
});

test('Original offline announcer WAVs have valid PCM headers and non-silent samples',()=>{
  for(const name of ['fight','ko','getready','timeover']){
    const wav=fs.readFileSync(path.join(root,'browser/assets/audio',name+'.wav'));
    assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');
    let data=null;for(let offset=12;offset+8<wav.length;){const chunk=wav.toString('ascii',offset,offset+4),size=wav.readUInt32LE(offset+4);if(chunk==='data'){data=wav.subarray(offset+8,offset+8+size);break;}offset+=8+size+(size%2);}
    assert.ok(data&&data.length>20000,`${name} contains actual speech samples`);let peak=0;for(let i=0;i<data.length-1;i+=2)peak=Math.max(peak,Math.abs(data.readInt16LE(i)));assert.ok(peak>1000,`${name} is audible`);
  }
});

test('Real browser renders every landmark and correctly manages music and spoken announcements',{timeout:60000},async()=>{
  const {chromium}=require('playwright');
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1920,height:790}}),errors=[];let network=0;
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network++;});
    const arenaSource=fs.readFileSync(path.join(root,'browser/src/arenas.js'),'utf8');
    let audioSource=fs.readFileSync(path.join(root,'browser/src/audio.js'),'utf8');
    for(const name of ['fight','ko','getready','timeover'])audioSource=audioSource.replace(`/* AUDIO_${name.toUpperCase()}_DATA */`,()=>`data:audio/wav;base64,${fs.readFileSync(path.join(root,'browser/assets/audio',name+'.wav')).toString('base64')}`);
    await page.setContent(`<style>body{margin:0;background:#08121f;color:#f3f5e8;font:14px Segoe UI,Arial}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;padding:16px}canvas{width:100%;border:1px solid #4c6877}p{margin:8px 0 20px}button{margin:16px;padding:16px}</style><div class="grid" id="grid"></div><button id="unlock">Enable original soundtrack</button><script>${arenaSource}</script><script>${audioSource}</script><script>window.director=new NationAudio.AudioDirector();document.getElementById('unlock').onclick=()=>director.unlock();for(const a of NationArenas.ARENAS){const article=document.createElement('article'),canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;article.appendChild(canvas);const text=document.createElement('p');text.textContent=a.name+' · '+a.city;article.appendChild(text);document.getElementById('grid').appendChild(article);NationArenas.drawScene(canvas.getContext('2d'),a.id,12,{width:640,height:360});}</script>`);
    assert.equal(await page.locator('canvas').count(),10);
    assert.equal(await page.evaluate(()=>new Set([...document.querySelectorAll('canvas')].map(c=>c.toDataURL())).size),10,'all ten backgrounds are visually distinct');
    assert.ok(await page.evaluate(()=>[...document.querySelectorAll('canvas')].every(c=>c.getContext('2d').getTransform().isIdentity)),'render does not leak transforms');
    fs.mkdirSync('/workspace/artifacts',{recursive:true});await page.screenshot({path:'/workspace/artifacts/NationClash-world-arenas.png',fullPage:true});
    await page.locator('#unlock').click();await page.waitForFunction(()=>director.debug.decodedCues.length===4&&director.debug.musicRunning);
    assert.equal(await page.evaluate(()=>director.debug.contextState),'running');assert.equal(await page.evaluate(()=>director.debug.cueCounts.getready),1);
    assert.equal(await page.evaluate(()=>director.setVolume(.35).volume),.35);await page.waitForTimeout(80);assert.ok(await page.evaluate(()=>Math.abs(director.master.gain.value-.35)<.01),'volume slider updates actual master gain');
    assert.equal(await page.evaluate(()=>director.setVolume(2).volume),1);assert.equal(await page.evaluate(()=>director.setVolume(-1).volume),0);assert.equal(await page.evaluate(()=>director.setVolume(.8).volume),.8);
    await page.evaluate(()=>{window.dispatchEvent(new CustomEvent('nation-round',{detail:{type:'fight',round:1,phase:'fight'}}));window.dispatchEvent(new CustomEvent('nation-round',{detail:{type:'fight',round:1,phase:'fight'}}));});
    assert.equal(await page.evaluate(()=>director.debug.cueCounts.fight),1,'Fight announces once despite duplicate event');
    await page.evaluate(()=>{for(const detail of [{kind:'hit',move:'light'},{kind:'hit',move:'heavy'},{kind:'block',move:'light'},{kind:'throw',move:'throw'},{kind:'tech',move:'throw'},{kind:'hit',move:'ultimate',ultimate:true}])window.dispatchEvent(new CustomEvent('nation-hit',{detail}));});
    assert.deepEqual(await page.evaluate(()=>director.debug.impactCounts),{punch:1,kick:1,block:1,throw:1,ultimate:1,tech:1});
    await page.evaluate(()=>director.setPaused(true));await page.waitForFunction(()=>director.debug.contextState==='suspended');
    assert.equal(await page.evaluate(()=>director.debug.musicRunning),false);assert.equal(await page.evaluate(()=>director.debug.activeVoices),0);
    await page.evaluate(()=>director.setPaused(false));await page.waitForFunction(()=>director.debug.musicRunning);
    assert.equal(await page.evaluate(()=>director.debug.cueCounts.fight),1,'Resume does not repeat fight speech');
    await page.evaluate(()=>{window.dispatchEvent(new CustomEvent('nation-round',{detail:{type:'round-end',round:1,reason:'KNOCKOUT'}}));window.dispatchEvent(new CustomEvent('nation-round',{detail:{type:'match-end',round:1,reason:'KNOCKOUT'}}));});
    assert.equal(await page.evaluate(()=>director.debug.cueCounts.ko),1,'Final KO emits one voice despite round/match events');
    await page.evaluate(()=>director.setEnabled(false));assert.equal(await page.evaluate(()=>director.debug.volume),0);assert.equal(await page.evaluate(()=>director.debug.musicRunning),false);assert.equal(await page.evaluate(()=>director.debug.activeVoices),0);
    assert.equal(await page.evaluate(()=>director.setVolume(.4).volume),0,'volume adjustment cannot unmute disabled sound');await page.waitForTimeout(80);assert.ok(await page.evaluate(()=>director.master.gain.value<.001));
    await page.evaluate(()=>director.setEnabled(true));await page.waitForFunction(()=>director.debug.musicRunning);
    assert.equal(await page.evaluate(()=>director.debug.volume),.4,'unmute preserves last selected volume');
    await page.evaluate(()=>director.setArena('rio'));assert.equal(await page.evaluate(()=>director.debug.arena),'rio');
    await page.evaluate(()=>director.stop());assert.equal(await page.evaluate(()=>director.debug.active),false);assert.equal(await page.evaluate(()=>director.debug.musicRunning),false);
    await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>director.debug.activeVoices),0);assert.deepEqual(errors,[]);assert.equal(network,0);
    await page.evaluate(()=>director.dispose());
  }finally{await browser.close();}
});
