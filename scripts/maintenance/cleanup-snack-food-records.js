const { applicationDefault, getApps, initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const QUIZ_ID = 'snack-food';
const PRACTICE_AREA_KEY = '인기/snack-food';
const PRACTICE_BADGE_ID = 'popular_snack_food';
const RANKING_CATEGORY = '인기(간식)';
const DEFAULT_SAMPLE_LIMIT = 20;
const DEFAULT_BACKUP_DIR = path.join('private', 'backups', 'snack-food-record-cleanup');

function parseArgs(argv) {
  const args = {
    commit: false,
    sample: DEFAULT_SAMPLE_LIMIT,
    backup: true,
    backupDir: DEFAULT_BACKUP_DIR
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--commit') args.commit = true;
    else if (arg === '--dry-run') args.commit = false;
    else if (arg === '--sample') {
      index += 1;
      args.sample = Number(argv[index] || DEFAULT_SAMPLE_LIMIT);
    } else if (arg.startsWith('--sample=')) args.sample = Number(arg.slice('--sample='.length));
    else if (arg === '--no-backup') args.backup = false;
    else if (arg === '--backup-dir') {
      index += 1;
      args.backupDir = String(argv[index] || '').trim() || DEFAULT_BACKUP_DIR;
    } else if (arg.startsWith('--backup-dir=')) args.backupDir = String(arg.slice('--backup-dir='.length)).trim() || DEFAULT_BACKUP_DIR;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(args.sample) || args.sample < 0) throw new Error('--sample must be a non-negative integer.');
  return args;
}

function initializeAdminApp() {
  if (getApps().length) return;
  initializeApp({ credential: applicationDefault() });
}

function serializeForBackup(value) {
  if (!value) return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializeForBackup);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serializeForBackup(entry)]));
  }
  return value;
}

function writeBackup(args, payload) {
  if (!args.backup) return '';
  fs.mkdirSync(args.backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(args.backupDir, `${timestamp}-snack-food-records.json`);
  fs.writeFileSync(backupPath, `${JSON.stringify(serializeForBackup(payload), null, 2)}\n`, 'utf8');
  return backupPath;
}

async function getRows(query) {
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ recordId: doc.id, ref: doc.ref, data: doc.data() || {} }));
}

function uniqueRows(rows) {
  return Array.from(new Map(rows.map(row => [row.ref.path, row])).values())
    .sort((a, b) => a.ref.path.localeCompare(b.ref.path));
}

function isSnackPractice(data = {}) {
  return String(data.quizId || '').trim() === QUIZ_ID
    || String(data.areaKey || '').trim() === PRACTICE_AREA_KEY
    || (String(data.area || '').trim() === '인기' && String(data.detail || '').trim() === '간식');
}

function isSnackRanking(data = {}) {
  return String(data.quizId || '').trim() === QUIZ_ID
    || String(data.categoryKey || '').trim() === RANKING_CATEGORY
    || String(data.category || '').trim() === RANKING_CATEGORY
    || String(data.rawCategory || '').trim() === RANKING_CATEGORY
    || String(data.subFilter || '').trim() === '간식';
}

async function collectPracticeRecords(db) {
  const rows = await Promise.all([
    getRows(db.collection('practiceRecords').where('quizId', '==', QUIZ_ID)),
    getRows(db.collection('practiceRecords').where('areaKey', '==', PRACTICE_AREA_KEY)),
    getRows(db.collection('practiceRecords').where('detail', '==', '간식'))
  ]);
  return uniqueRows(rows.flat().filter(row => isSnackPractice(row.data)));
}

async function collectRankingRecords(db) {
  const rows = await Promise.all([
    getRows(db.collection('rankingRecords').where('quizId', '==', QUIZ_ID)),
    getRows(db.collection('rankingRecords').where('categoryKey', '==', RANKING_CATEGORY)),
    getRows(db.collection('rankingRecords').where('category', '==', RANKING_CATEGORY)),
    getRows(db.collection('rankingRecords').where('subFilter', '==', '간식'))
  ]);
  return uniqueRows(rows.flat().filter(row => isSnackRanking(row.data)));
}

function isBetterRankingEntry(next, current) {
  if (!current) return true;
  const nextScore = Number(next.score) || 0;
  const currentScore = Number(current.score) || 0;
  if (nextScore !== currentScore) return nextScore > currentScore;
  return (Number(next.elapsedSeconds) || 999999999) < (Number(current.elapsedSeconds) || 999999999);
}

function normalizeRankingCategoryKey(record) {
  return String(record.categoryKey || record.category || '').trim();
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
    migrationSource: 'snack_food_record_cleanup_rebuild',
    updatedAt
  };
}

