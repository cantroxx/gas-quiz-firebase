(function () {
  'use strict';
  const C=window.SpaceContent, canvas=document.getElementById('observation'), ctx=canvas.getContext('2d');
  const W=1000,H=740, keys=new Set();
  let destination=C.bodies[9], phase=0, guides=true, color='#9de5d6', running=false, arrived=false, auto=false, x=.16,y=.76,last=0, callback=()=>{}, selected=null;
  let dirty=true,skyPhoto='ursa-minor';
  const photoStars=[{id:'polaris',x:352/427,y:142/640},{id:'u1',x:316/427,y:132/640},{id:'u2',x:271/427,y:132/640},{id:'u3',x:230/427,y:158/640},{id:'u4',x:210/427,y:140/640},{id:'u5',x:178/427,y:181/640},{id:'u6',x:204/427,y:196/640}];
  function skyTargets(){return skyPhoto==='ursa-minor'?photoStars.map(s=>({...s,x:(280+s.x*440)/10,y:(20+s.y*660)/7.4})):[];}
  let seed=48;
  function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
  const background=Array.from({length:180},()=>({x:rand()*W,y:rand()*H,r:.4+rand()*1.5,a:.15+rand()*.6}));
  const media=window.SpaceMedia, images=new Map();
  function loadPhoto(id, retry=false){
    if(!media[id])return null;
    if(images.has(id) && !retry)return images.get(id);
    const record={status:'loading',image:new Image()};images.set(id,record);
    const signal=()=>{dirty=true;window.dispatchEvent(new CustomEvent('space-image-change',{detail:{id,status:record.status}}));};
    record.image.onload=()=>{record.status='ready';signal();};
    record.image.onerror=()=>{record.status='error';signal();};
    record.image.src=media[id].src;
    return record;
  }
  function realPhoto(){
    const asset=media[destination.id],record=loadPhoto(destination.id);
    if(record.status!=='ready'){
      ctx.fillStyle='#b7c8df';ctx.textAlign='center';ctx.font='22px sans-serif';
      ctx.fillText(record.status==='error'?'사진을 불러오지 못했어요':'실제 관측 사진을 불러오는 중…',500,365);return;
    }
    const picture=record.image, scale=Math.min(900/picture.naturalWidth,540/picture.naturalHeight);
    const width=picture.naturalWidth*scale,height=picture.naturalHeight*scale;
    ctx.drawImage(picture,(W-width)/2,320-height/2,width,height);
    ctx.fillStyle='#a6b9d1';ctx.textAlign='center';ctx.font='15px sans-serif';
    ctx.fillText(asset.kind,500,625);
    ctx.font='12px sans-serif';ctx.fillText(asset.credit,500,650,930);
  }
  function phasePhotoId(){return C.phases[phase].day===15?'moon':`phase-${C.phases[phase].day}`;}
  function moonPhase(){
    const id=phasePhotoId(),record=loadPhoto(id);ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';ctx.fillStyle='#c6d3e5';
    if(record.status!=='ready'){ctx.font='20px sans-serif';ctx.fillText(record.status==='error'?'사진을 불러오지 못했어요. 다시 불러오기를 눌러 주세요.':'실제 달 사진을 불러오는 중…',500,350);return;}
    const img=record.image,scale=Math.min(900/img.naturalWidth,560/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;
    ctx.drawImage(img,(W-w)/2,315-h/2,w,h);ctx.font='18px sans-serif';ctx.fillText(`관측 기록 · ${C.phases[phase].day}일`,500,625);
    ctx.font='12px sans-serif';ctx.fillText(media[id].credit+' · '+media[id].license,500,656,940);ctx.fillText('서로 다른 촬영일의 실제 사진으로 구성한 학습 기록',500,680);
  }
  function sky(){
    const record=loadPhoto(skyPhoto);
    if(record.status!=='ready'){ctx.fillStyle='#b7c8df';ctx.font='20px sans-serif';ctx.textAlign='center';ctx.fillText(record.status==='error'?'사진 로딩 실패 · 다시 불러오기를 눌러 주세요':'별자리 사진을 불러오는 중…',500,350);return;}
    const picture=record.image;
    if(skyPhoto==='ursa-minor')ctx.drawImage(picture,280,20,440,660);
    else {const scale=Math.min(900/picture.naturalWidth,660/picture.naturalHeight),w=picture.naturalWidth*scale,h=picture.naturalHeight*scale;ctx.drawImage(picture,(1000-w)/2,20,w,h);}
    const s=skyTargets().find(s=>s.id===selected);if(s){ctx.strokeStyle='#ffc777';ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.x*10,s.y*7.4,14,0,Math.PI*2);ctx.stroke();}
    ctx.textAlign='center';ctx.fillStyle='#c1cde0';ctx.font='12px sans-serif';ctx.fillText(media[skyPhoto].credit+' · CC BY-SA 3.0',500,720);
  }
  function ship(){
    ctx.save();ctx.translate(x*W,y*H);const angle=arrived?-.3:Math.atan2(.68-y,.76-x);ctx.rotate(angle);if(auto || keys.size){ctx.fillStyle='#ffc777';ctx.beginPath();ctx.moveTo(-24,-6);ctx.lineTo(-48,0);ctx.lineTo(-24,6);ctx.fill();}ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(32,0);ctx.lineTo(-22,-19);ctx.lineTo(-12,0);ctx.lineTo(-22,19);ctx.closePath();ctx.fill();ctx.fillStyle='#304f6d';ctx.beginPath();ctx.ellipse(7,0,9,5,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function draw(){
    dirty=false;
    ctx.fillStyle=media[destination.id]?'#000':'#0b1425';ctx.fillRect(0,0,W,H);
    const nebula=ctx.createRadialGradient(520,350,30,520,350,530);nebula.addColorStop(0,'#24395370');nebula.addColorStop(1,'#0b142500');ctx.fillStyle=nebula;if(!media[destination.id])ctx.fillRect(0,0,W,H);
    for(const s of (media[destination.id]||destination.id==='sky'?[]:background)){ctx.fillStyle=`rgba(204,222,245,${s.a})`;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();}
    if(destination.id==='observatory')moonPhase();else if(destination.id==='sky')sky();else realPhoto();
    if(!arrived){ctx.strokeStyle='#9de5d65c';ctx.setLineDash([5,8]);ctx.lineWidth=2;ctx.beginPath();ctx.arc(.76*W,.68*H,38,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#9de5d6';ctx.font='15px sans-serif';ctx.textAlign='center';ctx.fillText('관측 지점',760,565);}
    if(!['observatory','sky'].includes(destination.id) || !arrived)ship();
  }
  function step(now){
    const dt=Math.min((now-last)/1000,.04);last=now;
    if(running && !document.hidden){
      if(!arrived){if(auto || keys.size)dirty=true;if(auto){const dx=.76-x,dy=.68-y,d=Math.hypot(dx,dy),speed=Math.min(d,.42*dt);x+=dx/d*speed;y+=dy/d*speed;}else{const dx=(keys.has('right')?1:0)-(keys.has('left')?1:0),dy=(keys.has('down')?1:0)-(keys.has('up')?1:0);const length=Math.hypot(dx,dy)||1;x=Math.max(.04,Math.min(.96,x+dx/length*.32*dt));y=Math.max(.08,Math.min(.92,y+dy/length*.32*dt));}if(Math.hypot(.76-x,.68-y)<.035){arrived=true;auto=false;keys.clear();dirty=true;callback();}}if(dirty)draw();
    }
    requestAnimationFrame(step);
  }
  const keyMap={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};
  canvas.addEventListener('keydown',e=>{if(running && keyMap[e.key]){e.preventDefault();auto=false;keys.add(keyMap[e.key]);}});
  window.addEventListener('keyup',e=>keys.delete(keyMap[e.key]));canvas.addEventListener('blur',()=>keys.clear());window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>keys.clear());
  document.querySelectorAll('[data-move]').forEach(b=>{b.addEventListener('pointerdown',e=>{if(!running)return;e.preventDefault();auto=false;keys.add(b.dataset.move);b.setPointerCapture(e.pointerId);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.move));b.addEventListener('click',e=>{if(running && e.detail===0){auto=false;dirty=true;const d=b.dataset.move;x=Math.max(.04,Math.min(.96,x+(d==='right'?.06:d==='left'?-.06:0)));y=Math.max(.08,Math.min(.92,y+(d==='down'?.06:d==='up'?-.06:0)));}});});
  window.ObservationScene={start(){running=true;dirty=true;},stop(){running=false;keys.clear();},pause(value){running=!value;keys.clear();},travel(id,onArrival){destination=C.bodies.find(b=>b.id===id);arrived=false;auto=false;x=.16;y=.76;keys.clear();selected=null;callback=onArrival;if(id==='sky'||id==='observatory'){arrived=true;loadPhoto(id==='sky'?skyPhoto:phasePhotoId());draw();queueMicrotask(callback);}else draw();},auto(){auto=true;keys.clear();},isArrived(){return arrived;},skyPhotoId(){return skyPhoto;},skyTargets,setSkyPhoto(id){if(!['ursa-minor','ursa-major','cassiopeia'].includes(id))return;skyPhoto=id;selected=null;loadPhoto(id);dirty=true;},canCapture(){if(destination.id==='observatory')return images.get(phasePhotoId())?.status==='ready';if(destination.id==='sky')return images.get(skyPhoto)?.status==='ready';return !media[destination.id] || images.get(destination.id)?.status==='ready';},mediaStatus(){if(destination.id==='observatory')return images.get(phasePhotoId())?.status||'loading';if(destination.id==='sky')return images.get(skyPhoto)?.status||'loading';return images.get(destination.id)?.status || 'model';},retryPhoto(){loadPhoto(destination.id==='sky'?skyPhoto:destination.id==='observatory'?phasePhotoId():destination.id,true);},setPhase(v){phase=v;loadPhoto(phasePhotoId());dirty=true;},setGuides(v){guides=v;dirty=true;},setColor(v){color=v;dirty=true;},select(id){selected=id;dirty=true;},photo(){draw();const small=document.createElement('canvas');small.width=360;small.height=266;small.getContext('2d').drawImage(canvas,0,0,360,266);return small.toDataURL('image/png');}};
  requestAnimationFrame(step);
})();
