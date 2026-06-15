(function () {
  let currentQuestionIndex = 0;
  let selectedChoiceIndex = null;
  let correctAnswerCount = 0;
  let lastQuizId = 'spelling';
  let currentSubjectId = 'korean';
  let currentQuizId = 'spelling';
  let currentModeId = 'practice';
  let currentRankingModeId = 'normal';
  let currentSessionQuestions = null;
  let currentQuizStartedAtMs = 0;
  let currentRankingLives = 0;
  let currentRankingQuestionTimer = null;
  let currentRankingSessionTimer = null;
  let currentRankingTimeLeft = 0;
  let currentQuestionResolved = false;

  function getCurrentQuestionIndex() { return currentQuestionIndex; }
  function setCurrentQuestionIndex(value) { currentQuestionIndex = Number(value) || 0; return currentQuestionIndex; }
  function advanceCurrentQuestionIndex() { currentQuestionIndex += 1; return currentQuestionIndex; }

  function getSelectedChoiceIndex() { return selectedChoiceIndex; }
  function setSelectedChoiceIndex(value) { selectedChoiceIndex = value; return selectedChoiceIndex; }
  function resetSelectedChoiceIndex() { selectedChoiceIndex = null; }

  function getCorrectAnswerCount() { return correctAnswerCount; }
  function setCorrectAnswerCount(value) { correctAnswerCount = Number(value) || 0; return correctAnswerCount; }
  function incrementCorrectAnswerCount() { correctAnswerCount += 1; return correctAnswerCount; }

  function getLastQuizId() { return lastQuizId; }
  function setLastQuizId(value) { lastQuizId = value || 'spelling'; return lastQuizId; }

  function getCurrentSubjectId() { return currentSubjectId; }
  function setCurrentSubjectId(value) { currentSubjectId = value || 'korean'; return currentSubjectId; }

  function getCurrentQuizId() { return currentQuizId; }
  function setCurrentQuizId(value) { currentQuizId = value || 'spelling'; return currentQuizId; }

  function getCurrentModeId() { return currentModeId; }
  function setCurrentModeId(value) { currentModeId = value || 'practice'; return currentModeId; }

  function getCurrentRankingModeId() { return currentRankingModeId; }
  function setCurrentRankingModeId(value) { currentRankingModeId = value || 'normal'; return currentRankingModeId; }

  function getCurrentSessionQuestions() { return currentSessionQuestions; }
  function setCurrentSessionQuestions(value) { currentSessionQuestions = value || null; return currentSessionQuestions; }

  function getCurrentQuizStartedAtMs() { return currentQuizStartedAtMs; }
  function setCurrentQuizStartedAtMs(value) { currentQuizStartedAtMs = Number(value) || 0; return currentQuizStartedAtMs; }

  function getCurrentRankingLives() { return currentRankingLives; }
  function setCurrentRankingLives(value) { currentRankingLives = Number(value) || 0; return currentRankingLives; }

  function getCurrentRankingQuestionTimer() { return currentRankingQuestionTimer; }
  function setCurrentRankingQuestionTimer(timer) { currentRankingQuestionTimer = timer || null; return currentRankingQuestionTimer; }

  function getCurrentRankingSessionTimer() { return currentRankingSessionTimer; }
  function setCurrentRankingSessionTimer(timer) { currentRankingSessionTimer = timer || null; return currentRankingSessionTimer; }

  function getCurrentRankingTimeLeft() { return currentRankingTimeLeft; }
  function setCurrentRankingTimeLeft(value) { currentRankingTimeLeft = Number(value) || 0; return currentRankingTimeLeft; }
  function decreaseCurrentRankingTimeLeft(value) {
    currentRankingTimeLeft -= Number(value) || 0;
    return currentRankingTimeLeft;
  }

  function getCurrentQuestionResolved() { return currentQuestionResolved; }
  function setCurrentQuestionResolved(value) { currentQuestionResolved = !!value; return currentQuestionResolved; }

  function applyQuizPlaySessionState(state = {}) {
    setCurrentQuizId(state.currentQuizId);
    setCurrentModeId(state.currentModeId);
    setCurrentRankingModeId(state.currentRankingModeId);
    setCurrentQuestionIndex(state.currentQuestionIndex);
    setSelectedChoiceIndex(state.selectedChoiceIndex);
    setCorrectAnswerCount(state.correctAnswerCount);
    setCurrentQuizStartedAtMs(state.currentQuizStartedAtMs);
    setCurrentRankingLives(state.currentRankingLives);
    setCurrentQuestionResolved(state.currentQuestionResolved);
    setCurrentSessionQuestions(state.currentSessionQuestions);
  }

  window.DJ48QuizSessionState = {
    getCurrentQuestionIndex,
    setCurrentQuestionIndex,
    advanceCurrentQuestionIndex,
    getSelectedChoiceIndex,
    setSelectedChoiceIndex,
    resetSelectedChoiceIndex,
    getCorrectAnswerCount,
    setCorrectAnswerCount,
    incrementCorrectAnswerCount,
    getLastQuizId,
    setLastQuizId,
    getCurrentSubjectId,
    setCurrentSubjectId,
    getCurrentQuizId,
    setCurrentQuizId,
    getCurrentModeId,
    setCurrentModeId,
    getCurrentRankingModeId,
    setCurrentRankingModeId,
    getCurrentSessionQuestions,
    setCurrentSessionQuestions,
    getCurrentQuizStartedAtMs,
    setCurrentQuizStartedAtMs,
    getCurrentRankingLives,
    setCurrentRankingLives,
    getCurrentRankingQuestionTimer,
    setCurrentRankingQuestionTimer,
    getCurrentRankingSessionTimer,
    setCurrentRankingSessionTimer,
    getCurrentRankingTimeLeft,
    setCurrentRankingTimeLeft,
    decreaseCurrentRankingTimeLeft,
    getCurrentQuestionResolved,
    setCurrentQuestionResolved,
    applyQuizPlaySessionState
  };
})();
