'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createService}=require('../../functions/subject-quiz/service');
const C=require('../../functions/subject-quiz/curriculum');

function fixture({hidden=2,active=true,enabled=true,empty=false,count=30,sameScore=false}={}) {
  const calls=[];const base=`subjectQuizRankings/${C.VERSION}/`;
  const data=new Map([
    ['authLinks/test-uid',{memberUserId:'member-000'}],
    ['users/member-000',{authUid:'test-uid',status:'active',active}],
    ['appSettings/featureFlags',{subjectQuizEnabled:enabled}]
  ]);
  if(!empty)for(const s of C.subjects)for(let i=0;i<count;i++)data.set(base+s.id+'/member-'+String(i).padStart(3,'0'),{
    nickname:'synthetic '+i,totalScore:sameScore?10:Math.floor((count-i)/2),visible:i===0||i>hidden
  });
  const snapshot=p=>({id:p.split('/').pop(),path:p,exists:data.has(p),data:()=>data.get(p)});
  function ref(p,query=false,options={}) {return {
    path:p,query,options,doc:id=>ref(p+'/'+id),collection:n=>ref(p+'/'+n,true),
    get parent(){return ref(p.split('/').slice(0,-1).join('/'),true);},
    orderBy:(field,direction)=>ref(p,true,{...options,field,direction}),
    startAfter:doc=>ref(p,true,{...options,cursor:doc.path}),limit:n=>ref(p,true,{...options,limit:n})
  };}
  const db={collection:p=>ref(p,true),runTransaction:fn=>fn({
    get:async r=>{
      calls.push({path:r.path,query:r.query,...r.options});
      if(!r.query)return snapshot(r.path);
      let docs=[...data.keys()].filter(p=>p.startsWith(r.path+'/')&&p.slice(r.path.length+1).indexOf('/')<0).sort().map(snapshot);
      if(r.options.field)docs.sort((a,b)=>(b.data()[r.options.field]-a.data()[r.options.field])||(a.id<b.id?1:a.id>b.id?-1:0));
      if(r.options.cursor)docs=docs.slice(docs.findIndex(d=>d.path===r.options.cursor)+1);
      docs=docs.slice(0,r.options.limit);return {docs,size:docs.length};
    },set:()=>assert.fail('read action wrote data'),update:()=>assert.fail('read action wrote data'),delete:()=>assert.fail('read action deleted data')
  })};
  return {calls,service:createService({db})};
}
test('personal rankings read exactly own four documents; no session or aggregate queries',async()=>{
  const f=fixture(),out=await f.service.act('test-uid',{action:'memberRankings',memberUserId:'member-000'});
  assert.equal(out.records.length,4);assert(out.records.every(r=>r.memberUserId==='member-000'));
  assert.equal(f.calls.length,7);assert.equal(f.calls.filter(c=>c.query).length,0);
  assert(!f.calls.some(c=>/quizKingSummary|subjectQuizPlayers/.test(c.path)));
});
test('single subject returns top visible rows including ties and never queries other subjects',async()=>{
  const f=fixture(),out=await f.service.act('test-uid',{action:'subjectRankings',subject:'math',limit:10});
  assert.equal(out.records.length,10);
  assert.deepEqual(out.records.slice(0,3).map(r=>r.memberUserId),['member-000','member-003','member-004']);
  const queries=f.calls.filter(c=>c.query);assert.equal(queries.length,2);
  assert(queries.every(c=>c.path===`subjectQuizRankings/${C.VERSION}/math`));
  assert.equal(queries.reduce((n,c)=>n+c.limit,0),36);
  assert(!f.calls.some(c=>/quizKingSummary|subjectQuizPlayers/.test(c.path)));
});
test('cutoff ties keep legacy ID order; hidden-heavy scans are bounded',async()=>{
  const f=fixture({sameScore:true,hidden:0});
  const out=await f.service.act('test-uid',{action:'subjectRankings',subject:'math',limit:10});
  assert.deepEqual(out.records.map(r=>r.memberUserId),Array.from({length:10},(_,i)=>'member-'+String(i).padStart(3,'0')));
  const hidden=fixture({count:510,hidden:510});
  await assert.rejects(hidden.service.act('test-uid',{action:'subjectRankings',subject:'math',limit:10}),e=>e.code==='resource-exhausted');
  const queries=hidden.calls.filter(c=>c.query);
  assert.equal(queries.reduce((n,c)=>n+c.limit,0),501);assert(queries.length<=21);
});
test('personal and subject missing records are empty; wrong subject/count/owner is denied',async()=>{
  const f=fixture({empty:true});
  assert.deepEqual((await f.service.act('test-uid',{action:'memberRankings'})).records,[]);
  assert.deepEqual((await f.service.act('test-uid',{action:'subjectRankings',subject:'math'})).records,[]);
  await assert.rejects(f.service.act('test-uid',{action:'memberRankings',memberUserId:'other'}),e=>e.code==='permission-denied');
  for(const args of [{subject:'bad'},{subject:'math',limit:0},{subject:'math',limit:101},{subject:'math',limit:1.5}])
    await assert.rejects(f.service.act('test-uid',{action:'subjectRankings',...args}),e=>e.code==='invalid-argument');
});
test('new reads retain authentication, active-member and feature restrictions',async()=>{
  for(const action of ['memberRankings','subjectRankings']){
    await assert.rejects(fixture().service.act(null,{action,subject:'math'}),e=>e.code==='unauthenticated');
    await assert.rejects(fixture({active:false}).service.act('test-uid',{action,subject:'math'}),e=>e.code==='permission-denied');
    await assert.rejects(fixture({enabled:false}).service.act('test-uid',{action,subject:'math'}),e=>e.code==='failed-precondition');
  }
});
