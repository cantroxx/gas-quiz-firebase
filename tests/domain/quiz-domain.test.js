#!/usr/bin/env node

const assert = require('node:assert/strict');
const {
  getKoreanInitials,
  getQuestionHintText,
  getQuizAnswerSubmitResult,
  getQuizPlayKeyAction,
  splitPracticeQuestionsBySolvedState,
  getPracticeQuestionIdCandidates,
  getQuizProgressText,
  getKstDateKey,
  isAfter4PmKst,
  isPopularQuiz,
  isEducationUnlockQuiz,
  normalizeDailyUsageData,
  getDailyUsageAccessStatus,
  getPopularUsageNoticeText
} = require('../../public/js/domain/quiz-domain.js');

function testKoreanInitialsAndTinipingHint() {
  assert.equal(getKoreanInitials('하츄핑'), 'ㅎㅊㅍ');
  assert.equal(
    getQuestionHintText({ answerText: '하츄핑' }, { currentQuizId: 'tiniping' }),
    '초성 힌트: ㅎㅊㅍ'
  );
  assert.equal(
    getQuestionHintText({ hint: '보이지 않음', answerText: '정답' }, { currentQuizId: 'gmo' }),
    ''
  );
}

function testAnswerSubmitResult() {
  assert.deepEqual(
    getQuizAnswerSubmitResult({ choices: ['A', 'B'], answer: 1 }, { selectedChoiceIndex: 1 }),
    { canSubmit: true, isCorrect: true }
  );
  assert.deepEqual(
    getQuizAnswerSubmitResult(
      { type: 'textInput', answerText: '피카츄', aliases: ['피카추'] },
      { submittedAnswer: ' 피카추 ', normalizeQuizAnswer: value => String(value || '').trim() }
    ),
    { canSubmit: true, isCorrect: true }
  );
}

function testKeyboardAction() {
  assert.deepEqual(
    getQuizPlayKeyAction({
      key: '2',
      code: 'Digit2',
      target: { tagName: 'button' }
    }, { quizPlayActive: true, currentQuestionResolved: false }),
    { type: 'select-choice', choiceIndex: 1 }
  );
  assert.deepEqual(
    getQuizPlayKeyAction({
      key: 'Enter',
      target: {
        classList: { contains: name => name === 'quiz-answer-input' },
        value: '정답'
      }
    }, { quizPlayActive: true, currentQuestionResolved: false }),
    { type: 'submit-input', shouldSubmit: true }
  );
}

function testPracticeQuestionSplit() {
  const questions = [
    { practiceQuestionId: 'q1', question: 'A' },
    { questionId: 'q2', legacyPracticeIds: ['old-q2'], question: 'B' },
    { answerText: 'C' }
  ];
  const result = splitPracticeQuestionsBySolvedState(
    questions,
    new Set(['old-q2']),
    getPracticeQuestionIdCandidates
  );
  assert.deepEqual(result.unsolved.map(item => item.question), ['A', undefined]);
  assert.deepEqual(result.solved.map(item => item.question), ['B']);
}

function testProgressText() {
  assert.equal(getQuizProgressText({ questionIndex: 0, questionCount: 5, modeId: 'practice' }), '문제 1 / 5');
  assert.equal(getQuizProgressText({ questionIndex: 2, questionCount: 5, modeId: 'ranking', rankingLives: 2 }), '문제 3 / 5 · 생명력 ♥♥');
}

function testPopularQuizPolicy() {
  const quizCatalog = {
    'dad-joke': { subjectId: 'popular' },
    spelling: { subjectId: 'korean' },
    gmo: { subjectId: 'science' }
  };
  assert.equal(isPopularQuiz('dad-joke', { quizCatalog }), true);
  assert.equal(isEducationUnlockQuiz('spelling', { quizCatalog }), true);
  assert.equal(isEducationUnlockQuiz('gmo', { quizCatalog }), true);
}

function testDailyUsagePolicy() {
  assert.equal(getKstDateKey(new Date('2026-06-15T15:00:00.000Z')), '2026-06-16');
  assert.equal(isAfter4PmKst(new Date('2026-06-16T07:00:00.000Z')), true);
  assert.deepEqual(
    normalizeDailyUsageData({ funSeconds: 61.4, after4FunSeconds: -2 }, { memberUserId: 'm1', dateKey: '2026-06-16' }),
    {
      recordId: 'm1__2026-06-16',
      memberUserId: 'm1',
      userId: 'm1',
      date: '2026-06-16',
      funSeconds: 61,
      after4FunSeconds: 0,
      eduCorrectCount: 0,
      unlockBaseEduCorrectCount: 0
    }
  );
  const status = getDailyUsageAccessStatus({
    funSeconds: 1200,
    after4FunSeconds: 0,
    eduCorrectCount: 1,
    unlockBaseEduCorrectCount: 0
  }, {
    softLimitSeconds: 1200,
    after4HardLimitSeconds: 600,
    unlockCorrectCount: 3
  });
  assert.equal(status.softLocked, true);
  assert.equal(status.locked, true);
  assert.equal(status.unlockRemainingCorrect, 2);
  assert.equal(getPopularUsageNoticeText(status, {
    softLimitSeconds: 1200,
    after4HardLimitSeconds: 600,
    now: new Date('2026-06-16T06:00:00.000Z')
  }), '오늘은 마감');
}

function run() {
  testKoreanInitialsAndTinipingHint();
  testAnswerSubmitResult();
  testKeyboardAction();
  testPracticeQuestionSplit();
  testProgressText();
  testPopularQuizPolicy();
  testDailyUsagePolicy();
  console.log('Domain tests passed: quiz-domain');
}

run();
