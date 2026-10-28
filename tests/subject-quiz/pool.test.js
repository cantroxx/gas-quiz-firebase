'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../../functions/subject-quiz/curriculum'),G=require('../../functions/subject-quiz/generator'),P=require('../../functions/subject-quiz/pool'),D=require('../../functions/subject-quiz/deck');
const nums=s=>(s.match(/\d+(?:\.\d+)?/g)||[]).map(Number);
const value=s=>s.includes('/')?Number(s.split('/')[0])/Number(s.split('/')[1]):parseFloat(s);
// Independent oracle: read only the learner's premises and chart. Never read
// verification, poolProof, explanations, seeds or generator operands.
function solve(q){
 const k=q.skill.split(':').at(-1),t=Number(k.at(-1)),n=nums(q.passage),v=q.diagram?.values;
 if(k.startsWith('pool-large')){const place=q.passage.includes('조')?1e12:q.passage.includes('억')?1e8:1e4;return [n[0]*place+n[1],Math.floor(n[0]/place)*place,n[0]+3*place,n[0]-n[1]][t];}
 if(k.startsWith('pool-angle'))return [n[0]+n[1],180-n[0]-n[1],90-n[0]-n[1],n[0]+n[1]][t];
 if(k.startsWith('pool-multiply-divide'))return [n[0]*n[1],Math.floor(n[0]/n[1]),Math.ceil(n[0]/n[1]),n[0]%n[1]][t];
 if(k.startsWith('pool-move'))return [n[0]+n[2],n[1]+n[2],n[0]+n[2]+n[3],n[0]][t];
 if(k.startsWith('pool-graph'))return q.unitId.includes(':4-1:')?[Math.abs(v[3]-v[0]),v.reduce((s,x)=>s+x,0),v[1]+v[2],Math.abs(v[3]-v[2])][t]:[Math.abs(v[3]-v[0]),Math.abs(v[1]-v[0]),Math.abs(v[2]-v[1]),Math.abs(v[3]-v[2])][t];
 if(k.startsWith('pool-relation')){
  if(t===1)return (n[2]-n[0])/n[1];
  const diff=n[3]-n[1],extra=n[1]-diff;return t===0?nums(q.prompt)[0]*diff+extra:t===2?diff:extra;
 }
 if(k.startsWith('pool-fraction'))return t===0?n[0]+n[1]/n[2]+n[3]/n[4]:t===1?n[0]+n[1]/n[2]-n[3]/n[4]:t===2?n[0]-n[1]/n[2]:n[0]+n[1]/n[2]+n[3]-n[4]/n[5];
 if(k.startsWith('pool-triangle')){const angles=[n[0],n[1],180-n[0]-n[1]];assert.ok(angles.every(x=>x>0&&x<180));return [angles[2],Math.max(...angles),Math.min(...angles),n[0]+n[1]][t];}
 if(k.startsWith('pool-decimal')){const a=Math.round(n[0]*1000),b=Math.round(n[1]*1000);return (t===1?a-b:t===2?a+b-Math.round(n[2]*1000):a+b)/1000;}
 if(k.startsWith('pool-quadrilateral'))return [2*(n[0]+n[1]),n[0]/2-n[1],n[0]/2-n[1],2*n[0]+n[1]][t];
 if(k.startsWith('pool-polygon'))return [n[0]*n[1],n[1]/n[0],(n[0]-1)*n[1],(n[0]+1)*n[1]][t];
 throw Error('Missing solver '+k);
}
test('all published pool entries: true counts, unique question IDs and text, no solution leakage',()=>{
 let total=0;
 for(const u of C.units){
  const pool=P.get(u.id),ids=P.ids(pool),seen=new Set(),stems=new Set(),skills=new Set(),answers=[0,0,0,0];
  assert.equal(ids.length,pool.size);assert.equal(new Set(ids).size,ids.length);
  assert.ok(u.subject==='math'?pool.size>=2000:pool.size>=100&&pool.size<=200,u.id);
  for(const id of ids){const q=P.question(u.id,id,'structural-audit');
   assert.equal(new Set(q.choices).size,4);assert.ok(q.answer>=0&&q.answer<4);assert.ok(q.rationales.every(x=>x.length>10),q.skill);
   assert.ok(!seen.has(q.fingerprint),'Duplicate '+u.id+':'+id);seen.add(q.fingerprint);const stem=JSON.stringify([q.passage,q.prompt,q.diagram]);assert.ok(!stems.has(stem),'Same stem '+u.id);stems.add(stem);skills.add(q.skill);answers[q.answer]++;total++;
   assert.doesNotMatch(JSON.stringify(q),/undefined|NaN|[\u3040-\u30ff]/);
   if(u.subject==='math'&&id.startsWith(P.NUMERIC_VERSION+'-')){const expected=solve(q);assert.ok(Math.abs(value(q.choices[q.answer])-expected)<1e-8,JSON.stringify({id,p:q.passage,answer:q.choices[q.answer],expected}));assert.equal(new Set(q.choices.map(value)).size,4);}
   const visible=G.publicQuestion(q);for(const key of ['poolId','sourceIds','answer','rationales','fingerprint','verification','poolProof'])assert.equal(key in visible,false,key);
  }
  // A single small pool can fluctuate. Check independent shuffle seeds below instead.
  if(u.subject==='math')assert.ok(skills.size>=4);
 }
 assert.ok(total>=68000);
});
test('math preserves every original skill and covers 만/억/조 rather than only inflating small-number combinations',()=>{
 for(const u of C.units.filter(x=>x.subject==='math')){
  const skills=new Set(P.get(u.id).questions.map(q=>q.skill));
  for(let t=0;t<3;t++)assert.ok(skills.has(G.generateBase(u.id,'curriculum-coverage',t).skill),u.id+' lost original skill');
 }
 for(const [id,word]of [[0,'만'],[3600,'억'],[7200,'조']])assert.ok(P.question('math:4-1:1',P.NUMERIC_VERSION+'-'+id,'coverage').passage.includes(word));
});
test('new sources are 128 science, 160 Korean, 48 social: no renamed/numeric clone counted as a new text',()=>{
 const counts={science:0,korean:0,social:0},texts=new Set();
 for(const u of C.units){const used=new Set(P.get(u.id).questions.flatMap(q=>q.sourceIds));for(const row of P.parse(u.id)){
  counts[u.subject]++;const canonical=row.passage.replace(/\d+/g,'#');assert.ok(!texts.has(canonical),row.title);texts.add(canonical);
  assert.ok(row.passage.length>=40,row.title);assert.ok(row.explanation.length>=25,row.title);assert.notEqual(row.correct,row.wrong);
  assert.ok(used.has(row.id),'Authored but unreachable: '+u.id+':'+row.title);
 }}assert.deepEqual(counts,{science:128,korean:160,social:48});
});
test('non-math full cycles across serialized sessions: no repeats, exhaustion only, no boundary repeat',()=>{
 for(const u of C.units.filter(x=>x.subject!=='math'))for(const seed of ['student-A','student-B']){
  let history={},last,seen=new Set(),sources=[];const pool=P.get(u.id);
  for(let i=0;i<pool.size*2;i++){
   const out=D.next(u.id,JSON.parse(JSON.stringify(history)),seed);history=out.history;
   if(i===pool.size){assert.equal(history.cycle,1);assert.notEqual(out.question.poolId,last);seen.clear();}
   assert.ok(!seen.has(out.question.poolId),u.id+' repeated before exhaustion');seen.add(out.question.poolId);last=out.question.poolId;sources.push(...out.question.sourceIds);
   assert.equal(history.issued,i%pool.size+1);assert.ok(Buffer.byteLength(JSON.stringify(history))<20000);
  }
  assert.equal(new Set(sources).size,new Set(pool.questions.flatMap(q=>q.sourceIds)).size);
 }
});
test('math history is compact and resumes without repeats; whole 2,000-item geometry cycle',()=>{
 for(const id of ['math:4-1:2','math:4-1:3']){
  let h={},seen=new Set(),limit=id==='math:4-1:2'?P.get(id).size:350;
  for(let i=0;i<limit;i++){const out=D.next(id,JSON.parse(JSON.stringify(h)),'math-persistent');h=out.history;assert.ok(!seen.has(out.question.poolId));seen.add(out.question.poolId);assert.ok(Buffer.byteLength(JSON.stringify(h))<30000);}
  assert.equal(h.issued,limit);if(id==='math:4-1:2'){const out=D.next(id,h,'ignored-new-session-seed');assert.equal(out.history.cycle,1);assert.notEqual(out.question.poolId,h.lastId);}
 }
});
test('non-math pool revision changes preserve surviving seen IDs, rather than reset the student',()=>{
 const id='science:4-2:3';let h={};const seen=new Set();
 for(let i=0;i<20;i++){const out=D.next(id,h,'upgrade');h=out.history;seen.add(out.question.poolId);}
 h.revision='previous-build';h.seenIds.push('removed-question');
 const out=D.next(id,h,'new-run');assert.ok(!seen.has(out.question.poolId));assert.equal(out.history.issued,21);assert.equal(out.history.cycle,0);assert.ok(!out.history.seenIds.includes('removed-question'));
});

