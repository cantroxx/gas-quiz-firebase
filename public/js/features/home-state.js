(function () {
  let profileImageOptions = [];

  function getProfileImageOptions() {
    return profileImageOptions;
  }

  function setProfileImageOptions(options = []) {
    profileImageOptions = Array.isArray(options) ? options : [];
    return profileImageOptions;
  }

  function getProfileImageOption(index) {
    return profileImageOptions[Number(index)];
  }

  function resetHomeState() {
    profileImageOptions = [];
  }

  window.DJ48HomeState = {
    getProfileImageOptions,
    setProfileImageOptions,
    getProfileImageOption,
    resetHomeState
  };
})();
