#!/usr/bin/env node

// 하우징 가구 원본(habboasset 폴더)의 백업 zip을 Storage에 올린다
//
// 배경: 가구 번들의 유일한 원천인 ~/Projects/habboasset/housing/furni/ 는
// git도 백업도 없어서, 유실되면 번들을 다시 만들 수 없다.
// 업로드 위치는 housingBackups/ — 보안 규칙에 별도 허용이 없으므로
// 클라이언트(학생)는 읽을 수 없고, 관리자 SDK/콘솔로만 접근 가능하다.
//
// 사용법:
//   node scripts/maintenance/backup-housing-sources.js <zip경로>            # 미리보기
//   node scripts/maintenance/backup-housing-sources.js <zip경로> --commit   # 실제 업로드

const fs = require('node:fs');
const path = require('node:path');
const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');

const DEFAULT_BUCKET = 'dj48-quiztown-firebase.firebasestorage.app';
const STORAGE_PREFIX = 'housingBackups';

function main() {
  const args = process.argv.slice(2);
  const commit = args.includes('--commit');
  const zipPath = args.find(a => !a.startsWith('--'));
  if (!zipPath || !fs.existsSync(zipPath)) {
    console.error('사용법: node scripts/maintenance/backup-housing-sources.js <zip경로> [--commit]');
    process.exit(1);
  }

  const size = fs.statSync(zipPath).size;
  const dest = `${STORAGE_PREFIX}/${path.basename(zipPath)}`;
  console.log(`업로드 대상: ${zipPath} (${(size / 1024 / 1024).toFixed(1)}MB)`);
  console.log(`Storage 경로: ${dest}`);

  if (!commit) {
    console.log('\n미리보기만 했어요. 실제 업로드는 --commit 을 붙여 주세요.');
    return;
  }

  if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), storageBucket: DEFAULT_BUCKET });
  }
  getStorage().bucket().upload(zipPath, {
    destination: dest,
    metadata: { contentType: 'application/zip' }
  }).then(() => {
    console.log('✅ 업로드 완료:', dest);
  }).catch(err => {
    console.error('❌ 업로드 실패:', err.message);
    process.exit(1);
  });
}

main();
