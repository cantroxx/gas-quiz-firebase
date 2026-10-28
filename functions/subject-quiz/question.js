'use strict';
// Every distractor has an explicit reason; never fabricate an incorrect concept by swapping labels.
function item(skill, passage, prompt, correct, wrong, explanation, extra={}) {
  if(wrong.length!==3||wrong.some(x=>!Array.isArray(x)||!x[0]||!x[1]))throw Error('Three reviewed distractors required: '+skill);
  return {skill,passage,prompt,correct,wrong:wrong.map(x=>x[0]),reasons:Object.fromEntries(wrong),explanation,...extra};
}
function number(skill, passage, prompt, answer, candidates, explanation, r, extra={}) {
  const scale=extra.scale||1,suffix=extra.suffix||'',format=n=>extra.den?`${n}/${extra.den}`:`${(n/scale).toFixed(extra.decimals||0)}${suffix}`;
  const unique=new Map();for(const [n,why] of candidates)if(Number.isFinite(n)&&n>=0&&n!==answer&&!unique.has(n))unique.set(n,why);
  // Balance above/below, including natural boundary cases. No fixed numerical rank for the correct answer.
  const reviewed=new Set(unique.keys());
  for(const d of r.shuffle([-10,-3,-2,-1,1,2,3,10]))if(answer+d>=0&&!unique.has(answer+d))unique.set(answer+d,`선택한 값 ${format(answer+d)}은 조건에 따라 구한 ${format(answer)}과 다릅니다. 계산 과정에서 수와 단위가 어떻게 쓰이는지 다음 풀이와 대조하세요.`);
  const entries=[...unique].filter(([n])=>n!==answer),prioritize=rows=>r.shuffle(rows).sort((a,b)=>Number(reviewed.has(b[0]))-Number(reviewed.has(a[0]))),lower=prioritize(entries.filter(([n])=>n<answer)),upper=prioritize(entries.filter(([n])=>n>answer));
  const rank=r.int(0,3),below=Math.max(0,Math.min(rank,lower.length,3));
  const takeBelow=Math.max(below,3-upper.length),selected=[...lower.slice(0,takeBelow),...upper.slice(0,3-takeBelow)];
  // Explain the selected result, then show the actual calculation. Do not claim
  // that a nearby numeric distractor proves a particular mental error.
  const wrong=selected.map(([n,why])=>[format(n),`${why}\n계산 확인: ${explanation}`]);
  return item(skill,passage,prompt,format(answer),wrong,explanation,{...extra,verification:{answer,scale,suffix,den:extra.den||null}});
}
module.exports={item,number};
