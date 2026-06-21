(function (root) {
  const HIDDEN_PUBLIC_RANKING_MEMBER_USER_IDS = new Set(['G4-C8-N23']);

  function getDocs(snapshot) {
    return Array.isArray(snapshot?.docs) ? snapshot.docs : [];
  }

  function getRankingRowMemberUserId(row = {}) {
    return String(row.memberUserId || row.userId || '').trim();
  }

  function isPublicRankingRowVisible(row = {}) {
    return !HIDDEN_PUBLIC_RANKING_MEMBER_USER_IDS.has(getRankingRowMemberUserId(row));
  }

  function getPublicRankingQueryLimit(limit) {
    return Math.max(0, Number(limit) || 0) + HIDDEN_PUBLIC_RANKING_MEMBER_USER_IDS.size;
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
        .limit(getPublicRankingQueryLimit(limit));
      try {
        return await db.collection('rankingRecords')
          .where('categoryKey', '==', categoryKey)
          .orderBy('score', 'desc')
          .orderBy('elapsedSeconds', 'asc')
          .limit(getPublicRankingQueryLimit(limit))
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
        getDocs(snapshot)
          .map(doc => ({ recordId: doc.id, ...(doc.data?.() || {}) }))
          .filter(isPublicRankingRowVisible),
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

  async function loadMemberProfilesForRankingRowsForDb(db, rows = [], deps = {}) {
    const lookupLimit = Number(deps.rankingProfileLookupLimit) || 180;
    const getRankingMemberUserId = deps.getRankingMemberUserId || (row => String(row?.memberUserId || row?.userId || '').trim());
    const getFirebaseStorage = deps.getFirebaseStorage || (() => null);
    const userIds = Array.from(new Set((rows || []).map(getRankingMemberUserId).filter(Boolean))).slice(0, lookupLimit);
    if(!db || !userIds.length) return {};
    const snapshots = await Promise.all(userIds.map(userId => Promise.all([
      db.collection('users').doc(userId).get().catch(() => null),
      db.collection('userTitleSummary').doc(userId).get().catch(() => null),
      db.collection('userLevelSummary').doc(userId).get().catch(() => null),
      db.collection('userRoomSettings').doc(userId).get().catch(() => null)
    ])));
    const profileMap = {};
    const computeLevelSummary = deps.computeLevelSummary || (totalXpInput => {
      const totalXp = Math.max(0, Math.round(Number(totalXpInput) || 0));
      const level = Math.min(50, Math.floor(totalXp / 50) + 1);
      return {
        level,
        xp: level >= 50 ? 0 : totalXp % 50,
        totalXp
      };
    });
    snapshots.forEach(([userSnapshot, titleSummarySnapshot, levelSummarySnapshot, roomSettingsSnapshot], index) => {
      if(!userSnapshot?.exists) return;
      const data = userSnapshot.data() || {};
      const titleSummary = titleSummarySnapshot?.exists ? titleSummarySnapshot.data() || {} : {};
      const levelSummary = levelSummarySnapshot?.exists ? levelSummarySnapshot.data() || {} : {};
      const computedLevelSummary = levelSummarySnapshot?.exists ? computeLevelSummary(levelSummary.totalXp || 0) : { level: 0, xp: 0, totalXp: 0 };
      const roomSettings = roomSettingsSnapshot?.exists ? roomSettingsSnapshot.data() || {} : {};
      profileMap[userIds[index]] = {
        userId: userIds[index],
        nickname: data.nickname || data.name || '',
        school: data.school || '',
        grade: data.grade || '',
        classNumber: data.classNumber || '',
        studentNumber: data.studentNumber || '',
        profileImageUrl: data.profileImageUrl || '',
        profileImageId: data.profileImageId || '',
        profileImageSource: data.profileImageSource || '',
        profileImageStoragePath: data.profileImageStoragePath || '',
        profileImageScale: data.profileImageScale,
        profileImageOffsetX: data.profileImageOffsetX,
        profileImageOffsetY: data.profileImageOffsetY,
        rankingMessage: data.rankingMessage || '',
        selectedTitleId: data.selectedTitleId || '',
        selectedTitleName: titleSummary.selectedTitleName || data.selectedTitleName || '',
        level: Number(computedLevelSummary.level) || 0,
        xp: Number(computedLevelSummary.xp) || 0,
        totalXp: Number(computedLevelSummary.totalXp) || 0,
        tier: levelSummary.tier || '',
        medalId: levelSummary.medalId || '',
        rankIconUrl: levelSummary.rankIconUrl || '',
        selectedTitleFrameItemId: roomSettings.selectedTitleFrameItemId || ''
      };
    });
    const missingTitleNameUsers = Object.values(profileMap).filter(profile => profile.selectedTitleId && !profile.selectedTitleName);
    if(missingTitleNameUsers.length) {
      const titleSnapshots = await Promise.all(missingTitleNameUsers.map(profile =>
        db.collection('userTitles').doc(profile.userId).collection('titles').doc(profile.selectedTitleId).get().catch(() => null)
      ));
      titleSnapshots.forEach((titleSnapshot, index) => {
        if(!titleSnapshot?.exists) return;
        const titleData = titleSnapshot.data() || {};
        missingTitleNameUsers[index].selectedTitleName = titleData.titleName || titleData.name || '';
      });
    }
    const stillMissingTitleUsers = Object.values(profileMap).filter(profile => profile.selectedTitleId && !profile.selectedTitleName);
    if(stillMissingTitleUsers.length) {
      const catalogSnapshots = await Promise.all(stillMissingTitleUsers.map(profile =>
        db.collection('titleCatalog').doc(profile.selectedTitleId).get().catch(() => null)
      ));
      catalogSnapshots.forEach((titleSnapshot, index) => {
        if(!titleSnapshot?.exists) return;
        const titleData = titleSnapshot.data() || {};
        stillMissingTitleUsers[index].selectedTitleName = titleData.titleName || titleData.title || titleData.name || '';
      });
    }
    const storage = getFirebaseStorage();
    const storageImageUsers = storage
      ? Object.values(profileMap).filter(profile => !profile.profileImageUrl && profile.profileImageStoragePath)
      : [];
    if(storageImageUsers.length) {
      const imageUrls = await Promise.all(storageImageUsers.map(profile =>
        storage.ref(profile.profileImageStoragePath).getDownloadURL().catch(() => '')
      ));
      imageUrls.forEach((url, index) => {
        if(url) storageImageUsers[index].profileImageUrl = url;
      });
    }
    return profileMap;
  }

  async function loadLimitedRankingRecordsForPlazaForDb(db, deps = {}) {
    const rankingPlazaCategoryKeys = deps.rankingPlazaCategoryKeys || [];
    const getEnabledRankingCategoryKeys = deps.getEnabledRankingCategoryKeys || (keys => keys || []);
    const getRankingPlazaCategoryRecordLimit = deps.getRankingPlazaCategoryRecordLimit || (() => Number(deps.rankingPlazaCategoryRecordLimit) || 40);
    const normalizeRecord = deps.normalizeRankingRecordFromFirestore || (doc => ({ recordId: doc.id, ...(doc.data?.() || {}) }));
    const enabledCategoryKeys = getEnabledRankingCategoryKeys(rankingPlazaCategoryKeys);
    if(!db || !enabledCategoryKeys.length) return [];
    const loadCategoryRecords = async categoryKey => {
      const limit = getRankingPlazaCategoryRecordLimit(categoryKey);
      const baseQuery = db.collection('rankingRecords')
        .where('categoryKey', '==', categoryKey)
        .limit(getPublicRankingQueryLimit(limit));
      try {
        return await db.collection('rankingRecords')
          .where('categoryKey', '==', categoryKey)
          .orderBy('score', 'desc')
          .orderBy('elapsedSeconds', 'asc')
          .limit(getPublicRankingQueryLimit(limit))
          .get();
      } catch(error) {
        deps.warn?.('Firestore ranking ordered query failed. Falling back to limited category query.', { categoryKey, error });
        return baseQuery.get();
      }
    };
    const snapshots = await Promise.all(enabledCategoryKeys.map(loadCategoryRecords));
    const byRecordId = new Map();
    snapshots.forEach(snapshot => {
      getDocs(snapshot).map(normalizeRecord).filter(record => {
        const mode = String(record.rankingMode || '').trim();
        return isPublicRankingRowVisible(record)
          && (!mode || mode === 'normal' || mode === 'speed' || mode === 'onechance' || mode === 'legacy' || mode === 'nohint');
      }).forEach(record => {
        byRecordId.set(record.recordId, record);
      });
    });
    return Array.from(byRecordId.values());
  }

  async function loadSeasonRankingRecordsForPlazaForDb(db, categoryKeys = [], deps = {}) {
    const getEnabledRankingCategoryKeys = deps.getEnabledRankingCategoryKeys || (keys => keys || []);
    const getRankingPlazaCategoryRecordLimit = deps.getRankingPlazaCategoryRecordLimit || (() => Number(deps.rankingPlazaCategoryRecordLimit) || 40);
    const normalizeRecord = deps.normalizeRankingRecordFromFirestore || (doc => ({ recordId: doc.id, ...(doc.data?.() || {}) }));
    const enabledCategoryKeys = getEnabledRankingCategoryKeys(Array.from(new Set(categoryKeys || [])));
    if(!db || !enabledCategoryKeys.length) return [];
    const loadCategoryRecords = async categoryKey => {
      const limit = Math.max(80, getRankingPlazaCategoryRecordLimit(categoryKey));
      return db.collection('rankingRecords')
        .where('categoryKey', '==', categoryKey)
        .limit(getPublicRankingQueryLimit(limit))
        .get();
    };
    const snapshots = await Promise.all(enabledCategoryKeys.map(loadCategoryRecords));
    const byRecordId = new Map();
    snapshots.forEach(snapshot => {
      getDocs(snapshot).map(normalizeRecord).filter(isPublicRankingRowVisible).forEach(record => {
        byRecordId.set(record.recordId, record);
      });
    });
    return Array.from(byRecordId.values());
  }

  function createRankingRepository(options = {}, deps = {}) {
    const db = options.db;
    if(!db) throw new Error('firestore-unavailable');

    return {
      async loadQuizKingSummaries(limit = 10) {
        const snapshot = await db.collection('quizKingSummary')
          .orderBy('totalScore', 'desc')
          .limit(getPublicRankingQueryLimit(limit))
          .get();
        return getDocs(snapshot).map(doc => ({
          memberUserId: doc.id,
          ...(doc.data?.() || {})
        })).filter(isPublicRankingRowVisible);
      },

      loadLimitedRankingRecordsForPlaza() {
        if(deps.loadLimitedRankingRecordsForPlaza) return deps.loadLimitedRankingRecordsForPlaza(db);
        return loadLimitedRankingRecordsForPlazaForDb(db, deps);
      },

      loadSeasonRankingRecordsForPlaza(categoryKeys) {
        if(deps.loadSeasonRankingRecordsForPlaza) return deps.loadSeasonRankingRecordsForPlaza(db, categoryKeys);
        return loadSeasonRankingRecordsForPlazaForDb(db, categoryKeys, deps);
      },

      loadMemberProfilesForRankingRows(rows) {
        if(deps.loadMemberProfilesForRankingRows) return deps.loadMemberProfilesForRankingRows(db, rows);
        return loadMemberProfilesForRankingRowsForDb(db, rows, deps);
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
    loadLimitedRankingRecordsForPlazaForDb,
    loadSeasonRankingRecordsForPlazaForDb,
    loadMemberProfilesForRankingRowsForDb,
    loadProfileRankingRankContextForDb,
    isPublicRankingRowVisible
  };

  root.DJ48RankingRepository = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
