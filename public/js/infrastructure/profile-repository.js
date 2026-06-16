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

  async function searchProfileImageCandidates(options = {}) {
    const { db, query = '', limit = 24 } = options;
    if(!db) throw new Error('firestore-unavailable');
    const snapshot = await db.collection('profileImageCandidates')
      .where('keywords', 'array-contains', query)
      .limit(limit)
      .get();
    return snapshot.docs.map(doc => ({ candidateId: doc.id, ...doc.data() }));
  }

  function saveRankingMessageForMember(options = {}, deps = {}) {
    return saveUserProfileUpdate({
      db: options.db,
      memberUserId: options.memberUserId,
      updateData: buildRankingMessageUpdate(options.message, deps)
    });
  }

  function buildSelectedTitleUpdate(titleId, deps = {}) {
    const fieldValue = deps.getFirestoreFieldValue?.();
    return {
      selectedTitleId: String(titleId || '').trim(),
      updatedAt: fieldValue.serverTimestamp()
    };
  }

  async function saveSelectedTitleForMember(options = {}, deps = {}) {
    const selectedTitleId = String(options.titleId || '').trim();
    if(!options.memberUserId) throw new Error('member-required');
    if(!options.db) throw new Error('firestore-unavailable');
    if(selectedTitleId) {
      const titleSnapshot = await options.db
        .collection('userTitles')
        .doc(options.memberUserId)
        .collection('titles')
        .doc(selectedTitleId)
        .get();
      if(!titleSnapshot.exists) throw new Error('title-not-owned');
    }
    return saveUserProfileUpdate({
      db: options.db,
      memberUserId: options.memberUserId,
      updateData: buildSelectedTitleUpdate(selectedTitleId, deps)
    });
  }

  function createProfileRepository(deps = {}) {
    const firestoreDeps = {
      getFirestoreFieldValue: deps.getFirestoreFieldValue
    };
    return {
      searchProfileImageCandidates,
      saveProfileImageEditorSelection: options => root.DJ48AccountData.saveProfileImageEditorSelection(options, firestoreDeps),
      saveRankingMessageForMember: options => saveRankingMessageForMember(options, firestoreDeps),
      saveSelectedTitleForMember: options => saveSelectedTitleForMember(options, firestoreDeps)
    };
  }

  const api = {
    createProfileRepository
  };

  root.DJ48ProfileRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
