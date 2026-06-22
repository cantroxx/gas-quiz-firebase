const assert = require('assert');
const quizUsecases = require('../../public/js/application/quiz-usecases.js');

function createBaseDeps(overrides = {}) {
  const calls = [];
  return {
    calls,
    deps: {
      finishPopularUsageSession: async () => calls.push(['finishPopular']),
      loadFeatureFlags: async () => ({ rankingEnabled: true }),
      isQuizEnabledByFlags: () => true,
      alert: message => calls.push(['alert', message]),
      showTownView: () => calls.push(['town']),
      showQuizSelectView: quizId => calls.push(['select', quizId]),
      ensurePopularQuizAccess: async () => ({ canAccess: true }),
      isPopularQuiz: () => false,
      showSchoolView: () => calls.push(['school']),
      createQuizPlaySessionState: options => ({ ...options, session: true }),
      getSupportedRankingModeForQuiz: (_quizId, modeId) => modeId,
      applyQuizPlaySessionState: state => calls.push(['apply', state]),
      clearRankingQuestionTimer: () => calls.push(['clearQuestion']),
      clearRankingSessionTimer: () => calls.push(['clearSession']),
      startPopularUsageSessionIfNeeded: quizId => calls.push(['popularStart', quizId]),
      startRankingSessionTimerIfNeeded: () => calls.push(['rankingTimer']),
      buildFirebaseQuizData: async quizId => calls.push(['buildFirebase', quizId]),
      normalizeFirebaseQuizId: quizId => quizId,
      shuffleList: items => items.slice(),
      getFirebaseQuizDataCache: () => ({}),
      getQuestionBank: () => ({ spelling: ['q1'] }),
      loadSolvedPracticeIds: async () => new Set(),
      splitPracticeQuestionsBySolvedState: questions => ({ unsolved: questions, solved: [] }),
      getPracticeQuestionIdCandidates: question => [question],
      setCurrentSessionQuestions: questions => calls.push(['questions', questions]),
      showQuizPlayViewOnly: () => calls.push(['showQuiz']),
      renderQuizPlayHeader: () => calls.push(['header']),
      renderQuestion: () => calls.push(['question']),
      now: () => 1000,
      warn: () => {},
      ...overrides
    }
  };
}

async function testStartQuizPlayFlowSuccess() {
  const { calls, deps } = createBaseDeps();
  const result = await quizUsecases.startQuizPlayFlow({
    quizId: 'spelling',
    modeId: 'ranking',
    rankingModeId: 'speed'
  }, deps);

  assert.equal(result.started, true);
  assert.deepEqual(result.questions, ['q1']);
  assert.deepEqual(calls.map(call => call[0]), [
    'finishPopular',
    'apply',
    'clearQuestion',
    'clearSession',
    'popularStart',
    'rankingTimer',
    'buildFirebase',
    'questions',
    'showQuiz',
    'header',
    'question'
  ]);
  assert.equal(calls[1][1].rankingModeId, 'speed');
}

async function testDisabledQuizRedirectsTown() {
  const { calls, deps } = createBaseDeps({
    isQuizEnabledByFlags: () => false
  });
  const result = await quizUsecases.startQuizPlayFlow({ quizId: 'spelling', modeId: 'practice' }, deps);

  assert.equal(result.started, false);
  assert.equal(result.reason, 'quiz-disabled');
  assert.ok(calls.some(call => call[0] === 'town'));
}

async function testRankingDisabledRedirectsSelect() {
  const { calls, deps } = createBaseDeps({
    loadFeatureFlags: async () => ({ rankingEnabled: false })
  });
  const result = await quizUsecases.startQuizPlayFlow({ quizId: 'spelling', modeId: 'ranking' }, deps);

  assert.equal(result.started, false);
  assert.equal(result.reason, 'ranking-disabled');
  assert.deepEqual(calls.find(call => call[0] === 'select'), ['select', 'spelling']);
}

async function testAdminCanStartRankingWhenRankingDisabled() {
  const { calls, deps } = createBaseDeps({
    loadFeatureFlags: async () => ({ rankingEnabled: false }),
    isAdminMember: () => true
  });
  const result = await quizUsecases.startQuizPlayFlow({ quizId: 'spelling', modeId: 'ranking' }, deps);

  assert.equal(result.started, true);
  assert.ok(calls.some(call => call[0] === 'showQuiz'));
  assert.ok(!calls.some(call => call[0] === 'select'));
}

