(function (root) {
  function normalizeSnackAliasText(value) {
    return String(value || '')
      .trim()
      .replace(/[!！?？.,·ㆍ・:;'"“”‘’()[\]{}<>]/g, '')
      .replace(/\s+/g, ' ');
  }

  function buildSnackFoodAnswerAliases(answerText) {
    const answer = String(answerText || '').trim();
    const normalized = normalizeSnackAliasText(answer);
    const aliases = new Set([answer, normalized, normalized.replace(/\s+/g, '')].filter(Boolean));
    if(/abc/i.test(answer)) {
      aliases.add(answer.replace(/abc/ig, '에이비씨'));
      aliases.add(normalized.replace(/abc/ig, '에이비씨'));
    }
    normalized.split(/\s+/)
      .map(token => token.trim())
      .filter(token => token.length >= 3 || /^abc$/i.test(token))
      .forEach(token => {
        aliases.add(token);
        if(/^abc$/i.test(token)) aliases.add('에이비씨');
      });
    return Array.from(aliases).filter(alias => alias && alias !== answer);
  }

  function convertSnackFoodRankingQuestion(question) {
    if(!question || question.type !== 'imageChoice') return question;
    const choices = Array.isArray(question.choices) ? question.choices : [];
    const answerIndex = Number(question.answer);
    const answerText = String(question.answerText || choices[answerIndex] || '').trim();
    if(!answerText) return question;
    return {
      ...question,
      type: 'imageInput',
      answerText,
      aliases: Array.from(new Set([
        ...(Array.isArray(question.aliases) ? question.aliases : []),
        ...buildSnackFoodAnswerAliases(answerText)
      ].map(alias => String(alias || '').trim()).filter(Boolean)))
    };
  }

  function prepareQuizSessionQuestions(quizId, modeId, questions, deps = {}) {
    const normalizeQuizId = deps.normalizeFirebaseQuizId || (value => String(value || '').trim());
    const id = normalizeQuizId(quizId);
    if(modeId === 'ranking' && id === 'snack-food') {
      return questions.map(convertSnackFoodRankingQuestion);
    }
    return questions;
  }

  async function buildQuizSessionQuestions(options = {}, deps = {}) {
    const quizId = options.quizId || 'spelling';
    const modeId = options.modeId || 'practice';
    const normalizeQuizId = deps.normalizeFirebaseQuizId || (value => String(value || '').trim());
    const shuffleList = deps.shuffleList || (items => items.slice());
    const id = normalizeQuizId(quizId);
    const quizDataCache = deps.getFirebaseQuizDataCache?.() || {};
    const questionBank = deps.getQuestionBank?.() || {};
    const baseQuestions = quizDataCache[id] || questionBank[quizId] || questionBank[id] || questionBank.spelling;
    if(!Array.isArray(baseQuestions) || !baseQuestions.length) return null;
    if(modeId === 'ranking') return prepareQuizSessionQuestions(quizId, modeId, shuffleList(baseQuestions.slice()), deps);
    if(modeId !== 'practice') return baseQuestions;

    try {
      const solvedIds = await deps.loadSolvedPracticeIds?.(id);
      if(!solvedIds?.size) return shuffleList(baseQuestions.slice());
      const splitPracticeQuestions = deps.splitPracticeQuestionsBySolvedState || ((questions) => ({ unsolved: questions, solved: [] }));
      const { unsolved, solved } = splitPracticeQuestions(
        baseQuestions,
        solvedIds,
        deps.getPracticeQuestionIdCandidates
      );
      if(!unsolved.length) return shuffleList(baseQuestions.slice());
      return shuffleList(unsolved).concat(shuffleList(solved));
    } catch(error) {
      deps.warn?.('Practice unsolved-first order unavailable. Using random order.', error);
      return shuffleList(baseQuestions.slice());
    }
  }

  async function startQuizPlayFlow(options = {}, deps = {}) {
    const quizId = options.quizId || 'spelling';
    const modeId = options.modeId || 'practice';
    const rankingModeId = options.rankingModeId || 'normal';

    await deps.finishPopularUsageSession?.();
    const flags = await deps.loadFeatureFlags();
    if(!deps.isQuizEnabledByFlags(quizId, flags)) {
      deps.alert?.('이 퀴즈는 지금 점검 중입니다.');
      deps.showTownView();
      return { started: false, reason: 'quiz-disabled' };
    }
    if(modeId === 'ranking' && flags.rankingEnabled === false && !deps.isAdminMember?.()) {
      deps.alert?.('랭킹전은 지금 점검 중입니다.');
      deps.showQuizSelectView(quizId);
      return { started: false, reason: 'ranking-disabled' };
    }

    const access = await deps.ensurePopularQuizAccess(quizId);
    if(!access?.canAccess) {
      if(deps.isPopularQuiz?.(quizId)) deps.showSchoolView();
      else deps.showQuizSelectView(quizId);
      return { started: false, reason: 'access-denied' };
    }

    const sessionState = deps.createQuizPlaySessionState({
      quizId,
      modeId,
      rankingModeId: modeId === 'ranking'
        ? deps.getSupportedRankingModeForQuiz(quizId, rankingModeId)
        : 'normal',
      startedAtMs: deps.now?.() || Date.now()
    });
    deps.applyQuizPlaySessionState(sessionState);
    deps.clearRankingQuestionTimer();
    deps.clearRankingSessionTimer();
    deps.startPopularUsageSessionIfNeeded(quizId);
    deps.startRankingSessionTimerIfNeeded();

    try {
      await deps.buildFirebaseQuizData(quizId);
    } catch(error) {
      deps.warn?.('Firestore quiz load failed. Falling back to local QUESTION_BANK.', error);
    }

    const questions = await buildQuizSessionQuestions({ quizId, modeId }, deps).catch(error => {
      deps.warn?.('Quiz session shuffle failed. Using cached question order.', error);
      return null;
    });
    deps.setCurrentSessionQuestions(questions);
    deps.showQuizPlayViewOnly();
    deps.renderQuizPlayHeader();
    deps.renderQuestion();
    return { started: true, sessionState, questions };
  }

  const api = {
    buildSnackFoodAnswerAliases,
    buildQuizSessionQuestions,
    startQuizPlayFlow
  };

  root.DJ48QuizUsecases = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
