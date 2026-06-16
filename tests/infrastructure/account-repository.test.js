const assert = require('node:assert/strict');
const repositoryModule = require('../../public/js/infrastructure/account-repository.js');

async function testCallAccountCallable() {
  const calls = [];
  const functions = {
    httpsCallable: name => async payload => {
      calls.push([name, payload]);
      return { data: { success: true, profile: { nickname: '학생' } } };
    }
  };
  const repository = repositoryModule.createAccountRepository({
    getFirebaseFunctions: () => functions,
    initializeAuthUser: async () => calls.push(['auth'])
  });

  const result = await repository.loginMemberWithPassword({ memberUserId: 'member-a' });

  assert.deepEqual(result, { success: true, profile: { nickname: '학생' } });
  assert.deepEqual(calls, [
    ['auth'],
    ['loginMemberWithPassword', { memberUserId: 'member-a' }]
  ]);
}

async function testCallAccountCallableFailure() {
  const repository = repositoryModule.createAccountRepository({
    getFirebaseFunctions: () => ({
      httpsCallable: () => async () => ({ data: { success: false } })
    })
  });

  await assert.rejects(
    () => repository.resetMemberPasswordToTemporary({}),
    /member-password-reset-failed/
  );
}

async function testAccountCallableDeps() {
  const calls = [];
  const repository = {
    callAccountCallable: async (...args) => {
      calls.push(args);
      return { success: true };
    }
  };
  const deps = repositoryModule.getAccountCallableDeps(repository);
  const result = await deps.callAccountCallable('changeMemberPassword', { a: 1 }, 'failed');

  assert.deepEqual(result, { success: true });
  assert.deepEqual(calls, [['changeMemberPassword', { a: 1 }, 'failed']]);
}

function makeAccountDb(calls) {
  const users = {
    'member-1': {
      userId: 'member-1',
      authUid: 'auth-1',
      role: 'student',
      status: 'active',
      active: true,
      nickname: 'Student'
    },
    'inactive-1': {
      userId: 'inactive-1',
      authUid: 'auth-1',
      role: 'student',
      status: 'inactive',
      active: false
    }
  };
  const makeDoc = id => ({
    id,
    async get() {
      calls.push(['doc-get', id]);
      return users[id]
        ? { id, exists: true, data: () => users[id] }
        : { id, exists: false, data: () => ({}) };
    }
  });
  return {
    collection(name) {
      assert.equal(name, 'users');
      return {
        doc: makeDoc,
        where(field, op, value) {
          calls.push(['where', field, op, value]);
          return {
            limit(count) {
              calls.push(['limit', count]);
              return {
                async get() {
                  const match = Object.entries(users).find(([, data]) => data.authUid === value);
                  return {
                    empty: !match,
                    docs: match ? [{ id: match[0], data: () => match[1] }] : []
                  };
                }
              };
            }
          };
        }
      };
    }
  };
}

async function testAccountRepositoryRestoresAndLoadsProfiles() {
  const calls = [];
  const db = makeAccountDb(calls);
  const repository = repositoryModule.createAccountRepository({});
  let appliedProfile = null;

  const restored = await repository.restoreLinkedMemberProfile({
    db,
    authUid: 'auth-1',
    hintedMemberUserId: 'member-1',
    testShopUserId: 'test-user'
  }, {
    applyRestoredMemberProfile: profile => {
      appliedProfile = profile;
      return profile;
    }
  });

  assert.equal(restored.userId, 'member-1');
  assert.equal(restored.nickname, 'Student');
  assert.equal(appliedProfile.userId, 'member-1');
  assert(calls.some(call => call[0] === 'doc-get' && call[1] === 'member-1'));

  const linked = await repository.loadLinkedMemberProfile({
    db,
    authUid: 'auth-1',
    result: {
      success: true,
      memberUserId: 'member-1',
      action: 'password-login'
    }
  });

  assert.equal(linked.userId, 'member-1');
  assert.equal(linked._authLinkAction, 'password-login');

  const restoredByAuth = await repositoryModule.restoreLinkedMemberProfile({
    db,
    authUid: 'auth-1',
    hintedMemberUserId: '',
    testShopUserId: 'test-user'
  });
  assert.equal(restoredByAuth.userId, 'member-1');
  assert(calls.some(call => call[0] === 'where' && call[1] === 'authUid' && call[3] === 'auth-1'));
}

async function run() {
  await testCallAccountCallable();
  await testCallAccountCallableFailure();
  await testAccountCallableDeps();
  await testAccountRepositoryRestoresAndLoadsProfiles();
}

run().then(() => {
  console.log('Infrastructure tests passed: account-repository');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
