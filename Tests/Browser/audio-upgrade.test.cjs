const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const {ARENAS}=require(path.join(root,'browser/src/arenas.js'));
let source=fs.readFileSync(path.join(root,'browser/src/audio.js'),'utf8');
for(const name of ['fight','ko','getready','timeover'])source=source.replace(`/* AUDIO_${name.toUpperCase()}_DATA */`,()=>`data:audio/wav;base64,${fs.readFileSync(path.join(root,'browser/assets/audio',name+'.wav')).toString('base64')}`);
const families=['energy','metal','water','wind','fire','earth','ice','lightning'];

async function fixture(run){
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage(),errors=[];let network=0;
    page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(/^https?:/.test(request.url()))network++;});
    await page.setContent('<button id="unlock">Enable audio</button>');
    await page.addScriptTag({content:source});
    await page.evaluate(({arenas,families})=>{
      window.NationArenas={ARENAS:arenas};
      window.NationPowers={get(id){const index=families.indexOf(id);return {id,name:id+' signature',sound:index<0?'energy':id,seed:index<0?id==='second-energy'?19283:8471:9131+index*139};}};
      window.makeOffline=(duration=1,options={})=>{
        const director=new NationAudio.AudioDirector({volume:.75,...options});
        director._createGraph(new OfflineAudioContext(2,Math.ceil(22050*duration),22050));
        director.active=true;director._canPlay=()=>director.active&&director.enabled&&!director.paused;
        return director;
      };
      window.measure=buffer=>{
        const left=buffer.getChannelData(0),right=buffer.getChannelData(1);let energy=0,peak=0,delta=0,stereo=0,tail=0;
        for(let i=0;i<left.length;i++){
          const sample=left[i];energy+=sample*sample;peak=Math.max(peak,Math.abs(sample),Math.abs(right[i]));
          if(i)delta+=(sample-left[i-1])**2;stereo+=(sample-right[i])**2;
          if(i>left.length-buffer.sampleRate*.1)tail+=sample*sample;
        }
        return {rms:Math.sqrt(energy/left.length),peak,brightness:delta/Math.max(energy,1e-10),stereo:Math.sqrt(stereo/left.length),tail:Math.sqrt(tail/(buffer.sampleRate*.1)),
          fingerprint:Array.from(left.subarray(500,6500)).filter((_,i)=>i%79===0).map(value=>value.toFixed(5)).join(',')};
      };
    },{arenas:ARENAS,families});
    await run(page);
    assert.deepEqual(errors,[],'audio produces no browser errors');assert.equal(network,0,'all audio remains offline');
  }finally{await browser.close();}
}

function writeWav(filename,base64){fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename,Buffer.from(base64,'base64'));}

