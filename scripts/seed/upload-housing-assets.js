#!/usr/bin/env node

// 하우징 가구 에셋 묶음을 Storage(housingAssets/)에 업로드
//
// 묶음 파일은 scripts/maintenance/build-housing-bundle.js 가 만든
// private/housing-assets/furni-bundle-v<N>.json.gz 를 사용한다.
// 업로드 대상 경로는 storage.rules 의 housingAssets 잠금(학급 연결 계정만 읽기) 아래에 있다.
//
// 사용법:
//   node scripts/seed/upload-housing-assets.js            # 미리보기 (dry-run)
//   node scripts/seed/upload-housing-assets.js --commit   # 실제 업로드

const fs = require('node:fs');
const path = require('node:path');
const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');

const DEFAULT_BUCKET = 'dj48-quiztown-firebase.firebasestorage.app';
const ASSETS_DIR = path.resolve(__dirname, '..', '..', 'private', 'housing-assets');
const STORAGE_PREFIX = 'housingAssets';

function parseArgs(argv) {
  const args = { commit: false, bucket: DEFAULT_BUCKET };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--commit') args.commit = true;
    else if (arg === '--dry-run') args.commit = false;
    else if (arg === '--bucket') args.bucket = argv[++index] || DEFAULT_BUCKET;
    else if (arg.startsWith('--bucket=')) args.bucket = arg.slice('--bucket='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function initializeAdmin(bucketName) {
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), storageBucket: bucketName });
  }
  return getStorage().bucket(bucketName);
}

function findBundleFiles() {
  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error(`묶음 폴더가 없습니다: ${ASSETS_DIR} — 먼저 build-housing-bundle.js 를 실행하세요`);
  }
  const files = fs.readdirSync(ASSETS_DIR).filter(name => /^furni-bundle-v\d+\.json\.gz$/.test(name));
  if (!files.length) {
    throw new Error(`업로드할 furni-bundle-v*.json.gz 가 없습니다: ${ASSETS_DIR}`);
  }
  return files.sort();
}

async function main() {
  const args = parseArgs(process.argv);
  const files = findBundleFiles();

  for (const name of files) {
    const localPath = path.join(ASSETS_DIR, name);
    const size = (fs.statSync(localPath).size / 1024 / 1024).toFixed(2);
    console.log(`${args.commit ? '업로드' : '(미리보기)'} ${localPath} (${size}MB) → gs://${args.bucket}/${STORAGE_PREFIX}/${name}`);
  }

  if (!args.commit) {
    console.log('dry-run 완료 — 실제 업로드는 --commit 으로 실행');
    return;
  }

  const bucket = initializeAdmin(args.bucket);
  for (const name of files) {
    await bucket.upload(path.join(ASSETS_DIR, name), {
      destination: `${STORAGE_PREFIX}/${name}`,
      metadata: {
        contentType: 'application/gzip',
        // 파일명에 버전이 있어 내용이 절대 안 바뀜 → 브라우저가 오래 캐시해도 안전
        cacheControl: 'private, max-age=31536000, immutable'
      }
    });
    console.log(`업로드 완료: ${STORAGE_PREFIX}/${name}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
