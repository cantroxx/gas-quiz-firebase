#!/usr/bin/env node
'use strict';

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const BADGE_CYCLE_SIZE = 100;

if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

function parseArgs(argv) {
  const args = { sample: 20, commit: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--sample') args.sample = Math.max(0, Number(argv[++i]) || args.sample);
    else if (arg === '--commit') args.commit = true;
    else if (arg === '--dry-run') args.commit = false;
  }
  return args;
}

function slugPracticeKey(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[()]/g, '')
    .replace(/[·~]/g, '_')
    .replace(/:/g, '_')
    .replace(/\//g, '_');
}

function getPracticeBadgeMeta(areaKey, area, detail) {
  const [groupRaw, detailRaw] = String(areaKey || '').split('/');
  const groupMap = {
    '포켓몬': 'pokemon',
    '인물': 'people',
    '일상': 'daily',
    '국어': 'korean',
    '수학': 'math',
    '사회': 'social',
    '과학': 'science',
    '인기': 'popular'
  };
  const group = groupMap[groupRaw] || slugPracticeKey(groupRaw || area);
  const badgeId = `${group}_${slugPracticeKey(detailRaw || detail).replace(/-/g, '_')}`;
  return { group, badgeId, label: detail || detailRaw || badgeId };
}

function numberFromText(text, fallback = 1) {
  const match = String(text || '').match(/(\d+)/);
  return match ? Number(match[1]) || fallback : fallback;
}

function isEarnedBadge(data = {}) {
  return data.available === true || data.completed === true || Number(data.starCount || 0) > 0;
}

function practiceTitleBadgeId(title = {}) {
  const id = String(title.titleId || '').trim();
  const condition = String(title.conditionText || '').trim();
  if (/^pokemon_gen[1-9]_/.test(id)) return id.replace(/_trainer$/, '');
  if (id.startsWith('spelling_')) return 'daily_맞춤법';
  if (id.startsWith('word_relation_')) return 'korean_word_relation';
  if (id.startsWith('korean_proverb_')) return 'korean_proverb';
  if (id.startsWith('korean_spacing_')) return 'korean_spacing';
  if (id.startsWith('korean_idiom_')) return 'korean_idiom';
  if (id === 'reading_gmo_complete') return 'korean_gmo';
  if (id === 'reading_time_store_complete') return 'korean_독서:시간가게';
  if (id.startsWith('math_muldiv_')) return 'math_random_basic';
  if (id.startsWith('math_fraction_basic_')) return 'math_분수';
  if (id.startsWith('people_') || id === 'history_god') return 'people_역사인물';
  if (id.startsWith('three_kingdoms_')) return 'social_three_kingdoms';
  if (id.startsWith('ancient_three_kingdoms_')) return 'social_ancient_three_kingdoms';
  if (id.startsWith('social_regional_specialties_')) return 'social_regional_specialties';
  if (id.startsWith('social_unified_silla_balhae_')) return 'social_unified_silla_balhae';
  if (id.startsWith('social_cultural_heritage_')) return 'social_cultural_heritage';
  if (id.startsWith('science_grade4_')) return 'science_science_grade4';
  if (id.startsWith('science_general_')) return 'science_science_general';
  if (id.startsWith('popular_flag_country_')) return 'popular_flag_country';
  if (id.startsWith('popular_snack_food_')) return 'popular_snack_food';
  if (id.startsWith('popular_emoji_kpop_')) return 'popular_emoji_kpop';
  if (id.startsWith('popular_emoji_anime_')) return 'popular_emoji_anime';
  if (id.startsWith('popular_emoji_tiniping_')) return 'popular_emoji_tiniping';
  if (id.startsWith('idol_')) return 'people_아이돌';
  if (id.startsWith('anime_')) return 'people_애니';
  if (id.startsWith('dad_joke_') || id === 'ten_million_youtuber') return 'daily_아재개그';
  if (id.startsWith('tiniping_')) return 'people_티니핑';
  if (condition.includes('시간가게')) return 'korean_독서:시간가게';
  return '';
}

