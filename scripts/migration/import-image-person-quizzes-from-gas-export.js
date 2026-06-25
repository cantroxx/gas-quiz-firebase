#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DEFAULT_INPUT = './exports/quiz-image-person-export.json';
const QUIZZES_COLLECTION = 'quizzes';
const QUIZ_QUESTIONS_ROOT = 'quizQuestions';
const MIGRATION_SOURCE = 'gas_image_person_quiz_export';

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

function extractQuizzes(input) {
  const quizzes = Array.isArray(input.quizzes)
    ? input.quizzes
    : (input.quizzes && typeof input.quizzes === 'object' ? Object.values(input.quizzes) : []);
  return quizzes.filter(quiz => normalizeString(quiz.quizId || quiz.id));
}

function normalizeQuiz(rawQuiz) {
  const questions = Array.isArray(rawQuiz.questions) ? rawQuiz.questions : [];
  return {
    quizId: normalizeString(rawQuiz.quizId || rawQuiz.id),
    title: normalizeString(rawQuiz.title),
    subject: normalizeString(rawQuiz.subject || '인물'),
    category: normalizeString(rawQuiz.category || '인물'),
    type: normalizeString(rawQuiz.type || 'sheet'),
    uiType: normalizeString(rawQuiz.uiType || 'imageInput'),
    completionType: normalizeString(rawQuiz.completionType || 'loop'),
    badgeGroup: normalizeString(rawQuiz.badgeGroup || 'people'),
    subjectGroup: normalizeString(rawQuiz.subjectGroup || 'people'),
    titleSource: normalizeString(rawQuiz.titleSource),
    sheetName: normalizeString(rawQuiz.sheetName),
    questionCount: normalizeNumber(rawQuiz.questionCount || questions.length),
    active: rawQuiz.active !== false,
    order: normalizeNumber(rawQuiz.order),
    description: normalizeString(rawQuiz.description),
    migrationSource: MIGRATION_SOURCE
  };
}

function resolveAnswerIndex(answer, choices, explicitAnswerIndex) {
  const numericIndex = Number(explicitAnswerIndex);
  if (Number.isInteger(numericIndex) && numericIndex >= 0 && numericIndex < choices.length) return numericIndex;
  const answerText = normalizeString(answer);
  return choices.findIndex(choice => normalizeString(choice) === answerText);
}

function normalizeQuestion(quiz, rawQuestion, index) {
  const choices = Array.isArray(rawQuestion.choices)
    ? rawQuestion.choices.map(normalizeString).filter(Boolean)
    : [];
  const answer = normalizeString(rawQuestion.answer);
  const explicitAnswerIndex = rawQuestion.answerIndex;
  const answerIndex = choices.length ? resolveAnswerIndex(answer, choices, explicitAnswerIndex) : null;
  const questionId = normalizeString(rawQuestion.questionId || rawQuestion.id) || `${quiz.quizId}-${index + 1}`;
  const imageUrl = normalizeString(rawQuestion.imageUrl || rawQuestion.question);
  const imageFileId = normalizeString(rawQuestion.imageFileId);
  return {
    quizId: quiz.quizId,
    questionId,
    order: normalizeNumber(rawQuestion.order || index + 1),
    sourceSheet: normalizeString(rawQuestion.sourceSheet || quiz.sheetName),
    sourceRowNumber: normalizeNumber(rawQuestion.sourceRowNumber),
    questionType: normalizeString(rawQuestion.questionType || rawQuestion.kind || 'imageInput'),
    title: normalizeString(rawQuestion.title || `${quiz.title} 퀴즈`),
    subject: normalizeString(rawQuestion.subject || quiz.subject),
    category: normalizeString(rawQuestion.category || quiz.category),
    prompt: normalizeString(rawQuestion.prompt),
    question: imageUrl,
    imageUrl,
    imageFileId,
    sourceImageRef: normalizeString(rawQuestion.sourceImageRef),
    choices,
    answer,
    answerIndex,
    aliases: Array.isArray(rawQuestion.aliases) ? rawQuestion.aliases.map(normalizeString).filter(Boolean) : [],
    hint: normalizeString(rawQuestion.hint),
    explanation: normalizeString(rawQuestion.explanation || rawQuestion.hint),
    migrationSource: MIGRATION_SOURCE
  };
}

