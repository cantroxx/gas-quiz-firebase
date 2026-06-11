const admin = require('firebase-admin');

const DEFAULT_LIMIT_SECONDS = 20 * 60;
const DEFAULT_SAMPLE_LIMIT = 20;

function parseArgs(argv) {
  const args = {
    commit: false,
    dryRun: true,
    limitSeconds: DEFAULT_LIMIT_SECONDS,
    sample: DEFAULT_SAMPLE_LIMIT,
    categoryContains: '',
    recordId: ''
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--commit') {
      args.commit = true;
      args.dryRun = false;
    } else if (arg === '--dry-run') {
      args.commit = false;
      args.dryRun = true;
    } else if (arg === '--limit-seconds') {
      index += 1;
      args.limitSeconds = Number(argv[index] || 0);
    } else if (arg.startsWith('--limit-seconds=')) {
      args.limitSeconds = Number(arg.slice('--limit-seconds='.length));
    } else if (arg === '--sample') {
      index += 1;
      args.sample = Number(argv[index] || 0);
    } else if (arg.startsWith('--sample=')) {
      args.sample = Number(arg.slice('--sample='.length));
    } else if (arg === '--category-contains') {
      index += 1;
      args.categoryContains = String(argv[index] || '').trim();
    } else if (arg.startsWith('--category-contains=')) {
      args.categoryContains = String(arg.slice('--category-contains='.length)).trim();
    } else if (arg === '--record-id') {
      index += 1;
      args.recordId = String(argv[index] || '').trim();
    } else if (arg.startsWith('--record-id=')) {
      args.recordId = String(arg.slice('--record-id='.length)).trim();
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isFinite(args.limitSeconds) || args.limitSeconds < 1) {
    throw new Error('--limit-seconds must be a positive number.');
  }
  if (!Number.isInteger(args.sample) || args.sample < 0) {
    throw new Error('--sample must be a non-negative integer.');
  }
  return args;
}

function initializeAdminApp() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

function formatMinutes(seconds) {
  return `${Math.round((Number(seconds) || 0) / 60)}분`;
}

function serializeTimestamp(value) {
  if (!value) return '';
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return String(value);
}

function normalizeRankingCategoryKey(record) {
  return String(record.categoryKey || record.category || '').trim();
}

function isBetterRankingEntry(next, current) {
  if (!current) return true;
  const nextScore = Number(next.score) || 0;
  const currentScore = Number(current.score) || 0;
  if (nextScore !== currentScore) return nextScore > currentScore;
  return (Number(next.elapsedSeconds) || 999999999) < (Number(current.elapsedSeconds) || 999999999);
}

function buildUserRankingSummary(memberUserId, records, updatedAt) {
  const byMode = {};
  const bestScoresByMode = {};
  records.forEach(record => {
    const mode = String(record.rankingMode || 'normal').trim() || 'normal';
    const categoryKey = normalizeRankingCategoryKey(record);
    if (!categoryKey) return;
    if (!byMode[mode]) byMode[mode] = { byCategory: {} };
    if (!bestScoresByMode[mode]) bestScoresByMode[mode] = {};
    const current = byMode[mode].byCategory[categoryKey];
    if (!isBetterRankingEntry(record, current)) return;
    byMode[mode].byCategory[categoryKey] = {
      rank: Number(current?.rank) || 0,
      total: Number(current?.total) || 0,
      score: Number(record.score) || 0,
      elapsedSeconds: Number(record.elapsedSeconds) || 0,
      elapsedText: String(record.elapsedText || ''),
      recordId: record.recordId,
      category: record.category
    };
    bestScoresByMode[mode][categoryKey] = {
      score: Number(record.score) || 0,
      elapsedSeconds: Number(record.elapsedSeconds) || 0,
      recordId: record.recordId
    };
  });

  const latest = records.slice().sort((a, b) => {
    const aTime = Number(a.createdAt?.toMillis?.() || a.recordedAt?.toMillis?.() || 0);
    const bTime = Number(b.createdAt?.toMillis?.() || b.recordedAt?.toMillis?.() || 0);
    return bTime - aTime;
  })[0] || {};

  return {
    memberUserId,
    userId: memberUserId,
    displayName: latest.displayName || memberUserId,
    hasUserId: true,
    totalRecordCount: records.length,
    legacyRecordCount: records.filter(record => record.legacy === true).length,
    byMode,
    bestScoresByMode,
    migrationSource: 'ranking_cleanup_rebuild',
    updatedAt
  };
}

