'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

// Exercise the actual authorization/read phase; never connect to Firebase.
function readPhase(file = process.env.CLASSROOM_ECONOMY_SOURCE || require.resolve('../../functions/index.js')) {
  const text = fs.readFileSync(file, 'utf8');
  const start = text.indexOf('exports.getClassroomEconomyBoard =');
  const end = text.indexOf('  const jobs = jobsSnapshot.docs', start);
  assert(start > 0 && end > start);
  return text.slice(start, end) + `return {jobsSnapshot,shopSnapshot,hiddenShopSnapshot,assignmentSnapshot,routineSnapshot,routineCheckSnapshot,applicationSnapshot,purchaseSnapshot,pointLogSnapshot,noticeSnapshot,billboardSnapshot,missionSnapshot,publicWalletSnapshot,walletSnapshot,groupPurchaseSnapshot,savingsProductSnapshot,savingsAccountSnapshot,taxPresetSnapshot,exchangeSettingsSnapshot,classroomGemSnapshot}; });`;
}
function deferred() { let resolve; const promise = new Promise(done => resolve = done); return {promise,resolve}; }
function fixture({teacher=false,authorize=Promise.resolve(),read=async value=>value,file,linked=true,classAllowed=true}={}) {
  const calls=[];
  function query(parts=[]) {
    const step=(kind,...args)=>query([...parts,[kind,...args]]);
    return {collection:name=>step('collection',name),doc:id=>step('doc',id),where:(...args)=>step('where',...args),limit:n=>step('limit',n),
      get:()=>{calls.push(parts);return read(parts);}};
  }
  const context={exports:{},REGION:'fixture',onCall:(_,handler)=>handler,
    requireAuth:request=>{if(!request.auth)throw Error('unauthenticated');return request.auth.uid;},normalizeId:id=>id,
    db:{collection:name=>query([['collection',name]]),runTransaction:async run=>{await authorize;return run({});}},
    assertLinkedMemberAuth:async()=>{if(!linked)throw Error('not-linked');return {teacher};},loadClassroomSettingsForTransaction:async()=>({settings:{}}),
    assertMemberCanEnterClassroom:()=>{if(!classAllowed)throw Error('wrong-class');},isClassroomTeacherMember:member=>member.teacher,getKstDateKey:()=> '2026-10-07'};
  vm.runInNewContext(readPhase(file),context);
  return {calls,run:()=>context.exports.getClassroomEconomyBoard({auth:{uid:'fixture'},data:{classId:'G4-C8',memberUserId:'S1'}}),
    anonymous:()=>context.exports.getClassroomEconomyBoard({data:{}})};
}

test('twenty independent reads start together only after authorization finishes',async()=>{
  const auth=deferred(),gate=deferred();const f=fixture({authorize:auth.promise,read:async value=>{await gate.promise;return value;}});
  const result=f.run();await new Promise(resolve=>setImmediate(resolve));assert.equal(f.calls.length,0);
  auth.resolve();await new Promise(resolve=>setImmediate(resolve));assert.equal(f.calls.length,20,'No read may wait for another independent read');
  gate.resolve();assert.equal(Object.keys(await result).length,20);
});
test('unauthenticated/failed authorization performs no content reads',async()=>{
  const f=fixture();await assert.rejects(f.anonymous(),/unauthenticated/);assert.equal(f.calls.length,0);
  for(const options of [{linked:false},{classAllowed:false}]) {const denied=fixture(options);await assert.rejects(denied.run());assert.equal(denied.calls.length,0);}
  const denied=fixture({authorize:Promise.reject(Error('forbidden'))});await assert.rejects(denied.run(),/forbidden/);assert.equal(denied.calls.length,0);
});
test('student and teacher scopes and limits remain intact; failures reject the read phase',async()=>{
  for(const teacher of [false,true]) {
    const f=fixture({teacher});const data=JSON.parse(JSON.stringify(await f.run()));
    assert.equal(f.calls.length,20);
    for(const [name,collection,limit] of [['purchaseSnapshot','shopPurchases',teacher?200:80],['pointLogSnapshot','pointLogs',teacher?300:100],['savingsAccountSnapshot','savingsAccounts',teacher?200:50]]) {
      assert.deepEqual(data[name],[['collection','classrooms'],['doc','G4-C8'],['collection',collection],...(!teacher?[['where','memberUserId','==','S1']]:[]),['limit',limit]]);
    }
    assert.deepEqual(data.hiddenShopSnapshot.slice(-2),[['where','active','==',false],['limit',100]]);
    assert.deepEqual(data.routineCheckSnapshot.slice(-2),[['where','memberUserId','==','S1'],['limit',500]]);
  }
  const f=fixture({read:async()=>{throw Error('unavailable');}});await assert.rejects(f.run(),/unavailable/);
});

module.exports = { fixture };

if(process.env.CLASSROOM_ECONOMY_BASELINE) test('deployed baseline and candidate return identical query descriptors for both roles',async()=>{
  const runs=[];
  for(const teacher of [false,true]) {
    const read=async value=>{await new Promise(resolve=>setTimeout(resolve,20));return value;};
    const before=fixture({teacher,read,file:process.env.CLASSROOM_ECONOMY_BASELINE}),after=fixture({teacher,read});
    const start=performance.now(),old=await before.run(),middle=performance.now(),next=await after.run(),end=performance.now();
    assert.deepEqual(JSON.parse(JSON.stringify(next)),JSON.parse(JSON.stringify(old)));
    runs.push({teacher,beforeMs:Math.round(middle-start),afterMs:Math.round(end-middle),readsBefore:before.calls.length,readsAfter:after.calls.length});
  }
  console.log('Synthetic 20ms/read; full query descriptors unchanged: '+JSON.stringify(runs));
});
