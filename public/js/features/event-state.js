(function () {
  let eventProgress = null;
  let eventProgressLoadPromise = null;

  function getEventProgress() {
    return eventProgress;
  }

  function setEventProgress(progress) {
    eventProgress = progress || null;
    return eventProgress;
  }

  function getEventProgressLoadPromise() {
    return eventProgressLoadPromise;
  }

  function setEventProgressLoadPromise(promise) {
    eventProgressLoadPromise = promise || null;
    return eventProgressLoadPromise;
  }

  function resetEventProgressCache() {
    eventProgress = null;
    eventProgressLoadPromise = null;
  }

  window.DJ48EventState = {
    getEventProgress,
    setEventProgress,
    getEventProgressLoadPromise,
    setEventProgressLoadPromise,
    resetEventProgressCache
  };
})();
