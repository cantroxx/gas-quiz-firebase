#!/usr/bin/env node

// 벽 꾸미기 34종 판매 중단 (2026-07-13 카탈로그에서 제거됨)
//
// 배경: 벽 아이템 MVP는 진짜 '벽걸이'가 아니라 바닥에 세우는 방식이라
// 카탈로그에서 뺐다. shopItems 문서는 남아 있으므로 enabled:false 로 잠가
// 혹시 모를 직접 구매 요청도 서버(purchaseHousingItem)가 거절하게 한다.
// 학생 보유 확인 결과: 배치 0건, 보유 1건(관리자 더미 계정) — 영향 없음.
//
// 사용법:
//   GOOGLE_APPLICATION_CREDENTIALS=service-account.json node scripts/maintenance/disable-housing-wall-items.js            # 미리보기
//   GOOGLE_APPLICATION_CREDENTIALS=service-account.json node scripts/maintenance/disable-housing-wall-items.js --commit   # 실제 반영

const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const WALL_CLASSNAMES = [
  'attic15_window', 'lon_window', 'room_hall15_window', 'diner_poster', 'easy_poster',
  'wildwest_wanted_poster', 'horse_fin_poster', 'horse_fin_poster2', 'horse_fin_poster3',
  'hrella_poster_1', 'hrella_poster_2', 'hrella_poster_3', 'pixel_mirror', 'room_wl15_mirror',
  'pframe', 'noticeboard', 'classic1_wall1', 'classic1_wall2', 'classic2_wall', 'classic5_wall',
  'classic6_wall', 'classic7_wall', 'lidowall1', 'lidowall2', 'lidowall3', 'wall_china',
  'theatre_wall', 'wildwest_saloonwall', 'vikings_wall_g', 'vikings_wall_r', 'sand_cstl_wall',
  'jungle_c16_wall', 'val14_b_wall', 'anc_sunset_wall'
];

async function main() {
  const commit = process.argv.includes('--commit');
  if (!getApps().length) initializeApp({ credential: applicationDefault() });
  const db = getFirestore();

  const ids = WALL_CLASSNAMES.map(cn => `room_${cn}`);
  console.log(`판매 중단 대상: ${ids.length}건 (벽 꾸미기)`);
  if (!commit) {
    ids.slice(0, 5).forEach(id => console.log('  (예시)', id));
    console.log('\ndry-run 완료 — 실제 반영은 --commit 으로 실행');
    return;
  }

  const batch = db.batch();
  let found = 0;
  for (const id of ids) {
    const ref = db.collection('shopItems').doc(id);
    const snap = await ref.get();
    if (!snap.exists) continue;
    found += 1;
    batch.set(ref, {
      enabled: false,
      retiredAt: FieldValue.serverTimestamp(),
      retiredReason: 'wall-items-removed-2026-07-13'
    }, { merge: true });
  }
  await batch.commit();
  console.log(`✅ ${found}건 enabled:false 처리 완료`);
}

main().catch(err => { console.error(err); process.exit(1); });
