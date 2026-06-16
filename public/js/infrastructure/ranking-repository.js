(function (root) {
  function getDocs(snapshot) {
    return Array.isArray(snapshot?.docs) ? snapshot.docs : [];
  }

  async function loadProfileRankingRankContextForDb(db, bestRows = [], deps = {}) {
    const categoryKeys = Array.from(new Set(bestRows.map(deps.getProfileRankingCategoryKey).filter(Boolean)));
    if(!db || !categoryKeys.length) return {};
    const snapshots = await Promise.all(categoryKeys.map(async categoryKey => {
      const limit = Math.max(
        deps.profileRankingContextLimit || 0,
        deps.getRankingPlazaCategoryRecordLimit?.(categoryKey) || 0
      );
      const baseQuery = db.collection('rankingRecords')
        .where('categoryKey', '==', categoryKey)
        .limit(limit);
      try {
        return await db.collection('rankingRecords')
          .where('categoryKey', '==', categoryKey)
          .orderBy('score', 'desc')
          .orderBy('elapsedSeconds', 'asc')
          .limit(limit)
          .get();
      } catch(error) {
        deps.warn?.('Firestore profile ranking ordered rank read failed. Falling back to limited category query.', { categoryKey, error });
        return baseQuery.get().catch(fallbackError => {
          deps.warn?.('Firestore profile ranking rank read failed.', { categoryKey, error: fallbackError });
          return null;
        });
      }
    }));
    const rankContext = {};
    snapshots.forEach((snapshot, index) => {
      if(!snapshot) return;
      const categoryKey = categoryKeys[index];
      const limit = Math.max(
        deps.profileRankingContextLimit || 0,
        deps.getRankingPlazaCategoryRecordLimit?.(categoryKey) || 0
      );
      const topRows = deps.getTopRankingRecordsByCategoryKeys(
        getDocs(snapshot).map(doc => ({ recordId: doc.id, ...(doc.data?.() || {}) })),
        [categoryKey],
        limit
      );
      topRows.forEach((row, rowIndex) => {
        const rankInfo = {
          rank: rowIndex + 1,
          total: topRows.length
        };
        rankContext[deps.getProfileRankingRowKey(row)] = rankInfo;
        if(deps.getRankingRecordUserKey(row) === deps.getCurrentMemberUserId?.()) {
          rankContext[categoryKey] = rankInfo;
        }
      });
    });
    return rankContext;
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
        if(deps.loadProfileRankingRankContext) return deps.loadProfileRankingRankContext(db, bestRows);
        return loadProfileRankingRankContextForDb(db, bestRows, deps);
      }
    };
  }

  const api = {
    createRankingRepository,
    loadProfileRankingRankContextForDb
  };

  root.DJ48RankingRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
