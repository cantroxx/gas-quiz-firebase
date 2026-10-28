'use strict';
// Verify the exact release callable and its deployed authorization/profile helpers.
const assert = require('node:assert/strict');
const path = require('node:path');
assert(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator is required');
assert.equal(process.env.GCLOUD_PROJECT, 'demo-dj48-rules', 'Only the demo project is allowed');
const index = path.resolve(process.env.CLASSROOM_DIARY_CANDIDATE_INDEX || 'functions/index.js');
const callable = require(index).classroomDiaryAction;
const candidateRequire = require('node:module').createRequire(index);
const {getFirestore} = candidateRequire('firebase-admin/firestore');
const {getApps,deleteApp} = candidateRequire('firebase-admin/app');
const db = getFirestore();
const classId = 'DIARY-CALLABLE-TEST', dateKey = '2026-10-17';
const ids = ['diary-call-a','diary-call-b','diary-call-other','diary-call-teacher'];
const call = (member, data={}) => callable.run({auth:{uid:'uid-'+member},data:{classId,dateKey,memberUserId:member,action:'read',...data}});
const denied = promise => assert.rejects(promise,error=>error.code==='permission-denied');
(async()=>{
  try {
    await db.doc('classrooms/'+classId).set({grade:'4',classNumber:'8'});
    for(const id of ids) await db.doc('users/'+id).set({userId:id,authUid:'uid-'+id,nickname:id,role:id.endsWith('teacher')?'admin':'student',status:'active',active:true,grade:'4',classNumber:id.endsWith('other')?'9':'8',adminLevel:'classAdmin',adminScopeGrade:'4',adminScopeClassNumber:'8'});
    const profile=db.doc(`classrooms/${classId}/studentProfiles/${ids[0]}`);
    await profile.set({portrait:{source:'avatar',avatar:{url:'https://example.test/selected-avatar.png'},photo:{url:'https://example.test/my-image.png'}}});
    const save={action:'save',mood:'happy',text:'실제 callable 검증',visibility:'private',revision:0};
    await call(ids[0],save);
    assert.equal((await call(ids[0])).author.portraitSource,'avatar');
    await denied(call(ids[1],{ownerId:ids[0]}));
    await denied(call(ids[3],{ownerId:ids[0]}));
    await denied(call(ids[2],{ownerId:ids[0]}));
    await denied(callable.run({auth:{uid:'uid-'+ids[1]},data:{classId,dateKey,memberUserId:ids[0],action:'read'}}));
    await call(ids[0],{...save,visibility:'class',revision:1});
    await call(ids[1],{action:'comment',ownerId:ids[0],commentId:'callable-comment',text:'함께하자!'});
    assert.equal((await call(ids[0])).comments.length,1);
    await profile.update({'portrait.source':'photo'});
    assert.equal((await call(ids[1],{ownerId:ids[0]})).author.profileImageUrl,'https://example.test/my-image.png');
    await call(ids[3],{action:'moderate',ownerId:ids[0],revision:2});
    await denied(call(ids[1],{ownerId:ids[0]}));
    await call(ids[3],{action:'moderate',ownerId:ids[0],revision:3});
    await db.doc('users/'+ids[0]).update({classroomHidden:true});
    assert.equal((await call(ids[1],{action:'list'})).entries.length,0);
    await db.doc('users/'+ids[0]).update({classroomHidden:false,active:false});
    await denied(call(ids[1],{ownerId:ids[0]}));
    await db.doc('users/'+ids[0]).update({active:true,classNumber:'9'});
    await denied(call(ids[1],{ownerId:ids[0]}));
    for(const id of ids) assert.equal((await db.doc('userEconomy/'+id).get()).exists,false);
    console.log('PASS release callable: real auth helpers, member binding, class scope, private teacher denial, selected photo/avatar, comments, teacher moderation, hidden/inactive/moved authors, no economy writes.');
  } finally {
    await db.recursiveDelete(db.doc('classrooms/'+classId));
    for(const id of ids) await db.doc('users/'+id).delete();
    await Promise.all(getApps().map(deleteApp));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
