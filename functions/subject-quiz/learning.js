'use strict';
// Server-owned learning state. Rankings never use a learner's mistakes or stage.
const labels = {1:'기초 확인',2:'근거 적용',3:'추론·오류 분석'};
function annotate(q) {
  const skill=q.skill.split(':').at(-1);
  const hard=/counterexample|source-limits|case-review|claim|design|class-inclusion|conditions|evidence-evaluation/.test(skill);
  const simple=/chronology-context|paired-context|place-value|pool-large|pool-angle|pool-decimal|pool-multiply|pool-(move|fraction|triangle|quadrilateral|polygon)-0|pool-relation-2|pool-graph-3/.test(skill);
  let objective=q.objective;
  if(!objective){
    if(q.unitId.startsWith('math:'))objective=skill.replace(/^pool-/, '').replace(/-\d+$/, '');
    else if(q.unitId.includes('spelling'))objective='spelling-context';
    else if(q.unitId.includes('-history:'))objective='historical-source-evidence';
    else objective=/review|limits|claim|design/.test(skill)?'evaluate-evidence':'interpret-evidence';
  }
  const aliases={'angle-width':'angle-measurement','reflection-property':'transformation','graph-design':'graph-evidence','triangle-class-inclusion':'triangle-properties','quadrilateral-evidence':'quadrilateral-inclusion','quadrilateral-counterexample':'quadrilateral-inclusion','regular-polygon-conditions':'polygon-conditions'};
  objective=aliases[objective]||objective;
  return {...q,difficulty:q.difficulty|| (hard?3:simple?1:2),objective,family:q.family||skill};
}
const DAY_MS=86400000;
function record(previous,q,correct,mode,time=Date.now()){
  if(mode!=='practice')return {...previous};
  const old=previous.learning||{},a=Number(old.answered||0)+1;
  const learning={stage:old.stage||1,answered:a,streak:correct?(old.streak||0)+1:0,missStreak:correct?0:(old.missStreak||0)+1,reviews:(old.reviews||[]).map(x=>({...x})),confirmed:old.confirmed||0};
  if(correct&&learning.streak>=3&&learning.stage<3){learning.stage++;learning.streak=0;}
  if(!correct&&learning.missStreak>=2&&learning.stage>1){learning.stage--;learning.missStreak=0;}
  const objective=annotate(q).objective;
  let entry=learning.reviews.find(x=>x.objective===objective);
  if(!correct){
    if(!entry){entry={objective,success:0};learning.reviews.push(entry);}
    entry.due=a+2;entry.dueAt=time+DAY_MS;entry.success=0;entry.lastQuestion=q.poolId||'';entry.lastSources=q.sourceIds||[];
  }else if(q.reviewFor&&entry&&q.reviewFor===entry.objective){
    entry.success++;
    if(entry.success>=2){learning.reviews=learning.reviews.filter(x=>x!==entry);learning.confirmed++;}
    else{entry.due=a+5;entry.dueAt=time+DAY_MS;entry.lastQuestion=q.poolId||'';entry.lastSources=q.sourceIds||[];}
  }
  learning.reviews=learning.reviews.slice(-128);
  return {...previous,learning};
}
function target(history,mode){
  if(mode==='practice')return history.learning?.stage||1;
  return [1,2,2,3,2,1,3,2,1,2][(history.rankingIssued||0)%10];
}
module.exports={annotate,record,target,labels,DAY_MS};
