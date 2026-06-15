(function () {
  async function callAdminCallable(options = {}, deps = {}) {
    const functions = deps.getFirebaseFunctions?.();
    if(!functions) throw new Error('functions-unavailable');
    await deps.initializeAuthUser?.();
    const callableName = options.callableName || '';
    const callable = functions.httpsCallable(callableName);
    const response = await callable(options.payload || {});
    const result = response?.data || {};
    if(!result.success) throw new Error(options.errorCode || `${callableName || 'admin-call'}-failed`);
    return result;
  }

  function loadAdminDashboard(deps = {}) {
    return callAdminCallable({
      callableName: 'adminGetDashboard',
      errorCode: 'admin-dashboard-load-failed'
    }, deps);
  }

  function loadAdminOperationalAudit(deps = {}) {
    return callAdminCallable({
      callableName: 'adminGetOperationalAudit',
      errorCode: 'admin-audit-load-failed'
    }, deps);
  }

  function loadAdminQuizQualityAudit(deps = {}) {
    return callAdminCallable({
      callableName: 'adminGetQuizQualityAudit',
      errorCode: 'admin-quiz-quality-load-failed'
    }, deps);
  }

  function loadAdminMembers(payload = {}, deps = {}) {
    return callAdminCallable({
      callableName: 'adminListMembers',
      payload,
      errorCode: 'admin-list-failed'
    }, deps);
  }

  function loadAdminNoticeBoard(deps = {}) {
    return callAdminCallable({
      callableName: 'adminGetNoticeBoard',
      errorCode: 'admin-notice-load-failed'
    }, deps);
  }

  function saveAdminNoticeBoard(notice = {}, deps = {}) {
    return callAdminCallable({
      callableName: 'adminUpdateNoticeBoard',
      payload: { notice },
      errorCode: 'admin-notice-save-failed'
    }, deps);
  }

  function loadAdminExternalQuizzes(deps = {}) {
    return callAdminCallable({
      callableName: 'adminGetExternalQuizzes',
      errorCode: 'admin-external-quizzes-load-failed'
    }, deps);
  }

  function saveAdminExternalQuizzes(externalQuizzes = {}, deps = {}) {
    return callAdminCallable({
      callableName: 'adminUpdateExternalQuizzes',
      payload: { externalQuizzes },
      errorCode: 'admin-external-quizzes-save-failed'
    }, deps);
  }

  function loadAdminLoginSettings(deps = {}) {
    return callAdminCallable({
      callableName: 'adminGetPasswordSetupSettings',
      errorCode: 'admin-login-settings-load-failed'
    }, deps);
  }

  function saveAdminLoginSettings(settings = {}, deps = {}) {
    return callAdminCallable({
      callableName: 'adminUpdatePasswordSetupSettings',
      payload: { settings },
      errorCode: 'admin-login-settings-save-failed'
    }, deps);
  }

  function loadAdminFeatureFlags(deps = {}) {
    return callAdminCallable({
      callableName: 'adminGetFeatureFlags',
      errorCode: 'admin-feature-flags-load-failed'
    }, deps);
  }

  function saveAdminFeatureFlags(flags = {}, deps = {}) {
    return callAdminCallable({
      callableName: 'adminUpdateFeatureFlags',
      payload: { flags },
      errorCode: 'admin-feature-flags-save-failed'
    }, deps);
  }

  function loadAdminRoomCatalog(deps = {}) {
    return callAdminCallable({
      callableName: 'adminListRoomCatalog',
      errorCode: 'admin-room-catalog-load-failed'
    }, deps);
  }

  function saveAdminRoomCatalogItem(item = {}, deps = {}) {
    return callAdminCallable({
      callableName: 'adminSaveRoomCatalogItem',
      payload: item,
      errorCode: 'admin-room-catalog-save-failed'
    }, deps);
  }

  function loadAdminLogs(payload = {}, deps = {}) {
    return callAdminCallable({
      callableName: 'adminListLogs',
      payload,
      errorCode: 'admin-logs-load-failed'
    }, deps);
  }

  window.DJ48AdminData = {
    callAdminCallable,
    loadAdminDashboard,
    loadAdminOperationalAudit,
    loadAdminQuizQualityAudit,
    loadAdminMembers,
    loadAdminNoticeBoard,
    saveAdminNoticeBoard,
    loadAdminExternalQuizzes,
    saveAdminExternalQuizzes,
    loadAdminLoginSettings,
    saveAdminLoginSettings,
    loadAdminFeatureFlags,
    saveAdminFeatureFlags,
    loadAdminRoomCatalog,
    saveAdminRoomCatalogItem,
    loadAdminLogs
  };
})();
