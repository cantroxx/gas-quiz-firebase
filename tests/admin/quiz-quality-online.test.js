'use strict';
const assert=require('node:assert/strict');
process.env.GCLOUD_PROJECT='demo-dj48-rules';process.env.GOOGLE_CLOUD_PROJECT='demo-dj48-rules';
async function main(){
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8181');
  const {adminGetQuizQualityAudit:action}=require('../../functions/index');
  const functionRequire=require('node:module').createRequire(require.resolve('../../functions/package.json'));
  const {getFirestore}=functionRequire('firebase-admin/firestore'),{getApps,deleteApp}=functionRequire('firebase-admin/app'),db=getFirestore();
  const {CURRENT_BANK_IDS}=require('../../functions/quiz-quality-scope');
  const uid='quality-audit-test',call=(data={},as=uid)=>action.run({auth:as?{uid:as}:null,data});
  try{
    await db.doc('users/quality-admin').set({authUid:uid,role:'admin',adminLevel:'superAdmin',active:true,status:'active'});
    await db.doc('users/quality-class-admin').set({authUid:'quality-class',role:'admin',adminLevel:'classAdmin',active:true,status:'active'});
    await db.doc('appSettings/featureFlags').set({disabledQuizIds:[]});
    for(const id of [...CURRENT_BANK_IDS,'spelling']){
      await db.doc(`quizzes/${id}`).set({title:id,questionCount:1});
      await db.doc(`quizQuestions/${id}/questions/one`).set({questionId:'one',prompt:'synthetic',answerText:'answer'});
    }
    await assert.rejects(call({},null),e=>e.code==='unauthenticated');
    await assert.rejects(call({},'quality-class'),e=>e.code==='permission-denied');
    const current=(await call()).audit;assert.equal(current.scope,'current');assert.equal(current.complete,true);
    assert.equal(current.metrics.quizCount,11);assert.equal(current.metrics.questionCount,11);
    assert(!current.quizSummaries.some(q=>q.quizId==='spelling'));
    const archive=(await call({scope:'archive',quizIds:['spelling']})).audit;
    assert.equal(archive.metrics.quizCount,1);assert.equal(archive.metrics.questionCount,1);
    assert.equal(archive.quizSummaries[0].quizId,'spelling');
    const missing=(await call({scope:'archive',quizIds:['missing-fixture']})).audit;
    assert.equal(missing.complete,false);assert.equal(missing.issues.readIssues.length,1);
    await assert.rejects(call({scope:'archive',quizIds:Array(6).fill('spelling')}),e=>e.code==='invalid-argument');
    assert.equal((await db.doc('quizQuestions/spelling/questions/one').get()).data().answerText,'answer');
    console.log('PASS quality audit callable: admin authorization, current/archive scope, missing data and preservation');
  }finally{await Promise.all(getApps().map(deleteApp));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
