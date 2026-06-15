const admin = require('firebase-admin');

const SETTINGS_COLLECTION = 'authSettings';
const SETTINGS_DOCUMENT_ID = 'memberPasswordSetup';
const DEFAULT_EXPIRES_AT = '2026-06-17T23:59:59+09:00';

function parseArgs(argv) {
  const args = {
    dryRun: true,
    commit: false,
    setupEnabled: true,
    setupExpiresAt: DEFAULT_EXPIRES_AT,
    minPasswordLength: 4,
    maxFailedAttempts: 5,
    lockMinutes: 10
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      args.dryRun = true;
      args.commit = false;
    } else if (arg === '--commit') {
      args.commit = true;
      args.dryRun = false;
    } else if (arg === '--disable') {
      args.setupEnabled = false;
    } else if (arg === '--enable') {
      args.setupEnabled = true;
    } else if (arg === '--expires-at') {
      index += 1;
      if (!argv[index]) throw new Error('--expires-at requires an ISO date string.');
      args.setupExpiresAt = argv[index];
    } else if (arg.startsWith('--expires-at=')) {
      args.setupExpiresAt = arg.slice('--expires-at='.length);
    } else if (arg === '--min-password-length') {
      index += 1;
      args.minPasswordLength = Number(argv[index] || 4);
    } else if (arg === '--max-failed-attempts') {
      index += 1;
      args.maxFailedAttempts = Number(argv[index] || 5);
    } else if (arg === '--lock-minutes') {
      index += 1;
      args.lockMinutes = Number(argv[index] || 10);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(args.minPasswordLength) || args.minPasswordLength < 4) {
    throw new Error('--min-password-length must be an integer >= 4.');
  }
  if (!Number.isInteger(args.maxFailedAttempts) || args.maxFailedAttempts < 1) {
    throw new Error('--max-failed-attempts must be a positive integer.');
  }
  if (!Number.isInteger(args.lockMinutes) || args.lockMinutes < 1) {
    throw new Error('--lock-minutes must be a positive integer.');
  }
  const parsedDate = new Date(args.setupExpiresAt);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error('--expires-at must be a valid date string.');
  }

  return args;
}

function initializeAdminApp() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

function buildSettingsDocument(args) {
  return {
    setupEnabled: args.setupEnabled,
    setupExpiresAt: admin.firestore.Timestamp.fromDate(new Date(args.setupExpiresAt)),
    nicknameCheckEnabled: true,
    minPasswordLength: args.minPasswordLength,
    maxFailedAttempts: args.maxFailedAttempts,
    lockMinutes: args.lockMinutes,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: 'seed-member-password-setup-settings'
  };
}

function printableDocument(doc) {
  return {
    ...doc,
    setupExpiresAt: doc.setupExpiresAt.toDate().toISOString(),
    updatedAt: '[serverTimestamp]'
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const settingsDocument = buildSettingsDocument(args);
  console.log(`Target: ${SETTINGS_COLLECTION}/${SETTINGS_DOCUMENT_ID}`);
  console.log(JSON.stringify(printableDocument(settingsDocument), null, 2));

  if (!args.commit || args.dryRun) {
    console.log('No Firestore writes were performed. Use --commit to seed settings.');
    return;
  }

  initializeAdminApp();
  const db = admin.firestore();
  await db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOCUMENT_ID).set(settingsDocument, { merge: true });
  console.log(`Seeded ${SETTINGS_COLLECTION}/${SETTINGS_DOCUMENT_ID}.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
