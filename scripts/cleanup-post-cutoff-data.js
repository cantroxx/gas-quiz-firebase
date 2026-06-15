const admin = require('firebase-admin');

const DEFAULT_CUTOFF = '2026-06-05T18:00:00+09:00';
const DEFAULT_SAMPLE_LIMIT = 20;

const DIRECT_DELETE_TARGETS = [
  {
    label: 'rankingRecords',
    path: 'rankingRecords',
    fields: ['createdAt', 'recordedAt', 'updatedAt']
  },
  {
    label: 'purchaseLogs',
    path: 'purchaseLogs',
    fields: ['createdAt']
  },
  {
    label: 'rewardLogs',
    path: 'rewardLogs',
    fields: ['createdAt']
  }
];

const REVIEW_TARGETS = [
  {
    label: 'practiceRecords',
    path: 'practiceRecords',
    fields: ['updatedAt', 'lastAchievedAt', 'lastCompletedAt', 'createdAt'],
    restoreCommand: 'GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/import-practice-badges-from-json.js --commit --input exports/practice-export.json'
  },
  {
    label: 'userPracticeSummary',
    path: 'userPracticeSummary',
    fields: ['updatedAt', 'migratedAt'],
    restoreCommand: 'GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/import-practice-badges-from-json.js --commit --input exports/practice-export.json'
  },
  {
    label: 'userRankingSummary',
    path: 'userRankingSummary',
    fields: ['updatedAt', 'migratedAt'],
    restoreCommand: 'GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/import-rankings-from-json.js --commit --input exports/ranking-export.json'
  },
  {
    label: 'quizKingSummary',
    path: 'quizKingSummary',
    fields: ['updatedAt', 'migratedAt'],
    restoreCommand: 'GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/import-rankings-from-json.js --commit --input exports/ranking-export.json'
  },
  {
    label: 'userEconomy',
    path: 'userEconomy',
    fields: ['updatedAt', 'lastPracticeRewardAt', 'migratedAt'],
    restoreCommand: ''
  },
  {
    label: 'userRoomSettings',
    path: 'userRoomSettings',
    fields: ['updatedAt', 'migratedAt'],
    restoreCommand: ''
  }
];

