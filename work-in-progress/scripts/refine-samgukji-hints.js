#!/usr/bin/env node

const admin = require('firebase-admin');

const QUIZ_ID = 'samgukji';
const DEFAULT_SAMPLE = 20;

function parseArgs(argv) {
  const args = {
    commit: false,
    sample: DEFAULT_SAMPLE
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--commit') {
      args.commit = true;
    } else if (arg === '--dry-run') {
      args.commit = false;
    } else if (arg === '--sample') {
      args.sample = Number(argv[index + 1]) || args.sample;
      index += 1;
    }
  }
  return args;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function compactText(value) {
  return normalizeText(value).replace(/\s+/g, '').toLowerCase();
}

function getQuestionPrompt(data) {
  return normalizeText(data.prompt || data.question || data.title);
}

function getAnswerText(data) {
  const answer = normalizeText(data.answer || data.answerText || data.rawAnswer);
  if (answer) return answer;
  const choices = Array.isArray(data.choices) ? data.choices.map(normalizeText) : [];
  const answerIndex = Number(data.answerIndex);
  if (Number.isInteger(answerIndex) && answerIndex >= 0 && answerIndex < choices.length) {
    return choices[answerIndex];
  }
  return '';
}

function getChoices(data) {
  return Array.isArray(data.choices) ? data.choices.map(normalizeText).filter(Boolean) : [];
}

function buildSafeHint(data) {
  const prompt = getQuestionPrompt(data);
  const promptText = compactText(prompt);
  const choices = getChoices(data);

  if (/전투|싸움|전쟁|대전|북벌|원정/.test(prompt)) {
    return '전투가 일어난 배경과 결과의 흐름을 떠올려 보세요.';
  }
  if (/계책|전략|책략|작전|방법/.test(prompt)) {
    return '상대의 판단을 흔든 방법이나 상황을 생각해 보세요.';
  }
  if (/이유|까닭|왜|목적/.test(prompt)) {
    return '사건 앞뒤의 원인과 결과를 연결해 보세요.';
  }
  if (/장소|지역|어디|수도|성|땅|강/.test(prompt)) {
    return '세력의 이동 방향과 지리적 위치를 함께 생각해 보세요.';
  }
  if (/누구|누가|인물|장수|군주|왕|책사/.test(prompt)) {
    return '보기 인물들의 소속과 역할을 비교해 보세요.';
  }
  if (/관계|사이|동맹|대립|부하|신하/.test(prompt)) {
    return '인물들 사이의 관계와 세력 구도를 떠올려 보세요.';
  }
  if (choices.length >= 4 && promptText.includes('아닌')) {
    return '각 보기의 소속과 사건 흐름을 차분히 비교해 보세요.';
  }
  return '문제의 단서와 보기의 관계를 차분히 비교해 보세요.';
}

function hintLeaksAnswerOrChoice(hint, data) {
  const hintText = compactText(hint);
  const unsafeTerms = [
    getAnswerText(data),
    ...getChoices(data)
  ]
    .map(compactText)
    .filter(term => term.length >= 2);
  return unsafeTerms.some(term => hintText.includes(term));
}

function refineQuestion(doc) {
  const data = doc.data() || {};
  let hint = buildSafeHint(data);
  if (hintLeaksAnswerOrChoice(hint, data)) {
    hint = '문제의 단서와 보기의 관계를 차분히 비교해 보세요.';
  }
  return {
    docId: doc.id,
    order: Number(data.order || 0),
    prompt: getQuestionPrompt(data),
    answer: getAnswerText(data),
    choices: getChoices(data),
    oldHint: normalizeText(data.hint),
    oldExplanation: normalizeText(data.explanation),
    nextHint: hint,
    changed: normalizeText(data.hint) !== hint || normalizeText(data.explanation) !== hint
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!admin.apps.length) admin.initializeApp();
  const db = admin.firestore();
  const snapshot = await db.collection('quizQuestions').doc(QUIZ_ID).collection('questions').orderBy('order').get();
  const rows = snapshot.docs.map(refineQuestion);
  const changedRows = rows.filter(row => row.changed);

  console.log(JSON.stringify({
    quizId: QUIZ_ID,
    dryRun: !args.commit,
    total: rows.length,
    changed: changedRows.length,
    sample: changedRows.slice(0, Math.max(0, args.sample)).map(row => ({
      docId: row.docId,
      order: row.order,
      prompt: row.prompt,
      answer: row.answer,
      oldHint: row.oldHint,
      oldExplanation: row.oldExplanation,
      nextHint: row.nextHint
    }))
  }, null, 2));

  if (!args.commit || !changedRows.length) return;

  const now = admin.firestore.FieldValue.serverTimestamp();
  let batch = db.batch();
  let pending = 0;
  let committed = 0;
  for (const row of changedRows) {
    const ref = db.collection('quizQuestions').doc(QUIZ_ID).collection('questions').doc(row.docId);
    batch.set(ref, {
      hint: row.nextHint,
      explanation: row.nextHint,
      hintRefinedAt: now,
      hintRefinedSource: 'refine_samgukji_hints_script_v1'
    }, { merge: true });
    pending += 1;
    if (pending >= 450) {
      await batch.commit();
      committed += pending;
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending > 0) {
    await batch.commit();
    committed += pending;
  }
  console.log(`Committed ${committed} refined hint updates.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
