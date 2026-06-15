const admin = require('firebase-admin');

const DEFAULT_CUTOFF = '2026-06-05T18:00:00+09:00';
const DEFAULT_SAMPLE_LIMIT = 10;

const TARGETS = [
  {
    label: 'rankingRecords',
    type: 'collection',
    path: 'rankingRecords',
    fields: ['createdAt', 'recordedAt', 'updatedAt'],
    action: 'delete-new-records'
  },
  {
    label: 'purchaseLogs',
    type: 'collection',
    path: 'purchaseLogs',
    fields: ['createdAt'],
    action: 'delete-new-logs'
  },
  {
    label: 'rewardLogs',
    type: 'collection',
    path: 'rewardLogs',
    fields: ['createdAt'],
    action: 'delete-new-logs'
  },
  {
    label: 'practiceRecords',
    type: 'collection',
    path: 'practiceRecords',
    fields: ['updatedAt', 'lastAchievedAt', 'lastCompletedAt', 'createdAt'],
    action: 'restore-baseline-required'
  },
  {
    label: 'userPracticeSummary',
    type: 'collection',
    path: 'userPracticeSummary',
    fields: ['updatedAt', 'migratedAt'],
    action: 'recompute-or-restore-required'
  },
  {
    label: 'userBadges/*/badges',
    type: 'subcollection',
    parentPath: 'userBadges',
    path: 'badges',
    fields: ['updatedAt', 'migratedAt'],
    action: 'recompute-or-restore-required'
  },
  {
    label: 'userEconomy',
    type: 'collection',
    path: 'userEconomy',
    fields: ['updatedAt', 'lastPracticeRewardAt', 'migratedAt'],
    action: 'restore-balance-required'
  },
  {
    label: 'userInventory/*/items',
    type: 'subcollection',
    parentPath: 'userInventory',
    path: 'items',
    fields: ['createdAt', 'acquiredAt', 'updatedAt', 'migratedAt'],
    action: 'review-purchased-items'
  },
  {
    label: 'userRankingSummary',
    type: 'collection',
    path: 'userRankingSummary',
    fields: ['updatedAt', 'migratedAt'],
    action: 'recompute-or-restore-required'
  },
  {
    label: 'quizKingSummary',
    type: 'collection',
    path: 'quizKingSummary',
    fields: ['updatedAt', 'migratedAt'],
    action: 'recompute-or-restore-required'
  },
  {
    label: 'userRoomSettings',
    type: 'collection',
    path: 'userRoomSettings',
    fields: ['updatedAt', 'migratedAt'],
    action: 'review-room-settings'
  }
];

function parseArgs(argv) {
  const args = {
    cutoff: DEFAULT_CUTOFF,
    sample: DEFAULT_SAMPLE_LIMIT
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--cutoff') {
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
  if (Number.isNaN(cutoffDate.getTime())) {
    throw new Error('--cutoff must be a valid date string.');
  }
  if (!Number.isInteger(args.sample) || args.sample < 0) {
    throw new Error('--sample must be a non-negative integer.');
  }

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

function getQueryRef(db, target) {
  if (target.type === 'collectionGroup') return db.collectionGroup(target.path);
  return db.collection(target.path);
}

function addCandidate(candidates, doc, field) {
  const data = doc.data() || {};
  const current = candidates.get(doc.ref.path) || {
    path: doc.ref.path,
    id: doc.id,
    matchedFields: [],
    times: {},
    data
  };
  if (!current.matchedFields.includes(field)) current.matchedFields.push(field);
  current.times[field] = printableTime(data[field]);
  candidates.set(doc.ref.path, current);
}

async function collectTarget(db, target, cutoffTimestamp) {
  const candidates = new Map();
  const errors = [];

  if (target.type === 'subcollection') {
    try {
      const parentSnapshot = await db.collection(target.parentPath).get();
      for (const parentDoc of parentSnapshot.docs) {
        const childSnapshot = await parentDoc.ref.collection(target.path).get();
        childSnapshot.docs.forEach(doc => {
          const data = doc.data() || {};
          target.fields.forEach(field => {
            if (timestampMillis(data[field]) >= cutoffTimestamp.toMillis()) {
              addCandidate(candidates, doc, field);
            }
          });
        });
      }
    } catch (error) {
      errors.push({
        field: '*',
        message: error.message || String(error)
      });
    }
    return {
      target,
      candidates: Array.from(candidates.values()).sort((a, b) => a.path.localeCompare(b.path)),
      errors
    };
  }

  for (const field of target.fields) {
    try {
      const snapshot = await getQueryRef(db, target)
        .where(field, '>=', cutoffTimestamp)
        .get();
      snapshot.docs.forEach(doc => addCandidate(candidates, doc, field));
    } catch (error) {
      errors.push({
        field,
        message: error.message || String(error)
      });
    }
  }

  return {
    target,
    candidates: Array.from(candidates.values()).sort((a, b) => a.path.localeCompare(b.path)),
    errors
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

function summarizeCandidate(candidate) {
  const data = candidate.data || {};
  return {
    path: candidate.path,
    matchedFields: candidate.matchedFields,
    times: candidate.times,
    memberUserId: data.memberUserId || data.userId || '',
    quizId: data.quizId || '',
    category: data.category || data.area || data.rawCategory || '',
    score: data.score ?? '',
    djCoin: data.djCoin ?? '',
    migrationSource: data.migrationSource || data.source || ''
  };
}

async function main() {
  const args = parseArgs(process.argv);
  initializeAdminApp();
  const db = admin.firestore();

  console.log('Post-cutoff data preview only. No Firestore writes will be performed.');
  console.log(`Cutoff local input: ${args.cutoff}`);
  console.log(`Cutoff UTC: ${args.cutoffDate.toISOString()}`);
  console.log('');

  const results = [];
  for (const target of TARGETS) {
    const result = await collectTarget(db, target, args.cutoffTimestamp);
    const cleanupCandidates = result.candidates.filter(candidate => !isBaselineImportOnly(candidate));
    results.push(result);
    console.log(`[${target.label}]`);
    console.log(`action: ${target.action}`);
    console.log(`candidateCount: ${result.candidates.length}`);
    console.log(`cleanupCandidateCount: ${cleanupCandidates.length}`);
    if (result.errors.length) {
      console.log(`queryErrors: ${JSON.stringify(result.errors)}`);
    }
    cleanupCandidates.slice(0, args.sample).forEach(candidate => {
      console.log(JSON.stringify(summarizeCandidate(candidate)));
    });
    console.log('');
  }

  const totals = results.map(result => ({
    label: result.target.label,
    action: result.target.action,
    candidateCount: result.candidates.length,
    cleanupCandidateCount: result.candidates.filter(candidate => !isBaselineImportOnly(candidate)).length,
    queryErrorCount: result.errors.length
  }));
  console.log('Summary');
  console.log(JSON.stringify(totals, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