function bestRankingScoreTotal(records) {
  const bestByCategory = new Map();
  records.forEach(record => {
    const key = String(record.categoryKey || record.category || '').trim();
    if (!key) return;
    const score = Number(record.score || 0);
    const elapsedSeconds = Number(record.elapsedSeconds || 999999999);
    const current = bestByCategory.get(key);
    if (!current || score > current.score || (score === current.score && elapsedSeconds < current.elapsedSeconds)) {
      bestByCategory.set(key, { score, elapsedSeconds });
    }
  });
  return Array.from(bestByCategory.values()).reduce((sum, item) => sum + item.score, 0);
}

function emojiCategoryMatchesRecord(record = {}, sourceCategory = '') {
  const category = String(sourceCategory || '').trim();
  const quizId = String(record.quizId || '').trim();
  const text = [record.category, record.categoryKey, record.rawCategory, record.subFilter]
    .map(value => String(value || '').toLowerCase()).join(' ');
  if (category === 'kpop') return quizId === 'emoji-kpop' || (text.includes('이모지') && (text.includes('k-pop') || text.includes('kpop') || text.includes('케이팝')));
  if (category === 'anime') return quizId === 'emoji-anime' || (text.includes('이모지') && (text.includes('애니') || text.includes('anime')));
  if (category === 'tiniping') return quizId === 'emoji-tiniping' || (text.includes('이모지') && (text.includes('티니핑') || text.includes('tiniping')));
  return false;
}

function emojiPracticeBadgeId(sourceCategory = '') {
  if (sourceCategory === 'kpop') return 'popular_emoji_kpop';
  if (sourceCategory === 'anime') return 'popular_emoji_anime';
  if (sourceCategory === 'tiniping') return 'popular_emoji_tiniping';
  return '';
}

function emojiCombinedCompletionCount(title, badges, rankingRecords) {
  const sourceCategory = String(title.sourceCategory || '').trim();
  const badgeId = emojiPracticeBadgeId(sourceCategory);
  const badge = badgeId ? badges.find(item => item.badgeId === badgeId) : null;
  const practiceCount = Math.max(0, Math.round(Number(badge?.starCount || 0) || 0));
  const rankingCount = rankingRecords.filter(record => emojiCategoryMatchesRecord(record, sourceCategory)).length;
  return practiceCount + rankingCount;
}

function evaluateEligibleTitles(titleCatalog, badges, rankingRecords, existingTitleIds) {
  const eligible = new Map();
  const earnedBadges = badges.filter(isEarnedBadge);
  const earnedBadgeIds = new Set(earnedBadges.map(badge => badge.badgeId));
  const earnedGroups = new Set(earnedBadges.map(badge => badge.group || 'other'));
  const pokemonGenCount = earnedBadges.filter(badge => /^pokemon_gen[1-9]$/.test(badge.badgeId)).length;
  const normal50Count = rankingRecords.filter(record => {
    const mode = String(record.rankingMode || 'normal');
    return (mode === 'normal' || mode === 'legacy') && Number(record.score || 0) >= 50;
  }).length;
  const rankingBestTotal = bestRankingScoreTotal(rankingRecords);
  const add = title => { if (title.titleId) eligible.set(title.titleId, title); };

  titleCatalog.forEach(title => {
    const sourceType = String(title.sourceType || '').trim();
    const required = numberFromText(title.conditionText, 1);
    if (sourceType === 'practiceStars') {
      const badge = badges.find(item => item.badgeId === practiceTitleBadgeId(title));
      if (badge && Number(badge.starCount || 0) >= required) add(title);
    } else if (sourceType === 'pokemonGenCount') {
      const threshold = String(title.conditionText || '').includes('모든') ? 9 : required;
      if (pokemonGenCount >= threshold) add(title);
    } else if (sourceType === 'badgeFields') {
      if (earnedGroups.size >= required) add(title);
    } else if (sourceType === 'badge') {
      if (earnedBadgeIds.size >= required) add(title);
    } else if (sourceType === 'rankingNormal50') {
      if (normal50Count >= required) add(title);
    } else if (sourceType === 'rankingBestScoreTotal300') {
      if (rankingBestTotal >= 300) add(title);
    } else if (sourceType === 'emojiCombinedCompletions') {
      if (emojiCombinedCompletionCount(title, badges, rankingRecords) >= required) add(title);
    }
  });

  let changed = true;
  while (changed) {
    changed = false;
    const ownedOrEligibleIds = new Set([...existingTitleIds, ...eligible.keys()]);
    titleCatalog.forEach(title => {
      if (eligible.has(title.titleId)) return;
      if (String(title.sourceType || '') !== 'subjectDetailTitles') return;
      const subjectGroup = String(title.subjectGroup || '').trim();
      const required = numberFromText(title.conditionText, 1);
      const count = titleCatalog.filter(candidate => {
        if (candidate.titleId === title.titleId) return false;
        if (!ownedOrEligibleIds.has(candidate.titleId)) return false;
        return String(candidate.subjectGroup || '').trim() === subjectGroup
          && String(candidate.sourceType || '').trim() === 'practiceStars';
      }).length;
      if (count >= required) {
        add(title);
        changed = true;
      }
    });
  }

  return Array.from(eligible.values()).filter(title => !existingTitleIds.has(title.titleId));
}

