'use strict';
const assert=require('node:assert/strict');process.env.GCLOUD_PROJECT='demo-dj48-rules';process.env.GOOGLE_CLOUD_PROJECT='demo-dj48-rules';
async function main(){
 assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8181');const action=require(process.env.POPULAR_FUNCTIONS_ROOT ? process.env.POPULAR_FUNCTIONS_ROOT + '/index' : '../../functions/index').popularQuizAction;
 const req=require('node:module').createRequire(require.resolve('../../functions/package.json')),{getFirestore}=req('firebase-admin/firestore'),{getApps,deleteApp}=req('firebase-admin/app'),db=getFirestore();
 const uid='popular-reward-auth',member='G4-C8-N96',date=new Date(Date.now()+9*3600000).toISOString().slice(0,10),call=data=>action.run({auth:{uid},data});
 async function answer(run,correct=true){await new Promise(r=>setTimeout(r,320));const data=(await db.doc('popularQuizRuns/'+run.runId).get()).data(),q=data.questions[data.seq%20];const payload={action:'answer',runId:run.runId,seq:run.seq,choice:correct?q.answerIndex:(q.answerIndex+1)%4};const result=await call(payload);assert.equal((await call(payload)).duplicate,true);return result;}
 async function complete(run){for(let i=0;i<21;i++)run=await answer(run);return call({action:'finish',runId:run.runId});}
 try{
  await db.doc('authLinks/'+uid).set({memberUserId:member,authUid:uid});await db.doc('users/'+member).set({memberUserId:member,authUid:uid,status:'active',active:true,role:'student',grade:'4',classNumber:'8',studentNumber:96,nickname:'인기 보상 검증'});
  await db.doc('appSettings/featureFlags').set({practiceRewardEnabled:true,practiceXpEnabled:true,rankingEnabled:true});
  await db.doc('userEconomy/'+member).set({djCoin:100,totalEarned:100});
  await db.doc(`rewardDailyCaps/practice_coin_daily__${date}__${member}`).set({usedCoin:49});await db.doc(`levelXpCaps/practice_xp_daily__${date}__${member}`).set({xp:19});
  let r=await call({action:'start',category:'idol',mode:'practice',requestId:crypto.randomUUID()});
  r=await answer(r,false);for(let i=0;i<19;i++){r=await answer(r);assert.equal(r.feedback.rewardCoin,0);assert.equal(r.feedback.xpDelta,0);}
  assert.equal(r.seq,20);assert.equal(r.correct,19);assert.equal(r.status,'playing');assert.equal((await db.doc('userEconomy/'+member).get()).data().djCoin,100);
  r=await answer(r);assert.equal(r.status,'playing');assert.equal(r.feedback.rewardCoin,0);assert.equal(r.feedback.xpDelta,0);
  await call({action:'resume',runId:r.runId});await call({action:'finish',runId:r.runId});
  assert.equal((await db.doc('userEconomy/'+member).get()).data().djCoin,100);assert.equal((await db.doc(`levelXpCaps/practice_xp_daily__${date}__${member}`).get()).data().xp,19);
  assert.equal((await db.doc('userLevelSummary/'+member).get()).exists,false);
  r=await complete(await call({action:'start',category:'idol',mode:'practice',requestId:crypto.randomUUID()}));assert.equal(r.feedback.rewardCoin,0);assert.equal(r.feedback.xpDelta,0);
  assert.equal((await db.doc('userLevelSummary/'+member).get()).exists,false);
  await db.doc('appSettings/featureFlags').set({practiceRewardEnabled:false,practiceXpEnabled:false});
  r=await complete(await call({action:'start',category:'anime',mode:'practice',requestId:crypto.randomUUID()}));assert.equal(r.feedback.rewardCoin,0);assert.equal(r.feedback.xpDelta,0);assert.equal(r.feedback.rewardCoin,0);
  r=await call({action:'start',category:'anime',mode:'ranking',requestId:crypto.randomUUID()});r=await answer(r);assert.equal(r.feedback.rewardCoin,0);assert.equal(r.feedback.xpDelta,0);
  assert.equal((await db.doc('userEconomy/'+member).get()).data().djCoin,100);
  assert.equal((await db.doc('dailyUsage/'+member+'__'+date).get()).exists,false,'popular quizzes must not write usage locks or education unlocks');
  console.log('PASS actual popular callable: popular play never pays practice XP/coins or consumes subject reward caps, duplicate immunity, disabled rewards, ranking no practice payout, no usage lock writes.');
 }finally{await Promise.all(getApps().map(deleteApp));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
