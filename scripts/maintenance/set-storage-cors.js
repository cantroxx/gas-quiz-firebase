#!/usr/bin/env node

// Storage 버킷 CORS 설정 (1회 실행)
//
// 웹 페이지가 fetch/XHR로 Storage 파일을 내려받으려면 버킷에 CORS(교차 출처 허용)
// 설정이 필요하다 (Firebase 공식 문서 절차). 설정이 없으면 서버가 200으로 응답해도
// Access-Control-Allow-Origin 헤더가 없어 브라우저가 응답을 폐기한다
// (하우징 가구 묶음 다운로드가 실패했던 원인).
//
// <img> 태그 로딩(퀴즈 썸네일 등)은 CORS와 무관하므로 기존 기능에는 영향 없음.
//
// 사용법:
//   GOOGLE_APPLICATION_CREDENTIALS=service-account.json node scripts/maintenance/set-storage-cors.js           # 미리보기
//   GOOGLE_APPLICATION_CREDENTIALS=service-account.json node scripts/maintenance/set-storage-cors.js --commit  # 실제 적용

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');

const BUCKET = 'dj48-quiztown-firebase.firebasestorage.app';

// GET만, 우리 호스팅 도메인 2개만 허용 (다른 사이트에서의 fetch는 계속 차단됨)
const CORS_CONFIG = [
  {
    origin: [
      'https://dj48-quiztown-firebase.web.app',
      'https://dj48-quiztown-firebase.firebaseapp.com'
    ],
    method: ['GET'],
    maxAgeSeconds: 3600
  }
];

async function main() {
  const commit = process.argv.includes('--commit');

  if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), storageBucket: BUCKET });
  }
  const bucket = getStorage().bucket(BUCKET);

  const [metadata] = await bucket.getMetadata();
  console.log('현재 CORS 설정:', JSON.stringify(metadata.cors || null));
  console.log('적용할 CORS 설정:', JSON.stringify(CORS_CONFIG));

  if (!commit) {
    console.log('dry-run 완료 — 실제 적용은 --commit 으로 실행');
    return;
  }

  await bucket.setCorsConfiguration(CORS_CONFIG);
  const [after] = await bucket.getMetadata();
  console.log('적용 완료. 적용 후 CORS 설정:', JSON.stringify(after.cors));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
