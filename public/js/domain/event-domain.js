(function (root, factory) {
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.DJ48EventDomain = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
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

  function getQuestStatusClass(status) {
    if(status === '완료 가능') return 'quest-status-ready';
    if(status === '수령 완료') return 'quest-status-claimed';
    if(status === '준비 중') return 'quest-status-waiting';
    return 'quest-status-active';
  }

  function getEventRewardClaimErrorMessage(error) {
    if(error?.message === 'member-required') return '로그인 후 이벤트 보상을 받을 수 있어요.';
    if(error?.message === 'functions-unavailable') return '이벤트 보상 기능을 불러오지 못했어요.';
    return '이벤트 보상 수령 중 문제가 생겼어요. 퀘스트 완료 상태를 다시 확인해 주세요.';
  }

  return {
    buildEventLoadingQuests,
    getEventProgressRenderData,
    getEventLoadingRenderData,
    getQuestStatusClass,
    getEventRewardClaimErrorMessage
  };
});
