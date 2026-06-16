const assert = require('assert');
const accountUsecases = require('../../public/js/application/account-usecases.js');

async function testSubmitMemberLinkFlowSuccess() {
  const calls = [];
  const result = await accountUsecases.submitMemberLinkFlow({ submitAction: 'login' }, {
    isMemberLinkInProgress: () => false,
    setMemberLinkInProgress: value => calls.push(['progress', value]),
    getMemberLinkSubmitAction: () => 'login',
    setMemberLinkSubmitAction: action => calls.push(['action', action]),
    getMemberLinkFormValues: () => ({ action: 'login', password: '1111' }),
    setMemberLinkStatus: message => calls.push(['status', message]),
    getMemberLinkSubmitPendingMessage: () => 'pending',
    getMemberLinkSubmitSuccessMessage: () => 'success',
    getMemberLinkSubmitErrorMessage: () => 'error',
    linkImportedMemberToCurrentAuthUser: async () => ({ userId: 'u1', role: 'student' }),
    renderMemberLinkPanel: () => calls.push(['render']),
    shouldWaitForRequiredPasswordChange: () => false,
    openMemberDestination: profile => calls.push(['open', profile.userId])
  });

  assert.equal(result.profile.userId, 'u1');
  assert.deepEqual(calls[0], ['progress', true]);
  assert.deepEqual(calls.at(-1), ['progress', false]);
  assert.ok(calls.some(call => call[0] === 'open' && call[1] === 'u1'));
}

async function testSubmitMemberLinkFlowWaitsForPasswordChange() {
  let openCalled = false;
  let renderCount = 0;
  const result = await accountUsecases.submitMemberLinkFlow({}, {
    isMemberLinkInProgress: () => false,
    setMemberLinkInProgress: () => {},
    getMemberLinkSubmitAction: () => 'login',
    setMemberLinkSubmitAction: () => {},
    getMemberLinkFormValues: () => ({}),
    setMemberLinkStatus: () => {},
    getMemberLinkSubmitPendingMessage: () => '',
    getMemberLinkSubmitSuccessMessage: () => '',
    getMemberLinkSubmitErrorMessage: () => '',
    linkImportedMemberToCurrentAuthUser: async () => ({ userId: 'u1' }),
    renderMemberLinkPanel: () => { renderCount += 1; },
    shouldWaitForRequiredPasswordChange: () => true,
    openMemberDestination: () => { openCalled = true; }
  });

  assert.equal(result.waitingForPasswordChange, true);
  assert.equal(openCalled, false);
  assert.equal(renderCount, 2);
}

async function testResetMemberPasswordFlow() {
  const calls = [];
  const result = await accountUsecases.resetMemberPasswordFlow({
    defaultMemberSchool: '동자',
    button: {}
  }, {
    isMemberLinkInProgress: () => false,
    setMemberLinkInProgress: value => calls.push(['progress', value]),
    getMemberLinkFormValues: () => ({ grade: 4, classNumber: 8, studentNumber: 23 }),
    getTemporaryPasswordText: () => '4823',
    getMemberPasswordResetConfirmMessage: password => `reset ${password}`,
    getMemberPasswordResetSuccessMessage: password => `done ${password}`,
    getMemberPasswordResetErrorMessage: () => 'error',
    resetMemberPasswordToTemporary: async payload => ({ payload }),
    setButtonBusy: () => ({ text: 'old' }),
    restoreButtonState: () => calls.push(['restore']),
    setMemberLinkStatus: message => calls.push(['status', message]),
    confirm: () => true
  });

  assert.equal(result.temporaryPassword, '4823');
  assert.deepEqual(calls.at(-1), ['restore']);
}

