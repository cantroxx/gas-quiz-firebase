const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const DEFAULT_QUIZ_IDS = ['spelling', 'ancient-history', 'dad-joke'];

function parseArgs(argv) {
  const args = {
    quizIds: DEFAULT_QUIZ_IDS,
    sample: 12
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--quiz') {
      index += 1;
      args.quizIds = String(argv[index] || '').split(',').map(value => value.trim()).filter(Boolean);
    } else if (arg.startsWith('--quiz=')) {
      args.quizIds = arg.slice('--quiz='.length).split(',').map(value => value.trim()).filter(Boolean);
    } else if (arg === '--sample') {
      index += 1;
      args.sample = Number(argv[index] || 0);
    } else if (arg.startsWith('--sample=')) {
      args.sample = Number(arg.slice('--sample='.length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.quizIds.length) args.quizIds = DEFAULT_QUIZ_IDS;
  if (!Number.isInteger(args.sample) || args.sample < 0) {
    throw new Error('--sample must be a non-negative integer.');
  }
  return args;
}

function initializeAdminApp() {
  if (getApps().length) return;
  initializeApp({
    credential: applicationDefault()
  });
}

function normalizeString(value) {
  return String(value || '').trim();
}

function buildSpellingChoiceModel(question) {
  const prompt = normalizeString(question.prompt || question.question);
  const answer = normalizeString(question.answer);
  const aliases = Array.isArray(question.aliases)
    ? question.aliases.map(normalizeString).filter(Boolean)
    : [];
  const match = prompt.match(/\(([^()/]+)\/([^()/]+)\)/);
  const choices = match
    ? [match[1].trim(), match[2].trim()]
    : [answer, ...aliases].filter(Boolean).slice(0, 2);
  const normalizedChoices = choices.length >= 2 ? choices : [answer, '다시 보기'];
  const answerIndex = normalizedChoices.findIndex(choice => choice === answer);
  return {
    answerIndex: answerIndex >= 0 ? answerIndex : 0,
    choices: normalizedChoices,
    prompt,
    answer
  };
}

function buildChoiceModel(question) {
  const choices = Array.isArray(question.choices)
    ? question.choices.map(normalizeString).filter(Boolean)
    : [];
  const explicitAnswer = Number(question.answerIndex);
  const answer = normalizeString(question.answer);
  const answerIndex = Number.isInteger(explicitAnswer) && explicitAnswer >= 0 && explicitAnswer < choices.length
    ? explicitAnswer
    : choices.findIndex(choice => choice === answer);
  return {
    answerIndex: answerIndex >= 0 ? answerIndex : 0,
    choices,
    prompt: normalizeString(question.prompt || question.question),
    answer,
    hint: normalizeString(question.hint || question.explanation)
  };
}

function pushSample(samples, limit, item) {
  if (samples.length < limit) samples.push(item);
}

function inspectSpelling(rows, sampleLimit) {
  const answerIndexCounts = [0, 0, 0, 0];
  const samples = [];
  const firstOnlyCandidates = [];

  rows.forEach(question => {
    const model = buildSpellingChoiceModel(question);
    answerIndexCounts[model.answerIndex] = (answerIndexCounts[model.answerIndex] || 0) + 1;
    pushSample(samples, sampleLimit, {
      questionId: question.questionId || question.id,
      order: question.order,
      answerIndex: model.answerIndex,
      prompt: model.prompt,
      choices: model.choices,
      answer: model.answer
    });
    if (model.answerIndex === 0) {
      pushSample(firstOnlyCandidates, sampleLimit, {
        questionId: question.questionId || question.id,
        order: question.order,
        prompt: model.prompt,
        choices: model.choices,
        answer: model.answer
      });
    }
  });

  return {
    total: rows.length,
    answerIndexCounts,
    firstAnswerRate: rows.length ? Number((answerIndexCounts[0] / rows.length).toFixed(4)) : 0,
    samples,
    firstOnlyCandidates
  };
}

function inspectAncientHistory(rows, sampleLimit) {
  const answerIndexCounts = [0, 0, 0, 0];
  const hintStats = {
    missingHint: 0,
    hintContainsAnswer: 0,
    veryShortHint: 0
  };
  const flaggedSamples = [];

  rows.forEach(question => {
    const model = buildChoiceModel(question);
    answerIndexCounts[model.answerIndex] = (answerIndexCounts[model.answerIndex] || 0) + 1;
    if (!model.hint) hintStats.missingHint += 1;
    if (model.hint && model.answer && model.hint.includes(model.answer)) hintStats.hintContainsAnswer += 1;
    if (model.hint && model.hint.length < 8) hintStats.veryShortHint += 1;
    if (!model.hint || model.hint.length < 8 || (model.answer && model.hint.includes(model.answer))) {
      pushSample(flaggedSamples, sampleLimit, {
        questionId: question.questionId || question.id,
        order: question.order,
        prompt: model.prompt,
        answer: model.answer,
        hint: model.hint
      });
    }
  });

  return {
    total: rows.length,
    answerIndexCounts,
    hintStats,
    flaggedSamples
  };
}

function inspectDadJoke(rows, sampleLimit) {
  const qualityStats = {
    missingHint: 0,
    veryShortPrompt: 0,
    veryShortAnswer: 0,
    answerInPrompt: 0,
    duplicatePrompt: 0,
    duplicateAnswer: 0
  };
  const promptCounts = new Map();
  const answerCounts = new Map();
  const samples = [];
  const flaggedSamples = [];

  rows.forEach(question => {
    const prompt = normalizeString(question.prompt || question.question);
    const answer = normalizeString(question.answer);
    const hint = normalizeString(question.hint || question.explanation);
    promptCounts.set(prompt, (promptCounts.get(prompt) || 0) + 1);
    answerCounts.set(answer, (answerCounts.get(answer) || 0) + 1);
    if (!hint) qualityStats.missingHint += 1;
    if (prompt.length < 8) qualityStats.veryShortPrompt += 1;
    if (answer.length < 2) qualityStats.veryShortAnswer += 1;
    if (answer && prompt.includes(answer)) qualityStats.answerInPrompt += 1;
    pushSample(samples, sampleLimit, {
      questionId: question.questionId || question.id,
      order: question.order,
      prompt,
      answer,
      hint
    });
  });

  rows.forEach(question => {
    const prompt = normalizeString(question.prompt || question.question);
    const answer = normalizeString(question.answer);
    const hint = normalizeString(question.hint || question.explanation);
    const duplicatePrompt = prompt && promptCounts.get(prompt) > 1;
    const duplicateAnswer = answer && answerCounts.get(answer) > 1;
    if (duplicatePrompt) qualityStats.duplicatePrompt += 1;
    if (duplicateAnswer) qualityStats.duplicateAnswer += 1;
    if (!hint || prompt.length < 8 || answer.length < 2 || (answer && prompt.includes(answer)) || duplicatePrompt || duplicateAnswer) {
      pushSample(flaggedSamples, sampleLimit, {
        questionId: question.questionId || question.id,
        order: question.order,
        prompt,
        answer,
        hint,
        duplicatePrompt,
        duplicateAnswer
      });
    }
  });

  return {
    total: rows.length,
    qualityStats,
    samples,
    flaggedSamples
  };
}

async function loadQuizQuestions(db, quizId) {
  const snapshot = await db.collection('quizQuestions').doc(quizId).collection('questions').orderBy('order').get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

async function main() {
  const args = parseArgs(process.argv);
  initializeAdminApp();
  const db = getFirestore();

  for (const quizId of args.quizIds) {
    const rows = await loadQuizQuestions(db, quizId);
    let result;
    if (quizId === 'spelling') {
      result = inspectSpelling(rows, args.sample);
    } else if (quizId === 'ancient-history') {
      result = inspectAncientHistory(rows, args.sample);
    } else if (quizId === 'dad-joke') {
      result = inspectDadJoke(rows, args.sample);
    } else {
      result = { total: rows.length };
    }
    console.log(JSON.stringify({ quizId, ...result }, null, 2));
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
