'use strict';
const crypto = require('node:crypto');
const C = require('./curriculum'), G = require('./generator'), Deck=require('./deck'), Learning=require('./learning');
const LIMIT_MS = 300000, HEARTS = 3;
function createService({db, now=()=>Date.now(), ErrorType=Error, reward=async()=>({rewardCoin:0}), activity=()=>{}}) {
  const fail=(code,message)=>{const e=new ErrorType(code,message);e.code=code;if(ErrorType===Error)e.message=message;throw e;};
  const ref=(name,id)=>db.collection(name).doc(id);
  const rankRef=(subject,memberId)=>db.collection('subjectQuizRankings').doc(C.VERSION).collection(subject).doc(memberId);
  const validId=value=>{if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(value))fail('invalid-argument','요청 번호를 확인해 주세요.');return value;};
  async function identity(tx,uid){
    if(!uid)fail('unauthenticated','퀴즈타운에 먼저 로그인해 주세요.');
    const link=await tx.get(ref('authLinks',uid)),memberId=link.data()?.memberUserId;
    if(!memberId)fail('permission-denied','연결된 학생 계정이 필요해요.');
    const snap=await tx.get(ref('users',memberId)),user=snap.data();
    if(!user||user.authUid!==uid||user.status!=='active'||user.active===false)fail('permission-denied','활성 계정으로 로그인해 주세요.');
    return {memberId,uid,nickname:String(user.nickname||user.displayNickname||'퀴즈 탐험가').normalize('NFC').slice(0,24),visible:memberId!=='G4-C8-N23'};
  }
  function expire(run,time){if(run.status==='playing'&&time>=run.deadline){run.status='finished';run.reason='time';run.finishedAt=time;}}
  const deckRef=(memberId,unitId)=>ref('subjectQuizProgress',`${C.VERSION}_${memberId}_deck_${unitId}`);
  function question(run,history,time){
    const next=Deck.next(run.unitId,history,run.seed,{mode:run.mode,now:time});
    run.deckCycle=next.history.cycle;run.poolQuestionId=next.question.poolId;run.learningSummary={stage:next.history.learning?.stage||1,pending:next.history.learning?.reviews?.length||0,confirmed:next.history.learning?.confirmed||0};
    // Old fingerprints were very large. The persistent unit deck now owns novelty.
    run.recent=[];return next;
  }
  const visualText=d=>[d.title,d.description,d.note].filter(Boolean).join('\n');
  function view(run,time,total,splitPassage=false,supportsVisuals=false){
    let question=run.status==='playing'?G.publicQuestion(run.question,true):null,feedback=run.feedback||null;
    // An already-open old page cannot render the new SVG schema. Supply the
    // same visible evidence as text without changing its saved grading record.
    if(question&&!supportsVisuals&&question.diagram?.kind==='evidence')question={...question,passage:[question.passage,visualText(question.diagram)].filter(Boolean).join('\n\n'),diagram:null};
    if(question&&!splitPassage)question={...question,prompt:question.passage?question.passage+'\n\n'+question.prompt:question.prompt,passage:''};
    if(feedback&&!supportsVisuals&&feedback.diagram?.kind==='evidence')feedback={...feedback,passage:[feedback.passage,visualText(feedback.diagram)].filter(Boolean).join('\n\n'),diagram:null};
    return {runId:run.id,version:C.VERSION,unitId:run.unitId,mode:run.mode,seq:run.seq,
      startedAt:run.startedAt,deadline:run.deadline,serverNow:time,hearts:run.hearts,correct:run.correct,answered:run.seq,
      status:run.status,reason:run.reason||'',totalScore:total,feedback,learning:run.mode==='practice'?(run.learningSummary||null):null,question};
  }
  async function act(uid,payload){
    if(!payload||typeof payload!=='object')fail('invalid-argument','요청 내용을 확인해 주세요.');
    const action=payload.action;
    return db.runTransaction(async tx=>{
      const me=await identity(tx,uid),time=now();
      const settings=await tx.get(ref('appSettings','featureFlags')),flags=settings.data()||{};
      if(flags.subjectQuizEnabled===false)fail('failed-precondition','과목 퀴즈를 점검하고 있어요.');
      // Read-only views do not need the player's active session or other boards.
      const rankingRecord=(subject,doc)=>{
        const row=doc.data(),s=C.subjects.find(s=>s.id===subject);
        return {memberUserId:doc.id,userId:doc.id,displayName:row.nickname,displayNickname:row.nickname,
          recordId:`${C.VERSION}_${subject}_${doc.id}`,quizId:`subject-${subject}`,categoryKey:`subject-${subject}`,category:s.title,
          subject,cumulative:true,rankingMode:'normal',score:row.totalScore,elapsedSeconds:0,elapsedText:''};
      };
      if(action==='memberRankings'){
        if(payload.memberUserId&&payload.memberUserId!==me.memberId)fail('permission-denied','본인의 기록만 확인할 수 있어요.');
        const snapshots=await Promise.all(C.subjects.map(s=>tx.get(rankRef(s.id,me.memberId))));
        const records=snapshots.flatMap((doc,i)=>doc.exists&&doc.data().visible!==false?[rankingRecord(C.subjects[i].id,doc)]:[]);
        return {version:C.VERSION,memberUserId:me.memberId,records,serverNow:time};
      }
      if(action==='subjectRankings'){
        const subject=String(payload.subject||''),limit=payload.limit===undefined?10:payload.limit;
        if(!C.subjects.some(s=>s.id===subject)||!Number.isInteger(limit)||limit<1||limit>100)fail('invalid-argument','과목과 조회 개수를 확인해 주세요.');
        const query=rankRef(subject,me.memberId).parent.orderBy('totalScore','desc');
        const records=[];let cursor,scanned=0;
        const compare=(a,b)=>b.score-a.score||(a.memberUserId<b.memberUserId?-1:a.memberUserId>b.memberUserId?1:0);
        while(scanned<501){
          // Read through the cutoff tie so the legacy document-ID tie order is
          // preserved without requiring a new production composite index.
          const pageSize=Math.min(cursor?Math.max(limit,25):limit+1,501-scanned);
          const page=await tx.get((cursor?query.startAfter(cursor):query).limit(pageSize));
          scanned+=page.size;
          for(const doc of page.docs)if(doc.data().visible!==false)records.push(rankingRecord(subject,doc));
          records.sort(compare);
          if(page.size<pageSize)break;
          cursor=page.docs[page.docs.length-1];
          if(records.length>=limit&&Number(cursor.data().totalScore)<Number(records[limit-1].score))break;
        }
        if(scanned>500)fail('resource-exhausted','랭킹 집계 범위를 점검해야 합니다.');
        return {version:C.VERSION,subject,records:records.slice(0,limit),serverNow:time};
      }
      const controlRef=ref('subjectQuizPlayers',me.memberId),controlSnap=await tx.get(controlRef),control=controlSnap.data()||{};
      if(action==='rankingSnapshot'){
        const snapshots=await Promise.all(C.subjects.map(s=>tx.get(rankRef(s.id,me.memberId).parent.limit(501))));
        const old=await tx.get(db.collection('rankingRecords').where('sourceSheet','==','popular-quiz-server').limit(501));
        if(old.size>500||snapshots.some(s=>s.size>500))fail('resource-exhausted','랭킹 집계 범위를 점검해야 합니다.');
        const records=snapshots.flatMap((snap,i)=>snap.docs.filter(d=>d.data().visible!==false).map(d=>{
          const s=C.subjects[i],row=d.data();return {memberUserId:d.id,userId:d.id,displayName:row.nickname,displayNickname:row.nickname,
            recordId:`${C.VERSION}_${s.id}_${d.id}`,quizId:`subject-${s.id}`,categoryKey:`subject-${s.id}`,category:s.title,
            subject:s.id,cumulative:true,rankingMode:'normal',score:row.totalScore,elapsedSeconds:0,elapsedText:''};
        }));
        const members=new Map();
        for(const doc of old.docs){const row=doc.data(),id=row.memberUserId;
          if(!id||id==='G4-C8-N23'||row.visible===false||row.rulesVersion!=='popular-20261018-v2')continue;
          if(!members.has(id))members.set(id,{memberUserId:id,userId:id,displayName:row.displayName,categories:[]});
          const categories=members.get(id).categories,previous=categories.findIndex(x=>x.categoryKey===row.categoryKey);
          if(previous<0)categories.push(row);else if(Number(row.score)>Number(categories[previous].score))categories[previous]=row;
        }
        for(const row of records){if(!members.has(row.memberUserId))members.set(row.memberUserId,{memberUserId:row.memberUserId,userId:row.memberUserId,displayName:row.displayName,categories:[]});members.get(row.memberUserId).categories.push(row);}
        const summaries=[...members.values()].map(x=>({...x,categoryCount:x.categories.length,totalScore:x.categories.reduce((sum,c)=>sum+(Number(c.score)||0),0)})).filter(x=>x.totalScore>0).sort((a,b)=>b.totalScore-a.totalScore);
        return {version:C.VERSION,records,summaries,serverNow:time};
      }
      if(action==='board'){
        const subject=String(payload.subject||'');if(!C.subjects.some(s=>s.id===subject))fail('invalid-argument','과목을 확인해 주세요.');
        const query=rankRef(subject,me.memberId).parent.orderBy('totalScore','desc').limit(100);
        const snap=await tx.get(query),mine=await tx.get(rankRef(subject,me.memberId));
        return {version:C.VERSION,subject,serverNow:time,totalScore:mine.data()?.totalScore||0,rows:snap.docs.filter(d=>d.data().visible!==false).map(d=>({nickname:d.data().nickname,totalScore:d.data().totalScore,self:d.id===me.memberId}))};
      }
      if(action==='profile'){
        const ranks=await Promise.all(C.subjects.map(s=>tx.get(rankRef(s.id,me.memberId))));
        const progress=await tx.get(ref('subjectQuizProgress',`${C.VERSION}_${me.memberId}`));
        return {version:C.VERSION,subjects:C.subjects,units:C.units,nickname:me.nickname,serverNow:time,
          totals:Object.fromEntries(C.subjects.map((s,i)=>[s.id,ranks[i].data()?.totalScore||0])),
          progress:progress.data()?.units||{},activeRunId:control.version===C.VERSION&&control.activeUntil>time?control.runId:null};
      }
      if(action==='start'){
        const requestId=validId(payload.requestId),unit=C.unitById[payload.unitId],mode=payload.mode;
        if(!unit||!['practice','ranking'].includes(mode))fail('invalid-argument','단원과 연습전·랭킹전을 선택해 주세요.');
        if((flags.disabledQuizIds||[]).some(id=>id===`subject-${unit.subject}`||id===`generated-${unit.subject}-${unit.group}`))fail('failed-precondition','이 학습 영역은 지금 점검 중이에요.');
        if(mode==='ranking'&&flags.rankingEnabled===false)fail('failed-precondition','지금은 연습전만 이용할 수 있어요.');
        if(control.requestId===requestId&&control.runId){
          const old=await tx.get(ref('subjectQuizRuns',control.runId)),rank=await tx.get(rankRef(unit.subject,me.memberId));
          if(old.exists){const run=old.data();if(run.unitId!==unit.id||run.mode!==mode)fail('invalid-argument','새 요청 번호로 시작해 주세요.');expire(run,time);return view(run,time,rank.data()?.totalScore||0,payload.clientVersion===G.CONTENT_VERSION,payload.visualVersion===1);}
        }
        if(control.version===C.VERSION&&control.activeUntil>time)fail('failed-precondition','진행 중인 퀴즈를 이어 하거나 먼저 종료해 주세요.');
        const rank=await tx.get(rankRef(unit.subject,me.memberId));
        const historyRef=deckRef(me.memberId,unit.id),historySnap=await tx.get(historyRef);
        const run={id:crypto.randomUUID(),version:C.VERSION,uid,memberId:me.memberId,unitId:unit.id,subject:unit.subject,mode,
          seed:crypto.randomBytes(24).toString('hex'),seq:0,correct:0,hearts:HEARTS,status:'playing',
          startedAt:time,deadline:time+(mode==='ranking'?LIMIT_MS:86400000),lastAcceptedAt:time,recent:[]};
        const issued=question(run,historySnap.data(),time);run.question=issued.question;
        tx.create(ref('subjectQuizRuns',run.id),run);
        tx.set(historyRef,{...issued.history,version:C.VERSION,memberId:me.memberId,unitId:unit.id,updatedAt:time});
        tx.set(controlRef,{version:C.VERSION,runId:run.id,requestId,activeUntil:run.deadline});
        return view(run,time,rank.data()?.totalScore||0,payload.clientVersion===G.CONTENT_VERSION,payload.visualVersion===1);
      }
      if(!['resume','answer','finish'].includes(action))fail('invalid-argument','지원하지 않는 요청이에요.');
      const runRef=ref('subjectQuizRuns',validId(payload.runId)),snap=await tx.get(runRef);
      if(!snap.exists)fail('not-found','퀴즈 기록을 찾지 못했어요.');
      const run=snap.data();
      if(run.uid!==uid||run.memberId!==me.memberId)fail('permission-denied','본인의 퀴즈만 풀 수 있어요.');
      if(run.version!==C.VERSION)fail('failed-precondition','새 과목 퀴즈에서 다시 시작해 주세요.');
      const rankingRef=rankRef(run.subject,me.memberId),rankingSnap=await tx.get(rankingRef);
      let total=rankingSnap.data()?.totalScore||0;
      if(action==='answer'&&payload.seq===run.seq-1&&payload.choice===run.lastChoice){expire(run,time);return {...view(run,time,total,payload.clientVersion===G.CONTENT_VERSION,payload.visualVersion===1),duplicate:true};}
      expire(run,time);
      if(action==='finish'&&run.status==='playing'){run.status='finished';run.reason='quit';run.finishedAt=time;}
      if(action==='answer'&&run.status==='playing'){
        if(control.runId!==run.id)fail('failed-precondition','현재 진행 중인 퀴즈로 돌아가 주세요.');
        if(!Number.isInteger(payload.seq)||payload.seq!==run.seq)fail('failed-precondition','문제 진행을 다시 불러와 주세요.');
        if(!Number.isInteger(payload.choice)||payload.choice<0||payload.choice>3)fail('invalid-argument','보기 중 하나를 골라 주세요.');
        if(time-run.lastAcceptedAt<300)fail('resource-exhausted','문제를 읽고 답을 골라 주세요.');
        const correct=payload.choice===run.question.answer;
        const progressRef=ref('subjectQuizProgress',`${C.VERSION}_${me.memberId}`),progressSnap=await tx.get(progressRef);
        // Read before reward/activity callbacks, which may already enqueue writes.
        const historyRef=deckRef(me.memberId,run.unitId),historySnap=await tx.get(historyRef);
        const progress=progressSnap.data()||{version:C.VERSION,memberId:me.memberId,units:{}};
        const unitProgress=progress.units[run.unitId]||{practiceCorrect:0,practiceAnswered:0,rankingCorrect:0,rankingAnswered:0};
        unitProgress[run.mode+'Answered']++;
        if(correct)unitProgress[run.mode+'Correct']++;
        unitProgress.updatedAt=time;progress.units[run.unitId]=unitProgress;
        const saveAchievement=await require('../achievements/progress').prepare(tx,db,{memberId:me.memberId,area:run.subject,mode:run.mode,correct,run,time});
        let award={rewardCoin:0};
        // Reward callback performs all of its reads before any service writes.
        if(correct)award=await reward(tx,{...me,unitId:run.unitId,subject:run.subject,mode:run.mode,runId:run.id,seq:run.seq,time});
        saveAchievement();
        if(correct){
          run.correct++;
          if(run.mode==='ranking'){
            total++;
            tx.set(rankingRef,{version:C.VERSION,memberId:me.memberId,nickname:me.nickname,visible:me.visible,totalScore:total,updatedAt:time});
          }
          activity(tx,{...me,source:`subject:${run.id}:${run.seq}`,subject:run.subject,mode:run.mode,time});
        }else if(run.mode==='ranking')run.hearts--;
        run.feedback={seq:run.seq,correct,choice:payload.choice,answer:run.question.answer,answerText:run.question.choices[run.question.answer],explanation:run.question.explanation,selectedReason:correct?'':(run.question.rationales?.[payload.choice]||''),passage:run.question.passage||'',prompt:run.question.prompt,diagram:run.question.diagram||null,rewardCoin:award.rewardCoin||0,xpDelta:award.xpDelta||0};
        run.lastChoice=payload.choice;run.lastAcceptedAt=time;run.seq++;
        if(run.hearts===0){run.status='finished';run.reason='hearts';run.finishedAt=time;}
        let nextHistory=Learning.record(historySnap.data()||{},run.question,correct,run.mode,time);
        if(run.status==='playing'){
          const issued=question(run,nextHistory,time);run.question=issued.question;nextHistory=issued.history;
        }
        tx.set(historyRef,{...nextHistory,version:C.VERSION,memberId:me.memberId,unitId:run.unitId,updatedAt:time});
        tx.set(progressRef,progress);
      }
      if(run.status==='finished'&&!run.completionRecorded&&run.mode==='ranking'&&run.correct>0&&time-run.startedAt>=10000){
        run.completionRecorded=true;activity(tx,{...me,source:`subject-complete:${run.id}`,subject:run.subject,mode:run.mode,score:run.correct,complete:true,time});
      }
      tx.set(runRef,run);
      if(run.status==='finished'&&control.runId===run.id)tx.set(controlRef,{...control,activeUntil:0});
      return view(run,time,total,payload.clientVersion===G.CONTENT_VERSION,payload.visualVersion===1);
    });
  }
  return {act};
}
module.exports={createService,LIMIT_MS,HEARTS};
