'use strict';
const G=require('./generator');
// Legacy selector retained only for before/after audits and regression fixtures.
// Production service uses deck.js, with persisted per-student/unit history.
function selectQuestion(run,generate=G.generate){
 const recent=run.recent||[],seen=new Set(recent),passages=new Set(recent.slice(-3).map(f=>{
  try{const parts=JSON.parse(f);return JSON.stringify([parts[0],parts[3]||null]);}catch(_){return null;}
 }));
 let best,bestScore=-1;
 for(let attempt=0;attempt<100;attempt++){
  const q=generate(run.unitId,`${run.seed}:${run.seq}:${attempt}`,run.seq);
  // Exact novelty wins over material spacing. Exhaustion must never loop forever.
  const score=(seen.has(q.fingerprint)?0:2)+(passages.has(JSON.stringify([q.passage,q.diagram||null]))?0:1);
  if(score>bestScore){best=q;bestScore=score;}
  if(score===3)break;
 }
 return best;
}
module.exports={selectQuestion};
