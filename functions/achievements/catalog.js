'use strict';
const VERSION='achievements-20261019-v1';
const subjects={korean:'국어',math:'수학',social:'사회',science:'과학'};
const popular={
 'flag-country':['국기','세계 탐험가','세계 외교관','세계 대사'],
 idol:['아이돌','신입 팬','응원단장','명예 프로듀서'],
 anime:['애니','캐릭터 탐험가','애니 연구가','애니 감독'],
 tiniping:['티니핑','요정 친구','요정 수호자','요정 왕'],
 ...Object.fromEntries(Array.from({length:9},(_,i)=>[`pokemon-gen${i+1}`,[`포켓몬 ${i+1}세대`,`${i+1}세대 트레이너`,`${i+1}세대 관장`,`${i+1}세대 챔피언`]]))
};
const areas=[...Object.entries(subjects).map(([id,label])=>({id,label,group:id})),...Object.entries(popular).map(([id,[label]])=>({id,label,group:id.startsWith('pokemon')?'pokemon':'people'}))];
const titles=[];
function add(area,kind,threshold,name,tier){const titleId=`a26_${area}_${kind}_${threshold}`;titles.push({titleId,titleName:name,version:VERSION,area,kind,threshold,tier,order:titles.length+1,active:true,subjectGroup:subjects[area]?area:'popular',category:area.startsWith('pokemon')?'포켓몬':subjects[area]||'인기',conditionText:kind==='practice'?`연습 ${threshold}번 답하기 · ${threshold/100}회 완주 (정오답 모두 인정)`:`랭킹전 20연속 정답을 달성한 판 ${threshold}회 · 한 판 최대 1회`,imageUrl:`/images/titles-2026/${titleId}.svg`});}
for(const [area,label] of Object.entries(subjects)){
 [100,300,500].forEach((n,i)=>add(area,'practice',n,`${label} ${['초보','중수','고수'][i]}`,i+1));
 [10,20,30].forEach((n,i)=>add(area,'ranking',n,`${label} ${['달인','마스터','신'][i]}`,i+4));
}
for(const [area,[, ...names]] of Object.entries(popular))[100,200,300].forEach((n,i)=>add(area,'practice',n,names[i],i+1));
function eligible(progress={}){return titles.filter(t=>Number(progress.areas?.[t.area]?.[t.kind==='practice'?'answered':'perfectRuns']||0)>=t.threshold);}
module.exports={VERSION,subjects,popular,areas,titles,eligible};
