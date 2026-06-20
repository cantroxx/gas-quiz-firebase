(function (root, factory) {
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.DJ48QuizDomain = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  function getKoreanInitials(value) {
    const initials = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    return String(value || '').split('').map(char => {
      const code = char.charCodeAt(0);
      if(code >= 0xac00 && code <= 0xd7a3) return initials[Math.floor((code - 0xac00) / 588)] || char;
      return /\s/.test(char) ? ' ' : char;
    }).join('');
  }

  function getCurrentQuestionAnswerText(question) {
    if(!question) return '';
    if(question.answerText) return String(question.answerText).trim();
    if(Array.isArray(question.choices) && Number.isInteger(question.answer)) {
      return String(question.choices[question.answer] || '').trim();
    }
    return '';
  }

  function getQuestionHintText(question, deps = {}) {
    const normalizeQuizId = deps.normalizeFirebaseQuizId || (value => String(value || '').trim());
    const quizId = normalizeQuizId(deps.currentQuizId);
    const answerText = getCurrentQuestionAnswerText(question);
    if(quizId === 'gmo' || quizId === 'time_store' || quizId === 'reading') return '';
    if(quizId === 'tiniping' && answerText) {
      return `초성 힌트: ${getKoreanInitials(answerText)}`;
    }
    return String(question?.hint || '').trim();
  }

  function getWrongAnswerFeedbackText(question, rankingEndedByWrongAnswer, overrideMessage) {
    const answerText = getCurrentQuestionAnswerText(question);
    const parts = [];
    if(overrideMessage) parts.push(overrideMessage);
    if(answerText) parts.push(`정답은 '${answerText}'입니다.`);
    if(rankingEndedByWrongAnswer) parts.push('생명력이 모두 소진되어 랭킹전이 종료됩니다.');
    if(parts.length) return parts.join(' ');
    return '괜찮아요. 다음 문제에서 다시 확인해 봅니다.';
  }

  function isTypingTarget(target) {
    const tagName = String(target?.tagName || '').toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || target?.isContentEditable === true;
  }

  function getNumericChoiceKey(event) {
    const key = String(event?.key || '');
    if(['1', '2', '3', '4'].includes(key)) return Number(key);
    const code = String(event?.code || '');
    const digitMatch = code.match(/^(Digit|Numpad)([1-4])$/);
    return digitMatch ? Number(digitMatch[2]) : 0;
  }

  function getQuizPlayKeyAction(event, options = {}) {
    if(!options.quizPlayActive || event?.defaultPrevented) return { type: 'none' };
    const key = String(event?.key || '');
    const target = event?.target || null;
    const input = target?.classList?.contains('quiz-answer-input') ? target : null;

    if(input && key === 'Enter') {
      return {
        type: 'submit-input',
        shouldSubmit: !options.currentQuestionResolved && !!String(input.value || '').trim()
      };
    }

    if(options.currentQuestionResolved && key === 'Enter') {
      return { type: 'advance-after-result' };
    }

    if(isTypingTarget(target)) return { type: 'none' };
    const choiceNumber = getNumericChoiceKey(event);
    if(!choiceNumber) return { type: 'none' };
    return {
      type: 'select-choice',
      choiceIndex: choiceNumber - 1
    };
  }

  function canSelectQuizChoice(question, options = {}) {
    if(options.currentQuestionResolved) return false;
    if(!question) return false;
    return question.type !== 'imageInput' && question.type !== 'textInput';
  }

  function getQuizAnswerSubmitResult(question, options = {}) {
    if(!question) return { canSubmit: false, isCorrect: false };
    if(question.type === 'imageInput' || question.type === 'textInput') {
      const normalizeAnswer = typeof options.normalizeQuizAnswer === 'function'
        ? options.normalizeQuizAnswer
        : value => String(value || '').trim();
      const submitted = normalizeAnswer(options.submittedAnswer);
      if(!submitted) return { canSubmit: false, isCorrect: false };
      const acceptedAnswers = [
        question.answerText,
        ...(Array.isArray(question.aliases) ? question.aliases : [])
      ].map(normalizeAnswer).filter(Boolean);
      return {
        canSubmit: true,
        isCorrect: acceptedAnswers.includes(submitted)
      };
    }
    if(options.selectedChoiceIndex === null || options.selectedChoiceIndex === undefined) {
      return { canSubmit: false, isCorrect: false };
    }
    return {
      canSubmit: true,
      isCorrect: options.selectedChoiceIndex === question.answer
    };
  }

  function shouldSavePracticeProgress(options = {}) {
    return !!options.isCorrect && options.modeId === 'practice';
  }

  function getRankingWrongAnswerState(options = {}) {
    const currentLives = Math.max(0, Number(options.currentRankingLives) || 0);
    const isRankingWrongAnswer = options.modeId === 'ranking' && !options.isCorrect;
    const nextRankingLives = isRankingWrongAnswer ? Math.max(0, currentLives - 1) : currentLives;
    return {
      nextRankingLives,
      rankingEndedByWrongAnswer: isRankingWrongAnswer && nextRankingLives <= 0
    };
  }

  function getNextQuestionAction(options = {}) {
    const nextQuestionIndex = Math.max(0, Number(options.nextQuestionIndex) || 0);
    const questionCount = Math.max(0, Number(options.questionCount) || 0);
    return nextQuestionIndex >= questionCount ? 'complete' : 'render-question';
  }

  function resolveCurrentQuestionSet(options = {}) {
    if(Array.isArray(options.currentSessionQuestions) && options.currentSessionQuestions.length) return options.currentSessionQuestions;
    const firebaseQuizDataCache = options.firebaseQuizDataCache || {};
    const questionBank = options.questionBank || {};
    return firebaseQuizDataCache[options.firebaseQuizId]
      || questionBank[options.currentQuizId]
      || questionBank.spelling
      || [];
  }

  function hasSolvedPracticeQuestion(question, solvedIds, getPracticeQuestionIdCandidates) {
    if(!solvedIds || !solvedIds.size || typeof getPracticeQuestionIdCandidates !== 'function') return false;
    return getPracticeQuestionIdCandidates(question).some(id => solvedIds.has(id));
  }

  function splitPracticeQuestionsBySolvedState(baseQuestions, solvedIds, getPracticeQuestionIdCandidates) {
    const unsolved = [];
    const solved = [];
    (Array.isArray(baseQuestions) ? baseQuestions : []).forEach(question => {
      if(hasSolvedPracticeQuestion(question, solvedIds, getPracticeQuestionIdCandidates)) solved.push(question);
      else unsolved.push(question);
    });
    return { unsolved, solved };
  }

  function getPracticeQuestionId(question) {
    return String(question?.practiceQuestionId || question?.questionId || question?.answerText || question?.question || '').trim();
  }

  function getPracticeQuestionIdCandidates(question) {
    const candidates = [
      question?.practiceQuestionId,
      ...(Array.isArray(question?.legacyPracticeIds) ? question.legacyPracticeIds : []),
      question?.questionId,
      question?.answerText,
      question?.question
    ].map(id => String(id || '').trim()).filter(Boolean);
    return Array.from(new Set(candidates));
  }

  function getQuizPlayHeaderTitle(options = {}) {
    const quizTitle = String(options.quizTitle || '').replace(' 퀴즈', '');
    const modeTitle = String(options.modeTitle || '');
    const rankingModeLabel = String(options.rankingModeLabel || '');
    const modeLabel = options.isRanking && rankingModeLabel ? `${modeTitle} · ${rankingModeLabel}` : modeTitle;
    return `${quizTitle} ${modeLabel}`.trim();
  }

  function getQuizProgressText(options = {}) {
    const questionIndex = Math.max(0, Number(options.questionIndex) || 0);
    const questionCount = Math.max(0, Number(options.questionCount) || 0);
    const base = `문제 ${questionIndex + 1} / ${questionCount}`;
    if(options.modeId !== 'ranking') return base;
    const rankingLives = Math.max(0, Number(options.rankingLives) || 0);
    return `${base} · 생명력 ${'♥'.repeat(rankingLives)}`;
  }

  function getKstDateKey(date = new Date()) {
    const shifted = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
  }

  function isAfter4PmKst(date = new Date()) {
    const shifted = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return shifted.getUTCHours() >= 16;
  }

  function getQuizCatalogEntry(quizId, deps = {}) {
    const normalizeQuizId = deps.normalizeFirebaseQuizId || (value => String(value || '').trim());
    const quizCatalog = deps.quizCatalog || {};
    return quizCatalog[normalizeQuizId(quizId)] || quizCatalog[quizId] || {};
  }

  function isPopularQuiz(quizId, deps = {}) {
    return getQuizCatalogEntry(quizId, deps).subjectId === 'popular';
  }

  function isEducationUnlockQuiz(quizId, deps = {}) {
    return ['korean', 'social', 'math', 'science'].includes(getQuizCatalogEntry(quizId, deps).subjectId);
  }

  function buildDailyUsageRecordId(memberUserId, dateKey = getKstDateKey()) {
    return `${memberUserId}__${dateKey}`;
  }

  function normalizeDailyUsageData(data = {}, options = {}) {
    const memberUserId = options.memberUserId || '';
    const dateKey = options.dateKey || getKstDateKey();
    return {
      recordId: data.recordId || buildDailyUsageRecordId(memberUserId, dateKey),
      memberUserId: data.memberUserId || memberUserId || '',
      userId: data.userId || data.memberUserId || memberUserId || '',
      date: data.date || dateKey,
      funSeconds: Math.max(0, Math.round(Number(data.funSeconds) || 0)),
      after4FunSeconds: Math.max(0, Math.round(Number(data.after4FunSeconds) || 0)),
      eduCorrectCount: Math.max(0, Math.round(Number(data.eduCorrectCount) || 0)),
      unlockBaseEduCorrectCount: Math.max(0, Math.round(Number(data.unlockBaseEduCorrectCount) || 0))
    };
  }

  function getDailyUsageAccessStatus(usage = {}, limits = {}) {
    const softLimitSeconds = Math.max(0, Number(limits.softLimitSeconds) || 0);
    const after4HardLimitSeconds = Math.max(0, Number(limits.after4HardLimitSeconds) || 0);
    const unlockCorrectCount = Math.max(0, Number(limits.unlockCorrectCount) || 0);
    const funSeconds = Number(usage.funSeconds) || 0;
    const after4FunSeconds = Number(usage.after4FunSeconds) || 0;
    const unlockBase = Math.max(0, Number(usage.unlockBaseEduCorrectCount) || 0);
    const unlockProgress = funSeconds >= softLimitSeconds
      ? Math.max(0, (Number(usage.eduCorrectCount) || 0) - unlockBase)
      : 0;
    const softLocked = funSeconds >= softLimitSeconds && unlockProgress < unlockCorrectCount;
    const hardLocked = after4FunSeconds >= after4HardLimitSeconds;
    const locked = softLocked || hardLocked;
    return {
      ...usage,
      unlockProgress,
      unlockRemainingCorrect: Math.max(0, unlockCorrectCount - unlockProgress),
      softLocked,
      hardLocked,
      locked,
      message: hardLocked
        ? '오늘의 인기퀴즈 이용 시간이 모두 끝났어요. 국어·수학·사회 퀴즈를 풀며 내일 다시 도전해 주세요.'
        : (softLocked ? `인기퀴즈 시간이 끝났어요. 국어·수학·사회 퀴즈에서 ${Math.max(0, unlockCorrectCount - unlockProgress)}문제를 더 맞히면 다시 이용할 수 있어요.` : '')
    };
  }

  function getPopularUsageNoticeText(status, options = {}) {
    if(!status) return '인기퀴즈 이용 시간을 확인하지 못했어요.';
    if(status.locked) return '오늘은 마감';
    const softLimitSeconds = Math.max(0, Number(options.softLimitSeconds) || 0);
    const after4HardLimitSeconds = Math.max(0, Number(options.after4HardLimitSeconds) || 0);
    const baseRemaining = Math.max(0, softLimitSeconds - (Number(status.funSeconds) || 0));
    const after4Remaining = Math.max(0, after4HardLimitSeconds - (Number(status.after4FunSeconds) || 0));
    const effectiveRemaining = isAfter4PmKst(options.now || new Date()) ? Math.min(baseRemaining, after4Remaining) : baseRemaining;
    return effectiveRemaining >= 60 ? '이용가능' : '끝이 보여요';
  }

  return {
    getKoreanInitials,
    getCurrentQuestionAnswerText,
    getQuestionHintText,
    getWrongAnswerFeedbackText,
    isTypingTarget,
    getNumericChoiceKey,
    getQuizPlayKeyAction,
    canSelectQuizChoice,
    getQuizAnswerSubmitResult,
    shouldSavePracticeProgress,
    getRankingWrongAnswerState,
    getNextQuestionAction,
    resolveCurrentQuestionSet,
    hasSolvedPracticeQuestion,
    splitPracticeQuestionsBySolvedState,
    getPracticeQuestionId,
    getPracticeQuestionIdCandidates,
    getQuizPlayHeaderTitle,
    getQuizProgressText,
    getKstDateKey,
    isAfter4PmKst,
    isPopularQuiz,
    isEducationUnlockQuiz,
    buildDailyUsageRecordId,
    normalizeDailyUsageData,
    getDailyUsageAccessStatus,
    getPopularUsageNoticeText
  };
});