function parseArgs(argv) {
  const args = {
    cutoff: DEFAULT_CUTOFF,
    sample: DEFAULT_SAMPLE_LIMIT,
    commit: false,
    resetEconomy: false
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--commit') {
      args.commit = true;
    } else if (arg === '--dry-run') {
      args.commit = false;
    } else if (arg === '--reset-economy') {
      args.resetEconomy = true;
    } else if (arg === '--cutoff') {
      index += 1;
      if (!argv[index]) throw new Error('--cutoff requires an ISO date string.');
      args.cutoff = argv[index];
    } else if (arg.startsWith('--cutoff=')) {
      args.cutoff = arg.slice('--cutoff='.length);
    } else if (arg === '--sample') {
      index += 1;
      args.sample = Number(argv[index] || DEFAULT_SAMPLE_LIMIT);
    } else if (arg.startsWith('--sample=')) {
      args.sample = Number(arg.slice('--sample='.length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  const cutoffDate = new Date(args.cutoff);
  if (Number.isNaN(cutoffDate.getTime())) throw new Error('--cutoff must be a valid date string.');
  if (!Number.isInteger(args.sample) || args.sample < 0) throw new Error('--sample must be a non-negative integer.');

  return {
    ...args,
    cutoffDate,
    cutoffTimestamp: admin.firestore.Timestamp.fromDate(cutoffDate)
  };
}

function initializeAdminApp() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return 0;
}

function printableTime(value) {
  const millis = timestampMillis(value);
  return millis ? new Date(millis).toISOString() : '';
}

function addCandidate(candidates, doc, field) {
  const data = doc.data() || {};
  const current = candidates.get(doc.ref.path) || {
    ref: doc.ref,
    path: doc.ref.path,
    id: doc.id,
    data,
    matchedFields: [],
    times: {}
  };
  if (!current.matchedFields.includes(field)) current.matchedFields.push(field);
  current.times[field] = printableTime(data[field]);
  candidates.set(doc.ref.path, current);
}

async function collectCandidates(db, target, cutoffTimestamp) {
  const candidates = new Map();
  const errors = [];

  for (const field of target.fields) {
    try {
      const snapshot = await db.collection(target.path).where(field, '>=', cutoffTimestamp).get();
      snapshot.docs.forEach(doc => addCandidate(candidates, doc, field));
    } catch (error) {
      errors.push({ field, message: error.message || String(error) });
    }
  }

  return {
    target,
    errors,
    candidates: Array.from(candidates.values()).sort((a, b) => a.path.localeCompare(b.path))
  };
}

function isBaselineImportOnly(candidate) {
  const data = candidate.data || {};
  const source = String(data.migrationSource || data.source || '');
  if (!source.startsWith('gas_')) return false;
  const migratedAtMillis = timestampMillis(data.migratedAt);
  if (!migratedAtMillis) return false;
  return candidate.matchedFields.every(field => {
    if (field === 'migratedAt') return true;
    return timestampMillis(data[field]) === migratedAtMillis;
  });
}

function isGasMigrated(candidate) {
  const data = candidate.data || {};
  return String(data.migrationSource || data.source || '').startsWith('gas_');
}

function summarizeCandidate(candidate) {
  const data = candidate.data || {};
  return {
    path: candidate.path,
    matchedFields: candidate.matchedFields,
    times: candidate.times,
    memberUserId: data.memberUserId || data.userId || '',
    quizId: data.quizId || '',
    category: data.category || data.area || data.rawCategory || '',
    recordId: data.recordId || '',
    djCoin: data.djCoin ?? '',
    migrationSource: data.migrationSource || data.source || ''
  };
}

async function collectInventoryDeletesFromPurchases(db, purchaseCandidates) {
  const deletes = [];
  const seen = new Set();

  for (const purchase of purchaseCandidates) {
    const inventoryPath = String((purchase.data || {}).inventoryPath || '').trim();
    if (!inventoryPath || seen.has(inventoryPath)) continue;
    seen.add(inventoryPath);
    const ref = db.doc(inventoryPath);
    const snapshot = await ref.get();
    deletes.push({
      ref,
      path: inventoryPath,
      exists: snapshot.exists,
      purchaseLogPath: purchase.path
    });
  }

  return deletes;
}

async function collectCollectionDocs(db, path) {
  const snapshot = await db.collection(path).get();
  return snapshot.docs.map(doc => ({
    ref: doc.ref,
    path: doc.ref.path,
    data: doc.data() || {}
  }));
}

async function deleteInBatches(refs) {
  const db = admin.firestore();
  let deleted = 0;
  for (let index = 0; index < refs.length; index += 450) {
    const batch = db.batch();
    refs.slice(index, index + 450).forEach(ref => batch.delete(ref));
    await batch.commit();
    deleted += Math.min(450, refs.length - index);
  }
  return deleted;
}

async function main() {
  const args = parseArgs(process.argv);
  initializeAdminApp();
  const db = admin.firestore();

  console.log(args.commit ? 'POST-CUTOFF CLEANUP COMMIT MODE' : 'Post-cutoff cleanup dry-run only. No Firestore writes will be performed.');
  if (args.resetEconomy) console.log('Economy reset enabled: all userEconomy documents will be deleted.');
  console.log(`Cutoff local input: ${args.cutoff}`);
  console.log(`Cutoff UTC: ${args.cutoffDate.toISOString()}`);
  console.log('');

  const refsToDelete = [];
  const restoreCommands = new Set();
  const directResults = [];

  for (const target of DIRECT_DELETE_TARGETS) {
    const result = await collectCandidates(db, target, args.cutoffTimestamp);
    const cleanupCandidates = result.candidates.filter(candidate => !isBaselineImportOnly(candidate));
    directResults.push({ target, result, cleanupCandidates });
    cleanupCandidates.forEach(candidate => refsToDelete.push(candidate.ref));

    console.log(`[delete ${target.label}]`);
    console.log(`candidateCount: ${result.candidates.length}`);
    console.log(`deleteCount: ${cleanupCandidates.length}`);
    if (result.errors.length) console.log(`queryErrors: ${JSON.stringify(result.errors)}`);
    cleanupCandidates.slice(0, args.sample).forEach(candidate => console.log(JSON.stringify(summarizeCandidate(candidate))));
    console.log('');
  }

  const purchaseResult = directResults.find(item => item.target.label === 'purchaseLogs');
  const inventoryDeletes = await collectInventoryDeletesFromPurchases(db, purchaseResult ? purchaseResult.cleanupCandidates : []);
  inventoryDeletes.filter(item => item.exists).forEach(item => refsToDelete.push(item.ref));

  console.log('[delete purchased inventory items from purchaseLogs.inventoryPath]');
  console.log(`candidateCount: ${inventoryDeletes.length}`);
  console.log(`deleteCount: ${inventoryDeletes.filter(item => item.exists).length}`);
  inventoryDeletes.slice(0, args.sample).forEach(item => {
    console.log(JSON.stringify({
      path: item.path,
      exists: item.exists,
      purchaseLogPath: item.purchaseLogPath
    }));
  });
  console.log('');

  if (args.resetEconomy) {
    const economyDocs = await collectCollectionDocs(db, 'userEconomy');
    economyDocs.forEach(item => refsToDelete.push(item.ref));
    console.log('[delete userEconomy reset]');
    console.log(`deleteCount: ${economyDocs.length}`);
    economyDocs.slice(0, args.sample).forEach(item => {
      console.log(JSON.stringify({
        path: item.path,
        userId: item.data.userId || item.path.split('/').pop(),
        djCoin: item.data.djCoin ?? '',
        source: item.data.source || item.data.migrationSource || ''
      }));
    });
    console.log('');
  }

  for (const target of REVIEW_TARGETS) {
    const result = await collectCandidates(db, target, args.cutoffTimestamp);
    const cleanupCandidates = result.candidates.filter(candidate => !isBaselineImportOnly(candidate));
    const deleteCandidates = target.label === 'userRoomSettings'
      ? cleanupCandidates
      : cleanupCandidates.filter(candidate => !isGasMigrated(candidate));
    const restoreCandidates = cleanupCandidates.filter(candidate => isGasMigrated(candidate));

    if (restoreCandidates.length && target.restoreCommand) restoreCommands.add(target.restoreCommand);
    if (target.label === 'userPracticeSummary' || target.label === 'userRankingSummary' || target.label === 'quizKingSummary') {
      if (cleanupCandidates.length && target.restoreCommand) restoreCommands.add(target.restoreCommand);
    }

    if (target.label === 'practiceRecords' || target.label === 'userRoomSettings') {
      deleteCandidates.forEach(candidate => refsToDelete.push(candidate.ref));
    }

    console.log(`[review ${target.label}]`);
    console.log(`candidateCount: ${result.candidates.length}`);
    console.log(`cleanupCandidateCount: ${cleanupCandidates.length}`);
    const directDeleteCount = (target.label === 'practiceRecords' || target.label === 'userRoomSettings') ? deleteCandidates.length : 0;
    console.log(`directDeleteCount: ${directDeleteCount}`);
    console.log(`restoreOrManualReviewCount: ${cleanupCandidates.length - directDeleteCount}`);
    if (result.errors.length) console.log(`queryErrors: ${JSON.stringify(result.errors)}`);
    cleanupCandidates.slice(0, args.sample).forEach(candidate => console.log(JSON.stringify(summarizeCandidate(candidate))));
    console.log('');
  }

  console.log('Planned direct deletes');
  console.log(`deleteRefCount: ${refsToDelete.length}`);
  refsToDelete.slice(0, args.sample).forEach(ref => console.log(ref.path));
  console.log('');

  console.log('Required restore/manual steps after deletes');
  if (restoreCommands.size) {
    Array.from(restoreCommands).forEach(command => console.log(command));
  }
  if (args.resetEconomy) {
    console.log('- userEconomy is reset by deleting all userEconomy documents; the app starts missing wallets at 0 DJ coin.');
  } else {
    console.log('- userEconomy balances need explicit baseline restore or manual adjustment; exports/member-export.json does not include economy fields.');
  }
  console.log('- userRoomSettings post-cutoff candidates are deleted with the cleanup batch.');
  console.log('');

  if (!args.commit) return;

  const deleted = await deleteInBatches(refsToDelete);
  console.log(`Deleted ${deleted} Firestore documents.`);
  console.log('Run the restore/manual steps above before opening the site.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
