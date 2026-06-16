(function (root, factory) {
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  root.DJ48RankingDomain = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  function getRankingRecordTimeValue(record) {
    const value = record?.recordedAt || record?.createdAt || record?.migratedAt;
    if(value?.toMillis) return value.toMillis();
    const parsed = Date.parse(String(value || ''));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function getRankingRecordUserKey(record) {
    return String(record?.memberUserId || record?.userId || record?.displayName || record?.nickname || '').trim();
  }

  function getRankingRecordMode(record) {
    return String(record?.rankingMode || 'normal').trim() || 'normal';
  }

  function getRankingModeFilterValues(modeId) {
    const mode = String(modeId || '').trim();
    if(!mode || mode === 'all') return null;
    if(mode === 'normal') return ['normal', 'legacy'];
    return [mode];
  }

  function isRankingModeAllowed(record, allowedModes) {
    if(!allowedModes) return true;
    return allowedModes.has(getRankingRecordMode(record));
  }

  function getRankingRecordGroupMode(record, allowedModes) {
    const mode = getRankingRecordMode(record);
    if(allowedModes?.has('normal') && mode === 'legacy') return 'normal';
    return mode;
  }

  function isBetterRankingEntry(next, current) {
    if(!current) return true;
    if((next.score || 0) !== (current.score || 0)) return (next.score || 0) > (current.score || 0);
    const nextTime = Number(next.elapsedSeconds) || 999999999;
    const currentTime = Number(current.elapsedSeconds) || 999999999;
    return nextTime < currentTime;
  }

  function isBetterCategoryRankingRecord(candidate, current) {
    if(!current) return true;
    const scoreDiff = (Number(candidate.score) || 0) - (Number(current.score) || 0);
    if(scoreDiff) return scoreDiff > 0;
    const candidateTime = Number(candidate.elapsedSeconds) || 999999999;
    const currentTime = Number(current.elapsedSeconds) || 999999999;
    if(candidateTime !== currentTime) return candidateTime < currentTime;
    return getRankingRecordTimeValue(candidate) > getRankingRecordTimeValue(current);
  }

  function sortRankingRows(rows) {
    return rows.slice().sort((a, b) => {
      const scoreDiff = (Number(b.score) || 0) - (Number(a.score) || 0);
      if(scoreDiff) return scoreDiff;
      return (Number(a.elapsedSeconds) || 999999999) - (Number(b.elapsedSeconds) || 999999999);
    });
  }

  function getBestRankingRecordsByUser(records) {
    const bestByUser = new Map();
    records.forEach(record => {
      const userKey = getRankingRecordUserKey(record);
      if(!userKey) return;
      const current = bestByUser.get(userKey);
      if(isBetterCategoryRankingRecord(record, current)) bestByUser.set(userKey, record);
    });
    return Array.from(bestByUser.values());
  }

  function normalizeRankingCategoryKey(categoryKey, category = '') {
    const key = String(categoryKey || '').trim();
    const label = String(category || '').trim();
    if(key === '티니핑' || key === '인물티니핑' || label.includes('티니핑')) return '티니핑';
    return key;
  }

  function getRankingCategoryKey(record) {
    return normalizeRankingCategoryKey(record?.categoryKey || record?.category, record?.category || record?.rawCategory || '');
  }

  function getBestRankingRecordsByUserAndCategory(records, categoryKeys, rankingModes = null) {
    const allowedModes = Array.isArray(rankingModes) && rankingModes.length
      ? new Set(rankingModes.map(mode => String(mode || '').trim()).filter(Boolean))
      : null;
    const allowedCategoryKeys = new Set((categoryKeys || []).map(normalizeRankingCategoryKey).filter(Boolean));
    const bestByUserAndCategory = new Map();
    records
      .filter(record => allowedCategoryKeys.has(getRankingCategoryKey(record)))
      .filter(record => isRankingModeAllowed(record, allowedModes))
      .forEach(record => {
        const userKey = getRankingRecordUserKey(record);
        const categoryKey = getRankingCategoryKey(record);
        if(!userKey) return;
        const key = `${categoryKey}::${userKey}`;
        const current = bestByUserAndCategory.get(key);
        if(isBetterCategoryRankingRecord(record, current)) bestByUserAndCategory.set(key, record);
      });
    return Array.from(bestByUserAndCategory.values());
  }

  function getTopRankingRecordsByCategoryKeys(records, categoryKeys, limit = 10, rankingModes = null) {
    return sortRankingRows(getBestRankingRecordsByUserAndCategory(records, categoryKeys, rankingModes)).slice(0, limit);
  }

  function getLatestRankingRecords(records, limit = 10) {
    return records.slice().sort((a, b) => getRankingRecordTimeValue(b) - getRankingRecordTimeValue(a)).slice(0, limit);
  }

  function getTopQuizKingSummaries(summaries, limit = 10) {
    return summaries
      .slice()
      .sort((a, b) => {
        const scoreDiff = (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0);
        if(scoreDiff) return scoreDiff;
        return (Number(b.categoryCount) || 0) - (Number(a.categoryCount) || 0);
      })
      .slice(0, limit);
  }

  function buildQuizKingSummariesFromRankingRecords(records) {
    const bestByUser = {};
    records.forEach(record => {
      const userKey = getRankingRecordUserKey(record);
      const categoryKey = getRankingCategoryKey(record);
      if(!userKey || !categoryKey) return;
      if(!bestByUser[userKey]) {
        bestByUser[userKey] = {
          memberUserId: record.memberUserId || record.userId || userKey,
          userId: record.userId || record.memberUserId || userKey,
          displayName: record.displayName || record.nickname || userKey,
          displayNickname: record.displayNickname || record.displayName || record.nickname || '',
          selectedTitleName: record.selectedTitleName || '',
          profileImageUrl: record.profileImageUrl || '',
          rankingMessage: record.rankingMessage || '',
          categories: {}
        };
      }
      const current = bestByUser[userKey].categories[categoryKey];
      if(!current || isBetterRankingEntry(record, current)) {
        bestByUser[userKey].categories[categoryKey] = {
          ...record,
          categoryKey,
          category: categoryKey === '티니핑' ? '티니핑' : record.category
        };
      }
    });
    return Object.values(bestByUser).map(item => {
      const categories = Object.values(item.categories);
      return {
        ...item,
        categoryCount: categories.length,
        totalScore: categories.reduce((sum, record) => sum + (Number(record.score) || 0), 0)
      };
    });
  }

  function getPopularOverallRows(records, keys, deps = {}) {
    const allowedKeys = new Set((keys || []).map(normalizeRankingCategoryKey).filter(Boolean));
    const bestByUserAndBucket = new Map();
    records
      .filter(record => allowedKeys.has(getRankingCategoryKey(record)))
      .forEach(record => {
        const userKey = getRankingRecordUserKey(record);
        if(!userKey) return;
        const area = deps.getPopularAreaForRecord?.(record) || {};
        const bucket = area.id === 'pokemon' || area.id === 'tiniping'
          ? area.id
          : `${getRankingCategoryKey(record)}::${getRankingRecordMode(record)}`;
        const key = `${bucket}::${userKey}`;
        const current = bestByUserAndBucket.get(key);
        if(isBetterCategoryRankingRecord(record, current)) bestByUserAndBucket.set(key, record);
      });
    return sortRankingRows(Array.from(bestByUserAndBucket.values())).slice(0, Number(deps.rowLimit) || 10);
  }

  function getPopularUniqueUserRows(records, keys, modeValues, deps = {}) {
    const allowedModes = Array.isArray(modeValues) && modeValues.length ? new Set(modeValues) : null;
    const allowedKeys = new Set((keys || []).map(normalizeRankingCategoryKey).filter(Boolean));
    const filtered = records
      .filter(record => allowedKeys.has(getRankingCategoryKey(record)))
      .filter(record => isRankingModeAllowed(record, allowedModes));
    return sortRankingRows(getBestRankingRecordsByUser(filtered)).slice(0, Number(deps.rowLimit) || 10);
  }

  function getPopularFilteredRows(records, options = {}, deps = {}) {
    const areaId = options.areaId || 'all';
    const areas = options.areas || [];
    const area = areas.find(item => item.id === areaId) || areas[0] || { keys: [] };
    let keys = area.keys || [];
    if(areaId === 'all') return getPopularOverallRows(records, keys, deps);
    if(areaId === 'pokemon') {
      const difficulty = (options.difficulties || []).find(item => item.id === options.difficultyId);
      keys = difficulty ? difficulty.keys : (options.pokemonRankingCategoryKeys || []);
    }
    const modeValues = getRankingModeFilterValues(options.modeId || 'all');
    if(areaId === 'pokemon' || areaId === 'tiniping') return getPopularUniqueUserRows(records, keys, modeValues, deps);
    return getTopRankingRecordsByCategoryKeys(records, keys, Number(deps.rowLimit) || 10, modeValues);
  }

  return {
    getRankingRecordTimeValue,
    getRankingRecordUserKey,
    getRankingRecordMode,
    getRankingModeFilterValues,
    isRankingModeAllowed,
    getRankingRecordGroupMode,
    isBetterRankingEntry,
    isBetterCategoryRankingRecord,
    sortRankingRows,
    getBestRankingRecordsByUser,
    normalizeRankingCategoryKey,
    getRankingCategoryKey,
    getBestRankingRecordsByUserAndCategory,
    getTopRankingRecordsByCategoryKeys,
    getLatestRankingRecords,
    getTopQuizKingSummaries,
    buildQuizKingSummariesFromRankingRecords,
    getPopularOverallRows,
    getPopularUniqueUserRows,
    getPopularFilteredRows
  };
});
