(function (root) {
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

  function runAdminMemberAction(action, memberUserId, deps = {}) {
    const payload = { memberUserId };
    let callableName = '';
    if(action === 'resetPassword') callableName = 'adminResetMemberPassword';
    else if(action === 'unlinkAuth') callableName = 'adminUnlinkMemberAuth';
    else if(action === 'deactivate') {
      callableName = 'adminUpdateMemberStatus';
      payload.status = 'inactive';
    } else if(action === 'activate') {
      callableName = 'adminUpdateMemberStatus';
      payload.status = 'active';
    } else {
      throw new Error('unsupported-admin-action');
    }
    return callAdminCallable({
      callableName,
      payload,
      errorCode: 'admin-action-failed'
    }, deps);
  }

  function createAdminRepository(deps = {}) {
    return {
      async loadPublicNoticeBoard() {
        const db = deps.getFirestoreDb?.();
        if(!db) throw new Error('firestore-unavailable');
        const snapshot = await db.collection('noticeBoard').doc('current').get();
        return snapshot.exists ? snapshot.data() || {} : {};
      },
      async loadPublicFeatureFlags() {
        const db = deps.getFirestoreDb?.();
        if(!db) throw new Error('firestore-unavailable');
        const snapshot = await db.collection('appSettings').doc('featureFlags').get();
        return snapshot.exists ? snapshot.data() || {} : {};
      },
      async loadPublicExternalQuizzes() {
        const db = deps.getFirestoreDb?.();
        if(!db) throw new Error('firestore-unavailable');
        const snapshot = await db.collection('appSettings').doc('externalQuizzes').get();
        return snapshot.exists ? snapshot.data() || {} : {};
      },
      async loadServerFreshnessSignature(options = {}) {
        const db = deps.getFirestoreDb?.();
        if(!db) return '';
        const watchedDocs = [
          ['featureFlags', db.collection('appSettings').doc('featureFlags')],
          ['externalQuizzes', db.collection('appSettings').doc('externalQuizzes')],
          ['noticeBoard', db.collection('noticeBoard').doc('current')]
        ];
        const snapshots = await Promise.all(watchedDocs.map(([key, ref]) =>
          ref.get()
            .then(snapshot => ({ key, snapshot }))
            .catch(error => ({ key, error }))
        ));
        return snapshots.map(item => {
          if(item.error || !item.snapshot?.exists) return `${item.key}:missing`;
          const data = item.snapshot.data() || {};
          return `${item.key}:${options.getTimestampMillis?.(data.updatedAt) || 0}`;
        }).join('|');
      },
      loadAdminDashboard: () => callAdminCallable({
        callableName: 'adminGetDashboard',
        errorCode: 'admin-dashboard-load-failed'
      }, deps),
      loadAdminOperationalAudit: () => callAdminCallable({
        callableName: 'adminGetOperationalAudit',
        errorCode: 'admin-audit-load-failed'
      }, deps),
      loadAdminQuizQualityAudit: () => callAdminCallable({
        callableName: 'adminGetQuizQualityAudit',
        errorCode: 'admin-quiz-quality-load-failed'
      }, deps),
      loadAdminMembers: (payload = {}) => callAdminCallable({
        callableName: 'adminListMembers',
        payload,
        errorCode: 'admin-list-failed'
      }, deps),
      loadAdminMemberDetail: memberUserId => callAdminCallable({
        callableName: 'adminGetMemberDetail',
        payload: { memberUserId },
        errorCode: 'admin-member-detail-load-failed'
      }, deps),
      runAdminMemberAction: (action, memberUserId) => runAdminMemberAction(action, memberUserId, deps),
      adjustAdminMemberWallet: (payload = {}) => callAdminCallable({
        callableName: 'adminAdjustMemberWallet',
        payload,
        errorCode: 'admin-wallet-adjust-failed'
      }, deps),
      adjustAdminWallet: (payload = {}) => callAdminCallable({
        callableName: 'adminAdjustAdminWallet',
        payload,
        errorCode: 'admin-admin-wallet-adjust-failed'
      }, deps),
      setClassAdminPermission: (payload = {}) => callAdminCallable({
        callableName: 'adminSetClassAdmin',
        payload,
        errorCode: 'admin-permission-update-failed'
      }, deps),
      loadAdminNoticeBoard: () => callAdminCallable({
        callableName: 'adminGetNoticeBoard',
        errorCode: 'admin-notice-load-failed'
      }, deps),
      saveAdminNoticeBoard: (notice = {}) => callAdminCallable({
        callableName: 'adminUpdateNoticeBoard',
        payload: { notice },
        errorCode: 'admin-notice-save-failed'
      }, deps),
      loadAdminExternalQuizzes: () => callAdminCallable({
        callableName: 'adminGetExternalQuizzes',
        errorCode: 'admin-external-quizzes-load-failed'
      }, deps),
      saveAdminExternalQuizzes: (externalQuizzes = {}) => callAdminCallable({
        callableName: 'adminUpdateExternalQuizzes',
        payload: { externalQuizzes },
        errorCode: 'admin-external-quizzes-save-failed'
      }, deps),
      loadAdminLoginSettings: () => callAdminCallable({
        callableName: 'adminGetPasswordSetupSettings',
        errorCode: 'admin-login-settings-load-failed'
      }, deps),
      saveAdminLoginSettings: (settings = {}) => callAdminCallable({
        callableName: 'adminUpdatePasswordSetupSettings',
        payload: { settings },
        errorCode: 'admin-login-settings-save-failed'
      }, deps),
      loadAdminFeatureFlags: () => callAdminCallable({
        callableName: 'adminGetFeatureFlags',
        errorCode: 'admin-feature-flags-load-failed'
      }, deps),
      saveAdminFeatureFlags: (flags = {}) => callAdminCallable({
        callableName: 'adminUpdateFeatureFlags',
        payload: { flags },
        errorCode: 'admin-feature-flags-save-failed'
      }, deps),
      loadAdminRoomCatalog: () => callAdminCallable({
        callableName: 'adminListRoomCatalog',
        errorCode: 'admin-room-catalog-load-failed'
      }, deps),
      saveAdminRoomCatalogItem: (item = {}) => callAdminCallable({
        callableName: 'adminSaveRoomCatalogItem',
        payload: item,
        errorCode: 'admin-room-catalog-save-failed'
      }, deps),
      loadAdminLogs: (payload = {}) => callAdminCallable({
        callableName: 'adminListLogs',
        payload,
        errorCode: 'admin-logs-load-failed'
      }, deps)
    };
  }

  const api = {
    createAdminRepository
  };

  root.DJ48AdminRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
