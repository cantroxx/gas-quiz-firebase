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
  await testInitializeAuthUserLifecycleWithoutAuthUsesFallback();
  await testInitializeAuthUserLifecycleAttachesListenerAndStoresPromise();
  console.log('Application tests passed: account-usecases');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
