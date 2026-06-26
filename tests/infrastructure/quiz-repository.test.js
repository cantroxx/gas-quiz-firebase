const assert = require('assert');
const {
  buildSpellingQuestion,
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
    shuffleList: items => items.slice(),
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

function testBuildSpellingQuestionShufflesChoices() {
  const question = buildSpellingQuestion(
    { questionId: 'spelling-1', prompt: '(왠지/웬지) 오늘은 좋은 일이 생길 것 같아.', answer: '왠지' },
    { shuffleList: items => items.slice().reverse() }
  );

  assert.deepEqual(question, {
    practiceQuestionId: 'spelling-1',
    question: '(왠지/웬지) 오늘은 좋은 일이 생길 것 같아.',
    choices: ['웬지', '왠지'],
    answer: 1
  });
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

function makeWriteDb(calls, docOverrides = {}) {
  const docs = {
    'userRankingSummary/member-1': { exists: true, data: () => ({ totalScore: 1 }) },
    'quizKingSummary/member-1': { exists: false, data: () => ({}) },
    'practiceRecords/member-1__area-a': { exists: true, data: () => ({ correctIds: ['old-q'], correctCount: 1, starCount: 0 }) },
    'userPracticeSummary/member-1': { exists: true, data: () => ({ totalStars: 0 }) },
    ...docOverrides
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
  const syncCountAfterRanking = calls.filter(call => call[0] === 'callable' && call[1] === 'syncMemberTitles').length;
  assert.equal(syncCountAfterRanking, 1);

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
  assert.equal(calls.filter(call => call[0] === 'callable' && call[1] === 'syncMemberTitles').length, syncCountAfterRanking);
  assert(calls.some(call => call[0] === 'callable' && call[1] === 'grantPracticeReward'));
}

async function testPracticeBadgeStarsEveryHundredCorrectAnswers() {
  const calls = [];
  const existingIds = Array.from({ length: 99 }, (_, index) => `q${index + 1}`);
  const repository = createQuizRepository({
    getFirestoreDb: () => makeWriteDb(calls, {
      'practiceRecords/member-1__area-151': {
        exists: true,
        data: () => ({ correctIds: existingIds, correctCount: 99, starCount: 0 })
      }
    }),
    getFirestoreFieldValue: () => ({
      serverTimestamp: () => ({ type: 'timestamp' }),
      arrayUnion: value => ({ op: 'arrayUnion', value }),
      increment: value => ({ op: 'increment', value })
    }),
    getFirebaseAuthUser: () => ({ uid: 'auth-1' }),
    getFirebaseFunctions: () => ({
      httpsCallable: name => async payload => {
        calls.push(['callable', name, payload]);
        return name === 'syncMemberTitles'
          ? { data: { awardedCount: 1 } }
          : { data: { rewardCoin: 3 } };
      }
    }),
    loadFeatureFlags: async () => ({ practiceRewardEnabled: true }),
    loadFirebaseQuizMeta: async () => ({ questionCount: 151 })
  });

  const result = await repository.savePracticeProgressAfterCorrectAnswer({
    practiceQuestionId: 'q100'
  }, {
    testShopUserId: 'test-user',
    normalizeFirebaseQuizId: value => value,
    getCurrentDataOwnerId: () => 'member-1',
    getCurrentModeId: () => 'practice',
    getCurrentQuizId: () => 'pokemon-gen1',
    getCurrentQuestionSet: () => Array.from({ length: 151 }, () => ({})),
    getPracticeQuestionId: question => question.practiceQuestionId,
    getPracticeQuestionIdCandidates: question => [question.practiceQuestionId],
    getPracticeTargetForQuiz: () => ({ area: '포켓몬', detail: '1세대', areaKey: 'area-151', completionType: 'loop' }),
    getPracticeCorrectCoin: () => 3,
    buildPracticeProgressRecordId: (memberUserId, areaKey) => `${memberUserId}__${areaKey}`,
    buildPracticeSummaryUpdate: (existing, options) => ({ nextStarCount: options.nextStarCount, nextBadgeProgressCount: options.nextBadgeProgressCount }),
    buildPracticeBadgeUpdate: options => ({ badgeId: 'badge-151', nextCorrectCount: options.nextCorrectCount, nextBadgeProgressCount: options.nextBadgeProgressCount }),
    debugLog: () => {}
  });

  const recordWrite = calls.find(call => call[0] === 'set' && call[1] === 'practiceRecords/member-1__area-151');
  assert.equal(result.nextStarCount, 1);
  assert.equal(result.nextCorrectCount, 100);
  assert.equal(result.nextBadgeProgressCount, 100);
  assert.equal(recordWrite[2].starCount, 1);
  assert.equal(recordWrite[2].badgeProgressCount, 100);
  assert.equal(recordWrite[2].correctIds.length, 100);
  assert(calls.some(call => call[0] === 'callable' && call[1] === 'syncMemberTitles'));
}

async function testPracticeFullQuestionRoundResetsOnlySolvedIds() {
  const calls = [];
  const existingIds = Array.from({ length: 150 }, (_, index) => `q${index + 1}`);
  const repository = createQuizRepository({
    getFirestoreDb: () => makeWriteDb(calls, {
      'practiceRecords/member-1__area-151': {
        exists: true,
        data: () => ({ correctIds: existingIds, correctCount: 150, starCount: 1, badgeProgressCount: 150 })
      }
    }),
    getFirestoreFieldValue: () => ({
      serverTimestamp: () => ({ type: 'timestamp' }),
      arrayUnion: value => ({ op: 'arrayUnion', value }),
      increment: value => ({ op: 'increment', value })
    }),
    getFirebaseAuthUser: () => ({ uid: 'auth-1' }),
    getFirebaseFunctions: () => ({
      httpsCallable: name => async payload => {
        calls.push(['callable', name, payload]);
        return { data: { rewardCoin: 3 } };
      }
    }),
    loadFeatureFlags: async () => ({ practiceRewardEnabled: true }),
    loadFirebaseQuizMeta: async () => ({ questionCount: 151 })
  });

  const result = await repository.savePracticeProgressAfterCorrectAnswer({
    practiceQuestionId: 'q151'
  }, {
    testShopUserId: 'test-user',
    normalizeFirebaseQuizId: value => value,
    getCurrentDataOwnerId: () => 'member-1',
    getCurrentModeId: () => 'practice',
    getCurrentQuizId: () => 'pokemon-gen1',
    getCurrentQuestionSet: () => Array.from({ length: 151 }, () => ({})),
    getPracticeQuestionId: question => question.practiceQuestionId,
    getPracticeQuestionIdCandidates: question => [question.practiceQuestionId],
    getPracticeTargetForQuiz: () => ({ area: '포켓몬', detail: '1세대', areaKey: 'area-151', completionType: 'loop' }),
    getPracticeCorrectCoin: () => 3,
    buildPracticeProgressRecordId: (memberUserId, areaKey) => `${memberUserId}__${areaKey}`,
    buildPracticeSummaryUpdate: (existing, options) => ({ nextStarCount: options.nextStarCount, nextBadgeProgressCount: options.nextBadgeProgressCount }),
    buildPracticeBadgeUpdate: options => ({ badgeId: 'badge-151', nextCorrectCount: options.nextCorrectCount, nextBadgeProgressCount: options.nextBadgeProgressCount }),
    debugLog: () => {}
  });

  const recordWrite = calls.find(call => call[0] === 'set' && call[1] === 'practiceRecords/member-1__area-151');
  assert.equal(result.nextStarCount, 1);
  assert.equal(result.nextCorrectCount, 0);
  assert.equal(result.nextBadgeProgressCount, 151);
  assert.equal(result.fullRoundCompleted, true);
  assert.deepEqual(recordWrite[2].correctIds, []);
  assert.equal(recordWrite[2].badgeProgressCount, 151);
  assert(!calls.some(call => call[0] === 'callable' && call[1] === 'syncMemberTitles'));
}

async function testLegacyFullRoundKeepsLargeQuizProgressCredit() {
  const calls = [];
  const repository = createQuizRepository({
    getFirestoreDb: () => makeWriteDb(calls, {
      'practiceRecords/member-1__area-151': {
        exists: true,
        data: () => ({ correctIds: [], correctCount: 0, starCount: 1 })
      }
    }),
    getFirestoreFieldValue: () => ({
      serverTimestamp: () => ({ type: 'timestamp' }),
      arrayUnion: value => ({ op: 'arrayUnion', value }),
      increment: value => ({ op: 'increment', value })
    }),
    getFirebaseAuthUser: () => ({ uid: 'auth-1' }),
    getFirebaseFunctions: () => ({
      httpsCallable: name => async payload => {
        calls.push(['callable', name, payload]);
        return { data: { rewardCoin: 3 } };
      }
    }),
    loadFeatureFlags: async () => ({ practiceRewardEnabled: true }),
    loadFirebaseQuizMeta: async () => ({ sourceQuestionCount: 151, questionCount: 100 })
  });

  const result = await repository.savePracticeProgressAfterCorrectAnswer({
    practiceQuestionId: 'q1'
  }, {
    testShopUserId: 'test-user',
    normalizeFirebaseQuizId: value => value,
    getCurrentDataOwnerId: () => 'member-1',
    getCurrentModeId: () => 'practice',
    getCurrentQuizId: () => 'pokemon-gen1',
    getCurrentQuestionSet: () => Array.from({ length: 151 }, () => ({})),
    getPracticeQuestionId: question => question.practiceQuestionId,
    getPracticeQuestionIdCandidates: question => [question.practiceQuestionId],
    getPracticeTargetForQuiz: () => ({ area: '포켓몬', detail: '1세대', areaKey: 'area-151', completionType: 'loop' }),
    getPracticeCorrectCoin: () => 3,
    buildPracticeProgressRecordId: (memberUserId, areaKey) => `${memberUserId}__${areaKey}`,
    buildPracticeSummaryUpdate: (existing, options) => ({ nextStarCount: options.nextStarCount, nextBadgeProgressCount: options.nextBadgeProgressCount }),
    buildPracticeBadgeUpdate: options => ({ badgeId: 'badge-151', nextCorrectCount: options.nextCorrectCount, nextBadgeProgressCount: options.nextBadgeProgressCount }),
    debugLog: () => {}
  });

  assert.equal(result.previousBadgeProgressCount, 151);
  assert.equal(result.nextBadgeProgressCount, 152);
  assert.equal(result.nextStarCount, 1);
}

async function testLegacyFullRoundOnTwoHundredQuestionQuizCanAwardSecondStar() {
  const calls = [];
  const repository = createQuizRepository({
    getFirestoreDb: () => makeWriteDb(calls, {
      'practiceRecords/member-1__area-200': {
        exists: true,
        data: () => ({ correctIds: [], correctCount: 0, starCount: 1 })
      }
    }),
    getFirestoreFieldValue: () => ({
      serverTimestamp: () => ({ type: 'timestamp' }),
      arrayUnion: value => ({ op: 'arrayUnion', value }),
      increment: value => ({ op: 'increment', value })
    }),
    getFirebaseAuthUser: () => ({ uid: 'auth-1' }),
    getFirebaseFunctions: () => ({
      httpsCallable: name => async payload => {
        calls.push(['callable', name, payload]);
        return { data: { rewardCoin: 3 } };
      }
    }),
    loadFeatureFlags: async () => ({ sourceQuestionCount: 200, questionCount: 100 }),
    loadFirebaseQuizMeta: async () => ({ sourceQuestionCount: 200, questionCount: 100 })
  });

  const result = await repository.savePracticeProgressAfterCorrectAnswer({
    practiceQuestionId: 'q1'
  }, {
    testShopUserId: 'test-user',
    normalizeFirebaseQuizId: value => value,
    getCurrentDataOwnerId: () => 'member-1',
    getCurrentModeId: () => 'practice',
    getCurrentQuizId: () => 'proverb',
    getCurrentQuestionSet: () => Array.from({ length: 200 }, () => ({})),
    getPracticeQuestionId: question => question.practiceQuestionId,
    getPracticeQuestionIdCandidates: question => [question.practiceQuestionId],
    getPracticeTargetForQuiz: () => ({ area: '국어', detail: '속담', areaKey: 'area-200', completionType: 'loop' }),
    getPracticeCorrectCoin: () => 3,
    buildPracticeProgressRecordId: (memberUserId, areaKey) => `${memberUserId}__${areaKey}`,
    buildPracticeSummaryUpdate: (existing, options) => ({ nextStarCount: options.nextStarCount, nextBadgeProgressCount: options.nextBadgeProgressCount }),
    buildPracticeBadgeUpdate: options => ({ badgeId: 'badge-200', nextCorrectCount: options.nextCorrectCount, nextBadgeProgressCount: options.nextBadgeProgressCount }),
    debugLog: () => {}
  });

  assert.equal(result.previousBadgeProgressCount, 200);
  assert.equal(result.nextBadgeProgressCount, 201);
  assert.equal(result.nextStarCount, 2);
  assert(calls.some(call => call[0] === 'callable' && call[1] === 'syncMemberTitles'));
  assert(calls.some(call => call[0] === 'callable' && call[1] === 'grantPracticeBadgeCycleReward'));
}

async function testShortPracticeQuizAwardsStarAfterRepeatedHundredCorrects() {
  const calls = [];
  const existingIds = Array.from({ length: 49 }, (_, index) => `q${index + 1}`);
  const repository = createQuizRepository({
    getFirestoreDb: () => makeWriteDb(calls, {
      'practiceRecords/member-1__area-50': {
        exists: true,
        data: () => ({ correctIds: existingIds, correctCount: 49, starCount: 0, badgeProgressCount: 99 })
      }
    }),
    getFirestoreFieldValue: () => ({
      serverTimestamp: () => ({ type: 'timestamp' }),
      arrayUnion: value => ({ op: 'arrayUnion', value }),
      increment: value => ({ op: 'increment', value })
    }),
    getFirebaseAuthUser: () => ({ uid: 'auth-1' }),
    getFirebaseFunctions: () => ({
      httpsCallable: name => async payload => {
        calls.push(['callable', name, payload]);
        return name === 'syncMemberTitles'
          ? { data: { awardedCount: 1 } }
          : { data: { rewardCoin: 3 } };
      }
    }),
    loadFeatureFlags: async () => ({ practiceRewardEnabled: true }),
    loadFirebaseQuizMeta: async () => ({ questionCount: 50 })
  });

  const result = await repository.savePracticeProgressAfterCorrectAnswer({
    practiceQuestionId: 'q50'
  }, {
    testShopUserId: 'test-user',
    normalizeFirebaseQuizId: value => value,
    getCurrentDataOwnerId: () => 'member-1',
    getCurrentModeId: () => 'practice',
    getCurrentQuizId: () => 'emoji-kpop',
    getCurrentQuestionSet: () => Array.from({ length: 50 }, () => ({})),
    getPracticeQuestionId: question => question.practiceQuestionId,
    getPracticeQuestionIdCandidates: question => [question.practiceQuestionId],
    getPracticeTargetForQuiz: () => ({ area: '인기', detail: '이모지:K-POP', areaKey: 'area-50', completionType: 'loop' }),
    getPracticeCorrectCoin: () => 3,
    buildPracticeProgressRecordId: (memberUserId, areaKey) => `${memberUserId}__${areaKey}`,
    buildPracticeSummaryUpdate: (existing, options) => ({ nextStarCount: options.nextStarCount, nextBadgeProgressCount: options.nextBadgeProgressCount }),
    buildPracticeBadgeUpdate: options => ({ badgeId: 'badge-50', nextCorrectCount: options.nextCorrectCount, nextBadgeProgressCount: options.nextBadgeProgressCount }),
    debugLog: () => {}
  });

  const recordWrite = calls.find(call => call[0] === 'set' && call[1] === 'practiceRecords/member-1__area-50');
  assert.equal(result.nextStarCount, 1);
  assert.equal(result.nextCorrectCount, 0);
  assert.equal(result.nextBadgeProgressCount, 100);
  assert.equal(result.fullRoundCompleted, true);
  assert.deepEqual(recordWrite[2].correctIds, []);
  assert(calls.some(call => call[0] === 'callable' && call[1] === 'syncMemberTitles'));
  assert(calls.some(call => call[0] === 'callable' && call[1] === 'grantPracticeBadgeCycleReward'));
}

async function run() {
  testBuildSpellingQuestionShufflesChoices();
  await testQuizRepositoryPorts();
  await testQuizPlayRepositoryDeps();
  await testQuizRepositoryReadsFirestoreQuestions();
  await testQuizRepositoryWritesRankingAndPracticeProgress();
  await testPracticeBadgeStarsEveryHundredCorrectAnswers();
  await testPracticeFullQuestionRoundResetsOnlySolvedIds();
  await testLegacyFullRoundKeepsLargeQuizProgressCredit();
  await testLegacyFullRoundOnTwoHundredQuestionQuizCanAwardSecondStar();
  await testShortPracticeQuizAwardsStarAfterRepeatedHundredCorrects();
  console.log('Infrastructure tests passed: quiz-repository');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
