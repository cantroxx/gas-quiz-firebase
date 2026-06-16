(function () {
  let currentPopularUsageSession = null;
  let currentPopularUsageFlushTimer = null;

  function clearPopularUsageFlushTimer() {
    if(currentPopularUsageFlushTimer) clearInterval(currentPopularUsageFlushTimer);
    currentPopularUsageFlushTimer = null;
  }

  async function flushPopularUsageSession(force = false, deps = {}) {
    if(!currentPopularUsageSession) return null;
    const now = deps.now?.() || Date.now();
    const elapsedSeconds = Math.floor((now - currentPopularUsageSession.lastFlushedAtMs) / 1000);
    if(!force && elapsedSeconds < 1) return null;
    const cappedSeconds = Math.max(0, Math.min(elapsedSeconds, 60));
    currentPopularUsageSession.lastFlushedAtMs = now;
    if(cappedSeconds <= 0) return null;
    try {
      const delta = {
        funSeconds: cappedSeconds,
        after4FunSeconds: (currentPopularUsageSession.after4Window || deps.isAfter4PmKst?.()) ? cappedSeconds : 0
      };
      return await deps.updateDailyUsageForToday?.(delta);
    } catch(error) {
      deps.warn?.('Popular quiz usage update failed.', error);
      return null;
    }
  }

  function startPopularUsageSessionIfNeeded(quizId, deps = {}) {
    clearPopularUsageFlushTimer();
    currentPopularUsageSession = null;
    if(!deps.isPopularQuiz?.(quizId)) return;
    const now = deps.now?.() || Date.now();
    currentPopularUsageSession = {
      quizId: deps.normalizeFirebaseQuizId?.(quizId) || quizId,
      startedAtMs: now,
      lastFlushedAtMs: now,
      after4Window: deps.isAfter4PmKst?.() || false
    };
    const flushIntervalMs = Math.max(1000, Number(deps.flushIntervalMs) || 1000);
    currentPopularUsageFlushTimer = setInterval(() => {
      flushPopularUsageSession(false, deps);
    }, flushIntervalMs);
  }

  async function finishPopularUsageSession(deps = {}) {
    clearPopularUsageFlushTimer();
    const result = await flushPopularUsageSession(true, deps);
    currentPopularUsageSession = null;
    return result;
  }

  window.DJ48QuizPopularSession = {
    clearPopularUsageFlushTimer,
    finishPopularUsageSession,
    flushPopularUsageSession,
    startPopularUsageSessionIfNeeded
  };
})();
