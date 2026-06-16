(function () {
  let profileImageOptions = [];
  let profileImageEditorState = null;

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

  function getProfileImageEditorState() {
    return profileImageEditorState;
  }

  function setProfileImageEditorState(state) {
    profileImageEditorState = state || null;
    return profileImageEditorState;
  }

  function updateProfileImageEditorState(updater) {
    profileImageEditorState = typeof updater === 'function'
      ? updater(profileImageEditorState)
      : updater || null;
    return profileImageEditorState;
  }

  function clearProfileImageEditorState() {
    profileImageEditorState = null;
  }

  function resetHomeState() {
    profileImageOptions = [];
    profileImageEditorState = null;
  }

  window.DJ48HomeState = {
    getProfileImageOptions,
    setProfileImageOptions,
    getProfileImageOption,
    getProfileImageEditorState,
    setProfileImageEditorState,
    updateProfileImageEditorState,
    clearProfileImageEditorState,
    resetHomeState
  };
})();
