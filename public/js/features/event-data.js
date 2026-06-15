(function () {
  function buildEventLoadingQuests(quests = []) {
    return quests.map(quest => ({
      ...quest,
      status: '불러오는 중',
      claimable: false
    }));
  }

  function getEventProgressRenderData(progress = null, fallback = {}) {
    return {
      quests: progress?.quests || fallback.quests || [],
      classMissions: progress?.classMissions || fallback.classMissions || [],
      seasonEvents: progress?.seasonEvents || fallback.seasonEvents || []
    };
  }

  function getEventLoadingRenderData(fallback = {}) {
    return {
      quests: buildEventLoadingQuests(fallback.quests || []),
      classMissions: fallback.classMissions || [],
      seasonEvents: fallback.seasonEvents || []
    };
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
    if(error?.message === 'member-required') return '로그인 후 이벤트 보상을 받을 수 있어요.';
    if(error?.message === 'functions-unavailable') return '이벤트 보상 기능을 불러오지 못했어요.';
    return '이벤트 보상 수령 중 문제가 생겼어요. 퀘스트 완료 상태를 다시 확인해 주세요.';
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
