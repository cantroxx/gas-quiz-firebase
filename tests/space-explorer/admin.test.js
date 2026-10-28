'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {initializeApp,deleteApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore');
const token=()=>crypto.randomBytes(32).toString('hex');
(async()=>{
 assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8181');
 const app=initializeApp({projectId:'demo-dj48-rules'},'space-admin'),db=getFirestore(app);let active=true,time=Date.now();
 const authorize=async uid=>({isSuperAdmin:uid==='super'&&active,memberUserId:'test-super'});
 const game=require('../../functions/space-assessment/service').createService({db,authorize,now:()=>time});
 const admin=require('../../functions/space-assessment/admin').createAdminService({db,authorize,now:()=>time});
 const call=(action,p={},uid='super')=>admin.act(uid,{action,...p});
 const reject=(p,code)=>assert.rejects(p,e=>e.code===code);
 try{
 await reject(admin.act(null,{action:'adminList'}),'unauthenticated');
 for(const uid of ['student','teacher','classAdmin'])for(const action of ['adminList','adminInspect','adminDelete'])await reject(call(action,{isSuperAdmin:true},uid),'permission-denied');
 const cls={school:'우주총괄검사'+time,grade:4,classNo:1},owner=token();
 const room=(await game.act({action:'create',...cls,lastNumber:3,token:owner},'super')).room;
 const st={roomId:room.id,number:1,token:token()};await game.act({action:'join',...cls,...st});
 const before=await call('adminInspect',{roomId:room.id});assert.equal(before.studentCount,1);assert.equal(before.students[0].answered,0);assert.ok(!JSON.stringify(before).includes('tokenHash'));assert.ok(!JSON.stringify(before).includes('ownerHash'));
 await game.act({action:'save',...st,questionId:1,answer:JSON.stringify({value:[0,1],evidence:['moon']}),revision:0});
 await reject(call('adminDelete',{roomId:room.id,confirmation:room.id,confirmationVersion:before.confirmationVersion}),'failed-precondition');
 active=false;await reject(call('adminList'),'permission-denied');active=true;
 await game.act({action:'grade',roomId:room.id,token:owner,confirmIncomplete:true});
 const detail=await call('adminInspect',{roomId:room.id});assert.equal(detail.report.students[0].correct,1);assert.equal(detail.answerCount,1);
 await reject(call('adminDelete',{roomId:room.id,confirmationVersion:detail.confirmationVersion}),'failed-precondition');
 const removal={roomId:room.id,confirmation:room.id,confirmationVersion:detail.confirmationVersion};await call('adminDelete',removal);assert.equal((await call('adminDelete',removal)).alreadyDeleted,true);
 assert.equal((await db.doc('spaceAssessmentSessions/'+room.id).get()).exists,false);assert.equal((await db.collection('spaceAssessmentSessions/'+room.id+'/students').get()).size,0);
 assert.equal((await db.doc('spaceAssessmentDeletions/'+room.id).get()).data().actorMemberId,'test-super');
 assert.deepEqual(await game.act({action:'create',...cls,lastNumber:3,token:owner},'super'),{deleted:true});
 const older=(await game.act({action:'create',...cls,lastNumber:1,token:token()},'super')).room;time+=13*3600000;
 const newer=(await game.act({action:'create',...cls,lastNumber:1,token:token()},'super')).room;
 const oldDetail=await call('adminInspect',{roomId:older.id});await call('adminDelete',{roomId:older.id,confirmation:older.id,confirmationVersion:oldDetail.confirmationVersion});
 assert.equal((await game.act({action:'join',...cls,number:1,token:token()})).room.id,newer.id);
 for(let i=2;i<29;i++)await game.act({action:'create',...cls,classNo:i,lastNumber:1,token:token()},'super');
 let cursor=null,pages=0;const ids=new Set();do{const list=await call('adminList',{cursor});for(const r of list.rooms){assert.ok(!ids.has(r.id));ids.add(r.id);assert.ok(!('ownerHash'in r));}cursor=list.nextCursor;pages++;}while(cursor);assert.ok(pages>=2);assert.ok(ids.has(newer.id));
 console.log('PASS space total admin: access/revocation, pagination, detail/report, stale-delete rejection, audit, idempotency, recreation prevention and newer-class preservation.');
 }finally{await deleteApp(app);}
})().catch(e=>{console.error(e);process.exitCode=1});
