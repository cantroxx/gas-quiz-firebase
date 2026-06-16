(function (root) {
  function buildRankingMessageUpdate(message, deps = {}) {
    const fieldValue = deps.getFirestoreFieldValue?.();
    return {
      rankingMessage: root.DJ48AccountDomain.normalizeRankingMessageInput(message),
      updatedAt: fieldValue.serverTimestamp()
    };
  }

  async function saveUserProfileUpdate(options = {}) {
    const { db, memberUserId, updateData } = options;
    if(!memberUserId) throw new Error('member-required');
    if(!db) throw new Error('firestore-unavailable');
    await db.collection('users').doc(memberUserId).set(updateData, { merge: true });
    return updateData;
  }

  function saveRankingMessageForMember(options = {}, deps = {}) {
    return saveUserProfileUpdate({
      db: options.db,
      memberUserId: options.memberUserId,
      updateData: buildRankingMessageUpdate(options.message, deps)
    });
  }

  function createProfileRepository(deps = {}) {
    const firestoreDeps = {
      getFirestoreFieldValue: deps.getFirestoreFieldValue
    };
    return {
      saveProfileImageEditorSelection: options => root.DJ48AccountData.saveProfileImageEditorSelection(options, firestoreDeps),
      saveRankingMessageForMember: options => saveRankingMessageForMember(options, firestoreDeps),
      saveSelectedTitleForMember: options => root.DJ48AccountData.saveSelectedTitleForMember(options, firestoreDeps)
    };
  }

  const api = {
    createProfileRepository
  };

  root.DJ48ProfileRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