test('choice positions across independent student seeds are not tied to template answer slots',()=>{
 for(const u of C.units){const pool=P.get(u.id),ids=pool.ids.slice(0,200),counts=[0,0,0,0];
  for(let trial=0;trial<10;trial++)for(const id of ids)counts[P.question(u.id,id,'choice-position-'+trial).answer]++;
  for(const n of counts)assert.ok(n/(ids.length*10)>.18&&n/(ids.length*10)<.32,u.id+': '+counts);
 }
});

const L=require('../../functions/subject-quiz/learning');
test('practice advances after three successes, steps down after two misses, ranking has no personal stage',()=>{
 const q=P.question('korean:4-1:1',P.get('korean:4-1:1').ids[0],'learning');let h={};
 for(let i=0;i<3;i++)h=L.record(h,q,true,'practice');assert.equal(h.learning.stage,2);
 for(let i=0;i<3;i++)h=L.record(h,q,true,'practice');assert.equal(h.learning.stage,3);
 h=L.record(h,q,false,'practice');h=L.record(h,q,false,'practice');assert.equal(h.learning.stage,2);
 assert.deepEqual(L.record(h,q,false,'ranking'),h);assert.equal(L.target({...h,rankingIssued:0},'ranking'),1);
 const same=D.next(q.unitId,h,'rank',{mode:'ranking'}),different=D.next(q.unitId,{...h,learning:{stage:1,reviews:[]}},'rank',{mode:'ranking'});
 assert.equal(same.question.poolId,different.question.poolId);assert.equal(same.question.reviewFor,undefined);
 const practice=D.next(q.unitId,same.history,'practice',{mode:'practice'});assert.equal(practice.history.rankingIssued,1);
});
test('incorrect concepts are revisited with different questions after intervening answers; two spaced confirmations clear queue',()=>{
 for(const id of C.units.map(u=>u.id)){
  let issued=D.next(id,{},'review-flow',{mode:'practice'}),h=L.record(issued.history,issued.question,false,'practice');
  const original=issued.question,entry=h.learning.reviews[0];assert.equal(entry.due,3);
  let confirmations=0,previousReviewAt=1,seen=new Set([original.poolId]),reviewIds=[];
  for(let i=0;i<40&&h.learning.confirmed===0;i++){
   issued=D.next(id,JSON.parse(JSON.stringify(h)),'restart',{mode:'practice'});const q=issued.question;
   assert.ok(!seen.has(q.poolId));seen.add(q.poolId);
   if(q.reviewFor){assert.equal(q.objective,original.objective);assert.ok(h.learning.answered>=entry.due);assert.ok(h.learning.answered-previousReviewAt>=(confirmations?5:2));reviewIds.push(q.poolId);previousReviewAt=h.learning.answered+1;confirmations++;}
   h=L.record(issued.history,q,true,'practice');
  }
  assert.equal(confirmations,2,id);assert.equal(h.learning.confirmed,1,id);assert.equal(h.learning.reviews.length,0,id);assert.equal(new Set(reviewIds).size,2);
 }
});
test('graph shapes and smallest-angle location vary; all units expose all three task levels',()=>{
 for(const u of C.units){const levels=new Set([...P.get(u.id).metadata.values()].map(q=>q.difficulty));assert.deepEqual([...levels].sort(),[1,2,3],u.id);}
 const directions=new Set(),mins=new Set();
 for(let i=0;i<2000;i+=4){const q=P.question('math:4-2:5',P.NUMERIC_VERSION+'-'+i,'shape'),v=q.diagram.values;directions.add(v.slice(1).map((x,j)=>Math.sign(x-v[j])).join(','));const t=P.question('math:4-2:2',P.NUMERIC_VERSION+'-'+(i+2),'angles'),n=nums(t.passage),values=[n[0],n[1],180-n[0]-n[1]];mins.add(values.indexOf(Math.min(...values)));}
 assert.ok(directions.size>=4);assert.ok(mins.size>=3);
});
test('old numeric IDs cannot silently refer to new math content; surviving extra IDs remain seen',()=>{
 const id='math:4-2:2',extra=P.get(id).questions[0].poolId;
 const out=D.next(id,{mathVersion:'math-v1',bits:Buffer.alloc(250,255).toString('base64'),seenExtras:[extra]},'upgrade');
 assert.equal(out.history.mathVersion,'math-v2');assert.equal(out.history.issued,2);assert.notEqual(out.question.poolId,extra);
});

