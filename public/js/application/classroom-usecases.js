(function (root, factory) {
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.DJ48ClassroomUsecases = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  async function loadClassroomSettingsWithCache(options = {}, deps = {}) {
    const forceRefresh = options.forceRefresh === true;
    const cachedSettings = deps.getValue?.('settings');
    if(cachedSettings && !forceRefresh) return cachedSettings;

    const settings = await deps.loadClassroomSettings({
      prototype: options.prototype
    });
    return deps.setValue?.('settings', settings) || settings;
  }

  async function loadClassroomCachedValue(key, options = {}, deps = {}) {
    const forceRefresh = options.forceRefresh === true;
    const cachedValue = deps.getValue?.(key);
    if(cachedValue && !forceRefresh) return cachedValue;

    const activeLoadPromise = deps.getLoadPromise?.(key);
    if(activeLoadPromise && !forceRefresh) return activeLoadPromise;

    const loadPromise = deps.loadValue(options)
      .then(value => deps.setValue?.(key, value) || value)
      .finally(() => {
        deps.setLoadPromise?.(key, null);
      });

    deps.setLoadPromise?.(key, loadPromise);
    return loadPromise;
  }

  async function getClassroomReviewViewData(options = {}, deps = {}) {
    const settings = await deps.loadClassroomSettings(options.forceRefresh === true);
    const reviewItems = await deps.loadClassroomReviewItems(settings, options.forceRefresh === true);
    return { settings, reviewItems };
  }

  async function getClassroomPrototypeViewData(options = {}, deps = {}) {
    const settings = await deps.loadClassroomSettings(options.forceRefresh === true);
    const [
      progressMap,
      reviewItems,
      wallet,
      gemProgress,
      studentCards,
      economyBoard
    ] = await Promise.all([
      deps.loadClassroomQuestProgress(options.forceRefresh === true),
      deps.loadClassroomReviewItems(settings, options.forceRefresh === true),
      deps.loadClassroomWallet(settings, options.forceRefresh === true),
      deps.loadClassroomGemProgress(settings, options.forceRefresh === true),
      deps.loadClassroomStudentCards(settings, options.forceRefresh === true),
      deps.loadClassroomEconomyBoard(settings, options.forceRefresh === true)
    ]);

    return {
      settings,
      progressMap,
      reviewItems,
      wallet,
      gemProgress,
      studentCards,
      economyBoard
    };
  }

  return {
    loadClassroomSettingsWithCache,
    loadClassroomCachedValue,
    getClassroomReviewViewData,
    getClassroomPrototypeViewData
  };
});
