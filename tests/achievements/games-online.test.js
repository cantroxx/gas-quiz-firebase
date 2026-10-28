const adminRequire=require('node:module').createRequire(require.resolve('../../functions/package.json'));
'use strict';
const assert=require('node:assert/strict');
assert.match(process.env.FIRESTORE_EMULATOR_HOST||'',/^127\.0\.0\.1:/);
const {initializeApp,deleteApp}=adminRequire('firebase-admin/app'),{getFirestore}=adminRequire('firebase-admin/firestore');
const app=initializeApp({projectId:'demo-dj48-rules'},'honors'),db=getFirestore(app);
(async()=>{
 const uid='honor-auth',member='honor-member';let time=1000000;
 await db.doc('authLinks/'+uid).set({memberUserId:member});await db.doc('users/'+member).set({authUid:uid,status:'active',active:true,nickname:'게임 친구'});
 const hearts=async()=>Number((await db.doc('users/'+member).get()).data().gameHonors?.hearts||0);
 const tower=require('../../functions/cloud-tower/service').createService({db,now:()=>time});
 for(const n of [14,15]){
  const run=await tower.act(uid,{action:'createRun'});const ref=db.doc('cloudTowerRuns/'+run.runId),saved=(await ref.get()).data();
  saved.state.cleared=n;saved.state.floor=30;await ref.set(saved);time+=125000;
  await tower.act(uid,{action:'finish',runId:run.runId});await tower.act(uid,{action:'finish',runId:run.runId});
  assert.equal(await hearts(),n===15?1:0);
 }
 const study=require('../../functions/study-town/service').createService({db,now:()=>time}),D=require('../../functions/study-town/study-domain');
 const connection=await study.act(uid,{action:'connect'});
 for(const rooms of [9,10]){
  const run=await study.act(uid,{action:'start',token:connection.token,tier:'beginner',units:[D.units[0].id]});const ref=db.doc('studyTownRuns/'+run.runId);
  await ref.set({questions:{a:{correct:true},b:{correct:false},c:{correct:true}}},{merge:true});
  const payload={action:'finish',token:connection.token,runId:run.runId,metrics:{rooms,bosses:Math.floor(rooms/6)}};
  await study.act(uid,payload);await study.act(uid,payload);assert.equal(await hearts(),rooms===10?2:1);
 }
 class Err extends Error{constructor(code,msg){super(msg);this.code=code;}}
 const survivor=require('../../functions/growth/survivor').createService({db,ErrorType:Err,authorize:async()=>{},now:()=>time});
 for(const victory of [false,true]){const run=await survivor(uid,{action:'startRun'});time+=610000;const payload={action:'finishRun',runId:run.runId,score:2000,victory};await survivor(uid,payload);await survivor(uid,payload);assert.equal(await hearts(),victory?3:2);}
 console.log('PASS hearts: tower 14/15, study 9/10, survivor win/loss, repeated finishes award once');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>deleteApp(app));
