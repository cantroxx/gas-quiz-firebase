const assert = require('node:assert/strict');

globalThis.DJ48QuizPlay = {
  getRankingElapsedSeconds: startedAtMs => Math.floor((10000 - startedAtMs) / 1000),
  getQuizProgressText: model => `${model.modeId}:${model.questionIndex + 1}/${model.questionCount}:${model.rankingLives}`,
  savePracticeProgressAfterCorrectAnswer: (question, deps) => ({
    questionId: question.id,
    testShopUserId: deps.testShopUserId
  }),
  saveRankingRecordOnQuizComplete: deps => ({
    testShopUserId: deps.testShopUserId
  }),
  submitAnswer: payload => payload,
  showQuizResult: (isCorrect, overrideMessage, payload) => ({ isCorrect, overrideMessage, payload }),
  nextQuestion: payload => payload,
  showQuizComplete: (options, payload) => ({ options, payload })
};
globalThis.DJ48QuizRender = {
  renderQuestion: (deps, callbacks) => ({ deps, callbacks })
};

const flow = require('../../public/js/features/quiz-flow.js');

function testGetQuizProgressText() {
  const text = flow.getQuizProgressText({
    getCurrentQuestionIndex: () => 2,
    getCurrentQuestionSet: () => [{}, {}, {}, {}],
    getCurrentModeId: () => 'ranking',
    getCurrentRankingLives: () => 1
  });

  assert.equal(text, 'ranking:3/4:1');
}

function testRankingTimerStateCallbacks() {
  const calls = [];
  const state = {
    getCurrentRankingQuestionTimer: () => 12,
    getCurrentRankingSessionTimer: () => null,
    setCurrentRankingQuestionTimer: timer => calls.push(['question', timer]),
    setCurrentRankingSessionTimer: timer => calls.push(['session', timer])
  };

  const originalClearInterval = globalThis.clearInterval;
  globalThis.clearInterval = timer => calls.push(['clear', timer]);
  try {
    const callbacks = flow.getRankingTimerStateCallbacks(state);
    callbacks.clearRankingQuestionTimer();
    callbacks.clearRankingSessionTimer();
    callbacks.setCurrentRankingQuestionTimer(20);
    callbacks.setCurrentRankingSessionTimer(30);
  } finally {
    globalThis.clearInterval = originalClearInterval;
  }

  assert.deepEqual(calls, [
    ['clear', 12],
    ['question', null],
    ['session', null],
    ['question', 20],
    ['session', 30]
  ]);
}

function testSubmitQuizAnswer() {
  const result = flow.submitQuizAnswer({ mode: 'practice' }, {
    getQuizPlayDeps: () => ({ owner: 'member-1' }),
    getQuizPlayDomDeps: () => ({ getQuizAnswerInput: () => 'input' }),
    testShopUserId: 'test-user',
    clearRankingQuestionTimer: () => {},
    normalizeQuizAnswer: value => value,
    recordEducationCorrectForPopularUnlock: () => {},
    showQuizResult: () => {},
    renderPracticeSaveStatus: () => {},
    isFirestoreQuotaExceededError: () => false
  });

  assert.equal(result.mode, 'practice');
  assert.equal(result.getQuizAnswerInput(), 'input');
  assert.equal(typeof result.savePracticeProgressAfterCorrectAnswer, 'function');
  assert.deepEqual(result.savePracticeProgressAfterCorrectAnswer({ id: 'q1' }), {
    questionId: 'q1',
    testShopUserId: 'test-user'
  });
}

function testRenderQuizQuestion() {
  const deps = { quizId: 'spelling' };
  const callbacks = {
    getQuestionHintText: () => 'hint',
    getQuizProgressText: () => '1/10',
    startRankingQuestionTimerIfNeeded: () => {}
  };
  const result = flow.renderQuizQuestion(deps, callbacks);

  assert.equal(result.deps, deps);
  assert.equal(result.callbacks.getQuestionHintText(), 'hint');
  assert.equal(result.callbacks.getQuizProgressText(), '1/10');
  assert.equal(typeof result.callbacks.startRankingQuestionTimerIfNeeded, 'function');
}

function testQuizResultNextAndCompleteWrappers() {
  const root = {};
  const result = flow.showQuizResult(true, 'ok', { quizId: 'spelling' }, {
    getQuizPlayRoot: () => root
  });
  assert.equal(result.isCorrect, true);
  assert.equal(result.overrideMessage, 'ok');
  assert.equal(result.payload.quizId, 'spelling');
  assert.equal(result.payload.getQuizPlayRoot(), root);

  const next = flow.nextQuizQuestion({ index: 1 }, {
    clearRankingQuestionTimer: () => 'clear',
    showQuizComplete: () => 'complete',
    renderQuestion: () => 'render'
  });
  assert.equal(next.index, 1);
  assert.equal(next.clearRankingQuestionTimer(), 'clear');
  assert.equal(next.showQuizComplete(), 'complete');
  assert.equal(next.renderQuestion(), 'render');

  const calls = [];
  const complete = flow.showQuizComplete({ forced: true }, { mode: 'ranking' }, {
    getQuizPlayDeps: () => ({ owner: 'member-1' }),
    testShopUserId: 'test-user',
    clearRankingQuestionTimer: () => calls.push('clear-question'),
    clearRankingSessionTimer: () => calls.push('clear-session'),
    finishPopularUsageSession: () => calls.push('finish-popular'),
    getQuizPlayRoot: () => root,
    renderRankingSaveStatus: () => 'rank-status'
  });
  assert.deepEqual(calls, ['clear-question', 'clear-session', 'finish-popular']);
  assert.deepEqual(complete.options, { forced: true });
  assert.equal(complete.payload.mode, 'ranking');
  assert.equal(complete.payload.getQuizPlayRoot(), root);
  assert.deepEqual(complete.payload.saveRankingRecordOnQuizComplete(), { testShopUserId: 'test-user' });
  assert.equal(complete.payload.renderRankingSaveStatus(), 'rank-status');
}

testGetQuizProgressText();
testRankingTimerStateCallbacks();
testSubmitQuizAnswer();
testRenderQuizQuestion();
testQuizResultNextAndCompleteWrappers();
console.log('Application tests passed: quiz-flow');
