'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {initializeApp,deleteApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore');
const {initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing');
const {getDoc,setDoc,collection,getDocs,doc}=require('firebase/firestore');
const {createEngine,companies}=require('../../functions/classroom/securities/market-engine');
const {createService}=require('../../functions/classroom/securities/service');
const K=require('../../functions/classroom/securities/calendar');
const {guard,authorizeFor,seedMembers}=require('./emulator-support');
const {projectId,host}=guard(),classId='SECURITIES-TEST',marketId='practice-v1';
(async()=>{
 const app=initializeApp({projectId},'securities-integration'),db=getFirestore(app);
 const [hostname,port]=host.split(':'),env=await initializeTestEnvironment({projectId,firestore:{host:hostname,port:Number(port),rules:fs.readFileSync(process.env.SECURITIES_RULES_PATH||'firestore.rules','utf8')}});
 const root=db.doc(`classrooms/${classId}/securitiesMarkets/${marketId}`);
 let people;
 try{
 await db.recursiveDelete(db.doc(`classrooms/${classId}`));people=await seedMembers(db,classId);
 let stamp=K.at('2026-10-16',600),fail=false;
 const engine=createEngine({db,now:()=>stamp,seed:()=> 'securities-test-seed',beforeCommit:async()=>{if(fail)throw Error('injected price failure');}});
 const service=createService({db,now:()=>stamp,authorize:authorizeFor(db)});
 const target={classId,marketId};
 const as=(role,method,p)=>service[method](`uid-${people[role]}`,{...target,memberUserId:people[role],...p});
 const query=(action,extra={})=>as('student','query',{action,...extra});
 const action=(action,extra={})=>as('student','action',{action,requestId:crypto.randomUUID(),...extra});
 const admin=async(action,extra={})=>as('teacher','admin',{action,requestId:crypto.randomUUID(),reason:'합성 수업 검증',expectedRevision:(await root.get()).data().configVersion,...extra});
 const reject=(promise,code)=>assert.rejects(promise,e=>e.code===code,code);
 await engine.initialize({...target,startDate:'2026-10-16'});
 await reject(query('market'),'failed-precondition');
 await admin('resume');
 await engine.generateDailyPrices({...target,date:'2026-10-16'});
 let market=(await query('market')).market;
 assert.equal(market.session,'open');assert.equal(Object.keys(market.prices).length,12);
 assert.equal((await query('company',{companyId:'sprout_food'})).history.length,1);
 const before=(await root.collection('accounts').get()).size;
 for(let i=0;i<3;i++)assert.equal((await query('account')).account,null);
 assert.equal((await root.collection('accounts').get()).size,before,'queries must not create accounts');
 await reject(service.query('',{}),'unauthenticated');
 await reject(service.query('uid-sec-b',{...target,memberUserId:people.student,action:'market'}),'permission-denied');
 for(const role of ['outsider','wrongTeacher','inactive'])await reject(as(role,'query',{action:'market'}),'permission-denied');
 await reject(query('account',{ownerId:people.other}),'permission-denied');
 await reject(as('student','admin',{action:'pause'}),'permission-denied');
 await reject(query('drafts'),'permission-denied');await reject(query('accounts'),'permission-denied');
 await reject(query('market',{classId:'NONEXISTENT'}),'permission-denied');
 const openId=crypto.randomUUID();
 const opens=await Promise.all(Array.from({length:20},()=>action('openAccount',{requestId:openId})));
 assert(opens.every(x=>JSON.stringify(x)===JSON.stringify(opens[0])));
 assert.equal((await query('account')).account.cashMinor,100000);
 assert.equal((await query('ledger')).rows.length,1);
 const order={companyId:'sprout_food',quantity:1,reason:'뉴스의비용과판매량을함께검토했어요',expectedPriceVersion:market.priceVersion,expectedConfigVersion:market.configVersion};
 const buyId=crypto.randomUUID();const buys=await Promise.all(Array.from({length:20},()=>action('buy',{...order,requestId:buyId})));
 assert(buys.every(x=>JSON.stringify(x)===JSON.stringify(buys[0])));
 let account=(await query('account')).account;assert.equal(account.positions.sprout_food.quantity,1);assert.equal(account.tradesToday,1);
 await reject(action('buy',{...order,quantity:2,requestId:buyId}),'already-exists');
 await reject(action('buy',{...order,quantity:'1'}),'invalid-argument');
 await reject(action('buy',{...order,expectedPriceVersion:'stale'}),'failed-precondition');
 await reject(action('deposit',{amount:100}),'invalid-argument');await reject(action('withdraw',{amount:1}),'invalid-argument');
 // Two different sells compete for the same one share. Exactly one can settle.
 const sells=await Promise.allSettled([action('sell',order),action('sell',order)]);
 assert.equal(sells.filter(r=>r.status==='fulfilled').length,1);account=(await query('account')).account;assert.equal(account.positions.sprout_food,undefined);assert.equal(account.tradesToday,2);
 const race=await Promise.allSettled(Array.from({length:20},()=>action('buy',order)));
 assert.equal(race.filter(r=>r.status==='fulfilled').length,1,'daily limit must be atomic');
 account=(await query('account')).account;assert.equal(account.tradesToday,3);assert(account.cashMinor>=0);
 const audited=await as('teacher','query',{action:'audit',ownerId:people.student});assert.equal(audited.complete,true);assert.deepEqual(audited.issues,[]);
 const ledgerRef=root.collection('accounts').doc(people.student).collection('ledger').doc(buys[0].tradeId),originalLedger=(await ledgerRef.get()).data();await ledgerRef.update({grossMinor:originalLedger.grossMinor+1});
 assert((await as('teacher','query',{action:'audit',ownerId:people.student})).issues.some(x=>x.startsWith('trade-math:')));
 assert.equal((await query('account')).account.cashMinor,account.cashMinor,'audit must never repair balances');await ledgerRef.set(originalLedger);
 const treasury=(await root.collection('treasury').doc('current').get()).data();assert.equal(treasury.feesMinor,account.feesMinor);assert.equal(account.cashMinor+treasury.systemCashFlowMinor+treasury.feesMinor,treasury.initialGrantsMinor);
 const journal=(await query('journal')).rows;assert.equal(journal.length,3);assert.equal(journal.find(j=>j.order.side==='sell').originalBuyTradeId,buys[0].tradeId);
 const tradeId=buys[0].tradeId;
 await action('reflect',{tradeId,reflection:'근거를더확인해볼래요',expectedRevision:1});
 await reject(action('reflect',{tradeId,reflection:'덮어쓰기',expectedRevision:1}),'aborted');
 await admin('feedback',{ownerId:people.student,tradeId,feedback:'근거를 비교한 점이 좋아요.',expectedRevision:2});
 assert.equal((await root.collection('accounts').doc(people.student).collection('journal').doc(tradeId).collection('history').get()).size,2);
 // Successful writes have an account/minute bound, and retry can resume later.
 await as('other','action',{action:'openAccount',requestId:crypto.randomUUID()});
 await as('other','action',{action:'buy',...order,requestId:crypto.randomUUID()});
 const otherJournal=(await as('other','query',{action:'journal'})).rows[0],otherLimit=root.collection('accounts').doc(people.other).collection('dailyLimits').doc('2026-10-16');
 await otherLimit.set({minute:Math.floor(stamp/60000),writeCount:30},{merge:true});
 const reflectPayload={action:'reflect',tradeId:otherJournal.id,reflection:'잠시쉬고다시확인했어요',expectedRevision:1,requestId:crypto.randomUUID()};
 await reject(as('other','action',reflectPayload),'resource-exhausted');stamp+=60000;await as('other','action',reflectPayload);
 const page1=await query('ledger',{limit:2}),page2=await query('ledger',{limit:2,cursor:page1.cursor});assert(page1.cursor);assert.equal(page2.cursor,null);assert.equal(new Set([...page1.rows,...page2.rows].map(x=>x.id)).size,4);
 await reject(query('ledger',{limit:51}),'invalid-argument');
 // Pauses are immediate; retry of committed order remains a read of old success.
 await admin('pause');await reject(action('buy',order),'aborted');assert.deepEqual(await action('buy',{...order,requestId:buyId}),buys[0]);
 assert.equal((await query('market')).market.lifecycle,'paused');
 await admin('resume');
 await admin('updateSettings',{patch:{lifecycle:'disabled'}});await reject(query('market'),'failed-precondition');await admin('updateSettings',{patch:{lifecycle:'enabled'}});
 await reject(admin('updateSettings',{patch:{mode:'coin'}}),'invalid-argument');
 await reject(admin('updateSettings',{expectedRevision:1,patch:{feeBps:0}}),'aborted');
 await admin('updateSettings',{patch:{holidayDates:['2026-10-20'],limits:{dailyTrades:4,maxOrderQuantity:50,maxWeightBps:4000}}});
 // Published DTOs exclude private effects and unpublished news. No retroactive prices.
 const priceOriginal=(await root.collection('dailyPrices').doc('2026-10-16').get()).data();
 const futureRef=root.collection('dailyPrices').doc('2099-01-01');await futureRef.set({...priceOriginal,date:'2099-01-01',prices:{sprout_food:99999}});assert((await query('company',{companyId:'sprout_food'})).history.every(p=>p.date<='2026-10-16'));await futureRef.delete();
 const news={newsId:'lesson-news',title:'새로운 소식',body:'비용과 판매를 함께 확인해요.',type:'교사 작성',scope:'company',target:'sprout_food',effectBps:200};
 await admin('saveNews',{...news,expectedRevision:1});assert.equal((await query('news')).rows.length,0);
 await admin('publishNews',{newsId:news.newsId,expectedRevision:1});const publicNews=(await query('news')).rows[0];assert.equal(publicNews.effectiveDate,'2026-10-19');assert(!('effectBps' in publicNews));
 await reject(admin('saveNews',{...news,expectedRevision:2}),'failed-precondition');
 await admin('saveNews',{...news,newsId:'correction',type:'정보 정정',correctionOf:'lesson-news',expectedRevision:1});
 await admin('publishNews',{newsId:'correction',expectedRevision:1});
 assert.deepEqual((await root.collection('dailyPrices').doc('2026-10-16').get()).data(),priceOriginal);
 // Scheduled job before/after deadline, then atomic retryable price publication.
 const publishAt=K.at('2026-10-19',510),scheduledId=crypto.randomUUID();
 const scheduledPayload={...news,newsId:'scheduled-news',publishAt,expectedRevision:1,requestId:scheduledId};
 await admin('saveNews',scheduledPayload);assert.equal((await engine.publishScheduledNews(target)).published,0);
 stamp=K.at('2026-10-19',510);assert.equal((await engine.publishScheduledNews(target)).published,1);assert.equal((await engine.publishScheduledNews(target)).published,0);
 stamp=K.at('2026-10-19',570);fail=true;await assert.rejects(engine.generateDailyPrices({...target,date:'2026-10-19'}));
 assert.equal((await root.collection('dailyPrices').doc('2026-10-19').get()).exists,false);assert.equal((await query('market')).market.session,'error');
 fail=false;const generated=await Promise.all(Array.from({length:5},()=>engine.generateDailyPrices({...target,date:'2026-10-19'})));
 assert(generated.every(x=>x.version===generated[0].version));assert.equal(generated.filter(x=>!x.replayed).length,1);
 const next=(await query('market')).market;assert.equal(next.session,'open');for(const c of companies)assert(Math.abs(next.prices[c.id]-priceOriginal.prices[c.id])<=Math.ceil(priceOriginal.prices[c.id]*.05));
 assert.deepEqual(await action('buy',{...order,requestId:buyId}),buys[0],'next-day lost response replay');assert.equal((await query('account')).account.tradesToday,0);
 // Same scheduled-news request still succeeds after its scheduled timestamp.
 const replay=await admin('saveNews',scheduledPayload);assert.equal(replay.newsId,'scheduled-news');
 stamp=K.at('2026-10-22',600);await reject(engine.generateDailyPrices({...target,date:'2026-10-22'}),'failed-precondition');
 assert.equal((await root.get()).data().generationError.missingDate,'2026-10-21');
 assert.equal((await query('market')).market.session,'error');
 await engine.generateDailyPrices({...target,date:'2026-10-21'});await engine.generateDailyPrices({...target,date:'2026-10-22'});
 const version=(await root.get()).data().currentPriceVersion;await engine.generateDailyPrices({...target,date:'2026-10-16'});assert.equal((await root.get()).data().currentPriceVersion,version,'old retry cannot roll back market pointer');
 await reject(engine.generateDailyPrices({...target,date:'2026-10-23'}),'failed-precondition');
 // Frozen account and membership revocation block mutations and old request replay.
 const accountRef=root.collection('accounts').doc(people.student);await accountRef.update({status:'frozen'});
 market=(await query('market')).market;await reject(action('buy',{...order,expectedPriceVersion:market.priceVersion,expectedConfigVersion:market.configVersion}),'failed-precondition');
 await db.doc(`users/${people.student}`).update({active:false});await reject(action('buy',{...order,requestId:buyId}),'permission-denied');
 // Deny direct access at every depth, even authenticated teachers/admin claims.
 const paths=['', '/companies/sprout_food','/dailyPrices/2026-10-16','/privateEngine/config','/news/lesson-news',`/accounts/${people.student}`,`/accounts/${people.student}/positions/sprout_food`,`/accounts/${people.student}/operations/${buyId}`,`/accounts/${people.student}/journal/${tradeId}`,`/accounts/${people.student}/journal/${tradeId}/history/0000000001`,'/treasury/current',`/adminAudit/${scheduledId}`];
 for(const client of [env.unauthenticatedContext().firestore(),env.authenticatedContext('uid-sec-a').firestore(),env.authenticatedContext('uid-sec-teacher',{admin:true}).firestore()]){
  for(const suffix of paths){await assertFails(getDoc(doc(client,root.path+suffix)));await assertFails(setDoc(doc(client,root.path+suffix),{forged:true}));}
  await assertFails(getDocs(collection(client,root.path+'/accounts')));
 }
 assert.equal((await db.doc(`userEconomy/${people.student}`).get()).exists,false);assert.equal((await db.doc(`classrooms/${classId}/studentWallets/${people.student}`).get()).exists,false);
 console.log('PASS securities Emulator: real auth helpers, 20-way idempotency, conflicting payloads, concurrent sells/limits, journals, ledger/treasury conservation, permissions, 12-depth direct Rules denial, schedules, atomic prices, failure recovery, no economy writes.');
 }finally{await db.recursiveDelete(db.doc(`classrooms/${classId}`));if(people)for(const id of Object.values(people))await db.doc(`users/${id}`).delete();await env.cleanup();await deleteApp(app);}
})().catch(e=>{console.error(e);process.exitCode=1;});
