#!/usr/bin/env node

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const REMOVED_QUIZ_IDS = ['science-earth-change', 'science-water-state'];
const REMOVED_TITLE_PREFIXES = ['science_earth_change_', 'science_water_state_'];

function parseArgs(argv) {
  const args = { commit: false };
  argv.slice(2).forEach(arg => {
    if (arg === '--commit') args.commit = true;
    else if (arg === '--dry-run') args.commit = false;
    else throw new Error(`Unknown argument: ${arg}`);
  });
  return args;
}

function initializeAdmin() {
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault() });
  }
  return getFirestore();
}

async function collectTitleDocs(db) {
  const snapshot = await db.collection('titleCatalog').get();
  return snapshot.docs.filter(doc => REMOVED_TITLE_PREFIXES.some(prefix => doc.id.startsWith(prefix)));
}

async function collectQuizTargets(db) {
  const targets = [];
  for (const quizId of REMOVED_QUIZ_IDS) {
    const [quizDoc, questionRootDoc] = await Promise.all([
      db.collection('quizzes').doc(quizId).get(),
      db.collection('quizQuestions').doc(quizId).get()
    ]);
    if (quizDoc.exists || questionRootDoc.exists) {
      targets.push({ quizId, quizExists: quizDoc.exists, questionRootExists: questionRootDoc.exists });
    }
  }
  return targets;
}

async function main() {
  const args = parseArgs(process.argv);
  const db = initializeAdmin();
  const [quizTargets, titleDocs] = await Promise.all([
    collectQuizTargets(db),
    collectTitleDocs(db)
  ]);
  console.log(`Removed quiz docs: ${quizTargets.length}`);
  console.log(`Removed title docs: ${titleDocs.length}`);
  quizTargets.forEach(target => {
    if (target.quizExists) console.log(`- quizzes/${target.quizId}`);
    if (target.questionRootExists) console.log(`- quizQuestions/${target.quizId}`);
  });
  titleDocs.forEach(doc => console.log(`- titleCatalog/${doc.id}`));

  if (!args.commit) {
    console.log('No Firestore deletes performed. Re-run with --commit to delete.');
    return;
  }

  for (const target of quizTargets) {
    await db.recursiveDelete(db.collection('quizQuestions').doc(target.quizId));
    await db.collection('quizzes').doc(target.quizId).delete();
  }
  const batch = db.batch();
  titleDocs.forEach(doc => batch.delete(doc.ref));
  if (titleDocs.length) await batch.commit();
  console.log(`Deleted ${quizTargets.length} quiz docs, their question subcollections, and ${titleDocs.length} title docs.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
