const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), 'private', 'backups');

const ROOT_COLLECTIONS = [
  'users',
  'memberCredentials',
  'authSettings',
  'memberPasswordSetupState',
  'memberAccessCodes',
  'userEconomy',
  'userRoomSettings',
  'userPracticeSummary',
  'userTitleSummary',
  'practiceRecords',
  'rankingRecords',
  'userRankingSummary',
  'quizKingSummary',
  'rewardLogs',
  'purchaseLogs',
  'adminLogs',
  'noticeBoard',
  'shopItems',
  'assetCatalog',
  'profileImageCandidates',
  'quizzes',
  'titleCatalog'
];

const SUBCOLLECTIONS = [
  { parent: 'userBadges', child: 'badges' },
  { parent: 'userTitles', child: 'titles' },
  { parent: 'userInventory', child: 'items' },
  { parent: 'quizQuestions', child: 'questions' }
];

function parseArgs(argv) {
  const args = {
    dryRun: true,
    commit: false,
    outputDir: DEFAULT_OUTPUT_DIR,
    sample: 3
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--commit') {
      args.commit = true;
      args.dryRun = false;
    } else if (arg === '--dry-run') {
      args.commit = false;
      args.dryRun = true;
    } else if (arg === '--output-dir') {
      index += 1;
      if (!argv[index]) throw new Error('--output-dir requires a path.');
      args.outputDir = argv[index];
    } else if (arg.startsWith('--output-dir=')) {
      args.outputDir = arg.slice('--output-dir='.length);
    } else if (arg === '--sample') {
      index += 1;
      args.sample = Number(argv[index] || 0);
    } else if (arg.startsWith('--sample=')) {
      args.sample = Number(arg.slice('--sample='.length));
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
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

function serializeValue(value) {
  if (!value) return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, serializeValue(child)]));
  }
  return value;
}

async function exportCollection(db, collectionPath, sampleLimit) {
  const snapshot = await db.collection(collectionPath).get();
  const docs = snapshot.docs.map(doc => ({
    id: doc.id,
    path: doc.ref.path,
    data: serializeValue(doc.data() || {})
  }));
  return {
    path: collectionPath,
    count: docs.length,
    sample: docs.slice(0, sampleLimit),
    docs
  };
}

async function exportSubcollection(db, parentCollection, childCollection, sampleLimit) {
  const snapshot = await db.collectionGroup(childCollection).get();
  const grouped = new Map();
  snapshot.docs
    .filter(doc => doc.ref.parent.parent && doc.ref.parent.parent.parent.id === parentCollection)
    .forEach(doc => {
      const parentId = doc.ref.parent.parent.id;
      const key = `${doc.ref.parent.parent.path}/${childCollection}`;
      if (!grouped.has(key)) {
        grouped.set(key, { parentId, path: key, count: 0, sample: [], docs: [] });
      }
      const group = grouped.get(key);
      const item = {
        id: doc.id,
        path: doc.ref.path,
        data: serializeValue(doc.data() || {})
      };
      group.count += 1;
      if (group.sample.length < sampleLimit) group.sample.push(item);
      group.docs.push(item);
    });
  const groups = Array.from(grouped.values());
  const totalCount = groups.reduce((sum, group) => sum + group.count, 0);
  return {
    path: `${parentCollection}/*/${childCollection}`,
    parentCount: groups.length,
    count: totalCount,
    groups
  };
}

function buildBackupFileName() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `firestore-operational-backup-${stamp}.json`;
}

async function main() {
  const args = parseArgs(process.argv);
  initializeAdminApp();
  const db = admin.firestore();
  const backup = {
    exportedAt: new Date().toISOString(),
    projectId: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || '',
    rootCollections: {},
    subcollections: {}
  };

  for (const collectionPath of ROOT_COLLECTIONS) {
    backup.rootCollections[collectionPath] = await exportCollection(db, collectionPath, args.sample);
    console.log(`${collectionPath}: ${backup.rootCollections[collectionPath].count}`);
  }

  for (const config of SUBCOLLECTIONS) {
    const key = `${config.parent}/*/${config.child}`;
    backup.subcollections[key] = await exportSubcollection(db, config.parent, config.child, args.sample);
    console.log(`${key}: ${backup.subcollections[key].count}`);
  }

  if (args.dryRun || !args.commit) {
    console.log('No backup file was written. Re-run with --commit to write JSON under private/backups.');
    return;
  }

  fs.mkdirSync(args.outputDir, { recursive: true });
  const outputPath = path.join(args.outputDir, buildBackupFileName());
  fs.writeFileSync(outputPath, `${JSON.stringify(backup, null, 2)}\n`, 'utf8');
  console.log(`Backup written: ${outputPath}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
