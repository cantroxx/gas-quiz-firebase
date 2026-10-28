'use strict';
const crypto=require('node:crypto'),C=require('./curriculum'),G=require('./generator'),E=require('./case-expansion'),M=require('./math-pool'),{item}=require('./question');
const HistoryWorkshop=require('./history-workshop'),HistoryInquiry=require('./history-inquiry'),MathReasoning=require('./math-reasoning'),SpellingWorkshop=require('./spelling-lessons');
const Visual=require('./visual-packs');
const Learning=require('./learning'),Packs=require('./learning-packs'),Workshop=require('./reading-workshop'),Investigation=require('./investigation-workshop');
const MathTransfer=require('./math-transfer');
const Transfer=require('./transfer-packs');
const authored=Object.assign({},require('./materials-science'),require('./materials-korean'),require('./materials-social'));
const REVISION='subject-visual-2026-10-18-v4',NUMERIC_VERSION='math-v2',cache=new Map();
const hash=text=>crypto.createHash('sha256').update(text).digest('hex').slice(0,24);
function materialKey(q){return JSON.stringify([q.passage.replace(/[0-9]+/g,'#'),q.diagram||null]);}
function parse(id){return (authored[id]||'').trim().split('\n').filter(Boolean).map((line,i)=>{
 const fields=line.split('|').map(x=>x.trim());if(fields.length!==6||fields.some(x=>!x))throw Error('Invalid material '+id+':'+i);
 const [title,passage,prompt,correct,wrong,explanation]=fields;
 if(correct===wrong)throw Error('Ambiguous material '+title);
 return {id:hash(id+'\n'+passage),title,passage,prompt,correct,wrong,explanation,origin:'authored'};
});}
function paired(unitId,a,b){
 const option=(x,y)=>`자료 1: ${x}\n자료 2: ${y}`;
 return G.finalize(unitId,item(`${unitId}:compare-evidence`,
  `【자료 1】 ${a.title||''}\n${a.passage}\n질문: ${a.prompt}\n\n【자료 2】 ${b.title||''}\n${b.passage}\n질문: ${b.prompt}`,
  '두 자료의 질문에 대한 답이 모두 알맞은 것은?',option(a.correct,b.correct),[
   [option(a.wrong,b.correct),`자료 1: ${a.explanation}`],
   [option(a.correct,b.wrong),`자료 2: ${b.explanation}`],
   [option(a.wrong,b.wrong),`자료 1: ${a.explanation}\n자료 2: ${b.explanation}`]
  ],`자료 1: ${a.explanation}\n자료 2: ${b.explanation}`,{difficulty:1,objective:'interpret-evidence',family:'basic-comparison'}),G.context('pair:'+a.id+':'+b.id));
}
function caseQuestions(unitId){return (E.catalog[unitId]||[]).flatMap(c=>{
 const passage=`${c.title}\n${c.facts.join('\n')}`;
 return [item(`${unitId}:case-inference`,passage,'자료의 두 내용을 함께 고려한 설명으로 가장 알맞은 것은?',c.claim,c.wrong,`근거: ${c.facts.join(' ')}\n따라서 ${c.claim}`,{difficulty:2,objective:'case-'+c.id,family:'case-inference'}),...c.wrong.map(([mistake,reason],index)=>item(`${unitId}:case-review`,passage,`“${mistake}”라는 해석을 자료에 비추어 검토한 설명으로 알맞은 것은?`,reason,[...c.wrong.filter((_,j)=>j!==index),[`자료에 “${c.facts[0]}”라는 사실도 있으므로 그 해석을 그대로 받아들인다.`,`자료 속 사실이 있다고 해서 그 사실에서 끌어낸 모든 해석이 옳아지는 것은 아닙니다. ${reason}`]],`“${mistake}”는 고쳐야 합니다. ${reason}`,{difficulty:3,objective:'case-'+c.id,family:'case-review'}))].map(v=>G.finalize(unitId,v,G.context(c.id+':'+v.correct)));
 });}
