#!/usr/bin/env node

// authLinks 명부 일괄 등록 (기존 연결 학생용)
//
// users 컬렉션에서 authUid가 있는 문서를 읽어 authLinks/{authUid} = { memberUserId }를 채운다.
// 새 연결/로그인은 함수(mirrorAuthLinkInTransaction)가 실시간으로 기록하므로,
// 이 스크립트는 하우징 에셋 잠금 도입 시점에 "이미 연결돼 있던" 학생들을 위해 1회 실행한다.
//
// 사용법:
//   node scripts/migration/backfill-auth-links.js            # 미리보기 (dry-run)
//   node scripts/migration/backfill-auth-links.js --commit   # 실제 기록

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

function parseArgs(argv) {
  const args = { commit: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--commit') args.commit = true;
    else if (arg === '--dry-run') args.commit = false;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function initializeAdmin() {
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault() });
  }
  return getFirestore();
}

function pickLatest(a, b) {
  const timeOf = doc => {
    const data = doc.data();
    const t = data.authRelinkedAt || data.authLinkedAt || data.updatedAt;
    return t?.toMillis ? t.toMillis() : 0;
  };
  return timeOf(a) >= timeOf(b) ? a : b;
}

async function main() {
  const args = parseArgs(process.argv);
  const db = initializeAdmin();

  const snapshot = await db.collection('users').get();
  const byAuthUid = new Map();
  let withoutAuthUid = 0;

  for (const doc of snapshot.docs) {
    const authUid = String(doc.data().authUid || '').trim();
    if (!authUid) { withoutAuthUid += 1; continue; }
    // 같은 authUid를 가진 회원이 둘이면(재연결 잔재) 더 최근에 연결된 쪽을 채택
    const existing = byAuthUid.get(authUid);
    byAuthUid.set(authUid, existing ? pickLatest(existing, doc) : doc);
    if (existing) {
      console.warn(`중복 authUid 발견: ${authUid} → ${existing.id} vs ${doc.id} (더 최근 연결 채택)`);
    }
  }

  console.log(`회원 문서 ${snapshot.size}건 중 연결된 계정 ${byAuthUid.size}건, 미연결 ${withoutAuthUid}건`);

  if (!args.commit) {
    let shown = 0;
    for (const [authUid, doc] of byAuthUid) {
      if (shown >= 5) break;
      console.log(`  (미리보기) authLinks/${authUid} → ${doc.id}`);
      shown += 1;
    }
    console.log('dry-run 완료 — 실제 기록은 --commit 으로 실행');
    return;
  }

  let written = 0;
  let batch = db.batch();
  for (const [authUid, doc] of byAuthUid) {
    batch.set(db.collection('authLinks').doc(authUid), {
      authUid,
      memberUserId: doc.id,
      updatedAt: FieldValue.serverTimestamp(),
      source: 'backfill_script'
    }, { merge: true });
    written += 1;
    if (written % 400 === 0) { await batch.commit(); batch = db.batch(); }
  }
  await batch.commit();
  console.log(`authLinks ${written}건 기록 완료`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
