'use strict';
const {createHash}=require('node:crypto');
const {activities}=require('./season-events');
const {nextMonth}=require('./season-plan');
function generate(month,revision,settings={}){
 const seed=createHash('sha256').update(month+'|'+revision).digest();
 const pool=[...new Set((settings.items||[]).flatMap(e=>e.quizIds||[]))];
 const quizIds=pool.length?[pool[seed[0]%pool.length]]:['spelling'];
 const games=['studyCorrect','survivorCorrect','marbleComplete','towerClear','bombWord'];
 const first=seed[1]%5,second=(first+1+seed[2]%4)%5;
 const kinds=[seed[3]%2?'practiceCorrect':'todayCorrect','rankingComplete',games[first],games[second]];
 return {month,revision,items:[{eventId:'season-'+month,icon:'🎯',title:Number(month.slice(5))+'월 함께 도전 시즌',desc:'지정 퀴즈와 온라인 대전을 함께 즐겨 보세요.',periodType:'monthly',targetMonth:month,autoRenew:false,quizIds,active:false,sortOrder:1,goals:kinds.map((kind,i)=>({kind,target:Math.round(activities[kind][1]*[.8,1,1.2][seed[4+i]%3]),xpReward:50,rewardCoin:40}))}]};
}
function createService({db,FieldValue,ErrorType,now=()=>Date.now()}){
 async function act(action='preview',payload={},adminId='scheduler'){
  return db.runTransaction(async tx=>{
   const month=nextMonth(new Date(now()+9*3600000).toISOString().slice(0,7));
   const ref=db.doc('seasonEventDrafts/'+month);
   const [snapshot,settings]=await Promise.all([tx.get(ref),tx.get(db.doc('appSettings/seasonEvents'))]);
   const old=snapshot.data();
   if(!['preview','reroll'].includes(action))throw new ErrorType('invalid-argument','작업을 확인해 주세요.');
   if(action==='reroll'&&(payload.month!==month||payload.revision!==(old?.revision||0)))throw new ErrorType('failed-precondition','초안을 다시 불러온 뒤 리롤하세요.');
   if(old&&action==='preview')return {success:true,draft:old};
   const draft=generate(month,action==='reroll'?(old?.revision||0)+1:0,settings.data());
   tx.set(ref,{...draft,updatedAt:FieldValue.serverTimestamp()});
   tx.create(db.collection('adminLogs').doc(),{action:'seasonEventDraft',adminUserId:adminId,targetUserId:ref.path,revision:draft.revision,createdAt:FieldValue.serverTimestamp()});
   return {success:true,draft};
  });
 }
 return {act};
}
module.exports={generate,createService};
