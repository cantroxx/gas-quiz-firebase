#!/usr/bin/env node

// 하우징 가구·벽지를 shopItems 컬렉션에 등록 (purchaseHousingItem이 가격·판매 여부를 여기서 읽음)
//
// - 아이템 ID는 room_ 접두사 (가구: room_<classname>, 벽지·바닥: room_paper_<wall|floor>_<id>)
//   ※ room_ 접두사와 '방 가구' 카테고리는 퀴즈타운 메인 상점 화면에서 자동으로 숨겨진다
//   (shop-data.js의 isRetiredShopCatalogItem 필터) — 하우징 안에서만 팔리게 하는 의도된 재활용.
// - 목록·가격은 public/housing/app.js의 CATALOG_ITEMS·PAPER_ITEMS에서 그대로 추출한다.
// - 이미 있는 문서는 가격·이름·정렬만 갱신(merge)하고 enabled 등 교사가 바꾼 값은 유지한다.
//
// 사용법:
//   GOOGLE_APPLICATION_CREDENTIALS=service-account.json node scripts/seed/seed-housing-shop-items.js            # 미리보기
//   GOOGLE_APPLICATION_CREDENTIALS=service-account.json node scripts/seed/seed-housing-shop-items.js --commit   # 실제 등록

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { initializeApp, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const APP_JS_PATH = path.resolve(__dirname, '..', '..', 'public', 'housing', 'app.js');

function extractBlock(source, constName) {
  const start = source.indexOf(`const ${constName} = [`);
  if (start === -1) throw new Error(`${constName} 블록을 찾을 수 없습니다`);
  const end = source.indexOf('\n];', start);
  if (end === -1) throw new Error(`${constName} 블록의 끝을 찾을 수 없습니다`);
  return source.slice(start, end + 3);
}

function extractPushBlock(source) {
  // 2026-07-09 확장 가구 102종은 CATALOG_ITEMS.push( ... ); 형태로 추가돼 있음
  const start = source.indexOf('CATALOG_ITEMS.push(');
  if (start === -1) throw new Error('CATALOG_ITEMS.push 블록을 찾을 수 없습니다');
  const end = source.indexOf('\n);', start);
  if (end === -1) throw new Error('CATALOG_ITEMS.push 블록의 끝을 찾을 수 없습니다');
  return source.slice(start, end + 3);
}

function loadHousingCatalog() {
  const source = fs.readFileSync(APP_JS_PATH, 'utf8');
  // 벽지 목록(PAPER_ITEMS)은 WALL/FLOOR_THEMES를 참조하므로 함께 추출해 격리 실행
  const code = [
    extractBlock(source, 'WALL_THEMES'),
    extractBlock(source, 'FLOOR_THEMES'),
    extractBlock(source, 'CATALOG_ITEMS'),
    extractPushBlock(source),
    extractBlock(source, 'PAPER_ITEMS'),
    'result = { CATALOG_ITEMS, PAPER_ITEMS };'
  ].join('\n');
  const sandbox = { result: null };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.result;
}

function buildShopDocs({ CATALOG_ITEMS, PAPER_ITEMS }) {
  const docs = [];
  CATALOG_ITEMS.forEach((item, index) => {
    docs.push({
      id: `room_${item.classname}`,
      data: {
        itemId: `room_${item.classname}`,
        name: item.name,
        desc: item.desc || '',
        price: Number(item.cost) || 0,
        category: '방 가구',
        priceType: 'djCoin',
        housing: true,
        housingType: 'furni',
        classname: item.classname,
        sortOrder: index + 1
      }
    });
  });
  PAPER_ITEMS.forEach((item, index) => {
    const kind = item.paper === 'wall' ? '벽지' : '바닥';
    docs.push({
      id: `room_paper_${item.paper}_${item.themeId}`,
      data: {
        itemId: `room_paper_${item.paper}_${item.themeId}`,
        name: `${kind} — ${item.name}`,
        desc: item.desc || '',
        price: Number(item.cost) || 0,
        category: '방 가구',
        priceType: 'djCoin',
        housing: true,
        housingType: 'paper',
        paper: item.paper,
        themeId: item.themeId,
        sortOrder: 1000 + index
      }
    });
  });
  return docs;
}

async function main() {
  const commit = process.argv.includes('--commit');
  const docs = buildShopDocs(loadHousingCatalog());

  console.log(`등록 대상: 가구 ${docs.filter(d => d.data.housingType === 'furni').length}종 + 벽지·바닥 ${docs.filter(d => d.data.housingType === 'paper').length}종 = 총 ${docs.length}건`);
  docs.slice(0, 5).forEach(d => console.log(`  (예시) ${d.id} — ${d.data.name}, ${d.data.price}코인`));

  if (!commit) {
    console.log('dry-run 완료 — 실제 등록은 --commit 으로 실행');
    return;
  }

  if (!getApps().length) initializeApp({ credential: applicationDefault() });
  const db = getFirestore();

  // 기존 문서를 먼저 확인 — enabled는 처음 등록될 때만 true로 넣는다
  // (교사가 판매 중지(enabled:false)한 아이템을 재실행이 되살리지 않게)
  const refs = docs.map(doc => db.collection('shopItems').doc(doc.id));
  const snapshots = await db.getAll(...refs);
  const existingIds = new Set(snapshots.filter(s => s.exists).map(s => s.id));

  let batch = db.batch();
  let written = 0;
  let created = 0;
  for (const doc of docs) {
    const ref = db.collection('shopItems').doc(doc.id);
    const data = { ...doc.data, updatedAt: FieldValue.serverTimestamp() };
    if (!existingIds.has(doc.id)) {
      data.enabled = true;
      data.createdAt = FieldValue.serverTimestamp();
      created += 1;
    }
    batch.set(ref, data, { merge: true });
    written += 1;
    if (written % 200 === 0) { await batch.commit(); batch = db.batch(); }
  }
  await batch.commit();
  console.log(`shopItems ${written}건 등록/갱신 완료 (신규 ${created}건)`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
