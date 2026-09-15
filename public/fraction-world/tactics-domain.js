/* Original combat rules shared by the live encounter and deterministic tests. */
(function(root){
 'use strict';
 const active=s=>s.balance===4;
 const timing=s=>({window:s.difficulty==='expert'?.22:.32,miss:1.5,success:.28,warning:s.difficulty==='expert'?.85:1.1});
 function guard(s,spec,type){if(!active(s))return 0;if(type==='boss')return spec.biome>=2?(s.difficulty==='expert'?2:spec.biome===3?2:1):0;return spec.elite&&spec.biome>=1&&['shooter','charger','healer'].includes(type)?1:0;}
 function pattern(type,region,turn){if(type==='boss'){const list=region===0?['star','slam','fan']:region===1?['star','spiral','star','missiles']:['star','spiral','star','poison','star','missiles','star','slam'];return list[turn%list.length];}if(type==='charger')return 'charge';if(type==='healer')return turn%2?'star':'mend';if(type==='splitter')return 'poison';if(type==='orbiter')return region>=1?(turn%2?'missiles':'spiral'):'fan';return turn%3===0?'star':region>=2?(turn%3===1?'poison':'spiral'):region===1?'spiral':'fan';}
 const normalizeAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
 function steer(shot,p,dt){if(shot.seek>0){shot.seek=Math.max(0,shot.seek-dt);const current=Math.atan2(shot.vy,shot.vx),target=Math.atan2(p.y-shot.y,p.x-shot.x),delta=Math.max(-1.7*dt,Math.min(1.7*dt,normalizeAngle(target-current))),speed=Math.hypot(shot.vx,shot.vy);shot.vx=Math.cos(current+delta)*speed;shot.vy=Math.sin(current+delta)*speed;}}
 const api={active,timing,guard,pattern,steer};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FWTacticsRules=api;
})(typeof window!=='undefined'?window:globalThis);
