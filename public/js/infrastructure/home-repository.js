(function (root) {
  function createHomeRepository(deps = {}) {
    function getFirestoreDb() {
      return deps.getFirestoreDb?.() || null;
    }

    return {
      getUserEconomyForRender() {
        return deps.getUserEconomyForRender?.();
      },
      async getUserTitleSummary(memberUserId) {
        const db = getFirestoreDb();
        if(!db || !memberUserId) return null;
        return db.collection('userTitleSummary').doc(memberUserId).get().catch(() => null);
      },
      async getUserLevelSummary(memberUserId) {
        const db = getFirestoreDb();
        if(!db || !memberUserId) return null;
        return db.collection('userLevelSummary').doc(memberUserId).get().catch(() => null);
      },
      async getUserTitles(memberUserId) {
        const db = getFirestoreDb();
        if(!db || !memberUserId) return null;
        return db.collection('userTitles').doc(memberUserId).collection('titles').get().catch(() => null);
      },
      async getUserBadges(memberUserId) {
        const db = getFirestoreDb();
        if(!db || !memberUserId) return null;
        return db.collection('userBadges').doc(memberUserId).collection('badges').get().catch(() => null);
      },
      async loadTitleCatalog(options = {}) {
        const db = getFirestoreDb();
        if(!db) throw new Error('firestore-unavailable');
        const snapshot = await db.collection('titleCatalog').orderBy('order').get();
        const normalizeTitleCatalogDoc = options.normalizeTitleCatalogDoc || (doc => ({
          titleId: doc.id,
          ...(doc.data?.() || {})
        }));
        return snapshot.docs.map(normalizeTitleCatalogDoc);
      }
    };
  }

  const api = {
    createHomeRepository
  };

  root.DJ48HomeRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
