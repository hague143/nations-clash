(function(root){
  'use strict';
  const ARENAS=[
    {id:'lahore',name:'Minar-e-Pakistan',city:'Lahore, Pakistan',country:'pk',subtitle:'The illuminated garden',icon:'☾',accent:'#72edb6',music:{tempo:104,key:50,scale:[0,2,3,7,8],melody:[0,2,4,3,2,1,0,3]}},
    {id:'times-square',name:'Times Square',city:'New York, United States',country:'us',subtitle:'Electric city showdown',icon:'▥',accent:'#ff63c7',music:{tempo:118,key:45,scale:[0,3,5,7,10],melody:[0,2,3,4,3,2,1,2]}},
    {id:'tokyo',name:'Shibuya Crossing',city:'Tokyo, Japan',country:'jp',subtitle:'Neon beneath the rain',icon:'◈',accent:'#bf98ff',music:{tempo:112,key:52,scale:[0,2,3,7,8],melody:[0,1,3,4,3,2,1,3]}},
    {id:'paris',name:'Eiffel Promenade',city:'Paris, France',country:'fr',subtitle:'The golden hour',icon:'♜',accent:'#f5c56a',music:{tempo:100,key:48,scale:[0,2,4,7,9],melody:[0,2,3,4,3,2,1,0]}},
    {id:'great-wall',name:'The Great Wall',city:'Beijing, China',country:'cn',subtitle:'Beyond the mountain mist',icon:'▰',accent:'#e7b679',music:{tempo:108,key:48,scale:[0,2,4,7,9],melody:[0,1,2,4,3,2,1,3]}},
    {id:'rio',name:'Copacabana',city:'Rio de Janeiro, Brazil',country:'br',subtitle:'Oceanfront champions',icon:'≈',accent:'#66e8d6',music:{tempo:116,key:50,scale:[0,2,4,7,9],melody:[0,2,4,2,3,1,2,0]}},
    {id:'giza',name:'Giza Pyramids',city:'Giza, Egypt',country:'eg',subtitle:'The desert awakens',icon:'△',accent:'#ffd08d',music:{tempo:100,key:45,scale:[0,1,4,5,7,8,11],melody:[0,2,3,4,3,2,1,4]}},
    {id:'london',name:'Tower Bridge',city:'London, United Kingdom',country:'gb',subtitle:'Rivals above the Thames',icon:'╬',accent:'#94c6ea',music:{tempo:110,key:47,scale:[0,2,3,5,7,10],melody:[0,2,4,5,4,2,1,3]}},
    {id:'sydney',name:'Sydney Harbour',city:'Sydney, Australia',country:'au',subtitle:'Under the southern sky',icon:'◭',accent:'#ffb485',music:{tempo:106,key:52,scale:[0,2,4,7,9],melody:[0,3,2,4,2,1,3,0]}},
    {id:'dubai',name:'Burj Khalifa Plaza',city:'Dubai, United Arab Emirates',country:'ae',subtitle:'A skyline without limits',icon:'◇',accent:'#dac2ff',music:{tempo:114,key:49,scale:[0,1,4,5,7,8,10],melody:[0,2,3,4,3,2,1,0]}}
  ];
  const cache=new Map(),TAU=Math.PI*2;
  function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
  function stroke(c,points,color,width=1,closed=false){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));if(closed)c.closePath();c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.stroke();}
  function poly(c,points,color){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();}
  function disc(c,x,y,r,color){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=color;c.fill();}
  function label(c,value,x,y,size,color,align='center'){c.font=`${size>16?'800':'600'} ${size}px Segoe UI,Arial,sans-serif`;c.textAlign=align;c.fillStyle=color;c.fillText(value,x,y);}
  function gradient(c,y0,y1,stops){const g=c.createLinearGradient(0,y0,0,y1);stops.forEach(([at,color])=>g.addColorStop(at,color));return g;}
  function sky(c,colors){rect(c,0,0,1280,720,gradient(c,0,610,colors));}
  function stars(c,count=45){for(let i=0;i<count;i++)disc(c,(i*197+53)%1280,40+(i*61)%235,.5+(i%3)*.35,'#d8ebee66');}
  function buildings(c,base,color,step=60,height=160,windows=false){for(let i=0;i<24;i++){const x=i*step-25,h=25+(i*37)%height;rect(c,x,base-h,step-8,h,color);if(windows)for(let row=0;row<h/16-1;row++)for(let col=0;col<3;col++)if((row+col+i)%3)rect(c,x+8+col*13,base-h+8+row*16,4,5,'#f9dba533');}}
  function moon(c,x,y,r,color='#ebf1d1'){disc(c,x,y,r,color);disc(c,x+r*.32,y-r*.2,r*.94,'#112c36');}
  function palm(c,x,y,s=1){stroke(c,[[x,y],[x+5*s,y-72*s],[x+14*s,y-132*s]],'#203e38',10*s);const top=[x+14*s,y-132*s];for(let i=0;i<7;i++){const a=-Math.PI+.35+i*.42;stroke(c,[top,[top[0]+Math.cos(a)*40*s,top[1]+Math.sin(a)*26*s],[top[0]+Math.cos(a)*72*s,top[1]+Math.sin(a)*12*s+18*s]],'#194a3c',9*s);}}
  function railing(c,y,color='#466473',ornate=false){rect(c,0,y,1280,7,color);rect(c,0,y+31,1280,4,color);for(let x=18;x<1280;x+=42){rect(c,x,y,4,34,color);if(ornate){c.beginPath();c.arc(x+22,y+17,10,0,TAU);c.strokeStyle=color;c.lineWidth=2;c.stroke();}}}
  function floor(c,a,style){const floorColors={stone:['#394b4e','#16282e'],street:['#252b45','#141c32'],sand:['#80654b','#41382f'],wood:['#715558','#282f41'],mosaic:['#e2cbb1','#647b7b']};const colors=floorColors[style]||floorColors.stone;
    rect(c,0,465,1280,175,gradient(c,465,640,[[0,colors[0]],[1,colors[1]]]));
    stroke(c,[[0,471],[1280,471]],a.accent+'99',3);
    if(style==='street'){
      for(let x=-100;x<1380;x+=210)poly(c,[[x,480],[x+85,480],[x+50,622],[x-75,622]],'#afbed62a');
      stroke(c,[[0,577],[1280,577]],'#eff1ce4d',3);
    }else if(style==='mosaic'){
      for(let row=0;row<6;row++){c.beginPath();for(let x=0;x<=1280;x+=10){const y=486+row*24+Math.sin(x/65+row)*8;x?c.lineTo(x,y):c.moveTo(x,y);}c.strokeStyle=row%2?'#efdfc1':'#233c46';c.lineWidth=11;c.stroke();}
    }else{
      for(let i=-14;i<15;i++)stroke(c,[[640+i*55,470],[640+i*110,640]],style==='wood'?'#b9948d44':'#d2d0bc26');
      for(let row=0;row<8;row++){const y=472+row*row*3.6;stroke(c,[[0,y],[1280,y]],style==='wood'?'#bba99940':'#d2d0bc22');}
    }
    rect(c,0,632,1280,88,'#08121f');stroke(c,[[0,634],[1280,634]],a.accent+'80',3);
    label(c,'N A T I O N C L A S H',640,609,28,a.accent+'19');
  }
  function lahore(c,a){
    sky(c,[[0,'#061c29'],[.6,'#1b4a4a'],[1,'#7e795d']]);stars(c);moon(c,1035,164,28);
    buildings(c,429,'#17323a',71,100,true);
    for(let x=45;x<1280;x+=100){poly(c,[[x-25,429],[x-15,389],[x,378],[x+15,389],[x+25,429]],'#173e38');rect(c,x-2,414,4,29,'#34563c');}
    // Minar's tapered fluted shaft, petal base and lantern crown.
    const x=349;
    poly(c,[[x-52,425],[x-28,399],[x-15,236],[x-8,209],[x+8,209],[x+15,236],[x+28,399],[x+52,425]],'#b7c4b0');
    poly(c,[[x+6,212],[x+15,236],[x+28,399],[x+52,425],[x+15,425]],'#657e76');
    for(let dx=-13;dx<=13;dx+=6)stroke(c,[[x+dx*.55,226],[x+dx*1.6,396]],'#e2dcca88',2);
    for(const [y,w]of [[231,31],[278,35],[353,45],[386,54]]){rect(c,x-w/2,y,w,5,'#e1dbc8');rect(c,x-w/2,y+5,w,3,'#536f70');}
    rect(c,x-16,203,32,9,'#e1d8ad');rect(c,x-10,187,20,17,'#d5d3b9');
    for(let dx=-6;dx<=6;dx+=6)rect(c,x+dx,188,2,13,'#5b7472');
    poly(c,[[x-15,187],[x,170],[x+15,187]],'#e4d2a1');stroke(c,[[x,172],[x,146]],'#dbd2ad',2);
    for(let i=-3;i<=3;i++)poly(c,[[x+i*18-10,425],[x+i*16,398],[x+i*18+10,425]],i%2?'#d4d1b4':'#a4b4a7');
    for(let y=425;y<448;y+=6)rect(c,x-75-(y-425),y,150+(y-425)*2,4,'#c7bfa0');
    // A distant Mughal pavilion gives the garden architectural depth.
    const p=905;rect(c,p-92,387,184,54,'#9d8b72');rect(c,p-98,382,196,7,'#b7a382');
    for(let i=-3;i<=3;i++){c.beginPath();c.arc(p+i*24,408,9,Math.PI,0);c.lineTo(p+i*24+9,438);c.lineTo(p+i*24-9,438);c.fillStyle='#354749';c.fill();}
    poly(c,[[p-39,383],[p-30,350],[p,328],[p+30,350],[p+39,383]],'#ad9d7b');disc(c,p,337,11,'#baaf8a');
    stroke(c,[[p,329],[p,315]],'#d9d0a6',2);
    rect(c,0,448,1280,17,'#42594b');
    for(const lx of [96,1177]){rect(c,lx-3,301,6,165,'#9da78e');disc(c,lx,302,8,'#ffebbb');disc(c,lx,302,23,'#ffebbb14');}
    floor(c,a,'stone');
  }
  function times(c,a){
    sky(c,[[0,'#100d2c'],[.6,'#292446'],[1,'#403450']]);
    buildings(c,465,'#141627',67,220,true);
    for(const [x,w,h]of [[15,179,320],[214,170,374],[411,140,278],[773,155,329],[954,159,367],[1135,144,279]]){
      rect(c,x,465-h,w,h,'#252939');poly(c,[[x,465-h],[x+15,450-h],[x+w+15,450-h],[x+w,465-h]],'#37384b');
      for(let row=0;row<Math.floor(h/21);row++)for(let col=0;col<Math.floor(w/18);col++)rect(c,x+8+col*18,474-h+row*21,6,8,(row+col)%3?'#d4dfec35':'#f7a9db5e');
    }
    const screens=[[42,226,137,98,'#07394c','#4ed9eb','WORLD','ARENA'],[228,128,137,156,'#642347','#ff93cc','NATION','CLASH'],[424,276,111,103,'#5439a3','#d2b7ff','FIGHT','LIVE'],[786,195,128,143,'#244c56','#a7ffe2','CHAMPIONS','2026'],[968,144,129,183,'#532758','#ff87bd','YOUR','NATION'],[1150,312,119,94,'#766129','#ffe49c','PLAY','WORLD']];
    for(const [x,y,w,h,bg,ink,l1,l2]of screens){rect(c,x-3,y-3,w+6,h+6,'#899db152');rect(c,x,y,w,h,bg);for(let i=0;i<8;i++)stroke(c,[[x,y+i*h/8],[x+w,y+i*h/8]],ink+'19');label(c,l1,x+w/2,y+h*.43,l1.length>8?13:20,ink);label(c,l2,x+w/2,y+h*.72,l2.length>7?15:23,'#ffffff');rect(c,x,y+h-7,w,7,ink);}
    poly(c,[[572,440],[621,287],[634,144],[661,144],[675,285],[715,440]],'#32394d');
    rect(c,621,239,53,169,'#285c7680');rect(c,629,168,36,63,'#a8cfe060');stroke(c,[[647,144],[647,113]],'#b5cbd3',3);
    label(c,'TIMES SQUARE',647,445,14,'#decbf5');
    floor(c,a,'street');
  }
  function tokyo(c,a){
    sky(c,[[0,'#090e2c'],[.55,'#252043'],[1,'#463456']]);buildings(c,465,'#171b34',70,295,true);
    for(const [x,w,h]of [[30,195,280],[267,143,327],[442,117,262],[726,174,283],[930,162,334],[1120,163,275]]){
      rect(c,x,465-h,w,h,'#263249');for(let r=0;r<h/20;r++)stroke(c,[[x+8,472-h+r*20],[x+w-8,472-h+r*20]],'#70829b33',2);
      const color=x%3?'#e756b7':'#56c7dd';rect(c,x+w-37,471-h,27,h-32,'#131931');stroke(c,[[x+w-37,471-h],[x+w-10,471-h],[x+w-10,438],[x+w-37,438]],color,2,true);
      for(let r=0;r<Math.min(8,h/30);r++)label(c,['夜','光','国','技','闘','心','星','都'][r],x+w-23,499-h+r*30,17,color);
    }
    rect(c,306,178,84,110,'#713c76');label(c,'WORLD',348,209,13,'#fdbbeb');label(c,'ARENA',348,240,18,'#ffffff');label(c,'TOKYO',348,270,12,'#a8eeeb');
    poly(c,[[574,448],[598,297],[629,297],[634,152],[650,152],[656,297],[685,297],[715,448]],'#322741');
    stroke(c,[[580,437],[641,167],[703,437]],'#f5926b',7);stroke(c,[[607,335],[675,335]],'#f5926b',5);stroke(c,[[622,271],[660,271]],'#ffe8bb',3);stroke(c,[[643,155],[643,122]],'#f5926b',3);
    for(let i=0;i<7;i++)rect(c,560+i*28,434,17,31,i%2?'#3d4258':'#303550');
    floor(c,a,'street');
    for(let i=0;i<7;i++){rect(c,65+i*190,491,14,109,i%2?'#e85cad1c':'#71d4f71c');}
  }
  function eiffel(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);const ink='#2e303a';
    poly(c,[[-78,0],[-43,-120],[-22,-230],[-8,-300],[0,-335],[8,-300],[22,-230],[43,-120],[78,0],[43,0],[24,-69],[-24,-69],[-43,0]],ink);
    stroke(c,[[-71,-5],[-35,-120],[-15,-239],[0,-334],[15,-239],[35,-120],[71,-5]],'#887b6a',3);
    for(let i=0;i<10;i++){const y=-20-i*27,w=65-i*5.8;stroke(c,[[-w,y],[w,y]],'#b2946819',2);stroke(c,[[-w,y],[w-5.8,y-27]],'#c6a27755',2);stroke(c,[[w,y],[-w+5.8,y-27]],'#c6a27755',2);}
    for(const [yy,ww]of [[-77,70],[-124,95],[-227,47]])rect(c,-ww/2,yy,ww,7,'#574c44');
    c.beginPath();c.arc(0,0,42,Math.PI,0);c.strokeStyle='#b28b66';c.lineWidth=4;c.stroke();stroke(c,[[0,-335],[0,-355]],ink,3);c.restore();}
  function paris(c,a){
    sky(c,[[0,'#28455a'],[.5,'#c6957c'],[.8,'#ead0aa'],[1,'#4e6367']]);disc(c,250,240,47,'#ffdfbdcc');
    buildings(c,441,'#756c69',89,104,true);buildings(c,456,'#505b60',106,71);
    eiffel(c,896,443,.91);
    for(let x=38;x<560;x+=92){rect(c,x,409,77,43,'#b2a18c');poly(c,[[x-7,409],[x+15,394],[x+64,394],[x+84,409]],'#626773');for(let col=0;col<4;col++)rect(c,x+8+col*17,419,8,15,'#575f65');}
    railing(c,431,'#394855',true);
    for(const x of [95,1185]){stroke(c,[[x,457],[x,309]],'#263b48',5);stroke(c,[[x-17,330],[x,310],[x+17,330]],'#263b48',4);poly(c,[[x-11,312],[x-8,294],[x+8,294],[x+11,312]],'#f7dbaa');disc(c,x,303,27,'#ffebd51a');}
    floor(c,a,'stone');
  }
  function greatWall(c,a){
    sky(c,[[0,'#516f81'],[.45,'#a3b5b5'],[1,'#ced0b5']]);disc(c,1020,185,36,'#f3e2b39c');
    for(const [base,color,s]of [[391,'#748e8d',.6],[427,'#506f70',.9],[455,'#335458',1.2]]){const pts=[[0,base]];for(let i=0;i<15;i++)pts.push([i*96,base-50-(i*43)%110*s]);pts.push([1280,base]);poly(c,pts,color);}
    const path=[[25,418],[135,380],[241,389],[355,342],[465,355],[586,312],[710,336],[807,294],[920,323],[1083,376],[1280,402]];
    stroke(c,path,'#3e4b44',30);stroke(c,path,'#9d9278',23);stroke(c,path,'#d1c4a2',9);
    for(const [x,y]of [[240,381],[462,347],[710,328],[920,315]]){rect(c,x-19,y-30,38,33,'#9a8f72');poly(c,[[x-26,y-31],[x-17,y-46],[x+17,y-46],[x+26,y-31]],'#484e46');rect(c,x-7,y-23,14,18,'#3e4e48');for(let i=-2;i<=2;i++)rect(c,x+i*9-3,y-36,6,9,'#b8aa89');}
    rect(c,0,409,1280,57,'#746e58');for(let x=0;x<1280;x+=46){rect(c,x,399,31,18,'#9b9074');rect(c,x+9,420,17,23,'#434c43');}
    for(let row=0;row<3;row++)for(let x=-30;x<1320;x+=58)stroke(c,[[x+(row%2)*29,426+row*15],[x+57+(row%2)*29,426+row*15]],'#cfc19e55');
    floor(c,a,'stone');
  }
  function rio(c,a){
    sky(c,[[0,'#17496c'],[.46,'#67b5c0'],[1,'#f0d4a7']]);disc(c,976,210,44,'#ffe3b4');
    poly(c,[[0,414],[0,302],[91,323],[146,260],[216,282],[271,188],[315,206],[349,296],[418,342],[483,427]],'#365c59');
    // Corcovado and its recognizable outstretched monument.
    stroke(c,[[275,214],[275,165]],'#dbe0cb',10);stroke(c,[[250,178],[275,174],[301,178]],'#e4e5d0',7);disc(c,275,157,6,'#e5e7d7');poly(c,[[270,177],[263,209],[286,209],[280,177]],'#c7d2c3');
    poly(c,[[732,436],[785,392],[816,288],[863,305],[887,385],[941,438]],'#517d77');
    rect(c,0,397,1280,68,gradient(c,397,465,[[0,'#4aabae'],[1,'#20797f']]));
    for(let i=0;i<7;i++)stroke(c,[[450+i*48,404+i*8],[940+i*32,404+i*8]],'#d8f3d458',2);
    buildings(c,443,'#759791',65,94,true);rect(c,0,445,1280,20,'#c8bc91');
    palm(c,91,457,1.35);palm(c,1167,458,1.17);floor(c,a,'mosaic');
  }
  function pyramid(c,x,y,w,h,color){poly(c,[[x-w/2,y],[x,y-h],[x+w/2,y]],color);poly(c,[[x,y-h],[x+w/2,y],[x+w*.14,y]],'#7a624c66');for(let i=1;i<8;i++){const yy=y-h+i*h/8,ww=w*i/8;stroke(c,[[x-ww/2,yy],[x+ww/2,yy]],'#f6dcad19');}}
  function giza(c,a){
    sky(c,[[0,'#6d5264'],[.4,'#c18767'],[.8,'#f4c18a'],[1,'#cca371']]);disc(c,967,225,59,'#ffe3acb0');
    poly(c,[[0,423],[170,402],[310,419],[468,394],[674,418],[845,398],[1080,424],[1280,403],[1280,480],[0,480]],'#bd9970');
    pyramid(c,850,436,410,230,'#b98f5b');pyramid(c,361,440,348,279,'#cbab78');pyramid(c,1120,444,207,141,'#ad8355');
    rect(c,0,449,1280,17,'#c7a26f');
    // Sphinx silhouette, small enough to preserve the combat silhouettes.
    poly(c,[[510,443],[521,421],[583,420],[599,405],[609,405],[625,425],[672,430],[683,443]],'#ad8357');rect(c,585,401,30,30,'#b18a5c');poly(c,[[582,403],[584,382],[613,382],[618,403]],'#c6a172');rect(c,595,400,11,16,'#d2af7c');
    palm(c,103,459,.95);floor(c,a,'sand');
  }
  function bridgeTower(c,x){rect(c,x-36,273,72,132,'#899ba2');rect(c,x-43,265,86,11,'#bac6c3');rect(c,x-29,212,58,61,'#a8b4b6');poly(c,[[x-38,216],[x-14,187],[x+14,187],[x+38,216]],'#4a6578');
    for(const dx of [-42,31]){rect(c,x+dx,229,11,161,'#c0c3b5');poly(c,[[x+dx-4,230],[x+dx+5,213],[x+dx+14,230]],'#627f8e');}
    for(const dx of [-18,8])rect(c,x+dx,232,10,29,'#3b5e72');rect(c,x-16,307,32,74,'#2b4a61');stroke(c,[[x-20,298],[x+20,298]],'#d7d6bb',3);
  }
  function london(c,a){
    sky(c,[[0,'#183246'],[.48,'#527286'],[1,'#a1afb1']]);buildings(c,402,'#435e6c',60,158,true);
    // Tower Bridge's two towers, high walkway, suspension and bascule span.
    bridgeTower(c,371);bridgeTower(c,906);rect(c,365,284,547,15,'#a9b7b7');rect(c,368,299,543,5,'#576f7c');
    for(let x=400;x<890;x+=32)rect(c,x,284,4,19,'#617d8b');
    stroke(c,[[20,378],[190,349],[337,277]],'#9dbac8',6);stroke(c,[[405,275],[528,337],[640,351],[782,325],[869,275]],'#9dbac8',6);stroke(c,[[940,277],[1100,350],[1280,378]],'#9dbac8',6);
    for(let x=50;x<1260;x+=42){const y=x<330?379-(x-20)*.30:x<870?350-Math.abs(x-640)*.27:277+(x-940)*.32;stroke(c,[[x,Math.max(282,y)],[x,389]],'#afc2c8',2);}
    rect(c,0,386,1280,15,'#506f7e');stroke(c,[[0,387],[1280,387]],'#becdc9',3);
    rect(c,0,405,1280,62,gradient(c,405,467,[[0,'#426b83'],[1,'#203e53']]));
    for(let i=0;i<30;i++)rect(c,(i*137)%1280,413+(i*7)%39,35+(i%4)*17,1,'#94b4ba35');
    railing(c,438,'#2d4759',true);floor(c,a,'stone');
  }
  function sydney(c,a){
    sky(c,[[0,'#24486c'],[.48,'#cd9d9e'],[.82,'#eac7ad'],[1,'#6e95a5']]);disc(c,223,220,44,'#ffe3ba9c');buildings(c,412,'#527484',60,131,true);
    // Harbour Bridge behind the Opera House.
    c.beginPath();c.ellipse(367,407,265,147,0,Math.PI,0);c.strokeStyle='#304f65';c.lineWidth=12;c.stroke();
    c.beginPath();c.ellipse(367,407,257,124,0,Math.PI,0);c.strokeStyle='#4e6a7d';c.lineWidth=4;c.stroke();
    for(let x=130;x<=609;x+=28){const xx=(x-367)/265,y=407-147*Math.sqrt(Math.max(0,1-xx*xx));stroke(c,[[x,y],[x,411]],'#355269',3);}
    rect(c,97,401,540,12,'#405e73');for(const x of [105,621])rect(c,x-14,328,28,99,'#738a92');
    rect(c,0,415,1280,51,gradient(c,415,466,[[0,'#518da5'],[1,'#294e73']]));
    rect(c,716,409,379,14,'#937b73');
    const shells=[[[748,410],[745,348],[776,282],[797,344],[816,410]],[[787,410],[790,314],[850,247],[851,331],[859,410]],[[833,410],[871,302],[934,262],[910,347],[910,410]],[[901,410],[930,344],[986,301],[978,376],[965,410]],[[951,410],[1004,357],[1060,339],[1044,393],[1025,410]]];
    for(const [i,points]of shells.entries()){poly(c,points,i%2?'#e3d8c6':'#f1e4cf');stroke(c,points,'#b7b9b0',2,true);stroke(c,[[points[0][0]+18,408],points[2]],'#a6aba480',2);}
    for(let i=0;i<22;i++)rect(c,(i*157)%1280,423+(i*11)%34,60,1,'#f2dac747');
    railing(c,444,'#567781');floor(c,a,'wood');
  }
  function dubai(c,a){
    sky(c,[[0,'#231c46'],[.45,'#6f507c'],[.82,'#d8978e'],[1,'#8c777e']]);disc(c,1032,201,38,'#eab6a072');buildings(c,454,'#303249',55,240,true);
    // The Burj's progressively stepped setbacks and tapering spire.
    const x=862;const steps=[[428,86],[371,70],[319,56],[270,44],[227,34],[190,23],[158,13],[129,5]];
    for(let i=0;i<steps.length;i++){const [y,w]=steps[i],top=steps[i+1]?.[0]||101;rect(c,x-w/2,top,w,y-top,'#8e8a9b');rect(c,x+3,top,w/2-3,y-top,'#4e5d79');stroke(c,[[x-w/2,top],[x+w/2,top]],'#e8c9bb',2);for(let row=top+9;row<y;row+=9)stroke(c,[[x-w/2+3,row],[x+w/2-3,row]],'#e9dcd355');}
    stroke(c,[[x,106],[x,69]],'#d2c6cd',2);stroke(c,[[x-8,150],[x-8,403]],'#e8ccbf80',2);
    for(const [bx,bw,bh]of [[126,96,171],[253,68,244],[367,82,153],[480,106,188],[1070,71,202]]){rect(c,bx,454-bh,bw,bh,'#4c4a61');poly(c,[[bx,454-bh],[bx+bw/2,435-bh],[bx+bw,454-bh]],'#747083');for(let row=0;row<bh/15;row++)stroke(c,[[bx+8,461-bh+row*15],[bx+bw-8,461-bh+row*15]],'#edc99866',2);}
    rect(c,0,429,1280,36,'#455671');for(let i=0;i<32;i++)stroke(c,[[140+i*32,454],[140+i*32,440-16*Math.sin(i*.6)**2]],'#c2dce35e',2);
    palm(c,48,467,.92);palm(c,1228,467,.88);floor(c,a,'stone');
  }
  const painters={lahore,tokyo,paris,'times-square':times,'great-wall':greatWall,rio,giza,london,sydney,dubai};
  function paint(c,a){c.save();painters[a.id](c,a);const vignette=c.createRadialGradient(640,350,180,640,350,770);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#030a1f80');rect(c,0,0,1280,640,vignette);c.restore();}
  function surface(){if(root.document?.createElement){const c=root.document.createElement('canvas');c.width=1280;c.height=720;return c;}if(typeof root.OffscreenCanvas==='function')return new root.OffscreenCanvas(1280,720);return null;}
  function drawScene(c,id,t=0,options={}){
    const a=ARENAS.find(stage=>stage.id===id)||ARENAS[0];c.save();const w=options.width||1280,h=options.height||720;c.scale(w/1280,h/720);
    let background=cache.get(a.id);if(!background){background=surface();if(background){paint(background.getContext('2d'),a);cache.set(a.id,background);}}
    if(background)c.drawImage(background,0,0);else paint(c,a);
    // Motion stays in the distant scene; silhouettes and the fighting floor remain clear.
    if(['rio','sydney','london'].includes(a.id)){c.globalAlpha=.2;for(let i=0;i<9;i++){const x=((i*163+t*10)%1420)-70;stroke(c,[[x,427+i*3],[x+46,427+i*3]],'#daedf0',1);}c.globalAlpha=1;}
    if(['tokyo','london'].includes(a.id)){c.globalAlpha=.11;for(let i=0;i<46;i++){const x=(i*179+t*51)%1320,y=(i*71+t*155)%477;stroke(c,[[x,y],[x-3,y+12]],'#c8e2fc',1);}c.globalAlpha=1;}
    if(a.id==='times-square'||a.id==='tokyo'){for(let i=0;i<6;i++)rect(c,50+i*205,436,28,2,a.accent+(Math.sin(t*2+i)>.3?'bb':'33'));}
    if(a.id==='lahore'){for(let i=0;i<12;i++)disc(c,70+i*104,437+Math.sin(t*1.4+i)*4,1.2,'#e8ecc277');}
    if(a.id==='dubai'){for(let i=0;i<20;i++){const x=270+i*32,y=449;stroke(c,[[x,y],[x,y-9-12*(.5+.5*Math.sin(t*1.7+i*.4))]],'#d4e9f566',1.5);}}
    c.restore();return a;
  }
  const api={ARENAS,drawScene};root.NationArenas=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
