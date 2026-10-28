const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const usecases = require('../../public/js/application/classroom-usecases.js');
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
function state() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../../public/js/features/classroom-state.js'), 'utf8'), context);
  return context.window.DJ48ClassroomState;
}

test('forced concurrent reads share a request; invalidated response cannot overwrite fresh cache or promise', async () => {
  const cache = state(), old = deferred(), fresh = deferred();
  let calls = 0;
  const deps = { ...cache, loadValue: () => (++calls === 1 ? old.promise : fresh.promise) };
  const a = usecases.loadClassroomCachedValue('wallet', { forceRefresh: true }, deps);
  const b = usecases.loadClassroomCachedValue('wallet', { forceRefresh: true }, deps);
  assert.equal(calls, 1);
  cache.resetClassroomDataCaches({ wallet: true });
  const c = usecases.loadClassroomCachedValue('wallet', { forceRefresh: true }, deps);
  const pending = cache.getLoadPromise('wallet');
  old.resolve({ point: 99 });
  await Promise.all([a, b]);
  assert.equal(cache.getValue('wallet'), null);
  assert.equal(cache.getLoadPromise('wallet'), pending);
  fresh.resolve({ point: 7 });
  await c;
  assert.equal(cache.getValue('wallet').point, 7);
  assert.equal(cache.getLoadPromise('wallet'), null);
});

test('settings reads share pending work and cannot refill cache after an account reset', async () => {
  const cache = state(), pending = deferred();
  let calls = 0;
  const deps = { ...cache, loadClassroomSettings: () => { calls++; return pending.promise; } };
  const first = usecases.loadClassroomSettingsWithCache({}, deps);
  const second = usecases.loadClassroomSettingsWithCache({ forceRefresh: true }, deps);
  assert.equal(calls, 1);
  cache.resetClassroomRuntimeData();
  pending.resolve({ classId: 'old' });
  await Promise.all([first, second]);
  assert.equal(cache.getValue('settings'), null);
});

test('completed sections publish before a slow economy response; failed wallet is never marked ready', async () => {
  const economy = deferred(), snapshots = [], seen = deferred();
  const task = usecases.getClassroomPrototypeViewData({}, {
    loadClassroomSettings: async () => ({}),
    loadClassroomQuestProgress: async () => ({}),
    loadClassroomReviewItems: async () => [],
    loadClassroomWallet: async () => ({ point: 0 }),
    loadClassroomGemProgress: async () => [],
    loadClassroomStudentCards: async () => [],
    loadClassroomEconomyBoard: () => economy.promise,
    hasLoadError: key => key === 'wallet',
    onPartialData(data, keys) { snapshots.push({ data, keys }); if(keys.includes('progress')) seen.resolve(); }
  });
  await seen.promise;
  assert(!snapshots.at(-1).keys.includes('economy'));
  assert(snapshots.every(row => !row.keys.includes('wallet') && !('wallet' in row.data)));
  economy.resolve({ classroomGems: [] });
  await task;
  assert.equal(snapshots[0].keys.length, 1, 'Published snapshots must not mutate later');
});

test('a session invalidated while settings load does not start dependent member reads', async () => {
  const settings = deferred();
  let current = true;
  const task = usecases.getClassroomPrototypeViewData({}, {
    loadClassroomSettings: () => settings.promise,
    isCurrent: () => current,
    loadClassroomWallet: () => assert.fail('Must not read a new member with old settings')
  });
  current = false; settings.resolve({ classId: 'old' });
  assert.equal(await task, null);
});
