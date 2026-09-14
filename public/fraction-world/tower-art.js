/* Canvas-native original creatures and environments. No downloaded game artwork. */
(function () {
  'use strict';
  const floors={};
  function floorImage(biome){if(!floors[biome]){const img=new Image();img.src='./assets/'+['ruins','desert','castle','void'][biome]+'-v1.jpg';floors[biome]=img;}return floors[biome];}
  let actorSheet;
  function actor(c,index,x,y,w,h){if(!actorSheet){actorSheet=new Image();actorSheet.src='./assets/actors-v1.png';}if(!actorSheet.complete||!actorSheet.naturalWidth)return false;const sw=actorSheet.naturalWidth/4,sh=actorSheet.naturalHeight/2;c.drawImage(actorSheet,index%4*sw,Math.floor(index/4)*sh,sw,sh,x,y,w,h);return true;}
  function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
  function polygon(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
  function eyes(c,y=0,space=7,color='#182537'){ellipse(c,-space,y,2.6,4,color);ellipse(c,space,y,2.6,4,color);ellipse(c,-space-.7,y-1, .8,1,'#ffffff');ellipse(c,space-.7,y-1,.8,1,'#ffffff');}
  function floor(c,b,biome,time,obstacles){
    c.fillStyle=b.floor;c.fillRect(0,0,960,600);
    const painting=floorImage(biome);if(painting.complete&&painting.naturalWidth){c.drawImage(painting,0,0,960,600);c.fillStyle='#07122230';c.fillRect(0,0,960,600);}else{
    const wash=c.createRadialGradient(480,280,40,480,300,550);wash.addColorStop(0,b.color+'0c');wash.addColorStop(1,'#050a1877');c.fillStyle=wash;c.fillRect(0,0,960,600);
    for(let row=0;row<12;row++)for(let col=0;col<19;col++){
      const x=26+col*48,y=27+row*48,v=(col*31+row*13)%17;
      c.fillStyle=v<4?'#ffffff04':'#00000004';c.fillRect(x+2,y+2,44,44);c.strokeStyle='#ffffff05';c.lineWidth=1;c.strokeRect(x,y,48,48);
      if(v===2){c.strokeStyle=b.color+'13';c.beginPath();c.moveTo(x+6,y+35);c.lineTo(x+20,y+29);c.lineTo(x+17,y+19);c.lineTo(x+30,y+11);c.stroke();}
    }
    c.strokeStyle=b.color+'36';c.lineWidth=3;c.strokeRect(25,25,910,550);c.strokeStyle='#00000035';c.lineWidth=16;c.strokeRect(12,12,936,576);
    for(let i=0;i<24;i++){const x=35+(i*137)%890,y=35+(i*83+time*(5+i%4))%530;ellipse(c,x,y,1+(i%2),1+(i%2),b.color+'55');}
    // Inlaid central compass, kept quiet underneath combat silhouettes.
    c.save();c.translate(480,300);c.strokeStyle=b.color+'15';c.lineWidth=2;c.beginPath();c.arc(0,0,100,0,Math.PI*2);c.stroke();polygon(c,[[0,-88],[12,-12],[88,0],[12,12],[0,88],[-12,12],[-88,0],[-12,-12]],b.color+'0b');c.restore();
    for(const [x,y] of [[48,48],[912,48],[48,552],[912,552]]){
      ellipse(c,x,y,24,10,'#0003');c.fillStyle='#243141';c.fillRect(x-9,y-12,18,20);c.fillStyle=b.color+'88';c.fillRect(x-12,y-15,24,5);
      const glow=c.createRadialGradient(x,y-22,0,x,y-22,35);glow.addColorStop(0,b.color+'55');glow.addColorStop(1,b.color+'00');c.fillStyle=glow;c.fillRect(x-35,y-57,70,70);
      polygon(c,[[x,y-38-Math.sin(time*4+x)*3],[x+8,y-22],[x,y-15],[x-7,y-22]],b.color);
    }
    // Deterministic scenery avoids frame-to-frame flicker.
    for(let i=0;i<18;i++){
      const x=55+(i*157)%850,y=i%2?552:45;
      if(biome===0){c.strokeStyle='#72b69855';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-9,y-14,x-3,y-24);c.stroke();ellipse(c,x-6,y-13,6,3,'#75b59044');}
      if(biome===1)polygon(c,[[x,y-18],[x+7,y-5],[x,y+4],[x-5,y-5]],'#e6bc7740');
      if(biome===2){c.fillStyle='#7296cb33';c.fillRect(x-5,y-8,12,9);c.fillStyle='#a0cfff55';c.fillRect(x-3,y-11,8,3);}
      if(biome===3){const a=time*.6+i;ellipse(c,x+Math.sin(a)*4,y+Math.cos(a)*4,2,2,'#d0a1ff77');}
    }
    }
    for(const w of obstacles){
      c.fillStyle='#060e2266';c.fillRect(w.x+5,w.y+12,w.w,w.h);
      c.fillStyle=['#2d514c','#604655','#354665','#47385d'][biome];c.fillRect(w.x,w.y,w.w,w.h);
      c.fillStyle=['#557569','#927267','#647d9b','#765d91'][biome];c.fillRect(w.x-3,w.y-7,w.w+6,15);
      c.fillStyle=b.color+'45';c.fillRect(w.x+7,w.y-3,w.w-14,4);
      c.strokeStyle='#0b172944';c.lineWidth=2;c.strokeRect(w.x+7,w.y+20,w.w-14,w.h-30);
      polygon(c,[[w.x+w.w/2,w.y+21],[w.x+w.w/2+5,w.y+30],[w.x+w.w/2,w.y+39],[w.x+w.w/2-5,w.y+30]],b.color+'66');
    }
  }
  function enemy(c,e,biome,time){FWCombatArt.monster(c,e,biome,time);if(e.slow>0){c.save();c.strokeStyle='#a8e5ff77';c.lineWidth=2;c.beginPath();c.arc(e.x,e.y,e.r+5,0,Math.PI*2);c.stroke();c.restore();}}
  window.FWTowerArt={floor,enemy,actor};
})();
