'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const {initializeApp,deleteApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore');
const {initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc}=require('firebase/firestore');
const {createService}=require('../../functions/space-assessment/service'),Q=require('../../functions/space-assessment/questions');
const token=()=>crypto.randomBytes(32).toString('hex');
async function main(){
 assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8181');const app=initializeApp({projectId:'demo-dj48-rules'},'space-test'),db=getFirestore(app);
 const env=await initializeTestEnvironment({projectId:'demo-dj48-rules',firestore:{host:'127.0.0.1',port:8181,rules:fs.readFileSync('firestore.rules','utf8')}});
 let now=Date.now();const service=createService({db,now:()=>now,authorize:async uid=>({isSuperAdmin:uid==='admin'})});
 const call=(action,p,uid)=>service.act({action,...p},uid),reject=(p,code)=>assert.rejects(p,e=>e.code===code);
 try{
 const cls={school:'우주테스트'+now,grade:4,classNo:1},owner=token();
 await reject(call('create',{...cls,lastNumber:3,token:owner}),'unauthenticated');await reject(call('create',{...cls,lastNumber:3,token:owner},'student'),'permission-denied');
 const created=await call('create',{...cls,lastNumber:3,token:owner},'admin'),roomId=created.room.id,teacher={roomId,token:owner};
 assert.equal((await call('create',{...cls,lastNumber:3,token:owner},'admin')).room.id,roomId);
 const tokens=[token(),token()],joined=await Promise.allSettled(tokens.map(token=>call('join',{...cls,number:1,token})));assert.equal(joined.filter(x=>x.status==='fulfilled').length,1);
 const student={roomId,number:1,token:tokens[joined.findIndex(x=>x.status==='fulfilled')]};
 for(const a of ['teacher','grade','report','resetStudent','close'])await reject(call(a,student),'permission-denied');
 const view=await call('student',student);assert.ok(view.questions.every(q=>!('answer'in q)&&!('why'in q)));assert.ok(!view.result);
 await reject(call('submit',student),'failed-precondition');
 await reject(call('save',{...student,questionId:1,answer:JSON.stringify({value:[0,1],evidence:[]}),revision:0}),'invalid-argument');
 const answer=q=>JSON.stringify({value:q.type==='short'?'띠 모양 구름과 붉은 점이 보여요.':q.answer,evidence:q.days?q.days.map(d=>`${q.target}:${d}`):[q.target]});
 for(let i=0;i<Q.questions.length;i++)await call('save',{...student,questionId:i+1,answer:answer(Q.questions[i]),revision:i});
 await call('save',{...student,questionId:1,answer:JSON.stringify({value:[2],evidence:['moon']}),revision:25});
 await reject(call('save',{...student,questionId:2,answer:answer(Q.questions[1]),revision:3}),'aborted');
 await call('submit',student);await call('submit',student);await reject(call('save',{...student,questionId:1,answer:answer(Q.questions[0]),revision:26}),'failed-precondition');
 const second={roomId,number:2,token:token()};await call('join',{...cls,...second});await call('resetStudent',{...teacher,number:2});await reject(call('student',second),'permission-denied');second.token=token();await call('join',{...cls,...second});
 await reject(call('grade',teacher),'failed-precondition');const result=await call('grade',{...teacher,confirmIncomplete:true});assert.equal(result.report.students[0].correct,24);assert.equal(result.report.automaticTotal,25);assert.equal(result.report.manualTotal,0);assert.equal(result.report.students[0].manual.length,0);assert.deepEqual(result.report.absent,[3]);
 const after=await call('student',student);assert.ok(!after.result&&!after.report);assert.ok(after.questions.every(q=>!q.answer&&!q.why));assert.ok(!JSON.stringify(after).includes('tokenHash'));
 for(const context of [env.unauthenticatedContext(),env.authenticatedContext('admin')])for(const name of [`spaceAssessmentSessions/${roomId}`,`spaceAssessmentSessions/${roomId}/students/1`,'spaceAssessmentDirectory/test']){await assertFails(getDoc(doc(context.firestore(),name)));await assertFails(setDoc(doc(context.firestore(),name),{score:999}));}
 await call('close',teacher);assert.equal((await call('report',teacher)).report.students[0].correct,24);const next=await call('create',{...cls,lastNumber:3,token:token()},'admin');assert.notEqual(next.room.id,roomId);now+=13*3600000;await reject(call('join',{...cls,number:1,token:token()}),'failed-precondition');
 console.log('Space classroom PASS: admin-only create, duplicate numbers, revision/retry, evidence validation, submission freeze, teacher-only scores, no student answer keys or explanations even after grading, resume/reset, closure/expiry and SDK denial.');
 }finally{await env.cleanup();await deleteApp(app);}
}main().catch(e=>{console.error(e);process.exitCode=1;});
