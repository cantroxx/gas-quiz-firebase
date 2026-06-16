(function () {
  let dashboard = null;
  let noticeBoard = null;
  let featureFlags = null;
  let featureFlagsLoadPromise = null;
  let externalQuizzes = null;
  let externalQuizzesLoadPromise = null;

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

  function resetAdminState() {
    dashboard = null;
    noticeBoard = null;
    featureFlags = null;
    featureFlagsLoadPromise = null;
    externalQuizzes = null;
    externalQuizzesLoadPromise = null;
  }

  window.DJ48AdminState = {
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
    resetAdminState
  };
})();
