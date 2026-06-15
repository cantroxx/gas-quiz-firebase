(function () {
  function buildEventLoadingQuests(quests = []) {
    return window.DJ48EventDomain.buildEventLoadingQuests(quests);
  }

  function getEventProgressRenderData(progress = null, fallback = {}) {
    return window.DJ48EventDomain.getEventProgressRenderData(progress, fallback);
  }

  function getEventLoadingRenderData(fallback = {}) {
    return window.DJ48EventDomain.getEventLoadingRenderData(fallback);
  }

  async function loadEventProgress(options = {}, deps = {}) {
    if(!options.memberUserId) throw new Error('member-required');
    const functions = deps.getFirebaseFunctions?.();
    if(!functions) throw new Error('functions-unavailable');
    const callable = functions.httpsCallable('getEventProgress');
    const response = await callable({ memberUserId: options.memberUserId });
    return response?.data || null;
  }

  async function claimEventQuestReward(options = {}, deps = {}) {
    if(!options.questId) return null;
    if(!options.memberUserId) throw new Error('member-required');
    const functions = deps.getFirebaseFunctions?.();
    if(!functions) throw new Error('functions-unavailable');
    const callable = functions.httpsCallable('claimEventQuestReward');
    const response = await callable({
      memberUserId: options.memberUserId,
      questId: options.questId
    });
    return response?.data || {};
  }

  function getEventRewardClaimErrorMessage(error) {
    return window.DJ48EventDomain.getEventRewardClaimErrorMessage(error);
  }

  window.DJ48EventData = {
    buildEventLoadingQuests,
    getEventProgressRenderData,
    getEventLoadingRenderData,
    loadEventProgress,
    claimEventQuestReward,
    getEventRewardClaimErrorMessage
  };
})();
