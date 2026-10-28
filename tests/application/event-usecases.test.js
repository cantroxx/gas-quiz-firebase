const assert = require('node:assert/strict');
const usecases = require('../../public/js/application/event-usecases.js');

async function testLoadUsesCache() {
  let loadCount = 0;
  const progress = await usecases.loadEventProgressWithCache({
    memberUserId: 'member-a'
  }, {
    getEventProgress: () => ({ quests: [{ questId: 'cached' }] }),
    getEventProgressLoadPromise: () => null,
    setEventProgress: value => value,
    setEventProgressLoadPromise: () => {},
    loadEventProgress: async () => {
      loadCount += 1;
      return { quests: [{ questId: 'loaded' }] };
    }
  });

  assert.deepEqual(progress, { quests: [{ questId: 'cached' }] });
  assert.equal(loadCount, 0);
}

async function testLoadSetsAndClearsPromise() {
  const promiseStates = [];
  let savedProgress = null;
  const progress = await usecases.loadEventProgressWithCache({
    memberUserId: 'member-a',
    forceRefresh: true
  }, {
    getEventProgress: () => ({ quests: [{ questId: 'cached' }] }),
    getEventProgressLoadPromise: () => null,
    setEventProgress: value => {
      savedProgress = value;
      return value;
    },
    setEventProgressLoadPromise: value => {
      promiseStates.push(value);
    },
    loadEventProgress: async options => ({ memberUserId: options.memberUserId, quests: [] })
  });

  assert.deepEqual(progress, { memberUserId: 'member-a', quests: [] });
  assert.deepEqual(savedProgress, progress);
  assert.equal(typeof promiseStates[0]?.then, 'function');
  assert.equal(promiseStates[1], null);
}

async function testViewDataFallsBackOnError() {
  const fallback = { quests: [{ questId: 'fallback' }], classMissions: [], seasonEvents: [] };
  const result = await usecases.getEventProgressViewData({
    memberUserId: 'member-a',
    fallback
  }, {
    getEventProgress: () => null,
    getEventProgressLoadPromise: () => null,
    setEventProgress: value => value,
    setEventProgressLoadPromise: () => {},
    loadEventProgress: async () => {
      throw new Error('network');
    },
    getEventProgressRenderData: progress => progress,
    warn: () => {}
  });

  assert.equal(result.usedFallback, true);
  assert.deepEqual(result.data, fallback);
  assert.equal(result.error.message, 'network');
}

async function testClaimRewardFlowResetsAndRerenders() {
  const calls = [];
  const result = await usecases.claimEventQuestRewardFlow({
    memberUserId: 'member-a',
    questId: 'quest-a'
  }, {
    claimEventQuestReward: async options => {
      calls.push(['claim', options]);
      return { rewardCoin: 5, duplicate: false, rewardLogPath: 'logs/a' };
    },
    resetUserEconomyCache: () => calls.push(['reset-economy']),
    resetEventProgressCache: () => calls.push(['reset-event']),
    debugLog: (...args) => calls.push(['debug', args]),
    renderEventProgress: async forceRefresh => calls.push(['render', forceRefresh])
  });

  assert.deepEqual(result.result, { rewardCoin: 5, duplicate: false, rewardLogPath: 'logs/a' });
  assert.equal(result.error, null);
  assert.deepEqual(calls.map(call => call[0]), ['claim', 'reset-economy', 'reset-event', 'debug', 'render']);
  assert.deepEqual(calls[0][1], { memberUserId: 'member-a', questId: 'quest-a' });
  assert.equal(calls[4][1], true);
}

async function testClaimRewardFlowReportsError() {
  const calls = [];
  const result = await usecases.claimEventQuestRewardFlow({
    memberUserId: 'member-a',
    questId: 'quest-a'
  }, {
    claimEventQuestReward: async () => {
      throw new Error('member-required');
    },
    warn: () => calls.push(['warn']),
    alert: message => calls.push(['alert', message]),
    getEventRewardClaimErrorMessage: error => `message:${error.message}`,
    renderEventProgress: async forceRefresh => calls.push(['render', forceRefresh])
  });

  assert.equal(result.result, null);
  assert.equal(result.error.message, 'member-required');
  assert.deepEqual(calls, [['warn'], ['alert', 'message:member-required'], ['render', true]]);
}

