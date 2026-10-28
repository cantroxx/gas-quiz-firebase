'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {initializeApp,deleteApp}=require('firebase-admin/app'),{getFirestore}=require('firebase-admin/firestore');
const {createEngine,reference}=require('../../functions/classroom/securities/market-engine');
const {createService}=require('../../functions/classroom/securities/service');
const Coin=require('../../functions/classroom/securities/coin'),D=require('../../functions/classroom/securities/domain'),K=require('../../functions/classroom/securities/calendar');
const {guard,authorizeFor,seedMembers}=require('./emulator-support');
(async()=>{
 const app=initializeApp({projectId:guard().projectId},'securities-coin'),db=getFirestore(app);
 try{
 const classId='SECURITIES-COIN',marketId='coin-v1',target={classId,marketId};await db.recursiveDelete(db.doc(`classrooms/${classId}`));const people=await seedMembers(db,classId);
 let stamp=K.at('2026-10-16',600),fail=false;
 const engine=createEngine({db,now:()=>stamp}),service=createService({db,authorize:authorizeFor(db),now:()=>stamp,beforeTransferCommit:async()=>{if(fail)throw Error('injected before transfer commit');}});
 const root=reference(db,classId,marketId),wallet=db.doc('userEconomy/sec-a');
 const request=(method,action,p={},role='student')=>service[method](`uid-${people[role]}`,{...target,memberUserId:people[role],action,requestId:crypto.randomUUID(),...p});
 const action=(a,p)=>request('action',a,p),query=(a,p)=>request('query',a,p),admin=async(a,p={})=>request('admin',a,{reason:'연동 합성 검사',expectedRevision:(await root.get()).data().configVersion,...p},'teacher');
 const rejected=promise=>assert.rejects(promise,e=>['failed-precondition','invalid-argument'].includes(e.code));
 await engine.initialize({...target,startDate:'2026-10-16',mode:'coin'});await rejected(query('market'));await admin('updateSettings',{reason:'교사 합성 수업 점검 완료 기록',patch:{studentAccess:true}});await admin('resume');await engine.generateDailyPrices({...target,date:'2026-10-16'});
 await action('openAccount');assert.equal((await query('account')).account.cashMinor,0);
 assert.equal((await root.collection('treasury').doc('current').get()).data().initialGrantsMinor,0);
 // All legacy shapes; zero must not fall through to coin. No unrelated fields changed.
 for(const shape of [{djCoin:150},{coin:150},{djCoin:150,coin:999},{djCoin:0,coin:150}]){
  await wallet.set({...shape,untouched:'preserve'});const before=(await query('account')).account.cashMinor;
  if(shape.djCoin===0){await rejected(action('deposit',{amount:1}));assert.equal((await wallet.get()).data().coin,150);continue;}
  await action('deposit',{amount:1});assert.equal((await wallet.get()).data().djCoin,149);assert.equal((await wallet.get()).data().coin,149);await action('withdraw',{amount:1});assert.equal((await query('account')).account.cashMinor,before);assert.equal((await wallet.get()).data().untouched,'preserve');
 }
 await wallet.set({djCoin:500,coin:500,untouched:'preserve'});
 for(const amount of [0,-1,1.5,'1',NaN,Infinity,Number.MAX_SAFE_INTEGER])await rejected(action('deposit',{amount}));
 fail=true;await assert.rejects(action('deposit',{amount:10}),e=>e.code==='internal');fail=false;assert.equal((await wallet.get()).data().djCoin,500);assert.equal((await query('account')).account.cashMinor,0);
 const id=crypto.randomUUID(),results=await Promise.all(Array.from({length:20},()=>action('deposit',{amount:50,requestId:id})));assert(results.every(r=>JSON.stringify(r)===JSON.stringify(results[0])));assert.equal((await wallet.get()).data().djCoin,450);
 await assert.rejects(action('deposit',{amount:49,requestId:id}),e=>e.code==='already-exists');
 const snapshot=await query('account'),pnl=snapshot.summary.pnlMinor;
 await action('withdraw',{amount:10});assert.equal((await query('account')).summary.pnlMinor,pnl);
 // Existing shop transaction competing on the same wallet document cannot overspend.
 await wallet.set({djCoin:50,coin:50});const beforeCash=(await query('account')).account.cashMinor;
 const shop=()=>db.runTransaction(async tx=>{const b=Coin.balance((await tx.get(wallet)).data());if(b<40)throw Error('insufficient');tx.update(wallet,{djCoin:b-40,coin:b-40});return 40;},{maxAttempts:30});
 const competition=await Promise.allSettled([action('deposit',{amount:40}),shop()]);assert.equal(competition.filter(r=>r.status==='fulfilled').length,1);assert.equal((await wallet.get()).data().djCoin,10);const afterCash=(await query('account')).account.cashMinor;assert([beforeCash,beforeCash+4000].includes(afterCash));
 // Withdrawals compete with buy and with one another; all paths share account reads.
 await wallet.set({djCoin:500,coin:500});let market=(await query('market')).market;const order={companyId:'sprout_food',quantity:1,reason:'가격과기업소식을충분히검토했어요',expectedPriceVersion:market.priceVersion,expectedConfigVersion:market.configVersion};
 const outcomes=await Promise.allSettled([action('buy',order),...Array.from({length:8},()=>action('withdraw',{amount:10}))]);assert(outcomes.some(x=>x.status==='fulfilled'));assert((await query('account')).account.cashMinor>=0);
 let audit=await request('query','audit',{},'teacher');assert.deepEqual(audit.issues,[]);
 // A committed request is replayable tomorrow, disabled, with no additional transfer.
 const walletBefore=(await wallet.get()).data().djCoin;stamp=K.at('2026-10-19',600);await admin('pause');assert.deepEqual(await action('deposit',{amount:50,requestId:id}),results[0]);assert.equal((await wallet.get()).data().djCoin,walletBefore);
 await rejected(action('deposit',{amount:1}));await admin('updateSettings',{patch:{lifecycle:'disabled'}});assert((await query('account')).account);
 await admin('resume');await engine.generateDailyPrices({...target,date:'2026-10-19'});await action('deposit',{amount:100});await rejected(action('deposit',{amount:1}));await action('withdraw',{amount:1});await rejected(action('deposit',{amount:1}));
 // Sticky treasury circuit: tests seed the synthetic budget at its boundary only.
 await root.collection('treasury').doc('current').update({depositsMinor:10000,withdrawalsMinor:109900,riskHalted:false});await action('withdraw',{amount:1});assert.equal((await query('market')).market.riskHalted,true);await rejected(action('deposit',{amount:1}));
 market=(await query('market')).market;await rejected(action('buy',{...order,expectedPriceVersion:market.priceVersion,expectedConfigVersion:market.configVersion}));
 const a=(await query('account')).account;if(a.positions.sprout_food){await admin('pause');market=(await query('market')).market;await action('sell',{...order,quantity:a.positions.sprout_food.quantity,expectedPriceVersion:market.priceVersion,expectedConfigVersion:market.configVersion});}
 const available=Math.floor((await query('account')).account.cashMinor/100);await action('withdraw',{amount:available});assert((await query('account')).account.cashMinor<100);
 audit=await request('query','audit',{},'teacher');assert.deepEqual(audit.issues,[]);assert((await request('query','dailyReports',{},'teacher')).rows.length>=2);
 await assert.rejects(engine.initialize({...target,startDate:'2026-10-16',mode:'practice'}),e=>e.code==='already-exists');
 await root.collection('accounts').doc(people.student).update({status:'frozen'});for(const kind of ['openAccount','deposit','withdraw'])await rejected(action(kind,{amount:1}));
 stamp=K.at('2026-10-19',900);assert.equal((await engine.closeReport(target)).recorded,true);assert.equal((await engine.closeReport(target)).replayed,true);
 console.log('PASS coin emulator: aliases, zero grant, conservation, 20 duplicates, atomic failure, wallet competition, limits, replay, circuit, safe exit, ledger audit');
 }finally{await deleteApp(app);}
})().catch(e=>{console.error(e);process.exitCode=1});
