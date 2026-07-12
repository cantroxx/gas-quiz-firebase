#!/usr/bin/env node

// 하우징 시작 선물(기본 가구) 지급 — "내 방 첫날 세트"
//
// 모든 회원의 userInventory에 시작 가구 5종을 1개씩 넣어준다.
// 가방(하우징 화면)은 userInventory에서 자동 파생되므로 UI 수정 없이 바로 나타난다.
//
// 중복 지급 방지: 아이템 문서에 starterGiftAt 표시를 남기고, 표시가 있으면 건너뛴다.
// → 몇 번을 다시 실행해도 안전하고, 나중에 전학생이 오면 그때 다시 실행하면
//   이미 받은 학생은 건너뛰고 새 학생만 받는다.
//
// 사용법:
//   GOOGLE_APPLICATION_CREDENTIALS=service-account.json node scripts/seed/grant-housing-starter-gift.js            # 미리보기
//   GOOGLE_APPLICATION_CREDENTIALS=service-account.json node scripts/seed/grant-housing-starter-gift.js --commit   # 실제 지급

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// 시작 선물 목록 (shopItems 문서 ID 기준 — seed-housing-shop-items.js 로 등록된 것들)
const STARTER_ITEMS = [
  'room_bed_budget_one',    // 간이 1인 침대
  'room_chair_plasty',      // 플라스토 의자
  'room_table_plasto_round',// 플라스토 원형 테이블
  'room_carpet_standard',   // 기본 러그
  'room_plant_small_cactus' // 작은 선인장
];

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

async function main() {
  const args = parseArgs(process.argv);
  if (!getApps().length) initializeApp({ credential: applicationDefault() });
  const db = getFirestore();

  // 선물 아이템이 상점에 실제로 등록돼 있는지 먼저 확인
  const shopSnapshots = await db.getAll(...STARTER_ITEMS.map(id => db.collection('shopItems').doc(id)));
  const missing = shopSnapshots.filter(s => !s.exists).map(s => s.id);
  if (missing.length) {
    throw new Error(`shopItems에 없는 선물 아이템: ${missing.join(', ')} — seed-housing-shop-items.js 먼저 실행 필요`);
  }

  const usersSnapshot = await db.collection('users').get();
  console.log(`회원 ${usersSnapshot.size}명 × 선물 ${STARTER_ITEMS.length}종 검사 중…`);

  let granted = 0;
  let skipped = 0;
  let batch = db.batch();
  let writes = 0;

  for (const userDoc of usersSnapshot.docs) {
    const memberUserId = userDoc.id;
    const itemRefs = STARTER_ITEMS.map(itemId =>
      db.collection('userInventory').doc(memberUserId).collection('items').doc(itemId));
    const itemSnapshots = await db.getAll(...itemRefs);

    for (let i = 0; i < STARTER_ITEMS.length; i += 1) {
      const snapshot = itemSnapshots[i];
      if (snapshot.exists && snapshot.data()?.starterGiftAt) { skipped += 1; continue; } // 이미 받음

      granted += 1;
      if (!args.commit) continue;

      batch.set(itemRefs[i], {
        userId: memberUserId,
        itemId: STARTER_ITEMS[i],
        quantity: FieldValue.increment(1),
        priceType: 'djCoin',
        starterGiftAt: FieldValue.serverTimestamp(),
        source: snapshot.exists ? snapshot.data()?.source || 'housing_starter_gift' : 'housing_starter_gift',
        acquiredAt: snapshot.exists ? snapshot.data()?.acquiredAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      writes += 1;
      if (writes % 200 === 0) { await batch.commit(); batch = db.batch(); }
    }
  }

  if (args.commit) {
    await batch.commit();
    console.log(`지급 완료: ${granted}건 (이미 받아서 건너뜀: ${skipped}건)`);
  } else {
    console.log(`(미리보기) 지급 예정: ${granted}건, 건너뜀: ${skipped}건`);
    console.log('실제 지급은 --commit 으로 실행');
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
