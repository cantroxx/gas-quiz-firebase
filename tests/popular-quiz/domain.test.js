'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),D=require('../../functions/popular-quiz/domain'),pack=require('../../functions/popular-quiz/catalog.json');
function sample(category,generation,count=30){return Array.from({length:count},(_,i)=>({id:`${category}-${generation}-${i}`,category,kind:'character',group:String(generation),generation,prompt:'이름은?',answer:`이름-${generation}-${i}`,aliases:[],imageUrl:'https://example.com/image.png'}));}
test('personal/group rounds and anime diversity use reviewed images without answer leakage',()=>{
 for(let i=0;i<30;i++)for(const category of ['idol','anime']){
  const round=D.buildRound(category,pack.questions.filter(q=>q.category===category));assert.equal(round.length,20);assert.equal(new Set(round.map(q=>q.id)).size,20);
  if(category==='idol'){assert.equal(round.filter(q=>q.kind==='person').length,15);assert.equal(round.filter(q=>q.kind==='group').length,5);}else assert.ok(Math.max(...Object.values(round.reduce((c,q)=>(c[q.group]=(c[q.group]||0)+1,c),{})))<=2);
  for(const q of round){assert.equal(q.choices[q.answerIndex],q.answer);assert.equal(new Set(q.choices.map(D.normalize)).size,4);assert.equal(D.publicQuestion(q).answer,undefined);assert.equal(D.publicQuestion(q).answerIndex,undefined);assert.equal(D.publicQuestion(q).sourceUrl,undefined);}
 }
});
test('Pokemon selection is validated, canonical and balanced for every allowed generation count',()=>{
 assert.deepEqual(D.generations([9,1,4,1],'ranking'),[1,4,9]);
 for(const value of [[],[1],[1,1,2],[0,1,2],[1,2,10],['1',2,3]])assert.throws(()=>D.generations(value,'ranking'));
 assert.throws(()=>D.generations([1,2],'practice'));
 for(let n=3;n<=9;n++){
  const pool=Array.from({length:n},(_,i)=>sample('pokemon',i+1)).flat(),round=D.buildRound('pokemon',pool);
  const counts=Array.from({length:n},(_,i)=>round.filter(q=>q.generation===i+1).length);
  assert.ok(Math.max(...counts)-Math.min(...counts)<=1);assert.equal(new Set(round.map(q=>q.id)).size,20);
 }
 assert.throws(()=>D.buildRound('pokemon',[...sample('pokemon',1,1),...sample('pokemon',2),...sample('pokemon',3)]));
});
test('current legacy source images remain unchanged; disabled/invalid rows fail closed',()=>{
 const source={questionId:'25',answer:'피카츄',imageUrl:'https://existing.example/pikachu.png',aliases:['피카츄!']};
 assert.equal(D.existingQuestion(source,'pokemon',1).imageUrl,source.imageUrl);
 assert.equal(D.existingQuestion({...source,active:false},'pokemon',1),null);
 assert.equal(D.existingQuestion({...source,imageUrl:'javascript:evil()'},'pokemon',1),null);
});
test('new ranking summaries preserve old records and never double-count Pokemon combinations',()=>{
 const old={categories:[{categoryKey:'old',score:200}],totalScore:200};
 const r={...D.target('pokemon',[1,2,3]),memberUserId:'u',displayName:'친구',recordId:'r',score:18,elapsedSeconds:9000,elapsedText:'9000초',quizId:'pokemon'};
 const first=D.summaries({},old,r,1);assert.equal(first.king.totalScore,218);assert.equal(first.king.categories[0].score,200);
 const second=D.summaries(first.user,first.king,{...r,...D.target('pokemon',[4,5,6]),score:17},2);assert.equal(second.king.totalScore,218);
 const third=D.summaries(second.user,second.king,{...r,score:20},3);assert.equal(third.king.totalScore,220);assert.equal(third.king.categories.length,2);
 assert.equal(require('../../public/js/domain/ranking-domain').getRankingCategoryKey({categoryKey:'popular-v2-tiniping',category:'인기 퀴즈 · 티니핑'}),'popular-v2-tiniping');
});
module.exports={sample};
