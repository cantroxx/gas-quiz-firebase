'use strict';
// Real Firestore transactions + client rules, strictly on the demo emulator.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { initializeTestEnvironment, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, collection, getDocs } = require('firebase/firestore');
const { createService } = require('../../functions/classroom/diary');
class AppError extends Error { constructor(code,message){super(message);this.code=code;} }

(async()=>{
  assert(process.env.FIRESTORE_EMULATOR_HOST, 'Refusing to run without Firestore emulator');
  const projectId='demo-dj48-rules', app=initializeApp({projectId},'classroom-diary-tests'), db=getFirestore(app);
  const [host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');
  const env=await initializeTestEnvironment({projectId,firestore:{host,port:Number(port),rules:fs.readFileSync(process.env.CLASSROOM_DIARY_RULES || 'firestore.rules','utf8')}});
  const classId='DIARY-TEST', day='2026-10-17';
  const people={ 'diary-a':{uid:'diary-uid-a',classId},'diary-b':{uid:'diary-uid-b',classId},'diary-other':{uid:'diary-uid-other',classId:'OTHER'},'diary-teacher':{uid:'diary-uid-teacher',classId,isTeacher:true} };
  try {
    await db.recursiveDelete(db.doc(`classrooms/${classId}`));
    for(const [id,p] of Object.entries(people))await db.doc(`users/${id}`).set({...p,nickname:id});
    let stamp=1000;
    const act=createService({db,ErrorType:AppError,today:()=>day,now:()=>++stamp,
      authorize:async(tx,member,uid,cid)=>{
        const record=(await tx.get(db.doc(`users/${member}`))).data();
        if(!record||record.uid!==uid||record.classId!==cid)throw new AppError('permission-denied','scope');
        return {...record,member};
      },
      authorFor:async(tx,member,cid)=>{
        const record=(await tx.get(db.doc(`users/${member}`))).data();
        if(!record||record.classId!==cid)return null;
        return {memberUserId:member,nickname:record.nickname,portraitSource:'avatar',profileImageUrl:'https://example.test/avatar.png'};
      }
    });
    const as=(member,extra={})=>act(people[member]?.uid,{classId,memberUserId:member,dateKey:day,action:'read',...extra});
    const reject=async(p,code)=>assert.rejects(p,e=>e.code===code);
    await reject(act('',{}),'unauthenticated');
    await reject(act(people['diary-b'].uid,{classId,memberUserId:'diary-a',dateKey:day,action:'read'}),'permission-denied');
    await reject(as('diary-other'),'permission-denied');
    for(const dateKey of ['2026-02-30','2026-10-18','bad','2019-12-31'])await reject(as('diary-a',{dateKey}),'invalid-argument');
    await reject(as('diary-a',{ownerId:'../bad'}),'invalid-argument');
    const initial=await as('diary-a');assert.equal(initial.entry.visibility,'private');assert.equal(initial.entry.revision,0);
    const save={action:'save',mood:'happy',text:'나의 비밀 일기',visibility:'private',revision:0};
    await as('diary-a',save);
    await reject(as('diary-b',{ownerId:'diary-a'}),'permission-denied');
    await reject(as('diary-teacher',{ownerId:'diary-a'}),'permission-denied');
    assert.equal((await as('diary-b',{action:'list'})).entries.length,0);
    await reject(as('diary-a',{...save,revision:1,text:'x'.repeat(1001)}),'invalid-argument');
    await reject(as('diary-a',{...save,revision:1,mood:'unknown'}),'invalid-argument');
    await as('diary-a',{...save,visibility:'class',revision:1,text:'친구들과 함께 읽었어요.'});
    assert.equal((await as('diary-b',{action:'list'})).entries.length,1);
    const publicRead=await as('diary-b',{ownerId:'diary-a'});assert.equal(publicRead.author.portraitSource,'avatar');
    await reject(as('diary-b',{...save,ownerId:'diary-a',revision:2}),'permission-denied');
    await reject(as('diary-b',{action:'moderate',ownerId:'diary-a',revision:2}),'permission-denied');
    const comment={action:'comment',ownerId:'diary-a',commentId:'retry-safe-id',text:'같이 읽자!'};
    await Promise.all([as('diary-b',comment),as('diary-b',comment)]);
    let read=await as('diary-a');assert.equal(read.comments.length,1,'Network retries must not duplicate comments');
    await reject(as('diary-a',{...comment,text:'위조'}),'already-exists');
    await reject(as('diary-a',{action:'editComment',commentId:'retry-safe-id',text:'바꾸기',revision:1}),'permission-denied');
    await as('diary-b',{action:'editComment',ownerId:'diary-a',commentId:'retry-safe-id',text:'내일도 같이 읽자!',revision:1});
    await reject(as('diary-b',{action:'editComment',ownerId:'diary-a',commentId:'retry-safe-id',text:'오래된 수정',revision:1}),'aborted');
    await as('diary-teacher',{action:'moderateComment',ownerId:'diary-a',commentId:'retry-safe-id',revision:2});
    assert.equal((await as('diary-a')).comments.length,0);
    assert.equal((await as('diary-teacher',{ownerId:'diary-a'})).comments[0].hidden,true);
    await as('diary-a',{...save,revision:2,visibility:'private'});
    await reject(as('diary-b',{...comment,commentId:'after-private'}),'permission-denied');
    await reject(as('diary-teacher',{action:'moderate',ownerId:'diary-a',revision:3}),'permission-denied');
    assert.equal((await as('diary-a')).comments.length,0);
    // Concurrent edits cannot silently overwrite one another.
    const races=await Promise.allSettled([as('diary-a',{...save,revision:3,text:'첫 창'}),as('diary-a',{...save,revision:3,text:'둘째 창'})]);
    assert.equal(races.filter(r=>r.status==='fulfilled').length,1);assert.equal(races.find(r=>r.status==='rejected').reason.code,'aborted');
    await as('diary-a',{...save,revision:4,visibility:'class'});
    await as('diary-teacher',{action:'moderate',ownerId:'diary-a',revision:5});
    await reject(as('diary-b',{ownerId:'diary-a'}),'permission-denied');
    assert.equal((await as('diary-b',{action:'list'})).entries.length,0);
    assert.equal((await as('diary-teacher',{action:'list'})).entries[0].hidden,true);
    await as('diary-a',{...save,revision:6,visibility:'class',text:'수정해도 숨김 유지'});
    await reject(as('diary-b',{ownerId:'diary-a'}),'permission-denied');
    await as('diary-teacher',{action:'moderate',ownerId:'diary-a',revision:7});
    // Delete + recreation must not resurrect old comments or their authors.
    await as('diary-a',{action:'delete',revision:8});
    await as('diary-a',{...save,revision:9,visibility:'class',text:'새 일기'});
    assert.equal((await as('diary-a')).comments.length,0);
    await as('diary-b',{...comment,commentId:'new-generation'});
    await as('diary-b',{action:'deleteComment',ownerId:'diary-a',commentId:'new-generation',revision:1});
    assert.equal((await as('diary-a')).comments.length,0);
    // Moving class immediately removes access to old-class entries and comments.
    await db.doc('users/diary-a').update({classId:'OTHER'});
    await reject(as('diary-b',{ownerId:'diary-a'}),'permission-denied');
    assert.equal((await as('diary-b',{action:'list'})).entries.length,0);
    const student=env.authenticatedContext('diary-uid-b').firestore();
    const privatePath=`classrooms/${classId}/diaryEntries/diary-a_${day}`;
    await assertFails(getDoc(doc(student,privatePath)));
    await assertFails(getDocs(collection(student,`classrooms/${classId}/diaryEntries`)));
    await assertFails(setDoc(doc(student,privatePath),{text:'직접 쓰기'}));
    await assertFails(getDoc(doc(student,`${privatePath}/comments/retry-safe-id`)));
    await assertFails(setDoc(doc(student,`${privatePath}/comments/direct`),{text:'직접 댓글'}));
    assert.equal((await db.doc('userEconomy/diary-a').get()).exists,false,'Diary must not create economy records');
    console.log('PASS classroom diary: real transactions, private/class scope, teacher moderation, ownership, selected portraits, retries, revisions, delete/recreate, moved class, denied direct Firestore access, no economy writes.');
  } finally {
    await db.recursiveDelete(db.doc(`classrooms/${classId}`));
    for(const id of Object.keys(people))await db.doc(`users/${id}`).delete();
    await env.cleanup();await deleteApp(app);
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
