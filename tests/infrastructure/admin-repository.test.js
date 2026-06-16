const assert = require('node:assert/strict');

const calls = [];
globalThis.DJ48AdminData = {
  loadAdminDashboard: deps => {
    calls.push(['dashboard', !!deps.getFirebaseFunctions, !!deps.initializeAuthUser]);
    return { ok: true };
  },
  loadAdminOperationalAudit: deps => {
    calls.push(['operational-audit', !!deps.getFirebaseFunctions]);
    return { audit: true };
  },
  loadAdminQuizQualityAudit: deps => {
    calls.push(['quiz-quality-audit', !!deps.initializeAuthUser]);
    return { quality: true };
  },
  loadAdminMembers: (payload, deps) => {
    calls.push(['members', payload.grade, !!deps.getFirebaseFunctions]);
    return { members: [] };
  },
  loadAdminMemberDetail: (memberUserId, deps) => {
    calls.push(['member-detail', memberUserId, !!deps.initializeAuthUser]);
    return { memberUserId };
  },
  runAdminMemberAction: (action, memberUserId, deps) => {
    calls.push(['member-action', action, memberUserId, !!deps.getFirebaseFunctions]);
    return { action };
  },
  adjustAdminMemberWallet: (payload, deps) => {
    calls.push(['wallet', payload.memberUserId, payload.delta, !!deps.initializeAuthUser]);
    return { balance: payload.delta };
  },
  setClassAdminPermission: (payload, deps) => {
    calls.push(['permission', payload.memberUserId, payload.enabled, !!deps.getFirebaseFunctions]);
    return { enabled: payload.enabled };
  },
  loadAdminNoticeBoard: deps => {
    calls.push(['notice-load', !!deps.getFirebaseFunctions]);
    return { notice: true };
  },
  saveAdminNoticeBoard: (notice, deps) => {
    calls.push(['notice-save', notice.title, !!deps.initializeAuthUser]);
    return { notice };
  },
  loadAdminExternalQuizzes: deps => {
    calls.push(['external-load', !!deps.getFirebaseFunctions]);
    return [];
  },
  saveAdminExternalQuizzes: (externalQuizzes, deps) => {
    calls.push(['external-save', externalQuizzes.length, !!deps.initializeAuthUser]);
    return { count: externalQuizzes.length };
  },
  loadAdminLoginSettings: deps => {
    calls.push(['login-load', !!deps.getFirebaseFunctions]);
    return { enabled: true };
  },
  saveAdminLoginSettings: (settings, deps) => {
    calls.push(['login-save', settings.enabled, !!deps.initializeAuthUser]);
    return settings;
  },
  loadAdminFeatureFlags: deps => {
    calls.push(['flags-load', !!deps.getFirebaseFunctions]);
    return { flags: true };
  },
  saveAdminFeatureFlags: (flags, deps) => {
    calls.push(['flags-save', flags.beta, !!deps.initializeAuthUser]);
    return flags;
  },
  loadAdminRoomCatalog: deps => {
    calls.push(['room-load', !!deps.getFirebaseFunctions]);
    return [];
  },
  saveAdminRoomCatalogItem: (item, deps) => {
    calls.push(['room-save', item.id, !!deps.initializeAuthUser]);
    return item;
  },
  loadAdminLogs: (payload, deps) => {
    calls.push(['logs', payload.limit, !!deps.getFirebaseFunctions]);
    return [];
  }
};

const { createAdminRepository } = require('../../public/js/infrastructure/admin-repository.js');

async function testAdminRepositoryDelegatesToAdminData() {
  const repository = createAdminRepository({
    getFirebaseFunctions: () => ({}),
    initializeAuthUser: () => Promise.resolve({ uid: 'admin' })
  });

  assert.deepEqual(await repository.loadAdminDashboard(), { ok: true });
  assert.deepEqual(await repository.loadAdminOperationalAudit(), { audit: true });
  assert.deepEqual(await repository.loadAdminQuizQualityAudit(), { quality: true });
  assert.deepEqual(await repository.loadAdminMembers({ grade: 4 }), { members: [] });
  assert.deepEqual(await repository.loadAdminMemberDetail('member-1'), { memberUserId: 'member-1' });
  assert.deepEqual(await repository.runAdminMemberAction('reset-password', 'member-1'), { action: 'reset-password' });
  assert.deepEqual(await repository.adjustAdminMemberWallet({ memberUserId: 'member-1', delta: 10 }), { balance: 10 });
  assert.deepEqual(await repository.setClassAdminPermission({ memberUserId: 'member-1', enabled: true }), { enabled: true });
  assert.deepEqual(await repository.loadAdminNoticeBoard(), { notice: true });
  assert.deepEqual(await repository.saveAdminNoticeBoard({ title: '공지' }), { notice: { title: '공지' } });
  assert.deepEqual(await repository.loadAdminExternalQuizzes(), []);
  assert.deepEqual(await repository.saveAdminExternalQuizzes([{ id: 'q1' }]), { count: 1 });
  assert.deepEqual(await repository.loadAdminLoginSettings(), { enabled: true });
  assert.deepEqual(await repository.saveAdminLoginSettings({ enabled: false }), { enabled: false });
  assert.deepEqual(await repository.loadAdminFeatureFlags(), { flags: true });
  assert.deepEqual(await repository.saveAdminFeatureFlags({ beta: true }), { beta: true });
  assert.deepEqual(await repository.loadAdminRoomCatalog(), []);
  assert.deepEqual(await repository.saveAdminRoomCatalogItem({ id: 'chair' }), { id: 'chair' });
  assert.deepEqual(await repository.loadAdminLogs({ limit: 20 }), []);

  assert.deepEqual(calls.map(call => call[0]), [
    'dashboard',
    'operational-audit',
    'quiz-quality-audit',
    'members',
    'member-detail',
    'member-action',
    'wallet',
    'permission',
    'notice-load',
    'notice-save',
    'external-load',
    'external-save',
    'login-load',
    'login-save',
    'flags-load',
    'flags-save',
    'room-load',
    'room-save',
    'logs'
  ]);
}

testAdminRepositoryDelegatesToAdminData()
  .then(() => console.log('Infrastructure tests passed: admin-repository'))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
