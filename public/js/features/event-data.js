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

  function getEventRewardClaimErrorMessage(error) {
    return window.DJ48EventDomain.getEventRewardClaimErrorMessage(error);
  }

  window.DJ48EventData = {
    buildEventLoadingQuests,
    getEventProgressRenderData,
    getEventLoadingRenderData,
    getEventRewardClaimErrorMessage
  };
})();
