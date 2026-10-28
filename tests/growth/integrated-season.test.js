'use strict';
const assert=require('node:assert/strict');
assert.match(process.env.FIRESTORE_EMULATOR_HOST||'',/^127\.0\.0\.1:\d+$/);
process.env.GCLOUD_PROJECT='demo-dj48-rules';
const api=require(process.env.GROWTH_FUNCTIONS_INDEX||'../../functions/index');
const {getFirestore,FieldValue}=require('node:module').createRequire(require('node:path').resolve('functions/index.js'))('firebase-admin/firestore');
const {createService}=require('../../functions/growth/quests'),S=require('../../functions/growth/season-events'),D=require('../../functions/growth/season-draft');
class ErrorType extends Error{constructor(code,msg){super(msg);this.code=code;}}
(async()=>{
 const db=getFirestore(),id='integrated-test',uid='integrated-auth';let time=Date.parse('2026-09-21T03:00:00Z');
 await db.doc('users/'+id).set({authUid:uid,status:'active',active:true,role:'student',nickname:'시즌 학생'});await db.doc('userEconomy/'+id).set({djCoin:0});
 const authorize=async(tx,u,i)=>{const m=(await tx.get(db.doc('users/'+i))).data();if(m?.authUid!==u)throw new ErrorType('permission-denied','no');return m;};
 const q=createService({db,FieldValue,ErrorType,authorize,now:()=>time,applyXp:async(tx,o)=>({xpDelta:o.xpDelta})});
 const event={eventId:'test-integrated',title:'독서와 온라인',desc:'통합',icon:'📖',periodType:'monthly',period:'2026년 9월',periodStartDate:'2026-09-01',periodEndDate:'2026-09-30',active:true,autoRenew:false,quizIds:['reading'],goals:[{kind:'practiceCorrect',target:2,xpReward:20,rewardCoin:10},{kind:'studyCorrect',target:3,xpReward:30,rewardCoin:20}]};
 const registry=S.register({},[event],time);await db.doc('seasonEventSystem/registry').set(registry);
 assert.throws(()=>S.register(registry,[{...event,goals:[{...event.goals[0],target:1}]}],time),/고정/);
 assert.throws(()=>S.goals([{kind:'forged',target:1,xpReward:1,rewardCoin:1}]),/활동/);
 const send=(source,quizId,counts,t=time)=>q.ingest({source,quizId,counts,time:t,memberId:id,uid});
 await send('before','reading',{practiceCorrect:100},time-1000);await send('wrong','math',{practiceCorrect:100});
 let current=await q.seasons(uid,id);assert.equal(current.events[0].quests[0].current,0);
 const source='accepted';await Promise.all([send(source,'reading',{practiceCorrect:2,studyCorrect:3}),send(source,'reading',{practiceCorrect:2,studyCorrect:3})]);
 current=await q.seasons(uid,id);assert.deepEqual(current.events[0].quests.map(x=>x.current),[2,3]);assert.equal(current.events[0].leaderboard[0].completedGoals,2);
 const quest=current.events[0].quests[0].questId;const results=await Promise.all([q.claim(uid,id,quest),q.claim(uid,id,quest)]);assert.equal(results.filter(x=>x.duplicate).length,1);assert.equal((await db.doc('userEconomy/'+id).get()).data().djCoin,10);
 await assert.rejects(q.claim('wrong',id,quest),e=>e.code==='permission-denied');
 // Freeze the legacy period, keep old unclaimed rewards after month end, ignore new month progress.
 await send('legacy','reading',{practiceCorrect:100});time=Date.parse('2026-10-01T03:00:00Z');
 await send('after-end','reading',{practiceCorrect:100,studyCorrect:100});current=await q.seasons(uid,id);assert.equal(current.events[0].quests[1].current,3);assert(current.events[0].quests[1].claimable);
 assert.equal((await q.claim(uid,id,'v2_season_practice')).rewardCoin,40);assert.equal((await q.status(uid,id)).seasonKey,'2026-09');assert(!(await db.doc('growthQuestProgress/'+id+'__season__2026-10').get()).exists);
 await q.claim(uid,id,current.events[0].quests[1].questId);assert.equal((await q.seasons(uid,id)).events.length,0);
 const drafts=D.createService({db,FieldValue,ErrorType,now:()=>time});const first=(await drafts.act()).draft;assert.equal(first.month,'2026-11');assert(first.items.every(e=>!e.active));assert.equal(first.items[0].goals.length,4);const replay=await Promise.allSettled([drafts.act('reroll',first),drafts.act('reroll',first)]);assert.equal(replay.filter(r=>r.status==='fulfilled').length,1);
 // Public callables use the same configured goals, and a student cannot publish or reroll.
 await assert.rejects(api.adminSeasonEventDraft.run({auth:{uid},data:{}}),e=>e.code==='permission-denied');
 await db.doc('users/integrated-admin').set({authUid:'integrated-admin',role:'admin',adminLevel:'superAdmin',status:'active',active:true});
 await db.doc('appSettings/seasonEvents').set({items:[]});
 const day=new Date(Date.now()+9*3600000).toISOString().slice(0,10);const saved={...event,eventId:'callable-season',periodStartDate:day,periodEndDate:day,startDate:day,endDate:day,periodType:'weekly'};
 await api.adminUpdateSeasonEvents.run({auth:{uid:'integrated-admin'},data:{seasonEvents:{items:[saved]}}});
 const shown=await api.getEventProgress.run({auth:{uid},data:{memberUserId:id}});assert(shown.seasonEvents.some(e=>e.eventId==='callable-season'));assert.equal(shown.quests.filter(x=>x.eventTitle===saved.title).length,2);
 await api.ingestGrowthActivity.run({data:{data:()=>({source:'integrated-real-callable',uid,memberId:id,quizId:'reading',counts:{studyCorrect:3},time:Date.now()})}});
 for(const suffix of ['one','two'])await api.ingestPracticeGrowth.run({params:{id:'integrated-practice-'+suffix},data:{data:()=>({type:'practice_correct',memberUserId:id,authUid:uid,quizId:'reading',createdAt:{toMillis:()=>Date.now()}})}});
 const ready=await api.getEventProgress.run({auth:{uid},data:{memberUserId:id}});const reward=ready.quests.find(q=>q.eventTitle===saved.title&&q.kind==='practiceCorrect');assert(reward.claimable);const balance=(await db.doc('userEconomy/'+id).get()).data().djCoin;
 const claims=await Promise.all([api.claimEventQuestReward.run({auth:{uid},data:{memberUserId:id,questId:reward.questId}}),api.claimEventQuestReward.run({auth:{uid},data:{memberUserId:id,questId:reward.questId}})]);assert.equal(claims.filter(r=>r.duplicate).length,1);assert.equal((await db.doc('userEconomy/'+id).get()).data().djCoin,balance+10);assert.equal((await db.doc('userLevelSummary/'+id).get()).data().totalXp,20);
 await assert.rejects(api.adminUpdateSeasonEvents.run({auth:{uid},data:{seasonEvents:{items:[]}}}),e=>e.code==='permission-denied');
 console.log('PASS integrated season: configured quiz filter, activation/expiry, duplicate ingestion/claim, ranking, frozen goals, legacy preservation, draft concurrency, admin/student agreement');
})().catch(e=>{console.error(e);process.exitCode=1;});