test('Eight-bar arena score is audible, develops harmonically, and retains headroom under combat',{timeout:60000},async()=>fixture(async page=>{
  const result=await page.evaluate(async()=>{
    const director=makeOffline(20),score=NationArenas.ARENAS[0].music,step=60/score.tempo/4;
    for(let i=0;i<128;i++)director._scheduleStep(i,.05+i*step,score);
    const music=await director.context.startRendering(),metrics=measure(music),left=music.getChannelData(0);
    metrics.barRms=[];
    for(let bar=0;bar<8;bar++){
      let energy=0;const start=Math.floor((.05+bar*16*step)*music.sampleRate),end=Math.floor((.05+(bar+1)*16*step)*music.sampleRate);
      for(let i=start;i<end;i++)energy+=left[i]**2;
      metrics.barRms.push(Math.sqrt(energy/(end-start)));
    }
    const mix=makeOffline(20),mixScore=NationArenas.ARENAS[0].music;
    for(let i=0;i<128;i++)mix._scheduleStep(i,.05+i*step,mixScore);
    for(let i=0;i<8;i++){
      const countryId=['energy','metal','water','wind','fire','earth','ice','lightning'][i],time=1+i*1.8;
      mix.move({move:'signature',countryId},time);mix.impact({move:'signature',countryId,kind:'hit'},time+.4);
      mix.impact({move:i%2?'light':'heavy',kind:'hit'},time+.8);
    }
    mix.impact({move:'ultimate',countryId:'lightning',ultimate:true},17);
    const rendered=await mix.context.startRendering();window.audioPreview=rendered;
    const maximum=makeOffline(3,{volume:1,musicVolume:1,effectsVolume:1});
    for(let i=0;i<20;i++)maximum._scheduleStep(i,.05+i*step,score);
    for(const countryId of ['earth','lightning']){
      maximum.move({move:'signature',countryId},.5);maximum.impact({move:'signature',countryId},.8);
      maximum.impact({move:'ultimate',countryId,ultimate:true},1.2);
    }
    const maximumMix=measure(await maximum.context.startRendering()),arenaRms=[];
    for(const arena of NationArenas.ARENAS){
      const seconds=60/arena.music.tempo/4,venue=makeOffline(seconds*32+.15);
      for(let i=0;i<32;i++)venue._scheduleStep(i<16?i:i+48,.025+i*seconds,arena.music);
      arenaRms.push({id:arena.id,rms:measure(await venue.context.startRendering()).rms});
    }
    return {music:metrics,mix:measure(rendered),maximumMix,arenaRms,counts:mix.debug.signatureCounts};
  });
  assert.ok(result.music.rms>.02,`music is clearly audible at default settings: RMS ${result.music.rms}`);
  assert.ok(result.music.rms<.15,'score leaves room for combat and speech');
  assert.ok(result.music.barRms.every(value=>value>.02),'every bar sustains an audible accompaniment');
  assert.ok(result.music.stereo>.002,'pads and melody produce a restrained stereo field');
  assert.ok(result.mix.peak<.95,`combat mix retains headroom: peak ${result.mix.peak}`);
  assert.ok(result.mix.rms>result.music.rms,'combat remains present above the score');
  assert.ok(result.maximumMix.peak<.98,`simultaneous powers retain headroom at maximum volume: ${result.maximumMix.peak}`);
  assert.ok(result.arenaRms.every(arena=>arena.rms>.02),'all thirty arena tunings remain audible through their low chord changes');
  assert.deepEqual(result.counts,{launch:8,impact:8});
  if(process.env.NATION_AUDIO_ARTIFACT){
    const wav=await page.evaluate(()=>{
      const buffer=audioPreview,channels=buffer.numberOfChannels,length=buffer.length*channels*2,bytes=new Uint8Array(44+length),view=new DataView(bytes.buffer);
      const text=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
      text(0,'RIFF');view.setUint32(4,36+length,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);
      view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*channels*2,true);
      view.setUint16(32,channels*2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,length,true);
      const data=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));let offset=44;
      for(let frame=0;frame<buffer.length;frame++)for(let channel=0;channel<channels;channel++){view.setInt16(offset,Math.round(Math.max(-1,Math.min(1,data[channel][frame]))*32767),true);offset+=2;}
      let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(binary);
    });
    writeWav(process.env.NATION_AUDIO_ARTIFACT,wav);
  }
  console.log(`Audio mix: music RMS ${result.music.rms.toFixed(3)}, combat RMS ${result.mix.rms.toFixed(3)}, peak ${result.mix.peak.toFixed(3)}.`);
}));

test('Punch, kick and eight country power families produce distinct audible attacks with short tails',{timeout:60000},async()=>fixture(async page=>{
  const result=await page.evaluate(async families=>{
    const sounds={};
    for(const family of [...families,'second-energy']){
      const director=makeOffline(.9,{musicVolume:0});
      director.move({move:'signature',countryId:family},.02);director.impact({move:'signature',attackerId:family,kind:'hit'},.39);
      sounds[family]=measure(await director.context.startRendering());
    }
    for(const action of ['light','heavy']){
      const director=makeOffline(.6,{musicVolume:0});director.impact({move:action,kind:'hit'},.02);
      sounds[action]=measure(await director.context.startRendering());
    }
    return sounds;
  },families);
  for(const [name,metrics] of Object.entries(result)){
    assert.ok(metrics.rms>.006,`${name} has audible body`);assert.ok(metrics.peak<.95,`${name} retains headroom`);
    assert.ok(metrics.tail<.0001,`${name} ends cleanly without an excessive tail`);
  }
  assert.equal(new Set(families.map(name=>result[name].fingerprint)).size,8,'element families have distinct waveforms');
  assert.notEqual(result.energy.fingerprint,result['second-energy'].fingerprint,'countries within one family have different tuning');
  assert.ok(result.light.brightness>result.heavy.brightness,'punch has a sharper transient than the deeper kick');
}));

