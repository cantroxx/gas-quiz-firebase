#!/usr/bin/env node

const admin = require('firebase-admin');

const COLLECTION = 'profileImageCandidates';
const QUIZ_QUESTIONS_ROOT = 'quizQuestions';
const IMAGE_QUIZ_IDS = [
  'history-people',
  'idol',
  'anime',
  'pokemon-gen1',
  'pokemon-gen2',
  'pokemon-gen3',
  'pokemon-gen4',
  'pokemon-gen5',
  'pokemon-gen6',
  'pokemon-gen7',
  'pokemon-gen8',
  'pokemon-gen9'
];

function parseArgs(argv) {
  const args = {
    dryRun: true,
    commit: false,
    sample: 5,
    quizIds: IMAGE_QUIZ_IDS
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--commit') {
      args.commit = true;
      args.dryRun = false;
    } else if (arg === '--dry-run') {
      args.commit = false;
      args.dryRun = true;
    } else if (arg === '--sample') {
      args.sample = Number(argv[i + 1]) || args.sample;
      i += 1;
    } else if (arg === '--quiz-id') {
      args.quizIds = [argv[i + 1]].filter(Boolean);
      i += 1;
    }
  }
  return args;
}

function initializeAdmin() {
  if (admin.apps.length) return admin.firestore();
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  return admin.firestore();
}

function normalizeText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeSearchText(value) {
  return normalizeText(value).toLowerCase();
}

function slug(value) {
  return normalizeSearchText(value)
    .replace(/[()]/g, '')
    .replace(/[^0-9a-z가-힣_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildSearchPrefixes(value) {
  const text = normalizeSearchText(value).replace(/\s+/g, '');
  const prefixes = new Set();
  if (!text) return [];
  prefixes.add(text);
  for (let i = 1; i <= Math.min(text.length, 12); i += 1) {
    prefixes.add(text.slice(0, i));
  }
  return Array.from(prefixes);
}

function buildKeywords(question) {
  const values = [
    question.answer,
    question.answerText,
    question.name,
    question.title,
    ...(Array.isArray(question.aliases) ? question.aliases : [])
  ];
  const keywords = new Set();
  values.forEach(value => {
    const text = normalizeSearchText(value);
    if (!text) return;
    keywords.add(text);
    text.split(/[\s,;/·]+/).filter(Boolean).forEach(part => keywords.add(part));
    buildSearchPrefixes(text).forEach(prefix => keywords.add(prefix));
  });
  return Array.from(keywords).slice(0, 80);
}

function normalizeDisplayImageUrl(value) {
  const raw = normalizeText(value);
  if (!raw) return '';
  const fileMatch = raw.match(/\/file\/d\/([^/]+)/);
  if (fileMatch && fileMatch[1]) return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
  const idMatch = raw.match(/[?&]id=([^&]+)/);
  if (raw.includes('drive.google.com') && idMatch && idMatch[1]) return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
  if (/^[A-Za-z0-9_-]{20,}$/.test(raw)) return `https://drive.google.com/uc?export=view&id=${raw}`;
  return raw;
}

function getCandidateName(question) {
  return normalizeText(question.answer || question.answerText || question.name || question.title);
}

function normalizeCandidate(quizId, questionDoc) {
  const question = questionDoc.data() || {};
  const imageUrl = normalizeText(question.imageUrl || question.question);
  const imageFileId = normalizeText(question.imageFileId);
  const name = getCandidateName(question);
  if (!name || (!imageUrl && !imageFileId)) return null;
  const sourceQuestionId = normalizeText(question.questionId || questionDoc.id);
  const candidateId = `${slug(quizId)}_${slug(sourceQuestionId || name)}`.slice(0, 140);
  return {
    candidateId,
    name,
    imageUrl,
    imageFileId,
    displayUrl: normalizeDisplayImageUrl(imageUrl || imageFileId),
    category: normalizeText(question.category || question.subject || ''),
    sourceQuizId: quizId,
    sourceQuestionId,
    sourcePath: `${QUIZ_QUESTIONS_ROOT}/${quizId}/questions/${questionDoc.id}`,
    keywords: buildKeywords(question),
    active: true,
    source: 'quizQuestions'
  };
}

async function buildCandidates(db, quizIds) {
  const candidates = [];
  for (const quizId of quizIds) {
    const snapshot = await db.collection(QUIZ_QUESTIONS_ROOT).doc(quizId).collection('questions').get();
    snapshot.docs.forEach(doc => {
      const candidate = normalizeCandidate(quizId, doc);
      if (candidate) candidates.push(candidate);
    });
  }
  const byId = new Map();
  candidates.forEach(candidate => byId.set(candidate.candidateId, candidate));
  return Array.from(byId.values());
}

async function commitCandidates(db, candidates) {
  let committed = 0;
  for (let i = 0; i < candidates.length; i += 450) {
    const batch = db.batch();
    candidates.slice(i, i + 450).forEach(candidate => {
      batch.set(db.collection(COLLECTION).doc(candidate.candidateId), {
        ...candidate,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });
    await batch.commit();
    committed += Math.min(450, candidates.length - i);
  }
  console.log(`Committed ${committed} profileImageCandidates documents.`);
}

async function main() {
  const args = parseArgs(process.argv);
  const db = initializeAdmin();
  const candidates = await buildCandidates(db, args.quizIds);
  console.log(`Prepared ${candidates.length} profileImageCandidates documents.`);
  candidates.slice(0, Math.max(0, args.sample)).forEach(candidate => {
    console.log(JSON.stringify({
      path: `${COLLECTION}/${candidate.candidateId}`,
      name: candidate.name,
      sourceQuizId: candidate.sourceQuizId,
      displayUrl: candidate.displayUrl,
      keywords: candidate.keywords.slice(0, 8)
    }, null, 2));
  });
  if (!args.commit) {
    console.log('No Firestore writes performed. Re-run with --commit to seed.');
    return;
  }
  await commitCandidates(db, candidates);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
