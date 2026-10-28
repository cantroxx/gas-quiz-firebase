'use strict';
// Run against the Firestore emulator: verifies real transactions and default-deny rules.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {initializeApp,deleteApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc}=require('firebase/firestore');
const {createService}=require('../../functions/subject-quiz/service'),C=require('../../functions/subject-quiz/curriculum');
async function main(){
 assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8181');
 const app=initializeApp({projectId:'demo-dj48-rules'},'subject-tests'),db=getFirestore(app);
 const env=await initializeTestEnvironment({projectId:'demo-dj48-rules',firestore:{host:'127.0.0.1',port:8181,rules:fs.readFileSync('firestore.rules','utf8')}});
 let time=Date.now(),rewardFail=false;const suffix=Date.now(),uid='subject-test-'+suffix,memberId='subject-member-'+suffix;
 const service=createService({db,now:()=>time,reward:async(tx,item)=>{if(rewardFail)throw Error('reward unavailable');tx.set(db.doc('subjectTestRewards/'+item.runId+'_'+item.seq),{coin:1});return {rewardCoin:1};}});
 const call=(action,data={},as=uid)=>service.act(as,{action,clientVersion:'subject-depth-2026-10-17',visualVersion:1,...data});
 const secret=async r=>(await db.doc('subjectQuizRuns/'+r.runId).get()).data();
 const start=(unitId='korean:4-1:1',mode='ranking')=>call('start',{unitId,mode,requestId:crypto.randomUUID()});
 const answer=async(r,correct=true)=>{time+=500;const privateRun=await secret(r),choice=correct?privateRun.question.answer:(privateRun.question.answer+1)%4;return {r:await call('answer',{runId:r.runId,seq:r.seq,choice}),choice};};
 try{
  await db.doc('authLinks/'+uid).set({memberUserId:memberId});await db.doc('users/'+memberId).set({authUid:uid,status:'active',active:true,nickname:'테스트 학생'});
  await assert.rejects(call('profile',{},null),e=>e.code==='unauthenticated');
  const profile=await call('profile');assert.equal(profile.units.length,49);assert.equal(profile.totals.korean,0);
  let r=await start();for(const key of ['answer','explanation','seed','rationales','verification'])assert.equal(key in r.question,false);
  const legacyView=await service.act(uid,{action:'resume',runId:r.runId});assert.equal(legacyView.question.passage,'');assert.equal(legacyView.question.prompt,r.question.passage+'\n\n'+r.question.prompt);
  await assert.rejects(start(),e=>e.code==='failed-precondition');
  await assert.rejects(call('answer',{runId:r.runId,seq:0,choice:7}),e=>e.code==='invalid-argument');
  time+=500;const correct=(await secret(r)).question.answer;
  const double=await Promise.all([call('answer',{runId:r.runId,seq:0,choice:correct}),call('answer',{runId:r.runId,seq:0,choice:correct})]);
  assert.equal(double.filter(x=>x.duplicate).length,1);r=double[0];assert.equal(r.totalScore,1);
  assert.equal((await db.doc(`subjectQuizProgress/${C.VERSION}_${memberId}_deck_korean:4-1:1`).get()).data().issued,2,'simultaneous answer consumed more than one next question');
  for(let i=1;i<17;i++)r=(await answer(r)).r;
  await call('finish',{runId:r.runId});
  r=await start('korean:4-1:2');for(let i=0;i<20;i++)r=(await answer(r)).r;await call('finish',{runId:r.runId});
  r=await start('korean:spelling:1');for(let i=0;i<22;i++)r=(await answer(r)).r;
  assert.equal(r.totalScore,59);assert.equal((await call('profile')).totals.korean,59);
  await call('finish',{runId:r.runId});
  r=await start('korean:4-2:1');r=(await answer(r)).r;assert.equal(r.totalScore,60);
  for(let i=0;i<3;i++){const before=(await secret(r)).question;r=(await answer(r,false)).r;assert.equal(r.feedback.passage,before.passage);assert.deepEqual(r.feedback.diagram,before.diagram||null);assert.equal(r.feedback.selectedReason,before.rationales[(before.answer+1)%4]);}
  assert.equal(r.status,'finished');assert.equal(r.hearts,0);assert.equal(r.totalScore,60);
  r=await start('math:4-1:3');time=r.deadline;const atDeadline=await call('answer',{runId:r.runId,seq:r.seq,choice:(await secret(r)).question.answer});
  assert.equal(atDeadline.reason,'time');assert.equal(atDeadline.totalScore,0);
  r=await start('math:4-2:1','practice');for(let i=0;i<4;i++)r=(await answer(r,false)).r;
  assert.equal(r.hearts,3);assert.equal(r.status,'playing');
  const learningRef=db.doc(`subjectQuizProgress/${C.VERSION}_${memberId}_deck_math:4-2:1`);
  const learningState=(await learningRef.get()).data().learning;assert.equal(learningState.answered,4);assert.ok(learningState.reviews.length>0);assert.equal(r.learning.pending,learningState.reviews.length);
  assert.equal(r.question.answer,undefined);assert.equal(r.question.objective,undefined);
  const practiceBefore=(await learningRef.get()).data();await call('resume',{runId:r.runId});assert.deepEqual((await learningRef.get()).data(),practiceBefore);
  rewardFail=true;time+=500;const seq=r.seq;await assert.rejects(answer(r),/reward unavailable/);assert.equal((await secret(r)).seq,seq);rewardFail=false;
  r=(await answer(r)).r;assert.equal(r.feedback.rewardCoin,1);assert.equal(r.totalScore,0);assert.equal(r.correct,1);
  // A question stored by the old deployment must still grade correctly and return safe fallback feedback.
  const old=(await secret(r)).question;delete old.rationales;delete old.passage;delete old.contentVersion;await db.doc('subjectQuizRuns/'+r.runId).update({question:old});r=(await answer(r,false)).r;assert.equal(r.feedback.selectedReason,'');assert.equal(r.feedback.passage,'');
  const resumed=await call('resume',{runId:r.runId});assert.equal(resumed.seq,r.seq);assert.deepEqual(resumed.question,r.question);
  await call('finish',{runId:r.runId});
  r=await start('science:4-2:3','practice');
  const visual=require('../../functions/subject-quiz/pool').get('science:4-2:3').questions.find(q=>q.skill.endsWith(':visual-compression-1'));
  await db.doc('subjectQuizRuns/'+r.runId).update({question:visual});
  const oldVisual=await service.act(uid,{action:'resume',runId:r.runId,clientVersion:'subject-depth-2026-10-17'});
  assert.equal(oldVisual.question.diagram,null);assert.ok(oldVisual.question.passage.includes(visual.diagram.description));assert.equal(oldVisual.question.answer,undefined);
  const oldestVisual=await service.act(uid,{action:'resume',runId:r.runId});assert.equal(oldestVisual.question.diagram,null);assert.ok(oldestVisual.question.prompt.includes(visual.diagram.description));
  r=(await answer(r,false)).r;assert.deepEqual(r.feedback.diagram,visual.diagram);assert.equal(r.feedback.answerText,visual.choices[visual.answer]);
  assert.deepEqual((await call('resume',{runId:r.runId})).feedback.diagram,visual.diagram);
  const oldFeedback=await service.act(uid,{action:'resume',runId:r.runId});assert.equal(oldFeedback.feedback.diagram,null);assert.ok(oldFeedback.feedback.passage.includes(visual.diagram.description));
  await call('finish',{runId:r.runId});
  r=await start('social:4-2:3','practice');
  r=(await answer(r,false)).r;let reviewChecks=0;
  for(let i=0;i<30&&!(r.learning?.confirmed);i++){
    const before=await secret(r);if(before.question.reviewFor)reviewChecks++;
    const result=await answer(r);r=result.r;
    const saved=(await db.doc(`subjectQuizProgress/${C.VERSION}_${memberId}_deck_social:4-2:3`).get()).data();
    const duplicate=await call('answer',{runId:r.runId,seq:r.seq-1,choice:result.choice});assert.equal(duplicate.duplicate,true);
    assert.deepEqual((await db.doc(`subjectQuizProgress/${C.VERSION}_${memberId}_deck_social:4-2:3`).get()).data(),saved);
  }
  assert.equal(reviewChecks,2);assert.equal(r.learning.confirmed,1);assert.equal(r.learning.pending,0);await call('finish',{runId:r.runId});
  // Calendar-due review survives finishing, a day away and a new service call.
  // Use an untouched unit so the test does not rely on random remaining cards.
  r=await start('social:world-history:2','practice');const calendarWrong=(await secret(r)).question;
  r=(await answer(r,false)).r;await call('finish',{runId:r.runId});
  const calendarRef=db.doc(`subjectQuizProgress/${C.VERSION}_${memberId}_deck_social:world-history:2`);
  const calendarSaved=(await calendarRef.get()).data();assert.equal(calendarSaved.learning.reviews.length,1);
  time=calendarSaved.learning.reviews[0].dueAt;
  r=await start('social:world-history:2','practice');let calendarQuestion=(await secret(r)).question;
  assert.equal(calendarQuestion.reviewFor,calendarWrong.objective);assert.notEqual(calendarQuestion.poolId,calendarWrong.poolId);
  r=(await answer(r)).r;await call('finish',{runId:r.runId});
  time=(await calendarRef.get()).data().learning.reviews[0].dueAt;
  r=await start('social:world-history:2','practice');assert.equal((await secret(r)).question.reviewFor,calendarWrong.objective);
  r=(await answer(r)).r;assert.equal(r.learning.confirmed,1);assert.equal(r.learning.pending,0);await call('finish',{runId:r.runId});
  const req={unitId:'science:4-1:1',mode:'ranking',requestId:crypto.randomUUID()};const a=await call('start',req),b=await call('start',req);assert.equal(a.runId,b.runId);await call('finish',{runId:a.runId});
  const race=await Promise.allSettled([start('social:4-1:1'),start('social:4-1:2')]);assert.equal(race.filter(x=>x.status==='fulfilled').length,1);
  await call('finish',{runId:race.find(x=>x.status==='fulfilled').value.runId});
  // A fresh unit's 150 entries must survive repeated closes, mode changes and
  // service instance restarts. A retried start/resume must not consume another.
  const deckUnit='science:4-2:1',seen=new Set();let last;
  const historyRef=db.doc(`subjectQuizProgress/${C.VERSION}_${memberId}_deck_${deckUnit}`);
  const cycleSize=require('../../functions/subject-quiz/pool').get(deckUnit).size;
  for(let i=0;i<cycleSize;i++){
    const request={unitId:deckUnit,mode:i%2?'practice':'ranking',requestId:crypto.randomUUID()};
    const restarted=createService({db,now:()=>time});
    const current=await restarted.act(uid,{action:'start',...request});
    const persisted=await secret(current);assert.ok(!seen.has(persisted.question.poolId));seen.add(persisted.question.poolId);last=persisted.question.poolId;
    if(i===20){
      const before=(await historyRef.get()).data();await call('start',request);await call('resume',{runId:current.runId});
      assert.deepEqual((await historyRef.get()).data(),before,'retry/resume consumed deck');
    }
    await call('finish',{runId:current.runId});
  }
  assert.equal((await historyRef.get()).data().issued,cycleSize);assert.equal((await historyRef.get()).data().cycle,0);
  const wrap=await start(deckUnit,'practice');assert.notEqual((await secret(wrap)).question.poolId,last);assert.equal((await historyRef.get()).data().cycle,1);await call('finish',{runId:wrap.runId});
  // Wrong answers still consume a question, but never add ranking score. Reads
  // happen before the reward writes; a failed reward must roll back the deck too.
  r=await start('science:4-2:3','practice');
  const atomicRef=db.doc(`subjectQuizProgress/${C.VERSION}_${memberId}_deck_science:4-2:3`);
  const atomicBefore=(await atomicRef.get()).data();rewardFail=true;await assert.rejects(answer(r),/reward unavailable/);rewardFail=false;assert.deepEqual((await atomicRef.get()).data(),atomicBefore);
  const oldQuestion=(await secret(r)).question.poolId;r=(await answer(r,false)).r;assert.notEqual((await secret(r)).question.poolId,oldQuestion);assert.equal((await atomicRef.get()).data().issued,atomicBefore.issued+1);await call('finish',{runId:r.runId});
  await db.doc('quizKingSummary/'+memberId).set({displayName:'테스트',totalScore:9000,categories:[{quizId:'spelling',categoryKey:'맞춤법',score:8900},{quizId:'pokemon',categoryKey:'포켓몬',score:100}]});
  const ranks=await call('rankingSnapshot');const mine=ranks.summaries.find(x=>x.memberUserId===memberId);assert.equal(mine.totalScore,60);assert.equal(mine.categories.some(C.isLegacyRecord),false);
  const personal=await call('memberRankings',{memberUserId:memberId});
  assert.deepEqual(personal.records,ranks.records.filter(x=>x.memberUserId===memberId));
  await assert.rejects(call('memberRankings',{memberUserId:'another-member'}),e=>e.code==='permission-denied');
  const subjectBoard=await call('subjectRankings',{subject:'korean',limit:10});
  assert.deepEqual(subjectBoard.records,ranks.records.filter(x=>x.subject==='korean').sort((a,b)=>b.score-a.score).slice(0,10));
  for(let i=0;i<30;i++)await db.doc(`subjectQuizRankings/${C.VERSION}/math/tie-${String(i).padStart(2,'0')}`).set({nickname:'tie fixture',totalScore:777,visible:i>1});
  const tiedFull=await call('rankingSnapshot'),tiedTop=await call('subjectRankings',{subject:'math',limit:10});
  assert.deepEqual(tiedTop.records,tiedFull.records.filter(x=>x.subject==='math').sort((a,b)=>b.score-a.score).slice(0,10),'cutoff ties preserve legacy display order');
  assert.equal((await db.doc('quizKingSummary/'+memberId).get()).data().totalScore,9000,'legacy archive must remain untouched');
  for(const ctx of [env.unauthenticatedContext(),env.authenticatedContext(uid)])for(const p of ['subjectQuizRuns/'+r.runId,'subjectQuizPlayers/'+memberId,`subjectQuizRankings/${C.VERSION}/korean/${memberId}`,historyRef.path]){await assertFails(getDoc(doc(ctx.firestore(),p)));await assertFails(setDoc(doc(ctx.firestore(),p),{totalScore:999999}));}
  const client=env.authenticatedContext(uid).firestore();
  const record=(id,quizId,categoryKey)=>({recordId:id,memberUserId:memberId,userId:memberId,rankingMode:'normal',legacy:false,hasUserId:true,sourceSheet:'firebase-app',score:1,elapsedSeconds:1,quizId,categoryKey});
  await db.doc('appSettings/featureFlags').set({subjectQuizEnabled:false});
  const beforeId='firebase_subject_before_'+suffix;await assertSucceeds(setDoc(doc(client,'rankingRecords/'+beforeId),record(beforeId,'spelling','맞춤법')));
  await db.doc('appSettings/featureFlags').set({subjectQuizEnabled:true});
  const afterId='firebase_subject_after_'+suffix;await assertFails(setDoc(doc(client,'rankingRecords/'+afterId),record(afterId,'spelling','맞춤법')));
  const popularId='firebase_popular_after_'+suffix;await assertSucceeds(setDoc(doc(client,'rankingRecords/'+popularId),record(popularId,'pokemon-easy','포켓몬쉬움')));
  await db.doc('users/'+memberId).update({active:false});await assert.rejects(call('profile'),e=>e.code==='permission-denied');
  console.log('PASS subject sessions: cumulative 17+20+22=59, hearts/time, full-cycle persistent nonrepeat questions across exits/modes/restarts, exhaustion, start/resume retries, deck/reward atomic rollback, private history denied, legacy exclusion.');
 }finally{await env.cleanup();await deleteApp(app);}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