async function getSubcollectionDocs(parent, child) {
  const parents = await db.collection(parent).listDocuments();
  const result = new Map();
  await Promise.all(parents.map(async ref => {
    const snap = await ref.collection(child).get();
    result.set(ref.id, snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }));
  return result;
}

async function loadCollection(path) {
  const snap = await db.collection(path).get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function getPredictedBadgeInfo(record, quizMeta) {
  const completionType = String(record.completionType || '').trim();
  if (completionType === 'complete') {
    const starCount = Number(record.starCount || 0) || 0;
    const correctCount = Math.max(0, Math.round(Number(record.correctCount || 0) || 0));
    const totalCount = Math.max(0, Math.round(Number(record.totalCount || quizMeta?.sourceQuestionCount || quizMeta?.questionCount || correctCount) || 0));
    return {
      predictedStar: starCount,
      badgeProgressCount: starCount * BADGE_CYCLE_SIZE,
      badgeCycleProgress: 0,
      totalCount,
      correctCount
    };
  }
  const starCount = Math.max(0, Math.round(Number(record.starCount || 0) || 0));
  const correctCount = Math.max(0, Math.round(Number(record.correctCount || 0) || 0));
  const totalCount = Math.max(0, Math.round(
    Number(quizMeta?.sourceQuestionCount)
    || Number(record.totalCount)
    || Number(quizMeta?.questionCount)
    || correctCount
  ));
  const storedProgress = Number(record.badgeProgressCount);
  const progress = Number.isFinite(storedProgress)
    ? Math.max(0, Math.round(storedProgress))
    : (starCount * Math.max(BADGE_CYCLE_SIZE, totalCount)) + correctCount;
  return {
    predictedStar: Math.max(starCount, Math.floor(progress / BADGE_CYCLE_SIZE)),
    badgeProgressCount: progress,
    badgeCycleProgress: progress % BADGE_CYCLE_SIZE,
    totalCount,
    correctCount
  };
}

function buildPracticeSummary(memberUserId, badges) {
  const groupStars = {};
  const groups = {};
  let totalStars = 0;
  badges.forEach(badge => {
    const badgeId = String(badge.badgeId || badge.id || '').trim();
    if (!badgeId) return;
    const group = String(badge.group || 'other').trim() || 'other';
    const starCount = Math.max(0, Math.round(Number(badge.starCount || 0) || 0));
    totalStars += starCount;
    groupStars[group] = (groupStars[group] || 0) + starCount;
    if (!groups[group]) groups[group] = {};
    groups[group][badgeId] = {
      correct: Math.max(0, Math.round(Number(badge.correct || 0) || 0)),
      total: Math.max(0, Math.round(Number(badge.total || 0) || 0)),
      starCount,
      badgeCycleSize: Math.max(0, Math.round(Number(badge.badgeCycleSize || 0) || 0)),
      badgeProgressCount: Math.max(0, Math.round(Number(badge.badgeProgressCount || 0) || 0)),
      badgeCycleProgress: Math.max(0, Math.round(Number(badge.badgeCycleProgress || 0) || 0)),
      available: badge.available === true || badge.completed === true || starCount > 0
    };
  });
  return {
    userId: memberUserId,
    memberUserId,
    totalStars,
    recordCount: badges.length,
    groupStars,
    groups,
    updatedAt: FieldValue.serverTimestamp()
  };
}

async function commitStarChanges(starChanges, badgeMap) {
  const changesByUser = new Map();
  starChanges.forEach(change => {
    if (!changesByUser.has(change.memberUserId)) changesByUser.set(change.memberUserId, []);
    changesByUser.get(change.memberUserId).push(change);
  });
  let writeCount = 0;
  for (const [memberUserId, changes] of changesByUser.entries()) {
    const predictedBadges = new Map((badgeMap.get(memberUserId) || []).map(badge => [
      String(badge.badgeId || badge.id || '').trim(),
      { badgeId: String(badge.badgeId || badge.id || '').trim(), ...badge }
    ]));
    const batch = db.batch();
    changes.forEach(change => {
      const badgeData = {
        userId: memberUserId,
        memberUserId,
        badgeId: change.badgeId,
        label: change.label,
        group: change.group,
        areaKey: change.areaKey,
        sourceId: change.badgeId,
        correct: change.correctCount,
        total: change.totalCount,
        starCount: change.predictedStar,
        completed: true,
        available: true,
        progressPercent: change.totalCount ? Math.min(100, Math.round((change.correctCount / change.totalCount) * 100)) : 0,
        badgeCycleSize: BADGE_CYCLE_SIZE,
        badgeProgressCount: change.badgeProgressCount,
        badgeCycleProgress: change.badgeCycleProgress,
        migrationSource: 'practice_badge_cycle_backfill',
        updatedAt: FieldValue.serverTimestamp()
      };
      predictedBadges.set(change.badgeId, badgeData);
      batch.set(db.collection('practiceRecords').doc(change.recordId), {
        starCount: change.predictedStar,
        badgeCycleSize: BADGE_CYCLE_SIZE,
        badgeProgressCount: change.badgeProgressCount,
        badgeCycleProgress: change.badgeCycleProgress,
        completed: true,
        updatedAt: FieldValue.serverTimestamp(),
        migrationSource: 'practice_badge_cycle_backfill'
      }, { merge: true });
      batch.set(
        db.collection('userBadges').doc(memberUserId).collection('badges').doc(change.badgeId),
        badgeData,
        { merge: true }
      );
      writeCount += 2;
    });
    batch.set(
      db.collection('userPracticeSummary').doc(memberUserId),
      buildPracticeSummary(memberUserId, Array.from(predictedBadges.values())),
      { merge: true }
    );
    writeCount += 1;
    await batch.commit();
  }
  return writeCount;
}

async function main() {
  const args = parseArgs(process.argv);
  const [practiceRecords, quizzes, titleCatalog, badgeMap, titleMap] = await Promise.all([
    loadCollection('practiceRecords'),
    loadCollection('quizzes'),
    loadCollection('titleCatalog'),
    getSubcollectionDocs('userBadges', 'badges'),
    getSubcollectionDocs('userTitles', 'titles')
  ]);
  const quizMetaById = new Map(quizzes.map(quiz => [String(quiz.quizId || quiz.id || '').trim(), quiz]));
  const recordsByUser = new Map();
  practiceRecords.forEach(record => {
    const memberUserId = String(record.memberUserId || record.userId || '').trim();
    if (!memberUserId) return;
    if (!recordsByUser.has(memberUserId)) recordsByUser.set(memberUserId, []);
    recordsByUser.get(memberUserId).push(record);
  });

  const starChanges = [];
  recordsByUser.forEach((records, memberUserId) => {
    const badges = badgeMap.get(memberUserId) || [];
    const badgeById = new Map(badges.map(badge => [badge.badgeId || badge.id, badge]));
    records.forEach(record => {
      const meta = getPracticeBadgeMeta(record.areaKey, record.area, record.detail);
      const currentBadgeStar = Math.max(0, Math.round(Number(badgeById.get(meta.badgeId)?.starCount || 0) || 0));
      const predictedInfo = getPredictedBadgeInfo(record, quizMetaById.get(String(record.quizId || '').trim()));
      const predictedStar = predictedInfo.predictedStar;
      if (predictedStar <= currentBadgeStar) return;
      starChanges.push({
        memberUserId,
        recordId: record.id,
        quizId: record.quizId || '',
        areaKey: record.areaKey || '',
        group: meta.group,
        label: meta.label,
        badgeId: meta.badgeId,
        currentBadgeStar,
        predictedStar,
        badgeProgressCount: predictedInfo.badgeProgressCount,
        badgeCycleProgress: predictedInfo.badgeCycleProgress,
        totalCount: predictedInfo.totalCount,
        correctCount: predictedInfo.correctCount,
        delta: predictedStar - currentBadgeStar
      });
    });
  });

  const affectedUsers = Array.from(new Set(starChanges.map(item => item.memberUserId))).sort();
  const rankingByUser = new Map();
  await Promise.all(affectedUsers.map(async userId => {
    const snap = await db.collection('rankingRecords').where('memberUserId', '==', userId).limit(500).get();
    rankingByUser.set(userId, snap.docs.map(doc => ({ recordId: doc.id, ...doc.data() })));
  }));

  const titleChanges = [];
  affectedUsers.forEach(memberUserId => {
    const currentBadges = badgeMap.get(memberUserId) || [];
    const predictedBadgesById = new Map(currentBadges.map(badge => [badge.badgeId || badge.id, { badgeId: badge.badgeId || badge.id, ...badge }]));
    starChanges.filter(item => item.memberUserId === memberUserId).forEach(change => {
      const existing = predictedBadgesById.get(change.badgeId) || { badgeId: change.badgeId };
      predictedBadgesById.set(change.badgeId, {
        ...existing,
        starCount: change.predictedStar,
        completed: true,
        available: true
      });
    });
    const existingTitleIds = new Set((titleMap.get(memberUserId) || []).map(title => title.titleId || title.id));
    const rankingRecords = rankingByUser.get(memberUserId) || [];
    const currentEligible = new Set(evaluateEligibleTitles(titleCatalog, currentBadges, rankingRecords, existingTitleIds).map(title => title.titleId));
    const predictedEligible = evaluateEligibleTitles(titleCatalog, Array.from(predictedBadgesById.values()), rankingRecords, existingTitleIds)
      .filter(title => !currentEligible.has(title.titleId));
    if (predictedEligible.length) {
      titleChanges.push({
        memberUserId,
        awardedCount: predictedEligible.length,
        titles: predictedEligible.map(title => ({
          titleId: title.titleId,
          titleName: title.titleName || title.titleId
        }))
      });
    }
  });

  const byBadge = {};
  starChanges.forEach(item => {
    byBadge[item.badgeId] = (byBadge[item.badgeId] || 0) + item.delta;
  });
  const byTitle = {};
  titleChanges.forEach(user => {
    user.titles.forEach(title => {
      byTitle[title.titleId] = (byTitle[title.titleId] || 0) + 1;
    });
  });

  let committedWriteCount = 0;
  if (args.commit && starChanges.length) {
    committedWriteCount = await commitStarChanges(starChanges, badgeMap);
  }

  const result = {
    checkedAt: new Date().toISOString(),
    committed: args.commit,
    committedWriteCount,
    practiceRecordCount: practiceRecords.length,
    affectedUserCount: affectedUsers.length,
    starAwardRecordCount: starChanges.length,
    starAwardDeltaTotal: starChanges.reduce((sum, item) => sum + item.delta, 0),
    titleAwardUserCount: titleChanges.length,
    titleAwardDeltaTotal: titleChanges.reduce((sum, item) => sum + item.awardedCount, 0),
    byBadge,
    byTitle,
    sampleStarChanges: starChanges.slice(0, args.sample),
    sampleTitleChanges: titleChanges.slice(0, args.sample)
  };
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
