'use strict';
const C=require('./contracts'),D=require('./domain'),K=require('./calendar'),Coin=require('./coin');
const {reference,companies,templates}=require('./market-engine');
const companyIds=new Set(companies.map(c=>c.id));
const publicNews=(doc)=>{const n=doc.data();return {id:doc.id,title:n.title,body:n.body,type:n.type,companyId:n.scope==='company'?n.target:'all',scope:n.scope,target:n.target,targetLabel:n.scope==='market'?'시장 전체':n.scope==='company'?companies.find(c=>c.id===n.target)?.name||n.target:n.target,publishedAt:n.publishedAt,effectiveDate:n.effectiveDate,correctionOf:n.correctionOf||null,revision:n.revision};};
function createService({db,authorize,ErrorType=C.SecuritiesError,now=Date.now,onError=()=>{},beforeTransferCommit=async()=>{}}) {
 const wrap=fn=>async(uid,p={})=>{try{if(!uid)C.fail('unauthenticated','로그인이 필요해요.');if(!p||typeof p!=='object'||Array.isArray(p))C.fail('invalid-argument','요청을 확인해 주세요.');return await fn(uid,p);}catch(e){
  if(e instanceof C.SecuritiesError)throw new ErrorType(e.code,e.message,e.details);
  if(e instanceof D.SecuritiesError)throw new ErrorType('failed-precondition',e.message,{retryable:false,reason:e.code});
  if(['aborted','unavailable','resource-exhausted'].includes(e.code))throw new ErrorType(e.code,'잠시 후 같은 요청으로 다시 시도해 주세요.',{retryable:true});
  onError(e);
  throw new ErrorType('internal','처리 결과를 확인하지 못했어요. 같은 요청으로 다시 확인해 주세요.',{retryable:true});
 }};
 async function context(tx,uid,p){
  const memberUserId=C.id(p.memberUserId),classId=C.id(p.classId),marketId=C.id(p.marketId);
  let auth;try{auth=await authorize(tx,memberUserId,uid,classId);}catch{C.fail('permission-denied','이 교실에서 이용할 권한이 없어요.');}
  if(!auth||auth.memberUserId!==memberUserId)C.fail('permission-denied','이 교실에서 이용할 권한이 없어요.');
  const ref=reference(db,classId,marketId),m=(await tx.get(ref)).data();
  if(!m||!['practice','coin'].includes(m.mode)||m.schemaVersion!==1)C.fail('failed-precondition','연습 시장을 사용할 수 없어요.');
  if(m.studentAccess===false&&!auth.isTeacher)C.fail('failed-precondition','선생님이 시범 수업을 확인하고 있어요. 학생 공개 후 이용해 주세요.');
  return {ref,m,memberUserId,classId,marketId,isTeacher:auth.isTeacher===true};
 }
 function enabled(c){if(c.m.lifecycle==='disabled'&&c.m.mode!=='coin')C.fail('failed-precondition','증권 기능이 꺼져 있어요.');}
 function teacher(c){if(!c.isTeacher)C.fail('permission-denied','담당 선생님만 할 수 있어요.');}
 function owner(c,p){const ownerId=p.ownerId===undefined?c.memberUserId:C.id(p.ownerId);if(ownerId!==c.memberUserId)teacher(c);return ownerId;}
 function marketView(c,stamp,price){return {mode:c.m.mode,studentAccess:c.m.studentAccess!==false,lifecycle:c.m.lifecycle,configVersion:c.m.configVersion,algorithmVersion:c.m.algorithmVersion,limits:c.m.limits,feeBps:c.m.feeBps,sessionSchedule:c.m.sessionSchedule,holidayDates:c.m.holidayDates,...K.session(c.m,stamp),prices:price?.prices||Object.fromEntries(companies.map(x=>[x.id,x.initialPriceMinor])),riskHalted:c.riskHalted===true,coinPolicy:c.m.mode==='coin'?Coin.POLICY:null,changes:price?.changes||{}};}
 async function priceFor(tx,c){return c.m.lastPriceDate?(await tx.get(c.ref.collection('dailyPrices').doc(c.m.lastPriceDate))).data():null;}
 async function accountFor(tx,c,ownerId,stamp){
  const ref=c.ref.collection('accounts').doc(ownerId);
  const [snap,positions,limit]=await Promise.all([tx.get(ref),tx.get(ref.collection('positions').limit(13)),tx.get(ref.collection('dailyLimits').doc(K.clock(stamp).date))]);
  if(positions.size>12||positions.docs.some(d=>!companyIds.has(d.id)))C.fail('failed-precondition','계좌 기록을 선생님께 확인해 주세요.');
  return {ref,account:snap.exists?{...snap.data(),positions:Object.fromEntries(positions.docs.map(d=>[d.id,d.data()])),tradesToday:limit.data()?.trades||0}:null,limit:limit.data()||{trades:0}};
 }
 function normalize(c,p,admin=false){
  const action=C.text(p.action,1,40),base={classId:c.classId,marketId:c.marketId,memberUserId:c.memberUserId,action};
  if(!admin){
   if(action==='openAccount')return base;
   if(['deposit','withdraw'].includes(action)){if(c.m.mode!=='coin')C.fail('invalid-argument','연습머니는 DJ코인으로 바꿀 수 없어요.');return {...base,amount:C.integer(p.amount,1,1000000)};}
   if(['buy','sell'].includes(action)){
    if(!companyIds.has(p.companyId))C.fail('invalid-argument','기업을 확인해 주세요.');
    return {...base,companyId:p.companyId,quantity:C.integer(p.quantity,1,100),reason:action==='buy'?C.text(p.reason,10,500):'',expectedPriceVersion:C.text(p.expectedPriceVersion,1,100),expectedConfigVersion:C.integer(p.expectedConfigVersion,1,Number.MAX_SAFE_INTEGER)};
   }
   if(action==='reflect')return {...base,tradeId:C.id(p.tradeId),reflection:C.text(p.reflection,1,500),expectedRevision:C.integer(p.expectedRevision,1,Number.MAX_SAFE_INTEGER)};
   C.fail('invalid-argument','연습 시장에서 지원하지 않는 작업이에요.');
  }
  teacher(c);
  const normalized={...base,reason:C.text(p.reason,1,200),expectedRevision:C.integer(p.expectedRevision,1,Number.MAX_SAFE_INTEGER)};
  if(['pause','resume'].includes(action))return normalized;
  if(action==='feedback')return {...normalized,ownerId:C.id(p.ownerId),tradeId:C.id(p.tradeId),feedback:C.text(p.feedback,1,500)};
  if(action==='updateSettings'){
   const patch=p.patch;if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!['sessionSchedule','holidayDates','limits','feeBps','lifecycle','studentAccess'].includes(k)))C.fail('invalid-argument','변경할 설정을 확인해 주세요.');
   const result={};
   if(patch.studentAccess!==undefined){if(patch.studentAccess!==true)C.fail('invalid-argument','공개한 학생 계좌 접근은 끌 수 없어요. 신규 입금·매수 중지를 이용해 주세요.');if(normalized.reason.length<10)C.fail('invalid-argument','수업 점검 결과를 10자 이상 기록해 주세요.');result.studentAccess=true;}
   if(patch.lifecycle!==undefined){if(!['disabled','enabled'].includes(patch.lifecycle))C.fail('invalid-argument','기능 상태를 확인해 주세요.');result.lifecycle=patch.lifecycle;}
   if(patch.feeBps!==undefined)result.feeBps=C.integer(patch.feeBps,0,100);
   if(patch.holidayDates!==undefined){if(!Array.isArray(patch.holidayDates)||patch.holidayDates.length>60)C.fail('invalid-argument','휴장일은 60개까지예요.');result.holidayDates=[...new Set(patch.holidayDates.map(C.date))].sort();}
   if(patch.limits!==undefined){const l=patch.limits;if(!l||Object.keys(l).some(k=>!['dailyTrades','maxOrderQuantity','maxWeightBps'].includes(k)))C.fail('invalid-argument','거래 한도를 확인해 주세요.');result.limits={dailyTrades:C.integer(l.dailyTrades,1,20),maxOrderQuantity:C.integer(l.maxOrderQuantity,1,100),maxWeightBps:C.integer(l.maxWeightBps,100,5000)};}
   if(patch.sessionSchedule!==undefined){const s=patch.sessionSchedule;if(!s||Object.keys(s).some(k=>!['newsMinute','openMinute','closeMinute'].includes(k)))C.fail('invalid-argument','거래 시간을 확인해 주세요.');result.sessionSchedule={newsMinute:C.integer(s.newsMinute,0,1437),openMinute:C.integer(s.openMinute,1,1438),closeMinute:C.integer(s.closeMinute,2,1439)};if(s.newsMinute>=s.openMinute||s.openMinute>=s.closeMinute)C.fail('invalid-argument','뉴스, 개장, 마감 순서로 설정해 주세요.');}
   return {...normalized,patch:result};
  }
  if(action==='saveNews'){
   if(!['market','sector','company'].includes(p.scope))C.fail('invalid-argument','뉴스 범위를 확인해 주세요.');
   const target=p.scope==='market'?'all':C.text(p.target,1,100);
   if(p.scope==='company'&&!companyIds.has(target)||p.scope==='sector'&&!companies.some(c=>c.sector===target))C.fail('invalid-argument','관련 기업 또는 업종을 확인해 주세요.');
   if(!['공식 발표','업계 소식','확인되지 않은 소문','정보 정정','교사 작성'].includes(p.type))C.fail('invalid-argument','뉴스 유형을 확인해 주세요.');
   const publishAt=p.publishAt===undefined||p.publishAt===null?null:C.integer(p.publishAt,1,Number.MAX_SAFE_INTEGER);

   return {...normalized,newsId:C.id(p.newsId),title:C.text(p.title,1,80),body:C.text(p.body,1,1000),scope:p.scope,target,type:p.type,effectBps:C.integer(p.effectBps,-300,300),correctionOf:p.correctionOf?C.id(p.correctionOf):null,publishAt};
  }
  if(action==='publishNews')return {...normalized,newsId:C.id(p.newsId)};
  C.fail('invalid-argument','지원하지 않는 선생님 작업이에요.');
 }
 function storedOperation(snapshot,hash){if(!snapshot.exists)return null;const op=snapshot.data();if(op.payloadHash!==hash)C.fail('already-exists','같은 요청 번호에 다른 내용이 들어 있어요.');return op.result;}
 async function queryImpl(uid,p){const stamp=now();return db.runTransaction(async tx=>{
  const c=await context(tx,uid,p),action=C.text(p.action,1,40);
  if(!c.isTeacher)enabled(c);
  if(c.m.mode==='coin')c.riskHalted=Coin.blocked((await tx.get(c.ref.collection('treasury').doc('current'))).data()||{});
  if(action==='market')return {market:marketView(c,stamp,await priceFor(tx,c)),companies};
  if(action==='company'){
   const company=companies.find(x=>x.id===p.companyId);if(!company)C.fail('invalid-argument','기업을 확인해 주세요.');
   const rows=await tx.get(c.ref.collection('dailyPrices').where('date','<=',K.clock(stamp).date).orderBy('date','desc').limit(20));
   const own=await accountFor(tx,c,c.memberUserId,stamp);return {company,maximumBuy:D.maximumBuy(own.account,marketView(c,stamp,await priceFor(tx,c)),company.id),history:rows.docs.reverse().map(d=>({date:d.id,priceMinor:d.data().prices[company.id]}))};
  }
  if(action==='news'){
   const {query,limit}=C.page(c.ref.collection('news').where('status','==','published'),p),rows=await tx.get(query);
   const result=C.paginate(rows,limit,publicNews);result.rows=result.rows.filter(n=>n.publishedAt<=stamp);return result;
  }
  if(action==='drafts'||action==='templates'){teacher(c);if(action==='templates')return {templates};const {query,limit}=C.page(c.ref.collection('news'),p);return C.paginate(await tx.get(query),limit);}
  if(action==='dashboard'){teacher(c);return {generationError:c.m.generationError,treasury:(await tx.get(c.ref.collection('treasury').doc('current'))).data(),market:marketView(c,stamp,await priceFor(tx,c))};}
  if(action==='accounts'){teacher(c);const {query,limit}=C.page(c.ref.collection('accounts'),p);return C.paginate(await tx.get(query),limit);}
  if(action==='dailyReports'){teacher(c);const {query,limit}=C.page(c.ref.collection('dailyReports'),p);return C.paginate(await tx.get(query),limit);}
  if(action==='adminAudit'){teacher(c);const {query,limit}=C.page(c.ref.collection('adminAudit'),p);return C.paginate(await tx.get(query),limit);}
  const ownerId=owner(c,p),data=await accountFor(tx,c,ownerId,stamp);
  if(action==='account') {const price=await priceFor(tx,c);const wallet=c.m.mode==='coin'?Coin.balance((await tx.get(db.doc(`userEconomy/${ownerId}`))).data()):null;return {account:data.account,walletCoin:wallet,dailyDepositsMinor:data.limit.depositsMinor||0,summary:data.account?D.summary(data.account,marketView(c,stamp,price).prices):null};}
  if(action==='quote'){
   if(ownerId!==c.memberUserId)C.fail('permission-denied','본인 주문만 확인할 수 있어요.');enabled(c);
   const input=normalize(c,{...p,action:p.side});C.revision(c.m.configVersion,input.expectedConfigVersion);
   return {quote:D.quote(data.account,marketView(c,stamp,await priceFor(tx,c)),{...input,side:input.action}),configVersion:c.m.configVersion};
  }
  if(action==='ledger'||action==='journal'){const {query,limit}=C.page(data.ref.collection(action),p);return C.paginate(await tx.get(query),limit);}
  if(action==='audit'){
   teacher(c);const rows=await tx.get(data.ref.collection('ledger').orderBy('__name__').limit(1001));
   if(rows.size>1000)return {complete:false,issues:[],message:'원장 1,000건을 넘었어요. 별도 검토가 필요해요.'};
   let cash=0,fees=0,realized=0,grants=0,deposits=0,withdrawals=0;const positions={},issues=[];
   for(const doc of rows.docs){const e=doc.data();
    const cashDelta=e.kind==='grant'?e.grantMinor:e.kind==='deposit'?e.amountMinor:e.kind==='withdraw'?-e.amountMinor:e.kind==='open'?0:e.kind==='buy'?-e.grossMinor-e.feeMinor:e.grossMinor-e.feeMinor;
    if(['deposit','withdraw'].includes(e.kind)){if((e.walletAfter-e.walletBefore)*100+cashDelta!==0||!Number.isSafeInteger(e.amountMinor)||e.amountMinor<=0||e.amountMinor%100)issues.push(`wallet-conservation:${doc.id}`);if(e.kind==='deposit')deposits+=e.amountMinor;else withdrawals+=e.amountMinor;}
    if(e.kind==='open'&&(c.m.mode!=='coin'||e.after.cashMinor!==0))issues.push(`open:${doc.id}`);
    if(e.after.cashMinor!==cash+cashDelta)issues.push(`cash-delta:${doc.id}`);
    if(e.kind==='grant'&&(grants!==0||e.grantMinor!==100000))issues.push(`grant:${doc.id}`);
    if(e.companyId){const old=positions[e.companyId]||{quantity:0,costBasisMinor:0},gross=e.priceMinor*e.quantity,fee=D.fee(gross,e.feeBps);
     const soldCost=e.kind==='sell'?(old.quantity===e.quantity?old.costBasisMinor:Math.floor(old.costBasisMinor*e.quantity/old.quantity)):0;
     const expectedQty=old.quantity+(e.kind==='buy'?e.quantity:-e.quantity),expectedCost=old.costBasisMinor+(e.kind==='buy'?gross+fee:-soldCost);
     if(gross!==e.grossMinor||fee!==e.feeMinor||expectedQty<0||e.after.quantity!==expectedQty||e.after.costBasisMinor!==expectedCost||e.realizedPnlMinor!==(e.kind==='sell'?gross-fee-soldCost:0))issues.push(`trade-math:${doc.id}`);
    }
    if(e.before.cashMinor!==cash)issues.push(`cash-before:${doc.id}`);cash=e.after.cashMinor;fees+=e.feeMinor||0;realized+=e.realizedPnlMinor||0;if(e.kind==='grant')grants+=e.grantMinor;
    if(e.companyId){const old=positions[e.companyId]||{quantity:0,costBasisMinor:0};if(old.quantity!==e.before.quantity||old.costBasisMinor!==e.before.costBasisMinor)issues.push(`position-before:${doc.id}`);positions[e.companyId]={quantity:e.after.quantity,costBasisMinor:e.after.costBasisMinor};}
   }
   if(data.account){if(cash!==data.account.cashMinor||fees!==data.account.feesMinor||realized!==data.account.realizedPnlMinor||grants!==data.account.initialGrantMinor||deposits!==data.account.depositsMinor||withdrawals!==data.account.withdrawalsMinor)issues.push('account-totals');for(const id of companyIds){const a=positions[id]||{quantity:0,costBasisMinor:0},b=data.account.positions[id]||{quantity:0,costBasisMinor:0};if(a.quantity!==b.quantity||a.costBasisMinor!==b.costBasisMinor)issues.push(`position:${id}`);}}
   else if(rows.size)issues.push('missing-account');
   return {complete:true,entries:rows.size,issues,cashMinor:cash,feesMinor:fees,realizedPnlMinor:realized,depositsMinor:deposits,withdrawalsMinor:withdrawals};
  }
  C.fail('invalid-argument','지원하지 않는 조회예요.');
 });}
 async function actionImpl(uid,p){const stamp=now();return db.runTransaction(async tx=>{
  const c=await context(tx,uid,p),input=normalize(c,p),requestId=C.requestId(p.requestId);
  if(p.ownerId!==undefined&&p.ownerId!==c.memberUserId)C.fail('permission-denied','본인 계좌만 변경할 수 있어요.');
  const ref=c.ref.collection('accounts').doc(c.memberUserId),op=ref.collection('operations').doc(requestId),payloadHash=C.hash(input),prior=storedOperation(await tx.get(op),payloadHash);
  if(prior)return prior;
  enabled(c);if(c.m.lifecycle==='archived'&&!(c.m.mode==='coin'&&['sell','withdraw'].includes(input.action)))C.fail('failed-precondition','종료된 연습 시장이에요.');
  const data=await accountFor(tx,c,c.memberUserId,stamp),a=data.account;
  if(a&&a.status!=='active')C.fail('failed-precondition','계좌 상태를 선생님께 확인해 주세요.');
  const finish=result=>{const minute=Math.floor(stamp/60000),writeCount=data.limit.minute===minute?(data.limit.writeCount||0)+1:1;if(writeCount>30)C.fail('resource-exhausted','잠시 쉬었다가 같은 요청으로 다시 확인해 주세요.',{retryable:true,retryAfterMs:60000-stamp%60000});tx.set(ref.collection('dailyLimits').doc(K.clock(stamp).date),{minute,writeCount},{merge:true});tx.create(op,{payloadHash,result,createdAt:stamp});return result;};
  if(input.action==='reflect'){
   if(!a||a.status!=='active')C.fail('failed-precondition','계좌 상태를 확인해 주세요.');
   const jr=ref.collection('journal').doc(input.tradeId),j=(await tx.get(jr)).data();if(!j)C.fail('not-found','거래일지를 찾을 수 없어요.');C.revision(j.revision,input.expectedRevision);
   tx.create(jr.collection('history').doc(String(j.revision).padStart(10,'0')),j);tx.update(jr,{reflection:input.reflection,revision:j.revision+1,updatedAt:stamp});return finish({success:true,revision:j.revision+1});
  }
  const treasuryRef=c.ref.collection('treasury').doc('current'),treasury=(await tx.get(treasuryRef)).data();
  if(input.action==='openAccount'){
   if(a)return finish({success:true,opened:false,revision:a.revision});
   if(c.m.lifecycle!=='enabled')C.fail('failed-precondition','지금은 새 계좌를 열 수 없어요.');
   const initial=D.openAccount(c.m.mode);delete initial.positions;delete initial.tradesToday;initial.revision=1;
   tx.create(ref,initial);
   tx.create(ref.collection('ledger').doc(`0000000001-${requestId}`),{kind:c.m.mode==='coin'?'open':'grant',grantMinor:initial.initialGrantMinor,before:{cashMinor:0},after:{cashMinor:initial.cashMinor},requestId,createdAt:stamp,configVersion:c.m.configVersion,revisionAfter:1});
   tx.update(treasuryRef,{initialGrantsMinor:D.integer(treasury.initialGrantsMinor+initial.initialGrantMinor),accountCount:treasury.accountCount+1,revision:treasury.revision+1});
   return finish({success:true,opened:true,revision:1});
  }
  c.riskHalted=Coin.blocked(treasury);
  const dailyRef=c.ref.collection('dailyReports').doc(K.clock(stamp).date),daily=(await tx.get(dailyRef)).data()||{};
  if(['deposit','withdraw'].includes(input.action)){
   const walletRef=db.doc(`userEconomy/${c.memberUserId}`),wallet=(await tx.get(walletRef)).data()||{};
   const price=await priceFor(tx,c);
   const moved=Coin.transfer({side:input.action,amount:input.amount,account:a,wallet,limit:data.limit,treasury,market:c.m,netAssetsMinor:a?D.summary(a,marketView(c,stamp,price).prices).netAssetsMinor:0});
   await beforeTransferCommit(moved);
   const next={...moved.account};delete next.positions;delete next.tradesToday;
   tx.set(ref,next);
   // Both aliases are synchronized to the authoritative djCoin ?? coin value.
   // No quiz reward, point mirror, classroom fund or experience counters are touched.
   tx.set(walletRef,{memberUserId:c.memberUserId,userId:c.memberUserId,djCoin:moved.walletAfter,coin:moved.walletAfter},{merge:true});
   tx.create(ref.collection('ledger').doc(`${String(next.revision).padStart(10,'0')}-${requestId}`),{kind:input.action,amountMinor:moved.amountMinor,walletBefore:moved.walletBefore,walletAfter:moved.walletAfter,before:{cashMinor:a.cashMinor},after:{cashMinor:next.cashMinor},requestId,createdAt:stamp,configVersion:c.m.configVersion,revisionAfter:next.revision});
   const key=input.action==='deposit'?'depositsMinor':'withdrawalsMinor';
   tx.set(dailyRef,{[key]:D.integer((daily[key]||0)+moved.amountMinor)},{merge:true});
   if(input.action==='deposit')tx.set(ref.collection('dailyLimits').doc(K.clock(stamp).date),{depositsMinor:(data.limit.depositsMinor||0)+moved.amountMinor},{merge:true});
   tx.update(treasuryRef,{...moved.totals,revision:treasury.revision+1});
   return finish({success:true,revision:next.revision,walletCoin:moved.walletAfter,cashMinor:next.cashMinor,amountMinor:moved.amountMinor});
  }
  C.revision(c.m.configVersion,input.expectedConfigVersion);
  const price=await priceFor(tx,c),order={...input,side:input.action},settled=D.trade(a,marketView(c,stamp,price),order),next=settled.account,result=settled.result;
  const oldPosition=a.positions[input.companyId]||{quantity:0,costBasisMinor:0},tradeId=`${String(next.revision).padStart(10,'0')}-${requestId}`;
  const position=next.positions[input.companyId];
  const positionRef=ref.collection('positions').doc(input.companyId);
  if(position)tx.set(positionRef,{...position,lastBuyTradeId:input.action==='buy'?tradeId:oldPosition.lastBuyTradeId||null});else tx.delete(positionRef);
  const account={...next};delete account.positions;delete account.tradesToday;
  tx.set(ref,account);
  tx.set(ref.collection('dailyLimits').doc(K.clock(stamp).date),{trades:next.tradesToday},{merge:true});
  tx.create(ref.collection('ledger').doc(tradeId),{kind:input.action,companyId:input.companyId,quantity:input.quantity,before:{cashMinor:a.cashMinor,quantity:oldPosition.quantity,costBasisMinor:oldPosition.costBasisMinor},after:{cashMinor:next.cashMinor,quantity:result.quantity,costBasisMinor:result.costBasisMinor},priceMinor:result.priceMinor,feeBps:c.m.feeBps,grossMinor:result.grossMinor,feeMinor:result.feeMinor,taxMinor:0,realizedPnlMinor:result.realizedPnlMinor,priceVersion:input.expectedPriceVersion,configVersion:c.m.configVersion,requestId,createdAt:stamp,revisionAfter:next.revision});
  tx.create(ref.collection('journal').doc(tradeId),{order:{companyId:input.companyId,side:input.action,quantity:input.quantity,reason:input.reason,expectedPriceVersion:input.expectedPriceVersion},result,originalBuyTradeId:input.action==='sell'?oldPosition.lastBuyTradeId||null:null,reflection:'',feedback:'',revision:1,createdAt:stamp});
  tx.set(dailyRef,{feesMinor:D.integer((daily.feesMinor||0)+result.feeMinor),realizedPnlMinor:D.integer((daily.realizedPnlMinor||0)+result.realizedPnlMinor,Number.MIN_SAFE_INTEGER)},{merge:true});
  tx.update(treasuryRef,{realizedPnlMinor:D.integer((treasury.realizedPnlMinor||0)+result.realizedPnlMinor,Number.MIN_SAFE_INTEGER),feesMinor:D.integer(treasury.feesMinor+result.feeMinor),systemCashFlowMinor:D.integer(treasury.systemCashFlowMinor+(input.action==='buy'?result.grossMinor:-result.grossMinor),Number.MIN_SAFE_INTEGER),revision:treasury.revision+1});
  return finish({success:true,tradeId,result,revision:next.revision});
 },{maxAttempts:30});}
 async function adminImpl(uid,p){const stamp=now();return db.runTransaction(async tx=>{
  const c=await context(tx,uid,p);teacher(c);
  const input=normalize(c,p,true),requestId=C.requestId(p.requestId),audit=c.ref.collection('adminAudit').doc(requestId),payloadHash=C.hash(input);
  const prior=storedOperation(await tx.get(audit),payloadHash);if(prior)return prior;
  let before,after,result;
  if(['pause','resume','updateSettings'].includes(input.action)){
   if(input.patch?.holidayDates){const today=K.clock(stamp).date;const old=c.m.holidayDates.filter(d=>d<=today),next=input.patch.holidayDates.filter(d=>d<=today);if(C.hash(old)!==C.hash(next))C.fail('invalid-argument','지난 휴장일은 변경할 수 없어요.');}
   C.revision(c.m.configVersion,input.expectedRevision);if(c.m.lifecycle==='archived')C.fail('failed-precondition','종료된 시장은 변경할 수 없어요.');
   before={studentAccess:c.m.studentAccess!==false,lifecycle:c.m.lifecycle,sessionSchedule:c.m.sessionSchedule,holidayDates:c.m.holidayDates,limits:c.m.limits,feeBps:c.m.feeBps,configVersion:c.m.configVersion};
   after=input.action==='updateSettings'?{...before,...input.patch,configVersion:c.m.configVersion+1}:{...before,lifecycle:input.action==='pause'?'paused':'enabled',configVersion:c.m.configVersion+1};
   tx.update(c.ref,after);result={success:true,revision:after.configVersion};
  }else if(input.action==='feedback'){
   const data=await accountFor(tx,c,input.ownerId,stamp);if(!data.account||data.account.status!=='active')C.fail('failed-precondition','계좌를 확인해 주세요.');
   const ref=data.ref.collection('journal').doc(input.tradeId),j=(await tx.get(ref)).data();if(!j)C.fail('not-found','거래일지가 없어요.');C.revision(j.revision,input.expectedRevision);
   before=j;after={...j,feedback:input.feedback,revision:j.revision+1,updatedAt:stamp};tx.create(ref.collection('history').doc(String(j.revision).padStart(10,'0')),j);tx.set(ref,after);result={success:true,revision:after.revision};
  }else{
   const ref=c.ref.collection('news').doc(input.newsId),n=(await tx.get(ref)).data();
   // New drafts use expectedRevision 1; subsequent edits require the saved revision.
   C.revision(n?.revision||1,input.expectedRevision);
   if(n?.status==='published')C.fail('failed-precondition','발행한 뉴스는 고칠 수 없어요. 정정 뉴스를 작성해 주세요.');
   before=n||null;
   if(input.action==='saveNews'){
    if(input.publishAt!==null&&(!K.business(K.clock(input.publishAt).date,c.m.holidayDates)||K.clock(input.publishAt).minute!==c.m.sessionSchedule.newsMinute))C.fail('invalid-argument','거래일 뉴스 공개 시각에 예약해 주세요.');
    if(input.publishAt!==null&&(input.publishAt<=stamp||input.publishAt>stamp+366*86400000))C.fail('invalid-argument','예약 날짜를 확인해 주세요.');
    if(input.type==='정보 정정'&&!input.correctionOf)C.fail('invalid-argument','정정할 원문을 선택해 주세요.');
    if(input.correctionOf){const original=(await tx.get(c.ref.collection('news').doc(input.correctionOf))).data();if(!original||original.status!=='published')C.fail('invalid-argument','발행된 원문만 정정할 수 있어요.');}
    if(input.type==='확인되지 않은 소문'&&!/확인|불확실/.test(input.body))C.fail('invalid-argument','소문의 불확실성을 본문에 알려 주세요.');
    after={title:input.title,body:input.body,type:input.type,scope:input.scope,target:input.target,effectBps:input.effectBps,correctionOf:input.correctionOf,publishAt:input.publishAt,status:input.publishAt?'scheduled':'draft',effectiveDate:input.publishAt?K.clock(input.publishAt).date:null,revision:(n?.revision||0)+1,updatedAt:stamp};
   }else{if(!n)C.fail('not-found','발행할 뉴스가 없어요.');after={...n,status:'published',publishedAt:stamp,effectiveDate:K.effectiveDate(c.m,stamp),revision:n.revision+1};}
   tx.set(ref,after);tx.update(c.ref,{newsRevision:c.m.newsRevision+1});result={success:true,newsId:input.newsId,revision:after.revision,effectiveDate:after.effectiveDate};
  }
  tx.create(audit,{actor:c.memberUserId,action:input.action,reason:input.reason,before,after,requestId,payloadHash,result,createdAt:stamp});return result;
 },{maxAttempts:30});}
 return {query:wrap(queryImpl),action:wrap(actionImpl),admin:wrap(adminImpl)};
}
module.exports={createService};