function buildQuizKingSummary(memberUserId, records, updatedAt) {
  const bestByCategory = {};
  records.forEach(record => {
    const categoryKey = normalizeRankingCategoryKey(record);
    if (!categoryKey) return;
    if (isBetterRankingEntry(record, bestByCategory[categoryKey])) bestByCategory[categoryKey] = record;
  });
  const categories = Object.entries(bestByCategory).map(([categoryKey, record]) => ({
    categoryKey,
    category: record.category,
    score: Number(record.score) || 0,
    elapsedSeconds: Number(record.elapsedSeconds) || 0,
    elapsedText: String(record.elapsedText || ''),
    rankingMode: String(record.rankingMode || 'normal').trim() || 'normal',
    recordId: record.recordId
  })).sort((a, b) => String(a.category || '').localeCompare(String(b.category || ''), 'ko'));
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
    migrationSource: 'snack_food_record_cleanup_rebuild',
    updatedAt
  };
}

function slugPracticeKey(value) {
  return String(value || '').trim().replace(/[^\w가-힣]+/g, '_').replace(/^_+|_+$/g, '');
}

function getPracticeBadgeMeta(record) {
  const [groupRaw, detailRaw] = String(record.areaKey || '').split('/');
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
  const group = groupMap[groupRaw] || slugPracticeKey(groupRaw || record.area);
  const badgeId = `${group}_${slugPracticeKey(detailRaw || record.detail).replace(/-/g, '_')}`;
  return { group, badgeId, label: record.detail || detailRaw || badgeId };
}

function buildPracticeSummary(memberUserId, records, updatedAt) {
  const groupStars = {};
  const groups = {};
  records.forEach(record => {
    const meta = getPracticeBadgeMeta(record);
    const total = Number(record.totalCount) || 0;
    const correct = Math.min(Number(record.correctCount) || 0, total || Number(record.correctCount) || 0);
    const starCount = Number(record.starCount) || 0;
    const badgeCycleSize = Number(record.badgeCycleSize) || 100;
    const badgeProgressCount = Number(record.badgeProgressCount) || (starCount * badgeCycleSize) + correct;
    const available = starCount > 0 || (!!total && correct >= total);
    if (!groups[meta.group]) groups[meta.group] = {};
    groups[meta.group][meta.badgeId] = {
      correct,
      total,
      starCount,
      badgeCycleSize,
      badgeProgressCount,
      badgeCycleProgress: badgeCycleSize ? badgeProgressCount % badgeCycleSize : 0,
      available
    };
    groupStars[meta.group] = (Number(groupStars[meta.group]) || 0) + starCount;
  });
  return {
    userId: memberUserId,
    memberUserId,
    totalStars: Object.values(groupStars).reduce((sum, value) => sum + (Number(value) || 0), 0),
    recordCount: records.length,
    groupStars,
    groups,
    updatedAt
  };
}

async function loadRemainingRankingRecords(db, memberUserId, deletedPaths) {
  const snapshot = await db.collection('rankingRecords').where('memberUserId', '==', memberUserId).limit(1000).get();
  return snapshot.docs
    .filter(doc => !deletedPaths.has(doc.ref.path))
    .map(doc => ({ recordId: doc.id, ...(doc.data() || {}) }))
    .filter(record => !isSnackRanking(record));
}

async function loadRemainingPracticeRecords(db, memberUserId, deletedPaths) {
  const snapshot = await db.collection('practiceRecords').where('memberUserId', '==', memberUserId).limit(1000).get();
  return snapshot.docs
    .filter(doc => !deletedPaths.has(doc.ref.path))
    .map(doc => ({ recordId: doc.id, ...(doc.data() || {}) }))
    .filter(record => !isSnackPractice(record));
}

async function commitBatches(db, operations) {
  for (let index = 0; index < operations.length; index += 450) {
    const batch = db.batch();
    operations.slice(index, index + 450).forEach(operation => {
      if (operation.type === 'delete') batch.delete(operation.ref);
      else if (operation.type === 'set') batch.set(operation.ref, operation.data, operation.options || {});
    });
    await batch.commit();
  }
}

function printSample(label, rows, sample) {
  console.log(`[${label}] count: ${rows.length}`);
  rows.slice(0, sample).forEach(row => console.log(JSON.stringify({
    path: row.ref.path,
    memberUserId: row.data.memberUserId || row.data.userId || '',
    quizId: row.data.quizId || '',
    areaKey: row.data.areaKey || '',
    categoryKey: row.data.categoryKey || '',
    category: row.data.category || '',
    score: row.data.score ?? '',
    correctCount: row.data.correctCount ?? '',
    starCount: row.data.starCount ?? ''
  })));
}

