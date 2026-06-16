const assert = require('node:assert/strict');
const usecases = require('../../public/js/application/admin-usecases.js');

async function testLoadAdminDashboardFlow() {
  const calls = [];
  const dashboard = await usecases.loadAdminDashboardFlow({}, {
    setStatus: message => calls.push(['status', message]),
    loadDashboard: async () => ({ dashboard: { adminLevel: 'superAdmin', activeMembers: 3 } }),
    setDashboard: data => {
      calls.push(['state', data]);
      return { ...data, stored: true };
    },
    setSuperAdminUiEnabled: enabled => calls.push(['super', enabled]),
    renderDashboard: data => calls.push(['render', data])
  });

  assert.deepEqual(dashboard, { adminLevel: 'superAdmin', activeMembers: 3, stored: true });
  assert.deepEqual(calls, [
    ['status', '대시보드를 불러오는 중입니다...'],
    ['state', { adminLevel: 'superAdmin', activeMembers: 3 }],
    ['super', true],
    ['render', { adminLevel: 'superAdmin', activeMembers: 3, stored: true }],
    ['status', '운영 상태를 불러왔습니다.']
  ]);
}

async function testLoadAdminAuditFlow() {
  const calls = [];
  const audit = await usecases.loadAdminAuditFlow({
    loadingMessage: '점검 중',
    getSuccessMessage: data => `완료 ${data.checkedAt}`
  }, {
    setStatus: message => calls.push(['status', message]),
    loadAudit: async () => ({ audit: { checkedAt: '2026-06-16' } }),
    renderAudit: data => calls.push(['render', data])
  });

  assert.deepEqual(audit, { checkedAt: '2026-06-16' });
  assert.deepEqual(calls, [
    ['status', '점검 중'],
    ['render', { checkedAt: '2026-06-16' }],
    ['status', '완료 2026-06-16']
  ]);
}

async function testLoadAdminMembersFlow() {
  const calls = [];
  const result = await usecases.loadAdminMembersFlow({}, {
    setStatus: message => calls.push(['status', message]),
    getFilterValues: () => ({ grade: '4' }),
    loadMembers: async filters => {
      calls.push(['load', filters]);
      return {
        summary: { total: 2 },
        members: [{ id: 'a' }, { id: 'b' }]
      };
    },
    renderSummary: summary => calls.push(['summary', summary]),
    renderMemberList: members => calls.push(['members', members])
  });

  assert.equal(result.members.length, 2);
  assert.deepEqual(calls, [
    ['status', '회원 목록을 불러오는 중입니다...'],
    ['load', { grade: '4' }],
    ['summary', { total: 2 }],
    ['members', [{ id: 'a' }, { id: 'b' }]],
    ['status', '회원 2명을 표시했습니다. 비밀번호 현황은 현재 표시된 목록 기준입니다.']
  ]);
}

async function testLoadAdminMembersFlowWithoutStatus() {
  const calls = [];
  await usecases.loadAdminMembersFlow({ updateStatus: false }, {
    setStatus: message => calls.push(['status', message]),
    loadMembers: async () => ({ summary: {}, members: [] }),
    renderSummary: () => calls.push(['summary']),
    renderMemberList: () => calls.push(['members'])
  });

  assert.deepEqual(calls, [['summary'], ['members']]);
}

async function testLoadAdminInitialViewFlow() {
  const calls = [];
  const result = await usecases.loadAdminInitialViewFlow({}, {
    enterAdminView: () => calls.push(['enter']),
    setActiveAdminSection: section => calls.push(['section', section]),
    loadAdminDashboard: async () => {
      calls.push(['dashboard']);
      return { adminLevel: 'superAdmin' };
    },
    loadAdminMembers: async () => {
      calls.push(['members']);
      return { members: [] };
    },
    getSuperAdminInitialLoads: () => [
      {
        load: async () => calls.push(['notice'])
      },
      {
        load: async () => {
          calls.push(['logs']);
          throw new Error('logs-failed');
        },
        warnMessage: 'logs failed',
        onError: () => calls.push(['logs-error'])
      }
    ],
    warn: message => calls.push(['warn', message])
  });

  await new Promise(resolve => setTimeout(resolve, 0));

  assert.deepEqual(result, {
    dashboard: { adminLevel: 'superAdmin' },
    members: { members: [] }
  });
  assert.deepEqual(calls, [
    ['enter'],
    ['section', 'dashboard'],
    ['dashboard'],
    ['members'],
    ['notice'],
    ['logs'],
    ['warn', 'logs failed'],
    ['logs-error']
  ]);
}

async function testLoadAdminInitialViewFlowErrors() {
  const calls = [];
  const result = await usecases.loadAdminInitialViewFlow({}, {
    enterAdminView: () => calls.push(['enter']),
    setActiveAdminSection: section => calls.push(['section', section]),
    loadAdminDashboard: async () => {
      throw new Error('dashboard-failed');
    },
    loadAdminMembers: async () => {
      throw new Error('members-failed');
    },
    onDashboardError: () => calls.push(['dashboard-error']),
    onMembersError: () => calls.push(['members-error']),
    warn: message => calls.push(['warn', message])
  });

  assert.deepEqual(result, { dashboard: null, members: null });
  assert.deepEqual(calls.slice(0, 2), [
    ['enter'],
    ['section', 'dashboard']
  ]);
  assert(calls.some(call => call[0] === 'warn' && call[1] === 'Admin dashboard load failed.'));
  assert(calls.some(call => call[0] === 'dashboard-error'));
  assert(calls.some(call => call[0] === 'warn' && call[1] === 'Admin member list load failed.'));
  assert(calls.some(call => call[0] === 'members-error'));
}

async function run() {
  await testLoadAdminDashboardFlow();
  await testLoadAdminAuditFlow();
  await testLoadAdminMembersFlow();
  await testLoadAdminMembersFlowWithoutStatus();
  await testLoadAdminInitialViewFlow();
  await testLoadAdminInitialViewFlowErrors();
}

run().then(() => {
  console.log('admin-usecases tests passed');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
