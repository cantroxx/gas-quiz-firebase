const admin = require('firebase-admin');

const PRACTICE_RECORDS_COLLECTION = 'practiceRecords';

function parseArgs(argv) {
  const args = {
    commit: false,
    sample: 10
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--commit') {
      args.commit = true;
    } else if (arg === '--dry-run') {
      args.commit = false;
    } else if (arg === '--sample') {
      index += 1;
      args.sample = Number(argv[index] || 0);
    } else if (arg.startsWith('--sample=')) {
      args.sample = Number(arg.slice('--sample='.length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!Number.isInteger(args.sample) || args.sample < 0) throw new Error('--sample must be a non-negative integer.');
  return args;
}

function initializeAdminApp() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

function normalizePokemonCorrectId(value) {
  const id = String(value || '').trim();
  const match = id.match(/^pokemon-gen[1-9]-(\d{1,4})$/);
  if (!match) return id;
  return String(Number(match[1]));
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];
  values.forEach(value => {
    const text = String(value || '').trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    result.push(text);
  });
  return result;
}

function buildUpdate(doc) {
  const data = doc.data() || {};
  const ids = Array.isArray(data.correctIds) ? data.correctIds.map(id => String(id || '').trim()).filter(Boolean) : [];
  if (!ids.length) return null;
  const normalizedIds = uniqueStrings(ids.map(normalizePokemonCorrectId));
  const changed = normalizedIds.length !== ids.length || normalizedIds.some((id, index) => id !== ids[index]);
  if (!changed) return null;
  const totalCount = Number(data.totalCount) || 0;
  return {
    correctIds: normalizedIds,
    correctCount: totalCount ? Math.min(normalizedIds.length, totalCount) : normalizedIds.length,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    normalizedLegacyPokemonIdsAt: admin.firestore.FieldValue.serverTimestamp()
  };
}

async function main() {
  const args = parseArgs(process.argv);
  initializeAdminApp();
  const db = admin.firestore();
  const snapshot = await db.collection(PRACTICE_RECORDS_COLLECTION)
    .where('area', '==', '포켓몬')
    .get();
  const updates = [];
  snapshot.docs.forEach(doc => {
    const update = buildUpdate(doc);
    if (!update) return;
    updates.push({ ref: doc.ref, before: doc.data().correctIds || [], update });
  });

  console.log(`Mode: ${args.commit ? 'commit' : 'dry-run'}`);
  console.log(`Pokemon practice records scanned: ${snapshot.size}`);
  console.log(`Records needing correctIds normalization: ${updates.length}`);
  updates.slice(0, args.sample).forEach(item => {
    console.log(JSON.stringify({
      path: item.ref.path,
      before: item.before,
      after: item.update.correctIds,
      correctCount: item.update.correctCount
    }, null, 2));
  });

  if (!args.commit) return;

  let batch = db.batch();
  let pending = 0;
  let writes = 0;
  for (const item of updates) {
    batch.set(item.ref, item.update, { merge: true });
    pending += 1;
    writes += 1;
    if (pending >= 450) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending) await batch.commit();
  console.log(`Firestore writes: ${writes}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
