'use strict';
const assert=require('node:assert/strict');
const {initializeApp,deleteApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc}=require('firebase/firestore');
const {scenarios}=require('./followup-scenarios');
(async()=>{
 assert(process.env.FIRESTORE_EMULATOR_HOST,'Demo emulator required');
 const app=initializeApp({projectId:'demo-dj48-rules'},'followup-tests'),db=getFirestore(app),classId='FOLLOWUP-TEST';
 const [host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');
 const env=await initializeTestEnvironment({projectId:'demo-dj48-rules',firestore:{host,port:Number(port),rules:require('node:fs').readFileSync('firestore.rules','utf8')}});
 const cleanLogs=async()=>{const snap=await db.collection('rewardLogs').where('classId','==',classId).get();for(const row of snap.docs)await row.ref.delete();};
 try{
  await cleanLogs();
  await db.recursiveDelete(db.doc('classrooms/'+classId));
  await scenarios({db,classId,settings:{grade:'followup-test',classNumber:'8'},seed:(p,v)=>db.doc(p).set(v),get:async p=>(await db.doc(p).get()).data()});
  const client=env.authenticatedContext('uid-F-S1').firestore();
  for(const name of ['Control','Config','Fund','Inventory','Deposits','Requests','Observations','Archives','Profiles','Ledger','Plots','Lottery','Tickets','Settlements','RoutineDays','RequestsOnce']){
    await assertFails(getDoc(doc(client,`classrooms/${classId}/continuity${name}/secret`)));await assertFails(setDoc(doc(client,`classrooms/${classId}/continuity${name}/fake`),{memberUserId:'F-S1',quantity:100}));
  }
  console.log('PASS followup real Firestore: transactions/concurrency and all 16 private collection direct read/write denials.');
 }finally{await cleanLogs();await db.recursiveDelete(db.doc('classrooms/'+classId));for(const id of ['F-S1','F-S2','F-other']){await db.doc('users/'+id).delete();await db.doc('userEconomy/'+id).delete();}await env.cleanup();await deleteApp(app);}
})().catch(e=>{console.error(e);process.exitCode=1;});
