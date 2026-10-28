(function(root){
 'use strict';
 const ids=['flag-country','idol','anime','tiniping','pokemon'];
 function isQuiz(id){return ids.includes(id)||/^pokemon-(gen[1-9]|easy|normal|hard|very-hard)$/.test(String(id));}
 function targetForQuiz(id,mode){
  if(!isQuiz(id))return null;const generation=String(id).match(/^pokemon-gen([1-9])$/),category=String(id).startsWith('pokemon-')?'pokemon':id;
  const params=new URLSearchParams({category});if(['practice','ranking'].includes(mode))params.set('mode',mode);if(generation)params.set('generation',generation[1]);
  return '/popular-quiz/?'+params.toString();
 }
 const catalog=root.DJ48QuizCatalog;
 if(catalog){
  const quizzes=catalog.QUIZ_CATALOG,subject=catalog.SUBJECT_CATALOG.popular;
  for(const id of ['emoji','emoji-kpop','emoji-anime','emoji-tiniping','snack-food','dad-joke']) quizzes[id].enabled=false;
  subject.quizzes=[...ids];subject.desc='좋아하는 사진 분야를 고르고 연습전과 랭킹전에 도전해요.';subject.cardDesc='국기·아이돌·애니·티니핑·포켓몬, 다섯 분야의 사진 퀴즈입니다.';subject.board='사진 속 정답을 찾아요';
  const descriptions={idol:'개인 210명과 그룹 15팀을 섞어 맞혀요.',anime:'31개 작품의 캐릭터 326개를 골고루 만나요.',pokemon:'세대별로 연습하고, 3개 이상 세대를 골라 랭킹에 도전해요.'};
  for(const id of ids){quizzes[id].modes=['practice','ranking'];quizzes[id].standalonePath=targetForQuiz(id);if(descriptions[id])quizzes[id].desc=descriptions[id];quizzes[id].summary='한 판 20문제 · 시간 제한 없음 · 좋아하는 분야를 자유롭게 연습';}
 }
 root.DJ48PopularQuiz={ids,isQuiz,targetForQuiz,rankingKeys:ids.map(id=>'popular-v2-'+id)};
})(typeof window!=='undefined'?window:globalThis);
