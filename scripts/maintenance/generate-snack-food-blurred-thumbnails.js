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
  월드콘: [
    { x: 33, y: 18, width: 31, height: 24 },
    { x: 63, y: 12, width: 13, height: 15 }
  ]
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

async function createBlurredImage(inputPath, answer, outputPath, fallbackAreas) {
  const { stdout } = await runFile('/usr/bin/swift', [
    SWIFT_HELPER,
    inputPath,
    answer,
    outputPath,
    JSON.stringify(Array.isArray(fallbackAreas) ? fallbackAreas : [])
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
  const fallbackAreas = MANUAL_MASK_OVERRIDES[answer] || data.imageMaskAreas;
  const ocr = await createBlurredImage(sourcePath, answer, outputPath, fallbackAreas);
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
