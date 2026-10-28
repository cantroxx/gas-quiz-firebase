'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
assert.match(process.env.FIRESTORE_EMULATOR_HOST || '', /^127\.0\.0\.1:\d+$/);
process.env.GCLOUD_PROJECT = 'demo-dj48-rules';
process.env.GOOGLE_CLOUD_PROJECT = 'demo-dj48-rules';
const source = process.env.HARD_RESET_FUNCTIONS_ROOT || path.resolve(__dirname, '../../functions');
const functions = {...require(source + '/index')};
if (process.env.TODAY_CLEANUP_STAGE) {
  for (const name of ['subjectQuizAction', 'grantPracticeReward', 'getDailyRewardStatus', 'ingestPracticeGrowth']) {
    functions[name] = require(process.env.TODAY_CLEANUP_STAGE + '/' + name + '/release/functions/index')[name];
  }
}
const load = require('node:module').createRequire(source + '/package.json');
const {getFirestore} = load('firebase-admin/firestore');
const {getApps, deleteApp} = load('firebase-admin/app');
const db = getFirestore();
async function main() {
  const uid = 'reset-test-auth', member = 'G4-C8-N97', recordId = member + '__hard-reset';
  const call = (name, data, user = uid) => functions[name].run({auth: {uid: user}, data});
  const date = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  await db.doc('authLinks/' + uid).set({memberUserId: member, authUid: uid});
  await db.doc('users/' + member).set({authUid: uid, status: 'active', active: true, role: 'student', grade: '4', classNumber: '8'});
  await db.doc('userEconomy/' + member).set({djCoin: 0, totalEarned: 0, housingCoupons: 3});
  await db.doc('userLevelSummary/' + member).set({level: 1, totalXp: 0, xp: 0});
  await db.doc('appSettings/featureFlags').set({practiceRewardEnabled: true, practiceXpEnabled: true, todayQuizIds: [], todayQuizRandomPoolIds: [], eventPlazaEnabled: true});
  const legacy = db.doc('eventQuestProgress/cleanup-preserved');
  await legacy.set({current: 7, memberUserId: member});
  const legacyBefore = await legacy.get();
  const wallet = db.doc('classrooms/G4-C8/studentWallets/' + member);
  await wallet.set({point: 100, totalEarnedPoint: 100, pointBoostAmount: 0.5});
  const checkpoints = [];
  async function checkpoint(label) {
    const money = (await db.doc('userEconomy/' + member).get()).data();
    const level = (await db.doc('userLevelSummary/' + member).get()).data();
    const points = (await wallet.get()).data();
    const caps = await db.collection('levelXpCaps').get();
    checkpoints.push({label, coin: money.djCoin, xp: level.totalXp, point: points.point, totalEarnedPoint: points.totalEarnedPoint, caps: caps.docs.map(d => ({id: d.id, xp: d.data().xp})).sort((a,b) => a.id.localeCompare(b.id))});
  }
  const ids = Array.from({length: 55}, (_, i) => 'q' + i);
  await db.doc('practiceRecords/' + recordId).set({memberUserId: member, correctIds: ids});
  const answer = questionId => call('grantPracticeReward', {memberUserId: member, recordId, questionId, quizId: 'fraction-basic'});
  const results = await Promise.all([answer('q0'), answer('q0')]);
  assert.equal(results.filter(result => result.duplicate).length, 1);
  assert.equal(results.reduce((sum, result) => sum + result.rewardCoin, 0), 1);
  assert.equal(results.reduce((sum, result) => sum + result.xpDelta, 0), 2);
  assert.equal((await wallet.get()).data().point, 101.5);
  await checkpoint('concurrent-first');
  for(let i = 1; i < 51; i++) await answer('q' + i);
  assert.equal((await db.doc('userEconomy/' + member).get()).data().djCoin, 50);
  assert.equal((await db.doc('userEconomy/' + member).get()).data().housingCoupons, 3);
  assert.equal((await db.doc('userLevelSummary/' + member).get()).data().totalXp, 20);
  assert.equal((await wallet.get()).data().point, 115, 'existing mirror applies on the ten XP-paying answers');
  await checkpoint('daily-caps');
  const status = await call('getDailyRewardStatus', {memberUserId: member});
  assert.equal(status.coin.remaining, 0); assert.equal(status.practiceXp.remaining, 0);
  assert.equal(status.todayQuizXp, undefined);
  await assert.rejects(answer('unrecorded'), error => error.code === 'failed-precondition');
  await assert.rejects(call('grantPracticeReward', {memberUserId: member, recordId, questionId: 'q52'}, 'other-user'), error => error.code === 'permission-denied');
  for(const questId of ['v2_daily_today', 'v2_season_practice', 'season3_old_practiceCorrect']) {
    await assert.rejects(call('claimEventQuestReward', {memberUserId: member, questId}), error => error.code === 'failed-precondition');
  }
  assert.deepEqual((await call('getPublicSeasonEvents', {})).seasonEvents.items, []);
  const progress = await call('getEventProgress', {memberUserId: member});
  assert.deepEqual(progress.seasonEvents, []); assert.deepEqual(progress.legacyQuests, []);
  assert(!progress.quests.some(quest => quest.scope === 'season' || quest.questId === 'v2_daily_today'));
  // Generated subject practice follows the same XP and coin path without any daily featured quiz.
  await db.doc('rewardDailyCaps/practice_coin_daily__' + date + '__' + member).set({usedCoin: 0});
  await db.doc('levelXpCaps/practice_xp_daily__' + date + '__' + member).set({xp: 0});
  let run = await call('subjectQuizAction', {action: 'start', unitId: 'math:4-1:3', mode: 'practice', requestId: crypto.randomUUID()});
  await new Promise(resolve => setTimeout(resolve, 350));
  const question = (await db.doc('subjectQuizRuns/' + run.runId).get()).data().question;
  const payload = {action: 'answer', runId: run.runId, seq: run.seq, choice: question.answer};
  run = await call('subjectQuizAction', payload);
  assert.equal(run.feedback.rewardCoin, 1); assert.equal(run.feedback.xpDelta, 2);
  assert.equal((await call('subjectQuizAction', payload)).duplicate, true);
  if (process.env.CLEANUP_EXPECT_LEGACY !== '1') assert.equal((await db.doc('dailyUsage/' + member + '__' + date).get()).exists, false, 'generated answers must not create legacy usage');
  await db.doc('appSettings/featureFlags').set({practiceRewardEnabled: false, practiceXpEnabled: false}, {merge: true});
  const disabled = await answer('q53'); assert.equal(disabled.rewardCoin, 0); assert.equal(disabled.xpDelta, 0);
  assert.equal((await wallet.get()).data().point, 116.5);
  await checkpoint('subject-duplicate-disabled');
  const logs = await db.collection('rewardLogs').where('memberUserId', '==', member).get();
  const practiceLogs = logs.docs.filter(doc => doc.data().type === 'practice_correct');
  assert(practiceLogs.length >= 51);
  for (const doc of practiceLogs) {
    const event = {params: {id: doc.id}, data: doc};
    await functions.ingestPracticeGrowth.run(event);
    await functions.ingestPracticeGrowth.run(event);
  }
  const progressAfter = await call('getEventProgress', {memberUserId: member});
  assert(progressAfter.quests.find(q => q.questId === 'v2_daily_practice').claimable);
  const daily = (await db.doc('growthQuestProgress/' + member + '__v3_daily__' + date).get()).data();
  assert.equal(daily.counts.practiceCorrect, practiceLogs.length, 'trigger retries must not double progress');
  const claim = await call('claimEventQuestReward', {memberUserId: member, questId: 'v2_daily_practice'});
  assert.equal(claim.rewardCoin, 5); assert.equal(claim.xpDelta, 10);
  assert((await call('claimEventQuestReward', {memberUserId: member, questId: 'v2_daily_practice'})).duplicate);
  const start = await call('startRankingQuestSession', {memberUserId: member, quizId: 'spelling'});
  await db.doc('rankingRecords/cleanup-ranking').set({memberUserId: member, userId: member, quizId: 'spelling', score: 20, elapsedSeconds: 20, recordedAt: new Date()});
  await db.doc('rankingQuestSessions/' + member).update({issuedAt: Date.now() - 20000});
  const finish = {memberUserId: member, quizId: 'spelling', recordId: 'cleanup-ranking', sessionId: start.sessionId};
  assert.equal((await call('grantRankingCompleteXp', finish)).duplicate, false);
  assert.equal((await call('grantRankingCompleteXp', finish)).duplicate, true);
  const activities = await db.collection('growthActivities').get();
  for (const doc of activities.docs) {
    await functions.ingestGrowthActivity.run({params: {id: doc.id}, data: doc});
    await functions.ingestGrowthActivity.run({params: {id: doc.id}, data: doc});
  }
  const ranked = await call('getEventProgress', {memberUserId: member});
  assert(ranked.quests.find(q => q.questId === 'v2_daily_ranking').claimable);
  const legacyAfter = await legacy.get();
  assert(legacyAfter.updateTime.isEqual(legacyBefore.updateTime), 'legacy document must not be written');
  const legacyCount = (await db.collection('eventQuestProgress').get()).size;
  if (process.env.CLEANUP_EXPECT_LEGACY === '1') assert(legacyCount > 1, 'baseline must exercise old writes');
  else assert.equal(legacyCount, 1, 'no new legacy progress documents');
  await checkpoint('growth-claim-ranking');
  const weekly = (await db.collection('levelXpCaps').get()).docs.find(doc => doc.id.startsWith('level_xp_weekly__') && doc.id.endsWith('__' + member));
  assert(weekly);
  await weekly.ref.update({xp: 499});
  await db.doc('appSettings/featureFlags').set({practiceRewardEnabled: true, practiceXpEnabled: true}, {merge: true});
  const partial = await answer('q54'); assert.equal(partial.rewardCoin, 1); assert.equal(partial.xpDelta, 1);
  assert((await answer('q54')).duplicate);
  const capped = await answer('q52'); assert.equal(capped.rewardCoin, 1); assert.equal(capped.xpDelta, 0);
  assert.equal((await weekly.ref.get()).data().xp, 500);
  assert.equal((await wallet.get()).data().point, 118);
  await checkpoint('weekly-cap-partial-and-full');
  if (process.env.CLEANUP_EXPECT_LEGACY !== '1') assert.equal((await db.collection('eventQuestProgress').get()).size, 1);

  if (process.env.CLEANUP_COMPARE_OUTPUT) require('node:fs').writeFileSync(process.env.CLEANUP_COMPARE_OUTPUT, JSON.stringify(checkpoints, null, 2) + '\n');
  console.log('PASS cleanup (' + (process.env.CLEANUP_EXPECT_LEGACY === '1' ? 'baseline legacy writes observed' : 'legacy writes absent') + '): practice/subject coins, XP, caps, concurrent dedup, flags, authorization, growth trigger replay and claims, ranking completion preserved.');
}
main().catch(error => {console.error(error); process.exitCode = 1;}).finally(() => Promise.all(getApps().map(deleteApp)));
