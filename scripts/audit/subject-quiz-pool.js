#!/usr/bin/env node
'use strict';
// No network or production data. Enumerates every pool entry and a complete
// cycle per unit using the same deck selector as the callable service.
const fs=require('node:fs'),assert=require('node:assert/strict');
const C=require('../../functions/subject-quiz/curriculum'),P=require('../../functions/subject-quiz/pool'),D=require('../../functions/subject-quiz/deck');
const rows=[],started=Date.now();
for(const u of C.units){
 const pool=P.get(u.id),usedSources=new Set(pool.questions.flatMap(q=>q.sourceIds));
 let history={},seen=new Set(),maxBytes=0;
 for(let i=0;i<pool.size;i++){
  // Round-trip storage regularly: selection may not rely on process-local state.
  const issued=D.next(u.id,i%31===0?JSON.parse(JSON.stringify(history)):history,'full-cycle-audit');
  history=issued.history;assert.equal(history.cycle,0);assert.equal(history.issued,i+1);
  assert.ok(!seen.has(issued.question.fingerprint),u.id+' duplicate at '+i);seen.add(issued.question.fingerprint);
  maxBytes=Math.max(maxBytes,Buffer.byteLength(JSON.stringify(history)));
 }
 const wrapped=D.next(u.id,history,'ignored-new-run-seed');assert.equal(wrapped.history.cycle,1);assert.notEqual(wrapped.question.poolId,history.lastId);
 const row={id:u.id,subject:u.subject,title:u.title,size:pool.size,numeric:pool.numericSize||0,
  single:pool.questions.filter(q=>q.kind==='single'||q.kind==='concept').length,paired:pool.questions.filter(q=>q.kind==='paired').length,
  authoredAdded:P.parse(u.id).length,usedSourceMaterials:pool.math?null:usedSources.size,duplicates:pool.size-seen.size,cycleBoundaryRepeat:false,maxHistoryBytes:maxBytes};
 rows.push(row);console.log(`${u.id}: ${row.size}, duplicate=0, history<=${maxBytes} bytes`);
}
const report={revision:P.REVISION,generatedAt:new Date().toISOString(),method:'all entries, one complete persisted cycle per unit, next-cycle boundary',elapsedMs:Date.now()-started,total:rows.reduce((n,r)=>n+r.size,0),rows};
const out=process.argv.find(x=>x.startsWith('--out='));if(out)fs.writeFileSync(out.slice(6),JSON.stringify(report,null,2)+'\n');
console.log(`PASS ${report.total} unique entries across all 49 complete unit cycles (${report.elapsedMs}ms)`);