test('every tagged learning objective has at least two alternative questions; bounded history for every full pool',()=>{
 for(const u of C.units){const p=P.get(u.id),counts={};for(const q of p.metadata.values())counts[q.objective]=(counts[q.objective]||0)+1;
 for(const [key,count]of Object.entries(counts))assert.ok(count>=3,u.id+': '+key);
 const previous=p.math?{mathVersion:P.NUMERIC_VERSION,bits:Buffer.alloc(Math.ceil(p.numericSize/8),255).toString('base64'),seenExtras:p.questions.slice(0,-1).map(q=>q.poolId)}:{seenIds:p.ids.slice(0,-1)};
 const out=D.next(u.id,previous,'last-unseen');assert.equal(out.history.issued,p.size);assert.ok(Buffer.byteLength(JSON.stringify(out.history))<50000,u.id);
 const next=D.next(u.id,JSON.parse(JSON.stringify(out.history)),'new-cycle');assert.equal(next.history.cycle,1);assert.notEqual(next.question.poolId,out.question.poolId);
 }
});

test('unchanged numeric math families retain old seen indices on content upgrade',()=>{
 const id='math:4-1:1',h={mathVersion:'math-v1',bits:Buffer.from([255]).toString('base64')};const out=D.next(id,h,'compatible-upgrade');
 assert.equal(out.history.issued,9);for(let i=0;i<8;i++)assert.ok(Buffer.from(out.history.bits,'base64')[0]&(1<<i));
});

