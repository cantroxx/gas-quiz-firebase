(function (root) {
  function clearRankingQuestionTimer(state) {
    const timer = state.getCurrentRankingQuestionTimer();
    if(timer) clearInterval(timer);
    state.setCurrentRankingQuestionTimer(null);
  }

  function clearRankingSessionTimer(state) {
    const timer = state.getCurrentRankingSessionTimer();
    if(timer) clearInterval(timer);
    state.setCurrentRankingSessionTimer(null);
  }

  function getRankingTimerStateCallbacks(state) {
    return {
      clearRankingQuestionTimer: () => clearRankingQuestionTimer(state),
      clearRankingSessionTimer: () => clearRankingSessionTimer(state),
      setCurrentRankingQuestionTimer: timer => state.setCurrentRankingQuestionTimer(timer),
      setCurrentRankingSessionTimer: timer => state.setCurrentRankingSessionTimer(timer)
    };
  }

  function getRankingElapsedSeconds(deps) {
    return root.DJ48QuizPlay.getRankingElapsedSeconds(deps.getCurrentQuizStartedAtMs());
  }

  function getQuizProgressText(deps = {}) {
    return root.DJ48QuizPlay.getQuizProgressText({
      questionIndex: deps.getCurrentQuestionIndex?.(),
      questionCount: deps.getCurrentQuestionSet?.().length || 0,
      modeId: deps.getCurrentModeId?.(),
      rankingLives: deps.getCurrentRankingLives?.()
    });
  }

  function startRankingSessionTimerIfNeeded(deps, callbacks) {
    return root.DJ48QuizPlay.startRankingSessionTimerIfNeeded({
      ...deps,
      clearRankingSessionTimer: callbacks.clearRankingSessionTimer,
      setCurrentRankingSessionTimer: callbacks.setCurrentRankingSessionTimer,
      handleRankingSessionTimeout: callbacks.handleRankingSessionTimeout
    });
  }

  function handleRankingSessionTimeout(deps, callbacks) {
    return root.DJ48QuizPlay.handleRankingSessionTimeout({
      ...deps,
      clearRankingQuestionTimer: callbacks.clearRankingQuestionTimer,
      clearRankingSessionTimer: callbacks.clearRankingSessionTimer,
      getQuizPlayRoot: callbacks.getQuizPlayRoot,
      showQuizComplete: callbacks.showQuizComplete
    });
  }

  function getRankingTimeLimitSecondsForQuiz(quizId, deps, adapters) {
    return root.DJ48QuizPlay.getRankingTimeLimitSecondsForQuiz(quizId, deps.getCurrentRankingModeId(), adapters);
  }

  function startRankingQuestionTimerIfNeeded(deps, callbacks) {
    return root.DJ48QuizPlay.startRankingQuestionTimerIfNeeded({
      ...deps,
      clearRankingQuestionTimer: callbacks.clearRankingQuestionTimer,
      setCurrentRankingQuestionTimer: callbacks.setCurrentRankingQuestionTimer,
      getQuizProgressElement: callbacks.getQuizProgressElement,
      getQuizProgressText: callbacks.getQuizProgressText,
      handleRankingTimeout: callbacks.handleRankingTimeout
    });
  }

  function handleRankingTimeout(deps, callbacks) {
    return root.DJ48QuizPlay.handleRankingTimeout({
      ...deps,
      clearRankingQuestionTimer: callbacks.clearRankingQuestionTimer,
      getQuizPlayRoot: callbacks.getQuizPlayRoot,
      showQuizResult: callbacks.showQuizResult
    });
  }

  function saveRankingRecordOnQuizComplete(deps, testShopUserId) {
    if(typeof deps.saveRankingRecordOnQuizComplete === 'function') {
      return deps.saveRankingRecordOnQuizComplete({
        ...deps,
        testShopUserId
      });
    }
    return root.DJ48QuizPlay.saveRankingRecordOnQuizComplete({
      ...deps,
      testShopUserId
    });
  }

  function grantPracticeCorrectReward(memberUserId, rewardCoin, context, deps) {
    if(typeof deps.grantPracticeCorrectReward === 'function') {
      return deps.grantPracticeCorrectReward(memberUserId, rewardCoin, context, deps);
    }
    return root.DJ48QuizPlay.grantPracticeCorrectReward(memberUserId, rewardCoin, context, {
      getFirebaseFunctions: deps.getFirebaseFunctions,
      resetUserEconomyCache: deps.resetUserEconomyCache,
      debugLog: deps.debugLog
    });
  }

  function syncMemberTitlesAfterPracticeCompletion(memberUserId, context, deps) {
    if(typeof deps.syncMemberTitlesAfterPracticeCompletion === 'function') {
      return deps.syncMemberTitlesAfterPracticeCompletion(memberUserId, context, deps);
    }
    return root.DJ48QuizPlay.syncMemberTitlesAfterPracticeCompletion(memberUserId, context, {
      getFirebaseFunctions: deps.getFirebaseFunctions,
      resetTitleCatalogCache: deps.resetTitleCatalogCache,
      debugLog: deps.debugLog
    });
  }

  function savePracticeProgressAfterCorrectAnswer(question, deps, testShopUserId) {
    if(typeof deps.savePracticeProgressAfterCorrectAnswer === 'function') {
      return deps.savePracticeProgressAfterCorrectAnswer(question, {
        ...deps,
        testShopUserId
      });
    }
    return root.DJ48QuizPlay.savePracticeProgressAfterCorrectAnswer(question, {
      ...deps,
      testShopUserId
    });
  }

  function getQuizSaveCallbacks(options = {}, depsFactory) {
    return {
      savePracticeProgressAfterCorrectAnswer: question => savePracticeProgressAfterCorrectAnswer(
        question,
        depsFactory(),
        options.testShopUserId
      ),
      saveRankingRecordOnQuizComplete: () => saveRankingRecordOnQuizComplete(
        depsFactory(),
        options.testShopUserId
      )
    };
  }

  function submitQuizAnswer(deps = {}, callbacks = {}) {
    const saveCallbacks = getQuizSaveCallbacks({
      testShopUserId: callbacks.testShopUserId
    }, callbacks.getQuizPlayDeps);
    return root.DJ48QuizPlay.submitAnswer({
      ...deps,
      ...callbacks.getQuizPlayDomDeps?.(),
      clearRankingQuestionTimer: callbacks.clearRankingQuestionTimer,
      normalizeQuizAnswer: callbacks.normalizeQuizAnswer,
      recordEducationCorrectForPopularUnlock: callbacks.recordEducationCorrectForPopularUnlock,
      savePracticeProgressAfterCorrectAnswer: saveCallbacks.savePracticeProgressAfterCorrectAnswer,
      showQuizResult: callbacks.showQuizResult,
      renderPracticeSaveStatus: callbacks.renderPracticeSaveStatus,
      isFirestoreQuotaExceededError: callbacks.isFirestoreQuotaExceededError
    });
  }

  function renderQuizQuestion(deps = {}, callbacks = {}) {
    return root.DJ48QuizRender.renderQuestion(deps, {
      getQuestionHintText: callbacks.getQuestionHintText,
      getQuizProgressText: callbacks.getQuizProgressText,
      startRankingQuestionTimerIfNeeded: callbacks.startRankingQuestionTimerIfNeeded
    });
  }

  function showQuizResult(isCorrect, overrideMessage, deps = {}, callbacks = {}) {
    return root.DJ48QuizPlay.showQuizResult(isCorrect, overrideMessage, {
      ...deps,
      getQuizPlayRoot: callbacks.getQuizPlayRoot
    });
  }

  function nextQuizQuestion(deps = {}, callbacks = {}) {
    return root.DJ48QuizPlay.nextQuestion({
      ...deps,
      clearRankingQuestionTimer: callbacks.clearRankingQuestionTimer,
      showQuizComplete: callbacks.showQuizComplete,
      renderQuestion: callbacks.renderQuestion
    });
  }

  function showQuizComplete(options = {}, deps = {}, callbacks = {}) {
    callbacks.clearRankingQuestionTimer?.();
    callbacks.clearRankingSessionTimer?.();
    callbacks.finishPopularUsageSession?.();
    const saveCallbacks = getQuizSaveCallbacks({
      testShopUserId: callbacks.testShopUserId
    }, callbacks.getQuizPlayDeps);
    return root.DJ48QuizPlay.showQuizComplete(options, {
      ...deps,
      getQuizPlayRoot: callbacks.getQuizPlayRoot,
      saveRankingRecordOnQuizComplete: saveCallbacks.saveRankingRecordOnQuizComplete,
      renderRankingSaveStatus: callbacks.renderRankingSaveStatus
    });
  }

  function leaveQuizPlaySession(callbacks = {}) {
    callbacks.clearRankingQuestionTimer?.();
    callbacks.clearRankingSessionTimer?.();
    callbacks.finishPopularUsageSession?.();
    callbacks.hideClassroomView?.();
  }

  const api = {
    clearRankingQuestionTimer,
    clearRankingSessionTimer,
    getRankingTimerStateCallbacks,
    getRankingElapsedSeconds,
    getQuizProgressText,
    startRankingSessionTimerIfNeeded,
    handleRankingSessionTimeout,
    getRankingTimeLimitSecondsForQuiz,
    startRankingQuestionTimerIfNeeded,
    handleRankingTimeout,
    saveRankingRecordOnQuizComplete,
    grantPracticeCorrectReward,
    syncMemberTitlesAfterPracticeCompletion,
    savePracticeProgressAfterCorrectAnswer,
    getQuizSaveCallbacks,
    submitQuizAnswer,
    renderQuizQuestion,
    showQuizResult,
    nextQuizQuestion,
    showQuizComplete,
    leaveQuizPlaySession
  };

  root.DJ48QuizFlow = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
