const assert = require('assert');
const {
  createQuizRepository,
  getQuizPlayRepositoryDeps
} = require('../../public/js/infrastructure/quiz-repository.js');

async function testQuizRepositoryPorts() {
  const calls = [];
  const db = { id: 'db' };
  const fieldValue = { id: 'fieldValue' };
  const functions = {
    id: 'functions',
    httpsCallable: name => async payload => {
      calls.push(['callable', name, payload]);
      return {
        data: {
          success: true,
          status: {
            memberUserId: payload.memberUserId,
            funSeconds: payload.seconds || 0,
            source: name
          }
        }
      };
    }
  };
  const authUser = { uid: 'auth-1' };
  const cache = {};
  const repository = createQuizRepository({
    getFirestoreDb: () => db,
    getFirestoreFieldValue: () => fieldValue,
    getFirebaseFunctions: () => functions,
    getFirebaseAuthUser: () => authUser,
    getCurrentDataOwnerId: () => 'member-1',
    loadFeatureFlags: async () => ({ rankingEnabled: true }),
    loadFirebaseQuizMeta: async quizId => ({ quizId }),
    loadFirebaseQuizQuestions: async quizId => [{ questionId: `${quizId}-1`, prompt: '안 (되/돼)', answer: '돼' }],
    getFirebaseQuizDataCache: () => cache,
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
  assert.deepEqual(await repository.loadFirebaseQuizQuestions('spelling'), [{ questionId: 'spelling-1', prompt: '안 (되/돼)', answer: '돼' }]);
  const questions = await repository.buildFirebaseQuizData('spelling');
  assert.equal(questions.length, 1);
  assert.deepEqual(questions[0], {
    practiceQuestionId: 'spelling-1',
    question: '안 (되/돼)',
    choices: ['되', '돼'],
    answer: 1
  });
  assert.equal(cache.spelling, questions);
  assert.equal(repository.isFirestorePermissionDeniedError({ code: 'permission-denied' }), true);
  repository.resetUserEconomyCache();
  repository.resetTitleCatalogCache();
  assert.deepEqual(calls, ['economy', 'titles']);
  assert.deepEqual(await repository.getPopularQuizUsageStatus({ memberUserId: 'member-1' }), {
    memberUserId: 'member-1',
    funSeconds: 0,
    source: 'getPopularQuizUsageStatus'
  });
  assert.deepEqual(await repository.updatePopularQuizUsage({ memberUserId: 'member-1', funSeconds: 12 }), {
    memberUserId: 'member-1',
    funSeconds: 12,
    source: 'recordPopularQuizUsageSeconds'
  });
  assert.deepEqual(await repository.updatePopularQuizUsage({ memberUserId: 'member-1', eduCorrectCount: 1 }), {
    memberUserId: 'member-1',
    funSeconds: 0,
    source: 'recordEducationCorrectForPopularUnlock'
  });
  assert(calls.some(call => call[0] === 'callable' && call[1] === 'getPopularQuizUsageStatus'));
  assert(calls.some(call => call[0] === 'callable' && call[1] === 'recordPopularQuizUsageSeconds' && call[2].seconds === 12));
  assert(calls.some(call => call[0] === 'callable' && call[1] === 'recordEducationCorrectForPopularUnlock'));
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
    loadFirebaseQuizQuestions: async quizId => [quizId],
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
  assert.deepEqual(await deps.loadFirebaseQuizQuestions('quiz-a'), ['quiz-a']);
  assert.equal(deps.isFirestorePermissionDeniedError(new Error('x')), true);
  assert.equal(typeof deps.getPopularQuizUsageStatus, 'function');
  assert.equal(typeof deps.updatePopularQuizUsage, 'function');
}

async function testQuizRepositoryReadsFirestoreQuestions() {
  const repository = createQuizRepository({
    normalizeFirebaseQuizId: quizId => quizId === 'multiplication_division' ? 'random-basic' : quizId,
    getFirestoreDb: () => ({
      collection: name => ({
        doc: id => {
          if(name === 'quizzes') {
            return {
              get: async () => ({
                exists: true,
                data: () => ({ title: id })
              })
            };
          }
          return {
            collection: childName => ({
              orderBy: field => ({
                get: async () => ({
                  docs: childName === 'questions' && field === 'order'
                    ? [{
                      id: 'q1',
                      data: () => ({
                        questionType: 'input',
                        prompt: '정답을 쓰세요',
                        answer: '정답',
                        hint: '힌트'
                      })
                    }]
                    : []
                })
              })
            })
          };
        }
      })
    })
  });

  assert.deepEqual(await repository.loadFirebaseQuizMeta('spelling'), { quizId: 'spelling', title: 'spelling' });
  assert.deepEqual(await repository.loadFirebaseQuizQuestions('spelling'), [{
    questionId: 'q1',
    questionType: 'input',
    prompt: '정답을 쓰세요',
    answer: '정답',
    hint: '힌트'
  }]);
}

async function run() {
  await testQuizRepositoryPorts();
  await testQuizPlayRepositoryDeps();
  await testQuizRepositoryReadsFirestoreQuestions();
  console.log('Infrastructure tests passed: quiz-repository');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
