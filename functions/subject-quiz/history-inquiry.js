'use strict';
const {item}=require('./question');
const data=require('./history-inquiry-data');
const catalog=Object.fromEntries(Object.entries(data).map(([id,text])=>[id,text.trim().split('\n').map((line,i)=>{
 const p=line.split('|');if(p.length!==7)throw Error('Invalid history inquiry '+id+':'+i);
 const wrong=p.slice(4).map(s=>s.split('~'));if(wrong.some(x=>x.length!==2))throw Error('Missing history reasoning');
 return {topic:p[0],facts:p.slice(1,3),claim:p[3],wrong};
})]));
function questions(u){return (catalog[u.id]||[]).flatMap((c,i)=>{
 const passage=`${c.topic}\n資料Ａ：${c.facts[0]}\n資料Ｂ：${c.facts[1]}\n※ 역사 내용을 학생용으로 풀어 쓴 요약이며 실제 사료의 인용문이 아닙니다.`.replaceAll('資料Ａ：','자료 가: ').replaceAll('資料Ｂ：','자료 나: ');
 const extra={objective:'history-topic-'+i,contentTopics:['history:'+c.topic],materialId:u.id+':inquiry-'+i};
 const make=(type,prompt,correct,wrong,level,why)=>item(`${u.id}:inquiry-${type}`,passage,prompt,correct,wrong,why,{...extra,family:'inquiry-'+type,difficulty:level});
 const out=[make('relation','두 자료의 관계를 빠뜨리지 않고 해석한 것은?',c.claim,c.wrong,2,`${c.facts.join(' ')} 따라서 ${c.claim}`)];
 // Two distinct mistakes in the actual historical situation, not permutations
 // of unrelated events. The third reason remains a plausible but off-target correction.
 for(const index of [i%3,(i+1)%3]){const [mistake,why]=c.wrong[index];
  // Other valid corrections can ALSO rebut the target (e.g. law versus actual
  // enforcement). Distractors must be false claims, not true off-topic reasons.
  out.push(make('critique',`학생은 “${mistake}”라고 정리했습니다. 자료를 바탕으로 이 해석을 검토한 설명 중 알맞은 것은?`,why,[...c.wrong.filter((_,j)=>index!==j),[`이 요약의 주제가 ‘${c.topic}’이므로 제시된 해석도 자료에 맞는 설명이다.`,`주제가 같아도 두 사실 사이의 관계를 잘못 연결할 수 있습니다. ${why}`]],3,`${why} 확인할 자료: ${c.facts.join(' ')}`));
 }
 return out;
});}
module.exports={questions,catalog};
