const admin = require('firebase-admin');
const fs = require('fs');

function parseArgs(argv) {
  const args = {
    input: '',
    commit: false,
    overwrite: false,
    sample: 20
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input') {
      index += 1;
      args.input = String(argv[index] || '').trim();
    } else if (arg.startsWith('--input=')) {
      args.input = String(arg.slice('--input='.length)).trim();
    } else if (arg === '--commit') {
      args.commit = true;
    } else if (arg === '--dry-run') {
      args.commit = false;
    } else if (arg === '--overwrite') {
      args.overwrite = true;
    } else if (arg === '--sample') {
      index += 1;
      args.sample = Number(argv[index] || 0);
    } else if (arg.startsWith('--sample=')) {
      args.sample = Number(arg.slice('--sample='.length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.input) throw new Error('--input is required.');
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

function parseBackupTimestamp(value) {
  if (typeof value !== 'string') return value;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return value;
  return admin.firestore.Timestamp.fromDate(new Date(time));
}

function restoreFirestoreValues(value, key = '') {
  if (Array.isArray(value)) return value.map(entry => restoreFirestoreValues(entry));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, entry]) => [childKey, restoreFirestoreValues(entry, childKey)]));
  }
  if (/At$/.test(key)) return parseBackupTimestamp(value);
  return value;
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
    migrationSource: 'ranking_cleanup_restore',
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
    migrationSource: 'ranking_cleanup_restore',
    updatedAt
  };
}

async function commitBatches(batches) {
  for (const batch of batches) {
    await batch.commit();
  }
}

async function rebuildSummariesForMembers(db, memberUserIds) {
  const updatedAt = admin.firestore.FieldValue.serverTimestamp();
  const batches = [];
  let batch = db.batch();
  let writeCount = 0;
  for (const memberUserId of memberUserIds) {
    const snapshot = await db.collection('rankingRecords')
      .where('memberUserId', '==', memberUserId)
      .limit(500)
      .get();
    const records = snapshot.docs.map(doc => ({ recordId: doc.id, ...(doc.data() || {}) }));
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

function loadBackupRecords(inputPath) {
  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (!Array.isArray(payload.records)) {
    throw new Error('Backup file does not contain records array.');
  }
  return payload.records
    .map(record => restoreFirestoreValues(record))
    .filter(record => record.recordId);
}

async function main() {
  const args = parseArgs(process.argv);
  initializeAdminApp();
  const db = admin.firestore();
  const backupRecords = loadBackupRecords(args.input);
  const refs = backupRecords.map(record => db.collection('rankingRecords').doc(record.recordId));
  const existingSnapshots = await Promise.all(refs.map(ref => ref.get()));
  const recordsToRestore = backupRecords.filter((record, index) => args.overwrite || !existingSnapshots[index].exists);
  const skippedRecords = backupRecords.filter((record, index) => existingSnapshots[index].exists && !args.overwrite);

  console.log(`Backup input: ${args.input}`);
  console.log(`Mode: ${args.commit ? 'commit' : 'dry-run'}`);
  console.log(`Overwrite existing: ${args.overwrite ? 'yes' : 'no'}`);
  console.log(`Backup records: ${backupRecords.length}`);
  console.log(`Restore targets: ${recordsToRestore.length}`);
  console.log(`Skipped existing: ${skippedRecords.length}`);

  recordsToRestore.slice(0, args.sample).forEach(record => {
    console.log(JSON.stringify({
      recordId: record.recordId,
      memberUserId: record.memberUserId,
      category: record.category,
      score: record.score,
      elapsedSeconds: record.elapsedSeconds,
      rankingMode: record.rankingMode
    }));
  });

  if (!args.commit || !recordsToRestore.length) return;

  const batches = [];
  let batch = db.batch();
  let writeCount = 0;
  recordsToRestore.forEach(record => {
    const ref = db.collection('rankingRecords').doc(record.recordId);
    batch.set(ref, record, { merge: false });
    writeCount += 1;
    if (writeCount >= 450) {
      batches.push(batch);
      batch = db.batch();
      writeCount = 0;
    }
  });
  if (writeCount) batches.push(batch);
  await commitBatches(batches);

  const memberUserIds = Array.from(new Set(recordsToRestore.map(record => record.memberUserId).filter(Boolean)));
  await rebuildSummariesForMembers(db, memberUserIds);
  console.log(`Restored rankingRecords: ${recordsToRestore.length}`);
  console.log('Rebuilt userRankingSummary and quizKingSummary for restored members.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
