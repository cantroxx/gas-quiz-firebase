'use strict';
const crypto=require('node:crypto');
const D=require('./board-domain');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function createService({db,authorize,studentVisible=()=>true,portrait=()=>({}),ErrorType=Error,now=()=>Date.now()}){
  const fail=(code,message)=>{throw new ErrorType(code,message);};
  const id=(v,name)=>{if(typeof v!=='string'||!v||v.length>200||/[/.\s]/.test(v))fail('invalid-argument',`${name}을 확인해 주세요.`);return v;};
  const data=s=>s.exists?s.data():{};
  const legacyCache=new Map();
  async function legacyRows(tx,ref){
    const cached=legacyCache.get(ref.path);if(cached&&now()-cached.at<300000)return cached.rows;
    const rows=(await tx.get(ref.collection('questProgress'))).docs.map(s=>({id:s.id,...s.data()})).filter(r=>!r.periodKey);
    if(legacyCache.size>=20)legacyCache.clear();legacyCache.set(ref.path,{at:now(),rows});return rows;
  }
  function eligible(member,s,settings){return D.activeStudent(member,s,settings)&&studentVisible(member,s);}
  async function act(uid,p={}){
    if(!uid)fail('unauthenticated','로그인이 필요합니다.');
    const classId=id(p.classId||'G4-C8','학급'),member=id(p.memberUserId,'계정'),action=p.action||'list';
    const day=p.dateKey||D.dateKey(now());if(!D.validDate(day)||day>D.dateKey(now()))fail('invalid-argument','오늘까지의 날짜를 선택해 주세요.');
    const ref=db.collection('classrooms').doc(classId);
    return db.runTransaction(async tx=>{
      const ctx=await authorize(tx,member,uid,classId),settings=ctx.settings;
      const teacher=ctx.isTeacher===true;
      if(!['mine','submit','progress'].includes(action)&&!teacher)fail('permission-denied','담임 권한이 필요합니다.');
      if(action==='progress') {
        const records=(await tx.get(ref.collection('questProgress').where('memberUserId','==',member))).docs.map(s=>({id:s.id,...s.data()}));
        const progressMap={};
        for(const q of settings.quests||[]) { const r=choose(records.filter(r=>r.questId===q.id&&D.inPeriod(r,q,day))); if(r&&!['cancelled','rejected'].includes(r.rewardStatus))progressMap[q.id]=publicRecord(r); }
        return {progressMap};
      }
      const qid=p.questId||settings.quests?.[0]?.id;
      const quest=settings.quests?.find(q=>q.id===qid);
      if(['list','mine','previewImport','importHistory'].includes(action)){
        const rosterSnap=await tx.get(db.collection('users').where('role','==','student'));
        const roster=rosterSnap.docs.filter(s=>eligible(s.id,s.data(),settings));
        const students=roster.map(s=>({memberUserId:s.id,studentNumber:Number(s.data().studentNumber)||0,nickname:String(s.data().nickname||'학생').slice(0,40)})).sort((a,b)=>a.studentNumber-b.studentNumber);
        const gemSnap=await tx.get(ref.collection('classroomGems'));
        const gems=gemSnap.docs.map(s=>({gemId:s.id,...s.data()}));
        if(action==='previewImport'||action==='importHistory'){
          const shopSnap=await tx.get(ref.collection('shopItems'));
          const catalog={students,quests:settings.quests||[],gems,shopItems:shopSnap.docs.map(s=>({itemId:s.id,...s.data()}))};
          const preview=D.previewImport(p.input,catalog);
          if(action==='previewImport')return preview;
          // Archive-only import. No wallet, award, or gem progress is written here.
          if(!preview.ready)fail('failed-precondition','사전 검증 오류를 먼저 해결해 주세요.');
          if(preview.records.length>100)fail('invalid-argument','한 번에 과거 기록 100개까지 보관할 수 있습니다.');
          const refs=preview.records.map(r=>ref.collection('boardHistory').doc(hash(['grownd',r.sourceId])));
          const old=await Promise.all(refs.map(r=>tx.get(r)));
          for(let i=0;i<refs.length;i++)if(old[i].exists&&old[i].data().contentHash!==hash(preview.records[i]))fail('already-exists','같은 원본 ID의 내용이 다릅니다.');
          preview.records.forEach((r,i)=>{if(!old[i].exists)tx.set(refs[i],{...r,contentHash:hash(r),importedAt:now(),importedBy:member});});
          return {imported:old.filter(s=>!s.exists).length,duplicate:old.filter(s=>s.exists).length,walletsChanged:0};
        }
        const displayed=action==='mine'?students.filter(s=>s.memberUserId===member):students;
        const profiles=await Promise.all(displayed.map(s=>tx.get(ref.collection('studentProfiles').doc(s.memberUserId))));
        displayed.forEach((s,i)=>Object.assign(s,portrait(roster.find(r=>r.id===s.memberUserId)?.data()||{},data(profiles[i]))));
        const periodKeys=[day,D.period({repeatRule:'weekly'},day),'once'];
        // New records and imported archives read only the selected occurrences.
        // Legacy rows without periodKey are cached for five minutes and invalidated on writes.
        const current=(await tx.get(ref.collection('questProgress').where('periodKey','in',periodKeys))).docs.map(s=>({id:s.id,...s.data()}));
        const legacy=await legacyRows(tx,ref);
        const currentHistory=(await tx.get(ref.collection('boardHistory').where('periodKey','in',periodKeys))).docs.map(s=>({id:s.id,...s.data()}));
        const currentIds=new Set(current.map(r=>r.id));
        const summaryRecords=[...current,...legacy.filter(r=>!currentIds.has(r.id))],summaryHistory=currentHistory;
        const counts={}; for(const q of settings.quests||[]) { const targets=students.filter(s=>D.assigned(q,s.memberUserId)); const paid=new Set([...summaryRecords.filter(r=>r.questId===q.id&&r.rewardStatus==='paid'&&D.inPeriod(r,q,day)),...summaryHistory.filter(r=>r.questId===q.id&&r.status==='completed'&&D.inPeriod(r,q,day))].map(r=>r.memberUserId)); counts[q.id]={total:targets.length,completed:targets.filter(s=>paid.has(s.memberUserId)).length}; }
        const records=quest?summaryRecords.filter(r=>r.questId===quest.id):[];
        const history=quest?currentHistory.filter(r=>r.questId===quest.id):[];
        const rows=displayed.filter(s=>!quest||D.assigned(quest,s.memberUserId)||history.some(r=>r.memberUserId===s.memberUserId&&D.inPeriod(r,quest,day))||(day<D.dateKey(now())&&records.some(r=>r.memberUserId===s.memberUserId&&D.inPeriod(r,quest,day)))).map(s=>{
          const matches=records.filter(r=>(r.memberUserId||r.userId)===s.memberUserId&&D.inPeriod(r,quest,day));
          const r=choose(matches),h=history.filter(r=>r.memberUserId===s.memberUserId&&D.inPeriod(r,quest,day));
          return {...s,record:r?publicRecord(r):null,history:h.map(r=>({sourceId:r.sourceId,source:r.source,status:r.status,dateKey:r.dateKey,rewardPaid:r.rewardPaid,imported:true})),boostPoint:0};
        });
        if(quest)counts[quest.id]={total:rows.length,completed:rows.filter(s=>s.record?.rewardStatus==='paid'||s.history.some(h=>h.status==='completed')).length};
        if(teacher&&p.private===true&&quest){
          const payloads=await Promise.all(rows.map(s=>s.record?tx.get(ref.collection('boardSubmissions').doc(s.record.recordId)):Promise.resolve(null)));
          rows.forEach((s,i)=>{if(payloads[i]?.exists)s.submission=payloads[i].data();});
          const wallets=await Promise.all(rows.map(s=>tx.get(ref.collection('studentWallets').doc(s.memberUserId))));
          rows.forEach((s,i)=>{s.boostPoint=D.money(data(wallets[i]).pointBoostAmount??data(wallets[i]).pointBoost??0);});
        }
        if(action==='mine'&&rows[0]?.record){const s=await tx.get(ref.collection('boardSubmissions').doc(rows[0].record.recordId));rows[0].submission=data(s);}
        return {classId,isTeacher:teacher,dateKey:day,quests:settings.quests||[],questId:quest?.id||'',students:rows,studentCount:students.length,counts,gems,updatedAt:now()};
      }
      if(!quest)fail('not-found','활동을 찾을 수 없습니다.');
      const target=action==='submit'?member:id(p.targetMemberUserId,'학생');
      const targetDoc=await tx.get(db.collection('users').doc(target));
      if(!eligible(target,data(targetDoc),settings)||!D.assigned(quest,target))fail('permission-denied','이 활동의 대상 학생이 아닙니다.');
      const imported=(await tx.get(ref.collection('boardHistory').where('questId','==',quest.id))).docs.map(s=>s.data()).filter(r=>r.memberUserId===target&&D.inPeriod(r,quest,day));
      if(imported.some(r=>r.status==='completed'))fail('failed-precondition','그라운드에서 이전한 완료 기록입니다. 보상을 다시 지급하지 않습니다.');
      const all=(await tx.get(ref.collection('questProgress').where('questId','==',quest.id))).docs.map(s=>({id:s.id,...s.data()}));
      const candidates=all.filter(r=>(r.memberUserId||r.userId)===target&&D.inPeriod(r,quest,day));
      const previous=choose(candidates)||{};
      const recordId=previous.id||D.recordId(target,quest,day),recordRef=ref.collection('questProgress').doc(recordId),revision=Number(previous.revision)||0;
      // A protected ledger is authoritative after adoption of a legacy record.
      const ledgerRef=ref.collection('boardLedgers').doc(recordId),ledgerSnap=await tx.get(ledgerRef),ledger=data(ledgerSnap);
      if(ledgerSnap.exists&&ledger.revision!==revision)fail('failed-precondition','활동 기록과 지급 원장이 다릅니다. 점검이 필요합니다.');
      const submissionRef=ref.collection('boardSubmissions').doc(recordId),submissionSnap=await tx.get(submissionRef);
      const currentStatus=ledger.rewardStatus||previous.rewardStatus||'incomplete';
      const requestKey=p.requestId?id(p.requestId,'요청 번호'):null;
      const requestRef=requestKey?ref.collection('boardRequests').doc(hash([member,requestKey])):null;
      if(requestRef){const old=await tx.get(requestRef);if(old.exists){if(old.data().payloadHash!==hash(p))fail('already-exists','요청 번호가 다른 작업에 사용됐습니다.');return {...old.data().result,duplicate:true};}}
      if(p.expectedRevision!==undefined&&p.expectedRevision!==revision)fail('aborted','다른 창에서 변경됐습니다. 새로고침 후 다시 처리해 주세요.');
      const stamp=now(),base={recordId,classId,questId:quest.id,questTitle:quest.title,questType:quest.type||'',memberUserId:target,userId:target,dateKey:day,periodKey:D.period(quest,day),rewardMode:quest.rewardMode,rewardCurrency:'point',rewardCoin:quest.rewardCoin||0,checked:true,version:2,updatedAt:stamp,revision:revision+1,createdAt:previous.createdAt||stamp};
      const finish=result=>{legacyCache.delete(ref.path);if(requestRef)tx.set(requestRef,{payloadHash:hash(p),result,createdAt:stamp});return result;};
      if(action==='feedback'){
        if(!previous.id)fail('not-found','제출 기록이 없습니다.');
        const feedback=String(p.feedback||'');if(feedback.length>1000)fail('invalid-argument','피드백은 1000자 이내로 작성해 주세요.');
        tx.set(submissionRef,{feedback,feedbackBy:member,feedbackAt:stamp},{merge:true});
        return finish({recordId,feedbackSaved:true});
      }
      if(action==='submit'){
        if(day!==D.dateKey(now())||!D.available(quest,day))fail('failed-precondition','지금 제출할 수 없는 활동입니다.');
        if(currentStatus==='paid'||currentStatus==='pending_teacher_review')return finish({recordId,duplicate:true,rewardStatus:currentStatus});
        if(quest.rewardMode==='quizAchieved')fail('failed-precondition','퀴즈 달성 활동은 선생님 확인이 필요합니다.');
        let submission;try{submission=D.validateSubmission(quest,p.submission||{});}catch(e){fail('invalid-argument',e.message);}
        // Read everything before writes: auto submissions continue into the common award path.
        if(quest.rewardMode!=='auto'){
          const result={recordId,revision:revision+1,rewardStatus:'pending_teacher_review',rewardAmount:0};
          tx.set(recordRef,{...base,status:'student_checked',rewardStatus:result.rewardStatus});
          tx.set(ledgerRef,{revision:revision+1,rewardStatus:result.rewardStatus});
          tx.set(submissionRef,{submission,submittedAt:stamp,memberUserId:target});
          return finish(result);
        }
      }
      if(action==='reject'&&currentStatus!=='paid'){
        const reason=String(p.reason||'').trim();if(!reason||reason.length>300)fail('invalid-argument','반려 사유를 300자 이내로 적어 주세요.');
        tx.set(recordRef,{...previous,...base,status:'rejected',rewardStatus:'rejected',reviewedBy:member});
        tx.set(ledgerRef,{...ledger,revision:revision+1,rewardStatus:'rejected'});
        tx.set(submissionRef,{feedback:reason,feedbackBy:member},{merge:true});
        return finish({recordId,rewardStatus:'rejected',revision:revision+1});
      }
      if(!['submit','complete','cancel','reject'].includes(action))fail('invalid-argument','지원하지 않는 처리입니다.');
      const cancelling=action==='cancel'||action==='reject';
      if(!cancelling&&currentStatus==='paid')return finish({recordId,duplicate:true,rewardStatus:'paid',rewardAmount:0});
      if(cancelling&&currentStatus!=='paid')return finish({recordId,duplicate:true,rewardStatus:currentStatus,rewardAmount:0});
      if(!cancelling&&!D.available(quest,day))fail('failed-precondition','활동 기간 또는 공개 상태를 확인해 주세요.');
      if(!cancelling&&currentStatus==='cancelled'&&!requestKey&&p.expectedRevision===undefined)fail('failed-precondition','취소된 활동입니다. 새로 열어 다시 제출해 주세요.');
      if(!cancelling&&candidates.some(r=>r.rewardStatus==='cancelled')&&!ledgerSnap.exists)fail('failed-precondition','과거 취소 기록의 지급·젬 내역 확인이 필요합니다.');
      const walletRef=ref.collection('studentWallets').doc(target),economyRef=db.collection('userEconomy').doc(target);
      const [walletSnap,economySnap]=await Promise.all([tx.get(walletRef),tx.get(economyRef)]),wallet=data(walletSnap),economy=data(economySnap);
      const point=D.money(wallet.point??wallet.berry??0),coin=D.money(economy.djCoin??economy.coin??0);
      let deltaPoint=0,deltaCoin=0,gemChanges=[],rewardAmount=0;
      if(cancelling){
        if(!p.reason||String(p.reason).trim().length>300)fail('invalid-argument','취소 사유를 300자 이내로 적어 주세요.');
        if(!ledger.award)fail('failed-precondition','이전 방식의 지급입니다. 젬·실지급액 대조 후 취소할 수 있습니다.');
        deltaPoint=-ledger.award.point;deltaCoin=-ledger.award.coin;rewardAmount=ledger.award.baseReward;
        if(point+deltaPoint<0||coin+deltaCoin<0)fail('failed-precondition','보상이 이미 사용되어 잔액이 부족합니다. 취소하지 않았습니다.');
        for(const g of ledger.award.gems){
          const gref=ref.collection('studentGemProgress').doc(`${target}__${g.gemId}`),snap=await tx.get(gref);
          if(hash(data(snap))!==g.afterHash)fail('failed-precondition','이후 젬 기록이 있어 자동 회수할 수 없습니다. 취소하지 않았습니다.');
          const awardRef=db.collection('rewardLogs').doc(['classroom_gem_award',classId,target,g.gemId].join('__'));
          gemChanges.push({ref:gref,next:g.before,awardRef,undoAward:g.awarded});
        }
      }else{
        const baseReward=D.money(quest.rewardCoin||0),boost=baseReward>0?Math.max(0,D.money(wallet.pointBoostAmount??wallet.pointBoost??0)):0;
        rewardAmount=D.money(baseReward+boost);deltaPoint=rewardAmount;
        const ids=[...new Set((quest.linkedGemIds?.length?quest.linkedGemIds:[quest.linkedGemId]).filter(Boolean))];
        for(const gemId of ids){
          id(gemId,'젬');const gref=ref.collection('studentGemProgress').doc(`${target}__${gemId}`),configRef=ref.collection('classroomGems').doc(gemId);
          const awardRef=db.collection('rewardLogs').doc(['classroom_gem_award',classId,target,gemId].join('__'));
          const [gs,cs,as]=await Promise.all([tx.get(gref),tx.get(configRef),tx.get(awardRef)]),before=data(gs),config=data(cs);
          const xp=Number(before.currentXp)||0,targetXp=Math.max(1,Number(config.targetXp||quest.gemTargetXp)||10),nextXp=xp+1;
          // A legacy completed gem has already paid; never award it again.
          const awarded=nextXp>=targetXp&&xp<targetXp&&!before.completed&&(!as.exists||as.data().cancelled===true);
          const gp=awarded?D.money(config.rewardPoint??quest.gemRewardPoint??0):0,gc=awarded?D.money(config.rewardCoin??quest.gemRewardCoin??0):0;
          deltaPoint=D.money(deltaPoint+gp);deltaCoin=D.money(deltaCoin+gc);
          const next={...before,memberUserId:target,userId:target,classId,gemId,gemName:config.gemName||quest.linkedGemNames?.[ids.indexOf(gemId)]||gemId,currentXp:nextXp,totalXp:(Number(before.totalXp)||xp)+1,targetXp,completed:nextXp>=targetXp,status:nextXp>=targetXp?'completed':'in_progress',lastProgressPath:recordRef.path,updatedAt:stamp};
          gemChanges.push({ref:gref,next,gemId,before,afterHash:hash(next),awarded,awardRef,gp,gc});
        }
      }
      // All reads above, all writes below: one atomic award / reversal across currencies and gems.
      tx.set(walletRef,{memberUserId:target,userId:target,classId,point:D.money(point+deltaPoint),totalEarnedPoint:D.money((wallet.totalEarnedPoint||0)+deltaPoint),updatedAt:stamp},{merge:true});
      if(deltaCoin)tx.set(economyRef,{userId:target,djCoin:D.money(coin+deltaCoin),totalEarned:D.money((economy.totalEarned||0)+deltaCoin),updatedAt:stamp},{merge:true});
      for(const g of gemChanges){tx.set(g.ref,g.next);if(g.awarded)tx.set(g.awardRef,{type:'classroom_gem_award',memberUserId:target,classId,gemId:g.gemId,rewardPoint:g.gp,rewardCoin:g.gc,createdAt:stamp,cancelled:false});if(g.undoAward)tx.set(g.awardRef,{cancelled:true,cancelledAt:stamp},{merge:true});}
      const rewardStatus=cancelling?'cancelled':'paid',award=cancelling?null:{point:deltaPoint,coin:deltaCoin,baseReward:rewardAmount,gems:gemChanges.map(g=>({gemId:g.gemId,before:g.before,afterHash:g.afterHash,awarded:g.awarded}))};
      tx.set(recordRef,{...base,status:cancelling?'cancelled':'completed',rewardStatus,rewardAmount:cancelling?0:rewardAmount,reviewedBy:member,source:'classroom-board',...(cancelling?{cancelReason:String(p.reason).trim()}:{})});
      tx.set(ledgerRef,{revision:revision+1,rewardStatus,award});
      const eventId=hash([classId,recordId,revision+1]);
      const event={type:cancelling?'classroom_quest_cancel':'classroom_board_quest',classId,recordId,questId:quest.id,questTitle:quest.title,memberUserId:target,userId:target,authUid:uid,reviewedBy:member,rewardCurrency:'point',rewardPoint:deltaPoint,rewardAmount:deltaPoint,rewardCoin:deltaCoin,createdAt:stamp,reason:cancelling?String(p.reason):''};
      tx.set(ref.collection('pointLogs').doc(eventId),event);tx.set(db.collection('rewardLogs').doc(eventId),event);
      if(action==='submit')tx.set(submissionRef,{submission:D.validateSubmission(quest,p.submission||{}),submittedAt:stamp,memberUserId:target});
      else if(submissionSnap.exists)tx.set(submissionRef,{reviewedAt:stamp},{merge:true});
      return finish({recordId,revision:revision+1,rewardStatus,rewardCurrency:'point',rewardAmount:cancelling?-rewardAmount:rewardAmount,rewardPoint:deltaPoint,gemRewardCoin:deltaCoin});
    });
  }
  function choose(records){return records.sort((a,b)=>(b.rewardStatus==='paid')-(a.rewardStatus==='paid')||(Number(b.revision)||0)-(Number(a.revision)||0)||String(b.dateKey||'').localeCompare(String(a.dateKey||'')))[0];}
  function publicRecord(r){return {recordId:r.recordId||r.id,revision:Number(r.revision)||0,status:r.status||'',rewardStatus:r.rewardStatus||'',rewardAmount:Number(r.rewardAmount??r.rewardCoin)||0,periodKey:r.periodKey||'',dateKey:r.dateKey||'',source:r.source||''};}
  return act;
}
module.exports={createService};
