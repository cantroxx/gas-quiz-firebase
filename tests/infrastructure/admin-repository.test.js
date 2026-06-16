const assert = require('node:assert/strict');

const calls = [];
let authCalls = 0;
const functions = {
  httpsCallable: name => async payload => {
    calls.push([name, payload]);
    return { data: { success: true, name, payload } };
  }
};

const { createAdminRepository } = require('../../public/js/infrastructure/admin-repository.js');

async function assertAdminCall(actual, name, payload) {
  assert.deepEqual(actual, { success: true, name, payload });
}

async function testAdminRepositoryCallsAdminFunctions() {
  const repository = createAdminRepository({
    getFirebaseFunctions: () => functions,
    initializeAuthUser: async () => {
      authCalls += 1;
      return { uid: 'admin' };
    }
  });

  await assertAdminCall(await repository.loadAdminDashboard(), 'adminGetDashboard', {});
  await assertAdminCall(await repository.loadAdminOperationalAudit(), 'adminGetOperationalAudit', {});
  await assertAdminCall(await repository.loadAdminQuizQualityAudit(), 'adminGetQuizQualityAudit', {});
  await assertAdminCall(await repository.loadAdminMembers({ grade: 4 }), 'adminListMembers', { grade: 4 });
  await assertAdminCall(await repository.loadAdminMemberDetail('member-1'), 'adminGetMemberDetail', { memberUserId: 'member-1' });
  await assertAdminCall(await repository.runAdminMemberAction('resetPassword', 'member-1'), 'adminResetMemberPassword', { memberUserId: 'member-1' });
  await assertAdminCall(await repository.runAdminMemberAction('unlinkAuth', 'member-1'), 'adminUnlinkMemberAuth', { memberUserId: 'member-1' });
  await assertAdminCall(await repository.runAdminMemberAction('deactivate', 'member-1'), 'adminUpdateMemberStatus', { memberUserId: 'member-1', status: 'inactive' });
  await assertAdminCall(await repository.runAdminMemberAction('activate', 'member-1'), 'adminUpdateMemberStatus', { memberUserId: 'member-1', status: 'active' });
  await assertAdminCall(await repository.adjustAdminMemberWallet({ memberUserId: 'member-1', delta: 10 }), 'adminAdjustMemberWallet', { memberUserId: 'member-1', delta: 10 });
  await assertAdminCall(await repository.setClassAdminPermission({ memberUserId: 'member-1', enabled: true }), 'adminSetClassAdmin', { memberUserId: 'member-1', enabled: true });
  await assertAdminCall(await repository.loadAdminNoticeBoard(), 'adminGetNoticeBoard', {});
  await assertAdminCall(await repository.saveAdminNoticeBoard({ title: 'notice' }), 'adminUpdateNoticeBoard', { notice: { title: 'notice' } });
  await assertAdminCall(await repository.loadAdminExternalQuizzes(), 'adminGetExternalQuizzes', {});
  await assertAdminCall(await repository.saveAdminExternalQuizzes([{ id: 'q1' }]), 'adminUpdateExternalQuizzes', { externalQuizzes: [{ id: 'q1' }] });
  await assertAdminCall(await repository.loadAdminLoginSettings(), 'adminGetPasswordSetupSettings', {});
  await assertAdminCall(await repository.saveAdminLoginSettings({ enabled: false }), 'adminUpdatePasswordSetupSettings', { settings: { enabled: false } });
  await assertAdminCall(await repository.loadAdminFeatureFlags(), 'adminGetFeatureFlags', {});
  await assertAdminCall(await repository.saveAdminFeatureFlags({ beta: true }), 'adminUpdateFeatureFlags', { flags: { beta: true } });
  await assertAdminCall(await repository.loadAdminRoomCatalog(), 'adminListRoomCatalog', {});
  await assertAdminCall(await repository.saveAdminRoomCatalogItem({ id: 'chair' }), 'adminSaveRoomCatalogItem', { id: 'chair' });
  await assertAdminCall(await repository.loadAdminLogs({ limit: 20 }), 'adminListLogs', { limit: 20 });

  assert.equal(authCalls, calls.length);
  assert.deepEqual(calls.map(call => call[0]), [
    'adminGetDashboard',
    'adminGetOperationalAudit',
    'adminGetQuizQualityAudit',
    'adminListMembers',
    'adminGetMemberDetail',
    'adminResetMemberPassword',
    'adminUnlinkMemberAuth',
    'adminUpdateMemberStatus',
    'adminUpdateMemberStatus',
    'adminAdjustMemberWallet',
    'adminSetClassAdmin',
    'adminGetNoticeBoard',
    'adminUpdateNoticeBoard',
    'adminGetExternalQuizzes',
    'adminUpdateExternalQuizzes',
    'adminGetPasswordSetupSettings',
    'adminUpdatePasswordSetupSettings',
    'adminGetFeatureFlags',
    'adminUpdateFeatureFlags',
    'adminListRoomCatalog',
    'adminSaveRoomCatalogItem',
    'adminListLogs'
  ]);

  assert.throws(
    () => repository.runAdminMemberAction('unknown', 'member-1'),
    /unsupported-admin-action/
  );
}

testAdminRepositoryCallsAdminFunctions()
  .then(() => console.log('Infrastructure tests passed: admin-repository'))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
