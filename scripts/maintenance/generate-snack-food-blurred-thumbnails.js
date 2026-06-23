#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

const QUIZ_ID = 'snack-food';
const QUESTIONS_PATH = ['quizQuestions', QUIZ_ID, 'questions'];
const STORAGE_PREFIX = 'quiz-thumbnails/snack-food-blurred';
const DEFAULT_BUCKET = 'dj48-quiztown-firebase.firebasestorage.app';
const SWIFT_HELPER = path.join(__dirname, 'snack-food-image-ocr-blur.swift');
const MANUAL_MASK_OVERRIDES = {
  '신라면 블랙': { manualOnly: true, areas: [{ x: 24, y: 32, width: 52, height: 20 }] },
  김치라면: { manualOnly: true, areas: [{ x: 24, y: 32, width: 52, height: 20 }] },
  불닭볶음면: { manualOnly: true, areas: [{ x: 26, y: 34, width: 48, height: 18 }] },
  치토스: { manualOnly: true, areas: [{ x: 28, y: 35, width: 44, height: 18 }] },
  오잉: { manualOnly: true, areas: [{ x: 27, y: 35, width: 46, height: 18 }] },
  도리토스: { manualOnly: true, areas: [{ x: 25, y: 31, width: 50, height: 21 }] },
  엑설런트: { manualOnly: true, areas: [{ x: 26, y: 34, width: 48, height: 15 }] },
  바밤바: { manualOnly: true, areas: [{ x: 30, y: 43, width: 23, height: 14 }] },
  월드콘: { manualOnly: true, areas: [
    { x: 33, y: 18, width: 31, height: 24 },
    { x: 63, y: 12, width: 13, height: 15 }
  ] },
  돼지바: { manualOnly: true, areas: [{ x: 26, y: 36, width: 45, height: 17 }] },
  설레임: { manualOnly: true, areas: [{ x: 26, y: 34, width: 48, height: 18 }] },
  죠크박바: { manualOnly: true, areas: [{ x: 26, y: 35, width: 48, height: 18 }] },
  누가바: { manualOnly: true, areas: [{ x: 28, y: 36, width: 44, height: 18 }] },
  후라보노: { manualOnly: true, areas: [{ x: 29, y: 35, width: 45, height: 18 }] },
  이브: { manualOnly: true, areas: [{ x: 31, y: 36, width: 38, height: 16 }] },
  왓따: { manualOnly: true, areas: [{ x: 28, y: 34, width: 45, height: 20 }] },
  졸음번쩍껌: { manualOnly: true, areas: [{ x: 26, y: 32, width: 50, height: 22 }] },
  '롤리팝 아이스': { manualOnly: true, areas: [{ x: 25, y: 34, width: 50, height: 20 }] },
  '짱셔요!': { manualOnly: true, areas: [{ x: 27, y: 32, width: 46, height: 22 }] },
  제크: { manualOnly: true, areas: [{ x: 31, y: 38, width: 38, height: 16 }] },
  제로: { manualOnly: true, areas: [
    { x: 34, y: 28, width: 32, height: 13 },
    { x: 70, y: 41, width: 23, height: 15 }
  ] },
  '프리미엄 가나': { manualOnly: true, areas: [
    { x: 26, y: 39, width: 22, height: 16 },
    { x: 42, y: 35, width: 43, height: 20 }
  ] },
  드림카카오: { manualOnly: true, areas: [
    { x: 28, y: 22, width: 44, height: 18 },
    { x: 40, y: 42, width: 26, height: 18 }
  ] },
  석기시대: { manualOnly: true, areas: [{ x: 28, y: 36, width: 44, height: 18 }] },
  위즐: { manualOnly: true, areas: [
    { x: 32, y: 16, width: 35, height: 8 },
    { x: 18, y: 47, width: 62, height: 17 }
  ] },
  쮸쮸바: { manualOnly: true, areas: [{ x: 28, y: 33, width: 45, height: 20 }] },
  바나나킥: { manualOnly: true, areas: [
    { x: 20, y: 15, width: 62, height: 18 },
    { x: 18, y: 29, width: 60, height: 16 },
    { x: 34, y: 40, width: 38, height: 12 }
  ] }
};

