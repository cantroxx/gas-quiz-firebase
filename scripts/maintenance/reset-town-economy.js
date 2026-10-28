#!/usr/bin/env node
'use strict';
// User-authorized 2026-10-18 reset. Default is read-only preparation.
// One atomic, version-conditional commit; restores only changed fields.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const lib = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth = require(lib + 'auth');
const {requireAuth} = require(lib + 'requireAuth');
const {Client} = require(lib + 'apiv2');
const project = 'dj48-quiztown-firebase';
const base = `projects/${project}/databases/(default)/documents`;
const directory = path.resolve(__dirname, '../../private/maintenance/hard-reset-20261018');
const resetId = 'town-economy-20261018';
const api = new Client({urlPrefix: 'https://firestore.googleapis.com', apiVersion: 'v1', auth: true});
const encode = value => typeof value === 'boolean' ? {booleanValue: value} : typeof value === 'number' ? {integerValue: String(value)} : Array.isArray(value) ? {arrayValue: {values: value.map(encode)}} : {stringValue: value};
const number = value => Number(value?.integerValue ?? value?.doubleValue ?? 0);
async function all(collection) {
  let token = ''; const rows = [];
  do {
    const response = (await api.get(`${base}/${collection}`, {queryParams: {pageSize: 1000, ...(token ? {pageToken: token} : {})}})).body;
    rows.push(...response.documents || []); token = response.nextPageToken || '';
  } while(token);
  return rows;
}
async function get(document) {
  const rows = (await api.post(base + ':batchGet', {documents: [base + '/' + document]})).body;
  return rows.find(row => row.found)?.found || {name: base + '/' + document, fields: {}};
}
async function securities() {
  const rows = (await api.post(base + ':runQuery', {structuredQuery: {from: [{collectionId: 'securitiesMarkets', allDescendants: true}], select: {fields: [{fieldPath: 'mode'}]}}})).body;
  const accounts = [];
  for(const row of rows.filter(row => row.document?.fields?.mode?.stringValue === 'coin')) {
    accounts.push(...await all(row.document.name.split('/documents/')[1] + '/accounts'));
  }
  // The audited production markets have zero accounts. Never silently ignore a new account.
  assert.equal(accounts.length, 0, 'New securities accounts appeared; refresh the reset plan to include their assets and ledger.');
  return rows.filter(row => row.document).length;
}
function update(row, values) {
  const fields = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, encode(value)]));
  return {update: {name: row.name, fields}, updateMask: {fieldPaths: Object.keys(fields)}, currentDocument: row.updateTime ? {updateTime: row.updateTime} : {exists: false}};
}
async function main() {
  assert(!process.env.FIRESTORE_EMULATOR_HOST, 'Production tool cannot run against an emulator.');
  await requireAuth({project, ...auth.getGlobalDefaultAccount()});
  const mode = process.argv[2] || '--prepare';
  if(mode === '--prepare') {
    const markets = await securities();
    const [economy, levels, coinCaps, xpCaps, progress, flags, notice] = await Promise.all([
      all('userEconomy'), all('userLevelSummary'), all('rewardDailyCaps'), all('levelXpCaps'), all('growthQuestProgress'), get('appSettings/featureFlags'), get('noticeBoard/current')
    ]);
    const date = new Date(Date.now() + 9 * 3600000), dateKey = date.toISOString().slice(0, 10);
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7)); const weekKey = date.toISOString().slice(0, 10);
    const entries = [];
    const add = (row, values) => entries.push({before: row, write: update(row, values)});
    for(const row of economy) add(row, {djCoin: 0, ...(row.fields?.coin ? {coin: 0} : {}), totalEarned: 0, totalSpent: 0, economyResetId: resetId});
    for(const row of levels) add(row, {level: 1, xp: 0, totalXp: 0, nextLevelXp: 50, maxLevel: 50, tier: 'bronze', medalId: 'bronze-01', rankIconUrl: '/images/level-ranks/bronze-rank.png', quizCorrectRewardCount: 0, economyResetId: resetId});
    for(const row of coinCaps.filter(row => row.name.split('/').at(-1).startsWith('practice_coin_daily__' + dateKey + '__'))) add(row, {usedCoin: 0, economyResetId: resetId});
    for(const row of xpCaps.filter(row => ['level_xp_weekly__' + weekKey + '__', 'today_quiz_xp_daily__' + dateKey + '__', 'practice_xp_daily__' + dateKey + '__'].some(prefix => row.name.split('/').at(-1).startsWith(prefix)))) add(row, {xp: 0, economyResetId: resetId});
    for(const row of progress.filter(row => row.name.endsWith('__daily__' + dateKey))) add(row, {earnedCoin: 0, earnedXp: 0, economyResetId: resetId});
    add(flags, {practiceRewardEnabled: true, practiceXpEnabled: true, todayQuizMode: 'manual', todayQuizIds: [], activeTodayQuizIds: [], todayQuizRandomPoolIds: [], todayQuizShuffleSeed: '', todayQuizShuffledAtIso: '', economyResetId: resetId});
    add(notice, {quest: '모든 퀴즈 연습전의 새 정답마다 DJ코인 1개와 XP 2를 받아요. 하루 최대 50코인·20 XP입니다.', recommendedQuizId: '', recommendedQuiz2Id: '', recommendedQuizLabel: '학교에서 원하는 과목을 골라 연습해요.', recommendedQuiz2Label: '', ...(String(notice.fields?.desc?.stringValue || '').includes('오늘의 퀴즈') ? {desc: '공지와 학습 안내를 확인할 수 있습니다.'} : {})});
    assert(entries.length <= 500, 'Reset exceeds one atomic batch; review required.');
    const summary = {economy: economy.length, positiveCoin: economy.filter(row => number(row.fields?.djCoin ?? row.fields?.coin) > 0).length, totalCoin: economy.reduce((sum, row) => sum + number(row.fields?.djCoin ?? row.fields?.coin), 0), levels: levels.length, totalXp: levels.reduce((sum, row) => sum + number(row.fields?.totalXp), 0), securitiesMarkets: markets, securitiesAccounts: 0, writes: entries.length};
    fs.mkdirSync(directory, {recursive: true, mode: 0o700});
    const backup = path.join(directory, `plan-${Date.now()}.json`);
    fs.writeFileSync(backup, JSON.stringify({project, resetId, createdAt: new Date().toISOString(), dateKey, summary, entries}, null, 2), {mode: 0o600, flag: 'wx'});
    console.log(JSON.stringify({mode: 'prepared', ...summary, backup}));
    return;
  }
  assert(['--commit', '--restore', '--verify'].includes(mode));
  const backup = path.resolve(process.argv[3]); assert.equal(path.dirname(backup), directory);
  const plan = JSON.parse(fs.readFileSync(backup)); assert.equal(plan.project, project); assert.equal(plan.resetId, resetId);
  if(mode === '--commit') {
    assert(Date.now() - Date.parse(plan.createdAt) < 15 * 60000, 'Prepare a fresh backup before committing.');
    await securities();
    // Reject new wallet/level documents as well as changes to any backed-up document.
    for(const collection of ['userEconomy', 'userLevelSummary']) {
      const current = await all(collection);
      const expected = plan.entries.filter(entry => entry.before.name.startsWith(base + '/' + collection + '/'));
      assert.deepEqual(current.map(row => row.name).sort(), expected.map(entry => entry.before.name).sort(), 'Target population changed.');
    }
    const receipt = (await api.post(base + ':commit', {writes: plan.entries.map(entry => entry.write)})).body;
    fs.writeFileSync(backup + '.receipt.json', JSON.stringify(receipt, null, 2), {mode: 0o600, flag: 'wx'});
    console.log(JSON.stringify({mode: 'committed', writes: receipt.writeResults.length, commitTime: receipt.commitTime}));
  } else if(mode === '--restore') {
    const receipt = JSON.parse(fs.readFileSync(backup + '.receipt.json'));
    const writes = plan.entries.map((entry, i) => ({update: {name: entry.before.name, fields: Object.fromEntries(entry.write.updateMask.fieldPaths.filter(key => entry.before.fields?.[key]).map(key => [key, entry.before.fields[key]]))}, updateMask: entry.write.updateMask, currentDocument: {updateTime: receipt.writeResults[i].updateTime}}));
    const response = (await api.post(base + ':commit', {writes})).body;
    console.log(JSON.stringify({mode: 'restored', writes: response.writeResults.length}));
  }
  const [economy, levels] = await Promise.all([all('userEconomy'), all('userLevelSummary')]);
  if(mode !== '--restore') {
    const checked = (await api.post(base + ':batchGet', {documents: plan.entries.map(entry => entry.before.name)})).body;
    const resetRows = new Map(checked.filter(row => row.found).map(row => [row.found.name, row.found]));
    for(const entry of plan.entries) {
      const actual = resetRows.get(entry.before.name);
      assert(actual, 'A reset document is missing.');
      for(const [key, value] of Object.entries(entry.write.update.fields)) {
        // Empty Firestore arrays may be serialized without a values member.
        if(value.arrayValue) assert.equal((actual.fields?.[key]?.arrayValue?.values || []).length, 0, 'Reset array changed.');
        else assert.deepEqual(actual.fields?.[key], value, 'A reset field changed; do not reset newly earned values automatically.');
      }
    }
    const byName = new Map([...economy, ...levels].map(row => [row.name, row]));
    for(const entry of plan.entries.filter(entry => byName.has(entry.before.name))) {
      const excluded = new Set(entry.write.updateMask.fieldPaths);
      const protectedFields = row => Object.fromEntries(Object.entries(row.fields || {}).filter(([key]) => !excluded.has(key)));
      assert.deepEqual(protectedFields(byName.get(entry.before.name)), protectedFields(entry.before), 'Non-reset fields changed; inspect before any further writes.');
    }
  }
  const remainingCoin = economy.reduce((sum, row) => sum + number(row.fields?.djCoin ?? row.fields?.coin), 0);
  const remainingXp = levels.reduce((sum, row) => sum + number(row.fields?.totalXp), 0);
  const nonInitialLevels = levels.filter(row => number(row.fields?.level) !== 1).length;
  console.log(JSON.stringify({mode: 'verification', economy: economy.length, levels: levels.length, remainingCoin, remainingXp, nonInitialLevels}));
  if(mode !== '--restore') {assert.equal(remainingCoin, 0); assert.equal(remainingXp, 0); assert.equal(nonInitialLevels, 0);}
}
module.exports = {update};
if(require.main === module) main().catch(error => {console.error(error.message); process.exitCode = 1;});
