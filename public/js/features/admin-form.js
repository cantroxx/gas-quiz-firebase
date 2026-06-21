(function () {
  function toDateTimeLocalInputValue(value) {
    if(!value) return '';
    const date = new Date(value);
    if(Number.isNaN(date.getTime())) return '';
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
  }

  function getAdminFilterValues() {
    return {
      grade: document.getElementById('admin-filter-grade')?.value || '',
      classNumber: document.getElementById('admin-filter-class')?.value || '',
      query: document.getElementById('admin-filter-query')?.value || '',
      memberStatus: document.getElementById('admin-filter-member-status')?.value || '',
      authStatus: document.getElementById('admin-filter-auth-status')?.value || '',
      passwordStatus: document.getElementById('admin-filter-password-status')?.value || '',
      limit: 120
    };
  }

  function normalizeAdminWalletCurrency(value) {
    const text = String(value || '').trim().toLowerCase();
    if(['coin', 'coins', 'dj', 'djcoin', 'djcoins', 'dj코인', '코인'].includes(text)) return 'djCoin';
    if(['berry', 'berries', '베리'].includes(text)) return 'berry';
    return '';
  }

  function getAdminWalletCurrencyLabel(currency) {
    return currency === 'berry' ? '베리' : 'DJ코인';
  }

  function getAdminPermissionFormValues() {
    return {
      memberUserId: (document.getElementById('admin-permission-member-id-input')?.value || '').trim(),
      scopeGrade: String(document.getElementById('admin-permission-grade-input')?.value || '').trim(),
      scopeClassNumber: String(document.getElementById('admin-permission-class-input')?.value || '').trim()
    };
  }

  function setAdminStatusElement(elementId, message, isError = false) {
    const status = document.getElementById(elementId);
    if(!status) return;
    status.textContent = message || '';
    status.classList.toggle('is-error', !!isError);
  }

  function getMappedErrorMessage(error, messages = {}, fallback = '') {
    return messages[error?.message] || fallback;
  }

  function getAdminMemberActionErrorMessage(error) {
    return getMappedErrorMessage(error, {
      'functions/permission-denied': '관리자 권한이 없거나 허용되지 않은 작업입니다.',
      'functions/not-found': '대상 회원을 찾지 못했습니다.',
      'functions/failed-precondition': '대상 회원 상태를 확인해 주세요.'
    }, '관리자 작업 중 문제가 생겼습니다.');
  }

  function getAdminExternalQuizzesSaveErrorMessage(error) {
    return getMappedErrorMessage(error, {
      'functions/permission-denied': '전체 관리자만 외부 퀴즈를 바꿀 수 있습니다.',
      'functions/invalid-argument': '외부 퀴즈 이름과 https 링크를 확인해 주세요.'
    }, '외부 퀴즈 저장 중 문제가 생겼습니다.');
  }

  function getAdminLoginSettingsSaveErrorMessage(error) {
    return getMappedErrorMessage(error, {
      'invalid-setup-expires-at': '설정 마감 날짜를 입력해 주세요.',
      'functions/invalid-argument': '설정 값을 확인해 주세요.'
    }, '로그인 설정 저장 중 문제가 생겼습니다.');
  }

  function getAdminFeatureFlagsSaveErrorMessage(error) {
    return getMappedErrorMessage(error, {
      'functions/permission-denied': '전체 관리자만 기능 설정을 바꿀 수 있습니다.',
      'functions/invalid-argument': '기능 설정 값을 확인해 주세요.'
    }, '기능 설정 저장 중 문제가 생겼습니다.');
  }

  function getAdminSeasonEventsSaveErrorMessage(error) {
    if(error instanceof SyntaxError) return 'JSON 형식을 확인해 주세요.';
    return getMappedErrorMessage(error, {
      'functions/permission-denied': '전체 관리자만 시즌 이벤트를 바꿀 수 있습니다.',
      'functions/invalid-argument': '시즌 이벤트 값을 확인해 주세요.'
    }, '시즌 이벤트 저장 중 문제가 생겼습니다.');
  }

  function getAdminPermissionGrantErrorMessage(error) {
    return getMappedErrorMessage(error, {
      'admin-permission-member-required': '대상 userId를 입력해 주세요.',
      'admin-permission-scope-required': '담당 학년과 반을 입력해 주세요.',
      'functions/permission-denied': '전체 관리자만 권한을 변경할 수 있습니다.',
      'functions/not-found': '대상 회원을 찾지 못했습니다.',
      'functions/failed-precondition': '대상 회원 상태를 확인해 주세요.'
    }, '반 관리자 지정 중 문제가 생겼습니다.');
  }

  function getAdminPermissionRevokeErrorMessage(error) {
    return getMappedErrorMessage(error, {
      'admin-permission-member-required': '대상 userId를 입력해 주세요.',
      'functions/permission-denied': '전체 관리자만 권한을 변경할 수 있습니다.',
      'functions/not-found': '대상 회원을 찾지 못했습니다.',
      'functions/failed-precondition': '대상 회원 상태를 확인해 주세요.'
    }, '관리자 해제 중 문제가 생겼습니다.');
  }

  function hideAdminTemporaryPassword() {
    const panel = document.getElementById('admin-temp-password-panel');
    const value = document.getElementById('admin-temp-password-value');
    if(value) value.textContent = '';
    if(panel) panel.hidden = true;
  }

  function showAdminTemporaryPassword(password) {
    const panel = document.getElementById('admin-temp-password-panel');
    const value = document.getElementById('admin-temp-password-value');
    if(!panel || !value || !password) return;
    value.textContent = password;
    panel.hidden = false;
  }

  function setAdminNoticeForm(notice, deps = {}) {
    const normalizeNoticeBoardData = deps.normalizeNoticeBoardData || (value => value || {});
    const data = normalizeNoticeBoardData(notice);
    const setValue = (id, value) => {
      const input = document.getElementById(id);
      if(input) input.value = value;
    };
    setValue('admin-notice-title-input', data.title);
    setValue('admin-notice-desc-input', data.desc);
    setValue('admin-notice-announcement-input', data.announcement);
    setValue('admin-notice-quest-input', data.quest);
    setValue('admin-notice-recommended-label-input', data.recommendedQuizLabel);
    setValue('admin-notice-recommended-quiz-input', data.recommendedQuizId);
    setValue('admin-notice-recommended2-label-input', data.recommendedQuiz2Label);
    setValue('admin-notice-recommended2-quiz-input', data.recommendedQuiz2Id);
    const activeInput = document.getElementById('admin-notice-active-input');
    if(activeInput) activeInput.checked = data.active !== false;
    setValue('admin-notice-starts-input', toDateTimeLocalInputValue(data.startsAtIso));
    setValue('admin-notice-ends-input', toDateTimeLocalInputValue(data.endsAtIso));
  }

  function getAdminNoticeFormValues(deps = {}) {
    const normalizeNoticeBoardData = deps.normalizeNoticeBoardData || (value => value || {});
    const startsValue = document.getElementById('admin-notice-starts-input')?.value || '';
    const endsValue = document.getElementById('admin-notice-ends-input')?.value || '';
    return normalizeNoticeBoardData({
      title: document.getElementById('admin-notice-title-input')?.value || '',
      desc: document.getElementById('admin-notice-desc-input')?.value || '',
      announcement: document.getElementById('admin-notice-announcement-input')?.value || '',
      quest: document.getElementById('admin-notice-quest-input')?.value || '',
      recommendedQuizLabel: document.getElementById('admin-notice-recommended-label-input')?.value || '',
      recommendedQuizId: document.getElementById('admin-notice-recommended-quiz-input')?.value || '',
      recommendedQuiz2Label: document.getElementById('admin-notice-recommended2-label-input')?.value || '',
      recommendedQuiz2Id: document.getElementById('admin-notice-recommended2-quiz-input')?.value || '',
      startsAtIso: startsValue ? new Date(startsValue).toISOString() : '',
      endsAtIso: endsValue ? new Date(endsValue).toISOString() : '',
      active: document.getElementById('admin-notice-active-input')?.checked === true
    });
  }

  function getAdminExternalQuizzesFormValues() {
    const rows = Array.from(document.querySelectorAll('.admin-external-quiz-row'));
    const items = rows.map((row, index) => ({
      id: `external-${index + 1}`,
      title: row.querySelector('[data-external-quiz-field="title"]')?.value || '',
      description: row.querySelector('[data-external-quiz-field="description"]')?.value || '',
      url: row.querySelector('[data-external-quiz-field="url"]')?.value || '',
      active: row.querySelector('[data-external-quiz-field="active"]')?.checked === true,
      sortOrder: index + 1
    })).filter(item => item.title.trim() || item.url.trim() || item.description.trim());
    return { items };
  }

  function setAdminSeasonEventsForm(seasonEvents = {}) {
    return seasonEvents;
  }

  function getAdminSeasonEventsFormValues() {
    const rows = Array.from(document.querySelectorAll('#admin-season-event-list .admin-external-quiz-row'));
    const items = rows.map((row, index) => {
      const periodType = row.querySelector('[data-season-event-field="periodType"]')?.value === 'weekly' ? 'weekly' : 'monthly';
      const title = row.querySelector('[data-season-event-field="title"]')?.value || '';
      const icon = row.querySelector('[data-season-event-field="icon"]:checked')?.value || '✨';
      const quizIds = String(row.querySelector('[data-season-event-field="quizIds"]')?.value || '')
        .split(/[\s,]+/)
        .map(id => id.trim())
        .filter(Boolean);
      return {
        eventId: `season-${periodType}-${index + 1}`,
        icon,
        title,
        desc: row.querySelector('[data-season-event-field="desc"]')?.value || '',
        quizIds,
        periodType,
        period: periodType === 'weekly' ? '이번 주' : '이번 달',
        active: row.querySelector('[data-season-event-field="active"]')?.checked === true,
        sortOrder: index + 1
      };
    }).filter(item => item.title.trim() || item.desc.trim() || item.quizIds.length);
    return { items };
  }

  function setAdminLoginSettingsForm(settings) {
    const data = settings || {};
    document.getElementById('admin-signup-enabled').checked = data.signupEnabled !== false;
    document.getElementById('admin-temporary-password-login-enabled').checked = data.temporaryPasswordLoginEnabled !== false;
    document.getElementById('admin-min-password-length-input').value = data.minPasswordLength || 4;
    document.getElementById('admin-max-failed-attempts-input').value = data.maxFailedAttempts || 5;
    document.getElementById('admin-lock-minutes-input').value = data.lockMinutes || 10;
  }

  function getAdminLoginSettingsFormValues() {
    const temporaryPasswordLoginEnabled = document.getElementById('admin-temporary-password-login-enabled')?.checked === true;
    return {
      signupEnabled: document.getElementById('admin-signup-enabled')?.checked === true,
      temporaryPasswordLoginEnabled,
      setupEnabled: temporaryPasswordLoginEnabled,
      setupExpiresAt: '2099-12-31T14:59:59.000Z',
      minPasswordLength: Number(document.getElementById('admin-min-password-length-input')?.value || 4),
      maxFailedAttempts: Number(document.getElementById('admin-max-failed-attempts-input')?.value || 5),
      lockMinutes: Number(document.getElementById('admin-lock-minutes-input')?.value || 10)
    };
  }

  function setAdminFeatureFlagsForm(flags, deps = {}) {
    const normalizeFeatureFlags = deps.normalizeFeatureFlags || (value => value || {});
    const renderAdminQuizToggleGrid = deps.renderAdminQuizToggleGrid || (() => {});
    const renderAdminTodayQuizPoolGrid = deps.renderAdminTodayQuizPoolGrid || (() => {});
    const data = normalizeFeatureFlags(flags);
    document.getElementById('admin-feature-practice-reward').checked = data.practiceRewardEnabled;
    document.getElementById('admin-feature-practice-xp').checked = data.practiceXpEnabled;
    document.getElementById('admin-feature-shop').checked = data.shopEnabled;
    document.getElementById('admin-feature-external-quizzes').checked = data.externalQuizzesEnabled;
    document.getElementById('admin-feature-event').checked = data.eventPlazaEnabled;
    document.getElementById('admin-feature-ranking').checked = data.rankingEnabled;
    const todayQuizModeInput = document.getElementById('admin-feature-today-quiz-mode');
    if(todayQuizModeInput) todayQuizModeInput.value = data.todayQuizMode === 'dailyRandom' ? 'dailyRandom' : 'manual';
    const todayQuizInput = document.getElementById('admin-feature-today-quiz-ids');
    if(todayQuizInput) todayQuizInput.value = (data.todayQuizIds || []).join(', ');
    const todayQuizPoolInput = document.getElementById('admin-feature-today-quiz-pool-ids');
    if(todayQuizPoolInput) todayQuizPoolInput.value = (data.todayQuizRandomPoolIds || []).join(', ');
    const todayQuizCountInput = document.getElementById('admin-feature-today-quiz-count');
    if(todayQuizCountInput) todayQuizCountInput.value = data.todayQuizDailyCount || 1;
    renderAdminTodayQuizPoolGrid(data);
    renderAdminQuizToggleGrid(data);
  }

  function getAdminFeatureFlagsFormValues(deps = {}) {
    const normalizeFeatureFlags = deps.normalizeFeatureFlags || (value => value || {});
    const normalizeFirebaseQuizId = deps.normalizeFirebaseQuizId || (value => value);
    const disabledQuizIds = Array.from(document.querySelectorAll('[data-admin-quiz-toggle]'))
      .filter(input => input.checked !== true)
      .map(input => normalizeFirebaseQuizId(input.dataset.adminQuizToggle || ''))
      .filter(Boolean);
    const todayQuizIds = String(document.getElementById('admin-feature-today-quiz-ids')?.value || '')
      .split(/[\s,]+/)
      .map(id => normalizeFirebaseQuizId(id.trim()))
      .filter(Boolean);
    const todayQuizRandomPoolIds = String(document.getElementById('admin-feature-today-quiz-pool-ids')?.value || '')
      .split(/[\s,]+/)
      .map(id => normalizeFirebaseQuizId(id.trim()))
      .filter(Boolean);
    const todayQuizRandomPoolToggleIds = Array.from(document.querySelectorAll('[data-admin-today-quiz-pool-toggle]'))
      .filter(input => input.checked === true)
      .map(input => normalizeFirebaseQuizId(input.dataset.adminTodayQuizPoolToggle || ''))
      .filter(Boolean);
    return normalizeFeatureFlags({
      practiceRewardEnabled: document.getElementById('admin-feature-practice-reward')?.checked === true,
      practiceXpEnabled: document.getElementById('admin-feature-practice-xp')?.checked === true,
      shopEnabled: document.getElementById('admin-feature-shop')?.checked === true,
      externalQuizzesEnabled: document.getElementById('admin-feature-external-quizzes')?.checked === true,
      eventPlazaEnabled: document.getElementById('admin-feature-event')?.checked === true,
      rankingEnabled: document.getElementById('admin-feature-ranking')?.checked === true,
      todayQuizMode: document.getElementById('admin-feature-today-quiz-mode')?.value === 'dailyRandom' ? 'dailyRandom' : 'manual',
      todayQuizIds,
      todayQuizRandomPoolIds: todayQuizRandomPoolToggleIds.length ? todayQuizRandomPoolToggleIds : todayQuizRandomPoolIds,
      todayQuizDailyCount: Number(document.getElementById('admin-feature-today-quiz-count')?.value || 1),
      disabledQuizIds
    });
  }

  window.DJ48AdminForm = {
    toDateTimeLocalInputValue,
    getAdminFilterValues,
    normalizeAdminWalletCurrency,
    getAdminWalletCurrencyLabel,
    getAdminPermissionFormValues,
    setAdminStatusElement,
    getAdminMemberActionErrorMessage,
    getAdminExternalQuizzesSaveErrorMessage,
    getAdminSeasonEventsSaveErrorMessage,
    getAdminLoginSettingsSaveErrorMessage,
    getAdminFeatureFlagsSaveErrorMessage,
    getAdminPermissionGrantErrorMessage,
    getAdminPermissionRevokeErrorMessage,
    hideAdminTemporaryPassword,
    showAdminTemporaryPassword,
    setAdminNoticeForm,
    getAdminNoticeFormValues,
    getAdminExternalQuizzesFormValues,
    setAdminSeasonEventsForm,
    getAdminSeasonEventsFormValues,
    setAdminLoginSettingsForm,
    getAdminLoginSettingsFormValues,
    setAdminFeatureFlagsForm,
    getAdminFeatureFlagsFormValues
  };
})();