async function testAccessDeniedRedirectsPopularToSchool() {
  const { calls, deps } = createBaseDeps({
    ensurePopularQuizAccess: async () => ({ canAccess: false }),
    isPopularQuiz: () => true
  });
  const result = await quizUsecases.startQuizPlayFlow({ quizId: 'dad-joke', modeId: 'practice' }, deps);

  assert.equal(result.started, false);
  assert.equal(result.reason, 'access-denied');
  assert.ok(calls.some(call => call[0] === 'school'));
}

async function testBuildQuizSessionQuestionsUsesCachedFirebaseQuestions() {
  const questions = await quizUsecases.buildQuizSessionQuestions({
    quizId: 'spelling',
    modeId: 'ranking'
  }, {
    normalizeFirebaseQuizId: quizId => quizId,
    getFirebaseQuizDataCache: () => ({ spelling: ['firebase-q1', 'firebase-q2'] }),
    getQuestionBank: () => ({ spelling: ['local-q1'] }),
    shuffleList: items => items.reverse()
  });

  assert.deepEqual(questions, ['firebase-q2', 'firebase-q1']);
}

async function testSnackFoodRankingUsesImageInputWithAliases() {
  const questions = await quizUsecases.buildQuizSessionQuestions({
    quizId: 'snack-food',
    modeId: 'ranking'
  }, {
    normalizeFirebaseQuizId: quizId => quizId,
    getFirebaseQuizDataCache: () => ({
      'snack-food': [{
        type: 'imageChoice',
        questionId: 'snack-food-027',
        imageUrl: 'https://example.com/abc.png',
        choices: ['가나', 'ABC 초콜릿', '빼빼로', '빈츠'],
        answer: 1
      }]
    }),
    getQuestionBank: () => ({}),
    shuffleList: items => items.slice()
  });

  assert.equal(questions.length, 1);
  assert.equal(questions[0].type, 'imageInput');
  assert.equal(questions[0].answerText, 'ABC 초콜릿');
  assert.ok(questions[0].aliases.includes('ABC초콜릿'));
  assert.ok(questions[0].aliases.includes('에이비씨 초콜릿'));
  assert.ok(questions[0].aliases.includes('에이비씨'));
}

async function testSnackFoodPracticeKeepsImageChoice() {
  const baseQuestion = {
    type: 'imageChoice',
    imageUrl: 'https://example.com/snack.png',
    choices: ['짱셔요!', '목캔디', '제크', '웨하스'],
    answer: 0
  };
  const questions = await quizUsecases.buildQuizSessionQuestions({
    quizId: 'snack-food',
    modeId: 'practice'
  }, {
    normalizeFirebaseQuizId: quizId => quizId,
    getFirebaseQuizDataCache: () => ({ 'snack-food': [baseQuestion] }),
    getQuestionBank: () => ({}),
    loadSolvedPracticeIds: async () => new Set(),
    splitPracticeQuestionsBySolvedState: questions => ({ unsolved: questions, solved: [] }),
    shuffleList: items => items.slice()
  });

  assert.equal(questions[0].type, 'imageChoice');
}

async function testBuildQuizSessionQuestionsOrdersUnsolvedPracticeFirst() {
  const q1 = { practiceQuestionId: 'q1' };
  const q2 = { practiceQuestionId: 'q2' };
  const questions = await quizUsecases.buildQuizSessionQuestions({
    quizId: 'spelling',
    modeId: 'practice'
  }, {
    normalizeFirebaseQuizId: quizId => quizId,
    getFirebaseQuizDataCache: () => ({}),
    getQuestionBank: () => ({ spelling: [q1, q2] }),
    loadSolvedPracticeIds: async () => new Set(['q1']),
    splitPracticeQuestionsBySolvedState: (baseQuestions, solvedIds) => ({
      unsolved: baseQuestions.filter(question => !solvedIds.has(question.practiceQuestionId)),
      solved: baseQuestions.filter(question => solvedIds.has(question.practiceQuestionId))
    }),
    shuffleList: items => items.slice()
  });

  assert.deepEqual(questions, [q2, q1]);
}

async function run() {
  await testStartQuizPlayFlowSuccess();
  await testDisabledQuizRedirectsTown();
  await testRankingDisabledRedirectsSelect();
  await testAdminCanStartRankingWhenRankingDisabled();
  await testAccessDeniedRedirectsPopularToSchool();
  await testBuildQuizSessionQuestionsUsesCachedFirebaseQuestions();
  await testSnackFoodRankingUsesImageInputWithAliases();
  await testSnackFoodPracticeKeepsImageChoice();
  await testBuildQuizSessionQuestionsOrdersUnsolvedPracticeFirst();
  console.log('Application tests passed: quiz-usecases');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
