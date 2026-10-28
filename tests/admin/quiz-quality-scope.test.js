'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {selectScope,loadScope,CURRENT_BANK_IDS,QUESTION_LIMIT}=require('../../functions/quiz-quality-scope');
function fixture({metadataError=false,missing=false,questionError=false,count=1}={}){
  const reads=[];let active=0,maxActive=0;
  const db={collection:name=>({doc:id=>({
    get:async()=>{reads.push(`${name}/${id}`);if(metadataError)throw Error('offline');return {exists:!missing,data:()=>missing?undefined:{title:id,quizId:'untrusted-metadata-id'}};},
    collection:child=>({limit:n=>({get:async()=>{
      reads.push(`${name}/${id}/${child}:${n}`);active++;maxActive=Math.max(maxActive,active);
      await new Promise(resolve=>setImmediate(resolve));active--;
      if(questionError)throw Error('offline');
      return {docs:Array.from({length:Math.min(count,n)},(_,i)=>({id:'q'+i,data:()=>({answerText:'answer'})}))};
    }})})
  })})};
  return {db,reads,maxActive:()=>maxActive};
}
test('default scope reads only current banks, bounded parallelism and no catalog scan',async()=>{
  const f=fixture(),selected=selectScope(),result=await loadScope(f.db,selected);
  assert.deepEqual(selected.quizIds,CURRENT_BANK_IDS);assert.equal(result.entries.length,11);
  assert.equal(f.reads.length,22);assert.equal(result.readIssues.length,0);assert(f.maxActive()<=3);
  assert(!f.reads.some(p=>p.includes('spelling')));assert.equal(result.entries[0].quiz.quizId,'flag-country');
});
test('archive requires explicit bounded valid IDs',()=>{
  assert.deepEqual(selectScope({scope:'archive',quizIds:['spelling','spelling']}),{scope:'archive',quizIds:['spelling']});
  for(const payload of [{scope:'all'},{scope:'archive'},{scope:'archive',quizIds:[]},{scope:'archive',quizIds:Array(6).fill('spelling')},{scope:'archive',quizIds:['../../users']},{scope:'archive',quizIds:[null]},{quizIds:['spelling']},[]])
    assert.throws(()=>selectScope(payload),e=>e.code==='invalid-argument');
});
test('read failures, missing metadata and truncation are explicit, never a clean audit',async()=>{
  for(const options of [{metadataError:true},{missing:true},{questionError:true},{count:QUESTION_LIMIT+1}]){
    const f=fixture(options),result=await loadScope(f.db,selectScope({scope:'archive',quizIds:['spelling']}));
    assert.equal(result.readIssues.length,1);assert.equal(result.readIssues[0].quizId,'spelling');
    assert(result.entries[0].questions.length<=QUESTION_LIMIT);
  }
});
