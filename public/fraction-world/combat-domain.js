(function(root){
 'use strict';
 const kits={
  wand:{name:'별의 파동',desc:'주변 230 범위에 별빛 폭발',kind:'nova',color:'#9ef6d0'},
  bow:{name:'유성 관통',desc:'바라보는 적 방향으로 긴 관통 사격',kind:'beam',color:'#ffdb8a'},
  fan:{name:'달의 윤무',desc:'8개의 달날이 주위를 돌며 적을 베어요',kind:'blades',color:'#e6a8ff'},
  orb:{name:'빙결 지대',desc:'주변 적에게 피해 · 3초 동안 이동 냉각',kind:'frost',color:'#91d8ff'},
  needle:{name:'연쇄 번개',desc:'가까운 적부터 최대 6명에게 번개 연결',kind:'chain',color:'#fff18b'},
  comet:{name:'혜성 낙하',desc:'가까운 적 위치에 0.65초 뒤 운석 폭발',kind:'meteor',color:'#ffa78f'}
 };
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function aim(p,enemies){const live=enemies.filter(e=>e.hp>0);const target=live.reduce((best,e)=>!best||distance(p,e)<distance(p,best)?e:best,null);return target?Math.atan2(target.y-p.y,target.x-p.x):Math.atan2(p.dy||0,p.dx||1);}
 function inBeam(p,e,angle,range=580,width=38){const x=e.x-p.x,y=e.y-p.y,forward=x*Math.cos(angle)+y*Math.sin(angle),side=Math.abs(-x*Math.sin(angle)+y*Math.cos(angle));return forward>=0&&forward<=range&&side<=width+(e.r||0);}
 function chain(p,enemies){const result=[];let origin=p;while(result.length<6){const next=enemies.filter(e=>e.hp>0&&!result.includes(e)&&distance(origin,e)<(result.length?230:440)).sort((a,b)=>distance(origin,a)-distance(origin,b))[0];if(!next)break;result.push(next);origin=next;}return result;}
 function meteorPoint(p,enemies){const live=enemies.filter(e=>e.hp>0&&distance(p,e)<520).sort((a,b)=>distance(p,a)-distance(p,b));const a=aim(p,enemies);return live[0]?{x:live[0].x,y:live[0].y}:{x:Math.max(60,Math.min(900,p.x+Math.cos(a)*180)),y:Math.max(60,Math.min(540,p.y+Math.sin(a)*180))};}
 function stepBullet(b,dt,p){b.age=(b.age||0)+dt;b.life-=dt;
  if(b.orbit!==undefined){const a=b.orbit+b.age*7,r=70+Math.min(1,b.age)*45;b.x=p.x+Math.cos(a)*r;b.y=p.y+Math.sin(a)*r;return;}
  if(b.style==='fan'&&b.age>.48){const a=Math.atan2(p.y-b.y,p.x-b.x),speed=Math.hypot(b.vx,b.vy);b.vx=Math.cos(a)*speed;b.vy=Math.sin(a)*speed;if(distance(b,p)<18){b.life=0;return;}}
  b.x+=b.vx*dt;b.y+=b.vy*dt;
 }
 const api={kits,aim,inBeam,chain,meteorPoint,stepBullet};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FWCombat=api;
})(typeof window!=='undefined'?window:globalThis);
