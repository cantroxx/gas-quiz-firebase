(function (root) {
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
    if(modeId === 'ranking' && flags.rankingEnabled === false) {
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

    const questions = await deps.buildQuizSessionQuestions(quizId, modeId).catch(error => {
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
    startQuizPlayFlow
  };

  root.DJ48QuizUsecases = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
