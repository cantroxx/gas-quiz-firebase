'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../../functions/subject-quiz/curriculum'),G=require('../../functions/subject-quiz/generator'),E=require('../../functions/subject-quiz/case-expansion'),{selectQuestion}=require('../../functions/subject-quiz/selection');
test('216 independently authored materials: scope, premises, misconceptions and all four variants',()=>{
 assert.equal(Object.keys(E.catalog).length,43);assert.equal(Object.values(E.catalog).flat().length,216);
 const materialIds=new Set(),texts=new Set();
 for(const [id,rows]of Object.entries(E.catalog)){
  assert.ok(C.unitById[id]);for(const c of rows){assert.ok(!materialIds.has(c.id));materialIds.add(c.id);const text=c.facts.join('\n');assert.ok(!texts.has(text),'Duplicated new material: '+c.id);texts.add(text);
   assert.equal(c.facts.length,2);assert.equal(c.wrong.length,3);assert.equal(new Set([...c.facts,c.claim,...c.wrong.map(x=>x[0])]).size,6,c.id);assert.ok(text.length>=50,c.id);for(const [bad,why]of c.wrong){assert.ok(bad.length>=10&&why.length>=10,c.id);}
  }
  const seen=new Set();for(let i=0;i<1200;i++){
   const q=G.generateExpanded(id,'all-expanded-'+i,i);seen.add(q.materialId+':'+q.materialVariant);
   assert.equal(new Set(q.choices).size,4);assert.ok(q.answer>=0&&q.answer<4);assert.ok(q.rationales.every(x=>x.length>10));assert.equal(q.contentRevision,'subject-cases-2026-10-18');
   assert.deepEqual(q,G.generateExpanded(id,'all-expanded-'+i,i));const visible=G.publicQuestion(q);for(const key of ['answer','rationales','materialVariant','fingerprint','verification'])assert.equal(key in visible,false);
  }assert.equal(seen.size,rows.length*4,id+' missing authored case/variant');
 }
});
test('mixed generator preserves structure and reaches both base and supplementary tasks in every expanded unit',()=>{
 for(const u of C.units){let base=0,extended=0;const unique=new Set();
  for(let i=0;i<600;i++){const q=G.generate(u.id,'validated-seed-'+i,i);unique.add(q.fingerprint);q.materialId?extended++:base++;assert.equal(q.choices.length,4);assert.equal(new Set(q.choices).size,4);assert.ok(q.passage.length>20);assert.doesNotMatch(JSON.stringify(q),/undefined|NaN/);}
  assert.ok(unique.size>=25,u.id+' too few unique questions: '+unique.size);assert.ok(base>0);if(E.catalog[u.id])assert.ok(extended>0);
 }
});
test('selection prioritizes unseen question then spaces recent passages; finite fallback and legacy fingerprints',()=>{
 const q=(p,k)=>({passage:p,fingerprint:JSON.stringify([p,k,k,null])});const old=q('A','old'),newA=q('A','new'),newB=q('B','new');let calls=0;
 assert.equal(selectQuestion({unitId:'test',seed:'test',seq:0,recent:[old.fingerprint]},()=>[newA,newB][Math.min(calls++,1)]),newB);
 calls=0;assert.equal(selectQuestion({recent:[old.fingerprint]},()=>{calls++;return calls===1?newA:old;}),newA);assert.equal(calls,100);
 calls=0;assert.equal(selectQuestion({recent:['legacy-id',old.fingerprint]},()=>{calls++;return old;}),old);assert.equal(calls,100);
});
test('30-question rounds: exact repeat <=20% per unit; all 49 units, ten independent runs',()=>{
 for(const u of C.units){let duplicates=0,near=0;
  for(let trial=0;trial<10;trial++){const run={unitId:u.id,seed:'audit-20261018-'+trial,seq:0,recent:[]},seen=new Set(),last=[];
   for(let seq=0;seq<30;seq++){run.seq=seq;const q=selectQuestion(run),material=JSON.stringify([q.passage,q.diagram||null]);if(seen.has(q.fingerprint))duplicates++;if(last.slice(-3).includes(material))near++;seen.add(q.fingerprint);last.push(material);run.recent=[...run.recent.slice(-59),q.fingerprint];}
  }assert.ok(duplicates<=60,`${u.id}: ${duplicates}/300 repeated`);if(E.catalog[u.id])assert.ok(near<=30,`${u.id}: immediate material repetition ${near}/300`);
 }
});
test('Korean first reading unit adds six distinct substantial narratives with evidence-led interpretations',()=>{
 const rows=E.catalog['korean:4-1:1'];assert.equal(rows.length,6);for(const c of rows){assert.ok(c.facts.join('').length>=170,c.id);assert.ok(c.wrong.every(x=>x[1].length>=20),c.id);}
});