async function testClaimCurrentMemberRewardFlowControlsButton() {
  const button = { disabled: false, textContent: '받기' };
  const calls = [];
  const result = await usecases.claimCurrentMemberEventQuestRewardFlow({
    questId: 'quest-a'
  }, {
    getCurrentMemberUserId: () => 'member-a',
    getClaimButton: questId => {
      calls.push(['button', questId]);
      return button;
    },
    containsElement: () => true,
    claimEventQuestReward: async options => {
      calls.push(['claim', options, button.disabled, button.textContent]);
      return { rewardCoin: 5 };
    },
    resetUserEconomyCache: () => calls.push(['reset-economy']),
    resetEventProgressCache: () => calls.push(['reset-event']),
    renderEventProgress: async forceRefresh => calls.push(['render', forceRefresh])
  });

  assert.deepEqual(result.result, { rewardCoin: 5 });
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, '받기');
  assert.deepEqual(calls, [
    ['button', 'quest-a'],
    ['claim', { memberUserId: 'member-a', questId: 'quest-a' }, true, '수령 중...'],
    ['reset-economy'],
    ['reset-event'],
    ['render', true]
  ]);
}

async function testScopedCacheAndRaces() {
  const vm = require('node:vm');
  const fs = require('node:fs');
  let member = 'a', now = Date.parse('2026-09-16T12:00:00Z');
  class Clock extends Date { static now() { return now; } }
  const context = { window: { DJ48AccountState: { getCurrentMemberUserId: () => member } }, Date: Clock };
  vm.runInNewContext(fs.readFileSync(require.resolve('../../public/js/features/event-state.js'), 'utf8'), context);
  const state = context.window.DJ48EventState;
  const deferred = [];
  const deps = { ...state, loadEventProgress: () => new Promise(resolve => deferred.push(resolve)) };
  const first = usecases.loadEventProgressWithCache({ memberUserId: member }, deps);
  const second = usecases.loadEventProgressWithCache({ memberUserId: member, forceRefresh: true }, deps);
  assert.equal(deferred.length, 1, 'Concurrent forced reads are coalesced');
  deferred[0]({ memberUserId: 'a', quests: [] });
  await Promise.all([first, second]);
  assert.equal(state.getEventProgress().memberUserId, 'a');
  now += 60001;
  assert.equal(state.getEventProgress(), null);
  assert.equal(state.peekEventProgress().memberUserId, 'a', 'Expired rows remain available while refreshing');
  const obsolete = usecases.loadEventProgressWithCache({ memberUserId: member }, deps);
  member = 'b';
  assert.equal(state.peekEventProgress(), null, 'Different member cannot see cached data');
  const current = usecases.loadEventProgressWithCache({ memberUserId: member }, deps);
  deferred[1]({ memberUserId: 'a' }); await obsolete;
  assert(state.getEventProgressLoadPromise(), 'Obsolete completion cannot clear current request');
  deferred[2]({ memberUserId: 'b' }); await current;
  assert.equal(state.getEventProgress().memberUserId, 'b');
  now = Date.parse('2026-09-16T15:00:01Z');
  assert.equal(state.peekEventProgress(), null, 'KST midnight expires even stale display');
  const old = usecases.loadEventProgressWithCache({ memberUserId: member }, deps);
  state.resetEventProgressCache();
  deferred[3]({ memberUserId: 'b' }); await old;
  assert.equal(state.peekEventProgress(), null, 'Reward/quiz invalidation cannot be undone by late reads');
}

(async () => {
  await testLoadUsesCache();
  await testLoadSetsAndClearsPromise();
  await testViewDataFallsBackOnError();
  await testClaimRewardFlowResetsAndRerenders();
  await testClaimRewardFlowReportsError();
  await testClaimCurrentMemberRewardFlowControlsButton();
  await testScopedCacheAndRaces();
  console.log('Event cache tests passed: TTL, KST day, member scope, concurrent refresh and invalidation races.');
})();
