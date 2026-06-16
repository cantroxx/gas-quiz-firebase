(function (root) {
  function getDocs(snapshot) {
    return Array.isArray(snapshot?.docs) ? snapshot.docs : [];
  }

  function createRankingRepository(options = {}, deps = {}) {
    const db = options.db;
    if(!db) throw new Error('firestore-unavailable');

    return {
      async loadQuizKingSummaries(limit = 10) {
        const snapshot = await db.collection('quizKingSummary')
          .orderBy('totalScore', 'desc')
          .limit(limit)
          .get();
        return getDocs(snapshot).map(doc => ({
          memberUserId: doc.id,
          ...(doc.data?.() || {})
        }));
      },

      loadLimitedRankingRecordsForPlaza() {
        return deps.loadLimitedRankingRecordsForPlaza(db);
      },

      loadMemberProfilesForRankingRows(rows) {
        return deps.loadMemberProfilesForRankingRows(db, rows);
      },

      async loadMemberRankingRecords(memberUserId, limit = 500) {
        const snapshot = await db.collection('rankingRecords')
          .where('memberUserId', '==', memberUserId)
          .limit(limit)
          .get();
        const normalizeRecord = deps.normalizeRecord || (doc => ({ recordId: doc.id, ...(doc.data?.() || {}) }));
        return getDocs(snapshot).map(normalizeRecord);
      },

      loadProfileRankingRankContext(bestRows) {
        return deps.loadProfileRankingRankContext(db, bestRows);
      }
    };
  }

  const api = {
    createRankingRepository
  };

  root.DJ48RankingRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
