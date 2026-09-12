(function(){
 'use strict';
 const sheets={};
 function sprite(c,file,cols,rows,index,x,y,w,h){let img=sheets[file];if(!img){img=new Image();img.src='./assets/'+file+'.png';sheets[file]=img;}if(!img.complete||!img.naturalWidth)return false;const sw=img.naturalWidth/cols,sh=img.naturalHeight/rows;c.drawImage(img,index%cols*sw,Math.floor(index/cols)*sh,sw,sh,x,y,w,h);return true;}
 function star(c,x,y,r,color,points=5,rotation=0){c.fillStyle=color;c.beginPath();for(let i=0;i<points*2;i++){const a=i*Math.PI/points+rotation,rad=i%2?r*.42:r;const px=x+Math.cos(a)*rad,py=y+Math.sin(a)*rad;i?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();c.fill();}
 function line(c,points,color,width){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}
 function player(c,p,weapon,time,attack,moving){c.save();c.translate(p.x,p.y);const facing=p.facing??0;if(Math.cos(facing)<0)c.scale(-1,1);const frame=p.burst>0?6:attack>0?5:moving?Math.floor(time*10)%4:4;const bob=moving?Math.sin(time*20)*1.5:Math.sin(time*3)*.7;const ok=sprite(c,'hero-motion-v2',4,2,frame,-30,-49+bob,60,80);c.restore();
  if(!ok)return false;
  const i=['wand','bow','fan','orb','needle','comet'].indexOf(weapon),a=facing;const recoil=attack>0?Math.sin(attack/.16*Math.PI)*5:0;
  c.save();c.translate(p.x+Math.cos(a)*(19-recoil),p.y+Math.sin(a)*(19-recoil)-7);c.rotate(weapon==='orb'?time*.7:a+Math.PI/4+(weapon==='fan'?Math.max(0,attack)*5:0));sprite(c,'weapons-v2',3,2,i,-22,-22,44,44);c.restore();
  if(attack>.06){c.save();c.globalAlpha=attack/.16;star(c,p.x+Math.cos(a)*37,p.y+Math.sin(a)*37-7,weapon==='comet'?16:9,FWCombat.kits[weapon].color,4,time);c.restore();}return true;
 }
 function boss(c,e,biome,time){c.save();c.translate(e.x,e.y);const pulse=e.tele>0?1+Math.sin(time*18)*.035:1;c.scale(pulse,pulse);if(e.flash>0){c.shadowColor='#fff';c.shadowBlur=16;}else if(e.tele>0){c.shadowColor='#ff375f';c.shadowBlur=18;}const ok=sprite(c,'boss-combat-v2',2,2,biome,-62,-80+Math.sin(time*3)*3,124,124);c.restore();return ok;}
 function bullet(c,b,time,defaultStyle){const style=b.style||defaultStyle,a=Math.atan2(b.vy,b.vx),color=FWCombat.kits[style]?.color||'#fff';c.save();c.translate(b.x,b.y);c.rotate(a);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=2;
  if(style==='bow'){line(c,[{x:-27,y:0},{x:10,y:0}],color,3);c.beginPath();c.moveTo(12,0);c.lineTo(3,-5);c.lineTo(3,5);c.fill();line(c,[{x:-19,y:-5},{x:-13,y:0},{x:-19,y:5}],color,2);}
  else if(style==='fan'){c.rotate(time*15);c.beginPath();c.arc(0,0,12,.2,Math.PI*1.55);c.arc(3,-2,9,Math.PI*1.55,.2,true);c.fill();}
  else if(style==='orb'){c.rotate(time*3);star(c,0,0,11,color,4);c.beginPath();c.arc(0,0,14,0,Math.PI*2);c.stroke();}
  else if(style==='needle'){line(c,[{x:-30,y:2},{x:-15,y:-3},{x:-7,y:3},{x:10,y:0}],color,2.5);}
  else if(style==='comet'){const g=c.createLinearGradient(-32,0,8,0);g.addColorStop(0,'#ff774400');g.addColorStop(1,'#ffdba9');c.fillStyle=g;c.beginPath();c.moveTo(-36,0);c.lineTo(0,-7);c.lineTo(10,0);c.lineTo(0,7);c.fill();star(c,0,0,9,'#fff4d1',6,time);}
  else {line(c,[{x:-20,y:0},{x:0,y:0}],color,2);star(c,0,0,8,color,5,time*4);}c.restore();
 }
 function effect(c,f){const t=1-f.life/f.max;c.save();c.globalAlpha=Math.min(1,f.life*5);const color=f.color||'#fff';
  if(f.kind==='beam'){line(c,[{x:f.x,y:f.y},{x:f.x+Math.cos(f.angle)*580,y:f.y+Math.sin(f.angle)*580}],color,Math.max(2,36*(1-t)));line(c,[{x:f.x,y:f.y},{x:f.x+Math.cos(f.angle)*580,y:f.y+Math.sin(f.angle)*580}],'#fff',Math.max(1,8*(1-t)));}
  else if(f.kind==='chain'){f.nodes.forEach((node,i)=>{if(!i)return;const prev=f.nodes[i-1],points=[prev];for(let n=1;n<6;n++)points.push({x:prev.x+(node.x-prev.x)*n/6+Math.sin(n*9+t*16)*9,y:prev.y+(node.y-prev.y)*n/6+Math.cos(n*7+t*19)*9});points.push(node);line(c,points,color,5);line(c,points,'#fff',2);});}
  else if(f.kind==='ghost'){c.globalAlpha=f.life/f.max*.45;sprite(c,'hero-motion-v2',4,2,6,f.x-30,f.y-49,60,80);}
  else if(f.kind==='death'){c.globalAlpha=1-t;star(c,f.x,f.y,6+t*28,color,8,t);}
  else {const r=(f.radius||200)*(['meteor-mark','nova'].includes(f.kind)?1:.15+t*.85);c.strokeStyle=color;c.lineWidth=f.kind==='meteor-mark'?3:Math.max(1,7*(1-t));c.beginPath();c.arc(f.x,f.y,r,0,Math.PI*2);c.stroke();if(f.kind==='meteor-mark'){line(c,[{x:f.x-r*.6,y:f.y},{x:f.x+r*.6,y:f.y}],color,2);line(c,[{x:f.x,y:f.y-r*.6},{x:f.x,y:f.y+r*.6}],color,2);star(c,f.x-150*(1-t),f.y-320*(1-t),12+t*14,'#ffe3ba',6,t);}
   else{for(let i=0;i<12;i++){const a=i*Math.PI/6+t;star(c,f.x+Math.cos(a)*r,f.y+Math.sin(a)*r,f.kind==='frost'?9:5,color,f.kind==='frost'?4:5,a);}c.globalAlpha*=.12;c.fillStyle=color;c.beginPath();c.arc(f.x,f.y,r,0,Math.PI*2);c.fill();}}
  c.restore();
 }
 window.FWCombatArt={sprite,player,boss,bullet,effect};
})();
