'use strict';
// Only these legacy Firestore banks supply the current popular quiz service.
const CURRENT_BANK_IDS=Object.freeze(['flag-country','tiniping',...Array.from({length:9},(_,i)=>`pokemon-gen${i+1}`)]);
const QUESTION_LIMIT=1200;
function selectScope(payload={},ErrorType=Error) {
  const fail=()=>{const error=new ErrorType('invalid-argument','점검 범위와 퀴즈 ID를 확인해 주세요. 보관 문제는 한 번에 5개까지 점검합니다.');error.code='invalid-argument';throw error;};
  if(!payload||typeof payload!=='object'||Array.isArray(payload))fail();
  const scope=payload.scope||'current';
  if(scope==='current'){
    if(payload.quizIds!==undefined)fail();
    return {scope,quizIds:[...CURRENT_BANK_IDS]};
  }
  if(scope!=='archive'||!Array.isArray(payload.quizIds)||!payload.quizIds.length||payload.quizIds.length>5)fail();
  if(payload.quizIds.some(id=>typeof id!=='string'||!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(id)))fail();
  return {scope,quizIds:[...new Set(payload.quizIds)]};
}
async function loadScope(db,selection) {
  const entries=[];
  // Bound concurrent reads as well as total scope. A failed bank is not empty.
  for(let start=0;start<selection.quizIds.length;start+=3){
    entries.push(...await Promise.all(selection.quizIds.slice(start,start+3).map(async quizId=>{
      const [metadata,questions]=await Promise.allSettled([
        db.collection('quizzes').doc(quizId).get(),
        db.collection('quizQuestions').doc(quizId).collection('questions').limit(QUESTION_LIMIT+1).get()
      ]);
      const issues=[];
      if(metadata.status==='rejected')issues.push({quizId,reason:'퀴즈 정보 읽기 실패'});
      else if(!metadata.value.exists)issues.push({quizId,reason:'퀴즈 정보 문서 없음'});
      if(questions.status==='rejected')issues.push({quizId,reason:'문항 읽기 실패'});
      const docs=questions.status==='fulfilled'?questions.value.docs:[];
      if(docs.length>QUESTION_LIMIT)issues.push({quizId,reason:`${QUESTION_LIMIT}문항까지만 검사함`});
      return {quiz:{...(metadata.status==='fulfilled'?metadata.value.data()||{}:{}),quizId},
        questions:docs.slice(0,QUESTION_LIMIT),issues};
    })));
  }
  return {entries,readIssues:entries.flatMap(e=>e.issues)};
}
module.exports={CURRENT_BANK_IDS,QUESTION_LIMIT,selectScope,loadScope};
