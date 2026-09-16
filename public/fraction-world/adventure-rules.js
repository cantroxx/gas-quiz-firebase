(function(root){
 'use strict';
 const tiers={
 beginner:{name:'초보',hold:true,auto:true,revives:Infinity,hp:.65,damage:.5,speed:.75,cap:[3,4,5,6],warning:1.4,armorSeconds:2,guide:true,description:'꾹 눌러 공격 · 자동 공격 · 계속 부활'},
 intermediate:{name:'중수',hold:false,auto:true,revives:2,hp:.85,damage:.75,speed:.9,cap:[4,5,6,8],warning:1.15,armorSeconds:3,guide:true,description:'한 번씩 공격 · 자동 공격 · 부활 2번'},
 advanced:{name:'고수',hold:false,auto:false,revives:0,hp:1.1,damage:1.1,speed:1,cap:[5,7,9,11],warning:.9,armorSeconds:4,guide:false,description:'직접 눌러 공격 · 자동 공격과 부활 없음'}
 };
 const get=s=>tiers[s.tier]||tiers.intermediate;
 function apply(s,tier){s.rulesVersion=2;s.controlVersion=2;s.balance=4;s.tier=tiers[tier]?tier:'beginner';s.difficulty=s.tier==='advanced'?'expert':'hard';s.playMode=s.tier==='advanced'?'rogue':'coin';s.revivesUsed=s.revivesUsed||0;s.guideEnabled=get(s).guide;return s;}
 const bonus=s=>s.tier==='beginner'?Math.min(4,s.coinFailures||0)*.15:0;
 function fail(s){if((s.revivesUsed||0)>=get(s).revives)return false;s.revivesUsed=(s.revivesUsed||0)+1;s.coinFailures=Math.min(1000,(s.coinFailures||0)+1);s.retryPending=true;s.kills=s.roomStartKills??s.kills;return true;}
 const remaining=s=>get(s).revives===Infinity?'계속 부활할 수 있어요':`부활 ${Math.max(0,get(s).revives-(s.revivesUsed||0))}번 남음`;
 const api={tiers,get,apply,bonus,fail,remaining};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FWAdventure=api;
})(typeof window!=='undefined'?window:globalThis);
