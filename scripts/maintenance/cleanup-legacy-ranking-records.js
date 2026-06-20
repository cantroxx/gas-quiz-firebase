const { applicationDefault, getApps, initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const DEFAULT_SAMPLE_LIMIT = 20;
const DEFAULT_BACKUP_DIR = path.join('private', 'backups', 'ranking-legacy-cleanup');
const LEGACY_SOURCE_SHEET = '기록저장';

function parseArgs(argv) {
  const args = {
    commit: false,
    dryRun: true,
    sample: DEFAULT_SAMPLE_LIMIT,
    memberUserId: '',
    backup: true,
    backupDir: DEFAULT_BACKUP_DIR
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--commit') {
      args.commit = true;
      args.dryRun = false;
    } else if (arg === '--dry-run') {
      args.commit = false;
      args.dryRun = true;
    } else if (arg === '--sample') {
      index += 1;
      args.sample = Number(argv[index] || 0);
    } else if (arg.startsWith('--sample=')) {
      args.sample = Number(arg.slice('--sample='.length));
    } else if (arg === '--member-user-id') {
      index += 1;
      args.memberUserId = String(argv[index] || '').trim();
    } else if (arg.startsWith('--member-user-id=')) {
      args.memberUserId = String(arg.slice('--member-user-id='.length)).trim();
    } else if (arg === '--no-backup') {
      args.backup = false;
    } else if (arg === '--backup-dir') {
      index += 1;
      args.backupDir = String(argv[index] || '').trim() || DEFAULT_BACKUP_DIR;
    } else if (arg.startsWith('--backup-dir=')) {
      args.backupDir = String(arg.slice('--backup-dir='.length)).trim() || DEFAULT_BACKUP_DIR;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(args.sample) || args.sample < 0) {
    throw new Error('--sample must be a non-negative integer.');
  }
  return args;
}

function initializeAdminApp() {
  if (getApps().length) return;
  initializeApp({
    credential: applicationDefault()
  });
}

function serializeTimestamp(value) {
  if (!value) return '';
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return String(value);
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

function buildBackupFilePath(args) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const suffix = args.memberUserId ? `member-${args.memberUserId}` : 'all-legacy';
  return path.join(args.backupDir, `${timestamp}-${suffix}.json`);
}

function writeCleanupBackup(args, records) {
  if (!args.backup || !records.length) return '';
  fs.mkdirSync(args.backupDir, { recursive: true });
  const backupPath = buildBackupFilePath(args);
  const payload = {
    createdAt: new Date().toISOString(),
    script: 'cleanup-legacy-ranking-records',
    args: {
      memberUserId: args.memberUserId
    },
    recordCount: records.length,
    records: records.map(serializeForBackup)
  };
  fs.writeFileSync(backupPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return backupPath;
}

function normalizeRankingCategoryKey(record) {
  return String(record.categoryKey || record.category || '').trim();
}

function isLegacyRankingRecord(record) {
  return record.legacy === true
    || String(record.rankingMode || '').trim() === 'legacy'
    || String(record.sourceSheet || '').trim() === LEGACY_SOURCE_SHEET
    || String(record.recordId || '').startsWith('legacy_');
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
    legacyRecordCount: 0,
    byMode,
    bestScoresByMode,
    migrationSource: 'ranking_legacy_cleanup_rebuild',
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
      rankingMode: String(record.rankingMode || 'normal').trim() || 'normal',
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
    migrationSource: 'ranking_legacy_cleanup_rebuild',
    updatedAt
  };
}

async function getQueryRows(query) {
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ recordId: doc.id, ...(doc.data() || {}) }));
}

async function loadLegacyRankingRecords(db, args) {
  const collection = db.collection('rankingRecords');
  const queries = [
    collection.where('legacy', '==', true),
    collection.where('rankingMode', '==', 'legacy'),
    collection.where('sourceSheet', '==', LEGACY_SOURCE_SHEET)
  ];
  const rows = (await Promise.all(queries.map(getQueryRows))).flat();
  const byRecordId = new Map();
  rows.forEach(record => {
    if (!isLegacyRankingRecord(record)) return;
    if (args.memberUserId && record.memberUserId !== args.memberUserId) return;
    byRecordId.set(record.recordId, record);
  });
  return Array.from(byRecordId.values()).sort((a, b) => String(a.recordId).localeCompare(String(b.recordId)));
}

