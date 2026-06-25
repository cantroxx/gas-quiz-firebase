#!/usr/bin/env node

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const RETIRED_QUIZ_IDS = ['regional-specialties', 'social_concepts'];
const GENERIC_IMAGE_PROMPTS = new Set([
  '이미지를 보고 정답을 입력하세요.',
  '이미지를 보고 티니핑 이름을 입력하세요.'
]);

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

async function collectRetiredQuizTargets(db) {
  const targets = [];
  for (const quizId of RETIRED_QUIZ_IDS) {
    const [quizDoc, questionRootDoc, questionSnapshot] = await Promise.all([
      db.collection('quizzes').doc(quizId).get(),
      db.collection('quizQuestions').doc(quizId).get(),
      db.collection('quizQuestions').doc(quizId).collection('questions').get()
    ]);
    if (quizDoc.exists || questionRootDoc.exists || questionSnapshot.size) {
      targets.push({
        quizId,
        quizExists: quizDoc.exists,
        questionRootExists: questionRootDoc.exists,
        questionCount: questionSnapshot.size
      });
    }
  }
  return targets;
}

async function collectGenericImagePromptDocs(db) {
  const quizSnapshot = await db.collection('quizzes').get();
  const targets = [];
  for (const quizDoc of quizSnapshot.docs) {
    if (RETIRED_QUIZ_IDS.includes(quizDoc.id)) continue;
    const questionSnapshot = await db.collection('quizQuestions').doc(quizDoc.id).collection('questions').get();
    questionSnapshot.docs.forEach(doc => {
      const data = doc.data() || {};
      const questionType = String(data.questionType || data.type || '').trim();
      const prompt = String(data.prompt || '').trim();
      if (questionType === 'imageInput' && GENERIC_IMAGE_PROMPTS.has(prompt)) {
        targets.push({ quizId: quizDoc.id, questionId: doc.id, prompt, ref: doc.ref });
      }
    });
  }
  return targets;
}

async function main() {
  const args = parseArgs(process.argv);
  const db = initializeAdmin();
  const [retiredQuizTargets, promptTargets] = await Promise.all([
    collectRetiredQuizTargets(db),
    collectGenericImagePromptDocs(db)
  ]);

  console.log(`Retired quiz targets: ${retiredQuizTargets.length}`);
  retiredQuizTargets.forEach(target => {
    console.log(`- ${target.quizId}: quiz=${target.quizExists ? 'yes' : 'no'}, questionRoot=${target.questionRootExists ? 'yes' : 'no'}, questions=${target.questionCount}`);
  });
  console.log(`Generic image prompts: ${promptTargets.length}`);
  promptTargets.slice(0, 30).forEach(target => {
    console.log(`- quizQuestions/${target.quizId}/questions/${target.questionId}: ${target.prompt}`);
  });

  if (!args.commit) {
    console.log('No Firestore writes performed. Re-run with --commit to clean up.');
    return;
  }

  for (const target of retiredQuizTargets) {
    await db.recursiveDelete(db.collection('quizQuestions').doc(target.quizId));
    await db.collection('quizzes').doc(target.quizId).delete();
  }

  let updated = 0;
  for (let index = 0; index < promptTargets.length; index += 450) {
    const batch = db.batch();
    promptTargets.slice(index, index + 450).forEach(target => {
      batch.update(target.ref, { prompt: '' });
    });
    await batch.commit();
    updated += Math.min(450, promptTargets.length - index);
  }

  console.log(`Deleted ${retiredQuizTargets.length} retired quiz roots and cleared ${updated} generic image prompts.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
