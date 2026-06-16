(function (root) {
  function createEventRepository(deps = {}) {
    const callableDeps = {
      getFirebaseFunctions: deps.getFirebaseFunctions
    };
    return {
      loadEventProgress: options => root.DJ48EventData.loadEventProgress(options, callableDeps),
      claimEventQuestReward: options => root.DJ48EventData.claimEventQuestReward(options, callableDeps)
    };
  }

  const api = {
    createEventRepository
  };

  root.DJ48EventRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
