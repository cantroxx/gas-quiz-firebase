'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {initializeApp,deleteApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore');
const {guard,seedMembers}=require('./emulator-support'),{createEngine}=require('../../functions/classroom/securities/market-engine'),K=require('../../functions/classroom/securities/calendar');
(async()=>{
 const {projectId}=guard();assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9287');
 const app=initializeApp({projectId},'securities-callable-check'),db=getFirestore(app),classId=process.env.SECURITIES_PRODUCTION_TEST?'G4-C8':'SECURITIES-CALLABLE',marketId=process.env.SECURITIES_PRODUCTION_TEST?'coin-v1':'practice-v1',mode=process.env.SECURITIES_PRODUCTION_TEST?'coin':'practice';
 try{
  await db.recursiveDelete(db.doc(`classrooms/${classId}`));const people=await seedMembers(db,classId);
  const signup=await fetch('http://127.0.0.1:9287/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})}).then(r=>r.json());assert(signup.idToken);
  await db.doc(`users/${people.student}`).update({authUid:signup.localId});
  const engine=createEngine({db}),today=K.clock(Date.now()).date,startDate=K.business(today)?today:K.next(today,[],-1);
  await engine.initialize({classId,marketId,startDate,mode});
  await db.doc(`classrooms/${classId}/securitiesMarkets/${marketId}`).update({lifecycle:'enabled',studentAccess:true});
  const call=async(name,data,token=signup.idToken)=>fetch(`http://127.0.0.1:5087/${projectId}/asia-northeast3/${name}`,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({data})}).then(r=>r.json());
  const base={classId,marketId,memberUserId:people.student};
  assert.equal((await call('classroomSecuritiesQuery',{...base,action:'market'},null)).error.status,'UNAUTHENTICATED');
  const market=await call('classroomSecuritiesQuery',{...base,action:'market'});assert.equal(market.result.market.mode,mode);
  const requestId=crypto.randomUUID(),payload={...base,action:'openAccount',requestId};
  const a=await call('classroomSecuritiesAction',payload),b=await call('classroomSecuritiesAction',payload);assert.equal(a.result.opened,true);assert.deepEqual(a,b);
  assert.equal((await call('classroomSecuritiesQuery',{...base,action:'account',memberUserId:people.other})).error.status,'PERMISSION_DENIED');
  assert.equal((await call('classroomSecuritiesAdminAction',{...base,action:'pause',isTeacher:true,requestId:crypto.randomUUID(),expectedRevision:1,reason:'사칭'})).error.status,'PERMISSION_DENIED');
  assert.equal((await call('classroomSecuritiesQuery',{...base,action:'account'})).result.account.cashMinor,mode==='coin'?0:100000);
  if(mode==='coin'){await db.doc(`userEconomy/${people.student}`).set({coin:80});const deposit={...base,action:'deposit',amount:40,requestId:crypto.randomUUID()};const first=await call('classroomSecuritiesAction',deposit);assert.equal(first.result.walletCoin,40);assert.deepEqual(await call('classroomSecuritiesAction',deposit),first);assert.equal((await call('classroomSecuritiesQuery',{...base,classId:'G4-C9',action:'market'})).error.status,'PERMISSION_DENIED');}
  console.log('PASS securities real callable HTTP: Auth Emulator token verification, missing auth, linked owner, teacher spoof rejection, persisted account and duplicate replay.');
 }finally{await db.recursiveDelete(db.doc(`classrooms/${classId}`));for(const id of ['sec-a','sec-b','sec-out','sec-teacher','sec-wrong','sec-inactive'])await db.doc(`users/${id}`).delete();await deleteApp(app);}
})().catch(e=>{console.error(e);process.exitCode=1;});
