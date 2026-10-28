/* Start the read when the user approaches an event entry, without blocking navigation. */
(function () {
  let lastAttempt = 0;
  function prefetch(event) {
    if(!event.target.closest?.('[data-place="event"], [data-panel-action="openEvent"]')) return;
    if(!window.DJ48AccountState?.getCurrentMemberUserId?.() || !window.loadEventProgress) return;
    if(Date.now() - lastAttempt < 10000) return;
    lastAttempt = Date.now();
    window.loadEventProgress().catch(() => {});
    const image = document.querySelector('#event-view .plaza-hero-art');
    if(image) image.loading = 'eager';
  }
  for(const type of ['pointerover', 'pointerdown', 'focusin']) document.addEventListener(type, prefetch, { passive: true });
})();
