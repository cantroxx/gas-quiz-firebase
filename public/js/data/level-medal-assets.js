(function (root) {
  const LEVEL_MEDAL_MAX = 50;
  const LEVEL_MEDAL_ROOT = '/images/classroom-assets/medals/levels';

  function padLevel(level) {
    return String(Math.max(1, Math.min(LEVEL_MEDAL_MAX, Math.round(Number(level) || 1)))).padStart(2, '0');
  }

  function getLevelMedalTier(level) {
    const safeLevel = Math.max(1, Math.min(LEVEL_MEDAL_MAX, Math.round(Number(level) || 1)));
    if(safeLevel >= 46) return 'master-champion';
    if(safeLevel >= 41) return 'legend-crown';
    if(safeLevel >= 31) return 'gem-crystal';
    if(safeLevel >= 21) return 'trophy-shield';
    if(safeLevel >= 11) return 'silver-gold-medal';
    return 'bronze-basic';
  }

  const LEVEL_MEDAL_ASSETS = Object.freeze(Array.from({ length: LEVEL_MEDAL_MAX }, (_, index) => {
    const level = index + 1;
    const padded = padLevel(level);
    return Object.freeze({
      assetId: `classroom_level_medal_${padded}`,
      medalId: `${level <= 15 ? 'bronze' : level <= 35 ? 'silver' : 'gold'}-${padded}`,
      type: 'classroomLevelMedal',
      name: `레벨 ${level} 훈장`,
      level,
      tier: getLevelMedalTier(level),
      path: `${LEVEL_MEDAL_ROOT}/level-${padded}-v1.png`,
      status: 'selected',
      source: 'Recraft grid #1 crop, original unmodified',
      usage: ['homeProfile', 'levelReward', 'studentProfile']
    });
  }));

  function getLevelMedalAsset(level) {
    const safeLevel = Math.max(1, Math.min(LEVEL_MEDAL_MAX, Math.round(Number(level) || 1)));
    return LEVEL_MEDAL_ASSETS[safeLevel - 1] || LEVEL_MEDAL_ASSETS[0];
  }

  root.DJ48LevelMedalAssets = {
    LEVEL_MEDAL_MAX,
    LEVEL_MEDAL_ASSETS,
    getLevelMedalAsset
  };

  if(typeof module !== 'undefined' && module.exports) {
    module.exports = root.DJ48LevelMedalAssets;
  }
})(typeof window !== 'undefined' ? window : globalThis);