async function main() {
  const args = parseArgs(process.argv);
  initializeAdminApp();
  const db = getFirestore();
  const [practiceRecords, rankingRecords] = await Promise.all([
    collectPracticeRecords(db),
    collectRankingRecords(db)
  ]);
  const affectedPracticeMembers = Array.from(new Set(practiceRecords.map(row => row.data.memberUserId || row.data.userId).filter(Boolean))).sort();
  const affectedRankingMembers = Array.from(new Set(rankingRecords.map(row => row.data.memberUserId || row.data.userId).filter(Boolean))).sort();
  const affectedBadgeRefs = affectedPracticeMembers.map(memberUserId => db.collection('userBadges').doc(memberUserId).collection('badges').doc(PRACTICE_BADGE_ID));

  console.log(args.commit ? 'SNACK FOOD RECORD CLEANUP COMMIT MODE' : 'Snack food record cleanup dry-run only. No Firestore writes will be performed.');
  printSample('practiceRecords to delete', practiceRecords, args.sample);
  printSample('rankingRecords to delete', rankingRecords, args.sample);
  console.log(`Affected practice members: ${affectedPracticeMembers.length}`);
  console.log(`Affected ranking members: ${affectedRankingMembers.length}`);
  console.log(`userBadges snack badges to delete: ${affectedBadgeRefs.length}`);

  if (!args.commit) return;

  const backupPath = writeBackup(args, {
    createdAt: new Date().toISOString(),
    script: 'cleanup-snack-food-records',
    constants: {
      quizId: QUIZ_ID,
      practiceAreaKey: PRACTICE_AREA_KEY,
      practiceBadgeId: PRACTICE_BADGE_ID,
      rankingCategory: RANKING_CATEGORY
    },
    practiceRecords: practiceRecords.map(row => ({ path: row.ref.path, data: row.data })),
    rankingRecords: rankingRecords.map(row => ({ path: row.ref.path, data: row.data }))
  });
  if (backupPath) console.log(`Backup written: ${backupPath}`);

  const operations = [];
  const deletedPracticePaths = new Set(practiceRecords.map(row => row.ref.path));
  const deletedRankingPaths = new Set(rankingRecords.map(row => row.ref.path));
  practiceRecords.forEach(row => operations.push({ type: 'delete', ref: row.ref }));
  rankingRecords.forEach(row => operations.push({ type: 'delete', ref: row.ref }));
  affectedBadgeRefs.forEach(ref => operations.push({ type: 'delete', ref }));

  const updatedAt = FieldValue.serverTimestamp();
  for (const memberUserId of affectedPracticeMembers) {
    const remaining = await loadRemainingPracticeRecords(db, memberUserId, deletedPracticePaths);
    const summaryRef = db.collection('userPracticeSummary').doc(memberUserId);
    if (remaining.length) operations.push({ type: 'set', ref: summaryRef, data: buildPracticeSummary(memberUserId, remaining, updatedAt), options: { merge: false } });
    else operations.push({ type: 'delete', ref: summaryRef });
  }
  for (const memberUserId of affectedRankingMembers) {
    const remaining = await loadRemainingRankingRecords(db, memberUserId, deletedRankingPaths);
    const userSummaryRef = db.collection('userRankingSummary').doc(memberUserId);
    const quizKingSummaryRef = db.collection('quizKingSummary').doc(memberUserId);
    if (remaining.length) {
      operations.push({ type: 'set', ref: userSummaryRef, data: buildUserRankingSummary(memberUserId, remaining, updatedAt), options: { merge: false } });
      operations.push({ type: 'set', ref: quizKingSummaryRef, data: buildQuizKingSummary(memberUserId, remaining, updatedAt), options: { merge: false } });
    } else {
      operations.push({ type: 'delete', ref: userSummaryRef });
      operations.push({ type: 'delete', ref: quizKingSummaryRef });
    }
  }

  await commitBatches(db, operations);
  console.log(`Deleted practiceRecords: ${practiceRecords.length}`);
  console.log(`Deleted rankingRecords: ${rankingRecords.length}`);
  console.log(`Deleted userBadges snack badges: ${affectedBadgeRefs.length}`);
  console.log(`Rebuilt/deleted userPracticeSummary for members: ${affectedPracticeMembers.length}`);
  console.log(`Rebuilt/deleted userRankingSummary and quizKingSummary for members: ${affectedRankingMembers.length}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
