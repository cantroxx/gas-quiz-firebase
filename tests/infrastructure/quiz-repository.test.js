const assert = require('assert');
const {
  createQuizRepository,
  getQuizPlayRepositoryDeps
} = require('../../public/js/infrastructure/quiz-repository.js');

async function testQuizRepositoryPorts() {
  const calls = [];
  const db = { id: 'db' };
  const fieldValue = { id: 'fieldValue' };
  const functions = { id: 'functions' };
  const authUser = { uid: 'auth-1' };
  const repository = createQuizRepository({
    getFirestoreDb: () => db,
    getFirestoreFieldValue: () => fieldValue,
    getFirebaseFunctions: () => functions,
    getFirebaseAuthUser: () => authUser,
    getCurrentDataOwnerId: () => 'member-1',
    loadFeatureFlags: async () => ({ rankingEnabled: true }),
    loadFirebaseQuizMeta: async quizId => ({ quizId }),
    isFirestorePermissionDeniedError: error => error?.code === 'permission-denied',
    resetUserEconomyCache: () => calls.push('economy'),
    resetTitleCatalogCache: () => calls.push('titles')
  });

  assert.equal(repository.getFirestoreDb(), db);
  assert.equal(repository.getFirestoreFieldValue(), fieldValue);
  assert.equal(repository.getFirebaseFunctions(), functions);
  assert.equal(repository.getFirebaseAuthUser(), authUser);
  assert.equal(repository.getCurrentDataOwnerId(), 'member-1');
  assert.deepEqual(await repository.loadFeatureFlags(), { rankingEnabled: true });
  assert.deepEqual(await repository.loadFirebaseQuizMeta('spelling'), { quizId: 'spelling' });
  assert.equal(repository.isFirestorePermissionDeniedError({ code: 'permission-denied' }), true);
  repository.resetUserEconomyCache();
  repository.resetTitleCatalogCache();
  assert.deepEqual(calls, ['economy', 'titles']);
}

async function testQuizPlayRepositoryDeps() {
  const repository = createQuizRepository({
    getFirestoreDb: () => 'db',
    getFirestoreFieldValue: () => 'fieldValue',
    getFirebaseFunctions: () => 'functions',
    getFirebaseAuthUser: () => 'auth',
    getCurrentDataOwnerId: () => 'member',
    loadFeatureFlags: async () => 'flags',
    loadFirebaseQuizMeta: async quizId => quizId,
    isFirestorePermissionDeniedError: () => true
  });
  const deps = getQuizPlayRepositoryDeps(repository);

  assert.equal(deps.getFirestoreDb(), 'db');
  assert.equal(deps.getFirestoreFieldValue(), 'fieldValue');
  assert.equal(deps.getFirebaseFunctions(), 'functions');
  assert.equal(deps.getFirebaseAuthUser(), 'auth');
  assert.equal(deps.getCurrentDataOwnerId(), 'member');
  assert.equal(await deps.loadFeatureFlags(), 'flags');
  assert.equal(await deps.loadFirebaseQuizMeta('quiz-a'), 'quiz-a');
  assert.equal(deps.isFirestorePermissionDeniedError(new Error('x')), true);
}

async function run() {
  await testQuizRepositoryPorts();
  await testQuizPlayRepositoryDeps();
  console.log('Infrastructure tests passed: quiz-repository');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
