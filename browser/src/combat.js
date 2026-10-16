(function (root) {
  'use strict';
  const LEGACY_ROSTER = [
    {id:'jp',country:'Japan',flag:'JP',name:'Horizon Sentinel',style:'Striker',colors:['#ff596c','#ffe2cc'],hp:1000,speed:3.7,weight:'medium',stage:'Crimson Skyline',quote:'Focus finds the opening.'},
    {id:'pk',country:'Pakistan',flag:'PK',name:'Crescent Vanguard',style:'Grappler',colors:['#36d997','#d8f9e8'],hp:1050,speed:3.1,weight:'heavy',stage:'Emerald Pavilion',quote:'Every round is a new beginning.'},
    {id:'br',country:'Brazil',flag:'BR',name:'Aurora Flow',style:'Trickster',colors:['#f2d35c','#68dcad'],hp:950,speed:4.5,weight:'light',stage:'Golden Coast',quote:'Keep moving. Keep growing.'},
    {id:'kr',country:'South Korea',flag:'KR',name:'Skyward Pulse',style:'Kicker',colors:['#8eadff','#f3f7ff'],hp:1000,speed:4,weight:'light',stage:'Azure Terrace',quote:'A little higher, every time.'},
    {id:'fr',country:'France',flag:'FR',name:'Lumière',style:'Duelist',colors:['#8d9aff','#ffb8c8'],hp:1000,speed:3.6,weight:'medium',stage:'Violet Promenade',quote:'Precision speaks for itself.'},
    {id:'ng',country:'Nigeria',flag:'NG',name:'Jade Titan',style:'Brawler',colors:['#6ce5a3','#f3dfb7'],hp:1100,speed:2.8,weight:'heavy',stage:'Jade Coliseum',quote:'Stand tall. Fight with heart.'},
    {id:'cn',country:'China',flag:'CN',name:'Ember Balance',style:'Dual-Stance',colors:['#ff915e','#ffe19a'],hp:1000,speed:3.8,weight:'medium',stage:'Amber Summit',quote:'Balance is a strength of its own.'},
    {id:'us',country:'United States',flag:'US',name:'Neon Comet',style:'Zoner',colors:['#64d9ff','#ff88b4'],hp:950,speed:3.5,weight:'light',stage:'Neon Circuit',quote:'Make the next moment count.'}
  ];
  // The country catalog is loaded first by the standalone browser build.
  // Keeping the previous catalog as a fallback also permits source-only tools.
  let ROSTER=root.NationRoster?.ROSTER;
  if(!ROSTER&&typeof module!=='undefined'&&module.exports){
    try{ROSTER=require('./roster.js').ROSTER;}
    catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;}
  }
  ROSTER=ROSTER||LEGACY_ROSTER;
  let POWERS=root.NationPowers;
  if(!POWERS&&typeof module!=='undefined'&&module.exports){
    try{POWERS=require('./powers.js');}
    catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;}
  }
  const powerFor=data=>(root.NationPowers||POWERS)?.get(data.id)||{
    id:data.id,name:data.country+' Signature',kind:'energy',color:data.colors[0],accent:data.colors[1]};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  // Renderer and collision share these dimensions, including the authored sprite pivots.
  const GEOMETRY={pixelsPerUnit:78,bodyRadius:.38,height:2.55,crouchHeight:1.65,strikeRadius:.12};
  const JAPAN_ART={width:2172,height:724,scale:2.65/550,frames:{
    idle:{x:0,y:90,w:480,h:590,pivot:225,baseline:664},
    punch:{x:520,y:100,w:535,h:580,pivot:760,baseline:664,tipX:1030,tipY:225},
    kick:{x:1105,y:95,w:630,h:590,pivot:1340,baseline:664,tipX:1720,tipY:210,
      clip:[[0,0],[630,0],[630,235],[510,235],[510,590],[0,590]]},
    block:{x:1670,y:105,w:500,h:580,pivot:1930,baseline:664,
      clip:[[105,0],[500,0],[500,580],[0,580],[0,255],[105,255]]}
  }};
  const SPRITE_ART={jp:JAPAN_ART};
  function registerSpriteGeometry(id,metadata){
    if(!id||!metadata||!Number.isFinite(metadata.scale)||metadata.scale<=0||!metadata.frames)
      throw new TypeError('Sprite geometry requires an id, positive scale, and authored frames');
    for(const pose of ['punch','kick']){
      const frame=metadata.frames[pose];
      if(!frame||!['pivot','baseline','tipX','tipY'].every(key=>Number.isFinite(frame[key])))
        throw new TypeError('Attack frames require finite authored pivots and contact tips');
      if(frame.tipX<=frame.pivot||frame.tipY>=frame.baseline)
        throw new TypeError('Attack tips must be ahead of the pivot and above the baseline');
    }
    SPRITE_ART[id]=metadata;return metadata;
  }
  function hurtbox(f){
    const art=SPRITE_ART[f.data.id];
    const low=(f.move?f.move.low:f.low)&&f.y===0;
    let height=low?(art?.crouchHeight||GEOMETRY.crouchHeight):GEOMETRY.height;
    if(low&&art?.sourceName&&f.move){const frame=art.frames[f.move.visualPose];height=f.move.visualLowWarp?(frame.h-frame.baseline+frame.tipY)*art.scale+f.move.height:frame.h*art.scale*(frame.drawScaleY||1)*(f.move.visualScaleY||1);}
    return {left:f.x-GEOMETRY.bodyRadius,right:f.x+GEOMETRY.bodyRadius,bottom:f.y,top:f.y+height};
  }
  function contact(f){
    if(!f.move)return null;
    const m=f.move,y=f.y+m.height,x=f.x+f.facing*m.reach;
    return {x,y,left:Math.min(f.x+f.facing*.25,x)-GEOMETRY.strikeRadius,
      right:Math.max(f.x+f.facing*.25,x)+GEOMETRY.strikeRadius,
      bottom:y-GEOMETRY.strikeRadius,top:y+GEOMETRY.strikeRadius};
  }
  function active(f){return !!f.move&&f.moveFrame>=f.move.start&&f.moveFrame<f.move.start+f.move.active;}
  function extension(f){
    if(!f.move)return 0;
    const m=f.move,end=m.start+m.active;
    return f.moveFrame<m.start?clamp(f.moveFrame/m.start,0,1):f.moveFrame<end?1:
      clamp(1-(f.moveFrame-end)/m.recovery,0,1);
  }
  const MOVES={
    light:{damage:65,start:6,active:5,recovery:12,reach:1.3,height:1.9,stun:23},
    heavy:{damage:125,start:13,active:6,recovery:22,reach:1.7,height:2.15,stun:34,launch:true},
    special:{damage:150,start:17,active:6,recovery:25,reach:2,height:1.8,stun:34},
    break:{damage:100,start:21,active:5,recovery:26,reach:1.4,height:1.65,stun:42,break:true},
    throw:{damage:145,start:8,active:3,recovery:26,reach:1.1,height:1.6,stun:30,throw:true},
    ultimate:{damage:330,start:20,active:7,recovery:35,reach:3.3,height:1.9,stun:45,ultimate:true}
  };
  // The additional country power has its own cooldown rather than replacing
  // any of the six original actions or consuming their ultimate meter.
  const SIGNATURE_COOLDOWN=240;
  const SIGNATURE_MOVE={damage:120,start:18,active:3,recovery:24,reach:1.3,height:1.9,stun:28,
    projectile:true,cooldown:SIGNATURE_COOLDOWN,projectileSpeed:8,projectileRadius:.2,projectileRange:6};
  // This is the single move specification used by combat, the range hint, and
  // the renderer. Sprite scale ratios make every authored pose agree with its
  // actual collision tip, including low attacks and ranged ultimates.
  function getMoveSpec(data,action,{low=false,combo=0}={}){
    const base=action==='signature'?SIGNATURE_MOVE:MOVES[action];if(!base)return null;
    const move={...base,id:action,low:!!low,combo};
    if(move.projectile){move.power=powerFor(data);move.powerId=move.power.id;}
    if(data.style==='Grappler'&&base.throw)move.damage+=30;
    if(data.style==='Brawler'&&!move.projectile)move.damage+=12;
    if((data.style==='Kicker'||data.style==='Duelist')&&!move.projectile)move.reach+=.25;
    if(data.style==='Zoner'&&action==='special')move.reach=5;
    const art=SPRITE_ART[data.id];
    if(art){
      move.visualPose=['heavy','special','ultimate'].includes(action)?'kick':'punch';
      if((action==='break'||move.projectile)&&art.frames.powerPunch)move.visualPose='powerPunch';
      if(low&&art.sourceName){
        if(move.visualPose==='kick')move.visualPose='lowKick';
        else if(art.hasLowPunch)move.visualPose='lowPunch';
        else move.visualLowWarp=true;
      }
      const pose=art.frames[move.visualPose];
      const authoredReach=(pose.tipX-pose.pivot)*art.scale;
      const authoredHeight=(pose.baseline-pose.tipY)*art.scale*(pose.drawScaleY||1);
      if(['light','heavy','break'].includes(action)||move.projectile){
        move.reach=authoredReach;move.height=art.sourceName&&!move.projectile?Math.min(authoredHeight,2.35):authoredHeight;
      }
      if(art.sourceName&&action==='throw')move.height=authoredHeight;
      move.visualScaleX=move.reach/authoredReach;
      move.visualScaleY=(low?.65:move.height)/authoredHeight;
      if(low&&art.sourceName){
        // A low punch must stay below the smallest crouched defender. Keep its
        // upper-body pixels intact while bending the area below the fist.
        if(move.visualPose==='lowPunch'&&authoredHeight>.9)move.visualLowWarp=true;
        move.height=move.visualLowWarp ? .65 : authoredHeight;
        if(['light','heavy','break'].includes(action)||move.projectile)move.reach=authoredReach;
        move.visualScaleX=move.reach/authoredReach;
        move.visualScaleY=1;
      }
    }
    if(low&&!art?.sourceName)move.height=.65;
    if(action==='light'&&combo)move.damage+=combo*8;
    return move;
  }
  function dispatch(name,detail){
    if(root.dispatchEvent&&typeof root.CustomEvent==='function')
      root.dispatchEvent(new root.CustomEvent(name,{detail}));
  }
  function fighter(data,x,facing) {
    return {data,x,y:0,vy:0,facing,hp:data.hp,meter:0,move:null,moveFrame:0,resolved:false,
      stun:0,combo:0,hits:0,lastHit:-999,buffer:null,guard:false,low:false,axis:0,juggle:0,
      pending:null,flash:0,pose:'idle',recoil:0,lastDamage:0,damagedAt:-999,damageCombo:0,
      signatureCooldown:0,signatureTotalCooldown:SIGNATURE_COOLDOWN};
  }
  class Fight {
    constructor(left=ROSTER[0],right=ROSTER[1],options={}) {
      this.options={seconds:60,intro:80,intermission:135,...options};
      this.seed=options.seed??4821;this.frame=0;this.wins=[0,0];this.round=1;this.effects=[];
      this.projectiles=[];this.projectileSerial=0;
      this.message='GET READY';this.messageAt=0;this.winner=-1;this.hitstop=0;
      this.left=fighter(left,-1.3,1);this.right=fighter(right,1.3,-1);this.resetRound();
    }
    random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
    resetRound(){
      this.left=fighter(this.left.data,-1.3,1);this.right=fighter(this.right.data,1.3,-1);
      this.time=this.options.seconds*60;this.phase=this.options.intro?'intro':'fight';
      this.wait=this.options.intro;this.hitstop=0;this.effects=[];this.projectiles=[];this.winner=-1;this.reason=null;this.say('GET READY');
      if(this.phase==='fight'){this.say('FIGHT');this.roundEvent('fight');}
    }
    say(message){this.message=message;this.messageAt=this.frame;}
    roundEvent(type){dispatch('nation-round',{type,phase:this.phase,reason:this.reason,
      round:this.round,winner:this.winner,wins:[...this.wins],frame:this.frame});}
    impact(a,d,move,kind,damage=0){dispatch('nation-hit',{attackerId:a.data.id,defenderId:d.data.id,
      attacker:a.data.id,action:move?.id||'throw',move:move?.id||'throw',style:a.data.style,
      kind,damage,ultimate:!!move?.ultimate,powerId:move?.powerId,
      countryId:move?.projectile?a.data.id:undefined,frame:this.frame});}
    validGrab(p){return p&&p.attacker.hp>0&&!p.attacker.stun&&p.attacker.move===p.move;}
    releaseGrab(f){f.pending=null;f.buffer=null;if(!f.stun)f.pose='idle';}
    // A finished round still needs a visual tail: defeated fighters land,
    // the winning strike recovers, and its flash/particles fade. This never
    // reads commands, changes the result or advances the combat timer.
    settle(){
      if(this.phase!=='intermission'&&this.phase!=='complete')return false;
      if(this.hitstop>0){this.hitstop--;return true;}
      this.frame++;
      this.effects=this.effects.filter(effect=>--effect.life>0);
      for(const f of [this.left,this.right]){
        if(f.flash>0)f.flash--;
        if(f.stun>0)f.stun--;
        if(Math.abs(f.recoil)>.003){f.x=clamp(f.x+f.recoil,-6.6,6.6);f.recoil*=.72;}else f.recoil=0;
        if(f.y>0||f.vy>0){f.vy-=20/60;f.y+=f.vy/60;if(f.y<=0){f.y=0;f.vy=0;f.juggle=0;}}
        f.buffer=null;f.pending=null;f.axis=0;f.guard=false;f.low=false;
        if(f.hp<=0){f.move=null;f.pose='ko';continue;}
        if(f.move&&++f.moveFrame>=f.move.start+f.move.active+f.move.recovery)f.move=null;
        f.pose=f.move?f.move.id:f.stun>0?'hit':f.y>0?'jump':'idle';
      }
      return true;
    }
    read(f,input={}) {
      f.axis=clamp(input.axis||0,-1,1);f.low=!!input.low;f.guard=!!input.guard;
      if(f.pending&&!this.validGrab(f.pending))this.releaseGrab(f);
      if(input.action==='throw'&&f.pending&&this.frame<f.pending.end){
        const grab=f.pending;
        grab.attacker.move=null;grab.attacker.stun=12;f.pending=null;f.stun=12;f.buffer=null;
        this.impact(grab.attacker,f,grab.move,'tech');
        f.pose='tech';this.say('THROW ESCAPE');this.effects.push({x:f.x,y:1,color:'#8defff',life:22,type:'tech'});return;
      }
      if(input.action) f.buffer={action:input.action,low:f.low,axis:f.axis,at:this.frame};
    }
    step(a={},b={}) {
      if(this.phase==='complete')return;
      if(this.phase!=='fight'){
        if(this.phase==='intermission')this.settle();else this.frame++;
        if(--this.wait<=0){
          if(this.phase==='intermission'){this.round++;this.resetRound();}
          else{this.phase='fight';this.say('FIGHT');this.roundEvent('fight');}
        }return;
      }
      this.read(this.left,a);this.read(this.right,b);
      if(this.hitstop>0){this.hitstop--;return;}
      this.frame++;this.time--;
      this.effects=this.effects.filter(e=>--e.life>0);
      this.advance(this.left,this.right);this.advance(this.right,this.left);
      const h1=this.detect(this.left,this.right),h2=this.detect(this.right,this.left);
      // Capture every contact before applying reactions, so two powers or a
      // power and a punch can trade on the same tick, including a double KO.
      const projectileHits=this.advanceProjectiles();
      if(h1?.kind==='throw'&&h2?.kind==='throw'){
        for(const f of [this.left,this.right]){f.move=null;f.stun=12;f.pose='tech';}
        this.impact(h1.a,h1.d,h1.m,'tech');
        this.say('THROW CLASH');
      }else{this.apply(h1);this.apply(h2);}
      for(const hit of projectileHits)this.apply(hit);
      this.projectiles=this.projectiles.filter(p=>!p.spent&&p.owner.hp>0&&p.life>0&&p.distance<p.maxDistance);
      for(const f of [this.left,this.right]){
        if(f.pending&&!this.validGrab(f.pending))this.releaseGrab(f);
        if(f.pending&&this.frame>=f.pending.end){
          const p=f.pending;f.pending=null;
          if(p.attacker.hp>0){f.hp=clamp(f.hp-p.damage,0,f.data.hp);f.stun=30;f.flash=12;f.pose='hit';
            f.lastDamage=p.damage;f.damagedAt=this.frame;f.recoil=p.attacker.facing*.18;
            this.effects.push({x:f.x,y:f.y+1.2,color:'#fff2cc',life:36,type:'hit',damage:p.damage});
            p.attacker.meter=clamp(p.attacker.meter+12,0,100);f.meter=clamp(f.meter+8,0,100);
            this.impact(p.attacker,f,p.move,'throw',p.damage);this.hitstop=6;this.say('THROW');}
        }
        f.x=clamp(f.x,-6.6,6.6);
      }
      const l=this.left,r=this.right;
      if(Math.abs(l.x-r.x)<.75&&Math.abs(l.y-r.y)<1.1){
        const middle=clamp((l.x+r.x)/2,-6.225,6.225),direction=l.x<=r.x?1:-1;
        l.x=middle-.375*direction;r.x=middle+.375*direction;
      }
      if(l.hp<=0||r.hp<=0||this.time<=0)this.endRound();
    }
    advance(f,other){
      if(f.signatureCooldown>0)f.signatureCooldown--;
      if(f.flash>0)f.flash--;
      if(Math.abs(f.recoil)>.003){f.x+=f.recoil;f.recoil*=.72;}else f.recoil=0;
      if(f.y>0||f.vy>0){f.vy-=20/60;f.y+=f.vy/60;if(f.y<=0){f.y=0;f.vy=0;f.juggle=0;}}
      if(f.buffer&&this.frame-f.buffer.at>=8)f.buffer=null;
      if(this.frame-f.lastHit>48){f.combo=0;f.hits=0;}
      if(f.stun>0){f.stun--;return;}
      if(f.pending||f.hp<=0)return;
      if(!f.move)f.facing=other.x>=f.x?1:-1;
      if(f.move){
        f.moveFrame++;
        const end=f.move.start+f.move.active;
        const chain=f.resolved&&f.combo>0&&f.moveFrame>=end&&f.buffer&&
          (f.buffer.action==='heavy'||(f.buffer.action==='light'&&f.combo<3));
        if(chain){const command=f.buffer;f.buffer=null;this.start(f,command);return;}
        if(f.moveFrame===end&&!f.resolved&&!f.move.projectile){f.combo=0;f.hits=0;if(f===this.left&&!f.move.throw)this.say('MISSED · MOVE CLOSER');}
        if(f.moveFrame>=end+f.move.recovery)f.move=null;else return;
      }
      if(f.buffer){const command=f.buffer;f.buffer=null;this.start(f,command);if(f.move)return;}
      f.pose=f.guard||f.axis===-f.facing?'block':f.axis?'walk':'idle';
      if(!f.guard&&!f.low)f.x+=f.axis*f.data.speed/60;
      if(f.y>0)f.pose='jump';
    }
    start(f,input){
      if(input.action==='jump'){if(!f.y){f.vy=7.5;f.pose='jump';}return;}
      const move=getMoveSpec(f.data,input.action,{low:input.low,combo:f.combo});
      if(!move||(move.throw&&f.y>0))return;
      if(move.projectile){
        if(f.y>0)return;
        if(f.signatureCooldown>0||this.projectiles.some(p=>p.owner===f&&!p.spent)){
          if(f===this.left)this.say('POWER RECHARGING');return;
        }
        f.signatureCooldown=move.cooldown;f.signatureTotalCooldown=move.cooldown;
        this.say(move.power.name.toUpperCase());
      }
      if(move.ultimate){if(f.meter<100){if(f===this.left)this.say('BUILD YOUR METER');return;}f.meter=0;}
      f.move=move;
      if(input.axis===f.facing)f.x+=.15;
      f.moveFrame=0;f.resolved=false;f.pose=input.action;
      dispatch('nation-move',{actorId:f.data.id,attackerId:f.data.id,attacker:f.data.id,
        action:input.action,move:input.action,style:f.data.style,kind:'move',
        frame:this.frame,ultimate:!!move.ultimate,powerId:move.powerId});
    }
    detect(a,d){
      const m=a.move;if(!m||m.projectile||a.resolved||a.moveFrame<m.start||a.moveFrame>=m.start+m.active||d.hp<=0)return null;
      const dx=(d.x-a.x)*a.facing;if(dx<0)return null;
      if(m.throw)return !a.y&&!d.y&&!d.pending&&dx<=m.reach+GEOMETRY.bodyRadius?{a,d,m,kind:'throw'}:null;
      const strike=contact(a),body=hurtbox(d);
      if(strike.right<body.left||strike.left>body.right||strike.top<body.bottom||strike.bottom>body.top)return null;
      const guarded=!d.move&&!d.stun&&!d.pending&&d.y===0&&(d.guard||d.axis===-d.facing)&&(!m.low||d.low);
      return {a,d,m,point:strike,kind:guarded?(m.break?'break':'block'):'hit'};
    }
    launchProjectile(f){
      const move=f.move;
      if(!move?.projectile||move.projectileLaunched||!active(f)||f.hp<=0||f.stun||f.pending)return;
      move.projectileLaunched=true;
      const x=f.x+f.facing*move.reach,y=f.y+move.height;
      const p={id:++this.projectileSerial,ownerId:f.data.id,ownerIndex:f===this.left?0:1,owner:f,move,
        x,y,previousX:f.x+f.facing*.25,originX:x,facing:f.facing,radius:move.projectileRadius,
        age:0,life:Math.ceil(move.projectileRange/move.projectileSpeed*60)+1,distance:0,
        maxDistance:move.projectileRange,speed:move.projectileSpeed,powerId:move.powerId,power:move.power,spent:false};
      this.projectiles.push(p);
      dispatch('nation-projectile',{id:p.id,attackerId:p.ownerId,ownerId:p.ownerId,ownerIndex:p.ownerIndex,
        action:'signature',powerId:p.powerId,x,y,facing:p.facing,frame:this.frame});
    }
    advanceProjectiles(){
      this.launchProjectile(this.left);this.launchProjectile(this.right);
      const hits=[];
      for(const p of this.projectiles){
        if(p.spent||p.owner.hp<=0||p.life<=0)continue;
        if(p.age>0){
          p.previousX=p.x;
          const travel=Math.min(p.speed/60,p.maxDistance-p.distance);
          p.distance+=travel;p.x=p.originX+p.facing*p.distance;
        }
        p.age++;p.life--;
        const d=p.owner===this.left?this.right:this.left,body=hurtbox(d);
        // The first sweep is the visible punching arm, from shoulder to fist.
        // Later sweeps are only the distance the visible missile moves this
        // tick, never the entire path back to its owner or its future range.
        const strike={x:p.x,y:p.y,left:Math.min(p.previousX,p.x)-p.radius,
          right:Math.max(p.previousX,p.x)+p.radius,bottom:p.y-p.radius,top:p.y+p.radius};
        if(d.hp<=0||strike.right<body.left||strike.left>body.right||strike.top<body.bottom||strike.bottom>body.top)continue;
        const guarded=!d.move&&!d.stun&&!d.pending&&d.y===0&&
          (d.guard||d.axis===-d.facing)&&(!p.move.low||d.low);
        const point={...strike,x:clamp(p.facing>0?body.left:body.right,
          Math.min(p.previousX,p.x),Math.max(p.previousX,p.x))};
        p.spent=true;hits.push({a:p.owner,d,m:p.move,point,projectile:p,kind:guarded?'block':'hit'});
      }
      return hits;
    }
    apply(hit){
      if(!hit)return;const {a,d,m,kind,projectile}=hit;
      const ownsMove=a.move===m,facing=projectile?.facing??a.facing;
      // An old missile must not resolve or break the combo of a newer move.
      if(ownsMove)a.resolved=true;
      if(kind==='block'){if(!projectile||ownsMove){a.combo=0;a.hits=0;}d.stun=8;d.pose='block';this.hitstop=3;this.say('BLOCKED · TRY U OR I');
        this.effects.push(projectile?{x:hit.point.x,y:hit.point.y,color:m.power.color,life:36,type:'signature',
          kind:'block',powerId:m.powerId,countryId:a.data.id,facing}:{x:d.x,y:d.y+1.1,color:'#83dfff',life:16,type:'block'});
        this.impact(a,d,m,'block');return;}
      if(kind==='throw'){d.move=null;d.combo=0;d.buffer=null;d.pending={attacker:a,move:m,damage:m.damage,end:this.frame+12};
        this.say('GRABBED · PRESS THROW');return;}
      const decay=d.data.weight==='heavy'?.24:d.data.weight==='light'?.13:.18;
      const damage=Math.round(m.damage*Math.max(.3,1-d.juggle*decay));
      // Preserve contact before either simultaneous hit interrupts the other move.
      const point=hit.point;
      d.hp=clamp(d.hp-damage,0,d.data.hp);d.stun=m.stun;d.move=null;d.combo=0;d.pending=null;d.flash=12;d.pose='hit';
      d.lastDamage=damage;d.damagedAt=this.frame;d.recoil=facing*.095;
      if(!projectile||ownsMove){a.hits++;a.combo=m.id==='light'?Math.min(3,a.combo+1):0;a.lastHit=this.frame;}
      a.meter=clamp(a.meter+damage*.1,0,100);d.meter=clamp(d.meter+damage*.07,0,100);
      d.x+=facing*.04;
      if(d.y>0){d.juggle++;d.vy=m.id==='special'?-7:Math.max(2.5,d.vy);}
      else if(m.launch&&d.hp>0){d.y=.03;d.vy=6.3;d.juggle=1;}
      this.hitstop=m.ultimate?11:5;
      const color=projectile?m.power.color:m.ultimate?'#f8e481':kind==='break'?'#ffc18a':a.data.colors[0];
      this.effects.push({x:clamp(point.x,d.x-GEOMETRY.bodyRadius,d.x+GEOMETRY.bodyRadius),y:point.y,color,
        life:36,type:projectile?'signature':m.ultimate?'ultimate':'hit',damage,
        powerId:m.powerId,countryId:projectile?a.data.id:undefined,facing});
      this.say(projectile?`${m.power.name.toUpperCase()} · −${damage} HP`:m.ultimate?'NATION ULTIMATE':kind==='break'?'GUARD BREAK':m.launch?'LAUNCHER':a.hits>1?`${a.hits} HIT COMBO`:`HIT · −${damage} HP`);
      this.impact(a,d,m,kind,damage);
    }
    endRound(){
      const l=this.left,r=this.right;
      const left=l.hp/l.data.hp,right=r.hp/r.data.hp;
      this.winner=left===right?-1:left>right?0:1;
      if(this.winner>=0)this.wins[this.winner]++;
      this.reason=l.hp===0&&r.hp===0?'DOUBLE KO':l.hp===0||r.hp===0?'KNOCKOUT':this.winner<0?'DRAW':'TIME OVER';
      this.say(this.reason);this.phase=this.wins.some(w=>w>=2)?'complete':'intermission';this.wait=this.options.intermission;
      this.left.buffer=null;this.right.buffer=null;
      this.projectiles=[];
      this.roundEvent('round-end');if(this.phase==='complete')this.roundEvent('match-end');
    }
    ai(difficulty='normal'){
      if(this.phase!=='fight')return {};
      const a=this.right,p=this.left,dx=p.x-a.x,dist=Math.abs(dx),toward=Math.sign(dx);
      if(a.pending)return {action:this.random()<(difficulty==='hard'?.5:.12)?'throw':null};
      const incoming=this.projectiles.find(shot=>shot.owner===p&&(a.x-shot.x)*shot.facing>=0&&Math.abs(a.x-shot.x)<2.7);
      const attacking=p.move&&p.moveFrame<p.move.start+3;
      const guard=((attacking&&dist<(p.move.projectile?5:2.7))||incoming)&&this.random()<(difficulty==='easy'?.2:difficulty==='hard'?.8:.5);
      let action=null;
      const probability=difficulty==='easy'?.035:difficulty==='hard'?.14:.075;
      if(this.random()<probability&&!a.stun){
        if(a.meter>=100&&dist<3.5)action='ultimate';
        else if(dist>=3&&dist<=5&&!a.signatureCooldown&&!this.projectiles.some(shot=>shot.owner===a))action='signature';
        else if(a.combo>0)action=a.combo>=2?'heavy':'light';
        else if(dist<1.25&&p.guard)action=this.random()<.55?'throw':'break';
        else if(dist<2.3)action=['light','light','heavy','special'][Math.floor(this.random()*4)];
        else if(a.data.style==='Zoner'&&dist<5)action='special';
      }
      return {axis:guard?0:dist>1.25?toward:dist<.85&&this.random()<.1?-toward:0,guard,low:guard&&!!(incoming?.move.low||p.move?.low),action};
    }
  }
  const api={Fight,ROSTER,MOVES,SIGNATURE_MOVE,SIGNATURE_COOLDOWN,clamp,GEOMETRY,JAPAN_ART,SPRITE_ART,registerSpriteGeometry,
    getMoveSpec,hurtbox,contact,active,extension};root.NationCombat=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