async function testChangePendingMemberPasswordFlow() {
  const calls = [];
  const result = await accountUsecases.changePendingMemberPasswordFlow({ button: {} }, {
    getMemberPasswordChangeValues: () => ({ newPassword: '2222', passwordConfirm: '2222' }),
    setButtonBusy: () => 'state',
    restoreButtonState: () => calls.push(['restore']),
    changeCurrentMemberPassword: async () => ({ profile: { role: 'student' } }),
    renderMemberLinkPanel: () => calls.push(['render']),
    setMemberLinkStatus: message => calls.push(['status', message]),
    getMemberPasswordChangeSuccessMessage: () => 'changed',
    getMemberPasswordChangeErrorMessage: () => 'error',
    appendMemberLinkError: () => {},
    openMemberDestination: () => calls.push(['open'])
  });

  assert.ok(result.result);
  assert.deepEqual(calls.map(call => call[0]), ['render', 'status', 'open', 'restore']);
}

async function testUnlinkCurrentMemberFlow() {
  const calls = [];
  const result = await accountUsecases.unlinkCurrentMemberFlow({ button: {} }, {
    setMemberLinkStatus: message => calls.push(['status', message]),
    unlinkCurrentMemberForTesting: async () => {},
    renderLoggedOutHomeState: () => calls.push(['renderLoggedOut']),
    showLoginView: () => calls.push(['login']),
    getMemberUnlinkErrorMessage: () => 'error',
    renderMemberLinkPanel: () => {}
  });

  assert.equal(result.unlinked, true);
  assert.deepEqual(calls.map(call => call[0]), ['status', 'renderLoggedOut', 'status', 'login']);
}

function testAccountSessionStateFlows() {
  const calls = [];
  const profile = { userId: 'member-1' };
  const restored = accountUsecases.applyRestoredMemberProfileFlow(profile, {
    getRestoredMemberState: nextProfile => ({
      currentMemberUserId: nextProfile.userId,
      currentMemberProfile: nextProfile,
      linkedMemberHintUserId: nextProfile.userId,
      shouldResetUserScopedRuntimeData: true
    }),
    setCurrentMemberSession: state => calls.push(['session', state.currentMemberUserId]),
    maybeSaveLinkedMemberHint: userId => calls.push(['hint', userId]),
    resetUserScopedRuntimeData: () => calls.push(['reset'])
  });

  assert.equal(restored, profile);
  assert.deepEqual(calls, [
    ['session', 'member-1'],
    ['hint', 'member-1'],
    ['reset']
  ]);

  const resolved = accountUsecases.handleResolvedUserChangeFlow('test-user', {
    getLastResolvedUserId: () => 'member-1',
    setLastResolvedUserId: userId => calls.push(['last', userId]),
    testShopUserId: 'test-user',
    getResolvedUserChangeState: () => ({
      shouldClearMemberProfile: true,
      shouldClearLinkedMemberHint: true,
      shouldResetUserScopedRuntimeData: true,
      nextLastResolvedUserId: 'test-user'
    }),
    clearCurrentMemberSession: () => calls.push(['clear-session']),
    clearLinkedMemberHint: () => calls.push(['clear-hint']),
    resetUserScopedRuntimeData: () => calls.push(['reset-2'])
  });

  assert.equal(resolved.nextLastResolvedUserId, 'test-user');
  assert.deepEqual(calls.slice(3), [
    ['clear-session'],
    ['clear-hint'],
    ['reset-2'],
    ['last', 'test-user']
  ]);
}

