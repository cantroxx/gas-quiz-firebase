const admin = require('firebase-admin');

const QUIZ_QUESTIONS_ROOT = 'quizQuestions';
const DEFAULT_QUIZ_IDS = [
  'pokemon-gen1',
  'pokemon-gen2',
  'pokemon-gen3',
  'pokemon-gen4',
  'pokemon-gen5',
  'pokemon-gen6',
  'pokemon-gen7',
  'pokemon-gen8',
  'pokemon-gen9',
  'pokemon-easy',
  'pokemon-normal',
  'pokemon-hard',
  'pokemon-very-hard'
];

function parseArgs(argv) {
  const args = {
    commit: false,
    sample: 10,
    quizIds: DEFAULT_QUIZ_IDS
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
    } else if (arg === '--quiz') {
      index += 1;
      args.quizIds = String(argv[index] || '').split(',').map(item => item.trim()).filter(Boolean);
    } else if (arg.startsWith('--quiz=')) {
      args.quizIds = arg.slice('--quiz='.length).split(',').map(item => item.trim()).filter(Boolean);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!Number.isInteger(args.sample) || args.sample < 0) throw new Error('--sample must be a non-negative integer.');
  if (!args.quizIds.length) throw new Error('At least one quiz id is required.');
  return args;
}

function initializeAdminApp() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
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

function inferPokemonNo(data, docId) {
  const direct = Number(data.pokemonNo || data.no || 0);
  if (direct > 0) return direct;
  const match = String(docId || data.questionId || '').match(/(?:pokemon(?:-gen\d+)?|pokemon-(?:easy|normal|hard|very-hard))-(\d{1,4})$/);
  return match ? Number(match[1]) : 0;
}

function buildUpdate(doc) {
  const data = doc.data() || {};
  const pokemonNo = inferPokemonNo(data, doc.id);
  if (!pokemonNo) return null;
  const practiceQuestionId = String(pokemonNo);
  const questionId = String(data.questionId || doc.id).trim();
  const legacyPracticeIds = uniqueStrings([
    practiceQuestionId,
    questionId,
    ...(Array.isArray(data.legacyPracticeIds) ? data.legacyPracticeIds : [])
  ]);
  const currentPracticeId = String(data.practiceQuestionId || '').trim();
  const currentLegacyIds = uniqueStrings(Array.isArray(data.legacyPracticeIds) ? data.legacyPracticeIds : []);
  const needsUpdate =
    data.pokemonNo !== pokemonNo ||
    currentPracticeId !== practiceQuestionId ||
    legacyPracticeIds.length !== currentLegacyIds.length ||
    legacyPracticeIds.some(id => !currentLegacyIds.includes(id));
  if (!needsUpdate) return null;
  return {
    pokemonNo,
    practiceQuestionId,
    legacyPracticeIds,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
}

async function main() {
  const args = parseArgs(process.argv);
  initializeAdminApp();
  const db = admin.firestore();
  const updates = [];
  const missingNo = [];
  for (const quizId of args.quizIds) {
    const snapshot = await db.collection(QUIZ_QUESTIONS_ROOT).doc(quizId).collection('questions').get();
    snapshot.docs.forEach(doc => {
      const update = buildUpdate(doc);
      if (update) {
        updates.push({
          quizId,
          questionId: doc.id,
          ref: doc.ref,
          update
        });
      } else if (!inferPokemonNo(doc.data() || {}, doc.id)) {
        missingNo.push({ quizId, questionId: doc.id });
      }
    });
  }

  console.log(`Mode: ${args.commit ? 'commit' : 'dry-run'}`);
  console.log(`Quiz ids: ${args.quizIds.join(', ')}`);
  console.log(`Questions needing update: ${updates.length}`);
  console.log(`Questions missing pokemonNo inference: ${missingNo.length}`);
  updates.slice(0, args.sample).forEach(item => {
    console.log(JSON.stringify({
      path: item.ref.path,
      update: {
        pokemonNo: item.update.pokemonNo,
        practiceQuestionId: item.update.practiceQuestionId,
        legacyPracticeIds: item.update.legacyPracticeIds
      }
    }, null, 2));
  });
  if (missingNo.length) {
    console.log('Missing pokemonNo samples:');
    missingNo.slice(0, args.sample).forEach(item => console.log(JSON.stringify(item)));
  }

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
