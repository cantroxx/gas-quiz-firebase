'use strict';
const VERSION='popular-20261018-v2',ROUND_SIZE=20;
const CATEGORIES=[{id:'flag-country',title:'국기',icon:'🌏',description:'국기를 보고 나라 이름을 찾아요.'},
 {id:'idol',title:'아이돌',icon:'🎤',description:'개인 210명과 그룹 15팀을 만나 보세요.'},
 {id:'anime',title:'애니',icon:'🎬',description:'31개 작품의 캐릭터 326개를 알아봐요.'},
 {id:'tiniping',title:'티니핑',icon:'💖',description:'다양한 티니핑의 이름을 맞혀요.'},
 {id:'pokemon',title:'포켓몬',icon:'⚡',description:'세대별로 연습하고, 세대를 섞어 도전해요.'}];
const normalize=value=>String(value||'').normalize('NFKC').toLocaleLowerCase().replace(/[\s·・._\-]/g,'');
function generations(value,mode){
 if(!Array.isArray(value)||value.some(n=>!Number.isInteger(n)||n<1||n>9))throw Error('1~9세대 중에서 골라 주세요.');
 const result=[...new Set(value)].sort((a,b)=>a-b);
 if((mode==='practice'&&result.length!==1)||(mode==='ranking'&&result.length<3))throw Error(mode==='practice'?'연습할 세대를 하나 골라 주세요.':'랭킹전은 서로 다른 세대를 3개 이상 골라 주세요.');
 return result;
}
function shuffle(items,random=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function existingQuestion(row,category,generation){
 const answer=String(row.answerText||row.answer||'').trim(),imageUrl=String(row.imageUrl||'').trim();
 if(row.active===false||row.enabled===false||!answer||!/^https:\/\//.test(imageUrl))return null;
 const id=String(row.questionId||row.id||'').trim();if(!id)return null;
 return {id:`${category}:${generation||0}:${id}`,category,kind:'character',group:String(generation||category),generation:generation||0,
  prompt:category==='flag-country'?'이 국기는 어느 나라의 국기일까요?':'사진 속 캐릭터의 이름은?',answer,
  aliases:Array.isArray(row.aliases)?row.aliases:[],imageUrl,sourceUrl:String(row.imageSourceUrl||row.sourceUrl||'')};
}
function buildRound(category,pool,random=Math.random){
 const unique=[...new Map(pool.map(q=>[q.id,q])).values()];let picked=[];
 if(category==='idol'){
  for(const [kind,count]of [['person',15],['group',5]]){const part=shuffle(unique.filter(q=>q.kind===kind),random);if(part.length<count)throw Error('개인·그룹 문제를 충분히 준비하지 못했어요.');picked.push(...part.slice(0,count));}
 }else if(['pokemon','anime'].includes(category)){
  const groups=shuffle([...new Set(unique.map(q=>q.group))],random),decks=new Map(groups.map(g=>[g,shuffle(unique.filter(q=>q.group===g),random)]));
  // Each pass takes one from every selected generation/work. A generation
  // running out must never silently unbalance a ranked round.
  while(picked.length<ROUND_SIZE){let added=0;for(const g of groups){if(picked.length===ROUND_SIZE)break;const q=decks.get(g).shift();if(!q){if(category==='pokemon')throw Error('선택한 세대의 문제가 부족해요.');continue;}if(category==='anime'&&picked.filter(x=>x.group===g).length>=2)continue;picked.push(q);added++;}if(!added)break;}
 }else picked=shuffle(unique,random).slice(0,ROUND_SIZE);
 if(picked.length!==ROUND_SIZE)throw Error('20문제를 준비하지 못했어요. 다른 분야를 선택하거나 잠시 후 다시 시도해 주세요.');
 return shuffle(picked,random).map(q=>{
  const used=new Set([q.answer,...(q.aliases||[])].map(normalize)),wrong=[];
  for(const candidate of shuffle(unique.filter(x=>x.kind===q.kind&&x.id!==q.id),random)){
   const aliases=[candidate.answer,...(candidate.aliases||[])].map(normalize);if(aliases.some(a=>used.has(a)))continue;
   wrong.push(candidate.answer);aliases.forEach(a=>used.add(a));if(wrong.length===3)break;
  }
  if(wrong.length!==3)throw Error('서로 다른 보기 4개를 준비하지 못했어요.');
  const choices=shuffle([q.answer,...wrong],random);return {...q,choices,answerIndex:choices.indexOf(q.answer)};
 });
}
function publicQuestion(q){return {prompt:q.prompt,imageUrl:q.imageUrl,kind:q.kind,generation:q.generation||0,choices:q.choices};}
function conditionKey(category,gens=[]){return `${VERSION}:${category}:${gens.join('-')||'all'}`;}
function target(category,gens=[]){const title=CATEGORIES.find(c=>c.id===category)?.title||category;return {category:`인기 퀴즈 · ${title}`,categoryKey:`popular-v2-${category}`,subFilter:category==='pokemon'?gens.map(g=>`${g}세대`).join('·'):'전체',conditionKey:conditionKey(category,gens)};}
function better(next,old){return !old||next.score>old.score||(next.score===old.score&&next.elapsedSeconds<old.elapsedSeconds);}
function summaries(existingUser,existingKing,record,time){
 const user={...existingUser},king={...existingKing},key=record.categoryKey;
 const entry={score:record.score,elapsedSeconds:record.elapsedSeconds,elapsedText:record.elapsedText,recordId:record.recordId,category:record.category,subFilter:record.subFilter};
 const byMode={...(user.byMode||{})},normal={...(byMode.normal||{})},byCategory={...(normal.byCategory||{})};
 const bestScoresByMode={...(user.bestScoresByMode||{})},bestNormal={...(bestScoresByMode.normal||{})};
 if(better(record,byCategory[key])){byCategory[key]=entry;bestNormal[key]=entry;}
 normal.byCategory=byCategory;byMode.normal=normal;bestScoresByMode.normal=bestNormal;
 const categories=[...(king.categories||[])],i=categories.findIndex(c=>c.categoryKey===key);
 if(better(record,categories[i])){const item={...entry,categoryKey:key,quizId:record.quizId,rankingMode:'normal'};if(i<0)categories.push(item);else categories[i]=item;}
 const base={memberUserId:record.memberUserId,userId:record.memberUserId,displayName:record.displayName,hasUserId:true,updatedAt:time};
 return {user:{...user,...base,byMode,bestScoresByMode,totalRecordCount:(user.totalRecordCount||0)+1},
  king:{...king,...base,categories,categoryCount:categories.length,totalScore:categories.reduce((n,c)=>n+(Number(c.score)||0),0)}};
}
module.exports={VERSION,ROUND_SIZE,CATEGORIES,normalize,generations,shuffle,existingQuestion,buildRound,publicQuestion,conditionKey,target,better,summaries};
