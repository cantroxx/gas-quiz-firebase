(function (root, factory) {
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.DJ48EventUsecases = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  async function loadEventProgressWithCache(options = {}, deps = {}) {
    const forceRefresh = options.forceRefresh === true;
    const cachedProgress = deps.getEventProgress?.();
    if(cachedProgress && !forceRefresh) return cachedProgress;

    const activeLoadPromise = deps.getEventProgressLoadPromise?.();
    if(activeLoadPromise && !forceRefresh) return activeLoadPromise;

    const loadPromise = deps.loadEventProgress({
      memberUserId: options.memberUserId
    })
      .then(progress => deps.setEventProgress?.(progress) || progress)
      .finally(() => {
        deps.setEventProgressLoadPromise?.(null);
      });

    deps.setEventProgressLoadPromise?.(loadPromise);
    return loadPromise;
  }

  async function getEventProgressViewData(options = {}, deps = {}) {
    try {
      const progress = await loadEventProgressWithCache(options, deps);
      return {
        data: deps.getEventProgressRenderData(progress, options.fallback),
        usedFallback: false,
        error: null
      };
    } catch(error) {
      deps.warn?.('Firestore event progress load failed. Using static event fallback.', error);
      return {
        data: options.fallback || {},
        usedFallback: true,
        error
      };
    }
  }

  async function claimEventQuestRewardFlow(options = {}, deps = {}) {
    if(!options.questId) return { skipped: true };

    try {
      const result = await deps.claimEventQuestReward({
        memberUserId: options.memberUserId,
        questId: options.questId
      });
      deps.resetUserEconomyCache?.();
      deps.resetEventProgressCache?.();
      deps.debugLog?.('Event quest reward claimed:', {
        questId: options.questId,
        rewardCoin: result?.rewardCoin || 0,
        duplicate: !!result?.duplicate,
        rewardLogPath: result?.rewardLogPath || ''
      });
      await deps.renderEventProgress?.(true);
      return { result: result || {}, error: null };
    } catch(error) {
      deps.warn?.('Event quest reward claim failed.', error);
      deps.alert?.(deps.getEventRewardClaimErrorMessage(error));
      await deps.renderEventProgress?.(true);
      return { result: null, error };
    }
  }

  async function claimCurrentMemberEventQuestRewardFlow(options = {}, deps = {}) {
    if(!options.questId) return { skipped: true };
    const button = deps.getClaimButton?.(options.questId) || null;
    const originalText = button?.textContent || '';
    if(button) {
      button.disabled = true;
      button.textContent = options.progressText || '수령 중...';
    }
    try {
      return await claimEventQuestRewardFlow({
        memberUserId: deps.getCurrentMemberUserId?.() || '',
        questId: options.questId
      }, deps);
    } finally {
      if(button && deps.containsElement?.(button) !== false) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  return {
    loadEventProgressWithCache,
    getEventProgressViewData,
    claimEventQuestRewardFlow,
    claimCurrentMemberEventQuestRewardFlow
  };
});
