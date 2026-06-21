#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

const QUIZ_ID = 'cultural_heritage';
const QUESTIONS_PATH = ['quizQuestions', QUIZ_ID, 'questions'];
const STORAGE_PREFIX = 'quiz-thumbnails/cultural-heritage';
const MAX_DIMENSION = 960;
const DEFAULT_BUCKET = 'dj48-quiztown-firebase.firebasestorage.app';

function parseArgs(argv) {
  const args = {
    commit: false,
    limit: 0,
    force: false,
    delayMs: 600,
    bucket: process.env.FIREBASE_STORAGE_BUCKET || DEFAULT_BUCKET
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if(arg === '--commit') {
      args.commit = true;
    } else if(arg === '--dry-run') {
      args.commit = false;
    } else if(arg === '--force') {
      args.force = true;
    } else if(arg === '--delay-ms') {
      index += 1;
      args.delayMs = Number(argv[index] || 0);
    } else if(arg.startsWith('--delay-ms=')) {
      args.delayMs = Number(arg.slice('--delay-ms='.length));
    } else if(arg === '--limit') {
      index += 1;
      args.limit = Number(argv[index] || 0);
    } else if(arg.startsWith('--limit=')) {
      args.limit = Number(arg.slice('--limit='.length));
    } else if(arg === '--bucket') {
      index += 1;
      args.bucket = String(argv[index] || '').trim();
    } else if(arg.startsWith('--bucket=')) {
      args.bucket = String(arg.slice('--bucket='.length) || '').trim();
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
    const child = execFile(command, args, { encoding: 'utf8' });
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
    .replace(/^-|-$/g, '') || 'heritage';
}

function getTokenizedStorageUrl(bucketName, filePath, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(filePath)}?alt=media&token=${encodeURIComponent(token)}`;
}

function isStorageImageUrl(value) {
  return String(value || '').includes('firebasestorage.googleapis.com')
    && String(value || '').includes(`/${encodeURIComponent(STORAGE_PREFIX)}`);
}

function getWikimediaThumbUrl(value) {
  const url = String(value || '').trim();
  if(!url || !url.includes('upload.wikimedia.org') || url.includes('/thumb/')) return '';
  let parsed;
  try {
    parsed = new URL(url);
  } catch(error) {
    return '';
  }
  const parts = parsed.pathname.split('/');
  const commonsIndex = parts.indexOf('commons');
  if(commonsIndex < 0 || parts.length < commonsIndex + 4) return '';
  const fileName = parts[parts.length - 1];
  const hashParts = parts.slice(commonsIndex + 1, -1).join('/');
  const prefix = parts.slice(0, commonsIndex + 1).join('/');
  return `${parsed.origin}${prefix}/thumb/${hashParts}/${fileName}/960px-${fileName}`;
}

async function downloadImage(url, outputPath) {
  let lastError = null;
  for(let attempt = 0; attempt < 5; attempt += 1) {
    if(attempt > 0) await sleep(1500 * attempt);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'dj48-quiztown-cultural-heritage-cache/1.0'
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

async function downloadBestImage(url, outputPath) {
  const candidates = Array.from(new Set([getWikimediaThumbUrl(url), url].filter(Boolean)));
  let lastError = null;
  for(const candidate of candidates) {
    try {
      const bytes = await downloadImage(candidate, outputPath);
      return { bytes, downloadedUrl: candidate };
    } catch(error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function createThumbnail(inputPath, outputPath) {
  await runFile('/usr/bin/sips', [
    '-s', 'format', 'jpeg',
    '-s', 'formatOptions', '72',
    '-Z', String(MAX_DIMENSION),
    inputPath,
    '--out',
    outputPath
  ]);
  const stat = await fs.stat(outputPath);
  return stat.size;
}

async function loadQuestions(db) {
  const snapshot = await db.collection(QUESTIONS_PATH[0]).doc(QUESTIONS_PATH[1]).collection(QUESTIONS_PATH[2]).orderBy('order').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ref: doc.ref, data: doc.data() || {} }));
}

async function processQuestion(question, options) {
  const { bucket, tempDir, commit } = options;
  const data = question.data;
  const answer = String(data.answer || question.id).trim();
  const currentImageUrl = String(data.imageUrl || '').trim();
  const originalImageUrl = String(data.imageOriginalUrl || currentImageUrl).trim();
  if(!originalImageUrl) return { id: question.id, answer, skipped: 'missing-image-url' };
  if(!options.force && isStorageImageUrl(currentImageUrl)) return { id: question.id, answer, skipped: 'already-storage' };

  const baseName = `${String(data.order || question.id).padStart(3, '0')}-${slugStorageName(answer)}`;
  const sourcePath = path.join(tempDir, `${baseName}.source`);
  const thumbnailPath = path.join(tempDir, `${baseName}.jpg`);
  const filePath = `${STORAGE_PREFIX}/${baseName}.jpg`;
  const token = crypto.randomUUID();

  const { bytes: sourceBytes, downloadedUrl } = await downloadBestImage(originalImageUrl, sourcePath);
  const thumbnailBytes = await createThumbnail(sourcePath, thumbnailPath);

  if(!commit) {
    return {
      id: question.id,
      answer,
      sourceBytes,
      thumbnailBytes,
      storagePath: filePath,
      dryRun: true
    };
  }

  await bucket.upload(thumbnailPath, {
    destination: filePath,
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: {
        firebaseStorageDownloadTokens: token,
        quizId: QUIZ_ID,
        questionId: question.id,
        answer,
        sourceUrl: String(data.imageSourceUrl || '').trim(),
        originalImageUrl,
        downloadedUrl
      }
    }
  });
  const imageUrl = getTokenizedStorageUrl(bucket.name, filePath, token);
  await question.ref.set({
    imageUrl,
    imageOriginalUrl: originalImageUrl,
    imageDownloadedUrl: downloadedUrl,
    imageStoragePath: filePath,
    imageThumbnailBytes: thumbnailBytes,
    imageCachedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  return {
    id: question.id,
    answer,
    sourceBytes,
    thumbnailBytes,
    storagePath: filePath,
    committed: true
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const { db, bucket } = initializeAdmin(args.bucket);
  const questions = await loadQuestions(db);
  const targets = questions
    .filter(question => args.force || !isStorageImageUrl(question.data.imageUrl))
    .slice(0, args.limit > 0 ? args.limit : questions.length);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dj48-cultural-heritage-'));
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
  const skipped = questions.length - targets.length + results.filter(result => result.skipped).length;
  const failed = results.filter(result => result.failed).length;
  const thumbnailBytes = results.reduce((sum, result) => sum + (Number(result.thumbnailBytes) || 0), 0);
  console.log(JSON.stringify({
    mode: args.commit ? 'commit' : 'dry-run',
    totalQuestions: questions.length,
    processed: results.length,
    committed,
    skipped,
    failed,
    thumbnailBytes
  }, null, 2));
  if(!args.commit) {
    console.log('No Storage or Firestore writes performed. Re-run with --commit to upload thumbnails.');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
