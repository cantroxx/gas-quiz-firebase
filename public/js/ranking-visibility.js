/* Optional game leaderboards read only when their own panel becomes visible. */
(function () {
  const loaders = new Map();
  function isVisible(id) {
    const element = document.getElementById(id);
    return Boolean(element && !element.closest('[hidden]'));
  }
  function scan() {
    loaders.forEach((entry, id) => {
      const visible = isVisible(id);
      const element = document.getElementById(id);
      const opened = visible && (!entry.visible || entry.element !== element);
      entry.visible = visible;
      entry.element = element;
      if (opened) entry.load();
    });
  }
  window.DJ48RankingVisibility = {
    isVisible,
    register(id, load) {
      if (loaders.has(id)) return;
      loaders.set(id, { load, visible: false, element: null });
      scan();
    }
  };
  const view = document.getElementById('ranking-view');
  if (view) new MutationObserver(scan).observe(view, {
    attributes: true, attributeFilter: ['hidden'], childList: true, subtree: true
  });
})();
