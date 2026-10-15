(() => {
 'use strict';
 const root=window,$=id=>document.getElementById(id);
 const reduced=root.matchMedia('(prefers-reduced-motion: reduce)'),fine=root.matchMedia('(hover: hover) and (pointer: fine)');
 let selection={},match={},status={state:'preparing',message:'Preparing your champions…'},tiltFrame=0;
 const fighter=data=>data?.data||data||{};
 const powerFor=(power,data)=>power||root.NationPowers?.get?.(fighter(data).id)||{};
 const powerName=power=>power?.name||power?.label||power?.displayName||'Signature power';
 const color=(value,fallback)=>typeof value==='string'&&root.CSS?.supports?.('color',value)?value:fallback;
 const powerColor=(power,fallback)=>color(power?.color||power?.accent||power?.colors?.[0],fallback);
 function text(id,value){const el=$(id);if(el&&el.textContent!==String(value??''))el.textContent=value??'';}
 function image(id,src,alt,placeholder){
  const el=$(id);if(!el)return;
  el.alt=alt||'';
  if(src){if(el.getAttribute('src')!==src)el.setAttribute('src',src);el.hidden=false;}
  else{el.hidden=true;el.removeAttribute('src');}
  if(placeholder&&$(placeholder))$(placeholder).hidden=!!src;
 }
 function renderSelection(){
  const entries=[selection.left,selection.right];
  entries.forEach((value,index)=>{
   const data=fighter(value),side=index===0?'left':'right',panel=$('hero-'+side),power=powerFor(selection.powers?.[index],data);
   const accent=color(data.colors?.[0],index===0?'#73dbf1':'#f1c789');
   if(panel){panel.style.setProperty('--fighter-accent',accent);panel.style.setProperty('--power-accent',powerColor(power,accent));panel.dataset.countryId=data.id||'';panel.classList.toggle('is-picking',Number(selection.picking||0)===index);}
   text('hero-'+side+'-country',data.country||'Choose a champion');
   text('hero-'+side+'-name',[data.name,data.style].filter(Boolean).join(' · ')||'Your fighting spirit');
   text('hero-'+side+'-power',powerName(power));
   const powerLabel=$('hero-'+side+'-power');if(powerLabel)powerLabel.title=power.description||power.flavor||'A country-inspired fantasy ability. Recharge between uses.';
   image('hero-'+side+'-portrait',selection.portraits?.[index],data.country?data.country+' fighter: '+(data.name||data.country):'Selected fighter','hero-'+side+'-placeholder');
   image('hero-'+side+'-flag',selection.flags?.[index],data.country?data.country+' flag':'');
  });
  const arena=selection.arena||{};
  text('hero-arena',[arena.name,arena.city].filter(Boolean).join(' · ')||'CHOOSE YOUR WORLD LANDMARK');
  const stage=$('hero-stage');if(stage){stage.dataset.ready=String(!!selection.ready);stage.setAttribute('aria-label',[fighter(selection.left).country,fighter(selection.right).country].filter(Boolean).join(' versus ')||'Your selected matchup');}
 }
 function updateSelection(value={}){selection={...selection,...value};renderSelection();}
 function updateMatch(value={}){
  match={...selection,...value};
  [match.left,match.right].forEach((value,index)=>{
   const data=fighter(value),side=index===0?'left':'right',power=powerFor(match.powers?.[index],data),el=$(side+'-signature');
   if(!el)return;
   el.style.setProperty('--power-color',powerColor(power,index===0?'#d8fa84':'#73dbf1'));
   el.title=power.description||powerName(power);
   el.dataset.power=power.id||powerName(power);
   el.dataset.ready='true';
   text(side+'-signature',powerName(power)+' · READY');
  });
 }
 function setStatus(value={}){
  status={...status,...value};
  const el=$('asset-status');if(!el)return;
  el.dataset.state=status.state||'preparing';
  text('asset-status',status.message||({ready:'Champions ready. Choose your matchup.',loading:'Loading your selected fighters…',error:'Artwork could not load. Please try again.',preparing:'Preparing your champions…'}[status.state])||'Preparing your champions…');
 }
 function resetTilt(){if(tiltFrame)root.cancelAnimationFrame(tiltFrame);tiltFrame=0;const el=$('hero-stage');if(el){el.style.removeProperty('--tilt-x');el.style.removeProperty('--tilt-y');}}
 function setFight(active){document.body.classList.toggle('in-fight',!!active);if(active)resetTilt();}
 const hero=$('hero-stage');
 if(hero){
  hero.addEventListener('pointermove',event=>{
   if(reduced.matches||!fine.matches||event.pointerType==='touch'||tiltFrame)return;
   const x=event.clientX,y=event.clientY;
   tiltFrame=root.requestAnimationFrame(()=>{tiltFrame=0;const box=hero.getBoundingClientRect();hero.style.setProperty('--tilt-x',((.5-(y-box.top)/box.height)*3).toFixed(2)+'deg');hero.style.setProperty('--tilt-y',(((x-box.left)/box.width-.5)*4).toFixed(2)+'deg');});
  });
  hero.addEventListener('pointerleave',resetTilt);hero.addEventListener('pointercancel',resetTilt);
 }
 reduced.addEventListener?.('change',resetTilt);fine.addEventListener?.('change',resetTilt);
 root.NationPresentation={updateSelection,updateMatch,setStatus,setFight,get debug(){return {selectedIds:[fighter(selection.left).id,fighter(selection.right).id],matchIds:[fighter(match.left).id,fighter(match.right).id],ready:!!selection.ready,status:status.state,reducedMotion:reduced.matches};}};
 setStatus(status);
})();
