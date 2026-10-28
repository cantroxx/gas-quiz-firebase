(function (root) {
  'use strict';
  // Reviewed item codes, not broad words such as "심볼" or "이벤트".
  const groups = [
    { reason: 'transparent-variants-not-offered', codes: [1003271, 1003276, 1702099, 1702190, 1702653] },
    { reason: 'hyper-burning-reward', codes: [1006056, 1053879, 1703240] },
    { reason: 'burning-beyond-reward', codes: [1022394, 1103893] },
    { reason: 'meirin-boss-reward', codes: [42740, 22060, 1007215, 1012931, 1050908, 1051989, 1070226, 1071243, 1104072, 1703933] },
    { reason: 'chuchu-event-reward', codes: [1005781, 1050583, 1051656, 1073534, 1103332, 1703084] },
    // Acquisition evidence: docs/product/COORDI_POPULARITY_REWARD_AUDIT_2026-09-29.md.
    { reason: 'reviewed-growth-reward', codes: [1703168, 1082893, 1104078, 1103977] },
    { reason: 'ultima-archive-reward', codes: [1007297, 1054828, 1074442, 1104111, 1703984] },
    { reason: 'challengers-cozy-winter-reward', codes: [1054641, 1074309, 1703812] },
    { reason: 'tallahart-attendance-reward', codes: [1007007, 1054640, 1074308, 1103978, 1703811] },
    { reason: 'maple-attack-mission-reward', codes: [1007162, 1007160, 1054725, 1074360, 1104043, 1703897] },
    { reason: 'pepe-minigame-reward', codes: [1007168, 1054726, 1104041] },
    { reason: 'mysterious-garden-reward', codes: [1007121, 1054717, 1074354, 1104028, 1703877] }
  ];
  const excludedCodes = new Map(groups.flatMap(group => group.codes.map(code => [code, group.reason])));
  // Keep these paid cosmetics available, but do not treat stat-driven wear as style popularity.
  const statPackageCodes = new Set([1082892, 1022388, 1012927, 1032371]);
  // Explicitly reviewed skin options are cosmetic choices even though their source cash flag is false.
  const skinCodes = new Set([12015,12016,12042,12018,12052,12000,12012,12049,12019,12010,12011,12047,12003,12002,12009,12032,12043,12024,12001,12013,12030,12025,12004,12048,12028,12044,12040,12029,12026,12036,12038,12027,12037,12046,12039,12035,12045]);
  function exclusionReason(item = {}) {
    if(item.category === 'shield') return 'shield-not-offered';
    if(item.category === 'skin' && skinCodes.has(Number(item.code))) return '';
    if(item.cash !== true && item.cash !== 1) return 'non-cash-or-unverified';
    // Guard against incorrect upstream cash flags for the reported stat equipment.
    if(/마이스터\s*심볼/.test(item.name || '')) return 'meister-stat-equipment';
    const reviewedReason = excludedCodes.get(Number(item.code));
    if(reviewedReason) return reviewedReason;
    const usage = item.popularity?.usedCount;
    if(['top', 'bottom'].includes(item.category) && !isPriorityLabel(item) && !isTransparentItem(item)
      && Number.isFinite(usage) && usage >= 0 && usage <= 5) return 'low-30-day-clothing-usage';
    return '';
  }
  function isPriorityLabel(item = {}) {
    return item.labelType === 'master' || item.labelType === 'special';
  }
  function isTransparentItem(item = {}) {
    return item.category !== 'shield' && (item.transparent === true || item.transparencyType === 'semi' || /투명/.test(item.name || ''));
  }
  function compareDisplay(left, right) {
    const priority = Number(isPriorityLabel(right)) - Number(isPriorityLabel(left));
    const statHistory = Number(statPackageCodes.has(Number(left.code))) - Number(statPackageCodes.has(Number(right.code)));
    const popularity = Number(right.popularity?.usedCount ?? right.usedCount ?? 0) - Number(left.popularity?.usedCount ?? left.usedCount ?? 0);
    return priority || statHistory || popularity || Number(left.popularity?.rank ?? left.rank ?? 999999) - Number(right.popularity?.rank ?? right.rank ?? 999999) || Number(left.code) - Number(right.code);
  }
  const api = Object.freeze({ version: '2026-09-29-curation-2', exclusionReason, isEligible: item => !exclusionReason(item), isPriorityLabel, isTransparentItem, compareDisplay });
  if(typeof module === 'object' && module.exports) module.exports = api;
  else root.DJ48CoordiCatalogFilter = api;
})(typeof window === 'object' ? window : globalThis);
