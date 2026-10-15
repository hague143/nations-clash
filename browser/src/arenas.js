(function(root){
 'use strict';
 const catalog=root.NationArenaCatalog||(typeof require==='function'?require('./arena-catalog.js'):null);
 const ARENAS=catalog.ARENAS;
 const IMAGE_DATA=/* ARENA_IMAGE_DATA */null;
 const cache=new Map(),pending=new Map(),MAX_DECODED=3;
 let retained=null;
 const getArena=id=>ARENAS.find(a=>a.id===id)||ARENAS[0];
 function trim(keep){
  for(const id of [...cache.keys()]){
   if(cache.size<=MAX_DECODED)break;
   if(id!==retained&&id!==keep)cache.delete(id);
  }
 }
 function retain(id){retained=getArena(id).id;trim(retained);return retained;}
 function release(){retained=null;trim();}
 async function ensure(id){
  id=getArena(id).id;
  if(cache.has(id)){const image=cache.get(id);cache.delete(id);cache.set(id,image);return image;}
  if(!pending.has(id)){
   const uri=IMAGE_DATA?.[id];
   if(!uri)throw new Error('This arena artwork has not been bundled. Please use the complete game download.');
   pending.set(id,new Promise((resolve,reject)=>{
    const image=new root.Image();image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error('The selected arena artwork could not load. Please download the complete game again.'));
    image.src=uri;
   }));
  }
  try{const image=await pending.get(id);cache.delete(id);cache.set(id,image);trim(id);return image;}
  finally{pending.delete(id);}
 }
 function drawScene(c,id,t=0,options={}){
  const arena=getArena(id),image=cache.get(arena.id),width=options.width||1280,height=options.height||720;
  c.save();
  if(image)c.drawImage(image,0,0,width,height);
  else{
   // A neutral loading surface never displays a different selected location.
   const sky=c.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#101b29');sky.addColorStop(1,'#26383d');
   c.fillStyle=sky;c.fillRect(0,0,width,height);
  }
  c.restore();return arena;
 }
 const api={ARENAS,getArena,ensure,retain,release,drawScene,MAX_DECODED,
  get loadedIds(){return [...cache.keys()];},get retainedId(){return retained;}};
 root.NationArenas=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
