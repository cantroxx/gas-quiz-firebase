'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
assert(process.env.FIRESTORE_EMULATOR_HOST, 'Emulator required; never use production.');
process.env.GCLOUD_PROJECT = 'demo-hard-reset';
process.env.GOOGLE_CLOUD_PROJECT = 'demo-hard-reset';
const source = process.env.HARD_RESET_FUNCTIONS_ROOT || path.resolve(__dirname, '../../functions');
const functions = require(source + '/index');
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
  const ids = Array.from({length: 55}, (_, i) => 'q' + i);
  await db.doc('practiceRecords/' + recordId).set({memberUserId: member, correctIds: ids});
  const answer = questionId => call('grantPracticeReward', {memberUserId: member, recordId, questionId, quizId: 'not-a-today-quiz'});
  const results = await Promise.all([answer('q0'), answer('q0')]);
  assert.equal(results.filter(result => result.duplicate).length, 1);
  assert.equal(results.reduce((sum, result) => sum + result.rewardCoin, 0), 1);
  assert.equal(results.reduce((sum, result) => sum + result.xpDelta, 0), 2);
  for(let i = 1; i < 51; i++) await answer('q' + i);
  assert.equal((await db.doc('userEconomy/' + member).get()).data().djCoin, 50);
  assert.equal((await db.doc('userEconomy/' + member).get()).data().housingCoupons, 3);
  assert.equal((await db.doc('userLevelSummary/' + member).get()).data().totalXp, 20);
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
  await db.doc('appSettings/featureFlags').set({practiceRewardEnabled: false, practiceXpEnabled: false}, {merge: true});
  const disabled = await answer('q53'); assert.equal(disabled.rewardCoin, 0); assert.equal(disabled.xpDelta, 0);
  // Use the production reset writer against emulator REST: masks preserve possessions,
  // and a stale version aborts the entire batch, including unchanged companion rows.
  const {update} = require('../../scripts/maintenance/reset-town-economy');
  const rest = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/demo-hard-reset/databases/(default)/documents`;
  await db.doc('resetFixture/a').set({djCoin: 80, housingCoupons: 7});
  await db.doc('resetFixture/b').set({djCoin: 90, housingCoupons: 8});
  const a = await (await fetch(rest + '/resetFixture/a')).json();
  const b = await (await fetch(rest + '/resetFixture/b')).json();
  await db.doc('resetFixture/a').update({djCoin: 81});
  let response = await fetch(rest + ':commit', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({writes: [update(a, {djCoin: 0}), update(b, {djCoin: 0})]})});
  assert(!response.ok, 'Concurrent change must reject the whole reset.');
  assert.equal((await db.doc('resetFixture/b').get()).data().djCoin, 90);
  const fresh = await (await fetch(rest + '/resetFixture/a')).json();
  response = await fetch(rest + ':commit', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({writes: [update(fresh, {djCoin: 0}), update(b, {djCoin: 0})]})});
  assert(response.ok);
  assert.deepEqual((await db.doc('resetFixture/a').get()).data(), {djCoin: 0, housingCoupons: 7});
  assert.deepEqual((await db.doc('resetFixture/b').get()).data(), {djCoin: 0, housingCoupons: 8});
  console.log('PASS hard reset: non-featured and generated practice +1 coin/+2 XP, concurrent deduplication, caps, authorization, switches, preserved coupons, retired season/today claims and listings.');
}
main().catch(error => {console.error(error); process.exitCode = 1;}).finally(() => Promise.all(getApps().map(deleteApp)));
