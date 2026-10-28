'use strict';
const {item}=require('./question');
// Each authored row has two independently true premises, a supported inference,
// and three explicitly reviewed misconceptions. Names/numbers are not randomized.
const banks=[require('./cases-science'),require('./cases-social'),require('./cases-korean'),require('./cases-math')];
const cases=Object.assign({},...banks);
function parse(unitId,rows){return rows.trim().split('\n').map((line,i)=>{
 const v=line.split('|').map(x=>x.trim());if(v.length!==7)throw Error(`Invalid case ${unitId}:${i}: ${v.length}`);
 const wrong=v.slice(4).map(x=>x.split('~').map(x=>x.trim()));
 if(wrong.some(x=>x.length!==2||!x[0]||!x[1]))throw Error(`Missing case rationale ${unitId}:${i}`);
 return {id:`${unitId}:material-${i+1}`,title:v[0],facts:v.slice(1,3),claim:v[3],wrong};
});}
const catalog=Object.fromEntries(Object.entries(cases).map(([id,rows])=>[id,parse(id,rows)]));
function generate(u,r,index,force=false){
 const rows=catalog[u.id];if(!rows)return null;
 // Small supplementary sets alternate with the existing curriculum tasks.
 // Larger sets receive four fifths of candidate draws. Retries may choose a
 // different source; a fixed slot must not force repeats while new cases remain.
 const cycle=rows.length>=6?5:2;if(!force&&r.int(0,cycle-1)===0)return null;
 const c=r.pick(rows),variant=r.int(0,3),passage=`${c.title}\n${c.facts.join('\n')}`;
 const extra={materialId:c.id,materialVariant:variant};
 if(variant===0)return item(`${u.id}:case-inference`,passage,'자료의 두 내용을 함께 고려한 설명으로 가장 알맞은 것은?',c.claim,c.wrong,`자료에서는 ‘${c.facts[0]}’와 ‘${c.facts[1]}’를 함께 확인할 수 있습니다. 따라서 ${c.claim}`,extra);
 const [mistake,reason]=c.wrong[variant-1];
 return item(`${u.id}:case-review`,passage,'자료를 근거로 판단할 때, 고쳐야 할 설명은?',mistake,[
  [c.claim,'두 내용을 함께 고려하면 자료가 뒷받침하는 설명입니다.'],
  ...c.facts.map(f=>[f,'자료에 직접 제시된 내용이므로 고쳐야 할 설명이 아닙니다.'])
 ],`‘${mistake}’는 고쳐야 합니다. ${reason} 자료의 조건과 확인한 범위를 구분해 읽어 보세요.`,extra);
}
module.exports={catalog,generate};
