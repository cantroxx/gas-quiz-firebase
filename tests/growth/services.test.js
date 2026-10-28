'use strict';
const assert=require('node:assert/strict');
const Q=require('../../functions/growth/quests'),C=require('../../functions/coordi-shop/commerce'),S=require('../../functions/growth/survivor');
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
const FV={increment:n=>({__increment:n}),serverTimestamp:()=>({__time:true})};
function fakeDb(){let data=new Map(),queue=Promise.resolve();const clone=v=>v===undefined?undefined:structuredClone(v);const ref=path=>({path,id:path.split('/').at(-1)});const merge=(old,v)=>{const out={...old};for(const[k,x]of Object.entries(v)){if(x&&typeof x==='object'&&!Array.isArray(x)){if('__increment'in x)out[k]=(Number(old?.[k])||0)+x.__increment;else if('__time'in x)out[k]=123;else out[k]=merge(old?.[k]||{},x);}else out[k]=clone(x);}return out;};
 return {data,doc:ref,collection:c=>({doc:id=>ref(c+'/'+id)}),runTransaction(fn){const task=queue.then(async()=>{const next=new Map([...data].map(([k,v])=>[k,clone(v)]));let wrote=false;const tx={get:async r=>{assert(!wrote,'Firestore reads must precede writes');const v=next.get(r.path);return {exists:v!==undefined,data:()=>clone(v)};},set:(r,v,o)=>{wrote=true;next.set(r.path,merge(o?.merge?next.get(r.path)||{}:{},v));},create:(r,v)=>{assert(!next.has(r.path),'duplicate create');tx.set(r,v);},update:(r,v)=>tx.set(r,v,{merge:true})};const result=await fn(tx);data.clear();for(const[k,v]of next)data.set(k,v);return result;});queue=task.catch(()=>{});return task;}};}
