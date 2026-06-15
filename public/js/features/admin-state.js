(function () {
  let dashboard = null;

  function getDashboard() {
    return dashboard;
  }

  function setDashboard(value) {
    dashboard = value || {};
    return dashboard;
  }

  function resetAdminState() {
    dashboard = null;
  }

  window.DJ48AdminState = {
    getDashboard,
    setDashboard,
    resetAdminState
  };
})();
