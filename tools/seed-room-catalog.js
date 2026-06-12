/* ============================================================
 * 가구 카탈로그 + 상점 시딩 스크립트 (seed-room-catalog.js)
 * 실행 위치: 저장소 루트 (functions/ 아님)
 *   node tools/seed-room-catalog.js
 * 사전 준비:
 *   npm i firebase-admin (또는 functions의 node_modules 재사용)
 *   GOOGLE_APPLICATION_CREDENTIALS 환경변수에 서비스 계정 키 경로 설정
 *   또는 `firebase login` 상태에서 GCLOUD_PROJECT=dj48-quiztown-firebase
 * 멱등성: 같은 ID로 set(merge)하므로 여러 번 실행해도 안전
 * ============================================================ */
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'dj48-quiztown-firebase' });
const db = admin.firestore();

/* 무료 가구: assetCatalog에만 등록 (인벤토리 체크 생략 대상) */
/* 유료 가구: assetCatalog + shopItems 동시 등록 → purchaseShopItem 재사용 */
const CATALOG = [
  { id: 'room_bed',      name: '침대',        cat: 'furniture', w: 1, d: 2, h: 24, drawKey: 'bed',      free: true,  sortOrder: 10 },
  { id: 'room_desk',     name: '책상',        cat: 'furniture', w: 2, d: 1, h: 34, drawKey: 'desk',     free: true,  sortOrder: 20 },
  { id: 'room_chair',    name: '의자',        cat: 'furniture', w: 1, d: 1, h: 44, drawKey: 'chair',    free: true,  sortOrder: 30 },
  { id: 'room_shelf',    name: '책장',        cat: 'furniture', w: 1, d: 1, h: 60, drawKey: 'shelf',    free: true,  sortOrder: 40 },
  { id: 'room_piano',    name: '피아노',      cat: 'furniture', w: 2, d: 1, h: 36, drawKey: 'piano',    free: false, price: 150, sortOrder: 50 },
  { id: 'room_rug',      name: '러그',        cat: 'deco', w: 2, d: 2, h: 4, flat: true, drawKey: 'rug', free: true, sortOrder: 10 },
  { id: 'room_plant',    name: '화분',        cat: 'deco', w: 1, d: 1, h: 42, drawKey: 'plant',    free: true,  sortOrder: 20 },
  { id: 'room_lamp',     name: '램프',        cat: 'deco', w: 1, d: 1, h: 62, drawKey: 'lamp',     free: true,  sortOrder: 30 },
  { id: 'room_bear',     name: '곰인형',      cat: 'deco', w: 1, d: 1, h: 40, drawKey: 'bear',     free: true,  sortOrder: 40 },
  { id: 'room_tv',       name: 'TV',          cat: 'deco', w: 1, d: 1, h: 36, drawKey: 'tv',       free: false, price: 80,  sortOrder: 50 },
  { id: 'room_aquarium', name: '어항',        cat: 'deco', w: 1, d: 1, h: 38, drawKey: 'aquarium', free: false, price: 100, sortOrder: 60 },
  { id: 'room_trophy',   name: '황금 트로피', cat: 'deco', w: 1, d: 1, h: 48, drawKey: 'trophy',   free: false, price: 60,  sortOrder: 70 },
];

async function main() {
  const batch = db.batch();

  for (const it of CATALOG) {
    // 1) assetCatalog — 클라이언트가 읽는 가구 메타 (type으로 필터)
    batch.set(db.collection('assetCatalog').doc(it.id), {
      type: 'roomFurniture',
      name: it.name, cat: it.cat,
      w: it.w, d: it.d, h: it.h,
      flat: !!it.flat, drawKey: it.drawKey,
      free: !!it.free, price: it.price || 0,
      sortOrder: it.sortOrder,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // 2) shopItems — 유료 아이템만 (purchaseShopItem 트랜잭션 대상)
    //    운영 스키마 확인 완료: enabled === true 필수, priceType은 'djCoin'만 허용,
    //    assetId는 인벤토리/구매로그에 복사됨 → assetCatalog 문서 ID를 그대로 사용
    if (!it.free) {
      batch.set(db.collection('shopItems').doc(it.id), {
        itemId: it.id,
        name: it.name,
        price: it.price,
        priceType: 'djCoin',
        enabled: true,
        assetId: it.id,            // assetCatalog/{id} 참조
        category: '방 가구',        // 기존 상점 카테고리('배경','아바타','방 장식' 등)와 구분
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }

  await batch.commit();
  console.log(`✅ assetCatalog ${CATALOG.length}건, shopItems ${CATALOG.filter(i => !i.free).length}건 시딩 완료`);
}

main().catch(e => { console.error(e); process.exit(1); });
