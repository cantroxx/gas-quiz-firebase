const assert = require('node:assert/strict');
const usecases = require('../../public/js/application/classroom-usecases.js');

async function testSettingsUseCache() {
  let loadCount = 0;
  const settings = await usecases.loadClassroomSettingsWithCache({
    prototype: { classId: 'c1' }
  }, {
    getValue: key => key === 'settings' ? { classId: 'cached' } : null,
    setValue: (key, value) => value,
    loadClassroomSettings: async () => {
      loadCount += 1;
      return { classId: 'loaded' };
    }
  });

  assert.deepEqual(settings, { classId: 'cached' });
  assert.equal(loadCount, 0);
}

async function testSettingsForceRefresh() {
  const settings = await usecases.loadClassroomSettingsWithCache({
    forceRefresh: true,
    prototype: { classId: 'c1' }
  }, {
    getValue: () => ({ classId: 'cached' }),
    setValue: (key, value) => ({ ...value, cachedKey: key }),
    loadClassroomSettings: async options => ({ classId: options.prototype.classId })
  });

  assert.deepEqual(settings, { classId: 'c1', cachedKey: 'settings' });
}

async function testCachedValueUsesActivePromise() {
  let loadCount = 0;
  const activePromise = Promise.resolve(['active']);
  const value = await usecases.loadClassroomCachedValue('wallet', {}, {
    getValue: () => null,
    getLoadPromise: () => activePromise,
    setValue: (key, nextValue) => nextValue,
    setLoadPromise: () => {},
    loadValue: async () => {
      loadCount += 1;
      return ['loaded'];
    }
  });

  assert.deepEqual(value, ['active']);
  assert.equal(loadCount, 0);
}

async function testCachedValueLoadsAndClearsPromise() {
  const promiseStates = [];
  const value = await usecases.loadClassroomCachedValue('wallet', {
    memberUserId: 'member-a'
  }, {
    getValue: () => null,
    getLoadPromise: () => null,
    setValue: (key, nextValue) => ({ key, nextValue }),
    setLoadPromise: (key, nextValue) => {
      promiseStates.push([key, nextValue]);
    },
    loadValue: async options => ({ berry: 7, memberUserId: options.memberUserId })
  });

  assert.deepEqual(value, { key: 'wallet', nextValue: { berry: 7, memberUserId: 'member-a' } });
  assert.equal(promiseStates[0][0], 'wallet');
  assert.equal(typeof promiseStates[0][1]?.then, 'function');
  assert.deepEqual(promiseStates[1], ['wallet', null]);
}

async function testPrototypeViewDataComposesLoaders() {
  const calls = [];
  const data = await usecases.getClassroomPrototypeViewData({
    forceRefresh: true
  }, {
    loadClassroomSettings: async forceRefresh => {
      calls.push(['settings', forceRefresh]);
      return { classId: 'c1' };
    },
    loadClassroomQuestProgress: async forceRefresh => {
      calls.push(['progress', forceRefresh]);
      return { q1: { rewardStatus: 'approved' } };
    },
    loadClassroomReviewItems: async (settings, forceRefresh) => {
      calls.push(['review', settings.classId, forceRefresh]);
      return [{ recordId: 'r1' }];
    },
    loadClassroomWallet: async (settings, forceRefresh) => {
      calls.push(['wallet', settings.classId, forceRefresh]);
      return { berry: 5 };
    },
    loadClassroomGemProgress: async (settings, forceRefresh) => {
      calls.push(['gems', settings.classId, forceRefresh]);
      return [{ gemId: 'g1' }];
    },
    loadClassroomStudentCards: async (settings, forceRefresh) => {
      calls.push(['students', settings.classId, forceRefresh]);
      return [{ memberUserId: 'member-a' }];
    },
    loadClassroomEconomyBoard: async (settings, forceRefresh) => {
      calls.push(['economy', settings.classId, forceRefresh]);
      return { jobs: [] };
    }
  });

  assert.deepEqual(data, {
    settings: { classId: 'c1' },
    progressMap: { q1: { rewardStatus: 'approved' } },
    reviewItems: [{ recordId: 'r1' }],
    wallet: { berry: 5 },
    gemProgress: [{ gemId: 'g1' }],
    studentCards: [{ memberUserId: 'member-a' }],
    economyBoard: { jobs: [] }
  });
  assert.deepEqual(calls[0], ['settings', true]);
  assert.equal(calls.length, 7);
}

(async () => {
  await testSettingsUseCache();
  await testSettingsForceRefresh();
  await testCachedValueUsesActivePromise();
  await testCachedValueLoadsAndClearsPromise();
  await testPrototypeViewDataComposesLoaders();
})();
