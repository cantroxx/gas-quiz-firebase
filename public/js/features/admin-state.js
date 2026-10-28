(function () {
  let dashboard = null;
  let noticeBoard = null;
  let featureFlags = null;
  let featureFlagsLoadPromise = null;
  let externalQuizzes = null;
  let externalQuizzesLoadPromise = null;
  let seasonEvents = null;
  let readGeneration = 0;
  const reads = new Map();

  function invalidateAdminReads() {
    readGeneration++;
    reads.clear();
  }

  async function readAdminValue(key, load, options = {}) {
    const generation = readGeneration;
    const now = Date.now();
    const previous = reads.get(key);
    if(previous?.promise) return previous.promise;
    if(!options.forceRefresh && previous && previous.expires > now) return previous.value;
    const entry = {};
    entry.promise = Promise.resolve().then(load).then(value => {
      if(generation !== readGeneration) throw new Error('admin-read-invalidated');
      entry.value = value;
      entry.expires = Date.now() + 15000;
      return value;
    }).finally(() => {
      entry.promise = null;
      if(!entry.expires && reads.get(key) === entry) reads.delete(key);
    });
    reads.set(key, entry);
    // Filters can create many keys; keep this short-lived session cache bounded.
    if(reads.size > 30) reads.delete(reads.keys().next().value);
    return entry.promise;
  }

  function getDashboard() {
    return dashboard;
  }

  function setDashboard(value) {
    dashboard = value || {};
    return dashboard;
  }

  function getNoticeBoardCache() {
    return noticeBoard;
  }

  function setNoticeBoardCache(value) {
    noticeBoard = value || null;
    return noticeBoard;
  }

  function getFeatureFlagsCache() {
    return featureFlags;
  }

  function setFeatureFlagsCache(value) {
    featureFlags = value || null;
    return featureFlags;
  }

  function getFeatureFlagsLoadPromise() {
    return featureFlagsLoadPromise;
  }

  function setFeatureFlagsLoadPromise(value) {
    featureFlagsLoadPromise = value || null;
    return featureFlagsLoadPromise;
  }

  function getExternalQuizzesCache() {
    return externalQuizzes;
  }

  function setExternalQuizzesCache(value) {
    externalQuizzes = value || null;
    return externalQuizzes;
  }

  function getExternalQuizzesLoadPromise() {
    return externalQuizzesLoadPromise;
  }

  function setExternalQuizzesLoadPromise(value) {
    externalQuizzesLoadPromise = value || null;
    return externalQuizzesLoadPromise;
  }

  function getSeasonEventsCache() {
    return seasonEvents;
  }

  function setSeasonEventsCache(value) {
    seasonEvents = value || null;
    return seasonEvents;
  }

  function resetAdminState() {
    invalidateAdminReads();
    dashboard = null;
    noticeBoard = null;
    featureFlags = null;
    featureFlagsLoadPromise = null;
    externalQuizzes = null;
    externalQuizzesLoadPromise = null;
    seasonEvents = null;
  }

  window.DJ48AdminState = {
    readAdminValue,
    invalidateAdminReads,
    getDashboard,
    setDashboard,
    getNoticeBoardCache,
    setNoticeBoardCache,
    getFeatureFlagsCache,
    setFeatureFlagsCache,
    getFeatureFlagsLoadPromise,
    setFeatureFlagsLoadPromise,
    getExternalQuizzesCache,
    setExternalQuizzesCache,
    getExternalQuizzesLoadPromise,
    setExternalQuizzesLoadPromise,
    getSeasonEventsCache,
    setSeasonEventsCache,
    resetAdminState
  };
})();