function validateQuiz(quiz) {
  if (!quiz.quizId) return 'missing-quizId';
  if (!quiz.title) return 'missing-title';
  if (quiz.type !== 'sheet') return 'invalid-type';
  if (quiz.uiType !== 'imageInput') return 'invalid-uiType';
  return '';
}

function validateQuestion(question) {
  if (!question.questionId) return 'missing-questionId';
  if (!question.prompt) return 'missing-prompt';
  if (!question.answer) return 'missing-answer';
  if (question.choices.length > 0 && question.choices.length < 2) return 'invalid-choice-count';
  if (question.choices.length > 0 && (question.answerIndex < 0 || question.answerIndex >= question.choices.length)) return 'answer-index-invalid';
  return '';
}

function buildImportModel(input) {
  const invalidQuizzes = [];
  const duplicateQuestionIds = [];
  const invalidQuestions = [];
  const missingImageReferences = [];
  const choiceStats = { noChoices: 0, withChoices: 0, invalidAnswerIndex: 0 };
  const quizzes = [];
  const questions = [];

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

      if (!question.imageUrl && !question.imageFileId) {
        missingImageReferences.push({ quizId: quiz.quizId, questionId: question.questionId, sourceRowNumber: question.sourceRowNumber });
      }
      if (question.choices.length) {
        choiceStats.withChoices += 1;
        if (question.answerIndex < 0 || question.answerIndex >= question.choices.length) choiceStats.invalidAnswerIndex += 1;
      } else {
        choiceStats.noChoices += 1;
      }

      const invalidReason = validateQuestion(question);
      if (invalidReason) {
        invalidQuestions.push({ reason: invalidReason, quizId: quiz.quizId, questionId: question.questionId, rawQuestion });
        return;
      }
      quizQuestions.push(question);
      questions.push(question);
    });

    quizzes.push({ ...quiz, questionCount: quizQuestions.length });
  });

  return {
    exportedAt: normalizeString(input.exportedAt),
    quizzes,
    questions,
    invalidQuizzes,
    duplicateQuestionIds,
    invalidQuestions,
    missingImageReferences,
    choiceStats
  };
}

function summarize(model, sampleLimit) {
  console.log(`Dry run: ${model.quizzes.length} quiz documents prepared.`);
  console.log(`Image/person questions prepared: ${model.questions.length}`);
  console.log(`Invalid quizzes: ${model.invalidQuizzes.length}`);
  console.log(`Duplicate questionIds: ${model.duplicateQuestionIds.length}`);
  console.log(`Invalid questions: ${model.invalidQuestions.length}`);
  console.log(`Missing image references: ${model.missingImageReferences.length}`);
  console.log(`Questions without choices: ${model.choiceStats.noChoices}`);
  console.log(`Questions with choices: ${model.choiceStats.withChoices}`);
  console.log(`Invalid answerIndex in choice questions: ${model.choiceStats.invalidAnswerIndex}`);

  model.quizzes.forEach(quiz => {
    console.log(JSON.stringify({
      quizPath: `${QUIZZES_COLLECTION}/${quiz.quizId}`,
      data: {
        quizId: quiz.quizId,
        title: quiz.title,
        type: quiz.type,
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
        imageUrl: question.imageUrl,
        imageFileId: question.imageFileId,
        answer: question.answer,
        aliases: question.aliases,
        choicesCount: question.choices.length,
        answerIndex: question.answerIndex,
        questionType: question.questionType
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
  if (model.missingImageReferences.length) {
    console.log('Missing image reference samples:');
    model.missingImageReferences.slice(0, Math.max(0, sampleLimit)).forEach(item => console.log(JSON.stringify(item, null, 2)));
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
    throw new Error('Import blocked: dry-run validation found invalid image/person quiz data.');
  }
  if (model.missingImageReferences.length) {
    throw new Error('Import blocked: image/person quiz data has missing image references.');
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
