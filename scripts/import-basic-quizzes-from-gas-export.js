#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DEFAULT_INPUT = './quiz-basic-export.json';
const QUIZZES_COLLECTION = 'quizzes';
const QUIZ_QUESTIONS_ROOT = 'quizQuestions';
const MIGRATION_SOURCE = 'gas_basic_quiz_export';

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

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];
  (values || []).forEach(value => {
    const text = normalizeString(value);
    if (!text || seen.has(text)) return;
    seen.add(text);
    result.push(text);
  });
  return result;
}

function slug(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[：]/g, ':')
    .replace(/지앰오/g, '지엠오')
    .replace(/[^0-9a-z가-힣:_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function toFirestoreDateValue(value) {
  const raw = normalizeString(value);
  if (!raw) return null;
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return raw;
  return admin.firestore.Timestamp.fromDate(date);
}

function extractQuizzes(input) {
  if (Array.isArray(input.quizzes)) return input.quizzes;
  if (input.quizzes && typeof input.quizzes === 'object') return Object.values(input.quizzes);
  throw new Error('Input must include quizzes as an array or object.');
}

function normalizeQuiz(rawQuiz) {
  const quizId = normalizeString(rawQuiz.quizId || rawQuiz.id);
  if (!quizId) return { skipped: true, reason: 'missing-quizId', rawQuiz };

  const questions = Array.isArray(rawQuiz.questions) ? rawQuiz.questions : [];
  const quiz = {
    quizId,
    title: normalizeString(rawQuiz.title),
    subject: normalizeString(rawQuiz.subject),
    type: normalizeString(rawQuiz.type || 'sheet'),
    uiType: normalizeString(rawQuiz.uiType),
    completionType: normalizeString(rawQuiz.completionType || 'loop'),
    badgeGroup: normalizeString(rawQuiz.badgeGroup),
    subjectGroup: normalizeString(rawQuiz.subjectGroup),
    sheetName: normalizeString(rawQuiz.sheetName),
    generatorType: normalizeString(rawQuiz.generatorType),
    questionCount: normalizeNumber(rawQuiz.questionCount || questions.length),
    active: rawQuiz.active !== false,
    order: normalizeNumber(rawQuiz.order),
    description: normalizeString(rawQuiz.description),
    migrationSource: MIGRATION_SOURCE
  };

  return { quiz, questions };
}

function normalizeQuestion(quizId, rawQuestion, index) {
  const questionId = normalizeString(rawQuestion.questionId || rawQuestion.id) || `${quizId}-${index + 1}`;
  const base = {
    quizId,
    questionId,
    order: normalizeNumber(rawQuestion.order || index + 1),
    sourceSheet: normalizeString(rawQuestion.sourceSheet),
    sourceRowNumber: normalizeNumber(rawQuestion.sourceRowNumber),
    questionType: normalizeString(rawQuestion.questionType || rawQuestion.kind),
    prompt: normalizeString(rawQuestion.prompt || rawQuestion.question),
    answer: normalizeString(rawQuestion.answer),
    hint: normalizeString(rawQuestion.hint),
    explanation: normalizeString(rawQuestion.explanation),
    aliases: uniqueStrings(rawQuestion.aliases),
    migrationSource: MIGRATION_SOURCE
  };

  if (quizId === 'spelling') {
    return {
      ...base,
      questionType: base.questionType || 'input',
      prompt: base.prompt,
      answer: base.answer,
      hint: base.hint || base.explanation,
      explanation: base.explanation || base.hint
    };
  }

  if (quizId === 'word-relation') {
    const word = normalizeString(rawQuestion.word);
    const sentence1 = normalizeString(rawQuestion.sentence1);
    const sentence2 = normalizeString(rawQuestion.sentence2);
    const meaning1 = normalizeString(rawQuestion.meaning1);
    const meaning2 = normalizeString(rawQuestion.meaning2);
    return {
      ...base,
      questionType: base.questionType || 'wordRelation',
      word,
      sentence1,
      sentence2,
      meaning1,
      meaning2,
      relationType: normalizeString(rawQuestion.relationType || rawQuestion.type),
      prompt: base.prompt || `${sentence1}\n${sentence2}`,
      hint: base.hint || ['뜻 1: ' + meaning1, '뜻 2: ' + meaning2].join('\n')
    };
  }

  return base;
}

function validateQuestion(question) {
  if (!question.questionId) return 'missing-questionId';
  if (!question.prompt) return 'missing-prompt';
  if (!question.answer) return 'missing-answer';
  if (question.quizId === 'word-relation') {
    if (!question.word || !question.sentence1 || !question.sentence2) return 'missing-word-relation-fields';
  }
  return '';
}

function buildImportModel(input) {
  const skipped = [];
  const duplicateQuestionIds = [];
  const emptyFieldQuestions = [];
  const quizzes = [];
  const questions = [];
  const seenQuestionIdsByQuiz = new Map();

  extractQuizzes(input).forEach(rawQuiz => {
    const normalized = normalizeQuiz(rawQuiz);
    if (normalized.skipped) {
      skipped.push(normalized);
      return;
    }

    const { quiz, questions: rawQuestions } = normalized;
    quizzes.push(quiz);

    if (quiz.quizId === 'random-basic') return;

    if (!seenQuestionIdsByQuiz.has(quiz.quizId)) seenQuestionIdsByQuiz.set(quiz.quizId, new Set());
    const seen = seenQuestionIdsByQuiz.get(quiz.quizId);

    rawQuestions.forEach((rawQuestion, index) => {
      const question = normalizeQuestion(quiz.quizId, rawQuestion, index);
      if (seen.has(question.questionId)) {
        duplicateQuestionIds.push({ quizId: quiz.quizId, questionId: question.questionId });
        return;
      }
      seen.add(question.questionId);

      const invalidReason = validateQuestion(question);
      if (invalidReason) {
        emptyFieldQuestions.push({ reason: invalidReason, quizId: quiz.quizId, questionId: question.questionId, rawQuestion });
        return;
      }
      questions.push(question);
    });
  });

  const questionCountsByQuiz = {};
  questions.forEach(question => {
    questionCountsByQuiz[question.quizId] = (questionCountsByQuiz[question.quizId] || 0) + 1;
  });
  quizzes.forEach(quiz => {
    if (quiz.quizId !== 'random-basic') quiz.questionCount = questionCountsByQuiz[quiz.quizId] || 0;
  });

  return {
    exportedAt: normalizeString(input.exportedAt),
    quizzes,
    questions,
    skipped,
    duplicateQuestionIds,
    emptyFieldQuestions,
    questionCountsByQuiz,
    randomBasicMetaCreated: quizzes.some(quiz => quiz.quizId === 'random-basic' && quiz.generatorType === 'math-muldiv')
  };
}

function summarize(model, sampleLimit) {
  console.log(`Dry run: ${model.quizzes.length} quiz documents prepared.`);
  console.log(`Questions prepared: ${model.questions.length}`);
  console.log(`spelling questions: ${model.questionCountsByQuiz.spelling || 0}`);
  console.log(`word-relation questions: ${model.questionCountsByQuiz['word-relation'] || 0}`);
  console.log(`random-basic meta: ${model.randomBasicMetaCreated ? 'yes' : 'no'}`);
  console.log(`Duplicate questionIds: ${model.duplicateQuestionIds.length}`);
  console.log(`Empty/invalid questions: ${model.emptyFieldQuestions.length}`);
  console.log(`Skipped quizzes: ${model.skipped.length}`);

  model.quizzes.forEach(quiz => {
    console.log(JSON.stringify({
      quizPath: `${QUIZZES_COLLECTION}/${quiz.quizId}`,
      data: {
        quizId: quiz.quizId,
        title: quiz.title,
        type: quiz.type,
        uiType: quiz.uiType,
        generatorType: quiz.generatorType,
        questionCount: quiz.questionCount
      }
    }, null, 2));
  });

  model.questions.slice(0, Math.max(0, sampleLimit)).forEach(question => {
    console.log(JSON.stringify({
      questionPath: `${QUIZ_QUESTIONS_ROOT}/${question.quizId}/questions/${question.questionId}`,
      data: {
        quizId: question.quizId,
        questionId: question.questionId,
        prompt: question.prompt,
        answer: question.answer,
        questionType: question.questionType
      }
    }, null, 2));
  });

  if (model.duplicateQuestionIds.length) {
    console.log('Duplicate questionId samples:');
    model.duplicateQuestionIds.slice(0, Math.max(0, sampleLimit)).forEach(item => console.log(JSON.stringify(item, null, 2)));
  }

  if (model.emptyFieldQuestions.length) {
    console.log('Empty/invalid question samples:');
    model.emptyFieldQuestions.slice(0, Math.max(0, sampleLimit)).forEach(item => console.log(JSON.stringify(item, null, 2)));
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
  if (model.duplicateQuestionIds.length || model.emptyFieldQuestions.length || model.skipped.length) {
    throw new Error('Import blocked: dry-run validation found duplicate, empty/invalid, or skipped quiz data.');
  }

  const db = initializeAdmin();
  const writes = [];
  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

  model.quizzes.forEach(quiz => {
    const data = {
      ...quiz,
      importedAt: serverTimestamp,
      exportedAt: toFirestoreDateValue(model.exportedAt),
      updatedAt: serverTimestamp
    };
    writes.push({ ref: db.collection(QUIZZES_COLLECTION).doc(quiz.quizId), data });
  });

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
