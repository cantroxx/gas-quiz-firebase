import * as THREE from './vendor/three.module.js';

// The spacecraft flies around the selected body's centre; zoom changes its world
// position, not the lens. The same camera projects the body and depth-distributed stars.
const canvas=document.getElementById('space'), observation=document.getElementById('observation');
const O=window.ObservationScene, $=id=>document.getElementById(id), keys=new Set();
const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(52,1000/740,.05,1800);
scene.background=new THREE.Color('#020611');
let renderer;
try {
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(1000,740,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
} catch (_) { $('graphics-error').hidden=false; }
scene.add(new THREE.AmbientLight(0xffffff,1.25));
const sunlight=new THREE.DirectionalLight(0xfff5e8,2.3);sunlight.position.set(8,5,10);scene.add(sunlight);
const planet=new THREE.Group();scene.add(planet);
const geometry=new THREE.SphereGeometry(2,96,64);
const material=new THREE.MeshStandardMaterial({roughness:1,metalness:0});
const globe=new THREE.Mesh(geometry,material);planet.add(globe);
// Longitude zero of the equirectangular Moon map faces the initial camera.
globe.rotation.y=-Math.PI/2;
const ringGeometry=new THREE.RingGeometry(2.5,4.6,160);
const uv=ringGeometry.attributes.uv,position=ringGeometry.attributes.position;
for(let i=0;i<position.count;i++)uv.setXY(i,(Math.hypot(position.getX(i),position.getY(i))-2.5)/2.1,.5);
const ringMaterial=new THREE.MeshStandardMaterial({side:THREE.DoubleSide,transparent:true,roughness:1});
const ring=new THREE.Mesh(ringGeometry,ringMaterial);ring.rotation.x=-Math.PI/2;planet.add(ring);
const bodySpecs={sun:[0,0,0,5],mercury:[14,0,-8,1.2],venus:[-22,0,-12,1.8],earth:[36,0,8,2],moon:[44,0,8,1],mars:[-40,0,24,1.5],jupiter:[70,0,-24,4],saturn:[-90,0,-35,3.6],uranus:[115,0,55,2.6],neptune:[-145,0,70,2.5]};
const bodies=new Map();
for(const [id,[x,y,z,r]] of Object.entries(bodySpecs)){
 const group=id==='moon'?planet:new THREE.Group();if(id!=='moon')scene.add(group);
 const mesh=id==='moon'?globe:new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({roughness:1,metalness:0}));
 if(id!=='moon'){mesh.rotation.y=-Math.PI/2;group.add(mesh);}mesh.scale.setScalar(r/2);group.position.set(x,y,z);mesh.visible=false;
 if(id==='sun'){mesh.material.emissive.set(0xffffff);mesh.material.emissiveIntensity=.7;}
 if(id==='saturn'){group.add(ring);ring.scale.setScalar(r/2);group.rotation.z=.22;}
 bodies.set(id,{group,mesh,r});
 const label=document.createElement('button');label.className='world-label';label.textContent=window.SpaceContent.bodies.find(b=>b.id===id).name;label.dataset.worldBody=id;label.addEventListener('click',()=>document.querySelector(`[data-destination="${id}"]`)?.click());$('world-labels').append(label);
}
ring.visible=false;
let solarTime=0,solarMoving=true;
const orbitSpeeds={mercury:.035,venus:.027,earth:.02,mars:.016,jupiter:.009,saturn:.007,uranus:.005,neptune:.004};
function advanceSolarSystem(dt){if(!solarMoving)return;solarTime+=dt;for(const [id,speed] of Object.entries(orbitSpeeds)){const [x,,z]=bodySpecs[id],angle=Math.atan2(z,x)+solarTime*speed,r=Math.hypot(x,z);bodies.get(id).group.position.set(r*Math.cos(angle),0,r*Math.sin(angle));}const earth=bodies.get('earth').group.position;bodies.get('moon').group.position.copy(earth).add(new THREE.Vector3(Math.cos(solarTime*.06)*8,0,Math.sin(solarTime*.06)*8));dirty=true;}
let freePosition=new THREE.Vector3(44,2,20),locked=false,firstPerson=false;
function targetBody(){return bodies.get(destination)||bodies.get('moon');}
function aimAtTarget(){camera.position.copy(freePosition);camera.lookAt(targetBody().group.position);const e=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');yaw=e.y;pitch=e.x;}
function orbitCoordinates(){const v=freePosition.clone().sub(targetBody().group.position);distance=v.length();yaw=Math.atan2(v.x,v.z);pitch=Math.asin(v.y/distance);}
let seed=48;function random(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
const starPositions=[],starColors=[];
for(let i=0;i<2400;i++){
  const radius=24+Math.pow(random(),.7)*650,theta=random()*Math.PI*2,z=random()*2-1,r=Math.sqrt(1-z*z);
  starPositions.push(radius*r*Math.cos(theta),radius*z,radius*r*Math.sin(theta));
  const c=new THREE.Color().setHSL(.55+random()*.12,.15+random()*.25,.55+random()*.4);starColors.push(c.r,c.g,c.b);
}
const starsGeometry=new THREE.BufferGeometry();starsGeometry.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));starsGeometry.setAttribute('color',new THREE.Float32BufferAttribute(starColors,3));
const stars=new THREE.Points(starsGeometry,new THREE.PointsMaterial({size:.28,sizeAttenuation:true,vertexColors:true}));scene.add(stars);
// Camera-mounted ship gives a stable flight reference without covering the target.
const ship=new THREE.Group(),shipMaterial=new THREE.MeshBasicMaterial({transparent:true,depthTest:false,depthWrite:false});
const craft=new THREE.Mesh(new THREE.PlaneGeometry(.66,.66),shipMaterial);craft.visible=false;craft.renderOrder=100;ship.add(craft);
new THREE.TextureLoader().load('images/explorer-craft-v2.png',texture=>{texture.colorSpace=THREE.SRGBColorSpace;shipMaterial.map=texture;shipMaterial.needsUpdate=true;craft.visible=true;dirty=true;});
const flame=new THREE.Group();ship.add(flame);
ship.position.set(0,-.51,-1.9);camera.add(ship);scene.add(camera);
const textures=new Map(),loader=new THREE.TextureLoader();
let destination='moon',special=false,running=false,arrived=false,auto=false,orbit=false,yaw=0,pitch=.16,distance=18,last=0,callback=()=>{},opposite=null,dirty=true,contextLost=false;
function signal(id){window.dispatchEvent(new CustomEvent('space-image-change',{detail:{id,status:status()}}));dirty=true;}
function load(id,retry=false){
  if(textures.has(id)&&!retry)return textures.get(id);
  const record={status:'loading',texture:null};textures.set(id,record);
  loader.load(`textures/${id}.${id==='ring'?'png':'jpg'}`,texture=>{
    texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer?Math.min(8,renderer.capabilities.getMaxAnisotropy()):1;
    record.status='ready';record.texture=texture;
    applyTexture();signal(id==='ring'?'saturn':id);
  },undefined,()=>{record.status='error';signal(id==='ring'?'saturn':id);});return record;
}
function applyTexture(){for(const [id,body] of bodies){const map=textures.get(id)?.texture;body.mesh.material.map=map||null;body.mesh.material.emissiveMap=id==='sun'?map:null;body.mesh.material.needsUpdate=true;body.mesh.visible=Boolean(map);}ringMaterial.map=textures.get('ring')?.texture||null;ringMaterial.needsUpdate=true;ring.visible=Boolean(ringMaterial.map);dirty=true;}
function status(){if(special)return O.mediaStatus();if(!renderer||contextLost)return'error';const own=textures.get(destination)?.status||'loading';if(own!=='ready')return own;return destination==='saturn'?textures.get('ring')?.status||'loading':'ready';}
function checkArrival(){if(!arrived&&distance<=targetBody().r*5.5){arrived=true;auto=false;callback();}}
function manualFlight(){auto=false;orbit=false;$('orbit-toggle').setAttribute('aria-pressed','false');window.dispatchEvent(new Event('space-manual-flight'));}
function move(direction,dt){manualFlight();opposite=null;const angular=dt*.85;
 if(direction==='ascend'||direction==='descend'){
   if(locked){aimAtTarget();locked=false;$('flight-mode').setAttribute('aria-pressed','false');}
   const speed=Math.max(2,Math.min(24,(freePosition.distanceTo(targetBody().group.position)-targetBody().r)*.75));
   freePosition.y+=(direction==='ascend'?1:-1)*dt*speed;
   constrain();dirty=true;return;
 }
 if(direction==='orbit-left'||direction==='orbit-right'){
   const angle=direction==='orbit-left'?-angular:angular;
   if(locked)yaw+=angle;
   else{const center=targetBody().group.position;freePosition.sub(center).applyAxisAngle(new THREE.Vector3(0,1,0),angle).add(center);aimAtTarget();}
   constrain();dirty=true;return;
 }
 if(direction==='left')yaw+=locked?-angular:angular;if(direction==='right')yaw+=locked?angular:-angular;
 if(direction==='up')pitch+=angular;if(direction==='down')pitch-=angular;
 if(locked){
   if(direction==='strafe-left')yaw-=angular;if(direction==='strafe-right')yaw+=angular;
   if(direction==='forward')distance*=Math.exp(-dt*.8);if(direction==='backward')distance*=Math.exp(dt*.8);
 }else{
   const orientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));
   const v=new THREE.Vector3(direction==='strafe-right'?1:direction==='strafe-left'?-1:0,0,direction==='backward'?1:direction==='forward'?-1:0).applyQuaternion(orientation);
   const speed=Math.max(2,Math.min(24,(freePosition.distanceTo(targetBody().group.position)-targetBody().r)*.75));freePosition.addScaledVector(v,dt*speed);
 }
 constrain();dirty=true;
}
function constrain(){
 pitch=THREE.MathUtils.clamp(pitch,-1.42,1.42);
 if(locked){distance=THREE.MathUtils.clamp(distance,targetBody().r*(destination==='saturn'?2.7:1.35),250);freePosition.set(distance*Math.cos(pitch)*Math.sin(yaw),distance*Math.sin(pitch),distance*Math.cos(pitch)*Math.cos(yaw)).add(targetBody().group.position);}
 else {for(const b of bodies.values()){const v=freePosition.clone().sub(b.group.position),limit=b.r*1.25;if(v.length()<limit){if(v.length()<.01)v.set(0,0,1);freePosition.copy(b.group.position).add(v.setLength(limit));}}if(freePosition.length()>900)freePosition.setLength(900);distance=freePosition.distanceTo(targetBody().group.position);}
 checkArrival();
}
function render(){
  if(!renderer||contextLost||special)return;
  const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight);
  if(canvas.width!==Math.floor(width*renderer.getPixelRatio())||canvas.height!==Math.floor(height*renderer.getPixelRatio()))renderer.setSize(width,height,false);
  camera.aspect=width/height;camera.updateProjectionMatrix();
  camera.position.copy(freePosition);if(locked)camera.lookAt(targetBody().group.position);else camera.quaternion.setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));camera.updateMatrixWorld();ship.visible=!firstPerson;
  for(const label of $('world-labels').children){const b=bodies.get(label.dataset.worldBody),v=b.group.position.clone();v.y+=b.r+1;v.project(camera);label.hidden=v.z>1||v.z< -1||Math.abs(v.x)>1||Math.abs(v.y)>1;label.style.left=((v.x+1)*50)+'%';label.style.top=((-v.y+1)*50)+'%';}
  ship.rotation.z=(keys.has('left')?.12:keys.has('right')?-.12:0);flame.visible=auto||keys.size>0||orbit||opposite!==null;
  renderer.render(scene,camera);dirty=false;
  const angle=((yaw*180/Math.PI%360)+360)%360;
  $('flight-telemetry').textContent=`${locked?'관측 고정':'자유 비행'} · 방향 ${Math.round(angle)}° · 목표 거리 ${(distance/targetBody().r).toFixed(1)}배`;
  canvas.dataset.orbit=angle.toFixed(2);canvas.dataset.distance=distance.toFixed(3);
}
function step(now){const dt=Math.min((now-last)/1000||0,.05);last=now;
  if(running&&!special&&!document.hidden){
    advanceSolarSystem(dt);
    if(auto){const b=targetBody(),v=freePosition.clone().sub(b.group.position);if(v.length()<.01)v.set(0,0,1);const end=b.group.position.clone().add(v.setLength(b.r*4));freePosition.lerp(end,1-Math.exp(-dt*2));distance=freePosition.distanceTo(b.group.position);aimAtTarget();dirty=true;checkArrival();if(freePosition.distanceTo(end)<.05)auto=false;}
    if(orbit){yaw+=dt*.24;dirty=true;}
    if(opposite!==null){const remaining=opposite-yaw,delta=Math.sign(remaining)*Math.min(Math.abs(remaining),dt*1.4);yaw+=delta;dirty=true;if(Math.abs(remaining)<.001)opposite=null;}
    keys.forEach(k=>move(k,dt));if(dirty){constrain();render();}
  }requestAnimationFrame(step);
}
const physicalKeys={KeyW:'forward',KeyS:'backward',KeyA:'strafe-left',KeyD:'strafe-right',KeyQ:'orbit-left',KeyE:'orbit-right',KeyZ:'ascend',KeyX:'descend'};
const keyMap={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'forward',s:'backward',a:'strafe-left',d:'strafe-right',q:'orbit-left',e:'orbit-right',z:'ascend',x:'descend'};
window.addEventListener('keydown',e=>{if(e.target.closest?.('input,textarea,select,[contenteditable="true"]')||e.ctrlKey||e.metaKey||e.altKey)return;const key=physicalKeys[e.code]||keyMap[e.key]||keyMap[e.key.toLowerCase()];if(key&&running&&!special){e.preventDefault();keys.add(key);}});
window.addEventListener('keyup',e=>keys.delete(physicalKeys[e.code]||keyMap[e.key]||keyMap[e.key.toLowerCase()]));
function clearInput(){keys.clear();pointers.clear();}
canvas.addEventListener('blur',clearInput);window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',clearInput);
const pointers=new Map();let pinchDistance=0;
canvas.addEventListener('pointerdown',e=>{if(!running||special)return;canvas.focus();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});pinchDistance=0;manualFlight();opposite=null;});
canvas.addEventListener('pointermove',e=>{const prior=pointers.get(e.pointerId);if(!prior||!running)return;
  if(pointers.size===1){yaw-=(e.clientX-prior.x)*.008;pitch+=(e.clientY-prior.y)*.008;}
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>0&&d>0){if(locked)distance*=pinchDistance/d;else move(d>pinchDistance?'forward':'backward',Math.min(.4,Math.abs(Math.log(d/pinchDistance))));}pinchDistance=d;}
  constrain();dirty=true;
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{pointers.delete(e.pointerId);pinchDistance=0;});
canvas.addEventListener('wheel',e=>{if(!running||special)return;e.preventDefault();manualFlight();move(e.deltaY>0?'backward':'forward',Math.min(Math.abs(e.deltaY),200)*.002);constrain();dirty=true;},{passive:false});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;$('graphics-error').hidden=false;signal(destination);});
canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;$('graphics-error').hidden=true;dirty=true;signal(destination);});
document.querySelectorAll('[data-move]').forEach(button=>{
  let pressedAt=0;
  button.addEventListener('pointerdown',e=>{if(!running||special)return;e.preventDefault();pressedAt=performance.now();button.setPointerCapture(e.pointerId);keys.add(button.dataset.move);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>{if(event==='pointerup'&&pressedAt&&performance.now()-pressedAt<180&&!special&&running)move(button.dataset.move,.2);keys.delete(button.dataset.move);pressedAt=0;});
  button.addEventListener('click',e=>{if(!special&&running&&e.detail===0)move(button.dataset.move,.3);});
});
$('opposite-view').onclick=()=>{if(!locked){locked=true;orbitCoordinates();$('flight-mode').setAttribute('aria-pressed','true');}auto=false;orbit=false;$('orbit-toggle').setAttribute('aria-pressed','false');opposite=yaw+Math.PI;};
$('orbit-toggle').onclick=()=>{if(!locked){locked=true;orbitCoordinates();$('flight-mode').setAttribute('aria-pressed','true');}orbit=!orbit;opposite=null;$('orbit-toggle').setAttribute('aria-pressed',String(orbit));};
$('expand-flight').onclick=()=>{const expanded=$('game').classList.toggle('wide-flight');$('expand-flight').setAttribute('aria-pressed',String(expanded));$('expand-flight').textContent=expanded?'임무 함께 보기':'비행 화면 넓히기';dirty=true;};
$('flight-mode').onclick=()=>{locked=!locked;auto=false;orbit=false;opposite=null;$('orbit-toggle').setAttribute('aria-pressed','false');if(locked)orbitCoordinates();else aimAtTarget();$('flight-mode').setAttribute('aria-pressed',String(locked));dirty=true;};
$('solar-motion').onclick=()=>{solarMoving=!solarMoving;$('solar-motion').setAttribute('aria-pressed',String(solarMoving));$('solar-motion').textContent=solarMoving?'공전 멈추기':'공전 재생';};
$('perspective').onclick=()=>{firstPerson=!firstPerson;$('perspective').textContent=firstPerson?'3인칭으로 보기':'1인칭으로 보기';dirty=true;};
new ResizeObserver(()=>{dirty=true;}).observe(canvas);
window.SpaceScene={
  start(){running=true;},stop(){running=false;clearInput();O.stop();},pause(value){running=!value;clearInput();if(special)O.pause(value);},
  travel(id,onArrival){destination=id;special=['sky','observatory','galaxy'].includes(id);callback=onArrival;arrived=false;auto=false;orbit=false;opposite=null;clearInput();
    $('world-labels').hidden=special;canvas.hidden=special;observation.hidden=!special;$('flight-telemetry').hidden=special;$('graphics-error').hidden=special||Boolean(renderer&&!contextLost);
    for(const control of ['opposite-view','orbit-toggle','flight-mode','perspective','solar-motion'])$(control).hidden=special;
    document.querySelectorAll('[data-move="forward"],[data-move="backward"]').forEach(b=>b.hidden=special);
    $('orbit-toggle').setAttribute('aria-pressed','false');
    if(special){O.start();O.travel(id,onArrival);}else{
      O.stop();locked=false;$('flight-mode').setAttribute('aria-pressed','false');
      for(const key of bodies.keys())load(key);load('ring');distance=freePosition.distanceTo(targetBody().group.position);aimAtTarget();applyTexture();render();

    }
  },
  auto(){if(special)O.auto();else{locked=false;$('flight-mode').setAttribute('aria-pressed','false');auto=true;keys.clear();}},isArrived(){return special?O.isArrived():arrived;},canCapture(){return special?O.canCapture():status()==='ready';},mediaStatus:status,
  retryPhoto(){if(special)O.retryPhoto();else{load(destination,true);if(destination==='saturn')load('ring',true);}},
  setSkyPhoto(id){O.setSkyPhoto(id);},skyPhotoId(){return O.skyPhotoId();},skyTargets(){return O.skyTargets();},setPhase(v){O.setPhase(v);},setGuides(v){O.setGuides(v);},select(id){O.select(id);},setColor(value){O.setColor(value);dirty=true;},
  is3D(){return !special;},textureCredit(){return destination==='moon'?"NASA's Scientific Visualization Studio · LRO / ASU · 전구 지도 기반 3D 재현":"Solar System Scope / INOVE · CC BY 4.0 · NASA 자료 기반 가공 지도 · 미관측 영역 보완";},
  photo(){if(special)return O.photo();render();const result=document.createElement('canvas');result.width=360;result.height=266;result.getContext('2d').drawImage(canvas,0,0,360,266);return result.toDataURL('image/png');},
  // Read-only telemetry for rendering diagnostics; values are derived from world geometry.
  telemetry(){camera.updateMatrixWorld();const star=new THREE.Vector3(...starPositions.slice(0,3)).project(camera);return {camera:camera.position.toArray(),locked,running,solarMoving,bodies:Object.fromEntries([...bodies].map(([id,b])=>[id,b.group.position.toArray()])),distance,yaw,pitch,star:star.toArray(),renderer:renderer?.info.render.calls||0};}
};
requestAnimationFrame(step);
await import('./app.js');
