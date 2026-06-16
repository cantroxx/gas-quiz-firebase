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

async function run() {
  await testCallAccountCallable();
  await testCallAccountCallableFailure();
  await testAccountCallableDeps();
}

run().then(() => {
  console.log('Infrastructure tests passed: account-repository');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
