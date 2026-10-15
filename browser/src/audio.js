(function(root){
  'use strict';
  // Original spoken cues are embedded by the standalone builder. The score and
  // combat sounds are synthesized locally; nothing is fetched or streamed.
  const CLIPS={fight:'/* AUDIO_FIGHT_DATA */',ko:'/* AUDIO_KO_DATA */',getready:'/* AUDIO_GETREADY_DATA */',timeover:'/* AUDIO_TIMEOVER_DATA */'};
  const FALLBACK_SCORE={tempo:108,key:50,scale:[0,2,3,7,8],melody:[0,2,4,3,2,1,0,3]};
  const MUSIC_LEVEL=.72,EFFECTS_LEVEL=.92,VOICE_LEVEL=.94;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const note=midi=>440*Math.pow(2,(midi-69)/12);
  const hash=value=>{let seed=2166136261;for(const char of String(value||'world'))seed=Math.imul(seed^char.charCodeAt(0),16777619);return seed>>>0;};
  const volume=(value,fallback)=>Number.isFinite(Number(value))?clamp(Number(value),0,1):fallback;

  class AudioDirector{
    constructor(options={}){
      this.enabled=options.enabled!==false;this.volume=volume(options.volume,.8);
      this.musicVolume=volume(options.musicVolume,.8);this.effectsVolume=volume(options.effectsVolume,.85);
      this.paused=false;this.active=false;this.context=null;this.arena='lahore';this.buffers={};this.lastError=null;
      this.cueCounts={fight:0,ko:0,getready:0,timeover:0};
      // Keep these keys stable: callers use these counters to verify real hits.
      this.impactCounts={punch:0,kick:0,block:0,throw:0,ultimate:0,tech:0};
      this.signatureCounts={launch:0,impact:0};this.lastSignature=null;
      this._nodes=new Set();this._musicNodes=new Set();this._effectNodes=new Set();this._voices=new Set();
      this._timer=null;this._load=null;this._generation=0;this._playbackToken=0;this._cueKeys=new Set();
      this._step=0;this._nextStep=0;this._timeline=[];this._strike=0;
      this._onMove=event=>this.move(event.detail||{});this._onHit=event=>this.impact(event.detail||{});this._onRound=event=>this.round(event.detail||{});
      root.addEventListener?.('nation-move',this._onMove);root.addEventListener?.('nation-hit',this._onHit);root.addEventListener?.('nation-round',this._onRound);
    }
    get debug(){
      return {enabled:this.enabled,active:this.active,paused:this.paused,contextState:this.context?.state||'uninitialized',
        volume:this.enabled?this.volume:0,musicVolume:this.musicVolume,effectsVolume:this.effectsVolume,
        musicGain:this.music?.gain.value??MUSIC_LEVEL*this.musicVolume,effectsGain:this.effects?.gain.value??EFFECTS_LEVEL*this.effectsVolume,
        musicDucking:this.musicDuck?.gain.value??1,musicRunning:this._timer!==null,musicStep:this._step%128,
        activeVoices:this._voices.size,activeSources:this._nodes.size,musicSources:this._musicNodes.size,effectSources:this._effectNodes.size,
        cueCounts:{...this.cueCounts},impactCounts:{...this.impactCounts},signatureCounts:{...this.signatureCounts},
        lastSignature:this.lastSignature?{...this.lastSignature}:null,decodedCues:Object.keys(this.buffers),arena:this.arena,lastError:this.lastError};
    }
    _createGraph(context){
      this.context=context;this.master=context.createGain();this.music=context.createGain();this.musicDuck=context.createGain();
      this.effects=context.createGain();this.voice=context.createGain();
      const compressor=context.createDynamicsCompressor();compressor.threshold.value=-13;compressor.knee.value=18;
      compressor.ratio.value=4;compressor.attack.value=.003;compressor.release.value=.16;
      // Two simultaneous ultimates at full volume can outrun a compressor's
      // attack. This transparent lower range rounds only peaks above 0.70.
      const limiter=context.createWaveShaper(),curve=new Float32Array(2049);
      for(let i=0;i<curve.length;i++){
        const x=i/(curve.length-1)*2-1,absolute=Math.abs(x);
        curve[i]=absolute<=.7?x:Math.sign(x)*(.7+.24*(1-Math.exp(-(absolute-.7)/.24)));
      }
      limiter.curve=curve;limiter.oversample='2x';
      this.master.gain.value=this.enabled?this.volume:0;this.music.gain.value=MUSIC_LEVEL*this.musicVolume;
      this.effects.gain.value=EFFECTS_LEVEL*this.effectsVolume;this.voice.gain.value=VOICE_LEVEL*this.effectsVolume;
      this.music.connect(this.musicDuck);this.musicDuck.connect(this.master);this.effects.connect(this.master);this.voice.connect(this.master);
      this.master.connect(compressor);compressor.connect(limiter);limiter.connect(context.destination);
      this._noiseBuffer=context.createBuffer(1,Math.ceil(context.sampleRate*1.2),context.sampleRate);
      const samples=this._noiseBuffer.getChannelData(0);let seed=8471;
      for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=seed/2147483648-1;}
    }
    async unlock(){
      const fresh=!this.active;this.active=true;this.paused=false;
      if(fresh){this._generation++;this._playbackToken++;this._cueKeys.clear();this._step=0;}
      const generation=this._generation,token=this._playbackToken;
      try{
        if(!this.context){
          const Constructor=root.AudioContext||root.webkitAudioContext;
          if(!Constructor)throw new Error('Web Audio is unavailable in this browser.');
          this._createGraph(new Constructor());this._load=this._loadClips();
        }
        this._setGain(this.master,this.enabled?this.volume:0);
        await this.context.resume();
        if(generation!==this._generation||!this.active)return this.debug;
        if(this.enabled&&!this.paused)this._startMusic();
        await this._load;
        if(fresh&&generation===this._generation&&token===this._playbackToken&&this._canEffects())this._announce('getready');
      }catch(error){this.lastError=error.message;this._stopMusic();}
      return this.debug;
    }
    async _loadClips(){
      await Promise.all(Object.entries(CLIPS).map(async([key,data])=>{
        if(!data.startsWith('data:audio/wav;base64,')){this.lastError='Announcer audio has not been bundled.';return;}
        try{
          const binary=root.atob(data.split(',')[1]),bytes=new Uint8Array(binary.length);
          for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
          this.buffers[key]=await this.context.decodeAudioData(bytes.buffer);
        }catch(error){this.lastError=`Unable to decode ${key} announcement: ${error.message}`;}
      }));
    }
    _setGain(bus,value){
      if(!this.context||!bus)return;const time=this.context.currentTime;
      bus.gain.cancelScheduledValues(time);bus.gain.setTargetAtTime(value,time,.012);
    }
    setEnabled(enabled){
      this.enabled=!!enabled;if(!this.context)return this.debug;
      this._setGain(this.master,this.enabled?this.volume:0);
      if(!this.enabled){this._playbackToken++;this._stopMusic();this._stopNodes();this._resetDuck();}
      else if(this.active&&!this.paused)this.context.resume().then(()=>this._startMusic()).catch(error=>{this.lastError=error.message;});
      return this.debug;
    }
    setVolume(value){
      if(!Number.isFinite(Number(value)))return this.debug;
      this.volume=volume(value,this.volume);this._setGain(this.master,this.enabled?this.volume:0);return this.debug;
    }
    setMusicVolume(value){
      if(!Number.isFinite(Number(value)))return this.debug;
      this.musicVolume=volume(value,this.musicVolume);this._setGain(this.music,MUSIC_LEVEL*this.musicVolume);
      if(!this.musicVolume)this._stopMusic();else this._startMusic();return this.debug;
    }
    setEffectsVolume(value){
      if(!Number.isFinite(Number(value)))return this.debug;
      this.effectsVolume=volume(value,this.effectsVolume);
      this._setGain(this.effects,EFFECTS_LEVEL*this.effectsVolume);this._setGain(this.voice,VOICE_LEVEL*this.effectsVolume);
      if(!this.effectsVolume){this._playbackToken++;this._stopNodes('effects');this._stopNodes('voice');this._resetDuck();}
      return this.debug;
    }
    setPaused(paused){
      this.paused=!!paused;if(!this.context)return Promise.resolve(this.debug);
      if(this.paused){
        this._playbackToken++;this._stopMusic();this._stopNodes();this._resetDuck();
        return this.context.suspend().then(()=>this.debug).catch(error=>{this.lastError=error.message;return this.debug;});
      }
      if(this.active)return this.context.resume().then(()=>{this._startMusic();return this.debug;}).catch(error=>{this.lastError=error.message;return this.debug;});
      return Promise.resolve(this.debug);
    }
    setArena(id){this._stopMusic();this.arena=id;this._step=0;this._startMusic();return this.arena;}
    stop(){
      this.active=false;this.paused=false;this._generation++;this._playbackToken++;
      this._stopMusic();this._stopNodes();this._resetDuck();this._cueKeys.clear();this._step=0;
      if(this.context&&this.context.state!=='closed')this.context.suspend().catch(error=>{this.lastError=error.message;});return this.debug;
    }
    dispose(){
      this.stop();root.removeEventListener?.('nation-move',this._onMove);root.removeEventListener?.('nation-hit',this._onHit);root.removeEventListener?.('nation-round',this._onRound);
      return this.context?.close();
    }
    _canPlay(){return this.active&&this.enabled&&!this.paused&&this.context?.state==='running';}
    _canEffects(){return this._canPlay()&&this.effectsVolume>0;}
    _track(source,bus,graph=[]){
      const group=bus===this.music?this._musicNodes:bus===this.voice?this._voices:this._effectNodes;
      this._nodes.add(source);group.add(source);
      source._nationDisconnect=()=>{
        this._nodes.delete(source);group.delete(source);
        for(const node of [source,...graph]){try{node.disconnect();}catch{}}
      };
      source.onended=source._nationDisconnect;return source;
    }
    _stopNodes(group){
      const nodes=group==='music'?this._musicNodes:group==='effects'?this._effectNodes:group==='voice'?this._voices:this._nodes;
      for(const source of [...nodes]){try{source.stop();}catch{}source._nationDisconnect();}
    }
    _envelope(gain,time,duration,level,attack=.004,sustain=0){
      const peak=Math.max(.00002,level),end=time+duration;
      gain.gain.setValueAtTime(.00001,time);gain.gain.exponentialRampToValueAtTime(peak,time+Math.min(attack,duration*.4));
      if(sustain)gain.gain.exponentialRampToValueAtTime(peak*.62,time+duration*sustain);
      gain.gain.exponentialRampToValueAtTime(.00001,end);
    }
    _connect(source,gain,bus,options){
      const graph=[gain];let output=source;
      if(options.cutoff){
        const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(options.cutoff,options.time);
        filter.Q.value=.65;output.connect(filter);output=filter;graph.push(filter);
      }
      output.connect(gain);output=gain;
      if(options.pan&&this.context.createStereoPanner){const pan=this.context.createStereoPanner();pan.pan.value=options.pan;output.connect(pan);output=pan;graph.push(pan);}
      output.connect(bus);this._track(source,bus,graph);
    }
    _tone(freq,end,duration,type='sine',level=.15,bus=this.effects,time=this.context.currentTime,options={}){
      const source=this.context.createOscillator(),gain=this.context.createGain();source.type=type;
      source.frequency.setValueAtTime(Math.max(20,freq),time);source.frequency.exponentialRampToValueAtTime(Math.max(20,end),time+duration);
      if(options.detune)source.detune.value=options.detune;
      this._envelope(gain,time,duration,level,options.attack??.004,options.sustain||0);
      this._connect(source,gain,bus,{...options,time});source.start(time);source.stop(time+duration+.015);return source;
    }
    _noise(duration,cutoff=1600,level=.18,bus=this.effects,time=this.context.currentTime,highpass=0,options={}){
      const source=this.context.createBufferSource(),filter=this.context.createBiquadFilter(),gain=this.context.createGain();
      source.buffer=this._noiseBuffer;source.loop=duration>this._noiseBuffer.duration;
      filter.type=highpass?'highpass':'lowpass';filter.frequency.setValueAtTime(cutoff,time);filter.Q.value=.6;
      if(options.endCutoff)filter.frequency.exponentialRampToValueAtTime(options.endCutoff,time+duration);
      this._envelope(gain,time,duration,level,options.attack??.002,options.sustain||0);
      source.connect(filter);filter.connect(gain);gain.connect(bus);this._track(source,bus,[filter,gain]);
      source.start(time,(options.offset||0)%Math.max(.01,this._noiseBuffer.duration-duration));source.stop(time+duration+.015);return source;
    }
    _power(detail){
      const countryId=detail.countryId||detail.actorId||detail.attackerId||detail.attacker||'world';
      let power;try{power=root.NationPowers?.get(countryId);}catch{}
      return {countryId,name:power?.name||'World Pulse',sound:power?.sound||'energy',seed:Number(power?.seed)||hash(countryId)};
    }
    _powerSound(detail,phase,time){
      const power=this._power(detail),seed=power.seed>>>0,shift=.88+((seed>>>8)&65535)/65535*.24;
      const hit=phase==='impact',ultimate=phase==='ultimate',duration=(ultimate?.52:hit?.26:.32)*(.92+(seed&15)*.01);
      const level=ultimate?.23:hit?.17:.12,base=(hit?125:190)*shift,bus=this.effects;
      this.lastSignature={countryId:power.countryId,name:power.name,sound:power.sound};
      // Element families remain recognizable, with country-specific tuning.
      switch(power.sound){
        case 'lightning':
          for(let i=0;i<3;i++)this._tone(base*(3+i*.42),base*(1+i*.2),.065+i*.022,'sawtooth',level*.5,bus,time+i*.046,{cutoff:3100+i*300});
          this._noise(duration*.7,3300,level*.75,bus,time,1);break;
        case 'fire':
          this._noise(duration,1100,level*1.4,bus,time,0,{endCutoff:3100,attack:.016});
          this._tone(base*.7,base*2.6,duration,'sawtooth',level*.65,bus,time,{cutoff:1400});break;
        case 'ice':
          for(const [i,ratio] of [1,1.501,2.004,2.67].entries())this._tone(base*ratio*2,base*ratio*1.98,duration*.9,'sine',level*(.62-i*.09),bus,time+i*.026,{pan:(i%2?1:-1)*.22});
          this._noise(.09,5700,level*.45,bus,time,1);break;
        case 'water':
          this._noise(duration,1700,level*.7,bus,time,0,{endCutoff:550,attack:.022});
          for(let i=0;i<3;i++)this._tone(base*(1.6+i*.55),base*(.65+i*.2),.14,'sine',level*.65,bus,time+i*.055);break;
        case 'wind':
          this._noise(duration,650,level*1.2,bus,time,0,{endCutoff:4400,attack:.032});
          this._tone(base*3.2,base*1.5,duration,'sine',level*.4,bus,time,{attack:.035});break;
        case 'earth':
          this._noise(duration*.8,650,level*1.45,bus,time);
          this._tone(base*.65,30,duration,'sine',level*1.9,bus,time);
          this._tone(base*1.15,base*.45,duration*.6,'triangle',level*.5,bus,time+.022);break;
        case 'metal':
          for(const [i,ratio] of [1,1.39,2.11,2.91].entries())this._tone(base*ratio*2.4,base*ratio*2.25,duration*(1-i*.13),'sine',level*(.8-i*.13),bus,time+i*.007);
          this._noise(.045,4100,level*.9,bus,time,1);break;
        default:
          this._tone(base,base*3,duration,'triangle',level*.8,bus,time,{attack:.018,pan:-.13});
          this._tone(base*1.5,base*4.5,duration*.92,'sine',level*.6,bus,time+.024,{pan:.13});
          this._noise(duration*.7,2100,level*.5,bus,time,0,{endCutoff:4500,attack:.02});
      }
      if(hit||ultimate){
        this._tone(ultimate?95:135,ultimate?27:45,ultimate?.38:.15,'sine',ultimate?.43:.29,bus,time);
        this._noise(ultimate?.24:.085,ultimate?1450:2400,ultimate?.25:.17,bus,time);
      }
    }
    move(detail={},time=this.context?.currentTime||0){
      if(!this._canEffects())return;const action=detail.move||detail.action;
      if(action==='signature'){this.signatureCounts.launch++;this._powerSound(detail,'launch',time);}
      else if(action==='ultimate'){this._powerSound(detail,'ultimate',time);this._tone(95,470,.26,'triangle',.09,this.effects,time);}
      else if(action==='special')this._powerSound(detail,'launch',time);
      else if(action!=='throw'){
        const heavy=action==='heavy'||action==='break';
        this._noise(heavy?.13:.075,heavy?2200:3300,heavy?.11:.075,this.effects,time,1,{endCutoff:heavy?950:1800});
      }
    }
    impact(detail={},time=this.context?.currentTime||0){
      if(!this._canEffects())return;const action=detail.move||detail.action,kind=detail.kind;
      if(kind==='block'){
        this.impactCounts.block++;this._noise(.075,3600,.22,this.effects,time,1);
        for(const [i,freq] of [780,1217,1840].entries())this._tone(freq,freq*.87,.085+i*.024,'sine',.13/(i+1),this.effects,time);
        return;
      }
      if(kind==='tech'){
        this.impactCounts.tech++;this._tone(560,1120,.11,'sine',.14,this.effects,time);this._tone(840,1680,.13,'sine',.09,this.effects,time+.014);return;
      }
      if(kind==='throw'){
        this.impactCounts.throw++;this._noise(.19,1050,.34,this.effects,time);this._tone(125,31,.26,'sine',.46,this.effects,time);this._tone(260,80,.08,'triangle',.08,this.effects,time);return;
      }
      if(detail.ultimate||action==='ultimate'){this.impactCounts.ultimate++;this._powerSound(detail,'ultimate',time);return;}
      if(action==='signature'){this.signatureCounts.impact++;this._powerSound(detail,'impact',time);return;}
      const kick=action==='heavy'||action==='break'||(action==='light'&&detail.style==='Kicker'),variation=1+(this._strike++%3-1)*.045;
      if(kick){
        this.impactCounts.kick++;this._noise(.14,1350,.32,this.effects,time);this._tone(115*variation,34,.2,'sine',.44,this.effects,time);
        this._tone(245,65,.085,'triangle',.1,this.effects,time);this._noise(.027,3200,.16,this.effects,time,1);
      }else{
        this.impactCounts.punch++;this._noise(.045,2700,.28,this.effects,time,1);this._noise(.075,1050,.18,this.effects,time);
        this._tone(185*variation,57,.105,'sine',.31,this.effects,time);this._tone(330,100,.055,'triangle',.065,this.effects,time);
      }
    }
    round(detail){
      if(!this.active)return;const type=detail.type||(detail.phase==='fight'?'fight':'round-end');
      // The final KO emits both events. Only its round result announces.
      if(type==='match-end')return;
      const key=`${this._generation}:${detail.round||1}:${type}`;if(this._cueKeys.has(key))return;this._cueKeys.add(key);
      if(type==='fight')this._announce('fight');
      else if(type==='round-end'){
        const reason=detail.reason||'';if(/KO|KNOCKOUT/.test(reason))this._announce('ko');else if(/TIME|DRAW/.test(reason))this._announce('timeover');
      }
    }
    _resetDuck(){
      if(!this.musicDuck)return;const time=this.context.currentTime;
      this.musicDuck.gain.cancelScheduledValues(time);this.musicDuck.gain.setValueAtTime(1,time);
    }
    _announce(name){
      if(!this._canEffects())return;const generation=this._generation,token=this._playbackToken;
      if(!this.buffers[name]){
        this._load?.then(()=>{if(generation===this._generation&&token===this._playbackToken&&this.buffers[name])this._announce(name);});return;
      }
      this._stopNodes('voice');
      const time=this.context.currentTime,source=this.context.createBufferSource();source.buffer=this.buffers[name];
      source.connect(this.voice);this._track(source,this.voice);source.start(time);this.cueCounts[name]++;
      this.musicDuck.gain.cancelScheduledValues(time);this.musicDuck.gain.setTargetAtTime(.3,time,.018);
      this.musicDuck.gain.setTargetAtTime(1,time+source.buffer.duration+.1,.09);
      if(name==='fight'){this._tone(220,440,.17,'triangle',.07,this.effects,time);this._tone(330,660,.18,'triangle',.045,this.effects,time);}
      if(name==='ko'){this._tone(147,37,.32,'sine',.24,this.effects,time);this._noise(.18,1600,.12,this.effects,time);}
    }
    _score(){return root.NationArenas?.ARENAS.find(arena=>arena.id===this.arena)?.music||FALLBACK_SCORE;}
    _startMusic(){
      if(!this._canPlay()||!this.musicVolume||this._timer!==null)return;
      this._nextStep=this.context.currentTime+.045;this._timeline=[];
      this._timer=root.setInterval(()=>this._scheduleMusic(),35);this._scheduleMusic();
    }
    _stopMusic(){
      if(this._timer!==null){root.clearInterval(this._timer);this._timer=null;}
      if(this.context){const pending=this._timeline.find(event=>event.time>this.context.currentTime+.005);if(pending)this._step=pending.step;}
      this._timeline=[];this._stopNodes('music');
    }
    _scheduleMusic(){
      if(!this._canPlay()||!this.musicVolume){this._stopMusic();return;}
      const score=this._score(),stepSeconds=60/score.tempo/4,time=this.context.currentTime;
      // A throttled background tab must never enqueue minutes of old notes.
      if(this._nextStep<time-.18)this._nextStep=time+.025;
      this._timeline=this._timeline.filter(event=>event.time>time-.05);
      let scheduled=0;
      while(this._nextStep<time+.15&&scheduled++<12){
        this._timeline.push({step:this._step,time:this._nextStep});this._scheduleStep(this._step,this._nextStep,score);
        this._step++;this._nextStep+=stepSeconds;
      }
    }
    _scheduleStep(index,time,score=this._score()){
      const step=index%128,beat=step%16,bar=Math.floor(step/16),seconds=60/score.tempo/4;
      const minor=score.scale.includes(3)&&!score.scale.includes(4),progression=minor?[0,0,-4,-4,-7,-7,-5,-5]:[0,0,-3,-3,-5,-5,-7,-7];
      const chordRoot=score.key+progression[bar],chordMinor=minor?(bar<2||bar===4||bar===5):(bar===2||bar===3);
      const third=chordMinor?3:4,phrase=bar%2,music=this.music;
      if(beat===0){
        // Gently spread detuned pads carry harmony without a reverb tail.
        for(const [i,interval] of [0,third,7,12].entries())for(const side of [-1,1]){
          const pitch=note(chordRoot+interval);
          this._tone(pitch,pitch,seconds*15.5,'triangle',i===0?.037:.027,music,time,{attack:.11,sustain:.72,cutoff:1150,detune:side*4,pan:side*.42});
        }
      }
      if([0,3,6,8,10,14].includes(beat)){
        const interval=beat===6?7:beat===14?(phrase?12:7):0,bass=note(chordRoot-12+interval),length=seconds*(beat===3?1.35:2.1);
        this._tone(bass,bass*.999,length,'sine',.24,music,time,{attack:.009,sustain:.35});
        this._tone(bass*2,bass*2,length*.8,'triangle',.055,music,time,{cutoff:700,attack:.008});
      }
      const melodySteps=phrase?[0,3,6,8,11,14]:[0,2,6,8,10,14];
      if(melodySteps.includes(beat)){
        const motif=score.melody[(Math.floor(beat/2)+bar*2)%score.melody.length],arpeggio=[0,third,7,12,third+12];
        const interval=arpeggio[motif%arpeggio.length],pitch=note(chordRoot+12+interval),length=seconds*(beat===14?2.4:1.65),pan=(beat%4?1:-1)*.19;
        this._tone(pitch,pitch,length,'triangle',.13,music,time,{attack:.006,cutoff:2600,pan});
        this._tone(pitch*2,pitch*2,length*.55,'sine',.025,music,time+.009,{pan:-pan});
      }
      // Dry drums leave headroom for the actual combat impacts.
      if([0,6,8].includes(beat)||(beat===14&&phrase)){
        this._tone(145,38,.15,'sine',.34,music,time);this._noise(.018,1900,.055,music,time);
      }
      if(beat===4||beat===12){
        this._noise(.105,1600,.18,music,time,1);this._tone(175,110,.075,'triangle',.075,music,time);
        this._noise(.026,4200,.07,music,time+.018,1);
      }
      if(beat%2===0||beat===7||beat===15){
        const open=beat===10&&phrase;
        this._noise(open?.105:.028,6500,beat%4===0?.066:.044,music,time,1,{offset:(step%7)*.021});
      }
      if(bar===7&&beat>=14)this._noise(.045,3400,.075,music,time,1);
    }
  }
  const api={AudioDirector,CLIP_NAMES:Object.keys(CLIPS)};root.NationAudio=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
