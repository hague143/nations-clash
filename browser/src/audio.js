(function(root){
  'use strict';
  // These original spoken cues are embedded by the standalone builder. No fetch,
  // browser speech service, streaming service or installed voice is required.
  const CLIPS={fight:'/* AUDIO_FIGHT_DATA */',ko:'/* AUDIO_KO_DATA */',getready:'/* AUDIO_GETREADY_DATA */',timeover:'/* AUDIO_TIMEOVER_DATA */'};
  const FALLBACK_SCORE={tempo:108,key:50,scale:[0,2,3,7,8],melody:[0,2,4,3,2,1,0,3]};
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const note=midi=>440*Math.pow(2,(midi-69)/12);
  class AudioDirector{
    constructor(options={}){
      this.enabled=options.enabled!==false;this.volume=clamp(options.volume??.8,0,1);this.paused=false;this.active=false;
      this.context=null;this.arena='lahore';this.buffers={};this.cueCounts={fight:0,ko:0,getready:0,timeover:0};this.impactCounts={punch:0,kick:0,block:0,throw:0,ultimate:0,tech:0};this.lastError=null;
      this._nodes=new Set();this._voices=new Set();this._timer=null;this._load=null;this._generation=0;this._cueKeys=new Set();
      this._onMove=event=>this.move(event.detail||{});this._onHit=event=>this.impact(event.detail||{});this._onRound=event=>this.round(event.detail||{});
      root.addEventListener?.('nation-move',this._onMove);root.addEventListener?.('nation-hit',this._onHit);root.addEventListener?.('nation-round',this._onRound);
    }
    get debug(){return {enabled:this.enabled,active:this.active,paused:this.paused,contextState:this.context?.state||'uninitialized',volume:this.enabled?this.volume:0,musicRunning:!!this._timer,activeVoices:this._voices.size,cueCounts:{...this.cueCounts},impactCounts:{...this.impactCounts},decodedCues:Object.keys(this.buffers),arena:this.arena,lastError:this.lastError};}
    async unlock(){
      const fresh=!this.active;this.active=true;this.paused=false;
      if(fresh){this._generation++;this._cueKeys.clear();}
      try{
        if(!this.context){
          const Constructor=root.AudioContext||root.webkitAudioContext;if(!Constructor)throw new Error('Web Audio is unavailable in this browser.');
          this.context=new Constructor();this.master=this.context.createGain();this.music=this.context.createGain();this.effects=this.context.createGain();this.voice=this.context.createGain();
          const compressor=this.context.createDynamicsCompressor();compressor.threshold.value=-18;compressor.knee.value=24;compressor.ratio.value=5;compressor.attack.value=.003;compressor.release.value=.2;
          this.music.gain.value=.38;this.effects.gain.value=.85;this.voice.gain.value=.88;
          this.music.connect(this.master);this.effects.connect(this.master);this.voice.connect(this.master);this.master.connect(compressor);compressor.connect(this.context.destination);
          this._noiseBuffer=this.context.createBuffer(1,Math.ceil(this.context.sampleRate*.5),this.context.sampleRate);
          const samples=this._noiseBuffer.getChannelData(0);let seed=8471;for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=seed/2147483648-1;}
          this._load=this._loadClips();
        }
        this.master.gain.setValueAtTime(this.enabled?this.volume:0,this.context.currentTime);
        await this.context.resume();if(this.enabled&&!this.paused)this._startMusic();
        await this._load;if(fresh&&this.active&&this.enabled&&!this.paused)this._announce('getready');
      }catch(error){this.lastError=error.message;this._stopMusic();}
      return this.debug;
    }
    async _loadClips(){
      await Promise.all(Object.entries(CLIPS).map(async([key,data])=>{
        if(!data.startsWith('data:audio/wav;base64,')){this.lastError='Announcer audio has not been bundled.';return;}
        try{const binary=root.atob(data.split(',')[1]),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);this.buffers[key]=await this.context.decodeAudioData(bytes.buffer);}
        catch(error){this.lastError=`Unable to decode ${key} announcement: ${error.message}`;}
      }));
    }
    setEnabled(enabled){
      this.enabled=!!enabled;if(!this.context)return this.debug;
      this.master.gain.cancelScheduledValues(this.context.currentTime);this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.context.currentTime,.01);
      if(!this.enabled){this._stopMusic();this._stopNodes();}
      else if(this.active&&!this.paused)this.context.resume().then(()=>this._startMusic()).catch(error=>{this.lastError=error.message;});
      return this.debug;
    }
    setVolume(value){
      const volume=Number(value);if(!Number.isFinite(volume))return this.debug;
      this.volume=clamp(volume,0,1);
      if(this.context){this.master.gain.cancelScheduledValues(this.context.currentTime);this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.context.currentTime,.01);}
      return this.debug;
    }
    setPaused(paused){
      this.paused=!!paused;if(!this.context)return Promise.resolve(this.debug);
      if(this.paused){this._stopMusic();this._stopNodes();return this.context.suspend().then(()=>this.debug).catch(error=>{this.lastError=error.message;return this.debug;});}
      if(this.active)return this.context.resume().then(()=>{if(this.enabled)this._startMusic();return this.debug;}).catch(error=>{this.lastError=error.message;return this.debug;});
      return Promise.resolve(this.debug);
    }
    setArena(id){this.arena=id;this._stopMusic();if(this.active&&this.enabled&&!this.paused&&this.context?.state==='running')this._startMusic();return this.arena;}
    stop(){
      this.active=false;this.paused=false;this._generation++;this._stopMusic();this._stopNodes();this._cueKeys.clear();
      if(this.context&&this.context.state!=='closed')this.context.suspend().catch(error=>{this.lastError=error.message;});return this.debug;
    }
    dispose(){this.stop();root.removeEventListener?.('nation-move',this._onMove);root.removeEventListener?.('nation-hit',this._onHit);root.removeEventListener?.('nation-round',this._onRound);return this.context?.close();}
    _canPlay(){return this.active&&this.enabled&&!this.paused&&this.context?.state==='running';}
    _track(node,voice=false){this._nodes.add(node);if(voice)this._voices.add(node);node.onended=()=>{this._nodes.delete(node);this._voices.delete(node);try{node.disconnect();}catch{}};return node;}
    _stopNodes(){for(const node of this._nodes){try{node.stop();node.disconnect();}catch{}}this._nodes.clear();this._voices.clear();}
    _envelope(gain,time,duration,level,attack=.006){gain.gain.setValueAtTime(.00001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.00002,level),time+attack);gain.gain.exponentialRampToValueAtTime(.00001,time+duration);}
    _tone(freq,end,duration,type='sine',level=.15,bus=this.effects,time=this.context.currentTime){
      const source=this._track(this.context.createOscillator()),gain=this.context.createGain();source.type=type;source.frequency.setValueAtTime(Math.max(20,freq),time);source.frequency.exponentialRampToValueAtTime(Math.max(20,end),time+duration);
      this._envelope(gain,time,duration,level);source.connect(gain);gain.connect(bus);source.start(time);source.stop(time+duration+.02);return source;
    }
    _noise(duration,cutoff=1600,level=.18,bus=this.effects,time=this.context.currentTime,highpass=0){
      const source=this._track(this.context.createBufferSource()),filter=this.context.createBiquadFilter(),gain=this.context.createGain();source.buffer=this._noiseBuffer;filter.type=highpass?'bandpass':'lowpass';filter.frequency.value=cutoff;filter.Q.value=highpass?.55:.7;
      this._envelope(gain,time,duration,level,.002);source.connect(filter);filter.connect(gain);gain.connect(bus);source.start(time);source.stop(time+duration+.02);return source;
    }
    move(detail){
      if(!this._canPlay())return;const action=detail.move||detail.action;
      if(action==='ultimate'){this._tone(95,480,.24,'sawtooth',.06);this._tone(190,960,.24,'triangle',.035);}
      else if(action==='special'){this._noise(.14,1800,.1);this._tone(220,90,.13,'triangle',.06);}
      else if(action!=='throw')this._noise(action==='heavy'?.11:.07,3500,.065,this.effects,this.context.currentTime,1);
    }
    impact(detail){
      if(!this._canPlay())return;const action=detail.move||detail.action,kind=detail.kind;
      if(kind==='block'){this.impactCounts.block++;this._noise(.08,4200,.21,this.effects,this.context.currentTime,1);this._tone(650,220,.12,'triangle',.12);return;}
      if(kind==='tech'){this.impactCounts.tech++;this._tone(560,1120,.10,'sine',.11);this._tone(840,1680,.12,'sine',.08);return;}
      if(kind==='throw'){this.impactCounts.throw++;this._noise(.17,1100,.29);this._tone(120,32,.24,'sine',.42);return;}
      if(detail.ultimate){this.impactCounts.ultimate++;this._noise(.32,1600,.42);this._tone(145,27,.38,'sine',.5);this._tone(420,65,.25,'sawtooth',.12);return;}
      const kick=action==='heavy'||action==='break'||(action==='light'&&detail.style==='Kicker');
      if(kick){this.impactCounts.kick++;this._noise(.14,1150,.31);this._tone(112,35,.18,'sine',.4);}
      else{this.impactCounts.punch++;this._noise(.085,2900,.28,this.effects,this.context.currentTime,1);this._tone(160,45,.11,'triangle',.23);}
    }
    round(detail){
      if(!this.active)return;const type=detail.type||(detail.phase==='fight'?'fight':'round-end');
      // The engine emits both round-end and match-end for a final KO. Only the
      // round result announces; rematches begin a fresh cue-key generation.
      if(type==='match-end')return;const key=`${this._generation}:${detail.round||1}:${type}`;if(this._cueKeys.has(key))return;this._cueKeys.add(key);
      if(type==='fight')this._announce('fight');
      else if(type==='round-end'){const reason=detail.reason||'';if(/KO|KNOCKOUT/.test(reason))this._announce('ko');else if(/TIME|DRAW/.test(reason))this._announce('timeover');}
    }
    _announce(name){
      if(!this._canPlay())return;const generation=this._generation;
      if(!this.buffers[name]){this._load?.then(()=>{if(generation===this._generation&&this.buffers[name])this._announce(name);});return;}
      for(const voice of this._voices){try{voice.stop();}catch{}}this._voices.clear();
      const time=this.context.currentTime,source=this._track(this.context.createBufferSource(),true);source.buffer=this.buffers[name];source.connect(this.voice);source.start(time);this.cueCounts[name]++;
      this.music.gain.cancelScheduledValues(time);this.music.gain.setTargetAtTime(.1,time,.02);this.music.gain.setTargetAtTime(.38,time+source.buffer.duration+.15,.08);
      if(name==='fight'){this._tone(220,440,.17,'triangle',.07);this._tone(330,660,.18,'triangle',.04);}
      if(name==='ko'){this._tone(147,37,.32,'sine',.22);this._noise(.18,1600,.11);}
    }
    _score(){return root.NationArenas?.ARENAS.find(arena=>arena.id===this.arena)?.music||FALLBACK_SCORE;}
    _startMusic(){
      if(!this._canPlay()||this._timer)return;this._nextStep=this.context.currentTime+.06;this._step=0;this._scheduleMusic();
      this._timer=root.setInterval(()=>this._scheduleMusic(),35);
    }
    _stopMusic(){if(this._timer){root.clearInterval(this._timer);this._timer=null;}}
    _scheduleMusic(){
      if(!this._canPlay()){this._stopMusic();return;}const score=this._score(),stepSeconds=60/score.tempo/4;
      while(this._nextStep<this.context.currentTime+.13){
        const step=this._step%32,time=this._nextStep,bar=Math.floor(step/16),rootNote=score.key+(bar?score.scale[3]:0);
        if(step%2===0){const degree=score.melody[(step/2)%score.melody.length],pitch=score.key+12+score.scale[degree%score.scale.length];this._tone(note(pitch),note(pitch),stepSeconds*1.65,'triangle',.06,this.music,time);}
        if([0,6,8,14].includes(step%16)){const bass=note(rootNote-12);this._tone(bass,bass*.999,stepSeconds*2.8,'sine',.17,this.music,time);}
        if(step%8===0)this._tone(95,34,.14,'sine',.2,this.music,time);
        if(step%8===4){this._noise(.1,2200,.09,this.music,time,1);this._tone(135,90,.07,'triangle',.055,this.music,time);}
        if(step%2===0)this._noise(.022,7200,.035,this.music,time,1);
        if(step%16===0)for(const offset of [0,score.scale[2],7]){const chord=note(rootNote+offset);this._tone(chord,chord,stepSeconds*10,'triangle',.025,this.music,time);}
        this._step++;this._nextStep+=stepSeconds;
      }
    }
  }
  const api={AudioDirector,CLIP_NAMES:Object.keys(CLIPS)};root.NationAudio=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
