const assert = require('node:assert/strict');

globalThis.DJ48QuizPlay = {
  getRankingElapsedSeconds: startedAtMs => Math.floor((10000 - startedAtMs) / 1000),
  getQuizProgressText: model => `${model.modeId}:${model.questionIndex + 1}/${model.questionCount}:${model.rankingLives}`
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

testGetQuizProgressText();
testRankingTimerStateCallbacks();
console.log('Application tests passed: quiz-flow');
