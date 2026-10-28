'use strict';
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const scope={window:{}};vm.createContext(scope);for(const file of ['problems.js','bank.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'survivor-bank',file),'utf8'),scope);
function createService({db,ErrorType,authorize,now=()=>Date.now()}) {
 const fail=(code,message)=>{throw new ErrorType(code,message);};
 return async(uid,p)=>{
 if(!uid)fail('unauthenticated','로그인이 필요해요.');
 return db.runTransaction(async tx=>{
 const link=(await tx.get(db.collection('authLinks').doc(uid))).data();if(!link?.memberUserId)fail('permission-denied','퀴즈타운 계정을 연결해 주세요.');await authorize(tx,link.memberUserId,uid);
 const control=db.collection('survivorQuizControls').doc(uid),time=now();
 if(p.action==='startRun'){
 const old=(await tx.get(control)).data()||{};
 if(time-Number(old.runStartedAt||0)<3000)fail('resource-exhausted','잠시 후 다시 시작해 주세요.');
 const runId=crypto.randomUUID();tx.set(control,{runId,runStartedAt:time,runFinished:false},{merge:true});return {runId};
 }
 if(p.action==='finishRun'){
 const run=(await tx.get(control)).data()||{};
 if(!run.runId||p.runId!==run.runId)fail('failed-precondition','이번 게임의 기록을 확인해 주세요.');
 if(run.runFinished)return {success:true,duplicate:true};
 const elapsed=Math.floor((time-run.runStartedAt)/1000);
 if(!Number.isInteger(p.score)||p.score<0||p.score>1000000||elapsed<10||elapsed>14400||p.score>elapsed*500+1000)fail('invalid-argument','점수와 게임 시간을 확인해 주세요.');
 if(p.victory===true&&elapsed>=600)require('../achievements/games').award(tx,db,link.memberUserId,'survivor','hearts');
 tx.set(control,{runFinished:true},{merge:true});
 require('./activity').record(tx,db,{source:'survivor-score:'+run.runId,memberId:link.memberUserId,uid,counts:{survivorScore:p.score},time});
 return {success:true};
 }
 if(p.action==='question'){
 const old=(await tx.get(control)).data()||{};if(time-(old.at||0)<2000)fail('resource-exhausted','잠시 후 다음 문제를 풀어 주세요.');
 const grade=Number(p.grade),sem=Number(p.sem);if(!Number.isInteger(grade)||grade<1||grade>6||![1,2].includes(sem))fail('invalid-argument','학년과 학기를 확인해 주세요.');
 const B=scope.window.MS_Bank,P=scope.window.MS_Problems;let q;
 if(p.era){if(!B.ERA_NAMES.includes(p.era))fail('invalid-argument','시대를 확인해 주세요.');q=B.serveHistory(p.era);q.subject='역사';}
 else if(p.subject==='math'){q=P.generate(grade,sem,p.unit||null);q.subject='수학';}
 else {if(!B.SUBJECTS[p.subject]||p.subject==='math')fail('invalid-argument','과목을 확인해 주세요.');q=B.serve(p.subject,grade,sem,p.unit||null);q.subject=B.SUBJECTS[p.subject].name;}
 q=JSON.parse(JSON.stringify(q));const id=crypto.randomUUID();tx.create(db.collection('survivorQuizQuestions').doc(id),{uid,memberId:link.memberUserId,q,issuedAt:time,answered:false});tx.set(control,{at:time,id},{merge:true});
 const {answerIndex,...publicQuestion}=q;return {...publicQuestion,questionId:id,...(p.hint===true?{eliminated:[0,1,2,3].filter(i=>i!==answerIndex).slice(0,2)}:{}),numeric:/^-?[\d,]+(\.\d+)?$/.test(q.choices[answerIndex])};
 }
 if(p.action!=='answer'||!/^[-a-f0-9]{36}$/.test(p.questionId||''))fail('invalid-argument','문제를 확인해 주세요.');
 const ref=db.collection('survivorQuizQuestions').doc(p.questionId),snapshot=await tx.get(ref),v=snapshot.data();
 if(!v||v.uid!==uid)fail('permission-denied','내 문제만 풀 수 있어요.');
 if(v.answered)return v.result;
 if(time-v.issuedAt>300000||time-v.issuedAt<400)fail('failed-precondition','문제 유효 시간을 확인해 주세요.');
 const expected=v.q.choices[v.q.answerIndex];const correct=typeof p.answer==='string'&&p.answer.length<=200&&p.answer.replaceAll(',','').trim()===String(expected).replaceAll(',','').trim();
 const result={correct,answerIndex:v.q.answerIndex};tx.update(ref,{answered:true,answeredAt:time,result});
 if(correct)require('./activity').record(tx,db,{source:'survivor:'+p.questionId,memberId:link.memberUserId,uid,counts:{survivorCorrect:1},time});
 return result;
 });};
}
module.exports={createService};
