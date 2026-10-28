const adminRequire=require('node:module').createRequire(require.resolve('../../functions/package.json'));
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {initializeApp,deleteApp}=adminRequire('firebase-admin/app');
const {getFirestore}=adminRequire('firebase-admin/firestore');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc,getDocs,collection,onSnapshot}=require('firebase/firestore');
const {createService}=require('../../functions/cloud-tower/service');
const D=require('../../functions/cloud-tower/domain');
async function main(){
  assert.match(process.env.FIRESTORE_EMULATOR_HOST||'', /^127\.0\.0\.1:\d+$/, 'Demo emulator only.');
  assert.equal(fs.readFileSync('public/cloud-tower/domain.js','utf8'),fs.readFileSync('functions/cloud-tower/domain.js','utf8'),'Server/client course must be identical');
  const projectId='demo-dj48-rules',app=initializeApp({projectId},'cloud-tower-test'),db=getFirestore(app);
  const env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:Number(process.env.FIRESTORE_EMULATOR_HOST.split(':')[1]),rules:fs.readFileSync('firestore.rules','utf8')}});
  let time=1000000;const service=createService({db,now:()=>time});
  const call=(uid,action,rest={})=>service.act(uid,{action,...rest});
  const rejects=async(p,code)=>assert.rejects(p,error=>error.code===code);
  try{
    for(const uid of ['ct-a','ct-b','ct-c','ct-d','ct-e','ct-f','ct-inactive']){
      await db.doc('authLinks/'+uid).set({memberUserId:'member-'+uid});
      await db.doc('users/member-'+uid).set({authUid:uid,nickname:uid==='ct-a'?'<탐험가 A>':uid,status:uid==='ct-inactive'?'inactive':'active',active:uid!=='ct-inactive'});
    }
    await rejects(call(null,'profile'),'unauthenticated');await rejects(call('outsider','profile'),'permission-denied');await rejects(call('ct-inactive','profile'),'permission-denied');
    const run=await call('ct-a','createRun');assert.equal(run.state.score,0);assert.equal(run.startAt,time+4000);
    await rejects(call('ct-a','createRun'),'failed-precondition');await rejects(call('ct-b','resumeRun',{runId:run.runId}),'permission-denied');
    await rejects(call('ct-a','submit',{runId:run.runId,seq:1,trace:['구름']}),'failed-precondition');
    time+=5000;const accepted=await call('ct-a','submit',{runId:run.runId,seq:1,trace:['구','구름'],score:999999999});assert.equal(accepted.state.score,135);
    const duplicate=await call('ct-a','submit',{runId:run.runId,seq:1,trace:['구','구름']});assert.equal(duplicate.duplicate,true);assert.equal(duplicate.state.score,135);
    await rejects(call('ct-a','submit',{runId:run.runId,seq:1,trace:['다른 입력']}),'failed-precondition');
    assert.equal((await db.collection('growthActivities').where('source','==','tower:'+run.runId+':1').get()).size,1);
    await rejects(call('ct-a','submit',{runId:run.runId,seq:2,trace:['무지개']}),'resource-exhausted');
    time+=1500;await rejects(call('ct-a','submit',{runId:run.runId,seq:2,trace:['틀린 문장']}),'invalid-argument');
    const second=await call('ct-a','submit',{runId:run.runId,seq:2,trace:['무지게','무지개']});assert.equal(second.state.floor,2);assert.ok(D.accuracy(second.state)<100);
    time+=150000;const finished=await call('ct-a','finish',{runId:run.runId});assert.equal(finished.state.reason,'storm');assert.equal(finished.ranked,true);
    const rankPath=`cloudTowerRanking/${D.VERSION}/entries/ct-a`,first=(await db.doc(rankPath).get()).data();assert.equal(first.score,finished.state.score);assert.ok(!('memberUserId' in first));
    const short=await call('ct-a','createRun');time+=5000;await call('ct-a','submit',{runId:short.runId,seq:1,trace:['구름']});time+=150000;await call('ct-a','finish',{runId:short.runId});assert.equal((await db.doc(rankPath).get()).data().score,first.score);
    const room=(await call('ct-a','createRoom')).room;
    const joins=await Promise.allSettled(['ct-b','ct-c','ct-d','ct-e'].map(uid=>call(uid,'joinRoom',{code:room.code})));
    assert.equal(joins.filter(result=>result.status==='fulfilled').length,3);
    let current=(await db.doc('cloudTowerRooms/'+room.code).get()).data();assert.equal(current.players.length,4);const ids=current.participantIds;
    await rejects(call('ct-f','startRoom',{code:room.code}),'permission-denied');await rejects(call('ct-a','startRoom',{code:room.code}),'failed-precondition');
    for(const uid of ids)await call(uid,'ready',{code:room.code,ready:true});
    current=(await call('ct-a','startRoom',{code:room.code})).room;assert.equal(current.startAt,time+5000);assert.equal(current.status,'playing');
    const client=env.authenticatedContext(ids[1]).firestore();let observed=null;const stop=onSnapshot(doc(client,'cloudTowerRooms/'+room.code),snap=>{observed=snap.data();});
    time+=6500;const firstPlayer=current.players[0];await call(firstPlayer.uid,'submit',{runId:firstPlayer.runId,seq:1,trace:['구름']});
    for(let i=0;i<80&&!observed?.players.some(p=>p.uid===firstPlayer.uid&&p.floor===1);i++)await new Promise(resolve=>setTimeout(resolve,50));
    assert.equal(observed.players.find(p=>p.uid===firstPlayer.uid).floor,1);stop();
    await call(ids[1],'leaveRoom',{code:room.code});time+=130000;current=(await call('ct-a','syncRoom',{code:room.code})).room;
    assert.equal(current.status,'finished');assert.equal(current.players.find(p=>p.uid===ids[1]).status,'abandon');
    assert.equal((await db.doc(`cloudTowerRanking/${D.VERSION}/entries/${ids[1]}`).get()).exists,false);
    // Rules: private gameplay server-owned; only active linked members see rankings, only participants see rooms.
    const guest=env.unauthenticatedContext().firestore(),anonymous=env.authenticatedContext('outsider').firestore(),member=env.authenticatedContext('ct-f').firestore(),inactive=env.authenticatedContext('ct-inactive').firestore();
    await assertFails(getDoc(doc(guest,rankPath)));await assertFails(getDoc(doc(anonymous,rankPath)));await assertFails(getDoc(doc(inactive,rankPath)));await assertSucceeds(getDoc(doc(member,rankPath)));
    await assertFails(setDoc(doc(member,rankPath),{score:99999}));await assertFails(getDoc(doc(member,'cloudTowerRooms/'+room.code)));await assertFails(getDocs(collection(client,'cloudTowerRooms')));
    await assertSucceeds(getDoc(doc(client,'cloudTowerRooms/'+room.code)));await assertFails(setDoc(doc(client,'cloudTowerRooms/'+room.code),{status:'finished'}));
    for(const privatePath of ['cloudTowerRuns/'+run.runId,'cloudTowerPlayers/ct-a']){await assertFails(getDoc(doc(env.authenticatedContext('ct-a').firestore(),privatePath)));await assertFails(setDoc(doc(member,privatePath),{}));}
    // Waiting room host migration, closed room, and leaving release the account lock.
    const other=(await call('ct-f','createRoom')).room;const spare=['ct-b','ct-c','ct-d','ct-e'].find(uid=>!ids.includes(uid));await call(spare,'joinRoom',{code:other.code});await call('ct-f','leaveRoom',{code:other.code});assert.equal((await db.doc('cloudTowerRooms/'+other.code).get()).data().hostUid,spare);
    await call(spare,'leaveRoom',{code:other.code});assert.equal((await db.doc('cloudTowerRooms/'+other.code).get()).data().status,'closed');
    console.log('Cloud Tower online: server scoring, idempotency, sequence/timing rejection, best records, 4-player concurrent joins, ready/start authorization, two-client live propagation, abandon, disconnect deadline, host migration and privacy/write-denial Rules passed.');
  }finally{await env.cleanup();await deleteApp(app);}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
