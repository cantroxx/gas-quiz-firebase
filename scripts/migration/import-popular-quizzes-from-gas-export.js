#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DEFAULT_INPUT = './exports/quiz-popular-export.json';
const QUIZZES_COLLECTION = 'quizzes';
const QUIZ_QUESTIONS_ROOT = 'quizQuestions';
const MIGRATION_SOURCE = 'gas_popular_quiz_export';

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
  const questions = Array.isArray(rawQuiz.questions) ? rawQuiz.questions : [];
  const category = normalizeString(rawQuiz.category);
  const uiType = category === '티니핑'
    ? 'imageInput'
    : normalizeString(rawQuiz.uiType || 'input');
  return {
    quizId: normalizeString(rawQuiz.quizId || rawQuiz.id),
    title: normalizeString(rawQuiz.title),
    subject: normalizeString(rawQuiz.subject),
    category,
    type: normalizeString(rawQuiz.type || 'sheet'),
    uiType,
    completionType: normalizeString(rawQuiz.completionType || 'loop'),
    badgeGroup: normalizeString(rawQuiz.badgeGroup),
    subjectGroup: normalizeString(rawQuiz.subjectGroup),
    sheetName: normalizeString(rawQuiz.sheetName),
    generation: normalizeNumber(rawQuiz.generation),
    difficulty: normalizeString(rawQuiz.difficulty),
    questionCount: normalizeNumber(rawQuiz.questionCount || questions.length),
    active: rawQuiz.active !== false,
    order: normalizeNumber(rawQuiz.order),
    description: normalizeString(rawQuiz.description),
    migrationSource: MIGRATION_SOURCE
  };
}

function normalizeQuestion(quiz, rawQuestion, index) {
  const questionId = normalizeString(rawQuestion.questionId || rawQuestion.id) || `${quiz.quizId}-${index + 1}`;
  const rawPrompt = normalizeString(rawQuestion.prompt || rawQuestion.question);
  const promptLooksLikeImageUrl = /^https?:\/\//i.test(rawPrompt);
  const base = {
    quizId: quiz.quizId,
    questionId,
    order: normalizeNumber(rawQuestion.order || index + 1),
    sourceSheet: normalizeString(rawQuestion.sourceSheet || quiz.sheetName),
    sourceRowNumber: normalizeNumber(rawQuestion.sourceRowNumber),
    questionType: normalizeString(rawQuestion.questionType || rawQuestion.kind || quiz.uiType),
    title: normalizeString(rawQuestion.title || `${quiz.title} 퀴즈`),
    subject: normalizeString(rawQuestion.subject || quiz.subject),
    category: normalizeString(rawQuestion.category || quiz.category),
    prompt: rawPrompt,
    answer: normalizeString(rawQuestion.answer),
    hint: normalizeString(rawQuestion.hint),
    explanation: normalizeString(rawQuestion.explanation || rawQuestion.hint),
    aliases: uniqueStrings(rawQuestion.aliases),
    migrationSource: MIGRATION_SOURCE
  };

  if (quiz.category === '포켓몬' || quiz.category === '티니핑' || quiz.uiType === 'imageInput') {
    const pokemonNo = normalizeNumber(rawQuestion.no || rawQuestion.pokemonNo);
    const pokemonPracticeId = pokemonNo > 0 ? String(pokemonNo) : '';
    const isTiniping = quiz.category === '티니핑';
    const imageUrl = normalizeString(rawQuestion.imageUrl || rawQuestion.question || (promptLooksLikeImageUrl ? rawPrompt : ''));
    const answerPracticeId = isTiniping ? base.answer : '';
    return {
      ...base,
      questionType: 'imageInput',
      prompt: isTiniping ? '이미지를 보고 티니핑 이름을 입력하세요.' : (base.prompt || '이미지를 보고 정답을 입력하세요.'),
      imageUrl,
      imageFileId: normalizeString(rawQuestion.imageFileId),
      sourceImageRef: normalizeString(rawQuestion.sourceImageRef),
      pokemonNo,
      practiceQuestionId: isTiniping
        ? (answerPracticeId || normalizeString(rawQuestion.practiceQuestionId) || questionId)
        : (normalizeString(rawQuestion.practiceQuestionId) || pokemonPracticeId || questionId),
      legacyPracticeIds: uniqueStrings([
        answerPracticeId,
        ...(isTiniping ? base.aliases : []),
        pokemonPracticeId,
        questionId,
        ...(Array.isArray(rawQuestion.legacyPracticeIds) ? rawQuestion.legacyPracticeIds : [])
      ]),
      generation: normalizeNumber(rawQuestion.generation || quiz.generation),
      difficulty: normalizeString(rawQuestion.difficulty || quiz.difficulty)
    };
  }

  return {
    ...base,
    questionType: base.questionType || 'input'
  };
}

