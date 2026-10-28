'use strict';
const C = require('./curriculum');
const language = require('./language');
const knowledge = require('./knowledge');
const math = require('./math');
const expansion = require('./case-expansion');
const CONTENT_REVISION='subject-cases-2026-10-18';
const CONTENT_VERSION='subject-depth-2026-10-17';
function random(seed) {
  let n = 2166136261;
  for (const c of String(seed)) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function context(seed) {
  const rnd = random(seed), int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = rows => rows[int(0, rows.length - 1)];
  const shuffle = rows => { const out = [...rows]; for (let i = out.length - 1; i > 0; i--) { const j = int(0, i); [out[i], out[j]] = [out[j], out[i]]; } return out; };
  return { int, pick, shuffle };
}
function generate(unitId, seed, index = 0, mode = 'mixed') {
  const unit = C.unitById[unitId]; if(!unit) throw Error('Unknown unit');
  const r = context(`${seed}:${unitId}:${index}`);
  const value = (mode!=='base'&&expansion.generate(unit,r,index,mode==='expanded')) || (unit.subject==='math'?math.generate(unit,r,index):unit.subject==='korean'?language.generate(unit,r,index):knowledge.generate(unit,r,index));
  return finalize(unitId,value,r);
}
function finalize(unitId,value,r){
  const polish=text=>String(text).replace(/([가-힣]+)(은\/는|이\/가|을\/를)/g,(_,word,pair)=>word+pair.split('/')[((word.charCodeAt(word.length-1)-44032)%28)?0:1]);
  const correct=polish(value.correct),wrong=value.wrong.map(polish);
  if(new Set([correct,...wrong]).size!==4||!value.passage||!value.explanation)throw Error('Invalid question: '+unitId);
  const choices=r.shuffle([correct,...wrong]),reasons=Object.fromEntries(Object.entries(value.reasons).map(([k,v])=>[polish(k),polish(v)]));
  const passage=polish(value.passage),prompt=polish(value.prompt),diagram=value.diagram||null;
  return {unitId,passage,prompt,choices,answer:choices.indexOf(correct),explanation:polish(value.explanation),rationales:choices.map(x=>x===correct?polish(value.explanation):reasons[x]),diagram,skill:value.skill,contentVersion:CONTENT_VERSION,contentRevision:CONTENT_REVISION,difficulty:value.difficulty||null,objective:value.objective||null,contentTopics:value.contentTopics||[],family:value.family||null,materialId:value.materialId||null,materialVariant:value.materialVariant??null,verification:value.verification||null,fingerprint:JSON.stringify([passage,prompt,correct,diagram])};
}
const publicQuestion=(q,splitPassage=true)=>({unitId:q.unitId,passage:splitPassage?(q.passage||''):'',prompt:!splitPassage&&q.passage?q.passage+'\n\n'+q.prompt:q.prompt,choices:q.choices,diagram:q.diagram,skill:q.skill,difficulty:q.difficulty||null,review:Boolean(q.reviewFor),contentVersion:q.contentVersion||'subject-v1'});
module.exports={generate,finalize,generateBase:(unitId,seed,index=0)=>generate(unitId,seed,index,'base'),generateExpanded:(unitId,seed,index=0)=>generate(unitId,seed,index,'expanded'),publicQuestion,context,CONTENT_VERSION,CONTENT_REVISION};
