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
  canSelectQuizChoice: (question, options) => !!question && !options.currentQuestionResolved,
  applyQuizChoiceSelection: payload => !!payload.button,
  getQuizPlayKeyAction: event => event.action,
  startRankingSessionTimerIfNeeded: payload => payload,
  handleRankingSessionTimeout: payload => payload,
  startRankingQuestionTimerIfNeeded: payload => payload,
  handleRankingTimeout: payload => payload,
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

function testRankingTimerController() {
  const calls = [];
  const state = {
    getCurrentRankingQuestionTimer: () => null,
    getCurrentRankingSessionTimer: () => null,
    setCurrentRankingQuestionTimer: timer => calls.push(['question', timer]),
    setCurrentRankingSessionTimer: timer => calls.push(['session', timer])
  };
  const root = {};
  const progress = {};
  const controller = flow.createRankingTimerController(state, {
    getQuizPlayDeps: () => ({ mode: 'ranking' }),
    getQuizPlayDomDeps: () => ({
      getQuizPlayRoot: () => root,
      getQuizProgressElement: () => progress
    }),
    getQuizProgressText: () => '1/10',
    showQuizComplete: () => 'complete',
    showQuizResult: () => 'result'
  });

  const session = controller.startRankingSessionTimerIfNeeded();
  assert.equal(session.mode, 'ranking');
  assert.equal(typeof session.clearRankingSessionTimer, 'function');
  assert.equal(typeof session.handleRankingSessionTimeout, 'function');

  const sessionTimeout = controller.handleRankingSessionTimeout();
  assert.equal(sessionTimeout.getQuizPlayRoot(), root);
  assert.equal(sessionTimeout.showQuizComplete(), 'complete');

  const question = controller.startRankingQuestionTimerIfNeeded();
  assert.equal(question.getQuizProgressElement(), progress);
  assert.equal(question.getQuizProgressText(), '1/10');
  assert.equal(typeof question.handleRankingTimeout, 'function');

  const timeout = controller.handleRankingTimeout();
  assert.equal(timeout.getQuizPlayRoot(), root);
  assert.equal(timeout.showQuizResult(), 'result');
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

function testSelectChoiceByIndex() {
  const calls = [];
  const selected = flow.selectChoiceByIndex(1, { submitImmediately: true }, {
    getCurrentQuestionSet: () => [{ id: 'q1' }, { id: 'q2' }],
    getCurrentQuestionIndex: () => 1,
    getCurrentQuestionResolved: () => false,
    setSelectedChoiceIndex: index => calls.push(['set', index])
  }, {
    getChoiceButton: index => ({ index }),
    getChoiceButtons: () => [{}, {}],
    getSubmitButton: () => ({}),
    submitAnswer: () => calls.push(['submit'])
  });

  assert.equal(selected, true);
  assert.deepEqual(calls, [['set', 1], ['submit']]);
}

function testHandleQuizPlayKeydownAdvance() {
  const calls = [];
  const event = {
    action: { type: 'advance-after-result' },
    preventDefault: () => calls.push(['prevent'])
  };
  const action = flow.handleQuizPlayKeydown(event, {}, {
    isQuizPlayActive: () => true,
    getNextQuestionButton: () => ({ disabled: false, dataset: { completeQuiz: '1' } }),
    showQuizComplete: () => calls.push(['complete']),
    nextQuestion: () => calls.push(['next'])
  });

  assert.deepEqual(action, { type: 'advance-after-result' });
  assert.deepEqual(calls, [['prevent'], ['complete']]);
}

testGetQuizProgressText();
testRankingTimerStateCallbacks();
testRankingTimerController();
testSubmitQuizAnswer();
testRenderQuizQuestion();
testQuizResultNextAndCompleteWrappers();
testSelectChoiceByIndex();
testHandleQuizPlayKeydownAdvance();
console.log('Application tests passed: quiz-flow');
