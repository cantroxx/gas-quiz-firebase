(function(root){
  'use strict';
  const clamp = n => Math.max(0,Math.min(1,n));
  const mix = (a,b,t) => a+(b-a)*t;
  function point(floor){return {x:floor*350,y:-floor*46+Math.sin(floor*1.7)*24};}
  function create(){return {floor:0,queue:[],flight:null,landedAt:-10000,lastAt:0};}
  function enqueue(s,floor,boost){s.queue.push({floor,boost});}
  function step(s,now,reduced=false){
    // Visual choreography only: never changes challenge score or timing.
    if(reduced){if(s.queue.length)s.floor=s.queue[s.queue.length-1].floor;else if(s.flight)s.floor=s.flight.to;s.queue=[];s.flight=null;}
    for(let guard=0;guard<100;guard++){
      if(!s.flight&&s.queue.length){const next=s.queue.shift();s.flight={from:s.floor,to:next.floor,boost:next.boost,start:Math.max(s.lastAt,s.landedAt+100),duration:next.boost?1450:1130};}
      if(!s.flight||now<s.flight.start+s.flight.duration)break;
      s.floor=s.flight.to;s.landedAt=s.flight.start+s.flight.duration;s.flight=null;s.lastAt=s.landedAt;
    }
    s.lastAt=now;
    const flight=s.flight;
    let p=point(s.floor),pose=0,rotation=0,sx=1,sy=1,lift=0,boost=false,phase='idle',progress=0;
    if(flight){
      progress=clamp((now-flight.start)/flight.duration);const a=point(flight.from),b=point(flight.to);boost=flight.boost;
      if(progress<.17){const t=progress/.17;phase='run';p={x:a.x+mix(-12,54,t),y:a.y};pose=1+Math.floor(t*6)%2;}
      else if(progress<.25){const t=(progress-.17)/.08;phase='crouch';p={x:a.x+54,y:a.y};pose=3;sx=1+t*.08;sy=1-t*.08;}
      else if(progress<.86){
        const t=(progress-.25)/.61;phase='air';p={x:mix(a.x+54,b.x,t),y:mix(a.y,b.y,t)};
        lift=4*t*(1-t)*(boost?250:180);p.y-=lift;pose=t<.28?4:5;
        if(boost){const spin=clamp((t-.2)/.6);rotation=spin*Math.PI*2;}
        sx=1.02;sy=1.02;
      }else{const t=(progress-.86)/.14;phase='land';p=b;pose=6;sx=1+.15*Math.sin(t*Math.PI);sy=1-.17*Math.sin(t*Math.PI);}
    }else if(now-s.landedAt<200){phase='recover';pose=6;}
    return {...p,pose,rotation,sx,sy,lift,boost,phase,progress,floor:s.floor,target:flight?.to??s.floor,landedAt:s.landedAt};
  }
  const api={point,create,enqueue,step};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.CloudTowerMotion=api;
})(globalThis);
