const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const {ARENAS}=require(path.join(root,'browser/src/arenas.js'));

test('Thirty supplied arena views have distinct names, preserved mappings and varied music',()=>{
  assert.equal(ARENAS.length,30);assert.equal(new Set(ARENAS.map(a=>a.id)).size,30);
  assert.equal(new Set(ARENAS.map(a=>a.name)).size,30);
  assert.ok(ARENAS.some(a=>a.name==='Minar-e-Pakistan'));
  assert.ok(ARENAS.some(a=>a.name==='Times Square'));
  for(const arena of ARENAS){assert.ok(arena.city&&arena.subtitle&&/^#[a-f0-9]{6}$/i.test(arena.accent));assert.ok(arena.music.tempo>=90&&arena.music.tempo<=130);assert.ok(arena.music.scale.length>=5);assert.equal(arena.music.melody.length,8);}
  assert.equal(new Set(ARENAS.map(a=>JSON.stringify(a.music))).size,30);
  assert.equal(ARENAS.filter(a=>a.name.startsWith('Angkor Wat')).length,2,'two supplied views of the same landmark');
  assert.equal(ARENAS.find(a=>a.id==='london').name,'Big Ben');
  assert.equal(ARENAS.find(a=>a.id==='rio').name,'Christ the Redeemer');
  const intake=JSON.parse(fs.readFileSync(path.join(root,'artwork/arenas/intake.json')));
  const metadata=JSON.parse(fs.readFileSync(path.join(root,'browser/assets/arenas/metadata.json')));
  assert.equal(intake.images.length,30);assert.equal(Object.keys(metadata).length,30);
  for(const [i,arena] of ARENAS.entries()){
    const original=intake.images[i],art=metadata[arena.id];
    assert.equal(arena.id,original.id);assert.equal(arena.sourceName,original.originalName);
    assert.ok(arena.sourceName.startsWith(String(i+1).padStart(2,'0')+'_'),'archive menu order is preserved');
    assert.equal(art.originalName,arena.sourceName);assert.equal(art.sourceSha256,original.sha256);
    const source=fs.readFileSync(path.join(root,'artwork/arenas/source',original.originalName));
    assert.equal(crypto.createHash('sha256').update(source).digest('hex'),original.sha256);
    const webp=fs.readFileSync(path.join(root,'browser/assets/arenas',arena.id+'.webp'));
    assert.equal(crypto.createHash('sha256').update(webp).digest('hex'),art.sha256);
    assert.equal(webp.length,art.bytes);assert.equal(art.width,1280);assert.equal(art.height,720);
    assert.ok(arena.floorY>=560&&arena.floorY<=640,'feet stay on the supplied foreground platform');
  }
  assert.equal(new Set(Object.values(metadata).map(a=>a.sourceSha256)).size,30,'no original reused');
  assert.equal(new Set(Object.values(metadata).map(a=>a.sha256)).size,30,'no runtime background reused');
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
    const images=Object.fromEntries(ARENAS.map(a=>[a.id,'data:image/webp;base64,'+fs.readFileSync(path.join(root,'browser/assets/arenas',a.id+'.webp')).toString('base64')]));
    const catalogSource=fs.readFileSync(path.join(root,'browser/src/arena-catalog.js'),'utf8');
    const arenaSource=fs.readFileSync(path.join(root,'browser/src/arenas.js'),'utf8').replace('/* ARENA_IMAGE_DATA */null',()=>JSON.stringify(images));
    let audioSource=fs.readFileSync(path.join(root,'browser/src/audio.js'),'utf8');
    for(const name of ['fight','ko','getready','timeover'])audioSource=audioSource.replace(`/* AUDIO_${name.toUpperCase()}_DATA */`,()=>`data:audio/wav;base64,${fs.readFileSync(path.join(root,'browser/assets/audio',name+'.wav')).toString('base64')}`);
    await page.setContent(`<style>body{margin:0;background:#08121f;color:#f3f5e8;font:14px Segoe UI,Arial}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;padding:16px}canvas{width:100%;border:1px solid #4c6877}p{margin:8px 0 20px}button{margin:16px;padding:16px}</style><div class="grid" id="grid"></div><button id="unlock">Enable original soundtrack</button><script>${catalogSource}</script><script>${arenaSource}</script><script>${audioSource}</script>`);
    await page.evaluate(async()=>{
      window.director=new NationAudio.AudioDirector();document.getElementById('unlock').onclick=()=>director.unlock();
      NationArenas.retain('lahore');await NationArenas.ensure('lahore');
      window.arenaChecks=[];
      for(const a of NationArenas.ARENAS){
        const image=await NationArenas.ensure(a.id),article=document.createElement('article'),canvas=document.createElement('canvas');
        canvas.width=640;canvas.height=360;article.appendChild(canvas);
        const text=document.createElement('p');text.textContent=a.name+' · '+a.city;article.appendChild(text);document.getElementById('grid').appendChild(article);
        NationArenas.drawScene(canvas.getContext('2d'),a.id,12,{width:640,height:360});
        const reference=document.createElement('canvas');reference.width=640;reference.height=360;reference.getContext('2d').drawImage(image,0,0,640,360);
        arenaChecks.push({id:a.id,width:image.naturalWidth,height:image.naturalHeight,pixelsMatch:canvas.toDataURL()===reference.toDataURL(),loaded:NationArenas.loadedIds,retained:NationArenas.retainedId});
      }
      NationArenas.release();
    });
    assert.equal(await page.locator('canvas').count(),30);
    const rendered=await page.evaluate(()=>arenaChecks);
    assert.ok(rendered.every(a=>a.width===1280&&a.height===720&&a.pixelsMatch),'all supplied backgrounds decode and render without overlays or cropping');
    assert.ok(rendered.every(a=>a.loaded.length<=3&&a.loaded.includes('lahore')&&a.retained==='lahore'),'decoded cache stays bounded and preserves the live match');
    assert.equal(await page.evaluate(()=>NationArenas.retainedId),null);
    assert.equal(await page.evaluate(()=>new Set([...document.querySelectorAll('canvas')].map(c=>c.toDataURL())).size),30,'all thirty backgrounds are visually distinct');
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
