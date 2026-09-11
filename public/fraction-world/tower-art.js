/* Canvas-native original creatures and environments. No downloaded game artwork. */
(function () {
  'use strict';
  function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
  function polygon(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
  function eyes(c,y=0,space=7,color='#182537'){ellipse(c,-space,y,2.6,4,color);ellipse(c,space,y,2.6,4,color);ellipse(c,-space-.7,y-1, .8,1,'#ffffff');ellipse(c,space-.7,y-1,.8,1,'#ffffff');}
  function floor(c,b,biome,time,obstacles){
    c.fillStyle=b.floor;c.fillRect(0,0,960,600);
    const wash=c.createRadialGradient(480,280,40,480,300,550);wash.addColorStop(0,b.color+'0c');wash.addColorStop(1,'#050a1877');c.fillStyle=wash;c.fillRect(0,0,960,600);
    for(let row=0;row<12;row++)for(let col=0;col<19;col++){
      const x=26+col*48,y=27+row*48,v=(col*31+row*13)%17;
      c.fillStyle=v<4?'#ffffff04':'#00000004';c.fillRect(x+2,y+2,44,44);c.strokeStyle='#ffffff05';c.lineWidth=1;c.strokeRect(x,y,48,48);
      if(v===2){c.strokeStyle=b.color+'13';c.beginPath();c.moveTo(x+6,y+35);c.lineTo(x+20,y+29);c.lineTo(x+17,y+19);c.lineTo(x+30,y+11);c.stroke();}
    }
    c.strokeStyle=b.color+'36';c.lineWidth=3;c.strokeRect(25,25,910,550);c.strokeStyle='#00000035';c.lineWidth=16;c.strokeRect(12,12,936,576);
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
    for(const w of obstacles){
      c.fillStyle='#060e2266';c.fillRect(w.x+5,w.y+12,w.w,w.h);
      c.fillStyle=['#2d514c','#604655','#354665','#47385d'][biome];c.fillRect(w.x,w.y,w.w,w.h);
      c.fillStyle=['#557569','#927267','#647d9b','#765d91'][biome];c.fillRect(w.x-3,w.y-7,w.w+6,15);
      c.fillStyle=b.color+'45';c.fillRect(w.x+7,w.y-3,w.w-14,4);
      c.strokeStyle='#0b172944';c.lineWidth=2;c.strokeRect(w.x+7,w.y+20,w.w-14,w.h-30);
      polygon(c,[[w.x+w.w/2,w.y+21],[w.x+w.w/2+5,w.y+30],[w.x+w.w/2,w.y+39],[w.x+w.w/2-5,w.y+30]],b.color+'66');
    }
  }
  function enemy(c,e,biome,time){
    c.save();c.translate(e.x,e.y);ellipse(c,0,e.r+4,e.r+5,7,'#0004');const bob=Math.sin(time*4+e.x)*1.6;c.translate(0,bob);
    if(e.flash>0)c.globalAlpha=.65;
    if(e.type==='boss'){
      if(biome===0){
        c.strokeStyle='#8bac80';c.lineWidth=9;c.lineCap='round';for(const sign of [-1,1]){c.beginPath();c.moveTo(sign*23,4);c.lineTo(sign*44,-20);c.lineTo(sign*43,-48);c.stroke();c.lineWidth=5;c.beginPath();c.moveTo(sign*42,-23);c.lineTo(sign*60,-35);c.stroke();c.lineWidth=9;}
        polygon(c,[[-27,-22],[-32,30],[-43,40],[-15,35],[0,43],[18,35],[40,40],[29,20],[24,-25]],'#9baa79');
        ellipse(c,0,-28,33,22,'#53755b');ellipse(c,-20,-37,22,17,'#7caa7b');ellipse(c,17,-39,25,18,'#88b87d');ellipse(c,0,-51,22,15,'#a2ca8b');eyes(c,0,11,'#263b38');
        polygon(c,[[0,7],[9,18],[0,29],[-9,18]],'#bdffe0');c.strokeStyle='#456753';c.lineWidth=3;c.beginPath();c.moveTo(-16,17);c.lineTo(-20,30);c.moveTo(18,12);c.lineTo(20,29);c.stroke();
      }else if(biome===1){
        polygon(c,[[-21,-13],[-40,36],[0,47],[40,36],[20,-13]],'#bc87bb');polygon(c,[[-6,-12],[-16,37],[0,43],[16,37],[6,-12]],'#e1b1cb');ellipse(c,0,-16,23,22,'#f1ceb5');eyes(c,-16,8);
        polygon(c,[[-42,-29],[43,-29],[17,-46],[4,-80],[-13,-48]],'#9679bf');polygon(c,[[-13,-48],[17,-46],[21,-37],[-22,-37]],'#efd0a1');ellipse(c,4,-62,4,4,'#fff0c4');
        c.strokeStyle='#e3c590';c.lineWidth=4;c.beginPath();c.moveTo(43,32);c.lineTo(43,-26);c.stroke();polygon(c,[[34,-42],[52,-42],[45,-32],[52,-22],[34,-22],[41,-32]],'#ffd69d');
      }else if(biome===2){
        polygon(c,[[-25,-17],[-35,27],[-21,33],[-23,48],[-8,48],[0,30],[10,48],[26,48],[23,28],[36,22],[25,-17]],'#6996c6');polygon(c,[[-18,-5],[0,7],[18,-5],[14,22],[0,29],[-15,22]],'#acd0ec');
        ellipse(c,0,-27,25,24,'#9cbedc');c.fillStyle='#253751';c.fillRect(-18,-32,36,12);c.fillStyle='#c2f5ff';c.fillRect(-13,-28,10,3);c.fillRect(5,-28,10,3);
        polygon(c,[[1,-48],[-6,-65],[6,-75],[13,-58],[8,-46]],'#9ccfff');polygon(c,[[-43,-2],[-24,4],[-26,31],[-41,40],[-52,27],[-55,7]],'#476e9e');polygon(c,[[40,-42],[47,-32],[43,24],[36,24],[34,-31]],'#d6f5ff');c.fillStyle='#dfba92';c.fillRect(28,19,24,5);
      }else{
        for(let i=0;i<6;i++){const a=i*Math.PI/3+time*.3,x=Math.cos(a)*52,y=Math.sin(a)*45;polygon(c,[[x,y-12],[x+7,y],[x,y+12],[x-7,y]],i%2?'#c399ee':'#8d75be');}
        polygon(c,[[-25,-8],[-61,-31],[-47,12],[-29,23]],'#9877ba');polygon(c,[[25,-8],[61,-31],[47,12],[29,23]],'#9877ba');
        polygon(c,[[0,-42],[31,-22],[34,19],[0,45],[-34,19],[-31,-22]],'#b699d9');polygon(c,[[0,-31],[20,-15],[20,14],[0,31],[-20,14],[-20,-15]],'#312344');polygon(c,[[0,-22],[12,-5],[0,20],[-12,-5]],'#f5c8ff');
        c.strokeStyle='#ead0ff';c.lineWidth=2;c.beginPath();c.moveTo(-22,-25);c.lineTo(-7,-12);c.lineTo(-20,5);c.moveTo(24,11);c.lineTo(8,22);c.stroke();
      }
    }else if(e.type==='chaser'){
      ellipse(c,0,4,e.r,e.r*.8,'#aa9cd0');ellipse(c,-3,-2,e.r*.75,e.r*.75,'#c5b5e7');eyes(c,2,5);polygon(c,[[-3,-12],[-12,-22],[0,-18],[9,-24],[7,-12]],'#8a9c9b');
    }else if(e.type==='shooter'){
      polygon(c,[[-17,11],[-13,-9],[0,-22],[14,-8],[18,11],[0,20]],'#d5a980');polygon(c,[[0,-17],[9,-5],[0,11],[-9,-5]],'#ffe0a9');ellipse(c,0,-2,3,5,'#4c3b54');c.fillStyle='#987c84';c.fillRect(-19,13,38,6);
    }else if(e.type==='charger'){
      ellipse(c,0,4,19,14,'#84596c');ellipse(c,0,-2,16,17,'#de93a3');c.strokeStyle='#a2627c';c.lineWidth=3;c.beginPath();c.moveTo(0,-17);c.lineTo(0,11);c.stroke();polygon(c,[[-12,-9],[-19,-23],[-5,-13]],'#e5c9a1');polygon(c,[[12,-9],[19,-23],[5,-13]],'#e5c9a1');eyes(c,-3,7);
    }else if(e.type==='splitter'){
      ellipse(c,-9,4,10,12,'#79bda4');ellipse(c,9,4,10,12,'#79bda4');ellipse(c,0,-3,14,14,'#a4dcc0');eyes(c,0,6);ellipse(c,-6,-10,4,2,'#e2ffed');
    }else if(e.type==='orbiter'){
      polygon(c,[[-10,-2],[-31,-10],[-25,7],[-11,11]],'#8da1d9');polygon(c,[[10,-2],[31,-10],[25,7],[11,11]],'#8da1d9');ellipse(c,0,0,16,17,'#a5bced');ellipse(c,0,0,9,10,'#e6efff');ellipse(c,2,0,4,6,'#465885');
    }else{
      c.strokeStyle='#83bc92';c.lineWidth=5;c.beginPath();c.moveTo(0,0);c.lineTo(0,17);c.stroke();for(let i=0;i<5;i++)ellipse(c,Math.cos(i*1.256)*11,Math.sin(i*1.256)*11,9,9,'#c9df95');ellipse(c,0,0,10,10,'#fbebbb');eyes(c,0,4);
    }
    if(e.slow>0){c.strokeStyle='#a8e5ff77';c.lineWidth=2;c.beginPath();c.arc(0,0,e.r+5,0,Math.PI*2);c.stroke();}
    c.restore();
    if(e.hp<e.maxHp&&e.type!=='boss'){c.fillStyle='#0006';c.fillRect(e.x-e.r,e.y-e.r-18,e.r*2,4);c.fillStyle='#ffb7c7';c.fillRect(e.x-e.r,e.y-e.r-18,e.r*2*Math.max(0,e.hp/e.maxHp),4);}
  }
  window.FWTowerArt={floor,enemy};
})();
