(function () {
  function formatAdminTimestamp(value) {
    const seconds = Number(value?._seconds || value?.seconds || 0);
    const millis = seconds ? seconds * 1000 : Date.parse(value || '');
    if(!millis || Number.isNaN(millis)) return '-';
    return new Date(millis).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function createAdminInfoChip(label, value) {
    const chip = document.createElement('span');
    chip.className = 'admin-info-chip';
    chip.textContent = `${label} ${value ?? '-'}`;
    return chip;
  }

  function renderAdminDashboard(dashboard, deps = {}) {
    const grid = document.getElementById('admin-dashboard-grid');
    const recent = document.getElementById('admin-dashboard-recent');
    if(!grid || !recent) return;
    const data = dashboard || {};
    const isSuperAdmin = data.adminLevel === 'superAdmin';
    const createAdminDetailMetric = deps.createAdminDetailMetric;
    const formatAdminLogAction = deps.formatAdminLogAction || (action => action || '관리자 작업');
    if(typeof createAdminDetailMetric !== 'function') return;

    grid.innerHTML = '';
    [
      ['권한 범위', data.scopeLabel || '-'],
      ['활성 학생', data.activeStudents || 0],
      ['연결 없음', data.authUnlinked || 0],
      ['비번 미설정', data.passwordMissing || 0],
      ['변경 필요', data.passwordForceChange || 0],
      ['잠김', data.passwordLocked || 0],
      ['오늘 기록', data.todayPracticeCount || 0],
      ['오늘 보상', data.todayRewardCount || 0]
    ].forEach(([label, value]) => {
      grid.appendChild(createAdminDetailMetric(label, value));
    });

    recent.innerHTML = '';
    const heading = document.createElement('h3');
    heading.textContent = isSuperAdmin ? '최근 관리자 작업' : '반 관리자 모드';
    recent.appendChild(heading);
    if(isSuperAdmin && data.recentLogs?.length) {
      data.recentLogs.forEach(log => {
        const item = document.createElement('p');
        item.textContent = `${formatAdminTimestamp(log.createdAt)} · ${formatAdminLogAction(log.action)} · ${log.targetUserId || '-'}`;
        recent.appendChild(item);
      });
    } else {
      const item = document.createElement('p');
      item.textContent = isSuperAdmin ? '최근 작업 이력이 없습니다.' : '자기 반 학생 관리만 가능합니다.';
      recent.appendChild(item);
    }
  }

  function renderAdminLogs(logs, deps = {}) {
    const root = document.getElementById('admin-logs-list');
    if(!root) return;
    const formatAdminLogAction = deps.formatAdminLogAction || (action => action || '관리자 작업');
    root.innerHTML = '';
    const items = logs || [];
    if(!items.length) {
      const empty = document.createElement('p');
      empty.className = 'admin-empty';
      empty.textContent = '표시할 작업 이력이 없습니다.';
      root.appendChild(empty);
      return;
    }
    items.forEach(log => {
      const card = document.createElement('article');
      const title = document.createElement('h4');
      const meta = document.createElement('p');
      const reason = document.createElement('p');
      card.className = 'admin-log-card';
      title.textContent = formatAdminLogAction(log.action);
      meta.textContent = `${formatAdminTimestamp(log.createdAt)} · 관리자 ${log.adminUserId || '-'} · 대상 ${log.targetUserId || '-'}`;
      reason.textContent = log.reason ? `사유: ${log.reason}` : '';
      card.append(title, meta);
      if(reason.textContent) card.appendChild(reason);
      root.appendChild(card);
    });
  }

  window.DJ48AdminRender = {
    formatAdminTimestamp,
    createAdminInfoChip,
    renderAdminDashboard,
    renderAdminLogs
  };
})();