function build(unitId){
 const u=C.unitById[unitId];if(!u)throw Error('Unknown pool');
 const materials=[],materialMap=new Map(),questions=[],seen=new Set(),stems=new Set(),familyCounts={};
 function add(q,kind='single',sourceIds){
  const stem=JSON.stringify([q.passage,q.prompt,q.diagram]);if(seen.has(q.fingerprint)||stems.has(stem))return;seen.add(q.fingerprint);stems.add(stem);
  if(!sourceIds){const key=materialKey(q),id=hash(unitId+'\n'+key);sourceIds=[id];
   if(!materialMap.has(id)){const source={id,passage:q.passage,prompt:q.prompt,correct:q.choices[q.answer],wrong:q.choices.find((_,i)=>i!==q.answer),explanation:q.explanation,origin:kind};materials.push(source);materialMap.set(id,source);}
  }
  questions.push(Learning.annotate({...q,poolId:(u.subject==='math'?'extra-':'')+hash(q.fingerprint),sourceIds,kind}));
 }
 const structural=new Set();
 for(let i=0;i<(u.group==='spelling'?0:3000);i++){
  const q=G.generateBase(unitId,'pool-source-'+i,i),skill=q.skill.split(':').at(-1);
  // Keep different tasks on the same text; never count source combinations as
  // hundreds of independent passages. Math retains genuine numeric variants.
  const canonical=u.subject==='math'||u.group==='spelling'?q.fingerprint:q.fingerprint.replace(/[0-9]+/g,'#');
  if(structural.has(canonical))continue;
  const limit=skill==='chronology-context'?24:u.group==='spelling'?48:u.subject==='math'?180:Infinity;
  if((familyCounts[skill]||0)>=limit)continue;
  structural.add(canonical);familyCounts[skill]=(familyCounts[skill]||0)+1;
  add(q,u.subject==='math'?'concept':'single');
 }
 for(const q of caseQuestions(unitId))add(q,u.subject==='math'?'concept':'single');
 const historyCore=HistoryWorkshop.questions(u).filter(q=>['history-focus','history-overreach','history-investigation'].includes(q.family));
 for(const value of [...Visual.questions(u),...Packs.questions(unitId),...Transfer.questions(u),...SpellingWorkshop.questions(u),...MathReasoning.questions(u),...MathTransfer.questions(u,G.context(unitId+':math-transfer')),...historyCore,...HistoryInquiry.questions(u),...Workshop.questions(u),...Investigation.questions(u,G.context(unitId+':investigation'))])add(G.finalize(unitId,value,G.context('learning-pack:'+unitId+':'+value.skill)),'learning');
 // Existing short independent materials remain reachable as basic practice.
 // Each appears in ONE pair only. Do not pad a target size by recombining them.
 const texts=parse(unitId);
 for(const m of texts){materials.push(m);materialMap.set(m.id,m);}
 for(let i=0;i<texts.length;i+=2){if(!texts[i+1])throw Error('Unpaired material');add(paired(unitId,texts[i],texts[i+1]),'paired',[texts[i].id,texts[i+1].id]);}
 const numericSize=u.subject==='math'?M.count(u):0;
 const revision=hash(REVISION+questions.map(q=>q.poolId).sort().join(',')+NUMERIC_VERSION);
 const byId=new Map(questions.map(q=>[q.poolId,q]));
 const pool={unitId,size:numericSize+questions.length,numericSize,revision,math:u.subject==='math',materials,questions,byId};
 pool.ids=pool.math?[...Array.from({length:numericSize},(_,i)=>`${NUMERIC_VERSION}-${i}`),...questions.map(q=>q.poolId)]:questions.map(q=>q.poolId);
 pool.metadata=new Map(questions.map(q=>[q.poolId,q]));
 if(pool.math)for(let i=0;i<numericSize;i++){
  const raw=M.generate(u,G.context('math-pool-'+i),i);
  pool.metadata.set(`${NUMERIC_VERSION}-${i}`,Learning.annotate({unitId,skill:raw.skill,sourceIds:[`${NUMERIC_VERSION}-${i}`],kind:'parameterized',difficulty:raw.difficulty||null,family:raw.family||null,objective:raw.objective||null}));
 }
 return pool;
}
function get(unitId){if(!cache.has(unitId))cache.set(unitId,build(unitId));return cache.get(unitId);}
function ids(pool){return pool.ids;}
function question(unitId,id,shuffleSeed){
 const pool=get(unitId);let q;
 if(pool.math&&id.startsWith(NUMERIC_VERSION+'-')){
  if(!new RegExp('^'+NUMERIC_VERSION+'-\\d+$').test(id))throw Error('Unknown math question');const i=Number(id.slice(NUMERIC_VERSION.length+1));
  q=G.finalize(unitId,M.generate(C.unitById[unitId],G.context('math-pool-'+i),i),G.context('math-choice-'+i));
  q={...q,poolId:id,sourceIds:[id],kind:'parameterized'};
 }else q=pool.byId.get(id);
 if(!q)throw Error('Unknown pool question');
 const order=G.context(shuffleSeed+':'+id).shuffle([0,1,2,3]);
 return Learning.annotate({...q,choices:order.map(i=>q.choices[i]),answer:order.indexOf(q.answer),rationales:order.map(i=>q.rationales[i]),contentRevision:REVISION});
}
function numericCompatible(unitId,version){const u=C.unitById[unitId];return version===NUMERIC_VERSION||(version==='math-v1'&&u?.subject==='math'&&u.number!==5&&!(u.group==='4-2'&&u.number===2));}
module.exports={get,ids,question,parse,REVISION,NUMERIC_VERSION,numericCompatible,hash};