(async()=>{
 const integrated=require('../../functions/growth/season-events');const e={eventId:'unit-season',title:'시즌',periodStartDate:'2026-09-01',periodEndDate:'2026-09-30',active:true,quizIds:[],goals:[{kind:'studyCorrect',target:2,xpReward:10,rewardCoin:10}]};const registry=integrated.register({},[e],Date.parse('2026-09-02'));const closed=integrated.register(registry,[],Date.parse('2026-09-03'));assert(closed.entries[integrated.keyFor(e)].closedAt);assert.throws(()=>integrated.register(closed,[e],Date.parse('2026-09-04')),/다시 열/);assert(integrated.card(Object.values(registry.entries)[0],e.goals[0],{counts:{studyCorrect:2}},Date.parse('2026-10-01')).claimable);
 const lockedBonus=Q.rows({}, {counts:{practiceCorrect:40,towerDays:3},days:['2026-10-19','2026-10-20','2026-10-21']});
 assert(lockedBonus.filter(q=>q.bonus).every(q=>!q.claimable&&!q.completed),'Bonus quests open only after three basic weekly completions');
 const db=fakeDb();db.data.set('users/u',{authUid:'a',status:'active',role:'student'});db.data.set('authLinks/a',{memberUserId:'u'});db.data.set('appSettings/featureFlags',{shopEnabled:true,eventPlazaEnabled:true});db.data.set('userEconomy/u',{djCoin:1000});
 const authorize=async(tx,id,uid)=>{const member=(await tx.get(db.doc('users/'+id))).data();if(!member||member.authUid!==uid)throw new HttpsError('permission-denied','no');return member;};
 let time=Date.parse('2026-10-19T03:00:00Z');const q=Q.createService({db,FieldValue:FV,ErrorType:HttpsError,authorize:(tx,uid,id)=>authorize(tx,id,uid),now:()=>time,applyXp:async(tx,o)=>{tx.set(db.doc('xp/'+o.memberUserId),{value:FV.increment(o.xpDelta)},{merge:true});return {xpDelta:o.xpDelta};}});

 await q.ingest({source:'first',memberId:'u',uid:'a',counts:{practiceCorrect:30,rankingScore:19,towerClear:9,survivorScore:999,bombWin:0},time});
 let status=await q.status('a','u');
 assert.equal(status.quests.find(x=>x.questId==='v2_weekly_practice').current,10,'Daily contribution is capped at ten');
 assert.equal(status.quests.find(x=>x.questId==='v2_daily_ranking').completed,false);
 await q.ingest({source:'finish',memberId:'u',uid:'a',counts:{practiceCorrect:20,rankingScore:20,towerClear:1,survivorScore:1000,bombWin:1},time});
 await q.ingest({source:'finish',memberId:'u',uid:'a',counts:{practiceCorrect:20,rankingScore:20,towerClear:1,survivorScore:1000,bombWin:1},time});
 const claims=await Promise.all([q.claim('a','u','v2_daily_practice'),q.claim('a','u','v2_daily_practice')]);
 assert.equal(claims.filter(x=>x.duplicate).length,1);
 for(const id of ['ranking','tower','survivor','bomb'])await q.claim('a','u','v2_daily_'+id);
 assert.equal(db.data.get('userEconomy/u').djCoin,1025,'All five daily quests pay separately');
 await assert.rejects(q.claim('b','u','v2_daily_survivor'),e=>e.code==='permission-denied');
 for(let day=1;day<=3;day++){
  time+=86400000;
  await q.ingest({source:'day-'+day,memberId:'u',uid:'a',counts:{practiceCorrect:30,rankingScore:20,towerClear:10,bombWin:1,survivorScore:day===3?10000:1000},time});
 }
 status=await q.status('a','u');
 assert.equal(status.quests.find(x=>x.questId==='v2_weekly_practice').current,40);
 assert.equal(status.quests.find(x=>x.questId==='v2_weekly_ranking').current,3);
 assert.equal(status.quests.find(x=>x.questId==='v2_weekly_days').completed,true,'Completion does not require claiming');
 for(const id of ['practice','ranking','survivor'])await q.claim('a','u','v2_weekly_'+id);
 await assert.rejects(q.claim('a','u','v2_weekly_bomb'),/보상 3개/);
 for(const id of ['fields','days'])await q.claim('a','u','v2_weekly_'+id);
 assert.equal((await q.status('a','u')).todayQuestCoin,100);
 assert.equal((await q.status('a','u')).todayQuestXp,150);
 assert.equal(Q.longestStreak(['2026-10-19','2026-10-21','2026-10-23']),1);
 assert.deepEqual(Q.periods(Date.parse('2026-09-20T15:00:00Z')),{date:'2026-09-21',week:'2026-09-21',month:'2026-09'});
 const balanceBeforeRetired=db.data.get('userEconomy/u').djCoin;
 for(const id of ['v2_season_study','season3_old_studyCorrect','v2_daily_today','v2_daily_study'])await assert.rejects(q.claim('a','u',id),e=>e.code==='failed-precondition');
 assert.equal(db.data.get('userEconomy/u').djCoin,balanceBeforeRetired);
 time+=7*86400000;assert.equal((await q.status('a','u')).weeklyClaimed,0);
 await q.ingest({source:'first',memberId:'u',uid:'a',counts:{practiceCorrect:30},time});
 assert.equal((await q.status('a','u')).quests.find(x=>x.questId==='v2_daily_practice').current,0,'Old retry stays in its original period');
 const special=require('../../functions/growth/special-rewards').createService({db,FieldValue:FV,ErrorType:HttpsError,authorize:(tx,uid,id)=>authorize(tx,id,uid),authorizeAdmin:async uid=>{if(uid!=='teacher')throw new HttpsError('permission-denied','admin');},applyXp:async(tx,o)=>({xpDelta:o.xpDelta}),now:()=>time});
 const mission={action:'publish',id:'mission-12345',title:'함께 정리해요',instruction:'책상 정리하기',mode:'cooperative',target:2,rewardCoin:5,xpReward:10};
 await assert.rejects(special.admin('a',mission),e=>e.code==='permission-denied');
 await special.admin('teacher',mission);await special.admin('teacher',mission);
 assert.equal((await special.admin('teacher',{action:'list'})).items.length,1);
 await special.act('a',{action:'participate',id:mission.id,memberUserId:'u',confirmed:true});
 await special.act('a',{action:'participate',id:mission.id,memberUserId:'u',confirmed:true});
 await assert.rejects(special.act('a',{action:'claim',id:mission.id,memberUserId:'u'}),/협동 목표/);
 db.data.set('users/v',{authUid:'b',status:'active'});
 await special.act('b',{action:'participate',id:mission.id,memberUserId:'v',confirmed:true});
 const specialClaims=await Promise.all([special.act('a',{action:'claim',id:mission.id,memberUserId:'u'}),special.act('a',{action:'claim',id:mission.id,memberUserId:'u'})]);
 assert.equal(specialClaims.filter(x=>x.duplicate).length,1);
 await special.admin('teacher',{action:'close',id:mission.id});
 await assert.rejects(special.act('b',{action:'claim',id:mission.id,memberUserId:'v'}),/종료/);
 const fs=require('node:fs');for(const file of ['problems.js','bank.js'])assert.equal(fs.readFileSync('functions/growth/survivor-bank/'+file,'utf8'),fs.readFileSync('public/mathsurvivor/'+file,'utf8'));
 const shop=C.createService({db,FieldValue:FV,ErrorType:HttpsError,authorize});let n=0;const req=action=>({action,version:C.version,requestId:'00000000-0000-0000-0000-'+String(++n).padStart(12,'0')});
 const item=Object.values(C.catalog).find(x=>x.category==='hat');
 const balanceBeforeExcluded=db.data.get('userEconomy/u').djCoin;
 for(const excludedId of ['hat-1006056','faceAccessory-1012401','weapon-1703933']) {
   await assert.rejects(shop.act('a',{...req('purchase'),paymentMethod:'coin',items:[item.id,excludedId]}),e=>e.code==='invalid-argument');
   assert.equal(db.data.get('userEconomy/u').djCoin,balanceBeforeExcluded);
   assert.equal(db.data.has('coordiProfiles/u'),false);
 }
 const purchase={...req('purchase'),paymentMethod:'coin',items:[item.id]};const bought=await shop.act('a',purchase);assert.equal(bought.cost,item.price);assert((await shop.act('a',purchase)).duplicate);await assert.rejects(shop.act('a',{...purchase,items:['bogus']}),e=>e.code==='invalid-argument');
 await assert.rejects(shop.act('a',{...req('equip'),gender:'female',equipped:{weapon:'weapon-unknown'}}));
 const dye={...req('dye'),itemId:item.id,value:{tone:40,chroma:0,brightness:0,palette:0,blackInclusive:0}};assert.equal((await shop.act('a',dye)).cost,0);assert.equal((await shop.act('a',{...dye,...req('dye')})).cost,0);assert.equal((await shop.act('a',{...req('dye'),itemId:item.id,value:{}})).cost,0);
 const skin=await shop.act('a',{...req('dye'),itemId:'skin-12000',value:{brightness:-20}});assert.equal(skin.cost,0);
 const skinItem=C.catalog['skin-12015'];assert(skinItem);
 await assert.rejects(shop.act('a',{...req('equip'),gender:'female',equipped:{skin:skinItem.id}}));
 assert.equal((await shop.act('a',{...req('purchase'),paymentMethod:'coin',items:[skinItem.id]})).cost,50);
 assert.equal((await shop.act('a',{...req('equip'),gender:'female',equipped:{skin:skinItem.id}})).profile.look.equipped.skin,skinItem.id);
 const dyedSkin=await shop.act('a',{...req('dye'),itemId:skinItem.id,value:{brightness:-10,blackInclusive:1}});assert.equal(dyedSkin.profile.prisms[skinItem.id].blackInclusive,0);
 await assert.rejects(shop.act('a',{...req('purchase'),paymentMethod:'coin',items:['shield-1092067']}));
 db.data.set('appSettings/featureFlags',{shopEnabled:false});await assert.rejects(shop.act('a',{action:'status'}),/쉬고/);db.data.set('appSettings/featureFlags',{shopEnabled:true});
 db.data.set('userEconomy/u',{djCoin:0});await assert.rejects(shop.act('a',{...req('purchase'),paymentMethod:'coin',items:[Object.keys(C.catalog).find(id=>id!==item.id)]}),/부족/);
 const survivor=S.createService({db,ErrorType:HttpsError,authorize,now:()=>time});const question=await survivor('a',{action:'question',subject:'math',grade:4,sem:1});assert(!('answerIndex'in question));time+=2500;const stored=db.data.get('survivorQuizQuestions/'+question.questionId);const answer=stored.q.choices[stored.q.answerIndex];assert((await survivor('a',{action:'answer',questionId:question.questionId,answer})).correct);await survivor('a',{action:'answer',questionId:question.questionId,answer});assert.equal([...db.data.keys()].filter(k=>k.startsWith('growthActivities/')).length,1);
 await assert.rejects(survivor('b',{action:'answer',questionId:question.questionId,answer}));
 console.log('PASS growth: duplicate/concurrent claims, daily limits/reset, KST week, ownership, catalog validation, payment replay, insufficient balance, closed shop, dye/reset, server quiz grading and duplicate reward');
})();
