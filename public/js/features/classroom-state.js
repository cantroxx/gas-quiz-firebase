(function () {
  let revision = 0;
  const generations = {};
  function getGeneration(key) { return generations[key] || 0; }
  function getRevision() { return revision; }
  const loadErrors = {};
  function reportLoadStatus(key, error) {
    if(error) loadErrors[key] = true;
    else delete loadErrors[key];
  }
  function hasLoadError(key) { return loadErrors[key] === true; }
  function getLoadErrors() { return Object.keys(loadErrors); }
  const cache = {
    home: null,
    settings: null,
    progress: null,
    review: null,
    wallet: null,
    gems: null,
    students: null,
    economy: null
  };
  const loadPromises = {
    home: null,
    settings: null,
    progress: null,
    review: null,
    wallet: null,
    gems: null,
    students: null,
    economy: null
  };

  function getValue(key) {
    return cache[key] || null;
  }

  function setValue(key, value) {
    cache[key] = value || null;
    return cache[key];
  }

  function getLoadPromise(key) {
    return loadPromises[key] || null;
  }

  function setLoadPromise(key, value) {
    loadPromises[key] = value || null;
    return loadPromises[key];
  }

  function resetClassroomDataCaches(options = {}) {
    if(options.settings || options.wallet || options.economy || options.students) options = { ...options, home: true };
    if(Object.keys(options).some(key => options[key] && Object.prototype.hasOwnProperty.call(cache, key))) revision++;
    Object.keys(options).forEach(key => {
      if(options[key] && Object.prototype.hasOwnProperty.call(cache, key)) {
        cache[key] = null;
        loadPromises[key] = null;
        generations[key] = getGeneration(key) + 1;
        delete loadErrors[key];
      }
    });
  }

  function resetClassroomRuntimeData() {
    window.DJ48ClassroomDiary?.close();
    window.DJ48Securities?.reset();
    Object.keys(loadErrors).forEach(key => delete loadErrors[key]);
    resetClassroomDataCaches({
      home: true,
      settings: true,
      progress: true,
      review: true,
      wallet: true,
      gems: true,
      students: true,
      economy: true
    });
    Object.keys(loadPromises).forEach(key => {
      loadPromises[key] = null;
    });
  }

  window.DJ48ClassroomState = {
    getGeneration,
    getRevision,
    reportLoadStatus,
    hasLoadError,
    getLoadErrors,
    getValue,
    setValue,
    getLoadPromise,
    setLoadPromise,
    resetClassroomDataCaches,
    resetClassroomRuntimeData
  };
})();
