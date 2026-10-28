'use strict';
// Offline, side-effect-free planning. Does not contain an import/wallet write entry point.
const B=require('./board-domain'),F=require('./followup-domain');
const sections=['routines','jobs','deposits','exchanges','inventory','growth','requests','observations','diaries','securities','lottery'];
function preview(input,catalog,verifiedFiles={}){
  const base=B.previewImport(input,catalog),issues=[...base.issues],archives=[],seen=new Set();
  const issue=(kind,id,message)=>issues.push({kind,id:String(id||''),message});
  if(!input||typeof input!=='object')return {...base,ready:false};
  const validStamp=v=>typeof v==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));
  if(!validStamp(input.snapshotAt)||B.dateKey(Date.parse(input.snapshotAt))!==input.asOf)issue('cutoff','','한국 날짜가 기준일과 일치하는 원본 기준 시각(시간대 포함)이 필요합니다.');
  if(!validStamp(catalog.snapshotAt)||Date.parse(catalog.snapshotAt)<Date.parse(input.snapshotAt))issue('cutoff','','원본 기준 시각 이후에 확보한 대상 스냅샷 시각이 필요합니다.');
  if(!input.scope||typeof input.scope!=='object')issue('scope','','각 분류의 원본 건수와 추출 범위 확인이 필요합니다.');
  for(const section of sections){
    const rows=input[section];if(!Array.isArray(rows)){issue('section',section,'배열이 필요합니다. 원본에 없는 분류도 빈 배열과 확인 건수를 명시해 주세요.');continue;}
    if(input.scope?.[section]!==rows.length)issue('count',section,'원본 확인 건수와 자료 건수가 다릅니다.');
    for(const row of rows){
      try {
        if(!row||typeof row!=='object'||Array.isArray(row))throw Error('기록 객체가 필요합니다.');
        const sourceId=F.id(row.sourceId),key=section+':'+sourceId;if(seen.has(key))throw Error('원본 ID 중복입니다.');seen.add(key);
        const memberUserId=input.maps?.students?.[row.studentId];if(!base.wallets.some(w=>w.memberUserId===memberUserId))throw Error('학생 대응표가 필요합니다.');
        F.date(row.dateKey);if(row.dateKey>input.asOf)throw Error('원본 기준일 이후 기록입니다.');
        if(section==='growth'){F.amount(row.totalXp);F.int(row.level,0,100000);if(!Array.isArray(row.rewardedLevels)||row.rewardedLevels.some(v=>!Number.isInteger(v)||v<1||v>row.level))throw Error('기지급 레벨 목록을 확인해 주세요.');}
        if(section==='deposits'){F.amount(row.principal);F.amount(row.interest);F.amount(row.earlyFee);F.date(row.openedDate);F.date(row.maturityDate);if(row.maturityDate<row.openedDate||!['open','closed'].includes(row.status)||typeof row.interestPaid!=='boolean'||row.currency!=='heartberry')throw Error('예금 계약·지급 여부·통화를 확인해 주세요.');}
        if(section==='jobs'){if(!['point','heartberry'].includes(row.currency))throw Error('원본 급여 통화를 명시해 주세요.');F.text(row.jobName,100);F.text(row.month,7);if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month)||row.paid===true&&row.month>input.asOf.slice(0,7))throw Error('급여 월 형식과 기준일 이전 지급 여부를 확인해 주세요.');F.amount(row.gross);F.amount(row.tax);F.amount(row.net);if(F.cents(row.gross)-F.cents(row.tax)!==F.cents(row.net)||typeof row.paid!=='boolean')throw Error('급여 총액-세금=실수령액, 지급 여부 확인 필요');}
        if(section==='routines'){F.text(row.title,100);if(!['daily','period'].includes(row.policy)||typeof row.paid!=='boolean')throw Error('보상 정책과 지급 여부가 필요합니다.');F.amount(row.rewardPoint);}
        if(section==='exchanges'){F.amount(row.debit);F.amount(row.credit);F.amount(row.fee);if(!['point','heartberry'].includes(row.from)||!['point','heartberry'].includes(row.to)||row.from===row.to)throw Error('환전 통화를 확인해 주세요.');}
        if(section==='inventory'){F.id(row.itemId);F.int(row.quantity,0,1000000);F.text(row.kind,80);F.text(row.effectDescription,1000);const policy=input.maps?.items?.[row.itemId];if(!policy||!['seed','skin','coupon','archive'].includes(policy.mode))throw Error('품목별 씨앗/스킨/쿠폰/효과 보관 대응을 명시해 주세요.');if(policy.mode!=='archive'&&!catalog.continuityItems?.some(i=>i.id===policy.targetId&&i.kind===policy.mode))throw Error('대응 대상 상품 ID/종류를 확인해 주세요.');}
        if(section==='requests'){F.amount(row.amount);F.text(row.reason,1000);F.text(row.category,100);if(!['pending','approved','rejected'].includes(row.status)||typeof row.paid!=='boolean')throw Error('원본 검토 상태·지급 여부가 필요합니다.');if(row.paid&&row.status!=='approved')throw Error('승인되지 않은 신청의 지급 완료 표시는 원본 확인이 필요합니다.');}
        if(section==='observations'||section==='diaries'){F.text(row.text,3000);if(section==='diaries'&&!['private','class'].includes(row.visibility))throw Error('일기 공개 범위가 필요합니다.');}
        if(section==='securities'){F.text(row.symbol,100);for(const k of ['quantity','costBasis','marketValue'])if(typeof row[k]!=='number'||!Number.isFinite(row[k])||row[k]<0)throw Error('원본 주식 수치를 확인해 주세요.');F.text(row.quoteCurrency,30);}
        if(section==='lottery'){F.id(row.roundId);F.int(row.number,1,100);if(['lost','won'].includes(row.status))F.int(row.winningNumber,1,100);F.amount(row.ticketPrice);F.amount(row.prize);if(typeof row.paid!=='boolean'||!['open','lost','won','void'].includes(row.status))throw Error('복권 상태·당첨금 지급 여부가 필요합니다.');if(row.paid&&row.status!=='won')throw Error('당첨되지 않은 복권의 당첨금 지급 표시는 원본 확인이 필요합니다.');if(row.status==='won'&&row.number!==row.winningNumber||row.status==='lost'&&row.number===row.winningNumber)throw Error('복권 번호와 당첨 결과가 일치하지 않습니다.');}
        archives.push({section,sourceId,memberUserId,source:'grownd',visibility:section==='observations'?'teacher':section==='diaries'?row.visibility:'owner',original:structuredClone(row),hash:F.hash(row),readOnly:true,payoutAllowed:false});
      }catch(e){issue('archive',row?.sourceId||section,e.message);}
    }
  }
  if(input.scope?.records!==(input.records||[]).length)issue('count','records','원본 활동 기록 건수를 확인해 주세요.');
  for(const r of base.records){const original=input.records.find(v=>v.sourceId===r.sourceId);if(!['owner','teacher'].includes(original.visibility)){issue('privacy',r.sourceId,'원본 활동 본문의 열람 범위를 명시해 주세요.');continue;}archives.push({section:'questHistory',sourceId:r.sourceId,memberUserId:r.memberUserId,source:'grownd',visibility:original.visibility,original:structuredClone(original),hash:F.hash(original),readOnly:true,payoutAllowed:false});}
  const files=[];if(!Array.isArray(input.files)||input.scope?.files!==input.files.length)issue('files','','원본 첨부 파일 목록과 확인 건수를 명시해 주세요.');
  for(const f of Array.isArray(input.files)?input.files:[]){try{
    F.id(f.sourceId);const memberUserId=input.maps?.students?.[f.studentId];if(!base.wallets.some(w=>w.memberUserId===memberUserId))throw Error('첨부 파일의 학생 대응표가 필요합니다.');
    if(!['owner','teacher'].includes(f.visibility)||!['image/png','image/jpeg','image/webp'].includes(f.mimeType)||!Number.isSafeInteger(f.bytes)||f.bytes<=0||!/^[a-f0-9]{64}$/.test(f.sha256))throw Error('첨부 파일 크기·해시·형식·공개 범위를 확인해 주세요.');
    if(verifiedFiles[f.sourceId]!==f.sha256)throw Error('첨부 원본의 실제 파일 해시 검증이 필요합니다.');
    files.push({...f,memberUserId,originalPreserved:true,delivery:'720px 미리보기와 원본을 분리, 실제 업로드는 총점검 이후'});
  }catch(e){issue('file',f?.sourceId,e.message);}}
  const funds=input.funds;try{F.amount(funds?.point);F.amount(funds?.heartberry);}catch(e){issue('fund','','원본 기금의 포인트·하트베리 잔액을 명시해 주세요.');}
  const changes=base.wallets.map(w=>{const old=catalog.wallets?.find(v=>v.memberUserId===w.memberUserId);if(!old){issue('before',w.memberUserId,'이전 직전 대상 지갑 스냅샷이 필요합니다.');return {...w,before:null};}try{F.amount(old.point);F.amount(old.djCoin);}catch(e){issue('before',w.memberUserId,e.message);}return {memberUserId:w.memberUserId,before:{point:old.point,djCoin:old.djCoin},after:{point:w.point,djCoin:w.djCoin},delta:{point:B.money(w.point-old.point),djCoin:B.money(w.djCoin-old.djCoin)},mode:'replace-after-cutoff'};});
  const liabilities={depositPrincipal:B.money(archives.filter(a=>a.section==='deposits'&&a.original.status==='open').reduce((s,a)=>s+a.original.principal,0)),unpaidLotteryPrize:B.money(archives.filter(a=>a.section==='lottery'&&a.original.status==='won'&&!a.original.paid).reduce((s,a)=>s+a.original.prize,0))};
  // Open source contracts need explicit transfer decisions; archive alone is not continuation.
  for(const a of archives)if(a.section==='deposits'&&a.original.status==='open'||a.section==='lottery'&&(a.original.status==='open'||a.original.status==='won'&&!a.original.paid)||a.section==='requests'&&(a.original.status==='pending'||a.original.status==='approved'&&!a.original.paid)||['jobs','routines'].includes(a.section)&&!a.original.paid)issue('open-contract',a.sourceId,'진행 중 계약/신청은 원본 정산 또는 개별 승계 계획을 총점검에서 확정해야 합니다.');
  return {...base,ready:issues.length===0,issues,archives,files,changes,liabilities,funds:funds?{point:funds.point,djCoin:funds.heartberry}:null,sourceHash:F.hash(input),catalogHash:F.hash(catalog),mode:'preview-only',executionEnabled:false,rollback:{method:'동일 기준 시각의 원본/대상 스냅샷을 별도 비공개 보존; 이후 거래 발생 시 자동 롤백 금지',snapshotRequired:true}};
}
module.exports={preview,sections};
