#!/usr/bin/env node
'use strict';

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}

const db = getFirestore();

function parseArgs(argv) {
  const args = { commit: false, sample: 10, user: '' };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--commit') args.commit = true;
    else if (arg === '--dry-run') args.commit = false;
    else if (arg === '--sample') args.sample = Number(argv[++i]) || args.sample;
    else if (arg === '--user') args.user = String(argv[++i] || '').trim();
  }
  return args;
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
  const text = [
    record.category,
    record.categoryKey,
    record.rawCategory,
    record.subFilter
  ].map(value => String(value || '').toLowerCase()).join(' ');
  if (category === 'kpop') {
    return quizId === 'emoji-kpop' || (text.includes('이모지') && (text.includes('k-pop') || text.includes('kpop') || text.includes('케이팝')));
  }
  if (category === 'anime') {
    return quizId === 'emoji-anime' || (text.includes('이모지') && (text.includes('애니') || text.includes('anime')));
  }
  if (category === 'tiniping') {
    return quizId === 'emoji-tiniping' || (text.includes('이모지') && (text.includes('티니핑') || text.includes('tiniping')));
  }
  return false;
}

function emojiPracticeBadgeId(sourceCategory = '') {
  const category = String(sourceCategory || '').trim();
  if (category === 'kpop') return 'popular_emoji_kpop';
  if (category === 'anime') return 'popular_emoji_anime';
  if (category === 'tiniping') return 'popular_emoji_tiniping';
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

  function add(title) {
    if (title.titleId) eligible.set(title.titleId, title);
  }

  titleCatalog.forEach(title => {
    const sourceType = String(title.sourceType || '').trim();
    const required = numberFromText(title.conditionText, 1);
    if (sourceType === 'practiceStars') {
      const badgeId = practiceTitleBadgeId(title);
      const badge = badges.find(item => item.badgeId === badgeId);
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

function ownedTitleDoc(title, memberUserId) {
  return {
    userId: memberUserId,
    memberUserId,
    titleId: title.titleId,
    titleName: title.titleName || title.titleId,
    description: title.description || title.conditionText || '',
    conditionText: title.conditionText || '',
    category: title.category || '',
    subjectGroup: title.subjectGroup || '',
    sourceType: title.sourceType || '',
    sourceCategory: title.sourceCategory || '',
    themeClass: title.themeClass || '',
    tierClass: title.tierClass || '',
    effectClass: title.effectClass || '',
    selected: false,
    migrationSource: 'firebase_title_backfill',
    awardedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
}

async function loadCollectionDocs(path) {
  const snap = await db.collection(path).get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function buildUserIds(args) {
  if (args.user) return [args.user];
  const badgeParents = await db.collection('userBadges').listDocuments();
  const titleParents = await db.collection('userTitles').listDocuments();
  const rankingSnap = await db.collection('rankingRecords').select('memberUserId').get();
  const ids = new Set();
  badgeParents.forEach(ref => ids.add(ref.id));
  titleParents.forEach(ref => ids.add(ref.id));
  rankingSnap.forEach(doc => {
    const id = String(doc.data().memberUserId || '').trim();
    if (id) ids.add(id);
  });
  return Array.from(ids).sort();
}

async function syncOneUser(memberUserId, titleCatalog, commit) {
  const [badgeSnap, titleSnap, titleSummarySnap, rankingSnap] = await Promise.all([
    db.collection('userBadges').doc(memberUserId).collection('badges').get(),
    db.collection('userTitles').doc(memberUserId).collection('titles').get(),
    db.collection('userTitleSummary').doc(memberUserId).get(),
    db.collection('rankingRecords').where('memberUserId', '==', memberUserId).limit(500).get()
  ]);

  const badges = badgeSnap.docs.map(doc => ({ badgeId: doc.id, ...doc.data() }));
  const rankingRecords = rankingSnap.docs.map(doc => ({ recordId: doc.id, ...doc.data() }));
  const existingTitleIds = new Set(titleSnap.docs.map(doc => doc.id));
  const existingTitleNames = {};
  titleSnap.docs.forEach(doc => {
    const data = doc.data() || {};
    existingTitleNames[doc.id] = data.titleName || data.name || doc.id;
  });
  const eligibleNewTitles = evaluateEligibleTitles(titleCatalog, badges, rankingRecords, existingTitleIds);
  const summary = titleSummarySnap.exists ? titleSummarySnap.data() || {} : {};
  const selectedTitleId = String(summary.selectedTitleId || '').trim();
  const selectedTitleName = selectedTitleId
    ? (existingTitleNames[selectedTitleId] || eligibleNewTitles.find(title => title.titleId === selectedTitleId)?.titleName || summary.selectedTitleName || '')
    : '';
  const allTitleIds = new Set([...existingTitleIds, ...eligibleNewTitles.map(title => title.titleId)]);

  if (commit && eligibleNewTitles.length) {
    const batch = db.batch();
    eligibleNewTitles.forEach(title => {
      batch.set(
        db.collection('userTitles').doc(memberUserId).collection('titles').doc(title.titleId),
        ownedTitleDoc(title, memberUserId),
        { merge: true }
      );
    });
    batch.set(db.collection('userTitleSummary').doc(memberUserId), {
      userId: memberUserId,
      memberUserId,
      titleCount: allTitleIds.size,
      ownedCount: allTitleIds.size,
      selectedTitleId,
      selectedTitleName,
      missingSelectedTitle: !!selectedTitleId && !allTitleIds.has(selectedTitleId),
      migrationSource: 'firebase_title_backfill',
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    await batch.commit();
  }

  return {
    memberUserId,
    existingCount: existingTitleIds.size,
    awardedCount: eligibleNewTitles.length,
    awardedTitles: eligibleNewTitles.map(title => title.titleId)
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const titleCatalog = await loadCollectionDocs('titleCatalog');
  const userIds = await buildUserIds(args);
  const results = [];
  for (const userId of userIds) {
    const result = await syncOneUser(userId, titleCatalog, args.commit);
    if (result.awardedCount > 0) results.push(result);
  }
  console.log(`${args.commit ? 'Commit' : 'Dry run'}: ${results.reduce((sum, item) => sum + item.awardedCount, 0)} titles for ${results.length} users.`);
  results.slice(0, Math.max(0, args.sample)).forEach(item => {
    console.log(JSON.stringify(item, null, 2));
  });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
