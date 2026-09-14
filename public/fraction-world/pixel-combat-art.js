(function(){
 'use strict';
 const atlas={magic:new Image(),martial:new Image(),guardian:new Image(),bow:new Image()},cache=new Map();
 for(const [key,img] of Object.entries(atlas))img.src='./assets/pixel-'+key+'-v8.png';
 const rows={wand:['magic',0],orb:['magic',1],needle:['magic',2],comet:['magic',3],bow:['martial',0],fan:['martial',1],blades:['martial',2],spear:['martial',3],hammer:['guardian',0],scythe:['guardian',1],shield:['guardian',2],book:['guardian',3]};
 // Generated cels have unequal gutters. Explicit source regions prevent neighbor bleed.
 const regions={magic:[[0,344,[0,232,589,925,1254]],[344,677,[0,253,595,940,1254]],[677,896,[0,278,610,944,1254]],[896,1254,[0,237,564,920,1254]]],martial:[[0,288,[0,223,526,919,1254]],[288,627,[0,238,540,902,1254]],[627,953,[0,219,529,931,1254]],[953,1254,[0,243,542,931,1254]]],guardian:[[0,313,[0,273,599,962,1254]],[313,627,[0,267,600,932,1254]],[627,927,[0,277,599,936,1254]],[927,1254,[0,278,612,936,1254]]]};
 function cel(key,row,frame){const id=key+row+frame;if(cache.has(id))return cache.get(id);const img=atlas[key];if(!img.complete||!img.naturalWidth)return null;const c=document.createElement('canvas');c.width=96;c.height=key==='bow'?112:96;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
  if(key==='bow'){const w=img.naturalWidth/4;x.drawImage(img,frame*w,0,w,img.naturalHeight,0,0,96,112);}
  else{const [top,bottom,cuts]=regions[key][row],left=cuts[frame],w=cuts[frame+1]-left,h=bottom-top;
   // Center the isolated art without resizing each phase to the same size.
   const sample=document.createElement('canvas');sample.width=w;sample.height=h;const sc=sample.getContext('2d',{willReadFrequently:true});sc.drawImage(img,left,top,w,h,0,0,w,h);const rgba=sc.getImageData(0,0,w,h).data;let x0=w,y0=h,x1=0,y1=0;for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(rgba[(j*w+i)*4+3]>80){x0=Math.min(x0,i);x1=Math.max(x1,i);y0=Math.min(y0,j);y1=Math.max(y1,j);}const scale=96/400,sw=x1-x0+1,sh=y1-y0+1;x.drawImage(sample,x0,y0,sw,sh,(96-sw*scale)/2,(96-sh*scale)/2,sw*scale,sh*scale);
  }cache.set(id,c);return c;}
 function draw(c,key,row,frame,x,y,w,h){const img=cel(key,row,frame);if(!img)return false;c.save();c.imageSmoothingEnabled=false;c.drawImage(img,Math.round(x),Math.round(y),Math.round(w),Math.round(h));c.restore();return true;}
 function stamp(c,weapon,frame,x,y,size){const [key,row]=rows[weapon]||rows.wand;return draw(c,key,row,frame,x-size/2,y-size/2,size,size);}
 function shaft(c,weapon,frame,x,y,angle,length,width){c.save();c.translate(x,y);c.rotate(angle);const [key,row]=rows[weapon];const ok=draw(c,key,row,frame,0,-width/2,length,width);c.restore();return ok;}
 function bow(c,p,angle,attack,untilShot,interval){const ready=Math.min(.28,interval*.55),pull=Math.max(0,1-(untilShot??interval)/ready),frame=attack>0?3:pull>.5?2:pull>0?1:0;const origin=FWCombat.bowOrigin(p,angle);c.save();c.translate(origin.x-Math.cos(angle)*6,origin.y-Math.sin(angle)*6);c.rotate(angle);const ok=draw(c,'bow',0,frame,-62*[.52,.54,.54,.25][frame],-34,62,74);if(!ok){c.strokeStyle='#deb477';c.lineWidth=3;c.beginPath();c.moveTo(-8,-25);c.lineTo(5,-15);c.lineTo(9,0);c.lineTo(5,15);c.lineTo(-8,25);c.stroke();c.strokeStyle='#e8e3c1';c.lineWidth=1;c.beginPath();c.moveTo(-8,-25);c.lineTo(-8-pull*12,0);c.lineTo(-8,25);c.stroke();}c.fillStyle='#f4caa0';c.fillRect(0,-3,5,6);c.restore();}
 function arrow(c,b){const a=Math.atan2(b.vy,b.vx);c.save();c.translate(Math.round(b.x),Math.round(b.y));c.rotate(a);c.fillStyle='#63513b';c.fillRect(-20,-2,30,4);c.fillStyle='#e9ca87';c.fillRect(-20,-1,29,2);c.fillStyle='#f4f9e2';c.fillRect(7,-4,4,8);c.fillRect(11,-2,4,4);c.fillRect(15,-1,2,2);c.fillStyle='#80d8bf';c.fillRect(-22,-5,5,3);c.fillRect(-18,-3,4,2);c.fillRect(-22,2,5,3);c.restore();}
 function moon(c,b,time){c.save();c.translate(Math.round(b.x),Math.round(b.y));c.rotate(time*9);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const outer=Math.hypot(x-7.5,y-7.5),cut=Math.hypot(x-11,y-5);if(outer<7.5&&cut>6.5){c.fillStyle=outer>6.2||cut<7.6?'#8655c0':'#edd4ff';c.fillRect((x-8)*2,(y-8)*2,2,2);}}c.restore();}
 function effect(c,f){if(['ghost','death'].includes(f.kind))return false;const t=Math.max(0,Math.min(.999,1-f.life/f.max)),frame=Math.min(3,Math.floor(t*4)),weapon=f.weapon||({frost:'orb','star-wave':'wand',chain:'needle','meteor-mark':'comet',summon:'book'}[f.kind])||'wand';c.save();c.globalAlpha=Math.min(.9,f.life*7);
  if(f.kind==='chain'){for(let i=1;i<f.nodes.length;i++){const a=f.nodes[i-1],b=f.nodes[i];shaft(c,'needle',frame,a.x,a.y,Math.atan2(b.y-a.y,b.x-a.x),Math.hypot(b.x-a.x,b.y-a.y),36);}if(f.nodes.length===1)stamp(c,'needle',frame,f.x,f.y,85);}
  else if(f.kind==='beam'){shaft(c,weapon==='bow'?'bow':'spear',frame,f.x,f.y,f.angle||0,f.radius||580,weapon==='bow'?100:110);}
  else if(f.kind==='meteor-mark'){c.strokeStyle='#ffc18a';c.lineWidth=2;c.strokeRect(f.x-f.radius*.6,f.y-f.radius*.6,f.radius*1.2,f.radius*1.2);stamp(c,'comet',frame,f.x-90*(1-t),f.y-160*(1-t),f.radius*1.5);}
  else {const r=f.radius||160;stamp(c,weapon,frame,f.x,f.y,Math.max(60,r*2));}
  c.restore();return true;
 }
 function zone(c,z,time){c.save();c.globalAlpha=.24;stamp(c,z.chill?'orb':(z.weapon||'hammer'),Math.floor(time*4)%4,z.x,z.y,z.r*2);c.restore();}
 function spirit(c,x,y,big){const pixels=['..aa..','.abba.','abccba','abccba','.abba.','..aa..'],palette={a:'#997aca',b:'#d9c0ff',c:'#fff4ce'},u=big?4:3;c.save();for(let j=0;j<6;j++)for(let i=0;i<6;i++)if(palette[pixels[j][i]]){c.fillStyle=palette[pixels[j][i]];c.fillRect(Math.round(x+(i-3)*u),Math.round(y+(j-3)*u),u,u);}c.fillStyle='#25334a';c.fillRect(x-u,y-u,u,u);c.fillRect(x+u,y-u,u,u);c.restore();}
 function preview(){return '<canvas id="skill-pixel-preview" class="skill-pixel-preview" width="96" height="96" aria-hidden="true"></canvas>';}
 function paintPreview(canvas,weapon){const [key,row]=rows[weapon]||rows.wand;const paint=()=>{if(!canvas.isConnected)return;const c=canvas.getContext('2d');c.clearRect(0,0,96,96);draw(c,key,row,2,0,0,96,96);};if(atlas[key].complete)paint();else atlas[key].addEventListener('load',paint,{once:true});}
 window.FWPixelArt={preview,paintPreview,moon,bow,arrow,effect,stamp,zone,spirit};
})();
