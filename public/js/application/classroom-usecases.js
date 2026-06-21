(function (root, factory) {
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.DJ48ClassroomUsecases = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  async function loadClassroomSettingsWithCache(options = {}, deps = {}) {
    const forceRefresh = options.forceRefresh === true;
    const cachedSettings = deps.getValue?.('settings');
    if(cachedSettings && !forceRefresh) return cachedSettings;

    const settings = await deps.loadClassroomSettings({
      prototype: options.prototype
    });
    return deps.setValue?.('settings', settings) || settings;
  }

  async function loadClassroomCachedValue(key, options = {}, deps = {}) {
    const forceRefresh = options.forceRefresh === true;
    const cachedValue = deps.getValue?.(key);
    if(cachedValue && !forceRefresh) return cachedValue;

    const activeLoadPromise = deps.getLoadPromise?.(key);
    if(activeLoadPromise && !forceRefresh) return activeLoadPromise;

    const loadPromise = deps.loadValue(options)
      .then(value => deps.setValue?.(key, value) || value)
      .finally(() => {
        deps.setLoadPromise?.(key, null);
      });

    deps.setLoadPromise?.(key, loadPromise);
    return loadPromise;
  }

  async function loadClassroomRepositoryCachedValue(key, options = {}, deps = {}) {
    const loaderNames = {
      progress: 'loadClassroomQuestProgress',
      wallet: 'loadClassroomWallet',
      gems: 'loadClassroomGemProgress',
      students: 'loadClassroomStudentCards',
      economy: 'loadClassroomEconomyBoard',
      review: 'loadClassroomReviewItems'
    };
    const loaderName = loaderNames[key];
    const repository = deps.getRepository?.();
    const loader = repository?.[loaderName];
    if(typeof loader !== 'function') throw new Error(`unknown-classroom-cache:${key}`);

    return loadClassroomCachedValue(key, {
      ...options,
      memberUserId: deps.getCurrentMemberUserId?.()
    }, {
      getValue: deps.getValue,
      setValue: deps.setValue,
      getLoadPromise: deps.getLoadPromise,
      setLoadPromise: deps.setLoadPromise,
      loadValue: payload => loader.call(repository, payload)
    });
  }

  async function getClassroomReviewViewData(options = {}, deps = {}) {
    const settings = await deps.loadClassroomSettings(options.forceRefresh === true);
    const reviewItems = await deps.loadClassroomReviewItems(settings, options.forceRefresh === true);
    return { settings, reviewItems };
  }

  async function getClassroomPrototypeViewData(options = {}, deps = {}) {
    const settings = await deps.loadClassroomSettings(options.forceRefresh === true);
    const [
      progressMap,
      reviewItems,
      wallet,
      gemProgress,
      studentCards,
      economyBoard
    ] = await Promise.all([
      deps.loadClassroomQuestProgress(options.forceRefresh === true),
      deps.loadClassroomReviewItems(settings, options.forceRefresh === true),
      deps.loadClassroomWallet(settings, options.forceRefresh === true),
      deps.loadClassroomGemProgress(settings, options.forceRefresh === true),
      deps.loadClassroomStudentCards(settings, options.forceRefresh === true),
      deps.loadClassroomEconomyBoard(settings, options.forceRefresh === true)
    ]);

    return {
      settings,
      progressMap,
      reviewItems,
      wallet,
      gemProgress,
      studentCards,
      economyBoard
    };
  }

  function getClassroomTeacherGuardResult(settings = {}, deps = {}) {
    return deps.isCurrentClassroomTeacher?.(settings) === true
      ? { ok: true, message: '' }
      : { ok: false, message: '담임 권한이 있어야 처리할 수 있습니다.' };
  }

  async function saveClassroomTeacherFormFlow(options = {}, deps = {}) {
    const settings = await deps.loadClassroomSettings();
    const teacherGuard = getClassroomTeacherGuardResult(settings, deps);
    if(!teacherGuard.ok) {
      deps.setStatus?.(options.messages?.permission || teacherGuard.message, true);
      return { skipped: true, reason: 'permission-denied' };
    }

    const values = deps.getValues();
    const validationMessage = deps.validateValues?.(values) || '';
    if(validationMessage) {
      deps.setStatus?.(validationMessage, true);
      return { skipped: true, reason: 'validation-failed' };
    }

    deps.setStatus?.(options.messages?.pending || '저장하는 중입니다.');
    try {
      const result = await deps.save({ classId: settings.classId, values });
      deps.resetCaches?.(options.resetCaches || {});
      deps.resetForm?.();
      deps.setStatus?.(options.messages?.success || '저장했습니다.');
      await deps.renderClassroom?.(true);
      return { result: result || {}, error: null };
    } catch(error) {
      deps.warn?.(options.messages?.warn || 'Classroom teacher form save failed.', error);
      deps.setStatus?.(
        options.errorMessages?.[error.message] || options.messages?.error || '저장 중 문제가 생겼습니다.',
        true
      );
      return { result: null, error };
    }
  }

  async function awardClassroomBadgeCampaignFlow(options = {}, deps = {}) {
    return saveClassroomTeacherFormFlow({
      messages: {
        permission: '담임 권한이 있어야 뱃지를 지급할 수 있습니다.',
        pending: '젬 기록을 스캔하는 중입니다.',
        warn: 'Classroom badge campaign award failed.',
        error: '뱃지 지급 중 문제가 생겼습니다.'
      },
      errorMessages: {
        'classroom-badge-functions-unavailable': '뱃지 지급 기능을 불러오지 못했습니다.'
      },
      resetCaches: { students: true }
    }, {
      ...deps,
      validateValues: values => {
        if(!values.title) return '뱃지 이름을 입력해 주세요.';
        if(!values.targetGemId) return '기준 젬을 입력해 주세요.';
        return '';
      },
      save: async payload => {
        const result = await deps.save(payload);
        await deps.renderClassroom?.(true);
        const winnerText = Array.isArray(result?.winners) && result.winners.length
          ? `${result.winners.length}명에게 뱃지를 지급했습니다.`
          : '지급 대상이 없습니다.';
        deps.setStatus?.(winnerText, !result?.winners?.length);
        return result;
      },
      resetForm: null,
      renderClassroom: null,
      setStatus: deps.setStatus
    });
  }

  async function callClassroomEconomyActionFlow(options = {}, deps = {}) {
    const settings = await deps.loadClassroomSettings();
    if(!options.memberUserId) {
      deps.alert?.('교실 기능을 불러오지 못했어요.');
      return null;
    }

    try {
      const result = await deps.callAction(options.functionName, options.payload || {}, {
        classId: settings.classId,
        memberUserId: options.memberUserId
      });
      deps.resetCaches?.({ economy: true, wallet: true });
      await deps.renderClassroom?.(true);
      return result || {};
    } catch(error) {
      deps.warn?.(`Classroom economy action failed: ${options.functionName}`, error);
      deps.alert?.('교실 작업 처리 중 문제가 생겼어요.');
      await deps.renderClassroom?.(true);
      return null;
    }
  }

  function getClassroomEconomySuccessMessage(functionName, result = {}) {
    if(functionName === 'applyClassroomJob') {
      return result.duplicate ? '이미 지원한 직업입니다.' : '직업 지원이 저장됐습니다.';
    }
    if(functionName === 'assignClassroomJob') return '직업을 배정했습니다.';
    if(functionName === 'releaseClassroomJob') return '직업 배정을 해제했습니다.';
    if(functionName === 'claimClassroomJobSalary') {
      const amount = Number(result.rewardAmount || 0);
      return result.duplicate ? '이번 주 월급은 이미 지급했습니다.' : `${amount} 포인트를 지급했습니다.`;
    }
    if(functionName === 'purchaseClassroomShopItem') {
      const amount = Number(result.pricePoint || 0);
      return `${amount} 포인트로 구매했습니다.`;
    }
    if(functionName === 'requestClassroomShopPurchaseUse') {
      return result.duplicate ? '이미 사용 요청 중인 쿠폰입니다.' : '쿠폰 사용을 요청했습니다.';
    }
    if(functionName === 'approveClassroomShopPurchaseUse') {
      return result.duplicate ? '이미 처리된 요청입니다.' : '쿠폰 사용을 승인했습니다.';
    }
    if(functionName === 'completeClassroomShopPurchaseUse') {
      return result.duplicate ? '이미 처리된 쿠폰입니다.' : '쿠폰 사용을 완료했습니다.';
    }
    if(functionName === 'rejectClassroomShopPurchaseUse') {
      return result.duplicate ? '이미 처리된 요청입니다.' : '쿠폰 사용 요청을 반려했습니다.';
    }
    if(functionName === 'refundClassroomShopPurchase') {
      return result.duplicate ? '이미 환불된 쿠폰입니다.' : `${Number(result.refundPoint || 0)} 포인트를 환불했습니다.`;
    }
    if(functionName === 'useClassroomBillboardTicket') {
      return '전광판에 한마디를 올렸습니다.';
    }
    if(functionName === 'checkClassroomRoutine') {
      if(result.duplicate) return '오늘 이미 체크한 루틴입니다.';
      if(result.completed) return `목표를 달성해 ${Number(result.rewardAmount || 0)} 포인트를 받았습니다.`;
      return '오늘 체크했습니다.';
    }
    return '';
  }

  const CLASSROOM_ECONOMY_ACTIONS = {
    applyClassroomJob: { payloadKey: 'jobId', progressText: '지원 중...' },
    assignClassroomJob: { payloadKey: 'applicationId', progressText: '배정 중...' },
    releaseClassroomJob: { payloadKey: 'assignmentId', progressText: '해제 중...' },
    claimClassroomJobSalary: { payloadKey: 'assignmentId', progressText: '지급 중...' },
    purchaseClassroomShopItem: { payloadKey: 'itemId', progressText: '구매 중...' },
    requestClassroomShopPurchaseUse: { payloadKey: 'purchaseId', progressText: '요청 중...' },
    approveClassroomShopPurchaseUse: { payloadKey: 'purchaseId', progressText: '승인 중...' },
    completeClassroomShopPurchaseUse: { payloadKey: 'purchaseId', progressText: '완료 중...' },
    rejectClassroomShopPurchaseUse: { payloadKey: 'purchaseId', progressText: '반려 중...' },
    refundClassroomShopPurchase: { payloadKey: 'purchaseId', progressText: '환불 중...' },
    useClassroomBillboardTicket: { payloadKey: 'purchaseId', progressText: '게시 중...' },
    checkClassroomRoutine: { payloadKey: 'routineId', progressText: '체크 중...' }
  };

  async function runClassroomEconomyAction(actionName, options = {}, deps = {}) {
    const action = CLASSROOM_ECONOMY_ACTIONS[actionName];
    if(!action || !options.value) return null;
    const button = options.button || null;
    const originalText = button?.textContent || '';
    if(button) {
      button.disabled = true;
      button.textContent = action.progressText;
    }
    try {
      const result = await callClassroomEconomyActionFlow({
        functionName: actionName,
        payload: { [action.payloadKey]: options.value, ...(options.payload || {}) },
        memberUserId: deps.getCurrentMemberUserId?.()
      }, deps);
      if(result?.success) deps.alert?.(getClassroomEconomySuccessMessage(actionName, result));
      return result;
    } finally {
      if(button && deps.containsElement?.(button) !== false) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  async function saveClassroomRoutineFlow(options = {}, deps = {}) {
    if(!options.memberUserId) {
      deps.setStatus?.('회원 연결 후 성장루틴을 만들 수 있습니다.', true);
      return { skipped: true, reason: 'member-required' };
    }
    const values = deps.getValues();
    if(!values.title) {
      deps.setStatus?.('루틴 이름을 입력해 주세요.', true);
      return { skipped: true, reason: 'title-required' };
    }
    if(!values.startDate || !values.endDate) {
      deps.setStatus?.('시작일과 종료일을 선택해 주세요.', true);
      return { skipped: true, reason: 'date-required' };
    }
    if(values.startDate > values.endDate) {
      deps.setStatus?.('종료일은 시작일 이후여야 합니다.', true);
      return { skipped: true, reason: 'invalid-date-range' };
    }
    if(!values.weekdays.length) {
      deps.setStatus?.('체크할 요일을 1개 이상 선택해 주세요.', true);
      return { skipped: true, reason: 'weekdays-required' };
    }

    const settings = await deps.loadClassroomSettings();
    deps.setStatus?.('성장루틴을 저장하는 중입니다.');
    try {
      await deps.save({
        classId: settings.classId,
        memberUserId: options.memberUserId,
        values
      });
      deps.resetCaches?.({ economy: true });
      deps.resetForm?.();
      deps.setStatus?.('성장루틴을 저장했습니다.');
      await deps.renderClassroom?.(true);
      return { error: null };
    } catch(error) {
      deps.warn?.('Classroom routine save failed.', error);
      deps.setStatus?.(error.message === 'classroom-routine-functions-unavailable'
        ? '성장루틴 저장 기능을 불러오지 못했습니다.'
        : '성장루틴 저장 중 문제가 생겼습니다.', true);
      return { error };
    }
  }

  async function verifyClassroomEntryFlow(options = {}, deps = {}) {
    const entryCode = String(options.entryCode || '').trim();
    if(!entryCode) {
      deps.setStatus?.('교실 비밀번호를 입력해 주세요.', true);
      return { skipped: true, reason: 'entry-code-required' };
    }
    if(!options.memberUserId) {
      deps.setStatus?.('회원 연결 후 교실에 입장할 수 있습니다.', true);
      return { skipped: true, reason: 'member-required' };
    }

    const settings = await deps.loadClassroomSettings(true);
    deps.setStatus?.('교실 비밀번호를 확인하는 중입니다.');
    try {
      const result = await deps.verifyEntryCode({
        classId: settings.classId,
        memberUserId: options.memberUserId,
        entryCode
      });
      deps.setStatus?.(deps.getSuccessMessage?.(settings) || '교실에 입장했습니다.');
      deps.clearEntryCode?.();
      deps.setUnlocked?.(true);
      return { result, settings, error: null };
    } catch(error) {
      deps.warn?.('Classroom entry verification failed.', error);
      deps.setStatus?.(
        error.message === 'classroom-entry-functions-unavailable'
          ? '교실 입장 확인 기능을 불러오지 못했습니다.'
          : error.message === 'classroom-member-unavailable'
            ? '회원 연결 후 교실에 입장할 수 있습니다.'
            : '비밀번호가 맞지 않거나 교실에 입장할 수 없습니다.',
        true
      );
      return { settings, error };
    }
  }

  async function setClassroomSelectedBadgeFlow(options = {}, deps = {}) {
    if(!options.badgeId || !options.memberUserId) return { skipped: true };
    const settings = await deps.loadClassroomSettings();
    try {
      await deps.setSelectedBadge({
        classId: settings.classId,
        memberUserId: options.memberUserId,
        badgeType: options.badgeType || 'gem',
        badgeId: options.badgeId
      });
      deps.resetCaches?.({ students: true });
      await deps.renderClassroom?.(true);
      deps.alert?.('대표 뱃지를 설정했습니다.');
      return { error: null };
    } catch(error) {
      deps.warn?.('Classroom selected badge save failed.', error);
      deps.alert?.(error.message === 'classroom-badge-select-functions-unavailable'
        ? '대표 뱃지 설정 기능을 불러오지 못했어요.'
        : '대표 뱃지를 설정하지 못했어요.');
      await deps.renderClassroom?.(true);
      return { error };
    }
  }

  async function completeClassroomCheckQuestFlow(options = {}, deps = {}) {
    const settings = await deps.loadClassroomSettings();
    const quest = deps.findClassroomQuest(settings, options.questId);
    if(!quest?.saveEnabled) return { skipped: true, reason: 'quest-disabled' };
    if(!options.memberUserId) {
      deps.alert?.('회원 연결 후 교실 퀘스트를 저장할 수 있어요.');
      return { skipped: true, reason: 'member-required' };
    }

    try {
      if(quest.rewardMode === 'auto') {
        const result = await deps.completeAutoQuest({
          memberUserId: options.memberUserId,
          classId: settings.classId,
          questId: options.questId
        });
        deps.resetClassroomCaches?.({ progress: true, wallet: true, gems: true });
        deps.resetUserEconomyCache?.();
        await deps.renderClassroom?.(true);
        if(result.duplicate) {
          deps.alert?.('오늘 이미 완료한 퀘스트예요.');
        } else {
          const amount = Number(result.rewardAmount || result.rewardCoin || result.rewardPoint || quest.rewardCoin || 0);
          deps.alert?.(`${amount} ${deps.getClassroomRewardCurrencyLabel(result.rewardCurrency || quest.rewardCurrency)}를 받았어요.`);
        }
        return { result, error: null };
      }

      const result = await deps.saveManualQuestProgress({
        settings,
        quest,
        questId: options.questId,
        memberUserId: options.memberUserId
      });
      deps.resetClassroomCaches?.({ progress: true });
      await deps.renderClassroom?.(true);
      return { result, error: null };
    } catch(error) {
      deps.warn?.('Classroom quest progress save failed.', error);
      deps.alert?.(error.message === 'classroom-auto-quest-functions-unavailable'
        ? '교실 퀘스트 보상 기능을 불러오지 못했어요.'
        : error.message === 'classroom-quest-progress-db-unavailable'
          ? '교실 퀘스트 저장 기능을 불러오지 못했어요.'
          : '교실 퀘스트 저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
      return { error, quest };
    }
  }

  async function completeCurrentMemberClassroomQuestFlow(options = {}, deps = {}) {
    const settings = await deps.loadClassroomSettings();
    const quest = deps.findClassroomQuest(settings, options.questId);
    if(!quest?.saveEnabled) return { skipped: true, reason: 'quest-disabled' };
    const button = deps.getQuestActionButton?.(options.questId) || null;
    if(button) {
      button.disabled = true;
      button.textContent = quest.rewardMode === 'auto' ? '지급 중...' : '저장 중...';
    }
    const result = await completeClassroomCheckQuestFlow({
      questId: options.questId,
      memberUserId: deps.getCurrentMemberUserId?.() || ''
    }, {
      ...deps,
      loadClassroomSettings: async () => settings
    });
    if(result?.error && button) {
      button.disabled = false;
      button.textContent = result.quest?.studentAction || quest.studentAction || '완료 체크';
    }
    return result;
  }

  async function reviewClassroomQuestProgressFlow(options = {}, deps = {}) {
    if(!options.recordId || !['approved', 'rejected'].includes(options.nextStatus)) return { skipped: true };
    const settings = await deps.loadClassroomSettings();
    if(deps.isCurrentClassroomTeacher?.(settings) !== true) {
      deps.alert?.('담임 권한이 있어야 처리할 수 있어요.');
      return { skipped: true, reason: 'permission-denied' };
    }

    try {
      const result = await deps.reviewProgress({
        classId: settings.classId,
        recordId: options.recordId,
        nextStatus: options.nextStatus
      });
      deps.resetClassroomCaches?.({
        review: true,
        progress: true,
        wallet: true,
        gems: true
      });
      deps.resetUserEconomyCache?.();
      await deps.renderClassroom?.(true);
      if(deps.isAdminClassroomSectionActive?.()) {
        await deps.renderAdminClassroomReview?.(true);
      }
      if(options.nextStatus === 'approved' && !result.duplicate) {
        const amount = Number(result.rewardAmount || result.rewardCoin || result.rewardPoint || 0);
        deps.alert?.(`${amount} ${deps.getClassroomRewardCurrencyLabel(result.rewardCurrency)}를 지급했습니다.`);
      }
      return { result, error: null };
    } catch(error) {
      deps.warn?.('Classroom quest review failed.', error);
      deps.alert?.(error.message === 'classroom-review-functions-unavailable'
        ? '교실 퀘스트 검토 기능을 불러오지 못했어요.'
        : '교실 퀘스트 검토 저장 중 문제가 생겼어요.');
      await deps.renderClassroom?.(true);
      return { error };
    }
  }

  async function reviewClassroomQuestProgressWithButtonsFlow(options = {}, deps = {}) {
    if(!options.recordId || !['approved', 'rejected'].includes(options.nextStatus)) return { skipped: true };
    const buttons = Array.from(deps.getReviewButtons?.(options.recordId) || []);
    buttons.forEach(button => {
      button.disabled = true;
      button.textContent = options.nextStatus === 'approved' ? '승인 중...' : '반려 중...';
    });
    return reviewClassroomQuestProgressFlow(options, deps);
  }

  return {
    loadClassroomSettingsWithCache,
    loadClassroomCachedValue,
    loadClassroomRepositoryCachedValue,
    getClassroomReviewViewData,
    getClassroomPrototypeViewData,
    saveClassroomTeacherFormFlow,
    awardClassroomBadgeCampaignFlow,
    callClassroomEconomyActionFlow,
    getClassroomEconomySuccessMessage,
    runClassroomEconomyAction,
    saveClassroomRoutineFlow,
    verifyClassroomEntryFlow,
    setClassroomSelectedBadgeFlow,
    completeClassroomCheckQuestFlow,
    completeCurrentMemberClassroomQuestFlow,
    reviewClassroomQuestProgressFlow,
    reviewClassroomQuestProgressWithButtonsFlow
  };
});
