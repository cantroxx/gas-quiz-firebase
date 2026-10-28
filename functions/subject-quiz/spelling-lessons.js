'use strict';
const {item}=require('./question');
const rows=require('./spelling-curriculum').source.trim().split('\n').filter(Boolean).map(line=>{
 const p=line.split('|');if(p.length!==10)throw Error('Invalid spelling lesson');
 const pair=s=>{const a=s.split('~');if(a.length!==2)throw Error('Missing spelling explanation');return a;};
 const row={id:p[0],correct:p[1],wrong:p.slice(2,5).map(pair),rule:p[5],wrongRules:p.slice(6,9).map(pair),contexts:p[9].split('^')};
 if(row.contexts.length!==4||row.contexts.some(s=>!s.includes('□')))throw Error('Missing spelling contexts: '+row.id);
 return row;
});
const fill=(s,w)=>s.replaceAll('□',w);
function questions(u){if(u.group!=='spelling')return [];
 return rows.flatMap((r,i)=>{
  const extra={objective:'spelling-rule-'+r.id,contentTopics:['spelling:'+r.id],materialId:'spelling:'+r.id};
  const make=(type,passage,prompt,correct,wrong,level,ex)=>item(`${u.id}:spelling-${type}`,passage,prompt,correct,wrong,ex,{...extra,difficulty:level,family:'spelling-'+type});
  const context=make('context',r.contexts[0],'글의 뜻과 문장 구조에 맞게 빈칸을 채운 것은?',r.correct,r.wrong,1,`${r.rule} 완성한 문장: ${fill(r.contexts[0],r.correct)}`);
  // Four separately labelled editing examples, not a fabricated connected story.
  const editRows=[{text:fill(r.contexts[1],r.wrong[0][0]),from:r.wrong[0][0],to:r.correct,why:r.wrong[0][1],bad:true}];
  for(const offset of [3,11,19]){const other=rows[(i+offset)%rows.length];editRows.push({text:fill(other.contexts[1],other.correct),from:other.correct,to:other.wrong[0][0],why:other.wrong[0][1],bad:false});}
  const ordered=editRows.slice(i%4).concat(editRows.slice(0,i%4));
  const edits=ordered.map((e,j)=>({label:`${j+1}번: ‘${e.from}’ → ‘${e.to}’`,...e}));
  const proofreading=make('proofread',ordered.map((e,j)=>`${j+1}. ${e.text}`).join('\n'),'네 연습 문장 중 잘못 쓴 부분을 바르게 고친 것은?',edits.find(x=>x.bad).label,edits.filter(x=>!x.bad).map(e=>[e.label,`이 문장의 ‘${e.from}’는 이미 알맞습니다. 제안대로 고치면 오류가 생깁니다. ${e.why}`]),2,`‘${r.wrong[0][0]}’를 ‘${r.correct}’로 고칩니다. ${r.wrong[0][1]}`);
  const reasoning=make('rule',fill(r.contexts[2],r.correct),'이 문장에서 표시한 표현의 표기·뜻을 설명한 말로 알맞은 것은?',r.rule,r.wrongRules,3,`검토할 표현은 ‘${r.correct}’입니다. ${r.rule}`);
  reasoning.passage=`검토할 표현: ‘${r.correct}’\n${reasoning.passage}`;
  const transfer=make('transfer',`새 문장: ${r.contexts[3]}`,'문맥과 표기 원칙에 맞게 완성한 문장은?',fill(r.contexts[3],r.correct),r.wrong.map(([w,why])=>[fill(r.contexts[3],w),why]),2,`${r.rule} 새 문장에서는 ‘${r.correct}’를 씁니다.`);
  return [context,proofreading,reasoning,transfer];
 });
}
module.exports={rows,questions,fill};
