(function () {
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

  function getRankingElapsedSeconds(deps) {
    return window.DJ48QuizPlay.getRankingElapsedSeconds(deps.getCurrentQuizStartedAtMs());
  }

  function startRankingSessionTimerIfNeeded(deps, callbacks) {
    return window.DJ48QuizPlay.startRankingSessionTimerIfNeeded({
      ...deps,
      clearRankingSessionTimer: callbacks.clearRankingSessionTimer,
      setCurrentRankingSessionTimer: callbacks.setCurrentRankingSessionTimer,
      handleRankingSessionTimeout: callbacks.handleRankingSessionTimeout
    });
  }

  function handleRankingSessionTimeout(deps, callbacks) {
    return window.DJ48QuizPlay.handleRankingSessionTimeout({
      ...deps,
      clearRankingQuestionTimer: callbacks.clearRankingQuestionTimer,
      clearRankingSessionTimer: callbacks.clearRankingSessionTimer,
      getQuizPlayRoot: callbacks.getQuizPlayRoot,
      showQuizComplete: callbacks.showQuizComplete
    });
  }

  function getRankingTimeLimitSecondsForQuiz(quizId, deps, adapters) {
    return window.DJ48QuizPlay.getRankingTimeLimitSecondsForQuiz(quizId, deps.getCurrentRankingModeId(), adapters);
  }

  function startRankingQuestionTimerIfNeeded(deps, callbacks) {
    return window.DJ48QuizPlay.startRankingQuestionTimerIfNeeded({
      ...deps,
      clearRankingQuestionTimer: callbacks.clearRankingQuestionTimer,
      setCurrentRankingQuestionTimer: callbacks.setCurrentRankingQuestionTimer,
      getQuizProgressElement: callbacks.getQuizProgressElement,
      getQuizProgressText: callbacks.getQuizProgressText,
      handleRankingTimeout: callbacks.handleRankingTimeout
    });
  }

  function handleRankingTimeout(deps, callbacks) {
    return window.DJ48QuizPlay.handleRankingTimeout({
      ...deps,
      clearRankingQuestionTimer: callbacks.clearRankingQuestionTimer,
      getQuizPlayRoot: callbacks.getQuizPlayRoot,
      showQuizResult: callbacks.showQuizResult
    });
  }

  function saveRankingRecordOnQuizComplete(deps, testShopUserId) {
    return window.DJ48QuizPlay.saveRankingRecordOnQuizComplete({
      ...deps,
      testShopUserId
    });
  }

  function grantPracticeCorrectReward(memberUserId, rewardCoin, context, deps) {
    return window.DJ48QuizPlay.grantPracticeCorrectReward(memberUserId, rewardCoin, context, {
      getFirebaseFunctions: deps.getFirebaseFunctions,
      resetUserEconomyCache: deps.resetUserEconomyCache,
      debugLog: deps.debugLog
    });
  }

  function syncMemberTitlesAfterPracticeCompletion(memberUserId, context, deps) {
    return window.DJ48QuizPlay.syncMemberTitlesAfterPracticeCompletion(memberUserId, context, {
      getFirebaseFunctions: deps.getFirebaseFunctions,
      resetTitleCatalogCache: deps.resetTitleCatalogCache,
      debugLog: deps.debugLog
    });
  }

  function savePracticeProgressAfterCorrectAnswer(question, deps, testShopUserId) {
    return window.DJ48QuizPlay.savePracticeProgressAfterCorrectAnswer(question, {
      ...deps,
      testShopUserId
    });
  }

  window.DJ48QuizFlow = {
    clearRankingQuestionTimer,
    clearRankingSessionTimer,
    getRankingElapsedSeconds,
    startRankingSessionTimerIfNeeded,
    handleRankingSessionTimeout,
    getRankingTimeLimitSecondsForQuiz,
    startRankingQuestionTimerIfNeeded,
    handleRankingTimeout,
    saveRankingRecordOnQuizComplete,
    grantPracticeCorrectReward,
    syncMemberTitlesAfterPracticeCompletion,
    savePracticeProgressAfterCorrectAnswer
  };
})();
