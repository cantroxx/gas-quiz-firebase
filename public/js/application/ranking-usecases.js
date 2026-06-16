(function (root) {
  function getDocs(snapshot) {
    return Array.isArray(snapshot?.docs) ? snapshot.docs : [];
  }

  async function loadRankingPlazaData(options = {}, deps = {}) {
    const db = deps.getFirestoreDb?.();
    if(!db) throw new Error('firestore-unavailable');
    await deps.initializeAuthUser?.();

    const rowLimit = Number(options.rowLimit) || 10;
    const [quizKingSnapshot, rankingRecords] = await Promise.all([
      db.collection('quizKingSummary').orderBy('totalScore', 'desc').limit(rowLimit).get(),
      deps.loadLimitedRankingRecordsForPlaza(db)
    ]);

    const rawQuizKingSummaries = getDocs(quizKingSnapshot).map(doc => ({
      memberUserId: doc.id,
      ...(doc.data?.() || {})
    }));
    const filteredRankingRecords = (rankingRecords || []).filter(row => deps.isRankingRowEnabledByFlags?.(row) !== false);
    const profileMap = await deps.loadMemberProfilesForRankingRows(
      db,
      rawQuizKingSummaries.concat(filteredRankingRecords)
    );
    const mergeRankingRowWithMemberProfile = deps.mergeRankingRowWithMemberProfile || (row => row);
    const enrichedQuizKingSummaries = rawQuizKingSummaries.map(row => mergeRankingRowWithMemberProfile(row, profileMap));
    const enrichedRankingRecords = filteredRankingRecords.map(row => mergeRankingRowWithMemberProfile(row, profileMap));
    const quizKingSummaries = enrichedQuizKingSummaries.length
      ? enrichedQuizKingSummaries
      : deps.buildQuizKingSummariesFromRankingRecords(enrichedRankingRecords);
    const quizKing = deps.getTopQuizKingSummaries(quizKingSummaries, 1)[0] || null;
    const getBestRankingRecordByCategoryKeys = deps.getBestRankingRecordByCategoryKeys || (() => null);
    const popularCategoryKeys = options.popularCategoryKeys || [];

    return {
      cards: [
        deps.buildQuizKingCard(quizKing),
        deps.buildRankingRecordCard('korean_king', '📚', '국어왕', getBestRankingRecordByCategoryKeys(enrichedRankingRecords, options.koreanCategoryKeys || [])),
        deps.buildRankingRecordCard('social_king', '🏛️', '사회왕', getBestRankingRecordByCategoryKeys(enrichedRankingRecords, options.socialCategoryKeys || [])),
        deps.buildRankingRecordCard('math_king', '➗', '수학왕', getBestRankingRecordByCategoryKeys(enrichedRankingRecords, options.mathCategoryKeys || [])),
        deps.buildRankingRecordCard('popular_king', '⭐', '인기왕', getBestRankingRecordByCategoryKeys(enrichedRankingRecords, popularCategoryKeys))
      ],
      boards: deps.getRankingBoardModels(quizKingSummaries, enrichedRankingRecords)
    };
  }

  function renderRankingView(options = {}, deps = {}) {
    const fallbackCards = options.fallbackCards || [];
    const loadingCards = fallbackCards.map(entry => ({ ...entry, title: options.loadingTitle || '랭킹 불러오는 중' }));
    deps.renderRankingCards(loadingCards);
    deps.renderRankingBoards(null);
    return deps.loadRankingPlazaCards()
      .then(model => {
        deps.renderRankingCards(model?.cards?.length ? model.cards : fallbackCards);
        deps.renderRankingBoards(model);
        return model;
      })
      .catch(error => {
        deps.warn?.('Firestore ranking plaza read failed. Using static ranking fallback.', error);
        deps.renderRankingCards(fallbackCards);
        deps.renderRankingBoards(null);
        return null;
      });
  }

  async function loadProfileRankingRecordsData(options = {}, deps = {}) {
    const db = deps.getFirestoreDb?.();
    const memberUserId = String(options.memberUserId || '').trim();
    if(!db || !memberUserId) return { records: [], rankContext: {} };

    const snapshot = await db.collection('rankingRecords')
      .where('memberUserId', '==', memberUserId)
      .limit(Number(options.recordLimit) || 500)
      .get();
    const normalizeRecord = deps.normalizeRecord || (doc => ({ recordId: doc.id, ...(doc.data?.() || {}) }));
    const records = getDocs(snapshot)
      .map(normalizeRecord)
      .filter(record => deps.isRankingRowEnabledByFlags?.(record) !== false);
    const positiveRows = records.filter(record => Number(record.score) > 0);
    const bestRows = deps.getProfileBestRankingRecords(positiveRows)
      .sort(deps.compareProfileBestRankingRecords)
      .slice(0, Number(options.bestContextLimit) || 5);
    const rankContext = await deps.loadProfileRankingRankContext(db, bestRows);
    return { records, rankContext };
  }

  async function renderProfileRankingRecordsFlow(options = {}, deps = {}) {
    deps.setProfileRankingLoading?.();
    const { records, rankContext } = await loadProfileRankingRecordsData(options, deps);
    deps.renderProfileRankingRecords(records, rankContext);
    return records;
  }

  const api = {
    loadRankingPlazaData,
    renderRankingView,
    loadProfileRankingRecordsData,
    renderProfileRankingRecordsFlow
  };

  root.DJ48RankingUsecases = api;
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
