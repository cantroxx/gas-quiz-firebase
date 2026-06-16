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
          if(name === 'practiceRecords') {
            return {
              get: async () => ({
                exists: true,
                data: () => ({ correctIds: [' q1 ', '', 'q2'] })
              })
            };
          }
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
  assert.deepEqual(await repository.loadPracticeRecordCorrectIds('member__area'), new Set(['q1', 'q2']));
}

function makeWriteDb(calls) {
  const docs = {
    'userRankingSummary/member-1': { exists: true, data: () => ({ totalScore: 1 }) },
    'quizKingSummary/member-1': { exists: false, data: () => ({}) },
    'practiceRecords/member-1__area-a': { exists: true, data: () => ({ correctIds: ['old-q'], correctCount: 1, starCount: 0 }) },
    'userPracticeSummary/member-1': { exists: true, data: () => ({ totalStars: 0 }) }
  };
  const makeDoc = path => ({
    path,
    collection(name) {
      return {
        doc(id) {
          return makeDoc(`${path}/${name}/${id}`);
        }
      };
    },
    async get() {
      calls.push(['get', path]);
      return docs[path] || { exists: false, data: () => ({}) };
    },
    async set(data, options) {
      calls.push(['set', path, data, options]);
    }
  });
  return {
    collection(name) {
      return {
        doc(id) {
          return makeDoc(`${name}/${id}`);
        }
      };
    },
    batch() {
      const writes = [];
      return {
        set(ref, data, options) {
          writes.push([ref.path, data, options]);
          calls.push(['batchSet', ref.path, data, options]);
        },
        async commit() {
          calls.push(['batchCommit', writes.map(write => write[0])]);
        }
      };
    }
  };
}

async function testQuizRepositoryWritesRankingAndPracticeProgress() {
  const calls = [];
  const repository = createQuizRepository({
    getFirestoreDb: () => makeWriteDb(calls),
    getFirestoreFieldValue: () => ({
      serverTimestamp: () => ({ type: 'timestamp' }),
      arrayUnion: value => ({ op: 'arrayUnion', value }),
      increment: value => ({ op: 'increment', value })
    }),
    getFirebaseAuthUser: () => ({ uid: 'auth-1' }),
    getFirebaseFunctions: () => ({
      httpsCallable: name => async payload => {
        calls.push(['callable', name, payload]);
        return {
          data: name === 'syncMemberTitles'
            ? { awardedCount: 1, awardedTitles: ['title-a'] }
            : { economyPath: 'userEconomy/member-1', rewardCoin: 3 }
        };
      }
    }),
    loadFeatureFlags: async () => ({ practiceRewardEnabled: true }),
    loadFirebaseQuizMeta: async () => ({ questionCount: 2 })
  });
  const commonDeps = {
    testShopUserId: 'test-user',
    normalizeFirebaseQuizId: value => value,
    getCurrentDataOwnerId: () => 'member-1',
    getCurrentMemberProfile: () => ({ nickname: 'Student', grade: '4', classNumber: '8', studentNumber: '23' }),
    debugLog: () => {}
  };

  const rankingResult = await repository.saveRankingRecordOnQuizComplete({
    ...commonDeps,
    getCurrentModeId: () => 'ranking',
    getCurrentQuizId: () => 'quiz-a',
    getCorrectAnswerCount: () => 5,
    getRankingTargetForQuiz: () => ({ category: '국어', categoryKey: 'korean', rankingMode: 'normal', subFilter: '' }),
    getRankingElapsedSeconds: () => 12,
    getMaxRankingElapsedSeconds: () => 300,
    buildRankingRecordId: (memberUserId, categoryKey, rankingMode) => `${memberUserId}__${categoryKey}__${rankingMode}`,
    buildUserRankingSummaryUpdate: (existing, record, updatedAt) => ({ ...existing, lastScore: record.score, updatedAt }),
    buildQuizKingSummaryUpdate: (existing, record, updatedAt) => ({ ...existing, totalScore: record.score, updatedAt }),
    formatRankingElapsedText: seconds => `${seconds}초`
  });

  assert.deepEqual(rankingResult, {
    recordId: 'member-1__korean__normal',
    score: 5,
    categoryKey: 'korean',
    elapsedText: '12초'
  });
  assert(calls.some(call => call[0] === 'batchSet' && call[1] === 'rankingRecords/member-1__korean__normal'));
  assert(calls.some(call => call[0] === 'batchSet' && call[1] === 'userRankingSummary/member-1'));
  assert(calls.some(call => call[0] === 'batchSet' && call[1] === 'quizKingSummary/member-1'));

  const practiceResult = await repository.savePracticeProgressAfterCorrectAnswer({
    practiceQuestionId: 'new-q'
  }, {
    ...commonDeps,
    getCurrentModeId: () => 'practice',
    getCurrentQuizId: () => 'quiz-practice',
    getCurrentQuestionSet: () => [{}, {}],
    getPracticeQuestionId: question => question.practiceQuestionId,
    getPracticeQuestionIdCandidates: question => [question.practiceQuestionId],
    getPracticeTargetForQuiz: () => ({ area: 'Area', detail: 'Detail', areaKey: 'area-a', completionType: 'star' }),
    getPracticeCorrectCoin: () => 3,
    buildPracticeProgressRecordId: (memberUserId, areaKey) => `${memberUserId}__${areaKey}`,
    buildPracticeSummaryUpdate: (existing, options) => ({ ...existing, nextStarCount: options.nextStarCount }),
    buildPracticeBadgeUpdate: options => ({ badgeId: 'badge-a', nextCorrectCount: options.nextCorrectCount })
  });

  assert.equal(practiceResult.recordId, 'member-1__area-a');
  assert.equal(practiceResult.rewardCoin, 3);
  assert(calls.some(call => call[0] === 'set' && call[1] === 'practiceRecords/member-1__area-a'));
  assert(calls.some(call => call[0] === 'batchSet' && call[1] === 'userPracticeSummary/member-1'));
  assert(calls.some(call => call[0] === 'batchSet' && call[1] === 'userBadges/member-1/badges/badge-a'));
  assert(calls.some(call => call[0] === 'callable' && call[1] === 'syncMemberTitles'));
  assert(calls.some(call => call[0] === 'callable' && call[1] === 'grantPracticeReward'));
}

async function run() {
  await testQuizRepositoryPorts();
  await testQuizPlayRepositoryDeps();
  await testQuizRepositoryReadsFirestoreQuestions();
  await testQuizRepositoryWritesRankingAndPracticeProgress();
  console.log('Infrastructure tests passed: quiz-repository');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