function parseArgs(argv) {
  const args = {
    commit: false,
    force: false,
    limit: 0,
    delayMs: 500,
    bucket: process.env.FIREBASE_STORAGE_BUCKET || DEFAULT_BUCKET
  };
  for(let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if(arg === '--commit') {
      args.commit = true;
    } else if(arg === '--dry-run') {
      args.commit = false;
    } else if(arg === '--force') {
      args.force = true;
    } else if(arg === '--limit') {
      index += 1;
      args.limit = Number(argv[index] || 0);
    } else if(arg.startsWith('--limit=')) {
      args.limit = Number(arg.slice('--limit='.length));
    } else if(arg === '--delay-ms') {
      index += 1;
      args.delayMs = Number(argv[index] || 0);
    } else if(arg.startsWith('--delay-ms=')) {
      args.delayMs = Number(arg.slice('--delay-ms='.length));
    } else if(arg === '--bucket') {
      index += 1;
      args.bucket = String(argv[index] || '').trim();
    } else if(arg.startsWith('--bucket=')) {
      args.bucket = String(arg.slice('--bucket='.length) || '').trim();
    } else if(arg === '--answer') {
      index += 1;
      args.answer = String(argv[index] || '').trim();
    } else if(arg.startsWith('--answer=')) {
      args.answer = String(arg.slice('--answer='.length) || '').trim();
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

function initializeAdmin(bucketName) {
  if(!getApps().length) {
    initializeApp({ credential: applicationDefault(), storageBucket: bucketName });
  }
  return {
    db: getFirestore(),
    bucket: getStorage().bucket(bucketName)
  };
}

function runFile(command, args) {
  return new Promise((resolve, reject) => {
    const child = execFile(command, args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 8 });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      if(code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${command} exited with ${code}: ${stderr || stdout}`));
      }
    });
  });
}

function slugStorageName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'snack';
}

function getTokenizedStorageUrl(bucketName, filePath, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(filePath)}?alt=media&token=${encodeURIComponent(token)}`;
}

function isBlurredStorageImageUrl(value) {
  return String(value || '').includes('firebasestorage.googleapis.com')
    && String(value || '').includes(`/${encodeURIComponent(STORAGE_PREFIX)}`);
}

async function downloadImage(url, outputPath) {
  let lastError = null;
  for(let attempt = 0; attempt < 4; attempt += 1) {
    if(attempt > 0) await sleep(1000 * attempt);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'dj48-quiztown-snack-food-blur/1.0'
      }
    });
    if(response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(outputPath, buffer);
      return buffer.length;
    }
    lastError = new Error(`Image download failed ${response.status} ${response.statusText}: ${url}`);
    if(response.status !== 429 && response.status < 500) break;
  }
  throw lastError;
}

async function loadQuestions(db) {
  const snapshot = await db.collection(QUESTIONS_PATH[0]).doc(QUESTIONS_PATH[1]).collection(QUESTIONS_PATH[2]).orderBy('order').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ref: doc.ref, data: doc.data() || {} }));
}

function normalizeMaskOverride(value) {
  if(!value) return { areas: [], manualOnly: false };
  if(Array.isArray(value)) return { areas: value, manualOnly: false };
  return {
    areas: Array.isArray(value.areas) ? value.areas : [],
    manualOnly: value.manualOnly === true
  };
}

async function createBlurredImage(inputPath, answer, outputPath, maskOverride) {
  const maskOptions = normalizeMaskOverride(maskOverride);
  const { stdout } = await runFile('/usr/bin/swift', [
    SWIFT_HELPER,
    inputPath,
    answer,
    outputPath,
    JSON.stringify(maskOptions)
  ]);
  return JSON.parse(stdout);
}

