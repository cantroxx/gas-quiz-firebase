'use strict';
const assert=require('node:assert/strict');
process.env.GCLOUD_PROJECT='demo-dj48-rules';process.env.GOOGLE_CLOUD_PROJECT='demo-dj48-rules';
async function main(){
 assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8181');
 const action=require('../../functions/index').subjectQuizAction;
 const functionRequire=require('node:module').createRequire(require.resolve('../../functions/package.json'));
 const {getFirestore}=functionRequire('firebase-admin/firestore'),{getApps,deleteApp}=functionRequire('firebase-admin/app'),db=getFirestore();
 const uid='subject-reward-auth',member='G4-C8-N97',date=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
 const call=data=>action.run({auth:{uid},data});
 try{
  await db.doc('authLinks/'+uid).set({memberUserId:member,authUid:uid});
  await db.doc('users/'+member).set({memberUserId:member,authUid:uid,status:'active',active:true,role:'student',grade:'4',classNumber:'8',studentNumber:97,nickname:'보상 검증'});
  await db.doc('appSettings/featureFlags').set({practiceRewardEnabled:true,practiceXpEnabled:true,todayQuizMode:'manual',todayQuizIds:['fraction-basic']});
  await db.doc('userEconomy/'+member).set({djCoin:100,totalEarned:100});
  await db.doc('rewardDailyCaps/practice_coin_daily__'+date+'__'+member).set({usedCoin:49});
  const usageRef=db.doc('dailyUsage/'+member+'__'+date);
  await usageRef.set({eduCorrectCount:7,funSeconds:120,source:'legacy-preserved'});
  const usageBefore=await usageRef.get();
  let run=await call({action:'start',unitId:'math:4-1:3',mode:'practice',requestId:crypto.randomUUID()});
  for(let i=0;i<2;i++){
   await new Promise(r=>setTimeout(r,320));const q=(await db.doc('subjectQuizRuns/'+run.runId).get()).data().question;
   const payload={action:'answer',runId:run.runId,seq:run.seq,choice:q.answer};
   run=await call(payload);assert.equal(run.feedback.rewardCoin,i===0?1:0);assert.equal(run.feedback.xpDelta,2);
   assert.equal((await call(payload)).duplicate,true);
  }
  assert.equal((await db.doc('userEconomy/'+member).get()).data().djCoin,101);
  assert.equal((await db.doc('rewardDailyCaps/practice_coin_daily__'+date+'__'+member).get()).data().usedCoin,50);
  assert((await usageRef.get()).updateTime.isEqual(usageBefore.updateTime));
  assert.equal((await db.doc('userLevelSummary/'+member).get()).data().quizCorrectRewardCount,2);
  assert.equal(run.totalScore,0);await call({action:'finish',runId:run.runId});
  run=await call({action:'start',unitId:'math:4-1:3',mode:'ranking',requestId:crypto.randomUUID()});await new Promise(r=>setTimeout(r,320));
  const q=(await db.doc('subjectQuizRuns/'+run.runId).get()).data().question;run=await call({action:'answer',runId:run.runId,seq:0,choice:q.answer});
  assert.equal(run.totalScore,1);assert.equal(run.feedback.rewardCoin,0);assert((await usageRef.get()).updateTime.isEqual(usageBefore.updateTime));
  assert.equal((await db.doc('userEconomy/'+member).get()).data().djCoin,101);
  console.log('PASS actual callable reward integration: shared 50 coin cap, duplicate immunity, today quiz alias +2 XP, legacy usage unchanged, ranking no per-answer coin.');
 }finally{await Promise.all(getApps().map(deleteApp));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
