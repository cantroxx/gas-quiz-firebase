'use strict';
const assert=require('node:assert/strict');
const {fixture}=require('./board-memory');
const {createService}=require('../../functions/classroom/board');
(async()=>{
 const f=fixture();for(let i=0;i<4000;i++)f.data.set('classrooms/demo/boardHistory/old-'+i,{source:'grownd',memberUserId:'S1',questId:'reading',periodKey:'2025-10-21',dateKey:'2025-10-21',status:'completed'});
 for(let i=0;i<2000;i++)f.data.set('classrooms/demo/questProgress/old-'+i,{memberUserId:'S1',questId:'reading',periodKey:'2025-10-21',dateKey:'2025-10-21',rewardStatus:'paid'});
 let reads=0;const original=f.db.runTransaction;f.db.runTransaction=fn=>original(tx=>fn({...tx,get:async ref=>{const snap=await tx.get(ref);reads+=snap.docs?snap.docs.length:1;return snap;}}));
 const service=createService({db:f.db,now:()=>Date.parse('2026-10-21T10:00:00+09:00'),authorize:async()=>({settings:f.settings,isTeacher:true})});
 const p={classId:'demo',memberUserId:'T',questId:'reading',action:'list'};
 await service('uid-T',p);const cold=reads;reads=0;const result=await service('uid-T',p);const warm=reads;
 assert(cold>=2000,'Cold compatibility scan is explicitly accounted for');assert(warm<100,'Warm periodic query excludes 6000 historical records');assert.equal(result.counts.reading.completed,0);
 console.log(JSON.stringify({test:'board-query-cost',historicalRecords:6000,coldDocuments: cold,warmDocuments: warm,oldBaselineLowerBound:12044,scope:'synthetic document reads, not production billing/latency'}));
})();