function validateQuiz(quiz) {
  if (!quiz.quizId) return 'missing-quizId';
  if (!quiz.title) return 'missing-title';
  if (quiz.type !== 'sheet') return 'invalid-type';
  if (quiz.uiType !== 'input' && quiz.uiType !== 'imageInput') return 'invalid-uiType';
  return '';
}

function validateQuestion(question) {
  if (!question.questionId) return 'missing-questionId';
  if (!question.prompt) return 'missing-prompt';
  if (!question.answer) return 'missing-answer';
  if (question.questionType === 'imageInput' && !question.imageUrl && !question.imageFileId) return 'missing-image-reference';
  return '';
}

function buildImportModel(input) {
  const invalidQuizzes = [];
  const duplicateQuestionIds = [];
  const invalidQuestions = [];
  const quizzes = [];
  const questions = [];
  const questionCountsByQuiz = {};

  extractQuizzes(input).forEach(rawQuiz => {
    const quiz = normalizeQuiz(rawQuiz);
    const invalidQuizReason = validateQuiz(quiz);
    if (invalidQuizReason) {
      invalidQuizzes.push({ reason: invalidQuizReason, quizId: quiz.quizId, rawQuiz });
      return;
    }

    const seen = new Set();
    const quizQuestions = [];
    (Array.isArray(rawQuiz.questions) ? rawQuiz.questions : []).forEach((rawQuestion, index) => {
      const question = normalizeQuestion(quiz, rawQuestion, index);
      if (seen.has(question.questionId)) {
        duplicateQuestionIds.push({ quizId: quiz.quizId, questionId: question.questionId });
        return;
      }
      seen.add(question.questionId);

      const invalidReason = validateQuestion(question);
      if (invalidReason) {
        invalidQuestions.push({ reason: invalidReason, quizId: quiz.quizId, questionId: question.questionId, rawQuestion });
        return;
      }

      quizQuestions.push(question);
      questions.push(question);
    });

    quizzes.push({ ...quiz, questionCount: quizQuestions.length });
    questionCountsByQuiz[quiz.quizId] = quizQuestions.length;
  });

  return {
    exportedAt: normalizeString(input.exportedAt),
    quizzes,
    questions,
    invalidQuizzes,
    duplicateQuestionIds,
    invalidQuestions,
    questionCountsByQuiz
  };
}

function summarize(model, sampleLimit) {
  console.log(`Dry run: ${model.quizzes.length} quiz documents prepared.`);
  console.log(`Popular questions prepared: ${model.questions.length}`);
  console.log(`Invalid quizzes: ${model.invalidQuizzes.length}`);
  console.log(`Duplicate questionIds: ${model.duplicateQuestionIds.length}`);
  console.log(`Invalid questions: ${model.invalidQuestions.length}`);

  model.quizzes.forEach(quiz => {
    console.log(JSON.stringify({
      quizPath: `${QUIZZES_COLLECTION}/${quiz.quizId}`,
      data: {
        quizId: quiz.quizId,
        title: quiz.title,
        category: quiz.category,
        uiType: quiz.uiType,
        questionCount: quiz.questionCount
      }
    }, null, 2));
  });

  model.questions.slice(0, Math.max(0, sampleLimit)).forEach(question => {
    console.log(JSON.stringify({
      questionPath: `${QUIZ_QUESTIONS_ROOT}/${question.quizId}/questions/${question.questionId}`,
      data: {
        questionId: question.questionId,
        questionType: question.questionType,
        prompt: question.prompt,
        imageUrl: question.imageUrl,
        answer: question.answer,
        aliases: question.aliases
      }
    }, null, 2));
  });

  if (model.invalidQuizzes.length) {
    console.log('Invalid quiz samples:');
    model.invalidQuizzes.slice(0, Math.max(0, sampleLimit)).forEach(item => console.log(JSON.stringify(item, null, 2)));
  }
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
  if (model.invalidQuizzes.length || model.duplicateQuestionIds.length || model.invalidQuestions.length) {
    throw new Error('Import blocked: dry-run validation found invalid popular quiz data.');
  }

  const db = initializeAdmin();
  const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
  const writes = [];

  model.quizzes.forEach(quiz => {
    writes.push({
      ref: db.collection(QUIZZES_COLLECTION).doc(quiz.quizId),
      data: {
        ...quiz,
        importedAt: serverTimestamp,
        exportedAt: toFirestoreDateValue(model.exportedAt),
        updatedAt: serverTimestamp
      }
    });
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
