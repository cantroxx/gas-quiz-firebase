(function () {
  const cache = {
    settings: null,
    progress: null,
    review: null,
    wallet: null,
    gems: null,
    students: null,
    economy: null
  };
  const loadPromises = {
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
    Object.keys(options).forEach(key => {
      if(options[key] && Object.prototype.hasOwnProperty.call(cache, key)) cache[key] = null;
    });
  }

  function resetClassroomRuntimeData() {
    resetClassroomDataCaches({
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
    getValue,
    setValue,
    getLoadPromise,
    setLoadPromise,
    resetClassroomDataCaches,
    resetClassroomRuntimeData
  };
})();
