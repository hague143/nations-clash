(function(root){
 'use strict';
 const FIGHTERS={pk:{id:'pk',country:'Pakistan',name:'Crescent Vanguard',hp:1000,color:'#35efac',power:'Emerald Crescent'},jp:{id:'jp',country:'Japan',name:'Horizon Sentinel',hp:1000,color:'#ff687d',power:'Sakura Burst'}};
 const MOVES={punch:{id:'punch',start:9,active:5,recovery:16,damage:70,stun:21,radius:.13},kick:{id:'kick',start:17,active:6,recovery:25,damage:115,stun:29,radius:.18},special:{id:'special',start:22,active:3,recovery:27,damage:150,stun:26,radius:.17,cooldown:240}};
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);},mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
 const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
 function ik(a,b,l1,l2,bend=-1){const d=sub(b,a),len=Math.max(.0001,Math.hypot(...d)),u=mul(d,1/len),reach=Math.min(len,l1+l2-.001),along=(l1*l1-l2*l2+reach*reach)/(2*reach),height=Math.sqrt(Math.max(0,l1*l1-along*along));let n=[-u[1],u[0],0];const nl=Math.hypot(...n)||1;n=mul(n,bend/nl);return add(add(a,mul(u,along)),mul(n,height));}
 function weight(a){const m=a.move;if(!m)return 0;const t=a.moveFrame;if(t<m.start)return smooth((t/m.start-.48)/.52);if(t<m.start+m.active)return 1;return 1-smooth((t-m.start-m.active)/m.recovery);}
 function samplePose(a,frame=0){
  const e=weight(a),low=!!(a.move?a.move.low:a.low),drop=low?.86:0,breath=Math.sin(frame*.055)*.014,walking=Math.abs(a.axis||0)>.01&&!a.move&&a.y===0;
  const stride=walking?Math.sin(frame*.22):0,hit=a.stun>0?-Math.sin(Math.min(1,a.stun/24)*Math.PI)*.15:0,lean=(a.move?.id==='kick'?.15:.11)*e+hit;
  const p={hip:[lean*.35,1.34-drop,0],chest:[lean,1.98-drop+breath,0],neck:[lean+.01,2.33-drop+breath,0],head:[lean+.035,2.55-drop+breath,0],shoulderR:[lean+.08,2.12-drop+breath,.32],shoulderL:[lean-.04,2.10-drop+breath,-.32],handR:[.57,2.13-drop+breath,.32],handL:[.37,2.29-drop+breath,-.3],footR:[.35+stride*.25,.12+Math.max(0,stride)*.15,.24],footL:[-.35-stride*.25,.12+Math.max(0,-stride)*.15,-.24]};
  if(a.guard){p.handR=[.55,2.35-drop,.22];p.handL=[.4,2.43-drop,-.22];}
  if(a.y>0){p.footR=[.4,.4,.24];p.footL=[-.3,.22,-.24];}
  if(a.move){
   if(a.move.id==='kick'){
    const target=low?[1.49,.51,.24]:[1.49,1.78,.24];p.footR=mix([.32,.4,.24],target,e);p.handR=[.35,2.25-drop,.32];p.handL=[.15,2.3-drop,-.3];
   }else{
    p.handR=mix([.4,2.12-drop,.32],low?[1.11,.82,.30]:[1.12,2.08,.30],e);p.handL=[.4,2.3-drop,-.3];
   }
  }
  p.elbowR=ik(p.shoulderR,p.handR,.49,.50,-1);p.elbowL=ik(p.shoulderL,p.handL,.48,.49,-1);
  p.kneeR=ik(add(p.hip,[0,0,.22]),p.footR,.73,.74,1);p.kneeL=ik(add(p.hip,[0,0,-.22]),p.footL,.73,.74,1);
  if(a.hp<=0){
   const progress=smooth((frame-(a.deadAt||0))/35),angle=progress*Math.PI*.48,c=Math.cos(angle),s=Math.sin(angle);
   for(const k of Object.keys(p)){const [x,y,z]=p[k];p[k]=[x*c+y*s,y*c-x*s,z];}
   const min=Math.min(...Object.values(p).map(v=>v[1]));for(const k of Object.keys(p))p[k][1]+=Math.max(0,.18-min)*progress;
  }
  return p;
 }
 function world(a,p){return {x:a.x+p[0]*a.facing,y:a.y+p[1],z:p[2]};}
 function contact(a,frame=0){if(!a.move)return null;return world(a,samplePose(a,frame)[a.move.id==='kick'?'footR':'handR']);}
 function getHurtboxes(a,frame=0){const p=samplePose(a,frame);return [{a:world(a,p.hip),b:world(a,p.chest),radius:.33,part:'body'},{a:world(a,p.neck),b:world(a,p.head),radius:.23,part:'head'},...['L','R'].flatMap(side=>[{a:world(a,p.hip),b:world(a,p['knee'+side]),radius:.22,part:'thigh'+side},{a:world(a,p['knee'+side]),b:world(a,p['foot'+side]),radius:.19,part:'shin'+side}])];}
 const arr=p=>[p.x,p.y,p.z||0];
 function segmentClosest(a,b,c,d){
  a=arr(a);b=arr(b);c=arr(c);d=arr(d);const u=sub(b,a),v=sub(d,c),w=sub(a,c),A=dot(u,u),B=dot(u,v),D=dot(v,v),E=dot(u,w),F=dot(v,w),den=A*D-B*B;
  let s=den>1e-10?clamp((B*F-D*E)/den,0,1):0,t=D>1e-10?clamp((B*s+F)/D,0,1):0;s=A>1e-10?clamp((B*t-E)/A,0,1):0;t=D>1e-10?clamp((B*s+F)/D,0,1):0;
  const p=add(a,mul(u,s)),q=add(c,mul(v,t));return {distance:Math.hypot(...sub(p,q)),point:{x:p[0],y:p[1],z:p[2]}};
 }
 function segmentDistance(a,b,c,d){return segmentClosest(a,b,c,d).distance;}
 function actor(id,x,facing){return {id,data:FIGHTERS[id],x,y:0,vy:0,facing,hp:1000,meter:0,move:null,moveFrame:0,stun:0,guard:false,low:false,axis:0,resolved:false,signatureCooldown:0,combo:0,lastHit:-1000,deadAt:0,flash:0,recoil:0};}
 class Fight{
  constructor(left='pk',right='jp',options={}){this.options={mode:'ai',difficulty:'normal',intro:80,seconds:60,...options};this.frame=0;this.round=1;this.wins=[0,0];this.events=[];this.serial=0;this.projectileSerial=0;this.seed=5623;this.left=actor(left,-1.6,1);this.right=actor(right,1.6,-1);this.winner=-1;this.resetRound();}
  emit(type,detail={}){this.events.push({serial:++this.serial,frame:this.frame,type,...detail});if(this.events.length>180)this.events.shift();}
  resetRound(){const ids=[this.left.id,this.right.id];this.left=actor(ids[0],-1.6,1);this.right=actor(ids[1],1.6,-1);this.time=this.options.seconds*60;this.phase=this.options.intro>0?'intro':'fight';this.phaseFrames=this.options.intro;this.hitstop=0;this.projectiles=[];this.effects=[];this.message='GET READY';if(this.phase==='fight')this.emit('round',{kind:'fight',round:this.round});}
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  ai(index=1){const a=index?this.right:this.left,b=index?this.left:this.right;if(this.options.mode==='training'||this.phase!=='fight'||a.hp<=0)return {};const d=Math.abs(a.x-b.x),level=this.options.difficulty==='easy'?.045:this.options.difficulty==='hard'?.17:.09;let axis=d>1.44?Math.sign(b.x-a.x):d<.98?-Math.sign(b.x-a.x):0;const guard=b.move&&Math.abs(b.x-a.x)<2&&this.random()<.65;
   let action;if(!a.move&&!a.stun&&this.random()<level){action=d>2.1&&a.signatureCooldown===0?'special':d<1.95?(this.random()<.52?'punch':'kick'):undefined;}if(b.projectile&&this.random()<.3)action='jump';return {axis,guard,action};}
  start(a,action,low){const base=MOVES[action];if(!base||a.move||a.stun||a.hp<=0||action==='special'&&a.signatureCooldown>0)return false;a.move={...base,low:!!low};a.moveFrame=0;a.resolved=false;a.previousTip=null;a.guard=false;if(action==='special')a.signatureCooldown=base.cooldown;this.emit('move',{actor:a.id,action,low:!!low});return true;}
  damage(a,b,move,point,index){
   const blocked=b.guard&&!b.move&&b.y===0&&(!move.low||b.low);const damage=blocked?0:move.damage+(move.id==='punch'&&this.frame-a.lastHit<55?10:0);
   if(!blocked){b.hp=Math.max(0,b.hp-damage);b.stun=move.stun;b.move=null;b.guard=false;b.flash=9;b.recoil=a.facing*.055;a.meter=clamp(a.meter+12,0,100);a.combo=this.frame-a.lastHit<55?a.combo+1:1;a.lastHit=this.frame;if(b.hp===0)b.deadAt=this.frame;}
   else{b.stun=5;b.recoil=a.facing*.018;}
   this.hitstop=blocked?3:move.id==='kick'?7:5;this.effects.push({frame:this.frame,kind:blocked?'block':'hit',point:{...point},color:move.id==='special'?a.data.color:blocked?'#8fdfff':'#ffd48b'});
   this.emit('hit',{actor:a.id,target:b.id,action:move.id,kind:blocked?'block':'hit',damage,point:{...point},low:move.low,slot:index});
  }
  step(leftInput={},rightInput={}){
   this.frame++;this.effects=this.effects.filter(e=>this.frame-e.frame<28);
   if(this.phase==='complete'||this.phase==='intermission'){
    // Finish landing, hit flash and recovery after the outcome is locked.
    // Health, score, time, power recharge and attacks remain frozen.
    for(const a of [this.left,this.right]){
     a.flash=Math.max(0,a.flash-1);a.stun=Math.max(0,a.stun-1);a.axis=0;a.x=clamp(a.x+a.recoil,-4.4,4.4);a.recoil*=.72;
     if(a.y>0||a.vy>0){a.vy-=15/60;a.y=Math.max(0,a.y+a.vy/60);if(a.y===0)a.vy=0;}
     if(a.move){a.moveFrame++;if(a.moveFrame>=a.move.start+a.move.active+a.move.recovery){a.move=null;a.moveFrame=0;}}
    }
    if(this.phase==='intermission'&&--this.phaseFrames<=0){this.round++;this.resetRound();}return;
   }
   if(this.phase==='intro'){if(--this.phaseFrames<=0){this.phase='fight';this.message='FIGHT';this.emit('round',{kind:'fight',round:this.round});}return;}
   if(this.hitstop>0){this.hitstop--;return;}
   const actors=[this.left,this.right],inputs=[leftInput,rightInput];
   for(let i=0;i<2;i++){
    const a=actors[i],input=inputs[i]||{};a.facing=actors[1-i].x>=a.x?1:-1;a.flash=Math.max(0,a.flash-1);a.signatureCooldown=Math.max(0,a.signatureCooldown-1);
    if(a.stun>0)a.stun--;a.x=clamp(a.x+a.recoil,-4.4,4.4);a.recoil*=.72;
    a.low=!!input.low&&a.y===0;a.guard=!!input.guard&&!a.move&&!a.stun&&a.y===0;a.axis=!a.move&&!a.stun&&!a.guard?clamp(Number(input.axis)||0,-1,1):0;
    if(input.action==='jump'&&a.y===0&&!a.move&&!a.stun){a.vy=5.6;a.y=.001;}
    if(a.y>0||a.vy>0){a.vy-=15/60;a.y=Math.max(0,a.y+a.vy/60);if(a.y===0)a.vy=0;}
    a.x=clamp(a.x+a.axis*(a.low?1.4:2.8)/60,-4.4,4.4);
    if(input.action&&input.action!=='jump')this.start(a,input.action,a.low);
   }
   const delta=this.right.x-this.left.x;if(Math.abs(delta)<.88){const lower=clamp((this.left.x+this.right.x)/2-.44,-4.4,4.4-.88);if(delta>=0){this.left.x=lower;this.right.x=lower+.88;}else{this.right.x=lower;this.left.x=lower+.88;}}
   // Freeze both poses before resolving either contact so simultaneous attacks
   // use the same frame, including traded hits and double KOs.
   const strikes=actors.map(a=>a.move?{a,move:{...a.move},tip:contact(a,this.frame),previous:a.previousTip}:null),hits=[];
   for(let i=0;i<2;i++){
    const a=actors[i],b=actors[1-i],strike=strikes[i];if(!strike)continue;const m=strike.move;
    if(a.moveFrame>=m.start&&a.moveFrame<m.start+m.active&&!a.resolved){
     if(m.id==='special'){
      this.projectiles.push({id:++this.projectileSerial,owner:i,ownerId:a.id,x:strike.tip.x,y:strike.tip.y,z:strike.tip.z,previousX:strike.tip.x,facing:a.facing,age:0,radius:m.radius,remaining:5,low:m.low});a.resolved=true;this.emit('launch',{actor:a.id,point:strike.tip});
     }else{
      const tip=strike.tip,previous=strike.previous||tip,segments=[{a:previous,b:tip,radius:m.radius}];
      // A close kick can touch with the actual shin before its foot. Include
      // that visible limb instead of enlarging an invisible reach rectangle.
      if(m.id==='kick')segments.push({a:world(a,samplePose(a,this.frame).kneeR),b:tip,radius:.11});
      let hit=null;
      for(const segment of segments)for(const box of getHurtboxes(b,this.frame)){const c=segmentClosest(segment.a,segment.b,box.a,box.b);if(c.distance<=box.radius+segment.radius&&!hit)hit=c;}
      if(hit){hits.push({a,b,move:m,point:hit.point,index:i});a.resolved=true;}
     }
    }
    a.previousTip=strike.tip;
   }
   for(const h of hits)this.damage(h.a,h.b,h.move,h.point,h.index);
   for(const p of [...this.projectiles]){
    if(actors[p.owner].hp<=0){p.remove=true;continue;}p.previousX=p.x;p.x+=p.facing*7/60;p.remaining-=7/60;p.age++;
    const target=actors[1-p.owner],point={x:p.x,y:p.y,z:p.z},previous={x:p.previousX,y:p.y,z:p.z};
    if(getHurtboxes(target,this.frame).some(box=>segmentDistance(previous,point,box.a,box.b)<=box.radius+p.radius)){
     this.damage(actors[p.owner],target,{...MOVES.special,low:p.low},point,p.owner);p.remove=true;
    }if(p.remaining<=0)p.remove=true;
   }
   this.projectiles=this.projectiles.filter(p=>!p.remove);
   for(const a of actors)if(a.move){a.moveFrame++;if(a.moveFrame>=a.move.start+a.move.active+a.move.recovery){a.move=null;a.moveFrame=0;a.previousTip=null;}}
   this.time--;
   if(this.left.hp<=0||this.right.hp<=0||this.time<=0){
    const l=this.left.hp,r=this.right.hp,winner=l===r?-1:l>r?0:1;this.winner=winner;if(winner>=0)this.wins[winner]++;
    this.message=winner<0?'DRAW':this.time<=0?'TIME':'K.O.';this.projectiles=[];
    this.emit('round',{kind:'round-end',reason:this.message==='K.O.'?'KO':this.message,round:this.round,winner});
    if(this.wins.some(n=>n>=2)){this.phase='complete';this.emit('complete',{winner});}else{this.phase='intermission';this.phaseFrames=145;}
   }
  }
 }
 const api={Fight,FIGHTERS,MOVES,samplePose,contact,getHurtboxes,world,segmentDistance,weight};root.Nation3DCombat=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