test('Independent mix controls preserve speech ducking, pause position, mute and stop correctness',{timeout:60000},async()=>fixture(async page=>{
  await page.evaluate(()=>{
    window.director=new NationAudio.AudioDirector({volume:.75,musicVolume:.8,effectsVolume:.85});
    document.getElementById('unlock').onclick=()=>director.unlock();
  });
  await page.locator('#unlock').click();await page.waitForFunction(()=>director.debug.decodedCues.length===4&&director.debug.musicRunning);
  assert.equal(await page.evaluate(()=>director.debug.cueCounts.getready),1);
  await page.evaluate(()=>{director.setMusicVolume(.35);director.setEffectsVolume(.6);});
  await page.waitForTimeout(100);
  let state=await page.evaluate(()=>director.debug);
  assert.ok(Math.abs(state.musicGain-.72*.35)<.002);assert.ok(Math.abs(state.effectsGain-.92*.6)<.002);
  assert.equal(state.musicVolume,.35);assert.equal(state.effectsVolume,.6);
  await page.evaluate(()=>director.round({type:'fight',round:1}));
  await page.waitForTimeout(80);
  assert.ok(await page.evaluate(()=>director.debug.musicDucking<.4),'announcer temporarily ducks music');
  await page.evaluate(()=>director.setMusicVolume(.5));await page.waitForTimeout(70);
  assert.ok(Math.abs(await page.evaluate(()=>director.music.gain.value)-.36)<.002,'changing volume during speech updates the selected mix');
  await page.waitForFunction(()=>director.debug.musicDucking>.99,{},{timeout:10000});
  assert.ok(Math.abs(await page.evaluate(()=>director.music.gain.value)-.36)<.002,'duck recovery preserves the chosen music volume');
  await page.evaluate(()=>director.setMusicVolume(0));state=await page.evaluate(()=>director.debug);
  assert.equal(state.musicRunning,false);assert.equal(state.musicSources,0);
  await page.evaluate(()=>{
    window.dispatchEvent(new CustomEvent('nation-move',{detail:{move:'signature',countryId:'fire'}}));
    window.dispatchEvent(new CustomEvent('nation-hit',{detail:{move:'signature',attackerId:'fire',kind:'hit'}}));
  });
  assert.deepEqual(await page.evaluate(()=>director.debug.signatureCounts),{launch:1,impact:1});
  assert.equal(await page.evaluate(()=>director.debug.lastSignature.sound),'fire');
  assert.deepEqual(await page.evaluate(()=>director.debug.impactCounts),{punch:0,kick:0,block:0,throw:0,ultimate:0,tech:0});
  await page.evaluate(()=>{director.setMusicVolume(.6);director.setEffectsVolume(0);});
  state=await page.evaluate(()=>director.debug);
  assert.ok(state.musicRunning);assert.equal(state.effectSources,0);assert.equal(state.activeVoices,0);
  await page.evaluate(()=>director.move({move:'signature',countryId:'ice'}));
  assert.deepEqual(await page.evaluate(()=>director.debug.signatureCounts),{launch:1,impact:1},'effects mute silences powers independently');
  await page.evaluate(()=>director.setEffectsVolume(.85));await page.waitForTimeout(200);
  const beforePause=await page.evaluate(()=>director.debug);
  await page.evaluate(()=>director.setPaused(true));state=await page.evaluate(()=>director.debug);
  assert.equal(state.contextState,'suspended');assert.equal(state.activeSources,0);assert.equal(state.musicRunning,false);
  const pausedStep=state.musicStep;
  await page.evaluate(()=>director.setPaused(false));await page.waitForFunction(()=>director.debug.musicRunning);
  state=await page.evaluate(()=>director.debug);
  assert.ok((state.musicStep-pausedStep+128)%128<=2,'pause resumes the current phrase');
  assert.deepEqual(state.cueCounts,beforePause.cueCounts,'resume does not replay announcements');
  const switched=await page.evaluate(()=>{const old=[...director._musicNodes];director.setArena('rio');return {oldStopped:old.every(node=>!director._nodes.has(node)),state:director.debug};});
  assert.ok(switched.oldStopped,'arena changes disconnect notes from the old score');assert.equal(switched.state.arena,'rio');assert.ok(switched.state.musicRunning);
  await page.evaluate(()=>{director.setEnabled(false);director.setVolume(.4);director.setMusicVolume(.8);director.setEffectsVolume(.7);});
  await page.waitForTimeout(100);state=await page.evaluate(()=>director.debug);
  assert.equal(state.volume,0);assert.equal(state.activeSources,0);assert.equal(state.musicRunning,false);
  assert.ok(await page.evaluate(()=>director.master.gain.value<.001),'mix changes never undo master mute');
  await page.evaluate(()=>director.setEnabled(true));await page.waitForFunction(()=>director.debug.musicRunning);
  assert.equal(await page.evaluate(()=>director.debug.volume),.4);
  await page.evaluate(()=>director.stop());await page.waitForFunction(()=>director.debug.contextState==='suspended');
  state=await page.evaluate(()=>director.debug);assert.equal(state.active,false);assert.equal(state.activeSources,0);assert.equal(state.musicRunning,false);
  await page.evaluate(()=>director.dispose());
}));

test('Stopping an unlock in progress cannot restart its music or announcements',{timeout:30000},async()=>fixture(async page=>{
  const result=await page.evaluate(async()=>{
    const director=new NationAudio.AudioDirector();let complete;
    director._loadClips=()=>new Promise(resolve=>{complete=resolve;});
    const unlocking=director.unlock();director.stop();complete();await unlocking;
    await new Promise(resolve=>setTimeout(resolve,60));const state=director.debug;await director.dispose();return state;
  });
  assert.equal(result.active,false);assert.equal(result.musicRunning,false);assert.equal(result.activeSources,0);
  assert.deepEqual(result.cueCounts,{fight:0,ko:0,getready:0,timeover:0});
}));