test('expanded lessons have real topic coverage, selected-error explanations, and fresh core contexts',()=>{
 const S=require('../../functions/subject-quiz/spelling-lessons'),H=require('../../functions/subject-quiz/history-inquiry'),T=require('../../functions/subject-quiz/transfer-packs'),F=require('../../functions/subject-quiz/learning-feedback');
 assert.equal(S.rows.length,40);assert.equal(new Set(S.rows.map(x=>x.id)).size,40);
 const spelling=P.get('korean:spelling:1');assert.equal(spelling.size,160);
 assert.deepEqual([...new Set(spelling.questions.map(q=>q.family))].sort(),['spelling-context','spelling-proofread','spelling-rule','spelling-transfer']);
 for(const q of spelling.questions){assert.equal(q.contentTopics.length,1);assert.ok(q.objective.startsWith('spelling-rule-'));assert.equal(new Set(q.rationales).size,4);}
 for(const u of C.units.filter(x=>x.group.endsWith('history'))){
  assert.equal(H.catalog[u.id].length,15);
  const topics=new Set(P.get(u.id).questions.flatMap(q=>q.contentTopics||[]));assert.ok(topics.size>=25,u.id);
  assert.equal(new Set(H.catalog[u.id].map(x=>x.facts.join(' '))).size,15);
  assert.ok(!P.get(u.id).questions.some(q=>q.family==='history-comparison'||q.family==='history-source-limit'));
 }
 assert.equal(Object.keys(T.packs).length,30);assert.equal(Object.keys(F).length,30);
 for(const [id,p]of Object.entries(T.packs)){
  assert.equal(p.questions.length,2);assert.ok(p.text.length>=120,id);
  const core=P.get(id).questions.filter(q=>q.objective==='unit-core-evidence');
  assert.equal(core.length,6);assert.equal(new Set(core.map(q=>q.passage)).size,2);
  for(const q of core)assert.equal(new Set(q.rationales.filter((_,i)=>i!==q.answer)).size,3,'Shared error feedback '+q.skill);
 }
});

