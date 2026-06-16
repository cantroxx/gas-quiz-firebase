(function (root) {
  function createAdminRepository(deps = {}) {
    const callableDeps = {
      getFirebaseFunctions: deps.getFirebaseFunctions,
      initializeAuthUser: deps.initializeAuthUser
    };
    return {
      loadAdminDashboard: () => root.DJ48AdminData.loadAdminDashboard(callableDeps),
      loadAdminOperationalAudit: () => root.DJ48AdminData.loadAdminOperationalAudit(callableDeps),
      loadAdminQuizQualityAudit: () => root.DJ48AdminData.loadAdminQuizQualityAudit(callableDeps),
      loadAdminMembers: payload => root.DJ48AdminData.loadAdminMembers(payload, callableDeps),
      loadAdminMemberDetail: memberUserId => root.DJ48AdminData.loadAdminMemberDetail(memberUserId, callableDeps),
      runAdminMemberAction: (action, memberUserId) => root.DJ48AdminData.runAdminMemberAction(action, memberUserId, callableDeps),
      adjustAdminMemberWallet: payload => root.DJ48AdminData.adjustAdminMemberWallet(payload, callableDeps),
      setClassAdminPermission: payload => root.DJ48AdminData.setClassAdminPermission(payload, callableDeps),
      loadAdminNoticeBoard: () => root.DJ48AdminData.loadAdminNoticeBoard(callableDeps),
      saveAdminNoticeBoard: notice => root.DJ48AdminData.saveAdminNoticeBoard(notice, callableDeps),
      loadAdminExternalQuizzes: () => root.DJ48AdminData.loadAdminExternalQuizzes(callableDeps),
      saveAdminExternalQuizzes: externalQuizzes => root.DJ48AdminData.saveAdminExternalQuizzes(externalQuizzes, callableDeps),
      loadAdminLoginSettings: () => root.DJ48AdminData.loadAdminLoginSettings(callableDeps),
      saveAdminLoginSettings: settings => root.DJ48AdminData.saveAdminLoginSettings(settings, callableDeps),
      loadAdminFeatureFlags: () => root.DJ48AdminData.loadAdminFeatureFlags(callableDeps),
      saveAdminFeatureFlags: flags => root.DJ48AdminData.saveAdminFeatureFlags(flags, callableDeps),
      loadAdminRoomCatalog: () => root.DJ48AdminData.loadAdminRoomCatalog(callableDeps),
      saveAdminRoomCatalogItem: item => root.DJ48AdminData.saveAdminRoomCatalogItem(item, callableDeps),
      loadAdminLogs: payload => root.DJ48AdminData.loadAdminLogs(payload, callableDeps)
    };
  }

  const api = {
    createAdminRepository
  };

  root.DJ48AdminRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
