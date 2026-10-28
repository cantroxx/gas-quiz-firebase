/* Original, isolated prototype. No account, network API, or production economy. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const KEY = 'quiztown-original-home-prototype-v1';
  const N = 8, HW = 46, HH = 23, OX = 500, OY = 260;
  const catalog = [
    {id:'bed', name:'풀잎 이불 침대', price:80, dims:[1,2], sprite:0, width:170, height:185, note:'포근한 나무 침대'},
    {id:'desk', name:'햇살 나무 책상', price:55, dims:[2,1], sprite:1, width:158, height:139, note:'책 한 권과 작은 여유'},
    {id:'chair', name:'새싹 쿠션 의자', price:35, dims:[1,1], sprite:2, width:89, height:114, note:'직접 앉을 수 있어요'},
    {id:'shelf', name:'이야기 책장', price:65, dims:[1,2], sprite:3, width:128, height:186, note:'좋아하는 이야기 가득'},
    {id:'plant', name:'동그란 잎 화분', price:25, dims:[1,1], sprite:4, width:90, height:109, note:'작은 초록 친구'},
    {id:'rug', name:'숲속 둥근 러그', price:30, dims:[2,2], sprite:5, width:178, height:95, note:'가구 아래에도 놓아요', walkable:true}
  ];
  const byId = Object.fromEntries(catalog.map(x => [x.id,x]));
  const furColors = ['#eed3b0','#f3ece0','#ba8864','#9298a2'];
  const shirtColors = ['#739173','#cc846c','#7d9bab','#cba35f'];
  const walls = {sage:['#d1dac0','#bac9aa'], cream:['#f0e5cd','#ded0b3'], rose:['#e8d3c8','#d7bcae']};
  const fresh = () => ({version:1, coins:300, roomName:'새싹의 작은 집', avatar:{species:'bunny',fur:0,shirt:0,hat:'none',outfit:'vest'}, wall:'sage', owned:Object.fromEntries(catalog.map(x=>[x.id,1])), items:[
    {uid:1,id:'bed',x:1,y:1,rot:0},{uid:2,id:'desk',x:5,y:1,rot:0},
    {uid:3,id:'chair',x:5,y:3,rot:0},{uid:4,id:'shelf',x:0,y:4,rot:0},
    {uid:5,id:'plant',x:1,y:6,rot:0},{uid:6,id:'rug',x:3,y:5,rot:0}
  ]});
  let data = fresh(), storageOK = true;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if(saved?.version === 1) {
      const base = fresh();
      base.coins = Number.isFinite(saved.coins) ? Math.max(0, Math.min(9999, Math.floor(saved.coins))) : 300;
      base.roomName = String(saved.roomName || base.roomName).slice(0,24);
      if(walls[saved.wall]) base.wall = saved.wall;
      if(['bunny','cat','bear'].includes(saved.avatar?.species)) base.avatar.species = saved.avatar.species;
      for(const key of ['fur','shirt']) if(Number.isInteger(saved.avatar?.[key]) && saved.avatar[key]>=0 && saved.avatar[key]<4) base.avatar[key]=saved.avatar[key];
      if(['none','beret','flower'].includes(saved.avatar?.hat)) base.avatar.hat=saved.avatar.hat;
      if(['vest','stripe','overall'].includes(saved.avatar?.outfit)) base.avatar.outfit=saved.avatar.outfit;
      for(const item of catalog) base.owned[item.id] = Math.max(0,Math.min(20,Math.floor(Number(saved.owned?.[item.id])||0)));
      base.items=[];
      const seen = new Set();
      for(const item of (Array.isArray(saved.items)?saved.items:[]).slice(0,40)) {
        if(!byId[item.id] || !Number.isInteger(item.uid) || seen.has(item.uid) || !Number.isInteger(item.x) || !Number.isInteger(item.y)) continue;
        const candidate={uid:item.uid,id:item.id,x:item.x,y:item.y,rot:item.rot===1?1:0};
        if(base.items.filter(x=>x.id===item.id).length>=base.owned[item.id] || !validPlace(candidate,base.items)) continue;
        seen.add(item.uid);base.items.push(candidate);
      }
      data=base;
    }
  } catch (_) { storageOK=false; }
  let uid = Math.max(0,...data.items.map(i=>i.uid))+1;
  const avatar = {x:4,y:7,dir:0,path:[],sitting:null,seatTarget:null,phase:0};
  if(blocked(avatar.x,avatar.y)) {
    outer:for(let y=N-1;y>=0;y--) for(let x=N-1;x>=0;x--) if(!blocked(x,y)) {avatar.x=x;avatar.y=y;break outer;}
  }
  let mode='walk', selected=null, placing=null, tab='shop', toastTimer, last=0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas=$('room'), ctx=canvas.getContext('2d');
  let atlasPixels;
  const atlas = new Image(); atlas.src='assets/furniture-atlas.png';
  atlas.onload=()=>{const sample=document.createElement('canvas');sample.width=1536;sample.height=1024;const c=sample.getContext('2d');c.drawImage(atlas,0,0);atlasPixels=c.getImageData(0,0,1536,1024).data;renderPanels();draw();};
  atlas.onerror=()=>{$('asset-error').hidden=false;};

  function dimensions(item) {const d=byId[item.id].dims;return item.rot?[d[1],d[0]]:d;}
  function tiles(item) {const [w,h]=dimensions(item), out=[];for(let y=item.y;y<item.y+h;y++)for(let x=item.x;x<item.x+w;x++)out.push({x,y});return out;}
  function validPlace(item, items=data.items, checkAvatar=false) {
    const own=tiles(item);
    if(own.some(t=>t.x<0||t.y<0||t.x>=N||t.y>=N))return false;
    for(const other of items) {
      if(other.uid===item.uid)continue;
      if(byId[other.id].walkable!==byId[item.id].walkable && (byId[other.id].walkable||byId[item.id].walkable))continue;
      if(tiles(other).some(a=>own.some(b=>a.x===b.x&&a.y===b.y)))return false;
    }
    return !(checkAvatar && !byId[item.id].walkable && own.some(t=>t.x===Math.round(avatar.x)&&t.y===Math.round(avatar.y)));
  }
  function blocked(x,y) {return data.items.some(i=>!byId[i.id].walkable && tiles(i).some(t=>t.x===x&&t.y===y));}
  function point(x,y,z=0) {return {x:OX+(x-y)*HW,y:OY+(x+y)*HH-z};}
  function cell(px,py) {const a=(px-OX)/HW,b=(py-OY)/HH;return {x:Math.floor((a+b)/2),y:Math.floor((b-a)/2)};}
  function inRoom(p) {return p.x>=0&&p.y>=0&&p.x<N&&p.y<N;}
  function say(message) {$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600);}
  function save() {
    try {localStorage.setItem(KEY,JSON.stringify(data));storageOK=true;} catch (_) {storageOK=false;}
    $('save-status').textContent=storageOK?'이 브라우저에 저장했어요':'저장 공간이 없어 이번 체험만 유지돼요';
  }
  function findPath(x,y) {
    const start={x:Math.round(avatar.x),y:Math.round(avatar.y)};
    if(!inRoom({x,y})||blocked(x,y))return null;
    const queue=[start], parents=new Map([[`${start.x},${start.y}`,null]]);
    for(let n=0;n<queue.length;n++) {
      const a=queue[n];
      if(a.x===x&&a.y===y){const path=[];let p=a;while(parents.get(`${p.x},${p.y}`)){path.unshift(p);p=parents.get(`${p.x},${p.y}`);}return path;}
      for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]) {
        const b={x:a.x+dx,y:a.y+dy},key=`${b.x},${b.y}`;
        if(inRoom(b)&&!blocked(b.x,b.y)&&!parents.has(key)){parents.set(key,a);queue.push(b);}
      }
    }
    return null;
  }
  function stopWalking() {avatar.x=Math.round(avatar.x);avatar.y=Math.round(avatar.y);avatar.path=[];avatar.seatTarget=null;}
  function stand() {
    if(!avatar.sitting)return true;
    const candidates=[[0,1],[1,0],[-1,0],[0,-1]];
    for(const [dx,dy] of candidates){const p={x:Math.round(avatar.x)+dx,y:Math.round(avatar.y)+dy};if(inRoom(p)&&!blocked(p.x,p.y)){avatar.x=p.x;avatar.y=p.y;avatar.sitting=null;$('stand').hidden=true;refreshControls();return true;}}
    say('의자 옆에 빈칸을 만들어 주세요.');return false;
  }
  function walk(x,y) {
    if(!stand())return;
    stopWalking();const path=findPath(x,y);
    if(!path){say('가구를 피해 갈 수 있는 빈칸을 눌러 주세요.');return;}
    avatar.path=path;
    if(reduced.matches&&path.length){avatar.x=x;avatar.y=y;avatar.path=[];}
    refreshControls();
  }
  function sitOn(item) {
    if(!item||item.id!=='chair'){say('새싹 쿠션 의자에 앉아볼 수 있어요.');return;}
    if(!stand())return;stopWalking();
    const routes=[[0,1],[1,0],[-1,0],[0,-1]].map(([dx,dy])=>findPath(item.x+dx,item.y+dy)).filter(Boolean).sort((a,b)=>a.length-b.length);
    if(!routes.length){say('의자 옆으로 걸어갈 공간이 없어요.');return;}
    mode='walk';selected=null;avatar.path=routes[0];avatar.seatTarget=item.uid;
    if(reduced.matches){avatar.path=[];}
    finishSeat();refreshControls();
  }
  function finishSeat() {
    if(avatar.path.length||!avatar.seatTarget)return;
    const item=data.items.find(i=>i.uid===avatar.seatTarget);
    if(item){avatar.x=item.x;avatar.y=item.y;avatar.dir=item.rot?1:0;avatar.sitting=item.uid;$('stand').hidden=false;say('폭신한 의자에서 잠깐 쉬어요.');}
    avatar.seatTarget=null;refreshControls();
  }
  function beginPlace(id, existing=null) {
    if(!stand())return;stopWalking();
    if(!existing&&data.items.length>=40){say('체험 방에는 가구를 40개까지 놓을 수 있어요.');return;}
    mode='build';selected=null;
    placing=existing?{...existing}:{uid:uid++,id,x:4,y:4,rot:0};
    if(!existing){outer:for(let y=0;y<N;y++)for(let x=0;x<N;x++){placing.x=x;placing.y=y;if(validPlace(placing,data.items,true))break outer;}}
    refreshControls();say('바닥을 눌러 놓거나 방향키와 Enter를 사용해요.');
  }
  function commitPlace() {
    if(!placing)return;
    if(!validPlace(placing,data.items,true)){say('가구나 캐릭터와 겹치지 않는 빈칸에 놓아주세요.');return;}
    data.items=data.items.filter(i=>i.uid!==placing.uid);data.items.push({...placing});selected=placing.uid;placing=null;
    save();renderPanels();refreshControls();say('내 취향 한 조각을 놓았어요.');
  }
  function cancelPlace() {placing=null;refreshControls();}
  function buy(id) {
    const item=byId[id];
    if(data.coins<item.price){say('체험 코인이 부족해요.');return;}
    if(data.owned[id]>=20){say('같은 가구는 20개까지 보관할 수 있어요.');return;}
    data.coins-=item.price;data.owned[id]++;save();renderPanels();say(`${item.name}을 보관함에 담았어요.`);beginPlace(id);
  }

  // Canvas room and character are drawn from original geometry, without remote sprites.
  function polygon(c,pts,fill,stroke) {c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
  function ellipse(c,x,y,rx,ry,fill,stroke) {c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.stroke();}}
  function round(c,x,y,w,h,r,fill,stroke) {c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.stroke();}}
  function roomArt() {
    ctx.clearRect(0,0,1000,820);
    const bg=ctx.createRadialGradient(500,400,100,500,400,650);bg.addColorStop(0,'#f8f6e9');bg.addColorStop(1,'#e5e9d9');ctx.fillStyle=bg;ctx.fillRect(0,0,1000,820);
    ctx.save();ctx.shadowColor='#7c8b6b35';ctx.shadowBlur=30;ctx.shadowOffsetY=20;
    polygon(ctx,[point(0,0),point(N,0),point(N,N),point(0,N)],'#c8af83');ctx.restore();
    polygon(ctx,[point(0,N),point(N,N),point(N,N,-15),point(0,N,-15)],'#b99565');
    polygon(ctx,[point(N,0),point(N,N),point(N,N,-15),point(N,0,-15)],'#a8875f');
    const [left,right]=walls[data.wall];ctx.lineWidth=1;
    polygon(ctx,[point(0,N),point(0,0),point(0,0,190),point(0,N,190)],left);
    polygon(ctx,[point(0,0),point(N,0),point(N,0,190),point(0,0,190)],right);
    for(let n=0;n<N;n++) {
      polygon(ctx,[point(0,n,8),point(0,n+1,8),point(0,n+1,13),point(0,n,13)],'#b1ba95');
      polygon(ctx,[point(n,0,8),point(n+1,0,8),point(n+1,0,13),point(n,0,13)],'#98ad87');
    }
    // A window follows the wall's isometric perspective.
    polygon(ctx,[point(0,1.2,55),point(0,3.8,55),point(0,3.8,160),point(0,1.2,160)],'#f8eed9','#b7aa86');
    polygon(ctx,[point(0,1.4,64),point(0,3.6,64),point(0,3.6,151),point(0,1.4,151)],'#c5dddc');
    polygon(ctx,[point(0,1.4,64),point(0,3.6,64),point(0,3.6,88),point(0,2.8,99),point(0,2,78)],'#94b7a0');
    polygon(ctx,[point(0,2.43,64),point(0,2.57,64),point(0,2.57,151),point(0,2.43,151)],'#fff5df');
    polygon(ctx,[point(0,1.4,108),point(0,3.6,108),point(0,3.6,115),point(0,1.4,115)],'#fff5df');
    // Framed forest illustration on the right wall.
    polygon(ctx,[point(4.8,0,65),point(6.5,0,65),point(6.5,0,144),point(4.8,0,144)],'#f3e8cd','#b19c73');
    const art=point(5.65,0,102);ellipse(ctx,art.x,art.y,18,25,'#a0b48a');ellipse(ctx,art.x+8,art.y+7,11,16,'#7f9c70');
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const colors=['#e4c9a1','#e9d1ad','#e2c59a'];
      polygon(ctx,[point(x,y),point(x+1,y),point(x+1,y+1),point(x,y+1)],colors[(x+y*3)%3],'#c5a67855');
      const a=point(x+.25,y+.18),b=point(x+.82,y+.18);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle='#bd9b6730';ctx.stroke();
    }
    polygon(ctx,[point(.2,3.9),point(.2,1.5),point(4,1.5),point(4,3.9)],'#fff8cd27');
    if(mode==='build')for(let y=0;y<N;y++)for(let x=0;x<N;x++)polygon(ctx,[point(x,y),point(x+1,y),point(x+1,y+1),point(x,y+1)],null,'#fff9e580');
  }
  function tileHighlight(item,color) {for(const t of tiles(item))polygon(ctx,[point(t.x,t.y),point(t.x+1,t.y),point(t.x+1,t.y+1),point(t.x,t.y+1)],color,'#fffbe6');}
  function sprite(c,item,x,y,w,h) {
    if(!atlas.complete||!atlas.naturalWidth)return;
    const index=byId[item.id].sprite,sx=(index%3)*512,sy=Math.floor(index/3)*512;
    c.save();c.translate(x,y);if(item.rot)c.scale(-1,1);
    c.drawImage(atlas,sx,sy,512,512,-w/2,-h,w,h);c.restore();
  }
  function furniture(item,ghost=false) {
    const spec=byId[item.id],[w,h]=dimensions(item),p=point(item.x+w/2,item.y+h/2);
    ctx.save();if(ghost)ctx.globalAlpha=.6;
    sprite(ctx,item,p.x,p.y+19,spec.width,spec.height);ctx.restore();
  }
  function hitFurniture(px,py) {
    const sorted=[...data.items].sort((a,b)=>Number(!!byId[a.id].walkable)-Number(!!byId[b.id].walkable)||(b.x+b.y)-(a.x+a.y));
    for(const item of sorted) {
      const spec=byId[item.id],[w,h]=dimensions(item),p=point(item.x+w/2,item.y+h/2);
      let u=(px-(p.x-spec.width/2))/spec.width;const v=(py-(p.y+19-spec.height))/spec.height;
      if(u<0||u>=1||v<0||v>=1)continue;
      if(item.rot)u=1-u;
      const sx=(spec.sprite%3)*512+Math.min(511,Math.floor(u*512)),sy=Math.floor(spec.sprite/3)*512+Math.floor(v*512);
      if(atlasPixels?.[(sy*1536+sx)*4+3]>100)return item;
    }
    return null;
  }
  function character(c,x,y,scale=1,dir=0,phase=0,sitting=false) {
    const look=data.avatar,fur=furColors[look.fur],shirt=shirtColors[look.shirt],outline='#806851';
    c.save();c.translate(x,y);c.scale(scale,scale);c.lineWidth=1.7;
    const back=dir===2||dir===3,side=dir===1||dir===2?-1:1;
    ellipse(c,0,0,24,9,'#6c704326');
    const stride=sitting?0:Math.sin(phase)*5,bob=sitting?0:Math.abs(Math.sin(phase))*2;
    c.translate(0,-bob);
    if(sitting) {
      round(c,-18,-17,14,18,6,'#8c9b85',outline);round(c,4,-17,14,18,6,'#8c9b85',outline);
      ellipse(c,-12,3,10,6,'#795b43');ellipse(c,12,3,10,6,'#795b43');
    } else {ellipse(c,-11,-7+stride,9,6,'#795b43');ellipse(c,11,-7-stride,9,6,'#795b43');}
    round(c,-16,-45,32,34,12,shirt,outline);
    if(look.outfit==='stripe') {
      for(const yy of [-34,-26,-18])round(c,-14,yy,28,3,1,'#fff0dcb0');
    } else if(look.outfit==='overall') {
      round(c,-11,-35,22,24,4,'#577a82');round(c,-11,-44,5,14,2,'#577a82');round(c,6,-44,5,14,2,'#577a82');
      round(c,-6,-28,12,9,2,'#76969a');
    }
    ellipse(c,-20,-29-stride,7,12,fur,outline);ellipse(c,20,-29+stride,7,12,fur,outline);
    if(back){ellipse(c,0,-17,8,7,look.species==='bear'?'#ac8060':fur,outline);}
    if(look.species==='bunny') {
      ellipse(c,-12,-88,8,23,fur,outline);ellipse(c,12,-89,8,23,fur,outline);
      ellipse(c,-12,-88,3.5,15,'#dfb0a0');ellipse(c,12,-89,3.5,15,'#dfb0a0');
    } else if(look.species==='cat') {
      polygon(c,[{x:-23,y:-69},{x:-24,y:-92},{x:-5,y:-78}],fur,outline);
      polygon(c,[{x:23,y:-69},{x:24,y:-92},{x:5,y:-78}],fur,outline);
      polygon(c,[{x:-20,y:-76},{x:-20,y:-86},{x:-11,y:-77}],'#dbaa99');
      polygon(c,[{x:20,y:-76},{x:20,y:-86},{x:11,y:-77}],'#dbaa99');
    } else {ellipse(c,-20,-77,10,11,fur,outline);ellipse(c,20,-77,10,11,fur,outline);ellipse(c,-20,-77,5,6,'#c39579');ellipse(c,20,-77,5,6,'#c39579');}
    ellipse(c,0,-59,27,25,fur,outline);
    if(!back) {
      ellipse(c,side*3,-49,15,11,'#fff1d9');
      ellipse(c,-9+side*3,-61,2.7,3.8,'#4a4137');ellipse(c,10+side*3,-61,2.7,3.8,'#4a4137');
      ellipse(c,side*3,-53,3.2,2.4,'#896757');
      c.beginPath();c.arc(side*3,-51,5,0,Math.PI);c.strokeStyle='#876450';c.stroke();
      ellipse(c,-17,-51,5,3,'#deab9255');ellipse(c,19,-51,5,3,'#deab9255');
      if(look.outfit==='vest'){c.beginPath();c.moveTo(-9,-39);c.lineTo(0,-30);c.lineTo(9,-39);c.strokeStyle='#f9eed5';c.stroke();ellipse(c,0,-22,2,2,'#f3d897');}
    }
    if(look.hat==='beret'){ellipse(c,0,-81,24,9,'#a86554',outline);ellipse(c,3,-87,18,7,'#b97660',outline);round(c,1,-97,4,7,2,'#875343');}
    if(look.hat==='flower'){for(let n=0;n<5;n++){const a=n*Math.PI*2/5;ellipse(c,21+Math.cos(a)*6,-78+Math.sin(a)*6,5,5,'#fff0cc');}ellipse(c,21,-78,4,4,'#d7a450');}
    c.restore();
  }
  function draw() {
    roomArt();
    for(const item of data.items.filter(i=>byId[i.id].walkable && i.uid!==placing?.uid))furniture(item);
    if(selected){const item=data.items.find(i=>i.uid===selected);if(item)tileHighlight(item,'#8fa96a4d');}
    if(placing)tileHighlight(placing,validPlace(placing,data.items,true)?'#87ac7780':'#cb756780');
    if(avatar.path.length){const t=avatar.path.at(-1),p=point(t.x+.5,t.y+.5);ellipse(ctx,p.x,p.y,13,6,'#fff8d580');}
    const layers=data.items.filter(i=>!byId[i.id].walkable&&i.uid!==placing?.uid).map(item=>({depth:item.x+item.y+(dimensions(item)[0]+dimensions(item)[1])/2,draw:()=>furniture(item)}));
    layers.push({depth:avatar.x+avatar.y+1+(avatar.sitting ? .1 : 0),draw:()=>{const p=point(avatar.x+.5,avatar.y+.5,avatar.sitting?27:0);character(ctx,p.x,p.y+5,1,avatar.dir,avatar.path.length?avatar.phase:0,!!avatar.sitting);}});
    layers.sort((a,b)=>a.depth-b.depth).forEach(l=>l.draw());
    if(placing)furniture(placing,true);
  }
  function tick(time) {
    const dt=Math.min((time-last)/1000||0,.05);last=time;
    if(avatar.path.length){const p=avatar.path[0],dx=p.x-avatar.x,dy=p.y-avatar.y,dist=Math.hypot(dx,dy),speed=dt*3.2;
      avatar.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?0:2):(dy>0?1:3);avatar.phase+=dt*12;
      if(dist<=speed){avatar.x=p.x;avatar.y=p.y;avatar.path.shift();finishSeat();}else{avatar.x+=dx/dist*speed;avatar.y+=dy/dist*speed;}
    }
    const description=`방 지도. 캐릭터 ${Math.round(avatar.x)+1}열 ${Math.round(avatar.y)+1}행${avatar.sitting?', 의자에 앉아 있음':''}. 방향키로 이동, 가구 배치 중 Enter로 확정합니다.`;
    if(canvas.getAttribute('aria-label')!==description)canvas.setAttribute('aria-label',description);
    draw();requestAnimationFrame(tick);
  }

  function thumb(canvas,id) {const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);sprite(c,{id,rot:0},canvas.width/2,canvas.height*.96,canvas.width*.91,canvas.height*.91);}
  function renderPanels() {
    $('coins').textContent=data.coins;
    const total=Object.values(data.owned).reduce((a,b)=>a+b,0);
    $('bag-count').textContent=total;$('placed-count').textContent=`배치 ${data.items.length} · 보관 ${total-data.items.length}`;
    $('catalog').replaceChildren();$('inventory').replaceChildren();
    for(const item of catalog) {
      const card=document.createElement('article');card.className='product';
      const img=document.createElement('canvas');img.width=180;img.height=155;img.setAttribute('aria-label',item.name);thumb(img,item.id);
      const h=document.createElement('h4');h.textContent=item.name;
      const meta=document.createElement('span');meta.className='product-meta';meta.textContent=item.note;
      const row=document.createElement('div');row.className='buy-row';const price=document.createElement('b');price.textContent=`◉ ${item.price}`;
      const button=document.createElement('button');button.textContent='구매';button.dataset.buy=item.id;button.setAttribute('aria-label',`${item.name} ${item.price} 체험 코인 구매`);button.disabled=data.coins<item.price||data.owned[item.id]>=20;button.onclick=()=>buy(item.id);
      row.append(price,button);card.append(img,h,meta,row);$('catalog').append(card);
      const bag=document.createElement('div');bag.className='bag-item';const t=document.createElement('canvas');t.width=t.height=100;thumb(t,item.id);
      const info=document.createElement('div');info.className='bag-info';const name=document.createElement('strong');name.textContent=item.name;
      const placed=data.items.filter(x=>x.id===item.id),available=data.owned[item.id]-placed.length;
      const detail=document.createElement('small');detail.textContent=`배치 ${placed.length} · 보관 ${available}`;info.append(name,detail);
      const action=document.createElement('button');action.dataset.bag=item.id;action.textContent=available?'놓기':'선택';action.disabled=!data.owned[item.id];action.onclick=()=>{if(available)beginPlace(item.id);else{cancelPlace();selected=placed[0]?.uid;mode='build';refreshControls();}canvas.scrollIntoView({block:'center',behavior:reduced.matches?'auto':'smooth'});};
      bag.append(t,info,action);$('inventory').append(bag);
    }
    renderAvatar();
  }
  function choices(title,key,options,parent=$('avatar-options')) {
    const group=document.createElement('div');group.className='option-group';const h=document.createElement('h3');h.textContent=title;
    const list=document.createElement('div');list.className='choices';
    for(const [value,label,color] of options){const b=document.createElement('button');b.type='button';b.textContent=color?'':label;b.setAttribute('aria-label',label);b.setAttribute('aria-pressed',String(data.avatar[key]===value));b.dataset.option=`${key}-${value}`;
      if(color){b.className='swatch';b.style.setProperty('--swatch',color);}b.onclick=()=>{data.avatar[key]=value;save();renderAvatar();};list.append(b);}
    group.append(h,list);parent.append(group);
  }
  function renderAvatar() {
    const c=$('avatar-preview').getContext('2d');c.clearRect(0,0,360,260);ellipse(c,180,223,65,14,'#dfe5cf');character(c,180,226,1.65,0);
    $('avatar-options').replaceChildren();
    choices('숲속 친구','species',[['bunny','토끼'],['cat','고양이'],['bear','곰']]);
    choices('털 색상','fur',furColors.map((color,i)=>[i,['밀크티','크림','밤색','회색'][i],color]));
    choices('옷 색상','shirt',shirtColors.map((color,i)=>[i,['새싹','살구','하늘','꿀빛'][i],color]));
    choices('오늘의 옷','outfit',[['vest','단정한 조끼'],['stripe','줄무늬 티'],['overall','멜빵 바지']]);
    choices('작은 포인트','hat',[['none','기본'],['beret','베레모'],['flower','꽃핀']]);
    $('wall-options').replaceChildren();for(const [value,label] of [['sage','숲속 초록'],['cream','따뜻한 크림'],['rose','복숭아빛']]){const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-pressed',String(data.wall===value));b.onclick=()=>{data.wall=value;save();renderAvatar();};$('wall-options').append(b);}
  }
  function refreshControls() {
    $('walk-mode').setAttribute('aria-pressed',String(mode==='walk'));$('build-mode').setAttribute('aria-pressed',String(mode==='build'));
    const item=data.items.find(i=>i.uid===selected);
    $('selected-actions').hidden=!item||!!placing;$('placement-actions').hidden=!placing;
    $('sit').hidden=item?.id!=='chair';$('stand').hidden=!avatar.sitting;
    $('room-state').textContent=placing?'가구 배치 중':avatar.sitting?'쉬는 중':mode==='build'?'가구 편집 중':'산책 중';
    $('room-hint').textContent=placing?`${byId[placing.id].name} · 초록 칸에 놓을 수 있어요. 방향키로 조정하고 Enter로 확정해요.`:item?`${byId[item.id].name} 선택됨`:mode==='build'?'가구가 놓인 칸을 누르거나 보관함에서 선택하세요.':'바닥을 누르면 걸어가요. 의자를 누르면 앉을 수 있어요.';
  }
  function canvasCell(event) {const r=canvas.getBoundingClientRect();return cell((event.clientX-r.left)*1000/r.width,(event.clientY-r.top)*820/r.height);}
  canvas.addEventListener('pointermove',event=>{if(placing&&event.pointerType==='mouse'){const p=canvasCell(event);if(inRoom(p)){placing.x=p.x;placing.y=p.y;}}});
  let down=null;
  canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
  canvas.addEventListener('click',event=>{
    if(down&&Math.hypot(event.clientX-down.x,event.clientY-down.y)>12)return;
    const p=canvasCell(event);
    if(placing){placing.x=p.x;placing.y=p.y;commitPlace();return;}
    const r=canvas.getBoundingClientRect();
    const item=hitFurniture((event.clientX-r.left)*1000/r.width,(event.clientY-r.top)*820/r.height)||[...data.items].reverse().find(i=>tiles(i).some(t=>t.x===p.x&&t.y===p.y));
    if(!item&&!inRoom(p))return;
    if(mode==='build'){selected=item?.uid||null;refreshControls();}
    else if(item?.id==='chair')sitOn(item);else walk(p.x,p.y);
  });
  canvas.addEventListener('keydown',event=>{
    const dirs={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
    if(dirs[event.key]){event.preventDefault();const [dx,dy]=dirs[event.key];if(placing){placing.x=Math.max(0,Math.min(N-1,placing.x+dx));placing.y=Math.max(0,Math.min(N-1,placing.y+dy));}else walk(Math.round(avatar.x)+dx,Math.round(avatar.y)+dy);}
    if(event.key==='Enter'&&placing){event.preventDefault();commitPlace();}
    if(event.key==='Escape')cancelPlace();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&placing)cancelPlace();});
  $('walk-mode').onclick=()=>{cancelPlace();selected=null;mode='walk';refreshControls();};
  $('build-mode').onclick=()=>{stopWalking();cancelPlace();mode='build';refreshControls();};
  $('move').onclick=()=>{const item=data.items.find(i=>i.uid===selected);if(item)beginPlace(item.id,item);};
  $('rotate').onclick=()=>{const item=data.items.find(i=>i.uid===selected);if(!item)return;const next={...item,rot:item.rot?0:1};if(!validPlace(next,data.items,true)){say('회전할 자리가 부족해요. 먼저 옮겨주세요.');return;}Object.assign(item,next);save();};
  $('store').onclick=()=>{if(selected===avatar.sitting&&!stand())return;data.items=data.items.filter(i=>i.uid!==selected);selected=null;save();renderPanels();refreshControls();say('보관함에 넣었어요.');};
  $('sit').onclick=()=>sitOn(data.items.find(i=>i.uid===selected));$('stand').onclick=stand;
  $('place-confirm').onclick=commitPlace;$('place-cancel').onclick=cancelPlace;
  $('place-rotate').onclick=()=>{if(placing)placing.rot=placing.rot?0:1;};
  $('room-name').value=data.roomName;$('room-name').onchange=()=>{data.roomName=$('room-name').value.trim().slice(0,24)||'새싹의 작은 집';$('room-name').value=data.roomName;save();};
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));for(const id of ['shop','avatar','bag'])$('tab-'+id).hidden=tab!==id;});
  $('help').onclick=()=>$('help-dialog').showModal();$('close-help').onclick=()=>$('help-dialog').close();
  $('reset').onclick=()=>{if(!confirm('이 브라우저의 체험 방과 코인을 처음 상태로 되돌릴까요?'))return;data=fresh();uid=7;Object.assign(avatar,{x:4,y:7,dir:0,path:[],sitting:null,seatTarget:null});placing=null;selected=null;mode='walk';$('room-name').value=data.roomName;save();renderPanels();refreshControls();say('새로운 작은 집이 준비됐어요.');};
  renderPanels();refreshControls();if(!storageOK)$('save-status').textContent='브라우저 저장을 사용할 수 없어요';requestAnimationFrame(tick);
})();