async function testRestoreAndLinkFlows() {
  const calls = [];
  const restored = await accountUsecases.restoreLinkedMemberFromAuthUidFlow({
    testShopUserId: 'test-user'
  }, {
    getFirestoreDb: () => 'db',
    getFirebaseAuthUser: () => ({ uid: 'auth-1' }),
    getCurrentMemberUserId: () => '',
    getCurrentMemberProfile: () => null,
    getLinkedMemberHint: () => 'member-1',
    restoreLinkedMemberProfile: async (options, deps) => {
      calls.push(['restore', options.authUid, options.hintedMemberUserId, !!deps.applyRestoredMemberProfile]);
      return { userId: 'member-1' };
    },
    applyRestoredMemberProfile: () => {},
    clearLinkedMemberHint: () => {},
    warn: () => {}
  });
  assert.equal(restored.userId, 'member-1');

  const linked = await accountUsecases.linkImportedMemberToCurrentAuthUserFlow({
    password: '1111'
  }, {
    getFirestoreDb: () => 'db',
    initializeAuthUser: async () => ({ uid: 'auth-1' }),
    getFirebaseAuthUser: () => null,
    defaultMemberSchool: '동자',
    getAccountCallableDeps: () => ({ callAccountCallable: async () => ({}) }),
    linkMemberWithPassword: async () => ({ success: true, memberUserId: 'member-1', forcePasswordChange: true }),
    loadLinkedMemberProfile: async () => ({ userId: 'member-1' }),
    setCurrentMemberSession: state => calls.push(['session', state.currentMemberUserId]),
    setPendingPasswordChange: state => calls.push(['pending', state.memberUserId]),
    maybeSaveLinkedMemberHint: userId => calls.push(['hint', userId]),
    resetUserScopedRuntimeData: () => calls.push(['reset']),
    migrateUserDataToMemberIdIfNeeded: async () => calls.push(['migrate']),
    warn: () => {}
  });

  assert.equal(linked.userId, 'member-1');
  assert(calls.some(call => call[0] === 'restore'));
  assert(calls.some(call => call[0] === 'pending' && call[1] === 'member-1'));
  assert(calls.some(call => call[0] === 'migrate'));
}

async function testInitializeAuthUserLifecycleWithoutAuthUsesFallback() {
  const calls = [];
  const promise = accountUsecases.initializeAuthUserLifecycle({
    testShopUserId: 'test-user'
  }, {
    getFirebaseAuthInitPromise: () => null,
    getFirebaseAuth: () => null,
    handleResolvedUserChange: userId => calls.push(['resolved', userId]),
    setFirebaseAuthInitPromise: value => calls.push(['promise', !!value])
  });

  assert.equal(await promise, null);
  assert.deepEqual(calls, [
    ['resolved', 'test-user'],
    ['promise', true]
  ]);
}

async function testInitializeAuthUserLifecycleAttachesListenerAndStoresPromise() {
  const calls = [];
  const auth = {
    onAuthStateChanged(callback) {
      calls.push(['listener']);
      callback({ uid: 'u1' });
    }
  };
  const promise = accountUsecases.initializeAuthUserLifecycle({
    testShopUserId: 'test-user'
  }, {
    getFirebaseAuthInitPromise: () => null,
    getFirebaseAuth: () => auth,
    isAuthStateListenerAttached: () => false,
    setAuthStateListenerAttached: value => calls.push(['listener-attached', value]),
    handleAuthStateUser: async user => calls.push(['auth-user', user.uid]),
    initializeAuthUserFlow: async () => {
      calls.push(['init-flow']);
      return { uid: 'u1' };
    },
    setFirebaseAuthUser: () => {},
    handleResolvedUserChange: () => {},
    restoreLinkedMemberFromAuthUid: () => {},
    renderMemberLinkPanel: () => {},
    openRestoredMemberDestination: () => {},
    setFirebaseAuthInitPromise: value => calls.push(['promise', !!value])
  });

  assert.deepEqual(await promise, { uid: 'u1' });
  assert.deepEqual(calls.map(call => call[0]), [
    'listener',
    'auth-user',
    'listener-attached',
    'init-flow',
    'promise'
  ]);
}

async function run() {
  await testSubmitMemberLinkFlowSuccess();
  await testSubmitMemberLinkFlowWaitsForPasswordChange();
  await testResetMemberPasswordFlow();
  await testChangePendingMemberPasswordFlow();
  await testUnlinkCurrentMemberFlow();
  testAccountSessionStateFlows();
  await testRestoreAndLinkFlows();
  await testInitializeAuthUserLifecycleWithoutAuthUsesFallback();
  await testInitializeAuthUserLifecycleAttachesListenerAndStoresPromise();
  console.log('Application tests passed: account-usecases');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
