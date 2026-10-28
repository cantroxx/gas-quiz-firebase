'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{test}=require('node:test');
const C=require('../../functions/subject-quiz/curriculum');
const w={};w.window=w;vm.createContext(w);
for(const file of ['data/quiz-catalog','data/subject-quiz-catalog','features/ranking-data','application/ranking-usecases'])vm.runInContext(fs.readFileSync('public/js/'+file+'.js','utf8'),w);
test('subject menus contain only generated semester/history/spelling entries',()=>{
 for(const subject of C.subjects){const ids=w.DJ48QuizCatalog.SUBJECT_CATALOG[subject.id].quizzes;for(const id of ids){const item=w.DJ48QuizCatalog.QUIZ_CATALOG[id];assert.match(item.standalonePath,/^\/subject-quiz\//);assert.equal(item.modes.length,0);}}
 assert.equal(w.DJ48QuizCatalog.SUBJECT_CATALOG.popular.quizzes.length,8);
 assert.equal(w.DJ48SubjectQuiz.targetForQuiz('spelling'),'/subject-quiz/?subject=korean&group=spelling');
 assert.equal(w.DJ48SubjectQuiz.targetForQuiz('generated-math-4-2'),'/subject-quiz/?subject=math&group=4-2');
 assert.equal(w.DJ48SubjectQuiz.targetForQuiz('pokemon'),null);
});
test('subject boards discard old mode/unit groups and show cumulative subject totals',()=>{
 const rows=[{subject:'korean',cumulative:true,score:59,memberUserId:'a'},{subject:'korean',cumulative:true,score:60,memberUserId:'b'},{quizId:'spelling',categoryKey:'맞춤법',score:999,memberUserId:'c'}];
 const boards=w.DJ48RankingData.getRankingBoardModels([],rows,[],{}),board=boards.find(b=>b.id==='korean');
 assert.equal('groups' in board,false);assert.deepEqual(Array.from(board.rows,r=>r.score),[60,59]);assert.equal(board.score(board.rows[0]),'60점');
 for(const id of ['social','math','science'])assert.equal(boards.find(b=>b.id===id).rows.length,0);
});
test('quiz king uses the new projection and never revives archived subject scores through a legacy fallback',async()=>{
 let legacySummaryRead=false;
 const model=await w.DJ48RankingUsecases.loadRankingPlazaData({boardId:'quizKing'}, {
  getRankingRepository:()=>({loadSubjectRankingSnapshot:async()=>({summaries:[{memberUserId:'a',totalScore:159}],records:[{memberUserId:'a',subject:'korean',cumulative:true,score:59,categoryKey:'subject-korean'}]}),loadQuizKingSummaries:async()=>{legacySummaryRead=true;return[{totalScore:999}];},loadLimitedRankingRecordsForPlaza:async()=>[{memberUserId:'a',quizId:'spelling',score:999}],loadMemberProfilesForRankingRows:async()=>({})}),
  getRankingBoardModels:(summaries,records)=>[{id:'quizKing',summaries,records}],getTopQuizKingSummaries:rows=>rows,
  buildQuizKingCard:row=>row,buildRankingRecordCard:()=>({}),buildQuizKingSummariesFromRankingRecords:()=>{throw Error('unexpected legacy fallback');}
 });
 assert.equal(legacySummaryRead,false);assert.equal(model.boards[0].summaries[0].totalScore,159);assert.equal(model.boards[0].records.length,1);assert.equal(model.boards[0].records[0].score,59);
});
