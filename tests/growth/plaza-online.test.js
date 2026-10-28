'use strict';
const assert=require('node:assert/strict');
process.env.GCLOUD_PROJECT='demo-dj48-rules';process.env.GOOGLE_CLOUD_PROJECT='demo-dj48-rules';
(async()=>{
 assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8181');
 const f=require('../../functions/index'),req=require('node:module').createRequire(require.resolve('../../functions/package.json'));
 const {getFirestore}=req('firebase-admin/firestore'),{getApps,deleteApp}=req('firebase-admin/app'),db=getFirestore();
 const uid='plaza-student-auth',member='G4-C8-N94',admin='plaza-teacher-auth';
 const call=(name,data,auth=uid)=>f[name].run({auth:{uid:auth},data});
 try{
  for(const [id,auth,role]of [[member,uid,'student'],['plaza-admin',admin,'admin']]){
   await db.doc('authLinks/'+auth).set({memberUserId:id});
   await db.doc('users/'+id).set({authUid:auth,active:true,status:'active',role,nickname:'검증 계정',grade:'4',classNumber:'8'});
  }
  await db.doc('appSettings/featureFlags').set({eventPlazaEnabled:true,practiceRewardEnabled:true,practiceXpEnabled:true});
  await db.doc('appSettings/specialRewards').set({items:[]});
  await db.doc('userEconomy/'+member).set({djCoin:100});
  const mission={action:'publish',id:'emulator-special-reward',title:'개인 미션',instruction:'정리하기',mode:'individual',target:1,rewardCoin:5,xpReward:10};
  await assert.rejects(call('adminSpecialRewardAction',mission),e=>e.code==='permission-denied');
  await call('adminSpecialRewardAction',mission,admin);
  await assert.rejects(call('specialRewardAction',{action:'claim',id:mission.id,memberUserId:member}),e=>e.code==='failed-precondition');
  await call('specialRewardAction',{action:'participate',id:mission.id,memberUserId:member,confirmed:true});
  const claims=await Promise.all([call('specialRewardAction',{action:'claim',id:mission.id,memberUserId:member}),call('specialRewardAction',{action:'claim',id:mission.id,memberUserId:member})]);
  assert.equal(claims.filter(r=>r.duplicate).length,1);assert.equal(claims.reduce((sum,r)=>sum+r.rewardCoin,0),5);
  await call('adminSpecialRewardAction',{action:'close',id:mission.id},admin);
  assert.equal((await call('specialRewardAction',{action:'list',memberUserId:member})).items.length,0);
  const run=await call('survivorQuestQuiz',{action:'startRun'});
  await db.doc('survivorQuizControls/'+uid).update({runStartedAt:Date.now()-20000});
  await assert.rejects(call('survivorQuestQuiz',{action:'finishRun',runId:run.runId,score:999999}),e=>e.code==='invalid-argument');
  assert.equal((await call('survivorQuestQuiz',{action:'finishRun',runId:run.runId,score:1500})).success,true);
  assert.equal((await call('survivorQuestQuiz',{action:'finishRun',runId:run.runId,score:1500})).duplicate,true);
  const activities=await db.collection('growthActivities').where('uid','==',uid).get();
  for(const doc of activities.docs)for(let i=0;i<2;i++)await f.ingestGrowthActivity.run({data:doc});
  let status=await call('getEventProgress',{memberUserId:member});
  assert.equal(status.quests.find(q=>q.questId==='v2_daily_survivor').current,1000);
  const result=await call('claimEventQuestReward',{memberUserId:member,questId:'v2_daily_survivor'});
  assert.equal(result.rewardCoin,5);assert.equal(result.xpDelta,10);
  assert.equal((await call('claimEventQuestReward',{memberUserId:member,questId:'v2_daily_survivor'})).duplicate,true);
  console.log('PASS real callables: admin authorization, special participation/claim concurrency, closed reward, survivor run validation/replay, activity ingestion, separate daily reward');
 }finally{await Promise.all(getApps().map(deleteApp));}
})().catch(e=>{console.error(e);process.exitCode=1;});
