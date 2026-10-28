'use strict';
const crypto = require('node:crypto');
const definitions = [
 ['practice','연습전 정답',10,40,'practiceCorrect'],
 ['ranking','랭킹전 완료',20,3,'rankingScore'],
 ['tower','구름탑 문장 완료',10,3,'towerClear'],
 ['survivor','퀴즈서바이버 클리어',1000,10000,'survivorScore'],
 ['bomb','말폭탄 낱말 우승',1,3,'bombWin']
];
const quests=definitions.flatMap(([id,title,daily,weekly,kind])=>[
 {questId:'v2_daily_'+id,title,scope:'daily',target:daily,kind,field:id,xpReward:10,rewardCoin:5},
 {questId:'v2_weekly_'+id,title,scope:'weekly',target:weekly,kind:['ranking','tower'].includes(id)?id+'Days':kind,field:id,xpReward:30,rewardCoin:20}
]).concat([
 {questId:'v2_weekly_fields',title:'서로 다른 2개 분야 도전',scope:'weekly',target:2,kind:'fields',bonus:true,xpReward:30,rewardCoin:20},
 {questId:'v2_weekly_days',title:'3일 연속 일일퀘스트 완료',scope:'weekly',target:3,kind:'activeDays',bonus:true,xpReward:30,rewardCoin:20}
]);
function periods(time=Date.now()){const d=new Date(time+9*3600000),date=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return {date,week:d.toISOString().slice(0,10),month:date.slice(0,7)};}
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function longestStreak(days=[]){let best=0,streak=0,previous=-Infinity;for(const date of [...new Set(days)].sort()){const day=Date.parse(date)/86400000;streak=day===previous+1?streak+1:1;best=Math.max(best,streak);previous=day;}return best;}
function rows(daily={},weekly={}){
 const fields=quests.filter(q=>q.scope==='weekly'&&!q.bonus&&Number(weekly.counts?.[q.kind]||0)>=q.target).length;
 const claimedBasic=(weekly.claimed||[]).filter(id=>quests.some(q=>q.questId===id&&!q.bonus)).length;
 return quests.map(q=>{
  const p=q.scope==='daily'?daily:weekly,count=q.kind==='fields'?fields:q.kind==='activeDays'?longestStreak(p.days):Number(p.counts?.[q.kind]||0);
  const bonusLocked=q.bonus&&fields<3;
  const claimed=(p.claimed||[]).includes(q.questId),limited=q.scope==='weekly'&&!q.bonus&&claimedBasic>=3,current=Math.min(q.target,count);
  return {...q,current,locked:Boolean(bonusLocked),progress:current+'/'+q.target,completed:count>=q.target&&!bonusLocked,claimed,repeatLimit:1,claimedCount:claimed?1:0,claimable:count>=q.target&&!claimed&&!limited&&!bonusLocked,
   status:claimed?'수령 완료':bonusLocked?'기본 주간퀘스트 3개를 먼저 완료해요':limited?'주간 기본 보상 3개 수령 완료':count>=q.target?'보상 받기':'진행 중',reward:'XP +'+q.xpReward+' · DJ코인 +'+q.rewardCoin};
 });
}
function createService({db,FieldValue,ErrorType,authorize,applyXp,now=()=>Date.now()}){
 const fail=(code,message)=>{throw new ErrorType(code,message);};
 // Separate version preserves old counters and paid claims without reinterpreting them.
 const ref=(id,scope,key)=>db.collection('growthQuestProgress').doc(id+'__v3_'+scope+'__'+key);
 async function ingest({memberId,uid,source,counts={},time}){
  if(!source||!Number.isFinite(time))return;
  const valid=Object.fromEntries(Object.entries(counts).filter(([k,v])=>definitions.some(q=>q[4]===k)&&Number.isInteger(v)&&v>=0&&v<=1000000));
  if(!Object.keys(valid).length)return;
  await db.runTransaction(async tx=>{
   if(!memberId&&uid)memberId=(await tx.get(db.collection('authLinks').doc(uid))).data()?.memberUserId;
   if(!memberId)return;
   const member=(await tx.get(db.collection('users').doc(memberId))).data();
   if(!member||member.active===false||member.status!=='active'||(uid&&member.authUid!==uid))return;
   const mark=db.collection('growthQuestSources').doc(hash('v3|'+source+'|'+memberId)),old=(await tx.get(mark)).data()||{},p=old.period||periods(time);
   const dr=ref(memberId,'daily',p.date),wr=ref(memberId,'weekly',p.week);
   const [ds,ws]=await Promise.all([tx.get(dr),tx.get(wr)]);
   const d=ds.data()||{},w=ws.data()||{},daily={...d.counts},weekly={...w.counts};
   for(const[k,value]of Object.entries(valid)){
    const delta=Math.max(0,value-Number(old.counts?.[k]||0));if(!delta)continue;
    if(k.endsWith('Score')){daily[k]=Math.max(daily[k]||0,value);weekly[k]=Math.max(weekly[k]||0,value);}
    else{daily[k]=(daily[k]||0)+delta;weekly[k]=(weekly[k]||0)+(k==='practiceCorrect'?Math.min(10,daily[k])-Math.min(10,d.counts?.[k]||0):delta);}
   }
   const completed=definitions.filter(([, ,target, ,kind])=>(daily[kind]||0)>=target).map(([id])=>id);
   for(const id of ['ranking','tower'])if(completed.includes(id)&&!(d.completed||[]).includes(id))weekly[id+'Days']=(weekly[id+'Days']||0)+1;
   const days=[...new Set([...(w.days||[]),...(completed.length?[p.date]:[])])];
   tx.set(dr,{memberId,counts:daily,completed,updatedAt:FieldValue.serverTimestamp()},{merge:true});
   tx.set(wr,{memberId,counts:weekly,days,updatedAt:FieldValue.serverTimestamp()},{merge:true});
   tx.set(mark,{memberId,period:p,counts:{...old.counts,...Object.fromEntries(Object.entries(valid).map(([k,v])=>[k,Math.max(v,old.counts?.[k]||0)]))}});
  });
 }
 async function status(uid,id){return db.runTransaction(async tx=>{
  await authorize(tx,uid,id);const p=periods(now());const[d,w]=await Promise.all([tx.get(ref(id,'daily',p.date)),tx.get(ref(id,'weekly',p.week))]);
  return {success:true,memberUserId:id,dateKey:p.date,weekKey:p.week,quests:rows(d.data(),w.data()),dailyClaimed:(d.data()?.claimed||[]).length,weeklyClaimed:(w.data()?.claimed||[]).length,claimLimit:3,dailyClaimLimit:5,todayQuestCoin:Number(d.data()?.earnedCoin||0),todayQuestXp:Number(d.data()?.earnedXp||0)};
 });}
 async function claim(uid,id,questId){
  const q=quests.find(q=>q.questId===questId);if(!q)fail('failed-precondition','종료된 보상입니다. 오늘의 퀘스트를 이용해 주세요.');
  return db.runTransaction(async tx=>{
   const member=await authorize(tx,uid,id),p=periods(now()),dr=ref(id,'daily',p.date),wr=ref(id,'weekly',p.week),periodKey=q.scope==='daily'?p.date:p.week;
   const[ds,ws,flags]=await Promise.all([tx.get(dr),tx.get(wr),tx.get(db.doc('appSettings/featureFlags'))]);
   if(flags.data()?.eventPlazaEnabled===false&&member.role!=='admin')fail('failed-precondition','퀘스트 보상이 잠시 쉬고 있어요.');
   const d=ds.data()||{},w=ws.data()||{},r=rows(d,w).find(r=>r.questId===questId);
   if(r.claimed)return {success:true,duplicate:true,rewardCoin:0,xpDelta:0};
   if(!r.claimable)fail('failed-precondition','아직 완료하지 않았거나 주간 기본 보상 3개를 모두 받았어요.');
   const xp=await applyXp(tx,{memberUserId:id,authUid:uid,memberData:member,xpDelta:q.xpReward,sourceType:'growth_quest_v3',sourceId:periodKey+'__'+questId,sourceLabel:q.title,dateKey:p.date});
   const target=q.scope==='daily'?dr:wr,current=q.scope==='daily'?d:w;
   tx.set(target,{memberId:id,claimed:[...(current.claimed||[]),questId],updatedAt:FieldValue.serverTimestamp()},{merge:true});
   tx.set(dr,{earnedCoin:FieldValue.increment(q.rewardCoin+Number(xp.levelReward?.djCoin||0)),earnedXp:FieldValue.increment(xp.xpDelta||0)},{merge:true});
   tx.set(db.collection('userEconomy').doc(id),{userId:id,djCoin:FieldValue.increment(q.rewardCoin),totalEarned:FieldValue.increment(q.rewardCoin),updatedAt:FieldValue.serverTimestamp()},{merge:true});
   tx.create(db.collection('rewardLogs').doc('growth_v3_'+hash(id+'|'+periodKey+'|'+questId)),{type:'growth_quest',memberUserId:id,rewardCoin:q.rewardCoin,xpDelta:xp.xpDelta,questId,createdAt:FieldValue.serverTimestamp()});
   return {success:true,duplicate:false,rewardCoin:q.rewardCoin,xpDelta:xp.xpDelta,levelXp:xp};
  });
 }
 return {ingest,status,claim};
}
module.exports={quests,periods,rows,longestStreak,createService};
