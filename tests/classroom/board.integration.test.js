'use strict';
const assert=require('node:assert/strict');
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {createService}=require('../../functions/classroom/board');
const D=require('../../functions/classroom/board-domain');
const {initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc}=require('firebase/firestore');
class AppError extends Error{constructor(code,message){super(message);this.code=code;}}
(async()=>{
 assert(process.env.FIRESTORE_EMULATOR_HOST,'Demo emulator required');
 const app=initializeApp({projectId:'demo-dj48-rules'},'board-tests'),db=getFirestore(app),classId='BOARD-TEST';
 const [host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');
 const rulesEnv=await initializeTestEnvironment({projectId:'demo-dj48-rules',firestore:{host,port:Number(port),rules:require('node:fs').readFileSync('firestore.rules','utf8')}});
 let time=Date.parse('2026-10-21T10:00:00+09:00');
 const ref=db.collection('classrooms').doc(classId),quest={id:'reading',title:'독서록',active:true,saveEnabled:true,repeatRule:'daily',rewardMode:'teacherReview',rewardCoin:10,linkedGemIds:['reading-a','reading-b'],gemTargetXp:2,submissionType:'text'};
 const settings={grade:'board-grade',classNumber:'8',quests:[quest,{...quest,id:'once',repeatRule:'once',rewardMode:'auto',submissionType:'complete',linkedGemIds:[]},{...quest,id:'weekly',repeatRule:'weekly',linkedGemIds:[]}]};
 const people={'board-s1':{role:'student'},'board-s2':{role:'student'},'board-t':{role:'admin'},'board-other':{role:'student',classNumber:'9'}};
 const service=createService({db,ErrorType:AppError,now:()=>time,authorize:async(tx,id,uid,cid)=>{const [user,c]=await Promise.all([tx.get(db.doc('users/'+id)),tx.get(db.doc('classrooms/'+cid))]);if(!user.exists||user.data().uid!==uid||user.data().classNumber!=='8'||cid!==classId)throw new AppError('permission-denied','scope');return {settings:c.data(),isTeacher:user.data().role==='admin'};}});
 const as=(who,p={})=>service('uid-'+who,{classId,memberUserId:who,...p});
 const teacher=p=>as('board-t',{questId:'reading',targetMemberUserId:'board-s1',...p});
 const reject=(promise,code)=>assert.rejects(promise,e=>e.code===code);
 try{
  await db.recursiveDelete(ref);await ref.set(settings);
  for(const [id,p]of Object.entries(people))await db.doc('users/'+id).set({grade:'board-grade',classNumber:'8',active:true,status:'active',uid:'uid-'+id,studentNumber:id.endsWith('s1')?1:2,nickname:id,...p});
  for(const id of ['board-s1','board-s2']){await ref.collection('studentWallets').doc(id).set({point:20.25,pointBoostAmount:.5});await db.doc('userEconomy/'+id).set({djCoin:8});}
  for(const gemId of ['reading-a','reading-b'])await ref.collection('classroomGems').doc(gemId).set({gemName:'독서젬',targetXp:1,rewardPoint:3,rewardCoin:2});
  await reject(service('',{}),'unauthenticated');await reject(as('board-s1',{action:'list'}),'permission-denied');await reject(as('board-other',{action:'list'}),'permission-denied');
  await reject(teacher({action:'complete',targetMemberUserId:'board-t'}),'permission-denied');await reject(teacher({action:'complete',dateKey:'2026-02-30'}),'invalid-argument');
  await reject(as('board-s1',{action:'submit',questId:'reading',submission:{text:''}}),'invalid-argument');
  const submit=await as('board-s1',{action:'submit',questId:'reading',submission:{text:'오늘의 독서 기록'}});assert.equal(submit.rewardStatus,'pending_teacher_review');
  let list=await teacher({action:'list'});assert.equal(list.students.length,2);assert.equal(list.students[0].submission,undefined);
  list=await teacher({action:'list',private:true});assert.equal(list.students[0].submission.submission.text,'오늘의 독서 기록');
  const raced=await Promise.all([teacher({action:'complete'}),teacher({action:'complete'})]);assert.equal(raced.filter(r=>r.duplicate).length,1);
  let wallet=(await ref.collection('studentWallets').doc('board-s1').get()).data();assert.equal(wallet.point,36.75,'10 + .5 boost + two 3P gem rewards');assert.equal((await db.doc('userEconomy/board-s1').get()).data().djCoin,12);
  const r=(await teacher({action:'list'})).students[0].record;
  await reject(teacher({action:'cancel',reason:'검증',expectedRevision:r.revision-1}),'aborted');
  await teacher({action:'cancel',reason:'잘못 체크',expectedRevision:r.revision,requestId:'cancel-1'});assert.equal((await ref.collection('studentWallets').doc('board-s1').get()).data().point,20.25);assert.equal((await db.doc('userEconomy/board-s1').get()).data().djCoin,8);
  await teacher({action:'cancel',reason:'잘못 체크',expectedRevision:r.revision,requestId:'cancel-1'});assert.equal((await ref.collection('studentWallets').doc('board-s1').get()).data().point,20.25,'Cancel retry never double debits');
  await teacher({action:'complete',requestId:'recomplete'});assert.equal((await ref.collection('studentWallets').doc('board-s1').get()).data().point,36.75);
  await teacher({action:'complete',requestId:'recomplete'});assert.equal((await ref.collection('studentWallets').doc('board-s1').get()).data().point,36.75);
  await reject(teacher({action:'cancel',requestId:'recomplete',reason:'다른 요청'}),'already-exists');
  await ref.collection('studentWallets').doc('board-s1').update({point:0});await reject(teacher({action:'cancel',reason:'잔액 부족'}),'failed-precondition');assert.equal((await ref.collection('studentGemProgress').doc('board-s1__reading-a').get()).data().currentXp,1);
  await ref.collection('studentWallets').doc('board-s1').update({point:36.75});await ref.collection('studentGemProgress').doc('board-s1__reading-a').update({currentXp:2});await reject(teacher({action:'cancel',reason:'후속 젬 변경'}),'failed-precondition');assert.equal((await ref.collection('studentWallets').doc('board-s1').get()).data().point,36.75);
  await as('board-s2',{action:'submit',questId:'once'});time+=86400000;const once=await as('board-s2',{action:'submit',questId:'once'});assert.equal(once.duplicate,true,'Once quests cannot pay on a second day');
  const nextDay=await teacher({action:'list'});assert.equal(nextDay.students[0].record,null,'Daily completion separates days');
  await teacher({action:'complete',questId:'weekly'});time+=86400000;assert.equal((await teacher({action:'list',questId:'weekly'})).students[0].record.rewardStatus,'paid');time+=4*86400000;assert.equal((await teacher({action:'list',questId:'weekly'})).students[0].record,null);
  // Read-only imported history blocks all completion paths for the same period.
  const input={version:1,source:'grownd',asOf:'2026-10-20',students:[{sourceId:'g1',point:12.34,heartberry:56.78},{sourceId:'g2',point:1,heartberry:2}],maps:{students:{g1:'board-s1',g2:'board-s2'},quests:{old:'reading'},gems:{}},records:[{sourceId:'h1',studentId:'g1',questId:'old',dateKey:'2026-10-20',status:'completed',rewardPaid:true,gemIds:[]}]};
  const before=(await ref.collection('studentWallets').doc('board-s1').get()).data().point;
  const preview=await teacher({action:'previewImport',input});assert.equal(preview.ready,true);assert.equal(preview.totals.point,13.34);assert.equal(preview.wallets[0].djCoin,56.78);
  const imp=await teacher({action:'importHistory',input});assert.equal(imp.imported,1);assert.equal((await teacher({action:'importHistory',input})).duplicate,1);assert.equal((await ref.collection('studentWallets').doc('board-s1').get()).data().point,before);
  await reject(teacher({action:'complete',dateKey:'2026-10-20'}),'failed-precondition');
  assert.equal((await teacher({action:'list',dateKey:'2026-10-20'})).counts.reading.completed,1,'Archive counts match the student cards');
  const conflict=structuredClone(input);conflict.records[0].rewardPaid=false;await reject(teacher({action:'importHistory',input:conflict}),'already-exists');
  const client=rulesEnv.authenticatedContext('uid-board-s1').firestore();
  for(const collection of ['boardSubmissions','boardLedgers','boardRequests','boardHistory']) { await assertFails(getDoc(doc(client,`classrooms/${classId}/${collection}/secret`))); await assertFails(setDoc(doc(client,`classrooms/${classId}/${collection}/fake`),{rewardStatus:'paid'})); }
  const progress=await as('board-s2',{action:'progress'});assert.equal(progress.progressMap.once.rewardStatus,'paid');
  console.log('PASS board: authorization, private submissions, daily/weekly/once, concurrent award, two gems, precise points, atomic cancel, replay, insufficient funds, later gem conflict, import preview/archive/no replay.');
 }finally{await db.recursiveDelete(ref);for(const id of Object.keys(people)){await db.doc('users/'+id).delete();await db.doc('userEconomy/'+id).delete();}await rulesEnv.cleanup();await deleteApp(app);}
})().catch(e=>{console.error(e);process.exitCode=1;});
