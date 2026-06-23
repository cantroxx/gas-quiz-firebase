#!/usr/bin/env node

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const QUIZ_ID = 'snack-food';
const QUESTIONS_PATH = ['quizQuestions', QUIZ_ID, 'questions'];

const KEEP_ANSWERS = [
  '신라면', '신라면 블랙', '짜파게티', '너구리', '안성탕면', '김치라면',
  '불닭볶음면', '까르보불닭볶음면', '로제불닭볶음면',
  '꼬깔콘', '치토스', '오잉', '쌀로별', '도리토스', '빼빼로', '빈츠', '마가렛트', '말랑카우',
  '메로나', '투게더', '붕어싸만코', '비비빅', '빵또아', '더위사냥', '쿠앤크', '엔초', '바밤바',
  '월드콘', '돼지바', '빠삐코', '설레임', '찰떡아이스', '티코', '메가톤', '빵빠레', '누가바',
  '스카치', '목캔디', '짱셔요!',
  '하비스트', '야채크래커', '빠다코코낫', '제크', '롯샌', '엄마손파이', '웨하스',
  '몽쉘', '찰떡파이', '초코파이', '카스타드', '석기시대', '쮸쮸바', '주물러', '바나나킥'
];

const CHOICE_GROUPS = [
  ['신라면', '신라면 블랙', '짜파게티', '너구리', '안성탕면', '김치라면', '불닭볶음면', '까르보불닭볶음면', '로제불닭볶음면'],
  ['꼬깔콘', '치토스', '오잉', '쌀로별', '도리토스', '빼빼로', '빈츠', '마가렛트', '말랑카우'],
  ['메로나', '투게더', '붕어싸만코', '비비빅', '빵또아', '더위사냥', '쿠앤크', '엔초', '바밤바', '월드콘', '돼지바', '빠삐코', '설레임', '찰떡아이스', '티코', '메가톤', '빵빠레', '누가바'],
  ['스카치', '목캔디', '짱셔요!'],
  ['하비스트', '야채크래커', '빠다코코낫', '제크', '롯샌', '엄마손파이', '웨하스'],
  ['몽쉘', '찰떡파이', '초코파이', '카스타드', '석기시대'],
  ['쮸쮸바', '주물러', '바나나킥', '월드콘', '돼지바', '빠삐코']
];

function parseArgs(argv) {
  return {
    commit: argv.includes('--commit')
  };
}

function initializeAdmin() {
  if(!getApps().length) {
    initializeApp({ credential: applicationDefault() });
  }
  return getFirestore();
}

function getChoicePool(answer) {
  return CHOICE_GROUPS.find(group => group.includes(answer)) || KEEP_ANSWERS;
}

function buildChoices(answer, order) {
  const pool = getChoicePool(answer);
  const answerIndex = (order - 1) % 4;
  const others = pool.filter(item => item !== answer);
  const choices = [];
  let cursor = order;
  let attempts = 0;
  while(choices.length < 3 && others.length && attempts < others.length * 2) {
    const candidate = others[cursor % others.length];
    if(!choices.includes(candidate)) choices.push(candidate);
    cursor += 1;
    attempts += 1;
  }
  while(choices.length < 3) {
    const candidate = KEEP_ANSWERS[(cursor + choices.length) % KEEP_ANSWERS.length];
    if(candidate !== answer && !choices.includes(candidate)) choices.push(candidate);
    cursor += 1;
  }
  choices.splice(answerIndex, 0, answer);
  return { choices, answerIndex };
}

async function main() {
  const args = parseArgs(process.argv);
  const db = initializeAdmin();
  const collection = db.collection(QUESTIONS_PATH[0]).doc(QUESTIONS_PATH[1]).collection(QUESTIONS_PATH[2]);
  const snapshot = await collection.orderBy('order').get();
  const byAnswer = new Map(snapshot.docs.map(doc => [String(doc.data()?.answer || '').trim(), doc]));
  const keepSet = new Set(KEEP_ANSWERS);
  const missing = KEEP_ANSWERS.filter(answer => !byAnswer.has(answer));
  const deleteDocs = snapshot.docs.filter(doc => !keepSet.has(String(doc.data()?.answer || '').trim()));
  const updateRows = KEEP_ANSWERS.map((answer, index) => {
    const doc = byAnswer.get(answer);
    const order = index + 1;
    const { choices, answerIndex } = buildChoices(answer, order);
    return {
      id: doc?.id || '',
      answer,
      previousOrder: Number(doc?.data()?.order) || 0,
      nextOrder: order,
      choices,
      answerIndex
    };
  });

  const summary = {
    quizId: QUIZ_ID,
    commit: args.commit,
    currentCount: snapshot.size,
    keepCount: KEEP_ANSWERS.length,
    deleteCount: deleteDocs.length,
    missing,
    deleteAnswers: deleteDocs.map(doc => String(doc.data()?.answer || doc.id).trim()),
    updateSample: updateRows.slice(0, 12)
  };

  if(missing.length) {
    console.log(JSON.stringify(summary, null, 2));
    throw new Error(`Missing kept answers: ${missing.join(', ')}`);
  }

  if(args.commit) {
    const batch = db.batch();
    updateRows.forEach(row => {
      const doc = byAnswer.get(row.answer);
      batch.set(doc.ref, {
        order: row.nextOrder,
        choices: row.choices,
        answerIndex: row.answerIndex,
        updatedAt: FieldValue.serverTimestamp(),
        curationStatus: 'kept-quality-snack',
        curationReason: 'manual-mask-quality-pass'
      }, { merge: true });
    });
    deleteDocs.forEach(doc => batch.delete(doc.ref));
    batch.set(db.collection('quizzes').doc(QUIZ_ID), {
      questionCount: KEEP_ANSWERS.length,
      sourceQuestionCount: KEEP_ANSWERS.length,
      curationStatus: 'quality-curated',
      curationRemovedQuestionCount: deleteDocs.length,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    await batch.commit();
  }

  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
