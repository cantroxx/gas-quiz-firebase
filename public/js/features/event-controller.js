(function () {
  function bindEventPlazaEvents(deps = {}) {
    document.getElementById('event-view')?.addEventListener('click', event => {
      const shortcut = event.target.closest('a[href="#quest-heading"], a[href="#season-event-heading"]');
      const toggle = shortcut
        ? document.querySelector(`${shortcut.getAttribute('href')} [data-event-section-toggle]`)
        : event.target.closest('[data-event-section-toggle]');
      if(toggle) {
        const expanded = !!shortcut || toggle.getAttribute('aria-expanded') !== 'true';
        document.querySelectorAll('#event-view [data-event-section-toggle]').forEach(control => {
          const active = control === toggle && expanded;
          control.setAttribute('aria-expanded', String(active));
          const panel = document.getElementById(control.getAttribute('aria-controls'));
          if(panel) panel.hidden = !active;
        });
        return;
      }
      const button = event.target.closest('[data-quest-claim-id]');
      if(!button || button.disabled) return;
      deps.claimEventQuestReward?.(button.dataset.questClaimId || '');
    });
  }

  window.DJ48EventController = {
    bindEventPlazaEvents
  };
})();
