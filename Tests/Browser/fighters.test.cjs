const test=require('node:test');
const assert=require('node:assert/strict');
const combat=require('../../browser/src/combat.js');
const {ROSTER}=require('../../browser/src/roster.js');
const renderer=require('../../browser/src/fighters.js');
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);

test('every country has finite complete idle, movement, jump, crouch, guard and hit geometry',()=>{
  for(const data of ROSTER)for(const pose of ['idle','walk','jump','block','hit'])for(const low of [false,true]){
    const p=renderer.geometry({data,x:-1.2,y:pose==='jump'?.6:0,facing:-1,pose,low,guard:pose==='block',stun:19,move:null},1.25);
    for(const [name,value]of Object.entries(p))if(Array.isArray(value))assert.ok(value.every(Number.isFinite),`${data.id} ${pose} ${name}`);
    assert.ok(p.head[1]<p.shoulder[1],`${data.id} head above shoulders`);
    assert.ok(p.shoulder[1]<p.hip[1],`${data.id} shoulders above hips`);
  }
});

test('all active melee knuckle/toe tips agree with engine contact, in both facings and low attacks',()=>{
  for(const data of ROSTER)for(const action of Object.keys(combat.MOVES))for(const facing of [-1,1])for(const low of [false,true]){
    const move=combat.getMoveSpec(data,action,{low});
    const f={data,x:2.34,y:.25,facing,pose:action,low,guard:false,move,moveFrame:move.start+1};
    const p=renderer.geometry(f,.75),tip=p.strikeTip,contact=combat.contact(f);
    // Energy techniques have a normal-length physical arm and an exact ranged endpoint.
    const ranged=['special','ultimate'].includes(action)&&move.reach*renderer.MODEL_PPU>165;
    if(ranged){assert.ok(tip[0]<=112);close(p.energyTip[0],move.reach*renderer.MODEL_PPU);close(p.energyTip[1],-move.height*renderer.MODEL_PPU);}
    else {close(f.x+tip[0]*facing/renderer.MODEL_PPU,contact.x);close(f.y-tip[1]/renderer.MODEL_PPU,contact.y);}
  }
});

test('anticipation and recovery interpolate the actual contact tip without overshooting',()=>{
  const data=ROSTER.find(c=>c.id==='us');
  for(const action of ['light','heavy','throw','break']){
    const move=combat.getMoveSpec(data,action);let previous=0;
    for(let frame=0;frame<=move.start;frame++){
      const p=renderer.geometry({data,x:0,y:0,facing:1,pose:action,move,moveFrame:frame},0);
      assert.ok(p.extension>=previous);assert.ok(p.extension<=1);previous=p.extension;
    }
    let previousRecovery=1;
    for(let frame=move.start+move.active;frame<=move.start+move.active+move.recovery;frame++){
      const p=renderer.geometry({data,x:0,y:0,facing:1,pose:action,move,moveFrame:frame},0);
      assert.ok(p.extension<=previousRecovery);assert.ok(p.extension>=0);previousRecovery=p.extension;
    }
  }
});

test('readable flag helper reverses the local mirror rather than flipping flag pixels',()=>{
  const image={complete:true,naturalWidth:100};
  for(const facing of [-1,1]){
    const calls=[],ctx={globalAlpha:1,save(){},restore(){},scale(...args){calls.push(['scale',...args]);},drawImage(...args){calls.push(['drawImage',...args]);}};
    assert.equal(renderer.drawFlagCloth(ctx,'us',{x:-65,y:-45,w:130,h:90},{flags:{us:image}},{facing}),true);
    const draw=calls.find(c=>c[0]==='drawImage');assert.deepEqual(draw.slice(2),[-65,-45,130,90]);
    assert.equal(calls.some(c=>c[0]==='scale'),facing===-1);
  }
});

test('flag correction keeps an asymmetric cloth panel in the same local area',()=>{
  const image={complete:true,naturalWidth:100},calls=[];
  const ctx={globalAlpha:1,save(){},restore(){},scale(...args){calls.push(args);},drawImage(...args){calls.push(args.slice(1));}};
  renderer.drawFlagCloth(ctx,'pk',{x:15,y:-120,width:40,height:35},{flags:{pk:image}},{facing:-1});
  assert.deepEqual(calls,[[-1,1],[-55,-120,40,35]]);
});
