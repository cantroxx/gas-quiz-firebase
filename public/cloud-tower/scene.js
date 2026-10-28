(function(root){
  'use strict';
  const M=root.CloudTowerMotion;
  const ZONES=[{name:'바람의 초원',color:'#14aaae'},{name:'황금빛 하늘섬',color:'#f8b54a'},{name:'별빛 구름바다',color:'#9d83ed'},{name:'무지개 정상',color:'#ee92ce'}];
  function create(canvas){
    const ctx=canvas.getContext('2d');
    const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
    let reduced=motionPreference.matches,w=900,h=500,ratio=1,scale=1,last=0,cameraX=0,cameraY=0,zoom=1;
    let movement=M.create(),particles=[],trails=[],lastLanded=-10000,shake=0,best=0,ended=null,lastSnapshot=null,sceneActive=false,peers=[];
    const images={};
    const ready=Promise.all(Object.entries({sky:'sky-kingdom-v2.png',runner:'runner-atlas-v2.png',islands:'islands-atlas-v2.png'}).map(([key,file])=>new Promise((resolve,reject)=>{
      const img=new Image();img.onload=()=>{images[key]=img;resolve();};img.onerror=()=>reject(new Error('아트 파일을 불러오지 못했어요: '+file));img.src='assets/'+file;
    })));
    function resize(){const r=canvas.getBoundingClientRect();w=r.width;h=r.height;ratio=Math.min(devicePixelRatio||1,2);canvas.width=w*ratio;canvas.height=h*ratio;scale=Math.max(.47,Math.min(1.16,w/1100,h/530));}
    new ResizeObserver(resize).observe(canvas);
    function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
    function star(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<8;i++){const d=i%2?r*.32:r;ctx.lineTo(x+Math.cos(i*Math.PI/4)*d,y+Math.sin(i*Math.PI/4)*d);}ctx.closePath();ctx.fill();}
    const project=(x,y)=>({x:(x-cameraX)*scale+w*(sceneActive ? .32 : .7),y:(y-cameraY)*scale+h*.68});
    function island(index,x,y,width,alpha=1){
      if(!images.islands)return;
      ctx.save();ctx.globalAlpha=alpha;const sx=index%2*768,sy=Math.floor(index/2)*512,height=width*2/3;
      ctx.drawImage(images.islands,sx,sy,768,512,x-width/2,y-height*.31,width,height);ctx.restore();
    }
    const anchors=[[227,476],[228,476],[228,476],[231,474],[230,456],[236,425],[232,463],[237,465]];
    function runner(p,pose,now,alpha=1,snapshot=lastSnapshot){
      if(!images.runner)return;
      const anchor=anchors[pose],unit=.42*scale,frameX=pose%4*384,frameY=Math.floor(pose/4)*512;
      ctx.save();ctx.globalAlpha=alpha;ctx.translate(p.x,p.y);
      if(!reduced){ctx.rotate(snapshot.rotation);ctx.scale(snapshot.sx,snapshot.sy);}
      ctx.drawImage(images.runner,frameX,frameY,384,512,-anchor[0]*unit,-anchor[1]*unit,384*unit,512*unit);ctx.restore();
    }
    function burst(x,y,boost){
      if(reduced)return;for(let i=0;i<(boost?32:18);i++)particles.push({x,y,vx:(Math.random()-.5)*230,vy:-50-Math.random()*170,life:1,color:i%3===0?'#fff':'#ffdc79',r:3+Math.random()*4});
    }
    function reset(){movement=M.create();movement.lastAt=last;cameraX=0;cameraY=0;zoom=1;particles=[];trails=[];ended=null;lastLanded=-10000;}
    function jump(boost,floor){M.enqueue(movement,floor,boost);}
    function finish(reason){ended={reason,at:last};}
    function setReduced(value){reduced=value;trails=[];particles=[];shake=0;zoom=1;return reduced;}
    function draw(now,state,active){
      sceneActive=active;
      const dt=Math.min(Math.max((now-last)/1000,.001),.05);last=now;
      ctx.setTransform(ratio,0,0,ratio,0,0);
      const t=reduced?0:now/1000;
      const pose=M.step(movement,now,reduced);lastSnapshot=pose;
      const zone=Math.min(3,Math.floor((state?.floor||0)/10));
      const targetX=active?pose.x:0,targetY=active?M.point(pose.target).y:0;
      cameraX+=(targetX-cameraX)*(reduced?1:Math.min(1,dt*5.4));cameraY+=(targetY-cameraY)*(reduced?1:Math.min(1,dt*3.5));
      const targetZoom=pose.phase==='air'&&pose.boost?1.075:1;zoom+=(targetZoom-zoom)*(reduced?1:dt*5);
      if(images.sky){
        const fit=Math.max(w/images.sky.width,h/images.sky.height)*1.1;
        const iw=images.sky.width*fit,ih=images.sky.height*fit;
        const drift=Math.sin(cameraX/3000)*w*.035;
        ctx.drawImage(images.sky,(w-iw)/2-drift,(h-ih)/2+Math.sin(cameraY/1500)*15,iw,ih);
      }else{ctx.fillStyle='#a1dbe8';ctx.fillRect(0,0,w,h);}
      if(zone===1){ctx.fillStyle='#ffb45024';ctx.fillRect(0,0,w,h);}
      if(zone>=2){ctx.fillStyle=zone===2?'#27206465':'#b278ae35';ctx.fillRect(0,0,w,h);for(let i=0;i<26;i++)star((i*131)%w,30+(i*47)%(h*.45),2+Math.sin(t+i),'#fff4c6');}
      // Atmospheric layers move at different speeds from the foreground course.
      for(let i=0;i<4;i++){
        const x=((i*470-cameraX*.12+t*6)%(w+400)+w+400)%(w+400)-200;
        island(2,x,h*.27+(i%2)*60,140*scale,.16);
      }
      if(pose.landedAt!==lastLanded&&pose.landedAt>0){lastLanded=pose.landedAt;burst(pose.x,pose.y,false);shake=reduced?0:6;canvas.dispatchEvent(new CustomEvent('tower-land',{detail:{floor:pose.floor}}));}
      shake=Math.max(0,shake-dt*25);
      ctx.save();ctx.translate(w*.5,h*.5);ctx.scale(zoom,zoom);ctx.translate(-w*.5,-h*.5+(reduced?0:Math.sin(now*.11)*shake));
      const first=Math.max(0,Math.floor((cameraX-w*.5/scale)/350)-1),lastFloor=Math.ceil((cameraX+w/scale)/350)+1;
      for(let i=first;i<=lastFloor;i++){
        const world=M.point(i),p=project(world.x,world.y),idx=zone>=2?2:(i>0&&i%3===0?1:0);
        const landedBounce=!reduced&&i===pose.floor?Math.sin(Math.min(1,(now-lastLanded)/320)*Math.PI)*7:0;
        island(idx,p.x,p.y+landedBounce,310*scale);
        ctx.font=`800 ${Math.max(11,13*scale)}px system-ui`;ctx.textAlign='center';
        ctx.fillStyle='#244c56';ctx.fillText(i===0?'START':`${i}F`,p.x,p.y+44*scale);
        if(i===pose.target+1){
          ctx.strokeStyle='#fff4b5';ctx.lineWidth=3;ctx.setLineDash([5,6]);ctx.beginPath();ctx.ellipse(p.x,p.y-4,62*scale,14*scale,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
          star(p.x,p.y-63*scale+Math.sin(t*3)*5,13*scale,'#ffe299');
        }
        if(best>0&&i===best){
          ctx.fillStyle='#e78945';ctx.fillRect(p.x+46*scale,p.y-120*scale,3*scale,113*scale);
          ctx.beginPath();ctx.moveTo(p.x+49*scale,p.y-120*scale);ctx.lineTo(p.x+126*scale,p.y-108*scale);ctx.lineTo(p.x+49*scale,p.y-86*scale);ctx.fill();
          ctx.fillStyle='white';ctx.font=`800 ${Math.max(10,12*scale)}px system-ui`;ctx.fillText('MY BEST',p.x+83*scale,p.y-103*scale);
        }
      }
      const p=project(pose.x,pose.y),ground=project(pose.x,pose.y+pose.lift);
      for(let i=0;i<peers.length;i++){
        const peer=peers[i],world=M.point(peer.floor),q=project(world.x+35+i*24,world.y-8-i*8);
        if(q.x < -150 || q.x > w+150)continue;
        runner(q,peer.status==='playing'?1:0,now,.55,{rotation:0,sx:.9,sy:.9});
        ctx.textAlign='center';ctx.font=`800 ${Math.max(10,12*scale)}px system-ui`;ctx.fillStyle=['#b45480','#4664bd','#36836a'][i%3];ctx.fillText(peer.nickname,q.x,q.y-185*scale);
      }
      ellipse(ground.x,ground.y+2,Math.max(12,39*scale-pose.lift*.06),8*scale,'#1b425846');
      if(pose.phase==='air'&&!reduced){
        trails.push({x:pose.x,y:pose.y-65,life:1});if(trails.length>22)trails.shift();
        if(pose.boost){ctx.lineCap='round';['#ffbd63','#f6f5ab','#85e6df'].forEach((color,j)=>{ctx.strokeStyle=color;ctx.globalAlpha=.65;ctx.lineWidth=(11-j*2)*scale;ctx.beginPath();trails.forEach((trail,i)=>{const q=project(trail.x,trail.y+j*9);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});ctx.stroke();});ctx.globalAlpha=1;}
      }else trails=[];
      let actorPose=pose.pose,actorPoint={...p};
      if(ended&&now-ended.at>250){
        if(ended.reason==='storm'){const f=Math.min(1,(now-ended.at-250)/850);actorPoint.y+=f*f*190*scale;lastSnapshot.rotation=reduced?0:f*.6;actorPose=5;}
        else actorPose=7;
      }else if(pose.phase==='idle'&&active&&state?.text){actorPose=1+Math.floor(t*8)%2;actorPoint.y-=reduced?0:Math.abs(Math.sin(t*12))*4*scale;}
      runner(actorPoint,actorPose,now);
      if(!active){const badge=project(0,0);ctx.fillStyle='#fff';ctx.font=`900 ${14*scale}px system-ui`;ctx.textAlign='center';ctx.fillText('READY TO FLY',badge.x,badge.y+90*scale);}
      const danger=active&&state?.mode==='challenge'&&state.phase!=='countdown'?state.floor-root.CloudTowerDomain.stormFloor(state.elapsed):99;
      if(danger<7&&images.islands){
        const sx=Math.max(-150*scale,p.x-(110+Math.max(0,danger)*54)*scale),sy=h*.48+Math.sin(t*2)*12;
        ctx.drawImage(images.islands,768,512,768,512,sx-140*scale,sy-70*scale,280*scale,187*scale);
      }
      particles=particles.filter(particle=>particle.life>0);
      for(const particle of particles){particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.vy+=310*dt;particle.life-=dt*1.9;const q=project(particle.x,particle.y);ctx.globalAlpha=Math.max(0,particle.life);star(q.x,q.y,particle.r*scale,particle.color);}ctx.globalAlpha=1;
      ctx.restore();
      if(danger<2){const gradient=ctx.createLinearGradient(0,0,w*.4,0);gradient.addColorStop(0,'#45347c80');gradient.addColorStop(1,'#45347c00');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);}
      if(!reduced&&pose.phase==='air'){
        ctx.strokeStyle=pose.boost?'#fff9db9c':'#ffffff70';ctx.lineWidth=pose.boost?3:1.5;
        for(let i=0;i<12;i++){const y=(i*97+t*81)%h;const x=(i*197+t*730)%w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-(pose.boost?95:42),y+4);ctx.stroke();}
      }
      // Expose rendering state on the canvas for accessibility/debugging and smoke verification.
      canvas.dataset.motion=pose.phase;canvas.dataset.pose=actorPose;canvas.dataset.zone=zone;
    }
    return {ready,draw,jump,reset,finish,setReduced,isReduced:()=>reduced,setBest:value=>{best=value;},setPeers:value=>{peers=value||[];},zones:ZONES};
  }
  root.CloudTowerScene={create};
})(globalThis);
