#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DEFAULT_EXPORT_INPUT = './exports/quiz-popular-export.json';

function parseArgs(argv) {
  const args = {
    input: DEFAULT_EXPORT_INPUT,
    firestore: false,
    sample: 30
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input') {
      args.input = argv[index + 1] || args.input;
      index += 1;
    } else if (arg === '--firestore') {
      args.firestore = true;
    } else if (arg === '--sample') {
      args.sample = Number(argv[index + 1]) || args.sample;
      index += 1;
    }
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8'));
}

function normalizeText(value) {
  return String(value || '').trim();
}

function extractTinipingRows(input) {
  const quizzes = Array.isArray(input.quizzes) ? input.quizzes : Object.values(input.quizzes || {});
  const quiz = quizzes.find(item => normalizeText(item.quizId || item.id) === 'tiniping');
  const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];
  return questions.map((question, index) => {
    const prompt = normalizeText(question.prompt || question.question);
    return {
      source: 'export',
      order: Number(question.order || index + 1),
      questionId: normalizeText(question.questionId || question.id) || `tiniping-${index + 1}`,
      imageUrl: normalizeText(question.imageUrl || prompt),
      answer: normalizeText(question.answer),
      aliases: Array.isArray(question.aliases) ? question.aliases.map(normalizeText).filter(Boolean) : []
    };
  });
}

function printRows(title, rows, sample) {
  console.log(`\n${title}: ${rows.length}`);
  rows.slice(0, sample).forEach(row => {
    console.log(JSON.stringify(row));
  });
}

function printHachupingRows(title, rows) {
  const matches = rows.filter(row => row.answer.includes('하츄핑') || row.answer.includes('프린세스'));
  printRows(title, matches, matches.length);
}

async function loadFirestoreRows() {
  if (!admin.apps.length) admin.initializeApp();
  const db = admin.firestore();
  const snapshot = await db.collection('quizQuestions').doc('tiniping').collection('questions').orderBy('order').get();
  return snapshot.docs.map(doc => {
    const data = doc.data() || {};
    const prompt = normalizeText(data.prompt || data.question);
    return {
      source: 'firestore',
      order: Number(data.order || 0),
      questionId: doc.id,
      questionType: normalizeText(data.questionType),
      imageUrl: normalizeText(data.imageUrl || prompt),
      answer: normalizeText(data.answer),
      aliases: Array.isArray(data.aliases) ? data.aliases.map(normalizeText).filter(Boolean) : []
    };
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const localRows = extractTinipingRows(readJson(args.input));
  printRows('Tiniping export sample', localRows, args.sample);
  printHachupingRows('Tiniping export Hachuping rows', localRows);

  if (!args.firestore) return;
  const firestoreRows = await loadFirestoreRows();
  printRows('Tiniping Firestore sample', firestoreRows, args.sample);
  printHachupingRows('Tiniping Firestore Hachuping rows', firestoreRows);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
