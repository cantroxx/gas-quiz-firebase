(function (root) {
  async function loadAdminDashboardFlow(options = {}, deps = {}) {
    deps.setStatus?.(options.loadingMessage || '대시보드를 불러오는 중입니다...');
    const result = await deps.loadDashboard();
    const dashboard = deps.setDashboard ? deps.setDashboard(result.dashboard) : result.dashboard;
    deps.setSuperAdminUiEnabled?.(dashboard?.adminLevel === 'superAdmin');
    deps.renderDashboard?.(dashboard);
    deps.setStatus?.(options.successMessage || '운영 상태를 불러왔습니다.');
    return dashboard;
  }

  async function loadAdminAuditFlow(options = {}, deps = {}) {
    deps.setStatus?.(options.loadingMessage || '운영 데이터를 점검하는 중입니다...');
    const result = await deps.loadAudit();
    const audit = result.audit;
    deps.renderAudit?.(audit);
    const successMessage = typeof options.getSuccessMessage === 'function'
      ? options.getSuccessMessage(audit)
      : options.successMessage;
    deps.setStatus?.(successMessage || '읽기 전용 점검이 완료됐습니다.');
    return audit;
  }

  async function loadAdminMembersFlow(options = {}, deps = {}) {
    const shouldUpdateStatus = options.updateStatus !== false;
    if(shouldUpdateStatus) deps.setStatus?.(options.loadingMessage || '회원 목록을 불러오는 중입니다...');
    const result = await deps.loadMembers(deps.getFilterValues?.() || {});
    deps.renderSummary?.(result.summary);
    deps.renderMemberList?.(result.members);
    if(shouldUpdateStatus) {
      const count = result.members?.length || 0;
      deps.setStatus?.(options.successMessage || `회원 ${count}명을 표시했습니다. 비밀번호 현황은 현재 표시된 목록 기준입니다.`);
    }
    return result;
  }

  const api = {
    loadAdminDashboardFlow,
    loadAdminAuditFlow,
    loadAdminMembersFlow
  };

  root.DJ48AdminUsecases = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
