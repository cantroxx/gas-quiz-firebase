(function (root) {
  function createProfileRepository(deps = {}) {
    const firestoreDeps = {
      getFirestoreFieldValue: deps.getFirestoreFieldValue
    };
    return {
      saveProfileImageEditorSelection: options => root.DJ48AccountData.saveProfileImageEditorSelection(options, firestoreDeps),
      saveRankingMessageForMember: options => root.DJ48AccountData.saveRankingMessageForMember(options, firestoreDeps),
      saveSelectedTitleForMember: options => root.DJ48AccountData.saveSelectedTitleForMember(options, firestoreDeps)
    };
  }

  const api = {
    createProfileRepository
  };

  root.DJ48ProfileRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
