#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const C=require('../../functions/subject-quiz/curriculum'),G=require('../../functions/subject-quiz/generator'),{selectQuestion}=require('../../functions/subject-quiz/selection');
const P=require('../../functions/subject-quiz/pool'),D=require('../../functions/subject-quiz/deck');
function measure(generator,select){
 return C.units.map(u=>{
  const unique=new Set(),passages=new Set(),normalized=new Set(),skills=new Set();
  for(let i=0;i<600;i++){const q=generator.generate(u.id,'validated-seed-'+i,i);unique.add(q.fingerprint);passages.add(q.passage);normalized.add(q.passage.replace(/\d+(?:\.\d+)?/g,'#'));skills.add(q.skill);}
  let repeat20=0,repeat30=0,passageRepeat30=0,nearPassageRepeat=0,sourceReuse30=0;const firstRepeat=[];
  for(let trial=0;trial<10;trial++){
   const run={unitId:u.id,seed:'audit-20261018-'+trial,seq:0,recent:[]},seen=new Set(),materials=new Set(),sources=new Set(),last=[];let first=null;
   for(let seq=0;seq<30;seq++){
    run.seq=seq;const q=select(run),material=JSON.stringify([q.passage,q.diagram||null]);if(seen.has(q.fingerprint)){repeat30++;if(seq<20)repeat20++;if(first===null)first=seq+1;}
    if(materials.has(material))passageRepeat30++;if(last.slice(-3).includes(material))nearPassageRepeat++;
    if((q.sourceIds||[]).some(id=>sources.has(id)))sourceReuse30++;for(const id of q.sourceIds||[])sources.add(id);
    run.recent=[...run.recent.slice(-59),q.fingerprint];seen.add(q.fingerprint);materials.add(material);last.push(material);
   }firstRepeat.push(first);
  }
  return {id:u.id,subject:u.subject,title:u.title,poolSize:P.get(u.id).size,unique600:unique.size,passages600:passages.size,numberNormalizedPassages600:normalized.size,skills:skills.size,repeat20,repeat30,passageRepeat30,nearPassageRepeat,sourceReuse30,firstRepeat};
 });
}
function summarize(rows){return C.subjects.map(s=>{const us=rows.filter(x=>x.subject===s.id),rate=(k,n)=>+(100*us.reduce((a,x)=>a+x[k],0)/(us.length*n*10)).toFixed(1);return {subject:s.title,units:us.length,repeat20Pct:rate('repeat20',20),repeat30Pct:rate('repeat30',30),passageRepeat30Pct:rate('passageRepeat30',30),nearPassageRepeatPct:rate('nearPassageRepeat',30),sourceReuse30Pct:rate('sourceReuse30',30),under10:us.filter(x=>x.unique600<10).length};});}
const legacy=process.argv.includes('--legacy-selector');
const generator=legacy?G:{generate:(id,seed,index)=>{const pool=P.get(id);return P.question(id,P.ids(pool)[index%pool.size],seed);}};
const select=legacy?selectQuestion:run=>{const out=D.next(run.unitId,run.deck,run.seed);run.deck=out.history;return out.question;};
const rows=measure(generator,select),result={revision:legacy?G.CONTENT_REVISION:P.REVISION,method:{selection:legacy?'legacy retry heuristic':'production persistent deck',rawPerUnit:600,rawSampling:legacy?'random seeds':'enumerate first min(600,pool size) entries, then cycle',runsPerUnit:10,questionsPerRun:30,seed:'audit-20261018-{trial}',identity:'passage+prompt+correct+diagram',exactIncludesNumericVariants:true,materialIdentity:'whole passage+diagram; sourceReuse additionally tracks reused component materials'},summary:summarize(rows),rows};
const baseline=process.argv.find(x=>x.startsWith('--baseline='));
if(baseline){const old=require(path.resolve(baseline.slice(11),'generator.js'));const previous=measure(old,run=>{let q;for(let attempt=0;attempt<100;attempt++){q=old.generate(run.unitId,`${run.seed}:${run.seq}:${attempt}`,run.seq);if(!run.recent.includes(q.fingerprint))break;}return q;});result.baseline={summary:summarize(previous),rows:previous};}
const out=process.argv.find(x=>x.startsWith('--out='));if(out)fs.writeFileSync(out.slice(6),JSON.stringify(result,null,2));
console.log(JSON.stringify({revision:result.revision,before:result.baseline?.summary,after:result.summary,worst:rows.filter(x=>x.repeat30>60).map(x=>({id:x.id,repeat30:x.repeat30/3}))},null,2));
