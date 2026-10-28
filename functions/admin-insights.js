'use strict';
const achievements = require('./achievements/catalog');
const curriculum = require('./subject-quiz/curriculum');
const popular = require('./popular-quiz/domain');
function memberProgress(data = {}) {
  const current = data.version === achievements.VERSION ? data : {areas:{}};
  return {version:achievements.VERSION, records:achievements.areas.map(area => {
    const answered = Number(current.areas?.[area.id]?.answered || 0);
    const perfectRuns = Number(current.areas?.[area.id]?.perfectRuns || 0);
    const next = kind => achievements.titles.find(t => t.area === area.id && t.kind === kind && t.threshold > (kind === 'practice' ? answered : perfectRuns));
    return {...area, answered, perfectRuns, nextPractice:next('practice') || null, nextRanking:next('ranking') || null, subject:!!achievements.subjects[area.id]};
  })};
}
async function bounded(query, limit = 1000) {
  try {
    const snap = await query.limit(limit + 1).get();
    return {docs:snap.docs.slice(0,limit), status:snap.size > limit ? 'partial' : 'complete'};
  } catch (_) { return {docs:[], status:'failed'}; }
}
async function currentAudit(db) {
  const sources = await Promise.all([
    ...curriculum.subjects.map(async subject => ({name:subject.title, kind:'subject', subject:subject.id, ...await bounded(db.collection('subjectQuizRankings').doc(curriculum.VERSION).collection(subject.id))})),
    (async () => ({name:'인기퀴즈',kind:'popular',...await bounded(db.collection('rankingRecords').where('sourceSheet','==','popular-quiz-server'))}))()
  ]);
  const users = await bounded(db.collection('users'),2000);
  const memberIds = new Set(users.docs.map(doc=>doc.id));
  const rows = sources.flatMap(source => source.docs.map(doc => ({...doc.data(),source:source.name, kind:source.kind, memberUserId:source.kind==='subject'?doc.id:doc.data().memberUserId, recordId:doc.id}))
    .filter(row => source.kind==='subject' || row.rulesVersion===popular.VERSION));
  const issues = rows.filter(row => !row.memberUserId || !Number.isFinite(Number(row.kind==='subject'?row.totalScore:row.score)) || Number(row.kind==='subject'?row.totalScore:row.score)<0)
    .map(row=>({recordId:row.recordId,source:row.source,reason:'회원 ID 또는 점수를 확인하세요.'}));
  if(users.status==='complete') for(const row of rows) if(row.memberUserId&&!memberIds.has(row.memberUserId)) issues.push({recordId:row.recordId,source:row.source,reason:'연결된 회원 문서가 없습니다.'});
  return {scope:'current',checkedAt:Date.now(),complete:users.status==='complete' && sources.every(s=>s.status==='complete'),
    sources:[{name:'회원 연결 기준',status:users.status,count:users.status==='failed'?null:users.docs.length},...sources.map(s=>({name:s.name,status:s.status,count:s.status==='failed'?null:s.docs.filter(d=>s.kind==='subject'||d.data().rulesVersion===popular.VERSION).length}))],
    recordCount:rows.length,issues:issues.slice(0,50),issueCount:issues.length,
    note:'현행 과목 누적 순위와 현행 버전 인기퀴즈 기록의 회원 연결·점수를 확인합니다. 회원 목록이 일부 조회되거나 실패하면 연결 누락 판정을 보류합니다. 무제한 인기퀴즈에 과거 20분/1,000점 기준을 적용하지 않습니다. 구 퀴즈왕 요약은 현재 점검 대상이 아닙니다.'};
}
module.exports = {memberProgress,bounded,currentAudit};
