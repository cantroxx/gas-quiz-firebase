(function () {
  let eventProgress = null;
  let eventProgressLoadPromise = null;
  let scope = '', loadedAt = 0, version = 0;

  function ensureScope() {
    const account = window.DJ48AccountState;
    const date = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const next = [account?.getFirebaseAuthUser?.()?.uid || '', account?.getCurrentMemberUserId?.() || '', date].join('|');
    if(scope !== next) { resetEventProgressCache(); scope = next; }
  }

  function peekEventProgress() { ensureScope(); return eventProgress; }
  function getCacheVersion() { ensureScope(); return version; }

  function getEventProgress() {
    ensureScope();
    return Date.now() - loadedAt < 60000 ? eventProgress : null;
  }

  function setEventProgress(progress) {
    ensureScope();
    eventProgress = progress || null;
    loadedAt = Date.now();
    return eventProgress;
  }

  function getEventProgressLoadPromise() {
    ensureScope();
    return eventProgressLoadPromise;
  }

  function setEventProgressLoadPromise(promise) {
    ensureScope();
    eventProgressLoadPromise = promise || null;
    return eventProgressLoadPromise;
  }

  function resetEventProgressCache() {
    version++;
    eventProgress = null;
    eventProgressLoadPromise = null;
  }

  window.DJ48EventState = {
    getEventProgress,
    setEventProgress,
    getEventProgressLoadPromise,
    setEventProgressLoadPromise,
    resetEventProgressCache,
    peekEventProgress, getCacheVersion,
    isEventProgressRequestCurrent: promise => getEventProgressLoadPromise() === promise
  };
})();
