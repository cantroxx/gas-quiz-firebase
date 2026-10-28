'use strict';
const {item}=require('./question');
const feedback=require('./learning-feedback');
const packs=Object.assign({},require('./learning-packs-korean'),require('./learning-packs-science'),require('./learning-packs-social'));
function questions(unitId){const p=packs[unitId];if(!p)return [];
 return p.questions.map(([difficulty,objective,prompt,correct,...tail],i)=>{
  const [a,b,c,explanation]=tail;
  const reasons=feedback[unitId]?.[i];if(!reasons||reasons.length!==3)throw Error('Missing pack feedback '+unitId+':'+i);
  return item(`${unitId}:learning-${i}`,`${p.title}\n${p.text}`,prompt,correct,[a,b,c].map((w,j)=>[w,reasons[j]]),explanation,{difficulty,objective:'unit-core-evidence',family:objective,materialId:unitId+':learning-pack',materialVariant:i});
 });
}
module.exports={packs,questions};
