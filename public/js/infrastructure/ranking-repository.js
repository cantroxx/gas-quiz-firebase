(function (root) {
  const HIDDEN_PUBLIC_RANKING_MEMBER_USER_IDS = new Set(['G4-C8-N23']);
  let documentCache = new WeakMap();
  const CACHE_MS = 60000;

  function clearRankingReadCache() { documentCache = new WeakMap(); }

  function readRankingDocument(db, documentPath, deps = {}) {
    let cache = documentCache.get(db);
    if(!cache) { cache = new Map(); documentCache.set(db, cache); }
    const authUid = root.firebase?.auth?.().currentUser?.uid || '';
    const memberId = deps.getCurrentMemberUserId?.() || root.DJ48AccountState?.getCurrentMemberUserId?.() || '';
    const key = `${authUid}:${memberId}:${documentPath}`;
    const previous = cache.get(key);
    if(previous && (previous.pending || previous.expires > Date.now())) return previous.promise;
    const parts = documentPath.split('/');
    let ref = db.collection(parts[0]).doc(parts[1]);
    for(let i = 2; i < parts.length; i += 2) ref = ref.collection(parts[i]).doc(parts[i + 1]);
    const entry = { pending: true, expires: 0 };
    entry.promise = ref.get().then(snapshot => {
      entry.pending = false; entry.expires = Date.now() + CACHE_MS; return snapshot;
    }, error => { cache.delete(key); throw error; });
    cache.set(key, entry);
    return entry.promise;
  }

  function getDocs(snapshot) {
    return Array.isArray(snapshot?.docs) ? snapshot.docs : [];
  }

  function getRankingRowMemberUserId(row = {}) {
    return String(row.memberUserId || row.userId || '').trim();
  }

  function isPublicRankingRowVisible(row = {}) {
    if(String(row.categoryKey || '').startsWith('popular-v2-')) {
      if(!String(row.recordId || '').startsWith('popular_v2_') || row.sourceSheet !== 'popular-quiz-server' || row.rulesVersion !== 'popular-20261018-v2' || row.visible === false) return false;
    }
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
    const selfId = deps.getCurrentMemberUserId?.() || root.DJ48AccountState?.getCurrentMemberUserId?.() || root.firebase?.auth?.().currentUser?.uid || '';
    const read = path => readRankingDocument(db, path, deps).catch(() => null);
    const snapshots = await Promise.all(userIds.map(userId => Promise.all([
      read(`users/${userId}`),
      userId === selfId ? read(`userTitleSummary/${userId}`) : null,
      read(`userLevelSummary/${userId}`),
      userId === selfId ? read(`userRoomSettings/${userId}`) : null
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
        authUid: data.authUid || '',
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
        gameHonors: data.gameHonors || {},
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
    const missingTitleNameUsers = Object.values(profileMap).filter(profile => profile.userId === selfId && profile.selectedTitleId && !profile.selectedTitleName);
    if(missingTitleNameUsers.length) {
      const titleSnapshots = await Promise.all(missingTitleNameUsers.map(profile =>
        read(`userTitles/${profile.userId}/titles/${profile.selectedTitleId}`)
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
        read(`titleCatalog/${profile.selectedTitleId}`)
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
    const enabledCategoryKeys = Array.from(new Set(getEnabledRankingCategoryKeys(rankingPlazaCategoryKeys)));
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

  async function loadSeasonRankingRecordsForPlazaForDb(db, categoryKeys = [], deps = {}, seasonEvents = []) {
    const getEnabledRankingCategoryKeys = deps.getEnabledRankingCategoryKeys || (keys => keys || []);
    const normalizeRecord = deps.normalizeRankingRecordFromFirestore || (doc => ({ recordId: doc.id, ...(doc.data?.() || {}) }));
    const enabledCategoryKeys = getEnabledRankingCategoryKeys(Array.from(new Set(categoryKeys || [])));
    if(!db || !enabledCategoryKeys.length) return [];
    const ranges = seasonEvents.filter(item => item.active !== false).map(item => ({
      start: Date.parse(`${item.periodStartDate || item.startDate}T00:00:00+09:00`),
      end: Date.parse(`${item.periodEndDate || item.endDate}T23:59:59.999+09:00`)
    })).filter(range => Number.isFinite(range.start) && Number.isFinite(range.end) && range.start <= range.end);
    if(!ranges.length) return [];
    const start = new Date(Math.min(...ranges.map(range => range.start)));
    const end = new Date(Math.max(...ranges.map(range => range.end)));
    const loadCategoryRecords = async categoryKey => {
      const baseQuery = db.collection('rankingRecords')
        .where('categoryKey', '==', categoryKey)
        .where('recordedAt', '>=', start)
        .where('recordedAt', '<=', end)
        .orderBy('recordedAt', 'desc');
      const docs = [];
      let cursor;
      while(true) {
        const query = cursor ? baseQuery.startAfter(cursor) : baseQuery;
        const page = getDocs(await query.limit(200).get());
        docs.push(...page);
        if(page.length < 200) break;
        cursor = page[page.length - 1];
      }
      return { docs };
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
      async loadSubjectRankingSnapshot() {
        if(!root.firebase?.auth?.().currentUser) throw new Error('과목 랭킹은 로그인 후 확인할 수 있습니다.');
        return (await root.firebase.app().functions('asia-northeast3').httpsCallable('subjectQuizAction')({action:'rankingSnapshot'})).data;
      },
      async loadSubjectRankingRecords(subject, limit = 10) {
        if(!root.firebase?.auth?.().currentUser) throw new Error('과목 랭킹은 로그인 후 확인할 수 있습니다.');
        return (await root.firebase.app().functions('asia-northeast3').httpsCallable('subjectQuizAction')({ action: 'subjectRankings', subject, limit })).data;
      },
      async loadSubjectMemberRankings(memberUserId) {
        if(!root.firebase?.auth?.().currentUser) throw new Error('과목 랭킹은 로그인 후 확인할 수 있습니다.');
        return (await root.firebase.app().functions('asia-northeast3').httpsCallable('subjectQuizAction')({ action: 'memberRankings', memberUserId })).data;
      },
      async loadQuizKingSummaries(limit = 10) {
        const current=await this.loadSubjectRankingSnapshot();
        return current.summaries.filter(isPublicRankingRowVisible).slice(0,limit);
      },

      loadLimitedRankingRecordsForPlaza(categoryKeys) {
        if(deps.loadLimitedRankingRecordsForPlaza) return deps.loadLimitedRankingRecordsForPlaza(db);
        return loadLimitedRankingRecordsForPlazaForDb(db, categoryKeys ? { ...deps, rankingPlazaCategoryKeys: categoryKeys } : deps);
      },

      loadSeasonRankingRecordsForPlaza(categoryKeys, seasonEvents = []) {
        if(deps.loadSeasonRankingRecordsForPlaza) return deps.loadSeasonRankingRecordsForPlaza(db, categoryKeys, seasonEvents);
        return loadSeasonRankingRecordsForPlazaForDb(db, categoryKeys, deps, seasonEvents);
      },

      loadMemberProfilesForRankingRows(rows) {
        if(deps.loadMemberProfilesForRankingRows) return deps.loadMemberProfilesForRankingRows(db, rows);
        return loadMemberProfilesForRankingRowsForDb(db, rows, deps);
      },

      async loadMemberRankingRecords(memberUserId, limit = 500) {
        if(!root.firebase?.auth?.().currentUser) throw new Error('로그인 후 기록을 확인할 수 있습니다.');
        const call=root.firebase.app().functions('asia-northeast3').httpsCallable('popularQuizAction');
        const [popular,generated]=await Promise.all([call({action:'memberRankings',memberUserId}),this.loadSubjectMemberRankings(memberUserId)]);
        return [...popular.data.records,...generated.records].filter(row=>row.memberUserId===memberUserId);
      },

      loadProfileRankingRankContext(bestRows) {
        if(deps.loadProfileRankingRankContext) return deps.loadProfileRankingRankContext(db, bestRows);
        return loadProfileRankingRankContextForDb(db, bestRows, deps);
      }
    };
  }

  const api = {
    readRankingDocument,
    clearRankingReadCache,
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
