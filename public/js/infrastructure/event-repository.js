(function (root) {
  function getEventFunctions(deps = {}) {
    const functions = deps.getFirebaseFunctions?.();
    if(!functions) throw new Error('functions-unavailable');
    return functions;
  }

  function createEventRepository(deps = {}) {
    return {
      async loadEventProgress(options = {}) {
        if(!options.memberUserId) throw new Error('member-required');
        const callable = getEventFunctions(deps).httpsCallable('getEventProgress');
        const response = await callable({ memberUserId: options.memberUserId });
        return response?.data || null;
      },
      async claimEventQuestReward(options = {}) {
        if(!options.questId) return null;
        if(!options.memberUserId) throw new Error('member-required');
        const callable = getEventFunctions(deps).httpsCallable('claimEventQuestReward');
        const response = await callable({
          memberUserId: options.memberUserId,
          questId: options.questId
        });
        return response?.data || {};
      }
    };
  }

  const api = {
    createEventRepository
  };

  root.DJ48EventRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
