#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DEFAULT_INPUT = './quiz-gmo-export.json';
const QUIZZES_COLLECTION = 'quizzes';
const QUIZ_QUESTIONS_ROOT = 'quizQuestions';
const MIGRATION_SOURCE = 'gas_gmo_quiz_export';

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    dryRun: true,
    commit: false,
    sample: 5
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--commit') {
      args.commit = true;
      args.dryRun = false;
    } else if (arg === '--dry-run') {
      args.dryRun = true;
      args.commit = false;
    } else if (arg === '--input') {
      args.input = argv[i + 1] || DEFAULT_INPUT;
      i += 1;
    } else if (arg === '--sample') {
      args.sample = Number(argv[i + 1]) || args.sample;
      i += 1;
    }
  }

  return args;
}

function readJson(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toFirestoreDateValue(value) {
  const raw = normalizeString(value);
  if (!raw) return null;
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return raw;
  return admin.firestore.Timestamp.fromDate(date);
}

function extractGmoQuiz(input) {
  const quizzes = Array.isArray(input.quizzes)
    ? input.quizzes
    : (input.quizzes && typeof input.quizzes === 'object' ? Object.values(input.quizzes) : []);
  const quiz = quizzes.find(item => normalizeString(item.quizId || item.id) === 'gmo');
  if (!quiz) throw new Error('Input must include quizzes[] item with quizId "gmo".');
  return quiz;
}

function normalizeQuiz(rawQuiz) {
  const questions = Array.isArray(rawQuiz.questions) ? rawQuiz.questions : [];
  return {
    quizId: 'gmo',
    title: normalizeString(rawQuiz.title || '지엠오 아이'),
    subject: normalizeString(rawQuiz.subject || '국어'),
    category: normalizeString(rawQuiz.category || '독서'),
    type: normalizeString(rawQuiz.type || 'sheet'),
    uiType: normalizeString(rawQuiz.uiType || 'multipleChoice4'),
    completionType: normalizeString(rawQuiz.completionType || 'complete'),
    badgeGroup: normalizeString(rawQuiz.badgeGroup || 'korean'),
    subjectGroup: normalizeString(rawQuiz.subjectGroup || 'korean'),
    titleSource: normalizeString(rawQuiz.titleSource || 'korean_gmo'),
    sheetName: normalizeString(rawQuiz.sheetName || '지앰오아이문제'),
    questionCount: normalizeNumber(rawQuiz.questionCount || questions.length),
    active: rawQuiz.active !== false,
    order: normalizeNumber(rawQuiz.order || 4),
    description: normalizeString(rawQuiz.description),
    migrationSource: MIGRATION_SOURCE
  };
}

function resolveAnswerIndex(answer, choices) {
  const answerText = normalizeString(answer);
  const index = choices.findIndex(choice => normalizeString(choice) === answerText);
  return index >= 0 ? index : -1;
}

function normalizeQuestion(rawQuestion, index) {
  const choices = Array.isArray(rawQuestion.choices)
    ? rawQuestion.choices.map(normalizeString)
    : [];
  const answer = normalizeString(rawQuestion.answer);
  const questionId = normalizeString(rawQuestion.questionId || rawQuestion.id) || `reading-gmo-${index + 1}`;
  return {
    quizId: 'gmo',
    questionId,
    order: normalizeNumber(rawQuestion.order || index + 1),
    sourceSheet: normalizeString(rawQuestion.sourceSheet || '지앰오아이문제'),
    sourceRowNumber: normalizeNumber(rawQuestion.sourceRowNumber),
    questionType: normalizeString(rawQuestion.questionType || rawQuestion.kind || 'readingMultipleChoice'),
    title: normalizeString(rawQuestion.title || '지엠오 아이 독서퀴즈'),
    bookTitle: normalizeString(rawQuestion.bookTitle || '지엠오 아이'),
    category: normalizeString(rawQuestion.category || '독서'),
    difficulty: normalizeString(rawQuestion.difficulty),
    prompt: normalizeString(rawQuestion.prompt || rawQuestion.question),
    question: normalizeString(rawQuestion.question || rawQuestion.prompt),
    choices,
    answer,
    answerIndex: resolveAnswerIndex(answer, choices),
    rawAnswer: normalizeString(rawQuestion.rawAnswer),
    hint: normalizeString(rawQuestion.hint || rawQuestion.explanation),
    explanation: normalizeString(rawQuestion.explanation || rawQuestion.hint),
    migrationSource: MIGRATION_SOURCE
  };
}

function validateQuestion(question) {
  if (!question.questionId) return 'missing-questionId';
  if (!question.prompt) return 'missing-prompt';
  if (!Array.isArray(question.choices) || question.choices.length !== 4 || question.choices.some(choice => !choice)) return 'invalid-choices';
  if (!question.answer) return 'missing-answer';
  if (question.answerIndex < 0) return 'answer-not-in-choices';
  if (!question.explanation) return 'missing-explanation';
  return '';
}

function buildImportModel(input) {
  const rawQuiz = extractGmoQuiz(input);
  const quiz = normalizeQuiz(rawQuiz);
  const duplicateQuestionIds = [];
  const invalidQuestions = [];
  const questions = [];
  const seen = new Set();

  (Array.isArray(rawQuiz.questions) ? rawQuiz.questions : []).forEach((rawQuestion, index) => {
    const question = normalizeQuestion(rawQuestion, index);
    if (seen.has(question.questionId)) {
      duplicateQuestionIds.push({ questionId: question.questionId });
      return;
    }
    seen.add(question.questionId);

    const invalidReason = validateQuestion(question);
    if (invalidReason) {
      invalidQuestions.push({ reason: invalidReason, questionId: question.questionId, rawQuestion });
      return;
    }
    questions.push(question);
  });

  quiz.questionCount = questions.length;

  return {
    exportedAt: normalizeString(input.exportedAt),
    quiz,
    questions,
    duplicateQuestionIds,
    invalidQuestions
  };
}

function summarize(model, sampleLimit) {
  console.log('Dry run: 1 quiz document prepared.');
  console.log(`GMO questions prepared: ${model.questions.length}`);
  console.log(`Duplicate questionIds: ${model.duplicateQuestionIds.length}`);
  console.log(`Invalid questions: ${model.invalidQuestions.length}`);
  console.log(JSON.stringify({
    quizPath: `${QUIZZES_COLLECTION}/${model.quiz.quizId}`,
    data: {
      quizId: model.quiz.quizId,
      title: model.quiz.title,
      type: model.quiz.type,
      uiType: model.quiz.uiType,
      completionType: model.quiz.completionType,
      questionCount: model.quiz.questionCount
    }
  }, null, 2));

  model.questions.slice(0, Math.max(0, sampleLimit)).forEach(question => {
    console.log(JSON.stringify({
      questionPath: `${QUIZ_QUESTIONS_ROOT}/${question.quizId}/questions/${question.questionId}`,
      data: {
        questionId: question.questionId,
        prompt: question.prompt,
        answer: question.answer,
        answerIndex: question.answerIndex,
        questionType: question.questionType
      }
    }, null, 2));
  });

  if (model.invalidQuestions.length) {
    console.log('Invalid question samples:');
    model.invalidQuestions.slice(0, Math.max(0, sampleLimit)).forEach(item => console.log(JSON.stringify(item, null, 2)));
  }
}

function initializeAdmin() {
  if (admin.apps.length) return admin.firestore();
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
  return admin.firestore();
}

async function commitModel(model) {
  if (model.duplicateQuestionIds.length || model.invalidQuestions.length) {
    throw new Error('Import blocked: dry-run validation found duplicate or invalid GMO questions.');
  }

  const db = initializeAdmin();
  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
  const writes = [{
    ref: db.collection(QUIZZES_COLLECTION).doc(model.quiz.quizId),
    data: {
      ...model.quiz,
      importedAt: serverTimestamp,
      exportedAt: toFirestoreDateValue(model.exportedAt),
      updatedAt: serverTimestamp
    }
  }];

  model.questions.forEach(question => {
    writes.push({
      ref: db.collection(QUIZ_QUESTIONS_ROOT).doc(question.quizId).collection('questions').doc(question.questionId),
      data: { ...question, importedAt: serverTimestamp, updatedAt: serverTimestamp }
    });
  });

  let committed = 0;
  for (let i = 0; i < writes.length; i += 450) {
    const batch = db.batch();
    writes.slice(i, i + 450).forEach(write => batch.set(write.ref, write.data, { merge: true }));
    await batch.commit();
    committed += Math.min(450, writes.length - i);
  }

  console.log(`Committed ${committed} Firestore writes.`);
}

async function main() {
  const args = parseArgs(process.argv);
  const input = readJson(args.input);
  const model = buildImportModel(input);
  summarize(model, args.sample);

  if (!args.commit) {
    console.log('No Firestore writes performed. Re-run with --commit to import.');
    return;
  }

  await commitModel(model);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
