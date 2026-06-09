const admin = require('firebase-admin');

const DEFAULT_TIMEZONE_OFFSET_HOURS = 9;

function parseArgs(argv) {
  const args = {
    sample: 5
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--sample') {
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

function kstDayStartTimestamp() {
  const now = new Date();
  const shifted = new Date(now.getTime() + DEFAULT_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000);
  const startUtc = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  return admin.firestore.Timestamp.fromDate(new Date(startUtc - DEFAULT_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000));
}

async function countCollection(db, path) {
  const snapshot = await db.collection(path).count().get();
  return snapshot.data().count || 0;
}

async function countRecent(db, path, field, since) {
  try {
    const snapshot = await db.collection(path).where(field, '>=', since).count().get();
    return snapshot.data().count || 0;
  } catch (error) {
    return { error: error.message || String(error) };
  }
}

async function main() {
  const args = parseArgs(process.argv);
  initializeAdminApp();
  const db = admin.firestore();
  const todayStart = kstDayStartTimestamp();
  const [
    users,
    practiceRecords,
    rankingRecords,
    rewardLogs,
    purchaseLogs,
    userEconomy,
    todayPractice,
    todayRankings,
    todayRewards,
    todayPurchases
  ] = await Promise.all([
    countCollection(db, 'users'),
    countCollection(db, 'practiceRecords'),
    countCollection(db, 'rankingRecords'),
    countCollection(db, 'rewardLogs'),
    countCollection(db, 'purchaseLogs'),
    countCollection(db, 'userEconomy'),
    countRecent(db, 'practiceRecords', 'updatedAt', todayStart),
    countRecent(db, 'rankingRecords', 'createdAt', todayStart),
    countRecent(db, 'rewardLogs', 'createdAt', todayStart),
    countRecent(db, 'purchaseLogs', 'createdAt', todayStart)
  ]);

  const unlinkedSnapshot = await db.collection('users')
    .where('role', '==', 'student')
    .where('active', '==', true)
    .limit(1000)
    .get();
  const activeStudents = unlinkedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const unlinked = activeStudents.filter(user => !user.authUid);

  console.log('Operational metrics');
  console.log(`- users: ${users}`);
  console.log(`- active students checked: ${activeStudents.length}`);
  console.log(`- active students without authUid: ${unlinked.length}`);
  console.log(`- practiceRecords: ${practiceRecords}`);
  console.log(`- rankingRecords: ${rankingRecords}`);
  console.log(`- rewardLogs: ${rewardLogs}`);
  console.log(`- purchaseLogs: ${purchaseLogs}`);
  console.log(`- userEconomy wallets: ${userEconomy}`);
  console.log(`- today practice updates: ${JSON.stringify(todayPractice)}`);
  console.log(`- today rankings: ${JSON.stringify(todayRankings)}`);
  console.log(`- today rewards: ${JSON.stringify(todayRewards)}`);
  console.log(`- today purchases: ${JSON.stringify(todayPurchases)}`);

  if (args.sample > 0) {
    console.log('Sample active students without authUid:');
    unlinked.slice(0, args.sample).forEach(user => {
      console.log(`- ${user.id} ${user.nickname || user.name || ''}`);
    });
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
