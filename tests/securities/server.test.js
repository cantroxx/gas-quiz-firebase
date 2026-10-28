const {test}=require('node:test'),assert=require('node:assert/strict');
const K=require('../../functions/classroom/securities/calendar');
const S=require('../../functions/classroom/securities/domain'),F=require('../../public/js/domain/securities-domain');
const {factors,companies}=require('../../functions/classroom/securities/market-engine');
const m={sessionSchedule:K.DEFAULT_SCHEDULE,lastPriceDate:'2026-10-16',currentPriceVersion:'v1',holidayDates:[]};
test('server KST boundaries, holiday and next opening',()=>{
 for(const [time,state]of [['09:29:59','preopen'],['09:30:00','open'],['14:29:59','open'],['14:30:00','closed']])assert.equal(K.session(m,Date.parse(`2026-10-16T${time}+09:00`)).session,state);
 assert.equal(K.session(m,K.at('2026-10-17',600)).session,'holiday');
 assert.equal(K.session(m,K.at('2026-10-17',600)).nextOpenAt,K.at('2026-10-19',570));
 assert.equal(K.session({...m,holidayDates:['2026-10-19']},K.at('2026-10-17',600)).nextOpenAt,K.at('2026-10-20',570));
 assert.equal(K.session({...m,lastPriceDate:'2026-10-15'},K.at('2026-10-16',570)).session,'error');
 assert.equal(K.clock(Date.parse('2026-10-16T14:59:59Z')).date,'2026-10-16');assert.equal(K.clock(Date.parse('2026-10-16T15:00:00Z')).date,'2026-10-17');
 assert.equal(K.effectiveDate(m,K.at('2026-10-16',509)),'2026-10-16');assert.equal(K.effectiveDate(m,K.at('2026-10-16',510)),'2026-10-19');
});
test('server/frontend default arithmetic parity and exact weight boundary',()=>{
 const market={mode:'practice',session:'open',lifecycle:'enabled',priceVersion:'v',prices:{sample:100},feeBps:50};
 const order={side:'buy',companyId:'sample',quantity:1,expectedPriceVersion:'v',reason:'기업의비용과판매량을함께확인했어요'};
 let a={...S.openAccount(),cashMinor:201};assert.deepEqual(S.trade(a,market,order),F.trade(a,market,order));
 assert.throws(()=>S.quote({...a,cashMinor:200},market,order),e=>e.code==='weight-limit');
 assert.throws(()=>S.quote(a,{...market,limits:{maxWeightBps:4000}},order));
 assert.throws(()=>S.quote({...a,tradesToday:1},{...market,limits:{dailyTrades:1}},order));
 assert.throws(()=>S.quote(a,{...market,limits:{maxOrderQuantity:1}},{...order,quantity:2}));
});
test('deterministic private factors bounded and differentiated',()=>{
 const c=companies[0],x=factors('test-seed','market','2026-10-16',c,[]);
 assert.deepEqual(x,factors('test-seed','market','2026-10-16',c,[]));assert.notDeepEqual(x,factors('different-seed','market','2026-10-16',c,[]));
 assert.equal(factors('test-seed','market','2026-10-16',c,Array(10).fill({scope:'market',effectBps:300})).total,500);
});
test('callables take principal exclusively from request.auth; production registration restricts the pilot',async()=>{
 const fs=require('node:fs'),source=fs.readFileSync(require.resolve('../../functions/index.js'),'utf8');
 assert(source.includes("require('./classroom/securities/production').register"));
 const {register}=require('../../functions/classroom/securities/callables');
 const handlers=register({onCall:(_,fn)=>fn,db:{},region:'test',ErrorType:require('../../functions/classroom/securities/contracts').SecuritiesError});
 assert.deepEqual(Object.keys(handlers).sort(),['classroomSecuritiesAction','classroomSecuritiesAdminAction','classroomSecuritiesQuery']);
 for(const h of Object.values(handlers))await assert.rejects(h({data:{uid:'forged',isTeacher:true}}),e=>e.code==='unauthenticated');
});

test('production endpoints reject non-pilot targets before accessing data',()=>{
 const {register}=require('../../functions/classroom/securities/production'),ErrorType=require('../../functions/classroom/securities/contracts').SecuritiesError;
 const handlers=register({onCall:(_,fn)=>fn,onSchedule:(_,fn)=>fn,db:{},region:'test',ErrorType});
 for(const key of ['classroomSecuritiesQuery','classroomSecuritiesAction','classroomSecuritiesAdminAction']){
  assert.throws(()=>handlers[key]({data:{}}),e=>e.code==='unauthenticated');
  assert.throws(()=>handlers[key]({auth:{uid:'uid'},data:{classId:'G4-C9',marketId:'coin-v1'}}),e=>e.code==='permission-denied');
  assert.throws(()=>handlers[key]({auth:{uid:'uid'},data:{classId:'G4-C8',marketId:'practice-v1'}}),e=>e.code==='permission-denied');
 }
});
