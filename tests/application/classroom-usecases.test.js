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
    loadValue: async options => ({ point: 7, memberUserId: options.memberUserId })
  });

  assert.deepEqual(value, { key: 'wallet', nextValue: { point: 7, memberUserId: 'member-a' } });
  assert.equal(promiseStates[0][0], 'wallet');
  assert.equal(typeof promiseStates[0][1]?.then, 'function');
  assert.deepEqual(promiseStates[1], ['wallet', null]);
}

async function testRepositoryCachedValueRoutesToRepositoryLoader() {
  const calls = [];
  const value = await usecases.loadClassroomRepositoryCachedValue('students', {
    settings: { classId: 'c1' },
    forceRefresh: true
  }, {
    getValue: key => {
      calls.push(['get-value', key]);
      return null;
    },
    setValue: (key, nextValue) => {
      calls.push(['set-value', key, nextValue.length]);
      return nextValue;
    },
    getLoadPromise: key => {
      calls.push(['get-promise', key]);
      return null;
    },
    setLoadPromise: (key, nextValue) => calls.push(['set-promise', key, nextValue === null ? 'clear' : 'pending']),
    getCurrentMemberUserId: () => 'member-a',
    getRepository: () => ({
      loadClassroomStudentCards: async options => {
        calls.push(['repo', options.settings.classId, options.memberUserId, options.forceRefresh]);
        return [{ memberUserId: options.memberUserId }];
      }
    })
  });

  assert.deepEqual(value, [{ memberUserId: 'member-a' }]);
  assert.deepEqual(calls, [
    ['get-value', 'students'],
    ['get-promise', 'students'],
    ['repo', 'c1', 'member-a', true],
    ['set-promise', 'students', 'pending'],
    ['set-value', 'students', 1],
    ['set-promise', 'students', 'clear']
  ]);
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
      return { point: 5 };
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
    wallet: { point: 5 },
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

async function testRunClassroomEconomyAction() {
  const button = { disabled: false, textContent: '지원' };
  const calls = [];
  const result = await usecases.runClassroomEconomyAction('applyClassroomJob', {
    value: 'job-1',
    button
  }, {
    getCurrentMemberUserId: () => 'member-a',
    loadClassroomSettings: async () => ({ classId: 'c1' }),
    callAction: async (functionName, payload, options) => {
      calls.push(['call', functionName, payload, options, button.disabled, button.textContent]);
      return { success: true, duplicate: false };
    },
    resetCaches: options => calls.push(['reset', options]),
    renderClassroom: async forceRefresh => calls.push(['render', forceRefresh]),
    containsElement: () => true,
    alert: message => calls.push(['alert', message])
  });

  assert.deepEqual(result, { success: true, duplicate: false });
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, '지원');
  assert.deepEqual(calls, [
    ['call', 'applyClassroomJob', { jobId: 'job-1' }, { classId: 'c1', memberUserId: 'member-a' }, true, '지원 중...'],
    ['reset', { economy: true, wallet: true }],
    ['render', true],
    ['alert', '직업 지원이 저장됐습니다.']
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

async function testVerifyClassroomEntryFlow() {
  const emptyCalls = [];
  const emptyResult = await usecases.verifyClassroomEntryFlow({
    entryCode: '',
    memberUserId: 'member-1'
  }, {
    setStatus: (...args) => emptyCalls.push(args)
  });
  assert.deepEqual(emptyResult, { skipped: true, reason: 'entry-code-required' });
  assert.deepEqual(emptyCalls, [['교실 비밀번호를 입력해 주세요.', true]]);

  const memberCalls = [];
  const memberResult = await usecases.verifyClassroomEntryFlow({
    entryCode: '1234',
    memberUserId: ''
  }, {
    setStatus: (...args) => memberCalls.push(args)
  });
  assert.deepEqual(memberResult, { skipped: true, reason: 'member-required' });
  assert.deepEqual(memberCalls, [['회원 연결 후 교실에 입장할 수 있습니다.', true]]);

  const calls = [];
  const result = await usecases.verifyClassroomEntryFlow({
    entryCode: '1234',
    memberUserId: 'member-1'
  }, {
    loadClassroomSettings: async forceRefresh => {
      calls.push(['settings', forceRefresh]);
      return { classId: 'c1', name: '우리 교실' };
    },
    verifyEntryCode: async options => {
      calls.push(['verify', options.classId, options.memberUserId, options.entryCode]);
      return { success: true };
    },
    setStatus: (...args) => calls.push(['status', ...args]),
    clearEntryCode: () => calls.push(['clear']),
    setUnlocked: unlocked => calls.push(['unlocked', unlocked]),
    getSuccessMessage: settings => `${settings.name} 입장`
  });

  assert.deepEqual(result.result, { success: true });
  assert.deepEqual(calls, [
    ['settings', true],
    ['status', '교실 비밀번호를 확인하는 중입니다.'],
    ['verify', 'c1', 'member-1', '1234'],
    ['status', '우리 교실 입장'],
    ['clear'],
    ['unlocked', true]
  ]);
}

async function testCompleteQuestAutoFlow() {
  const calls = [];
  const result = await usecases.completeClassroomCheckQuestFlow({
    questId: 'q1',
    memberUserId: 'member-a'
  }, {
    loadClassroomSettings: async () => ({ classId: 'c1', quests: [] }),
    findClassroomQuest: () => ({ id: 'q1', saveEnabled: true, rewardMode: 'auto', rewardCoin: 3, rewardCurrency: 'point' }),
    completeAutoQuest: async options => {
      calls.push(['complete', options]);
      return { rewardAmount: 3, rewardCurrency: 'point' };
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
    ['render', true]
  ]);
}

async function testCompleteCurrentMemberQuestControlsButton() {
  const button = { disabled: false, textContent: '완료' };
  const calls = [];
  const result = await usecases.completeCurrentMemberClassroomQuestFlow({
    questId: 'q1'
  }, {
    loadClassroomSettings: async () => ({ classId: 'c1', quests: [] }),
    findClassroomQuest: () => ({ id: 'q1', saveEnabled: true, rewardMode: 'manual', studentAction: '확인 요청' }),
    getCurrentMemberUserId: () => 'member-a',
    getQuestActionButton: questId => {
      calls.push(['button', questId]);
      return button;
    },
    saveManualQuestProgress: async options => {
      calls.push(['save', options.questId, options.memberUserId, button.disabled, button.textContent]);
      return { recordId: 'r1' };
    },
    resetClassroomCaches: options => calls.push(['reset', options]),
    renderClassroom: async forceRefresh => calls.push(['render', forceRefresh])
  });

  assert.equal(result.error, null);
  assert.equal(button.disabled, true);
  assert.equal(button.textContent, '저장 중...');
  assert.deepEqual(calls, [
    ['button', 'q1'],
    ['save', 'q1', 'member-a', true, '저장 중...'],
    ['reset', { progress: true }],
    ['render', true]
  ]);
}

async function testReviewWithButtonsFlow() {
  const buttons = [{ disabled: false, textContent: '승인' }, { disabled: false, textContent: '반려' }];
  const calls = [];
  const result = await usecases.reviewClassroomQuestProgressWithButtonsFlow({
    recordId: 'r1',
    nextStatus: 'approved'
  }, {
    getReviewButtons: recordId => {
      calls.push(['buttons', recordId]);
      return buttons;
    },
    loadClassroomSettings: async () => ({ classId: 'c1' }),
    isCurrentClassroomTeacher: () => true,
    reviewProgress: async options => {
      calls.push(['review', options.recordId, options.nextStatus, buttons[0].disabled, buttons[0].textContent]);
      return { duplicate: false, rewardAmount: 2, rewardCurrency: 'point' };
    },
    resetClassroomCaches: options => calls.push(['reset', options]),
    resetUserEconomyCache: () => calls.push(['reset-economy']),
    renderClassroom: async forceRefresh => calls.push(['render', forceRefresh]),
    isAdminClassroomSectionActive: () => false,
    getClassroomRewardCurrencyLabel: () => '베리',
    alert: message => calls.push(['alert', message])
  });

  assert.equal(result.error, null);
  assert.equal(buttons[0].disabled, true);
  assert.equal(buttons[0].textContent, '승인 중...');
  assert.equal(buttons[1].textContent, '승인 중...');
  assert.deepEqual(calls.map(call => call[0]), ['buttons', 'review', 'reset', 'reset-economy', 'render', 'alert']);
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
  await testRepositoryCachedValueRoutesToRepositoryLoader();
  await testPrototypeViewDataComposesLoaders();
  await testTeacherFormFlowValidatesValues();
  await testTeacherFormFlowSavesAndRerenders();
  await testEconomyActionFlow();
  await testRunClassroomEconomyAction();
  await testRoutineFlowValidatesMemberAndDates();
  await testVerifyClassroomEntryFlow();
  await testCompleteQuestAutoFlow();
  await testCompleteCurrentMemberQuestControlsButton();
  await testReviewWithButtonsFlow();
  await testReviewFlowRequiresTeacher();
})();