function buildQuizKingSummary(memberUserId, records, updatedAt) {
  const bestByCategory = {};
  records.forEach(record => {
    const categoryKey = normalizeRankingCategoryKey(record);
    if (!categoryKey) return;
    if (isBetterRankingEntry(record, bestByCategory[categoryKey])) {
      bestByCategory[categoryKey] = record;
    }
  });

  const categories = Object.entries(bestByCategory)
    .map(([categoryKey, record]) => ({
      categoryKey,
      category: record.category,
      score: Number(record.score) || 0,
      elapsedSeconds: Number(record.elapsedSeconds) || 0,
      elapsedText: String(record.elapsedText || ''),
      rankingMode: String(record.rankingMode || 'normal'),
      recordId: record.recordId
    }))
    .sort((a, b) => String(a.category || '').localeCompare(String(b.category || ''), 'ko'));

  const latest = records.slice().sort((a, b) => {
    const aTime = Number(a.createdAt?.toMillis?.() || a.recordedAt?.toMillis?.() || 0);
    const bTime = Number(b.createdAt?.toMillis?.() || b.recordedAt?.toMillis?.() || 0);
    return bTime - aTime;
  })[0] || {};

  return {
    memberUserId,
    userId: memberUserId,
    displayName: latest.displayName || memberUserId,
    hasUserId: true,
    categories,
    totalScore: categories.reduce((sum, item) => sum + (Number(item.score) || 0), 0),
    categoryCount: categories.length,
    rank: 0,
    migrationSource: 'ranking_cleanup_rebuild',
    updatedAt
  };
}

async function loadRecordsForCleanup(db, args) {
  if (args.recordId) {
    const snapshot = await db.collection('rankingRecords').doc(args.recordId).get();
    return snapshot.exists ? [{ recordId: snapshot.id, ...(snapshot.data() || {}) }] : [];
  }
  const snapshot = await db.collection('rankingRecords')
    .where('elapsedSeconds', '>', args.limitSeconds)
    .orderBy('elapsedSeconds', 'desc')
    .limit(Math.max(args.sample, 1))
    .get();
  return snapshot.docs.map(doc => ({ recordId: doc.id, ...(doc.data() || {}) }));
}

async function rebuildSummariesForMembers(db, memberUserIds, deletedRecordIds) {
  const updatedAt = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();
  for (const memberUserId of memberUserIds) {
    const snapshot = await db.collection('rankingRecords')
      .where('memberUserId', '==', memberUserId)
      .limit(500)
      .get();
    const records = snapshot.docs
      .map(doc => ({ recordId: doc.id, ...(doc.data() || {}) }))
      .filter(record => !deletedRecordIds.has(record.recordId));
    const userSummaryRef = db.collection('userRankingSummary').doc(memberUserId);
    const quizKingSummaryRef = db.collection('quizKingSummary').doc(memberUserId);
    if (records.length) {
      batch.set(userSummaryRef, buildUserRankingSummary(memberUserId, records, updatedAt), { merge: false });
      batch.set(quizKingSummaryRef, buildQuizKingSummary(memberUserId, records, updatedAt), { merge: false });
    } else {
      batch.delete(userSummaryRef);
      batch.delete(quizKingSummaryRef);
    }
  }
  await batch.commit();
}

async function main() {
  const args = parseArgs(process.argv);
  initializeAdminApp();
  const db = admin.firestore();
  const categoryNeedle = args.categoryContains;
  const records = (await loadRecordsForCleanup(db, args))
    .filter(record => !categoryNeedle || String(record.category || '').includes(categoryNeedle) || String(record.categoryKey || '').includes(categoryNeedle));

  console.log(`Ranking records over ${args.limitSeconds}s (${formatMinutes(args.limitSeconds)})`);
  console.log(`Mode: ${args.commit ? 'commit' : 'dry-run'}`);
  console.log(`Category filter: ${categoryNeedle || '(none)'}`);
  console.log(`Record filter: ${args.recordId || '(none)'}`);
  console.log(`Matched: ${records.length}`);

  records.forEach(record => {
    console.log(JSON.stringify({
      recordId: record.recordId,
      memberUserId: record.memberUserId,
      displayName: record.displayName,
      quizId: record.quizId,
      category: record.category,
      categoryKey: record.categoryKey,
      subFilter: record.subFilter,
      score: record.score,
      elapsedSeconds: record.elapsedSeconds,
      elapsedText: record.elapsedText,
      rankingMode: record.rankingMode,
      createdAt: serializeTimestamp(record.createdAt),
      recordedAt: serializeTimestamp(record.recordedAt)
    }));
  });

  if (!args.commit || !records.length) return;

  const batch = db.batch();
  records.forEach(record => {
    batch.delete(db.collection('rankingRecords').doc(record.recordId));
  });
  await batch.commit();
  await rebuildSummariesForMembers(
    db,
    Array.from(new Set(records.map(record => record.memberUserId).filter(Boolean))),
    new Set(records.map(record => record.recordId))
  );
  console.log(`Deleted rankingRecords: ${records.length}`);
  console.log('Rebuilt userRankingSummary and quizKingSummary for affected members.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