test('new applied math calculations are solved independently from visible premises',()=>{
 const read=s=>(s.match(/[0-9][0-9,]*(?:\.[0-9]+)?/g)||[]).map(x=>Number(x.replaceAll(',','')));
 let checked=0;
 for(const u of C.units.filter(x=>x.subject==='math')){
  const qs=P.get(u.id).questions.filter(q=>q.skill.endsWith(':transfer-calculation'));assert.equal(qs.length,6,u.id);
  for(const q of qs){const a=read(q.passage),first=u.group==='4-1',n=u.number;let expected;
   if(n===5)expected=first?q.diagram.values.reduce((s,x)=>s+x,0):q.diagram.values[0]-q.diagram.values.at(-1);
   else if(first)expected=n===1?Math.floor((a[0]-a[1])/a[2]):n===2?a[0]-a[1]:n===3?Math.ceil(a[0]/a[1]):n===4?a[0]-a[2]:4*a[0]+a[1];
   else expected=n===1?a[0]-a[1]/a[2]-a[3]/a[4]:n===2?(180-a[0])/2:n===3?Math.round((a[0]-a[1]-a[2])*100)/100:n===4?a[0]/2-a[1]:a[0]/({'오':5,'육':6,'칠':7,'팔':8,'구':9,'십':10}[q.passage.match(/정([오육칠팔구십])각형/)[1]]);
   assert.ok(Math.abs(value(q.choices[q.answer])-expected)<1e-8,JSON.stringify({unit:u.id,passage:q.passage,expected,answer:q.choices[q.answer]}));
   for(const reason of q.rationales)assert.doesNotMatch(reason,/주어진 수와 조건을 차례로 적용해 다시 계산/);
   checked++;
  }
 }
 assert.equal(checked,72);
});

test('practice reserves alternative examples and overdue reviews return after a day without affecting ranking',()=>{
 const unit='korean:spelling:1',time=1000000;
 let out=D.next(unit,{},'calendar-review',{mode:'practice',now:time});
 let h=L.record(out.history,out.question,false,'practice',time);const objective=out.question.objective,original=out.question.poolId;
 assert.equal(h.learning.reviews[0].dueAt,time+L.DAY_MS);
 const sameDay=D.next(unit,JSON.parse(JSON.stringify(h)),'resume',{mode:'practice',now:time+1000});
 assert.notEqual(sameDay.question.objective,objective,'Alternative consumed before due');
 const nextDay=D.next(unit,JSON.parse(JSON.stringify(h)),'resume',{mode:'practice',now:time+L.DAY_MS});
 assert.equal(nextDay.question.reviewFor,objective);assert.notEqual(nextDay.question.poolId,original);
 h=L.record(nextDay.history,nextDay.question,true,'practice',time+L.DAY_MS);
 const third=D.next(unit,JSON.parse(JSON.stringify(h)),'resume',{mode:'practice',now:time+2*L.DAY_MS});
 assert.equal(third.question.reviewFor,objective);assert.notEqual(third.question.poolId,nextDay.question.poolId);
 h=L.record(third.history,third.question,true,'practice',time+2*L.DAY_MS);assert.equal(h.learning.confirmed,1);assert.equal(h.learning.reviews.length,0);
 const rankA=D.next(unit,nextDay.history,'rank',{mode:'ranking',now:time});
 const rankB=D.next(unit,nextDay.history,'rank',{mode:'ranking',now:time+3*L.DAY_MS});
 assert.equal(rankA.question.poolId,rankB.question.poolId);assert.equal(rankB.question.reviewFor,undefined);
});

