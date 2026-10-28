'use strict';
// Code-native, accessible teaching diagrams. No image URLs, HTML, answer flags,
// or arbitrary SVG attributes are sent to the browser.
function scene(type,title,height=300){return {kind:'evidence',type,title,width:300,height,marks:[],description:'',note:'학습용 모식도 · 실제 크기와 비율은 다를 수 있어요.'};}
function mark(s,tag,attrs,text){s.marks.push({tag,attrs,...(text===undefined?{}:{text:String(text)})});}
function text(s,x,y,t,size=14,anchor='middle'){mark(s,'text',{x,y,'font-size':Math.max(15,size),'text-anchor':anchor,fill:'#203f36'},t);}
function line(s,x1,y1,x2,y2,color='#476f61',width=2){mark(s,'line',{x1,y1,x2,y2,stroke:color,'stroke-width':width});}
function rect(s,x,y,width,height,fill='#e9f0da'){mark(s,'rect',{x,y,width,height,rx:5,fill,stroke:'#557565','stroke-width':1.5});}
function circle(s,cx,cy,r,fill='#e8b45c'){mark(s,'circle',{cx,cy,r,fill,stroke:'#557565','stroke-width':1.5});}
function arrow(s,x1,y1,x2,y2,color='#476f61'){line(s,x1,y1,x2,y2,color);const a=Math.atan2(y2-y1,x2-x1),r=7;mark(s,'polygon',{points:[[x2,y2],[x2-r*Math.cos(a-.5),y2-r*Math.sin(a-.5)],[x2-r*Math.cos(a+.5),y2-r*Math.sin(a+.5)]].map(p=>p.join(',')).join(' '),fill:color});}
function label(s,x,y,rows){rows.forEach((v,i)=>text(s,x,y+i*19,v));}
function wrap(value,width){const out=[];let row='';for(const word of String(value).split(/\s+/)){if(row&&(row.length+1+word.length)>width){out.push(row);row='';}let tail=word;while(tail.length>width){out.push(tail.slice(0,width));tail=tail.slice(width);}row+=(row?' ':'')+tail;}if(row)out.push(row);return out.length?out:[''];}
function flow(title,rows,description,type='flow'){
 rows=rows.map(row=>[].concat(row).flatMap(t=>wrap(t,17)));
 const heights=rows.map(row=>Math.max(68,([].concat(row).length)*19+24)),height=heights.reduce((a,b)=>a+b+28,10),s=scene(type,title,height);let y=8;
 rows.forEach((row,i)=>{const h=heights[i];rect(s,18,y,264,h);label(s,150,y+24,Array.isArray(row)?row:[row]);if(i<rows.length-1)arrow(s,150,y+h+3,150,y+h+24);y+=h+28;});s.description=description;s.note='화살표는 이 자료에서 표시한 이동·진행 방향입니다.';return s;
}

