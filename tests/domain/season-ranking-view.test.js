const assert = require('node:assert/strict');
global.window = {};
require('../../public/js/features/ranking-data');
const { buildSeasonRankingGroups } = window.DJ48RankingData;
const records = [
  { recordId: 'old', categoryKey: 'reading', score: 100, recordedAt: '2026-08-31T14:59:59Z' },
  { recordId: 'current', categoryKey: 'reading', score: 10, recordedAt: '2026-09-01T00:00:00Z' },
  { recordId: 'next', categoryKey: 'reading', score: 90, recordedAt: '2026-09-30T15:00:00Z' }
];
const event = { eventId: 'reading', active: true, periodType: 'monthly', quizIds: ['gmo'], periodStartDate: '2026-09-01', periodEndDate: '2026-09-30' };
const deps = {
  rankingQuizIdCategoryMap: { gmo: 'reading' },
  getRankingRecordTimeValue: row => Date.parse(row.recordedAt),
  getTopRankingRecordsByCategoryKeys: (rows, keys) => rows.filter(row => keys.includes(row.categoryKey)).sort((a, b) => b.score - a.score)
};
const [group] = buildSeasonRankingGroups(records, [event], deps);
assert.deepEqual(group.rows.map(row => row.recordId), ['current']);
assert.deepEqual(group.sourceRows.map(row => row.recordId), ['current']);
assert.deepEqual(buildSeasonRankingGroups(records, [{ ...event, active: false }], deps), []);
const [next] = buildSeasonRankingGroups(records, [{ ...event, periodStartDate: '2026-10-01', periodEndDate: '2026-10-31' }], deps);
assert.deepEqual(next.rows.map(row => row.recordId), ['next']);
assert.equal(records.length, 3);
console.log('Season ranking view: previous/next month excluded, inactive hidden, next month switch and source records preserved.');

const integrated=buildSeasonRankingGroups([], [{eventId:'mixed',active:true,title:'혼합 시즌',goals:[{kind:'studyCorrect'},{kind:'practiceCorrect'}],quizIds:[],leaderboard:[{nickname:'가',completedGoals:2},{nickname:'나',completedGoals:2},{nickname:'다',completedGoals:1}]}],deps)[0];
assert.equal(integrated.label,'혼합 시즌');assert.equal(integrated.rank(integrated.rows[1]),1);assert.equal(integrated.rank(integrated.rows[2]),3);assert.equal(integrated.score(integrated.rows[0]),'2/2개 달성');