async function processQuestion(question, options) {
  const data = question.data;
  const answer = String(data.answer || question.id).trim();
  const currentImageUrl = String(data.imageUrl || '').trim();
  const originalImageUrl = String(data.imageOriginalUrl || currentImageUrl).trim();
  if(!originalImageUrl) return { id: question.id, answer, skipped: 'missing-image-url' };
  if(!options.force && isBlurredStorageImageUrl(currentImageUrl)) {
    return { id: question.id, answer, skipped: 'already-blurred-storage' };
  }

  const baseName = `${String(data.order || question.id).padStart(3, '0')}-${slugStorageName(answer)}`;
  const sourcePath = path.join(options.tempDir, `${baseName}.source`);
  const outputPath = path.join(options.tempDir, `${baseName}.png`);
  const filePath = `${STORAGE_PREFIX}/${baseName}.png`;
  const token = crypto.randomUUID();

  const sourceBytes = await downloadImage(originalImageUrl, sourcePath);
  const maskOverride = MANUAL_MASK_OVERRIDES[answer] || data.imageMaskAreas;
  const ocr = await createBlurredImage(sourcePath, answer, outputPath, maskOverride);
  const outputStat = await fs.stat(outputPath);

  const result = {
    id: question.id,
    answer,
    sourceBytes,
    thumbnailBytes: outputStat.size,
    matchedCount: ocr.matchedCount,
    matches: ocr.matches,
    recognizedSample: Array.isArray(ocr.recognizedTexts) ? ocr.recognizedTexts.slice(0, 8) : [],
    storagePath: filePath
  };

  if(!options.commit) {
    return { ...result, dryRun: true };
  }

  await options.bucket.upload(outputPath, {
    destination: filePath,
    metadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: {
        firebaseStorageDownloadTokens: token,
        quizId: QUIZ_ID,
        questionId: question.id,
        answer,
        originalImageUrl,
        ocrMatchedCount: String(ocr.matchedCount)
      }
    }
  });
  const imageUrl = getTokenizedStorageUrl(options.bucket.name, filePath, token);
  await question.ref.set({
    imageUrl,
    imageOriginalUrl: originalImageUrl,
    imageStoragePath: filePath,
    imageThumbnailBytes: outputStat.size,
    imageOcrMatchedCount: ocr.matchedCount,
    imageOcrMatches: ocr.matches,
    imageMaskAreas: [],
    imageBlurredAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  return { ...result, committed: true };
}

async function main() {
  const args = parseArgs(process.argv);
  const { db, bucket } = initializeAdmin(args.bucket);
  const questions = await loadQuestions(db);
  const targets = questions
    .filter(question => !args.answer || String(question.data.answer || '').trim() === args.answer)
    .filter(question => args.force || !isBlurredStorageImageUrl(question.data.imageUrl))
    .slice(0, args.limit > 0 ? args.limit : questions.length);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dj48-snack-blur-'));
  const results = [];

  try {
    for(const question of targets) {
      if(results.length > 0) await sleep(args.delayMs);
      let result;
      try {
        result = await processQuestion(question, {
          bucket,
          tempDir,
          commit: args.commit,
          force: args.force
        });
      } catch(error) {
        result = {
          id: question.id,
          answer: String(question.data?.answer || question.id).trim(),
          failed: true,
          error: String(error?.message || error)
        };
      }
      results.push(result);
      console.log(JSON.stringify(result));
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  const committed = results.filter(result => result.committed).length;
  const dryRun = results.filter(result => result.dryRun).length;
  const failed = results.filter(result => result.failed).length;
  const skipped = questions.length - targets.length + results.filter(result => result.skipped).length;
  const zeroMatch = results.filter(result => !result.failed && !result.skipped && Number(result.matchedCount) === 0).length;
  console.log(JSON.stringify({
    quizId: QUIZ_ID,
    totalQuestions: questions.length,
    targeted: targets.length,
    committed,
    dryRun,
    skipped,
    failed,
    zeroMatch
  }, null, 2));

  if(failed > 0) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
