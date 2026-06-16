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

async function testTeacherFormFlowValidatesValues() {
  const calls = [];
  const result = await usecases.saveClassroomTeacherFormFlow({
    messages: { permission: '권한 없음' }
  }, {
    loadClassroomSettings: async () => ({ classId: 'c1' }),
    isCurrentClassroomTeacher: () => true,
    getValues: () => ({ title: '' }),
    validateValues: values => values.title ? '' : '이름 필요',
    setStatus: (...args) => calls.push(['status', ...args]),
    save: async () => calls.push(['save'])
  });

  assert.deepEqual(result, { skipped: true, reason: 'validation-failed' });
  assert.deepEqual(calls, [['status', '이름 필요', true]]);
}

async function testTeacherFormFlowSavesAndRerenders() {
  const calls = [];
  const result = await usecases.saveClassroomTeacherFormFlow({
    messages: { pending: '저장 중', success: '완료' },
    resetCaches: { economy: true }
  }, {
    loadClassroomSettings: async () => ({ classId: 'c1' }),
    isCurrentClassroomTeacher: () => true,
    getValues: () => ({ title: '직업' }),
    validateValues: () => '',
    setStatus: (...args) => calls.push(['status', ...args]),
    save: async payload => {
      calls.push(['save', payload]);
      return { ok: true };
    },
    resetCaches: options => calls.push(['reset-caches', options]),
    resetForm: () => calls.push(['reset-form']),
    renderClassroom: async forceRefresh => calls.push(['render', forceRefresh])
  });

  assert.deepEqual(result, { result: { ok: true }, error: null });
  assert.deepEqual(calls, [
    ['status', '저장 중'],
    ['save', { classId: 'c1', values: { title: '직업' } }],
    ['reset-caches', { economy: true }],
    ['reset-form'],
    ['status', '완료'],
    ['render', true]
  ]);
}

async function testEconomyActionFlow() {
  const calls = [];
  const result = await usecases.callClassroomEconomyActionFlow({
    functionName: 'applyClassroomJob',
    payload: { jobId: 'job-1' },
    memberUserId: 'member-a'
  }, {
    loadClassroomSettings: async () => ({ classId: 'c1' }),
    callAction: async (functionName, payload, options) => {
      calls.push(['call', functionName, payload, options]);
      return { success: true };
    },
    resetCaches: options => calls.push(['reset', options]),
    renderClassroom: async forceRefresh => calls.push(['render', forceRefresh])
  });

  assert.deepEqual(result, { success: true });
  assert.deepEqual(calls, [
    ['call', 'applyClassroomJob', { jobId: 'job-1' }, { classId: 'c1', memberUserId: 'member-a' }],
    ['reset', { economy: true, wallet: true }],
    ['render', true]
  ]);
}

async function testRoutineFlowValidatesMemberAndDates() {
  const calls = [];
  const result = await usecases.saveClassroomRoutineFlow({
    memberUserId: ''
  }, {
    setStatus: (...args) => calls.push(args),
    getValues: () => ({})
  });

  assert.deepEqual(result, { skipped: true, reason: 'member-required' });
  assert.deepEqual(calls, [['회원 연결 후 성장루틴을 만들 수 있습니다.', true]]);
}

async function testCompleteQuestAutoFlow() {
  const calls = [];
  const result = await usecases.completeClassroomCheckQuestFlow({
    questId: 'q1',
    memberUserId: 'member-a'
  }, {
    loadClassroomSettings: async () => ({ classId: 'c1', quests: [] }),
    findClassroomQuest: () => ({ id: 'q1', saveEnabled: true, rewardMode: 'auto', rewardCoin: 3, rewardCurrency: 'berry' }),
    completeAutoQuest: async options => {
      calls.push(['complete', options]);
      return { rewardAmount: 3, rewardCurrency: 'berry' };
    },
    resetClassroomCaches: options => calls.push(['reset-classroom', options]),
    resetUserEconomyCache: () => calls.push(['reset-economy']),
    renderClassroom: async forceRefresh => calls.push(['render', forceRefresh]),
    getClassroomRewardCurrencyLabel: () => '베리',
    alert: message => calls.push(['alert', message])
  });

  assert.equal(result.error, null);
  assert.deepEqual(calls, [
    ['complete', { memberUserId: 'member-a', classId: 'c1', questId: 'q1' }],
    ['reset-classroom', { progress: true, wallet: true, gems: true }],
    ['reset-economy'],
    ['render', true],
    ['alert', '3 베리를 받았어요.']
  ]);
}

async function testReviewFlowRequiresTeacher() {
  const calls = [];
  const result = await usecases.reviewClassroomQuestProgressFlow({
    recordId: 'r1',
    nextStatus: 'approved'
  }, {
    loadClassroomSettings: async () => ({ classId: 'c1' }),
    isCurrentClassroomTeacher: () => false,
    alert: message => calls.push(message)
  });

  assert.deepEqual(result, { skipped: true, reason: 'permission-denied' });
  assert.deepEqual(calls, ['담임 권한이 있어야 처리할 수 있어요.']);
}

(async () => {
  await testSettingsUseCache();
  await testSettingsForceRefresh();
  await testCachedValueUsesActivePromise();
  await testCachedValueLoadsAndClearsPromise();
  await testPrototypeViewDataComposesLoaders();
  await testTeacherFormFlowValidatesValues();
  await testTeacherFormFlowSavesAndRerenders();
  await testEconomyActionFlow();
  await testRoutineFlowValidatesMemberAndDates();
  await testCompleteQuestAutoFlow();
  await testReviewFlowRequiresTeacher();
})();