function map(title,places,roads,scale=100){
 const s=scene('map',title,330);for(let i=0;i<5;i++){line(s,30+i*60,45,30+i*60,285,'#d2dfd6',1);line(s,30,45+i*60,270,45+i*60,'#d2dfd6',1);}
 roads.forEach(([a,b,closed])=>{const A=places[a],B=places[b];line(s,30+A[1]*60,45+A[2]*60,30+B[1]*60,45+B[2]*60,closed?'#b8503d':'#48866f',5);if(closed)text(s,30+(A[1]+B[1])*30,35+(A[2]+B[2])*30,'통행 금지',12);});
 places.forEach(([name,x,y])=>{circle(s,30+x*60,45+y*60,5);text(s,Math.max(32,Math.min(265,30+x*60)),64+y*60,name,13);});arrow(s,270,33,270,9);text(s,247,22,'북',13);line(s,32,312,92,312);text(s,178,317,`한 칸 ${scale}m`,14);
 s.description=`위가 북쪽이며 한 칸은 ${scale}m. 장소의 좌표(왼쪽부터 칸, 위부터 칸): `+places.map(p=>p.join(' ')).join('; ')+'. 길: '+roads.map(([a,b,c])=>`${places[a][0]}–${places[b][0]}${c?' 통행 금지':''}`).join('; ');s.note='가상 마을의 지도 · 표시한 선만 이동 가능한 길입니다.';return s;
}
function network(title,names,edges,legend){
 const s=scene('network',title,330),positions=names.map((_,i)=>i===0?[150,30]:i===1?[65,130]:i===2?[235,130]:i===3?[65,255]:[235,255]);
 edges.forEach(([a,b])=>{const A=positions[a],B=positions[b],dx=B[0]-A[0],dy=B[1]-A[1],d=Math.hypot(dx,dy),ux=dx/d,uy=dy/d,edge=Math.min(49/Math.abs(ux||1e-9),20/Math.abs(uy||1e-9));arrow(s,A[0]+ux*(edge+3),A[1]+uy*(edge+3),B[0]-ux*(edge+5),B[1]-uy*(edge+5));});
 names.forEach((n,i)=>{const [x,y]=positions[i];rect(s,x-49,y-20,98,40);const parts=n.match(/.{1,6}/g);parts.forEach((part,j)=>text(s,x,y+(parts.length===1?5:-3)+j*17,part,13));});s.description=edges.map(([a,b])=>`${names[a]}에서 ${names[b]}로 화살표`).join('. ')+'. '+legend;s.note=legend;return s;
}
function compare(title,rows){
 const wrapped=rows.map(([a,b])=>[...wrap(a,17),...[].concat(b).flatMap(t=>wrap(t,17))]);
 const heights=wrapped.map(r=>r.length*20+24),s=scene('comparison',title,heights.reduce((a,b)=>a+b+10,8));let y=5;
 wrapped.forEach((r,i)=>{rect(s,10,y,280,heights[i],i%2?'#f3eddd':'#e9f0da');r.forEach((t,j)=>text(s,150,y+24+j*20,t,j?14:15));y+=heights[i]+10;});s.description=rows.map(([a,b])=>a+': '+[].concat(b).join(', ')).join('. ');return s;
}
function magnets(pairs){const s=scene('magnets','자석을 마주 놓은 모습',pairs.length*88+10);pairs.forEach(([a,b],i)=>{const y=i*88+22;text(s,150,y-6,['가','나','다'][i],15);[a,b].forEach((pole,j)=>{const x=18+j*160;rect(s,x,y+5,52,32,pole==='N'?'#f1b4a0':'#b6d7e8');rect(s,x+52,y+5,52,32,pole==='N'?'#b6d7e8':'#f1b4a0');text(s,x+26,y+27,pole);text(s,x+78,y+27,pole==='N'?'S':'N');});});s.description=pairs.map(([a,b],i)=>`${['가','나','다'][i]}: 왼쪽 자석은 왼쪽부터 ${a}, ${a==='N'?'S':'N'}, 오른쪽 자석은 왼쪽부터 ${b}, ${b==='N'?'S':'N'}`).join('. ');return s;}
function syringe(){const s=scene('syringe','입구를 막은 주사기',245);[40,20].forEach((v,i)=>{const y=38+i*110;text(s,150,y-15,i?'누른 뒤':'누르기 전',15);rect(s,32,y,224,44,'#edf4fa');rect(s,32,y,v*4,44,'#b4d7eb');line(s,32+v*4,y,32+v*4,y+44,'#344f45',5);line(s,32+v*4,y+22,280,y+22,'#344f45',5);text(s,32+v*2,y+28,v+'mL');line(s,25,y+5,25,y+39,'#b8503d',6);text(s,65,y+64,'막힌 입구',13);});s.description='막힌 입구의 같은 주사기. 누르기 전 공기 부피 40mL, 누른 뒤 20mL. 피스톤과 입구로 공기가 새지 않는다.';return s;}
function river(){const s=scene('river','물이 흐르는 모래 언덕',270);mark(s,'polygon',{points:'15,80 100,105 190,208 285,208 285,250 15,250',fill:'#e7cf9f',stroke:'#8f764e'});arrow(s,30,65,115,90,'#398bb0');arrow(s,125,110,185,185,'#398bb0');arrow(s,205,194,275,194,'#398bb0');label(s,72,35,['가: 흙이 깎임']);label(s,205,90,['나: 흙이 이동']);label(s,226,230,['다: 흙이 쌓임']);s.description='물은 높은 언덕에서 낮은 평지로 흐른다. 가의 흙이 깎이고, 나에서 흙이 물과 함께 이동하며, 다의 평지에 흙이 쌓인다.';return s;}
function sky(){const s=scene('sky','같은 장소에서 본 하늘',280);rect(s,10,8,280,230,'#e5edf8');for(const [x,y,n]of [[65,80,'ㄱ'],[145,40,'ㄴ'],[230,100,'ㄷ']]){circle(s,x,y,5,'#fff8c7');text(s,x+15,y+5,n);}
 rect(s,125,192,50,46,'#c2cdc4');text(s,150,257,'관찰 기준: 건물',14);s.description='건물 위 하늘의 세 별: ㄱ은 왼쪽, ㄴ은 가운데 위쪽, ㄷ은 오른쪽. 사진처럼 보이는 밝기나 실제 별 사이 거리는 표시하지 않았다.';s.note='가상의 별 위치도 · 선으로 연결해도 실제 별들이 가까운 것은 아닙니다.';return s;}
function climate(){const s=scene('climate','가상 지역의 30년 평균기온',280),vals=[12,13,14];for(let t=11;t<=15;t++){const y=215-(t-11)*42;line(s,40,y,280,y,'#c8d5cd',1);text(s,25,y+5,t+'°',12);}vals.forEach((v,i)=>{const x=70+i*85,y=215-(v-11)*42;if(i)line(s,x-85,215-(vals[i-1]-11)*42,x,y,'#2e7152',3);circle(s,x,y,4);text(s,x,y-12,v+'℃',14);label(s,x,240,[['1961~','1990'],['1976~','2005'],['1991~','2020']][i]);});s.description='같은 가상 지역의 30년 평균기온: 1961~1990년 12도, 1976~2005년 13도, 1991~2020년 14도. 세 기간은 일부 겹친다.';s.note='학습용 가상 자료 · 기간별 평균이며 하루 기온이 아닙니다.';return s;}
module.exports={scene,mark,text,line,rect,circle,arrow,label,flow,map,network,compare,magnets,syringe,river,sky,climate};
