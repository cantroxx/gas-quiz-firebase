'use strict';
const crypto=require('node:crypto'),C=require('./contracts'),K=require('./calendar');
const {companies,templates}=require('./catalog.json');
function reference(db,classId,marketId){return db.doc(`classrooms/${C.id(classId)}/securitiesMarkets/${C.id(marketId)}`);}
function factors(seed,marketId,date,company,news){
 const draw=(label,range)=>crypto.createHmac('sha256',seed).update(`${marketId}:${date}:v1:${label}`).digest().readUInt32BE(0)%(2*range+1)-range;
 const market=draw('market',50),sector=draw(`sector:${company.sector}`,50),individual=draw(company.id,{'낮음':100,'보통':200,'높음':300}[company.risk]);
 const newsEffect=news.filter(n=>n.scope==='market'||n.scope==='sector'&&n.target===company.sector||n.scope==='company'&&n.target===company.id).reduce((sum,n)=>sum+n.effectBps,0);
 return {market,sector,individual,newsEffect,total:Math.max(-500,Math.min(500,market+sector+individual+newsEffect))};
}
function createEngine({db,now=Date.now,seed=()=>crypto.randomBytes(32).toString('hex'),beforeCommit=async()=>{}}){
 async function initialize({classId,marketId,startDate,mode='practice'}){
  if(!['practice','coin'].includes(mode))C.fail('invalid-argument','시장 모드를 확인해 주세요.');
  C.date(startDate);if(!K.business(startDate))C.fail('invalid-argument','시작일은 평일이어야 해요.');
  const ref=reference(db,classId,marketId);
  return db.runTransaction(async tx=>{
   const [parent,existing]=await Promise.all([tx.get(db.doc(`classrooms/${classId}`)),tx.get(ref)]);
   if(!parent.exists)C.fail('failed-precondition','학급이 없습니다.');
   if(existing.exists){if(existing.data().mode!==mode||existing.data().startDate!==startDate)C.fail('already-exists','다른 설정의 시장이 이미 있어요.');return {created:false};}
   tx.create(ref,{schemaVersion:1,mode,studentAccess:mode==='practice',lifecycle:'disabled',configVersion:1,algorithmVersion:'v1',startDate,sessionSchedule:K.DEFAULT_SCHEDULE,holidayDates:[],limits:{dailyTrades:3,maxOrderQuantity:100,maxWeightBps:5000},feeBps:50,currencyScale:100,currentPriceVersion:null,lastPriceDate:null,newsRevision:0,generationError:null});
   tx.create(ref.collection('privateEngine').doc('config'),{seed:seed()});
   for(const company of companies)tx.create(ref.collection('companies').doc(company.id),company);
   tx.create(ref.collection('treasury').doc('current'),{feesMinor:0,systemCashFlowMinor:0,initialGrantsMinor:0,depositsMinor:0,withdrawalsMinor:0,realizedPnlMinor:0,riskHalted:false,accountCount:0,revision:0});
   return {created:true};
  });
 }
 async function publishScheduledNews({classId,marketId}){
  const ref=reference(db,classId,marketId),stamp=now();
  return db.runTransaction(async tx=>{
   const m=(await tx.get(ref)).data();if(!m||!['practice','coin'].includes(m.mode))C.fail('failed-precondition','연습 시장이 없습니다.');
   const rows=await tx.get(ref.collection('news').where('status','==','scheduled').limit(101));
   if(rows.size>100)C.fail('resource-exhausted','예약 뉴스가 많아요. 운영자에게 알려 주세요.');
   let count=0;
   for(const d of rows.docs){const n=d.data();if(n.publishAt>stamp)continue;
    // Late jobs never apply an already published price retroactively.
    const intended=K.clock(n.publishAt).date;
    const effectiveDate=intended>K.clock(stamp).date||!K.business(intended,m.holidayDates)?K.effectiveDate(m,stamp):m.lastPriceDate===intended||K.clock(stamp).date!==intended?K.effectiveDate(m,stamp):intended;
    tx.update(d.ref,{status:'published',publishedAt:stamp,effectiveDate,revision:n.revision+1});count++;
   }
   if(count)tx.update(ref,{newsRevision:m.newsRevision+1});
   return {published:count};
  });
 }
 async function generateDailyPrices({classId,marketId,date}){
  C.date(date);const ref=reference(db,classId,marketId),stamp=now(),today=K.clock(stamp).date;
  if(date>today)C.fail('failed-precondition','미래 시세는 생성할 수 없어요.');
  try{return await db.runTransaction(async tx=>{
   const [ms,existing,secret]=await Promise.all([tx.get(ref),tx.get(ref.collection('dailyPrices').doc(date)),tx.get(ref.collection('privateEngine').doc('config'))]);
   if(existing.exists)return {date,version:existing.data().version,replayed:true};
   const m=ms.data();if(!m||!['practice','coin'].includes(m.mode)||m.lifecycle==='archived')C.fail('failed-precondition','시장을 확인해 주세요.');
   if(!K.business(date,m.holidayDates)||date<m.startDate||date===today&&K.clock(stamp).minute<m.sessionSchedule.openMinute)C.fail('failed-precondition','시세 생성 시간이 아니에요.');
   const previousDate=date===m.startDate?null:K.next(date,m.holidayDates,-1);
   if(m.lastPriceDate!==previousDate)C.fail('failed-precondition','이전 거래일 시세부터 복구해 주세요.',{missingDate:previousDate});
   const [prior,newsRows]=await Promise.all([previousDate?tx.get(ref.collection('dailyPrices').doc(previousDate)):Promise.resolve(null),tx.get(ref.collection('news').where('effectiveDate','==',date).limit(101))]);
   if(previousDate&&!prior.exists)C.fail('failed-precondition','이전 거래일 시세가 없어요.',{missingDate:previousDate});
   if(newsRows.size>100)C.fail('resource-exhausted','하루 뉴스 한도를 확인해 주세요.');
   if(newsRows.docs.some(d=>d.data().status==='scheduled'&&d.data().publishAt<=stamp))C.fail('failed-precondition','예약 뉴스를 먼저 발행해 주세요.');
   const news=newsRows.docs.filter(d=>d.data().status==='published'&&d.data().publishedAt<=stamp).map(d=>({id:d.id,...d.data()}));
   const previous=prior?.data()?.prices||Object.fromEntries(companies.map(c=>[c.id,c.initialPriceMinor]));
   const prices={},changes={},audit={};
   for(const c of companies){audit[c.id]=factors(secret.data().seed,marketId,date,c,news);prices[c.id]=Math.max(100,Math.min(100000,Math.floor((previous[c.id]*(10000+audit[c.id].total)+5000)/10000)));changes[c.id]=prices[c.id]-previous[c.id];}
   const version=`${date}-${C.hash({prices,configVersion:m.configVersion,previousVersion:m.currentPriceVersion}).slice(0,16)}`;
   await beforeCommit({date,prices});
   tx.create(ref.collection('dailyPrices').doc(date),{date,version,previousVersion:m.currentPriceVersion,prices,changes,publishedAt:stamp,configVersion:m.configVersion});
   tx.create(ref.collection('privateEngine').doc(date),{algorithmVersion:'v1',factors:audit,newsIds:news.map(n=>n.id),status:'complete'});
   tx.update(ref,{currentPriceVersion:version,lastPriceDate:date,generationError:null});
   return {date,version,replayed:false};
  });}catch(error){
   // Failure metadata never changes a successful publication or its pointer.
   await db.runTransaction(async tx=>{const m=(await tx.get(ref)).data();const generationError={date,code:error.code||'internal',missingDate:error.details?.missingDate||null};if(m&&(!m.lastPriceDate||m.lastPriceDate<date)&&C.hash(m.generationError)!==C.hash(generationError))tx.update(ref,{generationError});});
   throw error;
  }
 }
 async function closeReport({classId,marketId}){
  const ref=reference(db,classId,marketId),stamp=now(),date=K.clock(stamp).date;
  return db.runTransaction(async tx=>{
   const m=(await tx.get(ref)).data();if(!m||m.lastPriceDate!==date||K.clock(stamp).minute<m.sessionSchedule.closeMinute)return {skipped:true};
   const reportRef=ref.collection('dailyReports').doc(date),report=(await tx.get(reportRef)).data()||{};
   if(report.valuationAt)return {replayed:true};
   const [prices,accounts]=await Promise.all([tx.get(ref.collection('dailyPrices').doc(date)),tx.get(ref.collection('accounts').limit(101))]);
   if(accounts.size>100)C.fail('resource-exhausted','시범 학급 계좌 수를 확인해 주세요.');
   const D=require('./domain');let cashMinor=0,valueMinor=0,unrealizedPnlMinor=0;
   for(const row of accounts.docs){const positions=await tx.get(row.ref.collection('positions').limit(13));if(positions.size>12)C.fail('failed-precondition','계좌 점검이 필요해요.');const a={...row.data(),positions:Object.fromEntries(positions.docs.map(p=>[p.id,p.data()]))},total=D.summary(a,prices.data().prices);cashMinor=D.integer(cashMinor+a.cashMinor);valueMinor=D.integer(valueMinor+total.valueMinor);unrealizedPnlMinor=D.integer(unrealizedPnlMinor+total.unrealizedPnlMinor,Number.MIN_SAFE_INTEGER);}
   tx.set(reportRef,{valuationAt:stamp,valuationPriceVersion:prices.data().version,cashMinor,valueMinor,unrealizedPnlMinor,accountCount:accounts.size},{merge:true});return {recorded:true};
  });
 }
 async function runSchedule(targets,kind){const results=[];for(const target of targets){try{const m=(await reference(db,target.classId,target.marketId).get()).data();if(!m||m.lifecycle==='archived'||!K.business(K.clock(now()).date,m.holidayDates)||(kind!=='news'&&K.clock(now()).minute<m.sessionSchedule.openMinute)){results.push({target,skipped:true});continue;}results.push({target,result:kind==='news'?await publishScheduledNews(target):await generateDailyPrices({...target,date:K.clock(now()).date})});}catch(e){results.push({target,error:{code:e.code||'internal',missingDate:e.details?.missingDate||null}});}}return results;}
 return {initialize,publishScheduledNews,generateDailyPrices,closeReport,runSchedule};
}
module.exports={createEngine,reference,factors,companies,templates};
