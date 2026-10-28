'use strict';
const crypto=require('node:crypto'),D=require('./domain'),PACK=require('./catalog.json');
const PRACTICE_RULES='answered100-endless-v1';
function createService({db,now=()=>Date.now(),ErrorType=Error,rewardPolicy=()=>({}),activity=()=>{},loadPool:customPool}){
 const fail=(code,message)=>{const e=new ErrorType(code,message);e.code=code;if(ErrorType===Error)e.message=message;throw e;};
 const ref=(collection,id)=>db.collection(collection).doc(id),hash=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,40);
 const id=value=>{if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(value))fail('invalid-argument','요청 번호를 확인해 주세요.');return value;};
 const pools=new Map();
 async function loadPool(category,gens=[]){
  if(customPool)return customPool(category,gens);
  if(category==='idol'||category==='anime')return PACK.questions.filter(q=>q.category===category);
  const ids=category==='pokemon'?gens.map(g=>`pokemon-gen${g}`):[category];
  const lists=await Promise.all(ids.map(async(quizId,i)=>{
   const cached=pools.get(quizId);if(cached&&cached.until>now())return cached.rows;
   const snapshot=await db.collection('quizQuestions').doc(quizId).collection('questions').get();
   const rows=snapshot.docs.map(doc=>D.existingQuestion({...doc.data(),questionId:doc.id},category,category==='pokemon'?gens[i]:0)).filter(Boolean);
   pools.set(quizId,{until:now()+600000,rows});return rows;
  }));return lists.flat();
 }
 function selection(payload){const category=payload.category,mode=payload.mode||'ranking';if(!D.CATEGORIES.some(c=>c.id===category)||!['practice','ranking'].includes(mode))fail('invalid-argument','분야와 연습전·랭킹전을 골라 주세요.');let gens=[];try{gens=category==='pokemon'?D.generations(payload.generations,mode):[];}catch(e){fail('invalid-argument',e.message);}return {category,mode,generations:gens};}
 async function identity(tx,uid){
  if(!uid)fail('unauthenticated','퀴즈타운에 먼저 로그인해 주세요.');
  const link=await tx.get(ref('authLinks',uid)),memberId=link.data()?.memberUserId;if(!memberId)fail('permission-denied','연결된 학생 계정이 필요해요.');
  const snap=await tx.get(ref('users',memberId)),user=snap.data();
  if(!user||user.authUid!==uid||user.status!=='active'||user.active===false)fail('permission-denied','활성 계정으로 로그인해 주세요.');
  return {memberId,uid,nickname:String(user.nickname||user.displayNickname||'퀴즈 친구').normalize('NFC').slice(0,24),visible:memberId!=='G4-C8-N23'};
 }
 function ensureEnabled(flags,choice){
  if(flags.popularQuizEnabled===false)fail('failed-precondition','인기 퀴즈를 점검하고 있어요.');
  const disabled=flags.disabledQuizIds||[];
  if(disabled.includes(choice.category)||(choice.category==='pokemon'&&choice.generations.some(g=>disabled.includes(`pokemon-gen${g}`))))fail('failed-precondition','이 분야는 지금 점검 중이에요.');
  if(choice.mode==='ranking'&&flags.rankingEnabled===false)fail('failed-precondition','지금은 연습전만 이용할 수 있어요.');
 }
 function view(run,time){return {runId:run.id,version:D.VERSION,contentVersion:run.contentVersion,category:run.category,mode:run.mode,generations:run.generations,
  seq:run.seq,total:null,correct:run.correct,hearts:run.hearts,status:run.status,reason:run.reason||'',serverNow:time,
  feedback:run.feedback||null,completionReward:run.completionReward||null,rankingSaved:!!run.rankingSaved,question:run.status==='playing'?D.publicQuestion(run.questions[run.seq%D.ROUND_SIZE]):null};}
 async function act(uid,payload){
  if(!uid)fail('unauthenticated','퀴즈타운에 먼저 로그인해 주세요.');
  if(!payload||typeof payload!=='object')fail('invalid-argument','요청 내용을 확인해 주세요.');
  return db.runTransaction(async tx=>{
   const me=await identity(tx,uid),time=now(),settings=await tx.get(ref('appSettings','featureFlags')),flags=settings.data()||{};
   const controlRef=ref('popularQuizPlayers',me.memberId),controlSnap=await tx.get(controlRef),control=controlSnap.data()||{};
   if(payload.action==='profile'){
    const progress=await tx.get(ref('achievementProgress',me.memberId));
    return {version:D.VERSION,contentVersion:PACK.version,categories:D.CATEGORIES,progress:progress.data()?.version===require('../achievements/catalog').VERSION?progress.data().areas:{},activeRunId:control.active?control.runId:null,
     enabled:flags.popularQuizEnabled!==false,rankingEnabled:flags.rankingEnabled!==false,disabledQuizIds:flags.disabledQuizIds||[],
     rewards:{...rewardPolicy(),practiceCoinEnabled:flags.practiceRewardEnabled!==false,practiceXpEnabled:flags.practiceXpEnabled!==false},serverNow:time};
   }
   if(payload.action==='memberRankings'){
    if(payload.memberUserId&&payload.memberUserId!==me.memberId)fail('permission-denied','본인의 기록만 확인할 수 있어요.');
    const snap=await tx.get(db.collection('rankingRecords').where('memberUserId','==',me.memberId).where('sourceSheet','==','popular-quiz-server').limit(501));
    if(snap.size>500)fail('resource-exhausted','기록 조회 범위를 확인해 주세요.');
    return {records:snap.docs.map(d=>({...d.data(),recordId:d.id})).filter(r=>r.rulesVersion===D.VERSION&&r.visible!==false),serverNow:time};
   }
   if(payload.action==='board'){
    const choice=selection({...payload,mode:'ranking'}),condition=D.conditionKey(choice.category,choice.generations);
    const snap=await tx.get(db.collection('rankingRecords').where('conditionKey','==',condition).limit(501));
    if(snap.size>500)fail('resource-exhausted','랭킹 집계 범위를 점검해야 해요.');
    const rows=snap.docs.map(d=>d.data()).filter(r=>r.rulesVersion===D.VERSION&&r.visible!==false).sort((a,b)=>b.score-a.score||a.elapsedSeconds-b.elapsedSeconds);
    return {category:choice.category,generations:choice.generations,rows:rows.slice(0,100).map(r=>({nickname:r.displayName,score:r.score,elapsedSeconds:r.elapsedSeconds,self:r.memberUserId===me.memberId})),serverNow:time};
   }
   if(payload.action==='start'){
    const choice=selection(payload);ensureEnabled(flags,choice);
    const requestId=id(payload.requestId),runId='p_'+hash(me.memberId+':'+requestId),runRef=ref('popularQuizRuns',runId),old=await tx.get(runRef);
    if(old.exists){const run=old.data();if(run.category!==choice.category||run.mode!==choice.mode||run.generations.join()!==choice.generations.join())fail('invalid-argument','새 요청 번호로 시작해 주세요.');return view(run,time);}
    if(control.active)fail('failed-precondition','진행 중인 퀴즈를 이어 하거나 먼저 종료해 주세요.');
    let questions;try{
     const pool=await loadPool(choice.category,choice.generations);
     if(choice.category==='pokemon'&&choice.generations.some(g=>!pool.some(q=>q.generation===g)))throw Error('선택한 세대의 문제가 부족해요.');
     questions=D.buildRound(choice.category,pool);
    }catch(e){fail('failed-precondition',e.message);}
    const run={id:runId,uid,memberId:me.memberId,...choice,rulesVersion:D.VERSION,contentVersion:PACK.version,seq:0,correct:0,hearts:3,status:'playing',startedAt:time,lastAcceptedAt:time,questions,
     ...(choice.mode==='practice'?{practiceRules:PRACTICE_RULES}:{})};
    tx.create(runRef,run);tx.set(controlRef,{runId,active:true,updatedAt:time});return view(run,time);
   }
   if(!['resume','answer','finish'].includes(payload.action))fail('invalid-argument','지원하지 않는 요청이에요.');
   const runRef=ref('popularQuizRuns',id(payload.runId)),snap=await tx.get(runRef);if(!snap.exists)fail('not-found','퀴즈 기록을 찾지 못했어요.');const run=snap.data();
   if(run.uid!==uid||run.memberId!==me.memberId)fail('permission-denied','본인의 퀴즈만 풀 수 있어요.');
   if(run.rulesVersion!==D.VERSION)fail('failed-precondition','새 인기 퀴즈에서 다시 시작해 주세요.');
   // End old practice sessions before switching to the endless rules.
   if(run.mode==='practice'&&run.status==='playing'&&run.practiceRules!==PRACTICE_RULES){
    run.status='finished';run.reason='rules-updated';run.finishedAt=time;run.feedback=null;
    tx.set(runRef,run);if(control.runId===run.id)tx.set(controlRef,{...control,active:false,updatedAt:time});return view(run,time);
   }
   if(payload.action==='resume'||run.status==='finished')return {...view(run,time),duplicate:payload.action==='answer'};
   if(control.runId!==run.id||!control.active)fail('failed-precondition','현재 진행 중인 퀴즈로 돌아가 주세요.');
   if(payload.action==='finish'){
    // Also settle rounds started before automatic per-answer ranking was introduced.
    if(run.mode==='ranking'&&run.correct>0&&!run.rankingSaved){
     const target=D.target(run.category,run.generations),recordRef=ref('rankingRecords','popular_v2_'+hash(me.memberId+':'+target.conditionKey));
     const [previous,summary,king]=await Promise.all([tx.get(recordRef),tx.get(ref('userRankingSummary',me.memberId)),tx.get(ref('quizKingSummary',me.memberId))]);
     const elapsedSeconds=Math.max(1,Math.round(((run.lastAcceptedAt||time)-run.startedAt)/1000));
     const record={recordId:recordRef.id,memberUserId:me.memberId,userId:me.memberId,displayName:me.nickname,visible:me.visible,...target,quizId:run.category,rulesVersion:D.VERSION,contentVersion:run.contentVersion,generations:run.generations,score:run.correct,questionCount:run.seq,elapsedSeconds,elapsedText:`${elapsedSeconds}초`,rankingMode:'normal',sourceSheet:'popular-quiz-server',legacy:false,hasUserId:true,recordedAt:new Date(time),updatedAt:new Date(time)};
     if(D.better(record,previous.data()))tx.set(recordRef,{...record,createdAt:previous.data()?.createdAt||new Date(time)});
     const next=D.summaries(summary.data()||{},king.data()||{},record,new Date(time));
     tx.set(ref('userRankingSummary',me.memberId),next.user,{merge:true});tx.set(ref('quizKingSummary',me.memberId),next.king,{merge:true});run.rankingSaved=true;
    }
    run.status='finished';run.reason='quit';run.finishedAt=time;tx.set(runRef,run);tx.set(controlRef,{...control,active:false,updatedAt:time});return view(run,time);}
   if(payload.seq===run.seq-1&&payload.choice===run.lastChoice)return {...view(run,time),duplicate:true};
   ensureEnabled(flags,run);
   if(!Number.isInteger(payload.seq)||payload.seq!==run.seq)fail('failed-precondition','문제 진행을 다시 불러와 주세요.');
   if(!Number.isInteger(payload.choice)||payload.choice<0||payload.choice>3)fail('invalid-argument','보기 중 하나를 골라 주세요.');
   if(time-run.lastAcceptedAt<300)fail('resource-exhausted','사진을 보고 답을 골라 주세요.');
   const practice=run.mode==='practice',questionIndex=run.seq%D.ROUND_SIZE;
   const q=run.questions[questionIndex],correct=payload.choice===q.answerIndex;
   const area=run.category==='pokemon'&&run.mode==='practice'?`pokemon-gen${run.generations[0]}`:run.category;
   if(correct)run.correct++;else if(run.mode==='ranking')run.hearts--;
   const completed=!practice&&run.hearts===0;
   const target=D.target(run.category,run.generations),recordRef=ref('rankingRecords','popular_v2_'+hash(me.memberId+':'+target.conditionKey));
   let record,previous,summary,king;
   if(run.mode==='ranking'&&run.correct>0){
    [previous,summary,king]=await Promise.all([tx.get(recordRef),tx.get(ref('userRankingSummary',me.memberId)),tx.get(ref('quizKingSummary',me.memberId))]);
    const elapsedSeconds=Math.max(1,Math.round((time-run.startedAt)/1000));record={recordId:recordRef.id,memberUserId:me.memberId,userId:me.memberId,displayName:me.nickname,visible:me.visible,
     ...target,quizId:run.category,rulesVersion:D.VERSION,contentVersion:run.contentVersion,generations:run.generations,score:run.correct,questionCount:run.seq+1,
     elapsedSeconds,elapsedText:`${elapsedSeconds}초`,rankingMode:'normal',sourceSheet:'popular-quiz-server',legacy:false,hasUserId:true,recordedAt:new Date(time),updatedAt:new Date(time)};
   }
   // Finish all reads before committing answer, achievement and ranking writes.
   if(!completed&&(run.seq+1)%D.ROUND_SIZE===0)run.questions=D.buildRound(run.category,await loadPool(run.category,run.generations));
   const saveAchievement=await require('../achievements/progress').prepare(tx,db,{memberId:me.memberId,area,mode:run.mode,correct,run,time});
   saveAchievement();
   const award={rewardCoin:0,xpDelta:0};
   run.feedback={seq:run.seq,choice:payload.choice,correct,answerIndex:q.answerIndex,answerText:q.answer,groupLabel:q.groupLabel||'',imageUrl:q.imageUrl,prompt:q.prompt,choices:q.choices,
    rewardCoin:award.rewardCoin||0,xpDelta:award.xpDelta||0,coinCapped:!!award.coinCapped,practiceCoinEnabled:award.practiceCoinEnabled!==false,practiceXpEnabled:award.practiceXpEnabled!==false};
   run.lastChoice=payload.choice;run.lastAcceptedAt=time;run.seq++;
   if(completed){run.status='finished';run.reason=run.hearts===0?'hearts':'complete';run.finishedAt=time;tx.set(controlRef,{...control,active:false,updatedAt:time});}
   if(record){
    if(D.better(record,previous.exists?previous.data():null))tx.set(recordRef,{...record,createdAt:previous.data()?.createdAt||new Date(time)});
    const next=D.summaries(summary.data()||{},king.data()||{},record,new Date(time));
    if(run.rankingSaved)next.user.totalRecordCount=summary.data()?.totalRecordCount||0;
    tx.set(ref('userRankingSummary',me.memberId),next.user,{merge:true});tx.set(ref('quizKingSummary',me.memberId),next.king,{merge:true});run.rankingSaved=true;
    if(correct)activity(tx,{...me,source:`popular-answer:${run.id}:${run.seq}`,time,counts:{rankingScore:1}});
   }
   tx.set(runRef,run);return view(run,time);
  });
 }
 return {act,loadPool};
}
module.exports={createService};
