/* Original procedural Lahore arena. All landmark, garden and paving forms are
 * real 3D geometry; no photographs, remote assets or baked background images. */
(function(root){
  'use strict';
  function create(THREE,scene,{quality='balanced'}={}){
    const group=new THREE.Group();group.name='Lahore — Minar-e-Pakistan';scene.add(group);
    const materials=[],geometries=[],textures=[],animated=[];
    const detail=quality==='low'?16:32;
    const mat=(color,roughness=.65,metalness=0,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});materials.push(m);return m;};
    const stone=mat(0xd8cbb9,.67),ivory=mat(0xeaddc4,.55),darkStone=mat(0x243c43,.44,.12),gold=mat(0xb28a45,.34,.62),bronze=mat(0x3f3020,.46,.5),glass=mat(0xf5c06d,.25,.1,{emissive:0xffad37,emissiveIntensity:2.2}),foliage=mat(0x18483d,.95),foliageLight=mat(0x2b6652,.9),trunk=mat(0x67503b,.95),flower=mat(0xce5f91,.8),waterMat=mat(0x174851,.15,.42,{transparent:true,opacity:.87});
    function geometry(g){geometries.push(g);return g;}
    function mesh(g,m,x=0,y=0,z=0,shadow=true){const o=new THREE.Mesh(geometry(g),m);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=shadow;group.add(o);return o;}
    function box(w,h,d,m,x,y,z,shadow=true){return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,shadow);}
    function cylinder(rt,rb,h,m,x,y,z,segments=detail){return mesh(new THREE.CylinderGeometry(rt,rb,h,segments),m,x,y,z);}
    function instanced(g,m,transforms,name){const o=new THREE.InstancedMesh(geometry(g),m,transforms.length);o.name=name||'';o.castShadow=true;o.receiveShadow=true;const dummy=new THREE.Object3D();transforms.forEach((t,i)=>{dummy.position.set(t.x||0,t.y||0,t.z||0);dummy.rotation.set(t.rx||0,t.ry||0,t.rz||0);dummy.scale.set(t.sx||1,t.sy||1,t.sz||1);dummy.updateMatrix();o.setMatrixAt(i,dummy.matrix);});o.instanceMatrix.needsUpdate=true;group.add(o);return o;}
    function canvasTexture(size,paint){const canvas=document.createElement('canvas');canvas.width=canvas.height=size;paint(canvas.getContext('2d'),size);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);return t;}
    let randomSeed=91607;function rand(){randomSeed=(1664525*randomSeed+1013904223)>>>0;return randomSeed/4294967296;}

    // A warm blue-hour dome, with volumetric-looking procedural cloud bands.
    const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uTime:{value:0}},vertexShader:'varying vec3 vDirection; void main(){vDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`
      varying vec3 vDirection; uniform float uTime;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      float fbm(vec2 p){float f=0.;float a=.5;for(int i=0;i<4;i++){f+=a*noise(p);p=p*2.03+vec2(3.7,7.1);a*=.5;}return f;}
      void main(){vec3 d=normalize(vDirection);float h=d.y;vec3 horizon=vec3(.82,.46,.35),mid=vec3(.25,.29,.47),zenith=vec3(.055,.10,.22);vec3 col=mix(horizon,mid,smoothstep(-.05,.38,h));col=mix(col,zenith,smoothstep(.28,.95,h));
      float glow=pow(max(0.,dot(d,normalize(vec3(-.65,.16,-1.)))),13.);col+=vec3(.65,.24,.09)*glow;
      vec2 p=d.xz/(max(.18,h+.3))*2.1;float n=fbm(p+vec2(uTime*.001,0.));float clouds=smoothstep(.48,.72,n)*smoothstep(-.04,.14,h)*(1.-smoothstep(.5,.92,h));col=mix(col,mix(vec3(.21,.22,.36),vec3(.82,.43,.36),glow),clouds*.62);
      gl_FragColor=vec4(col,1.);}`});materials.push(skyMaterial);
    const sky=mesh(new THREE.SphereGeometry(110,32,16),skyMaterial,0,0,0,false);sky.renderOrder=-100;
    const haloTexture=canvasTexture(128,(c,s)=>{const g=c.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'rgba(255,236,180,1)');g.addColorStop(.12,'rgba(255,195,107,.75)');g.addColorStop(.4,'rgba(255,132,64,.16)');g.addColorStop(1,'rgba(255,120,40,0)');c.fillStyle=g;c.fillRect(0,0,s,s);});
    function halo(x,y,z,size,opacity=.65){const m=new THREE.SpriteMaterial({map:haloTexture,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending});materials.push(m);const s=new THREE.Sprite(m);s.position.set(x,y,z);s.scale.set(size,size,1);group.add(s);return s;}
    const sunMaterial=new THREE.MeshBasicMaterial({color:0xffd29c,fog:false,toneMapped:false});materials.push(sunMaterial);mesh(new THREE.SphereGeometry(1.35,24,16),sunMaterial,-32,8.2,-76,false);halo(-32,8.2,-73.8,15,.7);
    const priorFog=scene.fog;scene.fog=new THREE.FogExp2(0x747482,.012);

    // The fighting forecourt is one flat, continuous ground surface at y = 0.
    const floorTexture=canvasTexture(1024,(c,s)=>{c.fillStyle='#aaa99f';c.fillRect(0,0,s,s);const tiles=4,t=s/tiles;for(let y=0;y<tiles;y++)for(let x=0;x<tiles;x++){const l=159+Math.floor(rand()*24);c.fillStyle=`rgb(${l+11},${l+8},${l})`;c.fillRect(x*t+1,y*t+1,t-2,t-2);for(let k=0;k<9;k++){c.beginPath();let px=x*t+rand()*t,py=y*t;c.moveTo(px,py);for(let j=0;j<9;j++){px+=(rand()-.45)*23;py+=t/8;c.lineTo(px,py);}c.strokeStyle=`rgba(75,73,66,${.025+rand()*.045})`;c.lineWidth=.7+rand()*1.5;c.stroke();}}c.strokeStyle='rgba(61,74,72,.45)';c.lineWidth=2;for(let n=0;n<=tiles;n++){c.beginPath();c.moveTo(n*t,0);c.lineTo(n*t,s);c.moveTo(0,n*t);c.lineTo(s,n*t);c.stroke();}});
    floorTexture.wrapS=floorTexture.wrapT=THREE.RepeatWrapping;floorTexture.repeat.set(9,8);floorTexture.anisotropy=4;
    const floorMat=mat(0xe4e4e0,.39,.09,{map:floorTexture,bumpMap:floorTexture,bumpScale:.016});const floor=mesh(new THREE.PlaneGeometry(80,70),floorMat,0,-.012,-9);floor.rotation.x=-Math.PI/2;floor.name='Flat marble fighting forecourt';floor.castShadow=false;
    const inlays=[];[-7.4,7.4].forEach(x=>inlays.push({x,y:.003,z:1.1,sx:.045,sy:.009,sz:13}));[-3.6,5.7].forEach(z=>inlays.push({x:0,y:.003,z,sx:14.8,sy:.009,sz:.045}));
    instanced(new THREE.BoxGeometry(1,1,1),darkStone,inlays,'Forecourt stone inlays');
    const starShape=new THREE.Shape();for(let i=0;i<16;i++){const a=i*Math.PI/8,r=i%2===0?1.45:.7;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(!i)starShape.moveTo(x,y);else starShape.lineTo(x,y);}starShape.closePath();const star=mesh(new THREE.ShapeGeometry(starShape),darkStone,0,.008,1.9,false);star.rotation.x=-Math.PI/2;
    const fightingRing=mesh(new THREE.RingGeometry(1.88,1.94,64),gold,0,.009,1.9,false);fightingRing.rotation.x=-Math.PI/2;

    // Reflecting pool behind the safe fighting zone. A shader shifts highlights
    // over real tessellated water; its low borders never enter the fighter lane.
    const poolZ=-7.4;box(12.8,.3,6.8,stone,0,.09,poolZ);box(12.1,.13,6.05,darkStone,0,.25,poolZ);
    const water=mesh(new THREE.PlaneGeometry(11.8,5.8,quality==='low'?16:32,quality==='low'?8:16),waterMat,0,.325,poolZ,false);water.rotation.x=-Math.PI/2;
    const waterPositions=water.geometry.attributes.position,waterBase=waterPositions.array.slice();animated.push(time=>{for(let i=0;i<waterPositions.count;i++){const x=waterBase[i*3],y=waterBase[i*3+1];waterPositions.array[i*3+2]=Math.sin(x*2.7+time*1.3)*Math.cos(y*3-time*.8)*.015;}waterPositions.needsUpdate=true;});
    const poolTrim=[];for(const z of [poolZ-3.23,poolZ+3.23])poolTrim.push({x:0,y:.28,z,sx:12.8,sy:.13,sz:.14});for(const x of [-6.33,6.33])poolTrim.push({x,y:.28,z:poolZ,sx:.14,sy:.13,sz:6.45});instanced(new THREE.BoxGeometry(1,1,1),ivory,poolTrim,'Pool marble coping');
    const jetMat=mat(0xb7e3ed,.18,.05,{transparent:true,opacity:.52,emissive:0x286c89,emissiveIntensity:.3});const jets=[];for(let i=-2;i<=2;i++)jets.push({x:i*1.8,y:.68,z:poolZ-.2,sx:.035,sy:.7+(i===0?.35:0),sz:.035});instanced(new THREE.CylinderGeometry(.6,1,1,8),jetMat,jets,'Five fountain jets');
    const ringMat=new THREE.MeshBasicMaterial({color:0xadc8c1,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false});materials.push(ringMat);for(let i=-2;i<=2;i++){const ring=mesh(new THREE.RingGeometry(.4,.425,32),ringMat,i*1.8,.35,poolZ-.2,false);ring.rotation.x=-Math.PI/2;animated.push(t=>{const r=1+Math.sin(t*.9+i)*.18;ring.scale.set(r,r,1);});}

    // Minar-e-Pakistan: terraced platform, eight flared concrete petals, tapered
    // structural ribs, elevated observation balconies and the lantern crown.
    const towerStart=group.children.length,towerZ=-20.4;
    cylinder(3.6,3.8,.22,stone,0,.12,towerZ,64);cylinder(3.3,3.45,.24,ivory,0,.35,towerZ,64);cylinder(3.0,3.15,.25,stone,0,.59,towerZ,64);
    const stairs=[];for(let n=0;n<7;n++)stairs.push({x:0,y:.055+n*.074,z:towerZ+5.3-n*.36,sx:4.5,sy:.11+n*.148,sz:.39});instanced(new THREE.BoxGeometry(1,1,1),stone,stairs,'Tower approach steps');
    const petalProfile=[new THREE.Vector2(1.78,.7),new THREE.Vector2(1.58,.94),new THREE.Vector2(1.3,1.3),new THREE.Vector2(1.10,1.7),new THREE.Vector2(1.07,1.98),new THREE.Vector2(1.17,2.3),new THREE.Vector2(1.41,2.59),new THREE.Vector2(1.78,2.84),new THREE.Vector2(2.11,2.97)];
    const petals=[];for(let i=0;i<8;i++)petals.push({x:0,y:0,z:towerZ,ry:i*Math.PI/4});const petalMat=mat(0xd9ccb3,.55,0,{side:THREE.DoubleSide});instanced(new THREE.LatheGeometry(petalProfile,14,-.34,.68),petalMat,petals,'Eight flared Minar petals');
    const petalLips=[];for(let i=0;i<8;i++)for(let j=0;j<5;j++){const a=i*Math.PI/4-.29+j*.145;petalLips.push({x:Math.sin(a)*2.08,y:2.98,z:towerZ+Math.cos(a)*2.08,ry:a,sx:.13,sy:.09,sz:.24});}instanced(new THREE.BoxGeometry(1,1,1),ivory,petalLips,'Sculpted petal upper rim');
    const towerCore=mat(0x6d736f,.72,.05);cylinder(.22,.68,7.8,towerCore,0,6.55,towerZ,24);
    const ribPoints=[];for(let j=0;j<16;j++){const t=j/15;ribPoints.push(new THREE.Vector3(.87-Math.pow(t,.62)*.6,2.65+t*7.9,0));}
    const ribCurve=new THREE.CatmullRomCurve3(ribPoints);const ribs=[];for(let i=0;i<8;i++)ribs.push({x:0,y:0,z:towerZ,ry:i*Math.PI/4});instanced(new THREE.TubeGeometry(ribCurve,30,.055,6,false),ivory,ribs,'Eight tapered structural ribs');
    const ringHeights=[3.45,4.65,5.9,7.2,8.6,10.45];for(const y of ringHeights){const t=(y-2.65)/7.9,r=.87-Math.pow(t,.62)*.6;cylinder(r+.075,r+.075,.105,ivory,0,y,towerZ,32);}
    const balcony=cylinder(.62,.43,.16,gold,0,10.52,towerZ,32);balcony.name='Observation balcony';cylinder(.47,.4,.1,ivory,0,10.65,towerZ,32);cylinder(.29,.31,.85,towerCore,0,11.1,towerZ,24);
    const crownPosts=[];for(let i=0;i<8;i++){const a=i*Math.PI/4;crownPosts.push({x:Math.sin(a)*.36,y:11.12,z:towerZ+Math.cos(a)*.36,sx:.045,sy:.91,sz:.045});}instanced(new THREE.CylinderGeometry(1,1,1,6),ivory,crownPosts,'Lantern crown columns');
    cylinder(.43,.48,.1,ivory,0,11.59,towerZ,32);const dome=mesh(new THREE.SphereGeometry(.37,24,12,0,Math.PI*2,0,Math.PI/2),gold,0,11.65,towerZ);dome.scale.y=1.15;cylinder(.015,.035,.48,gold,0,12.15,towerZ,8);mesh(new THREE.SphereGeometry(.065,12,8),gold,0,12.42,towerZ);
    const balconyPosts=[];for(let i=0;i<16;i++){const a=i*Math.PI/8;balconyPosts.push({x:Math.sin(a)*.57,y:10.83,z:towerZ+Math.cos(a)*.57,sx:.025,sy:.36,sz:.025});}instanced(new THREE.BoxGeometry(1,1,1),gold,balconyPosts,'Observation balcony railing');const balconyRail=mesh(new THREE.TorusGeometry(.57,.022,6,32),gold,0,11.02,towerZ);balconyRail.rotation.x=Math.PI/2;
    halo(0,2.3,towerZ+1.3,3,.20);const towerLight=new THREE.PointLight(0xffcb86,24,16,2);towerLight.position.set(0,2.6,towerZ+3.4);group.add(towerLight);
    const towerGroup=new THREE.Group();towerGroup.name='Minar-e-Pakistan landmark';towerGroup.position.z=towerZ;for(const object of [...group.children].slice(towerStart)){object.position.z-=towerZ;towerGroup.add(object);}towerGroup.scale.setScalar(.75);group.add(towerGroup);

    // Garden edges, stone lattice and repeating warm lanterns frame the view.
    const planterBoxes=[],hedges=[],flowers=[],posts=[],rails=[],lampBases=[],lampCaps=[],lampWindows=[],lampLegs=[];
    const lampPositions=[[-8.4,-1.6],[8.4,-1.6],[-8.6,-8.6],[8.6,-8.6],[-10.9,-13.7],[10.9,-13.7],[-13,-21],[13,-21]];
    for(const [x,z] of lampPositions){planterBoxes.push({x,y:.24,z,sx:1.65,sy:.48,sz:1.65});hedges.push({x,y:.63,z,sx:.72,sy:.43,sz:.72});for(let k=0;k<4;k++)flowers.push({x:x+(rand()-.5)*1.25,y:.84+rand()*.1,z:z+(rand()-.5)*1.25,sx:.13,sy:.10,sz:.13});
      const lx=x,ly=1.42,lz=z;lampBases.push({x:lx,y:.67,z:lz,sx:.42,sy:1.34,sz:.42});lampCaps.push({x:lx,y:1.97,z:lz,sx:.64,sy:.1,sz:.64},{x:lx,y:1.45,z:lz,sx:.52,sy:.08,sz:.52});lampWindows.push({x:lx,y:1.7,z:lz,sx:.31,sy:.43,sz:.31});for(const dx of [-.23,.23])for(const dz of [-.23,.23])lampLegs.push({x:lx+dx,y:1.72,z:lz+dz,sx:.035,sy:.48,sz:.035});halo(lx,1.71,lz,.95,.43);
    }
    instanced(new THREE.BoxGeometry(1,1,1),stone,planterBoxes,'Marble garden planters');instanced(new THREE.SphereGeometry(1,12,8),foliage,hedges,'Clipped garden shrubs');instanced(new THREE.SphereGeometry(1,8,6),flower,flowers,'Garden flowers');instanced(new THREE.BoxGeometry(1,1,1),ivory,lampBases,'Lantern stone plinths');instanced(new THREE.BoxGeometry(1,1,1),bronze,lampCaps,'Lantern bronze hoods');instanced(new THREE.BoxGeometry(1,1,1),glass,lampWindows,'Lantern glowing panes');instanced(new THREE.BoxGeometry(1,1,1),bronze,lampLegs,'Lantern bronze frames');
    for(const side of [-1,1]){for(let i=0;i<10;i++){const x=side*(7.4+i*1.35),z=-12.6;posts.push({x,y:.6,z,sx:.28,sy:1.2,sz:.34});if(i<9){rails.push({x:x+side*.675,y:.95,z,sx:1.1,sy:.1,sz:.14},{x:x+side*.675,y:.25,z,sx:1.1,sy:.1,sz:.14});for(let k=0;k<4;k++)rails.push({x:x+side*(.2+k*.25),y:.6,z,sx:.08,sy:.65,sz:.08});}}}
    instanced(new THREE.BoxGeometry(1,1,1),ivory,posts,'Garden balustrade posts');instanced(new THREE.BoxGeometry(1,1,1),stone,rails,'Garden balustrade lattice');
    const cypressTrunks=[],cypressCrowns=[];for(const side of [-1,1])for(let i=0;i<9;i++){const x=side*(11+i*1.6),z=-15-i*1.7,h=3.8+rand()*2.5;cypressTrunks.push({x,y:h*.28,z,sx:.16,sy:h*.56,sz:.16});cypressCrowns.push({x,y:h*.65,z,sx:.65+rand()*.3,sy:h*.62,sz:.65+rand()*.3});}
    instanced(new THREE.CylinderGeometry(.7,1,1,6),trunk,cypressTrunks,'Cypress trunks');instanced(new THREE.ConeGeometry(1,1,10),foliage,cypressCrowns,'Cypress trees');
    const palmTrunks=[],palmLeaves=[];for(const [x,z,h] of [[-13,-8,5.8],[13,-8.8,6.4],[-18,-22,7],[19,-25,7.3]]){palmTrunks.push({x,y:h/2,z,sx:.2,sy:h,sz:.2});for(let j=0;j<9;j++)palmLeaves.push({x,y:h,z,ry:j*Math.PI*2/9,rx:(j%2)*.1,sx:1,sy:1,sz:1});}
    const frondPositions=[],frondIndices=[];function frondTriangle(a,b,c){const n=frondPositions.length/3;frondPositions.push(...a,...b,...c);frondIndices.push(n,n+1,n+2);}for(let k=0;k<20;k++){const t=k/20,z=t*2.55,y=.75*Math.sin(t*Math.PI)-t*t*.7,next=(k+1)/20,zn=next*2.55,yn=.75*Math.sin(next*Math.PI)-next*next*.7;frondTriangle([-.035,y,z],[.035,y,z],[0,yn,zn]);if(k<2)continue;const w=.22+Math.sin(t*Math.PI)*.28;for(const side of [-1,1])frondTriangle([0,y,z],[side*w,y-.075,z-.26],[side*.03,yn,zn]);}const frondGeometry=new THREE.BufferGeometry();frondGeometry.setAttribute('position',new THREE.Float32BufferAttribute(frondPositions,3));frondGeometry.setIndex(frondIndices);frondGeometry.computeVertexNormals();const palmMaterial=mat(0x356c50,.9,0,{side:THREE.DoubleSide});
    instanced(new THREE.CylinderGeometry(.65,1,1,8),trunk,palmTrunks,'Palm trunks');instanced(frondGeometry,palmMaterial,palmLeaves,'Feathered palm fronds');

    // An original low-detail Mughal skyline locates the scene in Lahore.
    const skyline=mat(0x535566,.98),skylineAccent=mat(0x655f6a,.95);const mosqueZ=-48;
    box(16,1.7,4,skyline,13,.85,mosqueZ);box(7,.7,3.5,skyline,13,2,mosqueZ);
    for(const [x,r,y] of [[13,1.35,2.4],[8.8,.85,2.05],[17.2,.85,2.05]]){const d=mesh(new THREE.SphereGeometry(r,20,12,0,Math.PI*2,0,Math.PI/2),skylineAccent,x,y,mosqueZ);d.scale.y=1.1;cylinder(.025,.04,.55,skylineAccent,x,y+r*1.1+.22,mosqueZ,8);}
    for(const x of [4.7,21.3]){cylinder(.28,.4,5.3,skyline,x,2.65,mosqueZ);cylinder(.49,.49,.16,skylineAccent,x,4.65,mosqueZ,16);cylinder(.36,.36,.55,skyline,x,5.42,mosqueZ,16);mesh(new THREE.SphereGeometry(.43,16,8,0,Math.PI*2,0,Math.PI/2),skylineAccent,x,5.71,mosqueZ);}
    const distantBlocks=[];for(let i=0;i<30;i++){const x=-53+i*3.7,h=.6+rand()*1.6;distantBlocks.push({x,y:h/2,z:-56-rand()*7,sx:2+rand()*1.7,sy:h,sz:2+rand()*2});}instanced(new THREE.BoxGeometry(1,1,1),skyline,distantBlocks,'Distant Lahore rooftops');

    group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(towerGroup),dimensions=bounds.getSize(new THREE.Vector3());let meshCount=0,triangles=0,towerMeshCount=0;group.traverse(object=>{if(!object.isMesh)return;meshCount++;const g=object.geometry;triangles+=(g.index?g.index.count:g.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);});towerGroup.traverse(object=>{if(object.isMesh)towerMeshCount++;});
    const debug={landmark:'Minar-e-Pakistan',geometry:true,externalAssets:0,quality,floorY:0,meshCount,triangles,tower:{x:0,z:towerZ,top:bounds.max.y,meshCount:towerMeshCount,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray(),width:dimensions.x,height:dimensions.y,depth:dimensions.z}},fightingBounds:{minX:-4.5,maxX:4.5,z:0},water:{z:poolZ},animatedWater:true};
    let disposed=false;
    return {group,debug,update(time){if(disposed)return;skyMaterial.uniforms.uTime.value=time;for(const update of animated)update(time);},dispose(){if(disposed)return;disposed=true;scene.remove(group);scene.fog=priorFog;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
  }
  root.Nation3DArena={create};
})(typeof window!=='undefined'?window:globalThis);
