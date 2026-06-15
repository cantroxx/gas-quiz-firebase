(function () {
  function bindEventPlazaEvents(deps = {}) {
    document.getElementById('quest-card-grid')?.addEventListener('click', event => {
      const button = event.target.closest('[data-quest-claim-id]');
      if(!button || button.disabled) return;
      deps.claimEventQuestReward?.(button.dataset.questClaimId || '');
    });
  }

  window.DJ48EventController = {
    bindEventPlazaEvents
  };
})();
