#!/usr/bin/env node

// 하우징 무료 쿠폰 10장 일괄 지급 — "인테리어 소품 마음껏 사기" 이벤트
//
// 모든 회원의 userEconomy.housingCoupons 에 10을 더한다.
// 쿠폰은 50코인 이하 아이템(전체 소품의 대부분)에 코인 대신 사용할 수 있다.
//
// 중복 지급 방지: userEconomy 문서에 coupon10GrantedAt 표시를 남기고,
// 표시가 있으면 건너뛴다. → 여러 번 실행해도 한 번만 지급, 전학생만 추가 지급.
//
// 사용법:
//   GOOGLE_APPLICATION_CREDENTIALS=service-account.json node scripts/seed/grant-housing-coupons.js            # 미리보기
//   GOOGLE_APPLICATION_CREDENTIALS=service-account.json node scripts/seed/grant-housing-coupons.js --commit   # 실제 지급

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const GRANT_AMOUNT = 10;
const GRANT_MARK = 'coupon10GrantedAt'; // 중복 지급 방지 표시

async function main() {
  const commit = process.argv.includes('--commit');
  if (!getApps().length) initializeApp({ credential: applicationDefault() });
  const db = getFirestore();

  const usersSnapshot = await db.collection('users').get();
  console.log(`회원 ${usersSnapshot.size}명에게 무료 쿠폰 ${GRANT_AMOUNT}장 지급 검사 중…`);

  let granted = 0, skipped = 0, writes = 0;
  let batch = db.batch();

  for (const userDoc of usersSnapshot.docs) {
    const memberUserId = userDoc.id;
    const ecoRef = db.collection('userEconomy').doc(memberUserId);
    const eco = await ecoRef.get();
    if (eco.exists && eco.data()?.[GRANT_MARK]) { skipped += 1; continue; } // 이미 받음

    granted += 1;
    if (!commit) continue;

    batch.set(ecoRef, {
      userId: memberUserId,
      housingCoupons: FieldValue.increment(GRANT_AMOUNT),
      [GRANT_MARK]: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    writes += 1;
    if (writes % 200 === 0) { await batch.commit(); batch = db.batch(); }
  }

  if (commit) {
    await batch.commit();
    console.log(`✅ 지급 완료: ${granted}명 (이미 받아서 건너뜀: ${skipped}명)`);
  } else {
    console.log(`미리보기: ${granted}명에게 지급 예정, ${skipped}명은 이미 받음. 실제 지급은 --commit`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
