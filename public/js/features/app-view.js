(function (root, factory) {
  const api = factory(root);
  root.DJ48AppView = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  const document = root.document;

  function showOnlyAppView(viewId, viewIds = []) {
    const hero = document.getElementById('app-hero');
    if(hero) hero.hidden = true;
    viewIds.forEach(id => {
      const view = document.getElementById(id);
      if(view) view.hidden = id !== viewId;
    });
    document.getElementById(viewId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function updatePlaceInfo(place = {}) {
    const icon = document.getElementById('place-info-icon');
    const title = document.getElementById('place-info-title');
    const desc = document.getElementById('place-info-desc');
    if(icon) icon.textContent = place.icon || '';
    if(title) title.textContent = place.title || '';
    if(desc) desc.textContent = place.desc || '';
  }

  function updatePlayerLocation(place = {}) {
    const location = document.getElementById('current-location');
    if(location) location.textContent = place.title || '';
  }

  function closePlaceModal() {
    const modal = document.getElementById('place-modal');
    if(modal) modal.hidden = true;
  }

  function enterPlaceView(options = {}, deps = {}) {
    deps.leaveQuizPlaySession?.();
    closePlaceModal();
    if(options.place) {
      updatePlaceInfo(options.place);
      updatePlayerLocation(options.place);
    }
    showOnlyAppView(options.viewId, deps.appViewIds || []);
  }

  function enterKnownPlaceView(options = {}, deps = {}) {
    return enterPlaceView({
      ...options,
      place: options.place || deps.placeDetails?.[options.placeKey] || null
    }, deps);
  }

  return {
    showOnlyAppView,
    updatePlaceInfo,
    updatePlayerLocation,
    closePlaceModal,
    enterPlaceView,
    enterKnownPlaceView
  };
});