async function commitBatches(batches) {
  for (const batch of batches) {
    await batch.commit();
  }
}

async function deleteRecords(db, records) {
  const batches = [];
  let batch = db.batch();
  let writeCount = 0;
  records.forEach(record => {
    batch.delete(db.collection('rankingRecords').doc(record.recordId));
    writeCount += 1;
    if (writeCount >= 450) {
      batches.push(batch);
      batch = db.batch();
      writeCount = 0;
    }
  });
  if (writeCount) batches.push(batch);
  await commitBatches(batches);
}

async function rebuildSummariesForMembers(db, memberUserIds, deletedRecordIds) {
  const updatedAt = FieldValue.serverTimestamp();
  const batches = [];
  let batch = db.batch();
  let writeCount = 0;
  for (const memberUserId of memberUserIds) {
    const snapshot = await db.collection('rankingRecords')
      .where('memberUserId', '==', memberUserId)
      .limit(500)
      .get();
    const records = snapshot.docs
      .map(doc => ({ recordId: doc.id, ...(doc.data() || {}) }))
      .filter(record => !deletedRecordIds.has(record.recordId))
      .filter(record => !isLegacyRankingRecord(record));
    const userSummaryRef = db.collection('userRankingSummary').doc(memberUserId);
    const quizKingSummaryRef = db.collection('quizKingSummary').doc(memberUserId);
    if (records.length) {
      batch.set(userSummaryRef, buildUserRankingSummary(memberUserId, records, updatedAt), { merge: false });
      batch.set(quizKingSummaryRef, buildQuizKingSummary(memberUserId, records, updatedAt), { merge: false });
    } else {
      batch.delete(userSummaryRef);
      batch.delete(quizKingSummaryRef);
    }
    writeCount += 2;
    if (writeCount >= 450) {
      batches.push(batch);
      batch = db.batch();
      writeCount = 0;
    }
  }
  if (writeCount) batches.push(batch);
  await commitBatches(batches);
}

function printRecordSample(records, sample) {
  records.slice(0, sample).forEach(record => {
    console.log(JSON.stringify({
      recordId: record.recordId,
      memberUserId: record.memberUserId,
      displayName: record.displayName,
      category: record.category,
      categoryKey: record.categoryKey,
      score: record.score,
      elapsedSeconds: record.elapsedSeconds,
      rankingMode: record.rankingMode,
      legacy: record.legacy === true,
      sourceSheet: record.sourceSheet,
      recordedAt: serializeTimestamp(record.recordedAt)
    }));
  });
}

async function main() {
  const args = parseArgs(process.argv);
  initializeAdminApp();
  const db = getFirestore();
  const records = await loadLegacyRankingRecords(db, args);
  const memberUserIds = Array.from(new Set(records.map(record => record.memberUserId).filter(Boolean))).sort();

  console.log('Legacy ranking cleanup');
  console.log(`Mode: ${args.commit ? 'commit' : 'dry-run'}`);
  console.log(`Member filter: ${args.memberUserId || '(none)'}`);
  console.log(`Backup: ${args.commit && args.backup ? args.backupDir : '(dry-run or disabled)'}`);
  console.log(`Matched records: ${records.length}`);
  console.log(`Affected members: ${memberUserIds.length}`);
  printRecordSample(records, args.sample);

  if (!args.commit || !records.length) return;

  const backupPath = writeCleanupBackup(args, records);
  if (backupPath) console.log(`Backup written: ${backupPath}`);

  await deleteRecords(db, records);
  await rebuildSummariesForMembers(
    db,
    memberUserIds,
    new Set(records.map(record => record.recordId))
  );
  console.log(`Deleted rankingRecords: ${records.length}`);
  console.log(`Rebuilt userRankingSummary and quizKingSummary for affected members: ${memberUserIds.length}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