test('critique choices never reuse another true correction; transfer spelling does not print the answer rule',()=>{
 const E=require('../../functions/subject-quiz/case-expansion'),H=require('../../functions/subject-quiz/history-inquiry');
 for(const u of C.units){const p=P.get(u.id);
  for(const q of p.questions.filter(q=>q.family==='case-review'||q.family==='inquiry-critique')){
   const bank=q.family==='case-review'?E.catalog[u.id]:H.catalog[u.id];
   const match=bank.find(c=>c.wrong.some(([,reason])=>reason===q.choices[q.answer]));assert.ok(match,q.skill);
   const otherCorrections=match.wrong.map(([,e])=>e).filter(e=>e!==q.choices[q.answer]);
   assert.ok(q.choices.every((choice,i)=>i===q.answer||!otherCorrections.includes(choice)),q.skill);
  }
 }
 for(const q of P.get('korean:spelling:1').questions.filter(q=>q.family==='spelling-transfer')){
  assert.doesNotMatch(q.passage,/적용할 기준/);assert.ok(q.passage.includes('□'));assert.ok(!q.passage.includes(q.choices[q.answer]));
 }
});

test('social/science visual materials cover every unit and history contains evidence rather than teaching goals',()=>{
 const V=require('../../functions/subject-quiz/visual-packs'),H=require('../../functions/subject-quiz/history-workshop');
 assert.equal(Object.keys(V.catalog).length,14);
 for(const [id,cards]of Object.entries(V.catalog)){
  assert.equal(cards.length,3,id);assert.equal(new Set(cards.map(c=>JSON.stringify(c.diagram))).size,3,id);
  const qs=P.get(id).questions.filter(q=>q.family.startsWith('visual-'));assert.equal(qs.length,9,id);
  for(const q of qs){assert.equal(q.diagram.kind,'evidence');assert.ok(q.diagram.description.length>20);assert.equal(new Set(q.rationales).size,4,q.skill);}
 }
 for(const u of C.units.filter(u=>u.group.endsWith('history'))){
  const qs=P.get(u.id).questions.filter(q=>q.family.startsWith('history-'));assert.equal(qs.length,30);
  for(const q of qs){assert.doesNotMatch(q.passage,/탐구 방향/);assert.equal(q.diagram.type,'history-timeline');const shown=q.passage+q.diagram.description+q.diagram.marks.map(m=>m.text||'').join('');
   for(const [goal]of H.notes[u.id])assert.ok(!shown.includes(goal),'Leaked teaching goal '+q.skill);
   assert.doesNotMatch(q.choices.join(' '),/이 카드의 탐구 방향|학습용 요약이다/);
  }
 }
});

test('diagram premises independently support map, magnetic, food-web and volume answers',()=>{
 const V=require('../../functions/subject-quiz/visual-packs');const find=(id,key)=>V.catalog[id].find(c=>c.key===key);
 const map=find('social:4-1:1','map').diagram;
 assert.match(map.description,/학교 0 3/);assert.match(map.description,/공원 2 3/);assert.match(map.description,/도서관 2 1/);
 assert.equal((Math.abs(2-0)+Math.abs(1-3))*100,400);
 assert.equal(find('social:4-1:1','map').tasks[1][1],'400m');
 const poles=find('science:4-1:1','poles');assert.match(poles.diagram.description,/가: 왼쪽 자석은 왼쪽부터 N, S, 오른쪽 자석은 왼쪽부터 N, S/);assert.equal(poles.tasks[0][1],'가');
 const web=find('science:4-2:2','web');assert.match(web.diagram.description,/메뚜기에서 개구리로 화살표/);assert.match(web.diagram.description,/개구리에서 매로 화살표/);assert.equal(web.tasks[0][1],'메뚜기');assert.equal(web.tasks[1][1],'개구리');
 const gas=find('science:4-2:3','compression');assert.match(gas.diagram.description,/40mL.*20mL/);assert.equal(gas.tasks[0][1],'20mL');assert.match(gas.tasks[1][1],/같은 공기/);
 for(const cards of Object.values(V.catalog))for(const c of cards)for(const m of c.diagram.marks){assert.ok(['text','line','rect','circle','polygon','ellipse','path'].includes(m.tag));assert.ok(!JSON.stringify(m).includes('url('));}
});
