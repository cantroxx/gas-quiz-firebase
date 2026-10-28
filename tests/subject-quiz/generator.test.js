'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test');
const C=require('../../functions/subject-quiz/curriculum'),generator=require('../../functions/subject-quiz/generator');
// Keep independent numeric and semantic regression checks on every original family.
const G={...generator,generate:generator.generateBase};
const nums=s=>(s.match(/\d+(?:\.\d+)?/g)||[]).map(Number);
// Recompute from the learner-visible premises, never from generator.verification.answer or its explanation.
function independentlySolve(q){
 const k=q.skill.split(':').at(-1),p=q.passage,n=nums(p),v=q.diagram?.values;
 switch(k){
 case 'place-value': {const [record,digit,wrong]=n;return wrong*10;}
 case 'compare-place': return n[0]-n[1];
 case 'skip-count': return n[1]+2*n[0];
 case 'angle-scale':return Number(p.match(/안쪽 눈금 (\d+)°/)[1]);
 case 'triangle-angle':return 180-n[0]-n[1];
 case 'multiply-plan':return n[0]*(n[1]%10);
 case 'division-context':return Math.ceil(n[0]/n[1]);
 case 'division-remainder':return Math.floor(n[0]/n[1]);
 case 'graph-compare':return v[3]-v[0];
 case 'graph-budget':return v.reduce((a,b)=>a+b,0)+n[0];
 case 'relation-table':{const a=n[3]-n[1],b=n[1]-a;return a*nums(q.prompt)[0]+b;}
 case 'relation-inverse':return (n[2]-n[0])/n[1];
 case 'fraction-unit':return (n[2]+n[3])/n[1];
 case 'fraction-borrow':return n[0]-n[1]/n[2];
 case 'mixed-subtract':return n[0]+n[1]/n[2]-n[3]/n[4];
 case 'isosceles-evidence':return (180-n[0])/2;
 case 'decimal-add':return (Math.round(n[0]*1000)+Math.round(n[1]*1000))/1000;
 case 'decimal-subtract':return (Math.round(n[0]*1000)-Math.round(n[1]*1000))/1000;
 case 'decimal-two-step':return (Math.round(n[0]*1000)+Math.round(n[1]*1000)-Math.round(n[2]*1000))/1000;
 case 'parallel-angle':return n[0];
 case 'diagonal-reason':return q.diagram.sides-3;
 case 'polygon-boundary':return n[0]*n[1];
 case 'map-scale':return n[1]*n[2];
 case 'evaporation-data':return (n[0]-n[2])-(n[0]-n[1]);
 default:throw Error('Independent solver missing: '+q.skill);
 }
}
const value=s=>s.includes('/')?Number(s.split('/')[0])/Number(s.split('/')[1]):parseFloat(s);
test('all 49 units: 29,400 reproducible questions, distinct choices, passage, rationales and three learning skills',()=>{
 assert.equal(C.units.length,49);
 for(const unit of C.units){const skills=new Set();for(let i=0;i<600;i++){
  const q=G.generate(unit.id,'validated-seed-'+i,i);assert.equal(q.choices.length,4,unit.id);assert.equal(new Set(q.choices).size,4,unit.id);
  assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4);assert.ok(q.passage.length>20&&q.prompt.length>5&&q.explanation.length>20,unit.id);
  assert.equal(q.rationales.length,4);q.rationales.forEach(x=>assert.ok(typeof x==='string'&&x.length>10,q.skill));
  assert.equal(q.unitId,unit.id);assert.doesNotMatch(JSON.stringify(q),/undefined|NaN/);assert.deepEqual(q,G.generate(unit.id,'validated-seed-'+i,i));
  const visible=G.publicQuestion(q);for(const key of ['answer','explanation','fingerprint','rationales','verification'])assert.equal(key in visible,false);
  assert.equal(visible.passage,q.passage);assert.equal(q.contentVersion,G.CONTENT_VERSION);skills.add(q.skill);
 }assert.equal(skills.size,3,unit.id+' must have three distinct learning tasks');}
});
test('numeric answers independently agree with displayed data; correct value is not always the smallest',()=>{
 const ranks=[0,0,0,0],positions=[0,0,0,0],tested=new Set();let count=0;
 for(const u of C.units)for(let i=0;i<600;i++){
  const q=G.generate(u.id,'independent-'+i,i);positions[q.answer]++;
  if(q.verification){const answer=value(q.choices[q.answer]),expected=independentlySolve(q);assert.ok(Math.abs(answer-expected)<1e-9,JSON.stringify({skill:q.skill,p:q.passage,answer,expected}));
   assert.ok(q.choices.every(x=>Number.isFinite(value(x))&&value(x)>=0));assert.equal(new Set(q.choices.map(value)).size,4);
   ranks[q.choices.map(value).sort((a,b)=>a-b).indexOf(answer)]++;tested.add(q.skill);count++;
  }
  if(['bar','line'].includes(q.diagram?.kind)){assert.equal(q.diagram.values.length,q.diagram.labels.length);assert.ok(q.diagram.values.every(n=>n>=0&&n<=60));}
 }
 assert.equal(tested.size,25);assert.ok(count>=5000);ranks.forEach(x=>assert.ok(x/count>.15&&x/count<.4,JSON.stringify(ranks)));positions.forEach(x=>assert.ok(x/29400>.23&&x/29400<.27));
});
test('known semantic regression cases and diagram labels',()=>{
 for(let i=0;i<80;i++){
  const q=G.generate('science:4-2:2','regression-'+i,1);assert.match(q.choices[q.answer],/모두 생물 요소/);assert.match(q.explanation,/서로 다른 기준/);
  const c=G.generate('science:4-1:4','regression-'+i,0);assert.match(c.choices[c.answer],/서로 다른 기준/);
  const a=G.generate('math:4-1:2','regression-'+i,0);assert.equal(a.diagram.label,false);
  const f=G.generate('math:4-2:1','regression-'+i,0);assert.match(f.passage,/여러 개/);
  const g=G.generate('math:4-2:5','regression-'+i,1);assert.notEqual(g.diagram.values[1]-g.diagram.values[0],g.diagram.values[2]-g.diagram.values[1]);
  const deep=G.generate('korean:4-1:1','regression-'+i,0);assert.ok(deep.passage.length>=130);assert.match(deep.explanation,/단서:/);
 }
 const q=G.generate('math:4-1:5','fingerprint',0);assert.ok(q.fingerprint.includes(JSON.stringify(q.diagram)));assert.ok(q.fingerprint.includes(q.passage));
});
test('catalog and ranking version are unchanged; photographs remain excluded',()=>{
 assert.equal(C.VERSION,'subject-2022-v1');assert.equal(C.subjects.find(s=>s.id==='korean').groups.find(g=>g.id==='spelling').description,'초등 6학년까지의 어휘·맞춤법·띄어쓰기');
 assert.equal(C.subjects.find(s=>s.id==='social').groups.find(g=>g.id==='world-history').units.length,2);assert.equal(C.units.some(u=>/인물 이미지|문화유산 이미지/.test(u.title)),false);
});
test('authenticated return opens only an allowlisted subject and preserves normal destinations',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),html=fs.readFileSync('public/index.html','utf8');
 const source=html.slice(html.indexOf('    function openRestoredMemberDestination(profile)'),html.indexOf('    // ---- 문의하기'));
 for(const [query,expected]of [['?subjectQuizReturn=korean','korean'],['?subjectQuizReturn=math','math'],['?subjectQuizReturn=social','social'],['?subjectQuizReturn=science','science'],['?subjectQuizReturn=https://example.com','town'],['?view=home','home']]){
  const calls=[],ctx={URLSearchParams,window:{location:{search:query},DJ48AccountData:{getRestoredMemberDestination:()=> 'town'}},showSubjectView:x=>calls.push(x),showHomeView:()=>calls.push('home'),showAdminView:()=>calls.push('admin'),showTownView:()=>calls.push('town'),claimHousingDailyCouponSilently:()=>{},startTownSocial:()=>{}};
  vm.createContext(ctx);vm.runInContext(source+';openRestoredMemberDestination({});',ctx);assert.deepEqual(calls,[expected]);
 }
});

test('old client gets reading passage in prompt without exposing grading data',()=>{
 const q=G.generate('korean:4-1:1','old-client',0),v=G.publicQuestion(q,false);assert.equal(v.passage,'');assert.equal(v.prompt,q.passage+'\n\n'+q.prompt);for(const key of ['answer','explanation','rationales','verification'])assert.equal(key in v,false);
});
