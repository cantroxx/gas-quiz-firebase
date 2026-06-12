/* ============================================================
 * DJ48 퀴즈타운 — 내 방 꾸미기 모듈 (room.js)
 * - 모든 가구/배경은 SVG 코드로 생성 (외부 이미지 없음)
 * - 데이터: userRoomSettings / userInventory / userEconomy / shopItems / assetCatalog
 * - 구매: callable purchaseShopItem (기존 트랜잭션 재사용)
 * 사용법:
 *   RoomDecor.init({ getUserId, onBack });   // 앱 부팅 시 1회
 *   RoomDecor.open();                        // "내 방 꾸미기" 버튼에서 호출
 *   RoomDecor.close();                       // room-view 이탈 시 호출
 * ============================================================ */
window.RoomDecor = (function () {
  'use strict';

  /* ---------- 설정 (운영 코드 대조 완료: 2026-06-12) ---------- */
  const CONFIG = {
    REGION: 'asia-northeast3',
    GRID: 8,
    COL_ROOM: 'userRoomSettings',       // 기존 selected* 필드와 공존 — homeRoom 맵에 격리 저장
    ROOM_FIELD: 'homeRoom',             // userRoomSettings/{uid}.homeRoom = {floor, wall, placed}
    COL_INVENTORY: 'userInventory',     // userInventory/{memberUserId}/items/{itemId}
    COL_ECONOMY: 'userEconomy',         // 코인 필드: djCoin (레거시 폴백: coin) — purchaseShopItem과 동일
    COL_CATALOG: 'assetCatalog',        // 가구 메타 (없으면 내장 기본값 사용)
    CATALOG_TYPE: 'roomFurniture',
    PURCHASE_FN: 'purchaseShopItem',    // 파라미터: { memberUserId, itemId } (운영 시그니처 확인됨)
    SAVE_DEBOUNCE_MS: 800,
    MIN_ZOOM: 0.75,
    MAX_ZOOM: 1.45,
    ZOOM_STEP: 0.1,
  };
  // getUserId는 운영 코드의 getCurrentDataOwnerId()를 연결할 것 (memberUserId = 'G학년-C반-N번호')
  // userEconomy/userInventory/userRoomSettings 문서 키와 동일한 ID 체계.

  /* ---------- 아이소메트릭 헬퍼 ---------- */
  const TW2 = 34, TH2 = 17, WALL_H = 112;
  const C = (x, y, z = 0) => [(x - y) * TW2, (x + y) * TH2 - z];
  const P = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const poly = (pts, fill, op) =>
    `<polygon points="${P(pts)}" fill="${fill}"${op ? ` fill-opacity="${op}"` : ''} stroke="#2a201a" stroke-opacity="0.18" stroke-width="1"/>`;
  function box(gx, gy, w, d, z, h, c, op) {
    const N = C(gx, gy, z + h), E = C(gx + w, gy, z + h),
          S = C(gx + w, gy + d, z + h), W = C(gx, gy + d, z + h);
    const E0 = C(gx + w, gy, z), S0 = C(gx + w, gy + d, z), W0 = C(gx, gy + d, z);
    return poly([W, S, S0, W0], c.l, op) + poly([S, E, E0, S0], c.r, op) + poly([N, E, S, W], c.t, op);
  }
  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) * f), g = Math.min(255, ((n >> 8) & 255) * f),
          b = Math.min(255, (n & 255) * f);
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  };
  const col = hex => ({ t: shade(hex, 1.12), r: shade(hex, 0.92), l: shade(hex, 0.74) });
  function orientRect(baseW, baseD, rot, lx, ly, w, d) {
    const rotation = ((Math.round(Number(rot) || 0) % 360) + 360) % 360;
    if (rotation === 90) return { x: baseD - ly - d, y: lx, w: d, d: w };
    if (rotation === 180) return { x: baseW - lx - w, y: baseD - ly - d, w, d };
    if (rotation === 270) return { x: ly, y: baseW - lx - w, w: d, d: w };
    return { x: lx, y: ly, w, d };
  }
  function obox(gx, gy, baseW, baseD, rot, lx, ly, w, d, z, h, c, op) {
    const rect = orientRect(baseW, baseD, rot, lx, ly, w, d);
    return box(gx + rect.x, gy + rect.y, rect.w, rect.d, z, h, c, op);
  }
  function wallRect(wall, u, z, w, h, fill, op) {
    const pts = wall === 'right'
      ? [C(u, 0, z + h), C(u + w, 0, z + h), C(u + w, 0, z), C(u, 0, z)]
      : [C(0, u, z + h), C(0, u + w, z + h), C(0, u + w, z), C(0, u, z)];
    return poly(pts, fill, op);
  }

  /* ---------- 가구 드로잉 ---------- */
  const DRAW = {
    bed(x, y, rot = 0) {
      return obox(x, y, 1, 2, rot, 0, 0, 1, 2, 0, 10, col('#a9743f'))
        + obox(x, y, 1, 2, rot, .05, .05, .9, 1.9, 10, 6, col('#f4efe2'))
        + obox(x, y, 1, 2, rot, .05, .8, .9, 1.13, 16, 5, col('#e2574c'))
        + obox(x, y, 1, 2, rot, .16, .14, .68, .44, 16, 6, col('#ffffff'));
    },
    desk(x, y, rot = 0) {
      let s = '';
      [[.06, .06], [1.7, .06], [.06, .72], [1.7, .72]].forEach(([a, b]) =>
        s += obox(x, y, 2, 1, rot, a, b, .14, .14, 0, 24, col('#7a5430')));
      s += obox(x, y, 2, 1, rot, 0, 0, 2, 1, 24, 7, col('#c89a62'));
      s += obox(x, y, 2, 1, rot, .25, .2, .55, .4, 31, 3, col('#5b87b8'));
      return s;
    },
    chair(x, y, rot = 0) {
      return obox(x, y, 1, 1, rot, .32, .32, .36, .36, 0, 13, col('#6b4a2e'))
        + obox(x, y, 1, 1, rot, .1, .1, .8, .8, 13, 6, col('#5fa3d8'))
        + obox(x, y, 1, 1, rot, .1, .1, .8, .16, 19, 24, col('#4a8cc0'));
    },
    shelf(x, y, rot = 0) {
      let s = obox(x, y, 1, .5, rot, 0, 0, 1, .5, 0, 58, col('#9a6a3c'));
      const fy = y + .5, books = ['#e2574c', '#4f9dd6', '#f0b840', '#69b56b', '#9b6fc9', '#e58fb0'];
      [8, 26, 44].forEach((z0, row) => {
        s += poly([C(x + .06, fy, z0 - 2), C(x + .94, fy, z0 - 2), C(x + .94, fy, z0 + 13), C(x + .06, fy, z0 + 13)], '#5e3c1e');
        let bx = x + .1;
        for (let k = 0; k < 4; k++) {
          const bw = .17 + ((row + k) % 3) * .015;
          s += poly([C(bx, fy, z0), C(bx + bw, fy, z0), C(bx + bw, fy, z0 + 12), C(bx, fy, z0 + 12)], books[(row * 2 + k) % books.length]);
          bx += bw + .025;
        }
      });
      return s;
    },
    window(x, y, rot = 0, item = {}) {
      const wall = item.wall || 'left';
      const u = Number(item.wx ?? 2.2);
      const z = Number(item.wz ?? 36);
      const w = Number(catalog[item.type]?.ww || 2.6);
      const h = Number(catalog[item.type]?.wh || 50);
      const mid = u + w / 2;
      return wallRect(wall, u, z, w, h, '#9fd9f0')
        + wallRect(wall, u, z + h - 4, w, 4, '#ffffff')
        + wallRect(wall, mid - .04, z, .08, h, '#ffffff')
        + wallRect(wall, u + .5, z + h - 22, .5, 8, '#ffe27a');
    },
    frame(x, y, rot = 0, item = {}) {
      const wall = item.wall || 'right';
      const u = Number(item.wx ?? 2.4);
      const z = Number(item.wz ?? 52);
      const w = Number(catalog[item.type]?.ww || 1.8);
      const h = Number(catalog[item.type]?.wh || 32);
      return wallRect(wall, u, z, w, h, '#a9743f')
        + wallRect(wall, u + .15, z + 4, Math.max(.2, w - .3), Math.max(4, h - 8), '#cfe9d8')
        + wallRect(wall, u + .25, z + 4, .55, 12, '#69b56b')
        + wallRect(wall, u + .8, z + 4, .45, 8, '#79bd7b');
    },
    plant(x, y) {
      let s = box(x + .3, y + .3, .4, .4, 0, 13, col('#c1683f'))
        + box(x + .26, y + .26, .48, .48, 13, 4, col('#d57a4c'));
      const [cx, cy] = C(x + .5, y + .5, 30);
      s += `<ellipse cx="${cx - 8}" cy="${cy + 3}" rx="11" ry="9" fill="#4d8f4f"/>`
        + `<ellipse cx="${cx + 8}" cy="${cy + 2}" rx="11" ry="9" fill="#5fa35f"/>`
        + `<ellipse cx="${cx}" cy="${cy - 7}" rx="12" ry="10" fill="#6db86b"/>`
        + `<ellipse cx="${cx - 3}" cy="${cy - 10}" rx="5" ry="4" fill="#8ecf8a"/>`;
      return s;
    },
    rug(x, y) {
      return poly([C(x, y, 1), C(x + 2, y, 1), C(x + 2, y + 2, 1), C(x, y + 2, 1)], '#e8a0b4')
        + poly([C(x + .22, y + .22, 1.5), C(x + 1.78, y + .22, 1.5), C(x + 1.78, y + 1.78, 1.5), C(x + .22, y + 1.78, 1.5)], '#f5c6d3')
        + poly([C(x + .8, y + .8, 2), C(x + 1.2, y + .8, 2), C(x + 1.2, y + 1.2, 2), C(x + .8, y + 1.2, 2)], '#e8a0b4');
    },
    lamp(x, y) {
      let s = box(x + .33, y + .33, .34, .34, 0, 5, col('#4a3a5a'))
        + box(x + .46, y + .46, .09, .09, 5, 40, col('#5a4a6a'));
      const [gx2, gy2] = C(x + .5, y + .5, 52);
      s += `<ellipse cx="${gx2}" cy="${gy2}" rx="30" ry="18" fill="#ffe9a8" fill-opacity="0.22"/>`;
      s += box(x + .24, y + .24, .52, .52, 45, 15, col('#ffd66e'));
      return s;
    },
    bear(x, y) {
      const [cx, cy] = C(x + .5, y + .55, 0);
      return `<ellipse cx="${cx}" cy="${cy + 2}" rx="16" ry="7" fill="#000" fill-opacity="0.15"/>`
        + `<circle cx="${cx - 13}" cy="${cy - 12}" r="6" fill="#b98850"/>`
        + `<circle cx="${cx + 13}" cy="${cy - 12}" r="6" fill="#b98850"/>`
        + `<ellipse cx="${cx}" cy="${cy - 12}" rx="13" ry="14" fill="#c79760"/>`
        + `<ellipse cx="${cx}" cy="${cy - 8}" rx="8" ry="9" fill="#e8cfa6"/>`
        + `<circle cx="${cx - 9}" cy="${cy - 31}" r="5" fill="#b98850"/>`
        + `<circle cx="${cx + 9}" cy="${cy - 31}" r="5" fill="#b98850"/>`
        + `<circle cx="${cx}" cy="${cy - 26}" r="11" fill="#c79760"/>`
        + `<ellipse cx="${cx}" cy="${cy - 23}" rx="5.5" ry="4.5" fill="#e8cfa6"/>`
        + `<circle cx="${cx - 4}" cy="${cy - 28}" r="1.6" fill="#3a2f28"/>`
        + `<circle cx="${cx + 4}" cy="${cy - 28}" r="1.6" fill="#3a2f28"/>`
        + `<circle cx="${cx}" cy="${cy - 24}" r="1.8" fill="#3a2f28"/>`;
    },
    tv(x, y, rot = 0) {
      let s = obox(x, y, 1, 1, rot, .12, .4, .76, .3, 0, 7, col('#5a4a3a'))
        + obox(x, y, 1, 1, rot, .05, .5, .9, .1, 7, 27, col('#3a3a44'));
      s += obox(x, y, 1, 1, rot, .1, .58, .8, .04, 11, 19, col('#7fe3e8'), .82);
      return s;
    },
    aquarium(x, y) {
      let s = box(x + .1, y + .1, .8, .8, 0, 13, col('#8a5f33'))
        + box(x + .13, y + .13, .74, .74, 13, 19, col('#9fd4ef'), .55);
      const [cx, cy] = C(x + .5, y + .5, 22);
      s += `<ellipse cx="${cx}" cy="${cy}" rx="6" ry="4" fill="#ff8c42"/>`
        + `<polygon points="${cx + 5},${cy} ${cx + 10},${cy - 4} ${cx + 10},${cy + 4}" fill="#ff8c42"/>`
        + `<circle cx="${cx - 3}" cy="${cy - 1}" r="1" fill="#3a2f28"/>`
        + `<circle cx="${cx + 4}" cy="${cy - 9}" r="1.5" fill="#fff" fill-opacity="0.7"/>`
        + `<circle cx="${cx + 7}" cy="${cy - 13}" r="1.2" fill="#fff" fill-opacity="0.6"/>`;
      s += box(x + .11, y + .11, .78, .78, 32, 2, col('#b9e2f5'), .8);
      return s;
    },
    trophy(x, y) {
      let s = box(x + .26, y + .26, .48, .48, 0, 11, col('#5a4a8a'));
      const [cx, cy] = C(x + .5, y + .5, 11);
      s += `<rect x="${cx - 3}" y="${cy - 14}" width="6" height="12" fill="#caa53d"/>`
        + `<path d="M ${cx - 11} ${cy - 32} L ${cx + 11} ${cy - 32} L ${cx + 8} ${cy - 14} L ${cx - 8} ${cy - 14} Z" fill="#ffd23f"/>`
        + `<ellipse cx="${cx}" cy="${cy - 32}" rx="11" ry="4" fill="#ffe27a"/>`
        + `<path d="M ${cx - 11} ${cy - 30} q -9 2 -2 11" stroke="#ffd23f" stroke-width="3" fill="none"/>`
        + `<path d="M ${cx + 11} ${cy - 30} q 9 2 2 11" stroke="#ffd23f" stroke-width="3" fill="none"/>`
        + `<circle cx="${cx - 4}" cy="${cy - 27}" r="2" fill="#fff" fill-opacity="0.85"/>`;
      return s;
    },
    piano(x, y, rot = 0) {
      let s = obox(x, y, 2, .96, rot, 0, 0, 2, .72, 0, 34, col('#33333d'))
        + obox(x, y, 2, .96, rot, .05, .72, 1.9, .24, 20, 6, col('#f5f1e6'));
      for (let k = 0; k < 7; k++)
        s += obox(x, y, 2, .96, rot, .17 + k * .26, .73, .1, .13, 26, 2, col('#26262e'));
      s += obox(x, y, 2, .96, rot, .3, .72, .45, .05, 30, 3, col('#ffd23f'), .8);
      return s;
    },
  };

  /* ---------- 기본 카탈로그 (assetCatalog 미시딩 시 폴백) ---------- */
  const DEFAULT_CATALOG = [
    { id: 'room_bed',      name: '침대',       cat: 'furniture', w: 1, d: 2, h: 24, drawKey: 'bed',      free: true },
    { id: 'room_desk',     name: '책상',       cat: 'furniture', w: 2, d: 1, h: 34, drawKey: 'desk',     free: true },
    { id: 'room_chair',    name: '의자',       cat: 'furniture', w: 1, d: 1, h: 44, drawKey: 'chair',    free: true },
    { id: 'room_shelf',    name: '책장',       cat: 'furniture', w: 1, d: 1, h: 60, drawKey: 'shelf',    free: true },
    { id: 'room_piano',    name: '피아노',     cat: 'furniture', w: 2, d: 1, h: 36, drawKey: 'piano',    free: false, price: 150 },
    { id: 'room_window',   name: '창문',       cat: 'deco', w: 1, d: 1, h: 50, surface: 'wall', wall: 'left',  ww: 2.6, wh: 50, drawKey: 'window', free: true, sortOrder: 5 },
    { id: 'room_frame',    name: '액자',       cat: 'deco', w: 1, d: 1, h: 32, surface: 'wall', wall: 'right', ww: 1.8, wh: 32, drawKey: 'frame',  free: true, sortOrder: 6 },
    { id: 'room_rug',      name: '러그',       cat: 'deco', w: 2, d: 2, h: 4, flat: true, drawKey: 'rug', free: true },
    { id: 'room_plant',    name: '화분',       cat: 'deco', w: 1, d: 1, h: 42, drawKey: 'plant',    free: true },
    { id: 'room_lamp',     name: '램프',       cat: 'deco', w: 1, d: 1, h: 62, drawKey: 'lamp',     free: true },
    { id: 'room_bear',     name: '곰인형',     cat: 'deco', w: 1, d: 1, h: 40, drawKey: 'bear',     free: true },
    { id: 'room_tv',       name: 'TV',         cat: 'deco', w: 1, d: 1, h: 36, drawKey: 'tv',       free: false, price: 80 },
    { id: 'room_aquarium', name: '어항',       cat: 'deco', w: 1, d: 1, h: 38, drawKey: 'aquarium', free: false, price: 100 },
    { id: 'room_trophy',   name: '황금 트로피', cat: 'deco', w: 1, d: 1, h: 48, drawKey: 'trophy',   free: false, price: 60 },
  ];
  const FLOORS = {
    wood:  { a: '#caa06b', b: '#bb9059', name: '원목' },
    mint:  { a: '#bfe6c8', b: '#a8d9b4', name: '민트' },
    lav:   { a: '#d6c8ee', b: '#c5b3e4', name: '라벤더' },
    check: { a: '#f2e3c9', b: '#86c9c2', name: '체크' },
  };
  const WALLS = {
    cream: { l: '#e6d2ab', r: '#f2e2c4', name: '크림' },
    blue:  { l: '#b9d4e8', r: '#cfe3f2', name: '하늘' },
    pink:  { l: '#ecc3d2', r: '#f7d8e3', name: '분홍' },
    green: { l: '#bdd9b4', r: '#d2e8ca', name: '연두' },
  };
  const DEFAULT_ROOM = {
    floor: 'wood', wall: 'cream',
    placed: [],
  };

  /* ---------- 모듈 상태 ---------- */
  let db = null, fns = null, getUserId = null, onBack = null;
  let catalog = {};           // id -> 정의
  let owned = new Set();      // 보유 아이템 id
  let coins = 0;
  let room = null;            // {floor, wall, placed}
  let nextId = 1;
  let placingType = null, movingId = null, selectedId = null, hover = null;
  let zoom = 1;
  let curTab = 'furniture';
  let unsubs = [], saveTimer = null, opened = false;
  let $view, $svg, $grid, $styleGrid, $coin, $tip, $bar, $toast, $zoomLabel;
  let toastTimer = null;

  /* ---------- Firestore ---------- */
  async function loadCatalog() {
    catalog = {};
    DEFAULT_CATALOG.forEach(it => catalog[it.id] = { ...it });
    try {
      const snap = await db.collection(CONFIG.COL_CATALOG)
        .where('type', '==', CONFIG.CATALOG_TYPE).get();
      snap.forEach(doc => {
        const d = doc.data();
        if (d.drawKey && DRAW[d.drawKey]) catalog[doc.id] = { id: doc.id, ...d };
      });
    } catch (e) { console.warn('[room] assetCatalog 로드 실패, 기본 카탈로그 사용', e); }
  }
  async function loadRoom(uid) {
    try {
      const doc = await db.collection(CONFIG.COL_ROOM).doc(uid).get();
      const d = doc.exists ? (doc.data() || {})[CONFIG.ROOM_FIELD] : null;
      room = (d && Array.isArray(d.placed))
        ? { floor: d.floor || 'wood', wall: d.wall || 'cream', placed: d.placed }
        : JSON.parse(JSON.stringify(DEFAULT_ROOM));
    } catch (e) {
      console.warn('[room] userRoomSettings 로드 실패', e);
      room = JSON.parse(JSON.stringify(DEFAULT_ROOM));
    }
    nextId = room.placed.reduce((m, p) => Math.max(m, p.id || 0), 0) + 1;
  }
  function watchEconomy(uid) {
    unsubs.push(db.collection(CONFIG.COL_ECONOMY).doc(uid).onSnapshot(doc => {
      const d = (doc.exists && doc.data()) || {};
      coins = Number(d.djCoin ?? d.coin ?? 0) || 0; // purchaseShopItem과 동일한 폴백 규칙
      if ($coin) $coin.textContent = coins.toLocaleString();
      if (curTab !== 'style') renderSidebar(); // 구매 가능 여부 갱신
    }, e => console.warn('[room] userEconomy 구독 실패', e)));
  }
  function watchInventory(uid) {
    unsubs.push(db.collection(CONFIG.COL_INVENTORY).doc(uid).collection('items')
      .onSnapshot(snap => {
        owned = new Set();
        snap.forEach(doc => owned.add(doc.id));
        if (curTab !== 'style') renderSidebar();
      }, e => console.warn('[room] userInventory 구독 실패', e)));
  }
  function isOwned(id) { return catalog[id] && (catalog[id].free || owned.has(id)); }
  function isWallItem(type) {
    const it = catalog[type];
    return !!it && (it.surface === 'wall' || it.drawKey === 'window' || it.drawKey === 'frame');
  }
  function normalizeWall(value) {
    return value === 'right' ? 'right' : 'left';
  }
  function getRotation(value) {
    const rot = Math.round(Number(value) || 0) % 360;
    return rot < 0 ? rot + 360 : rot;
  }
  function getFootprint(type, rot) {
    const it = catalog[type];
    const rotation = getRotation(rot);
    if (!it) return { w: 0, d: 0 };
    if (isWallItem(type)) return { w: 0, d: 0 };
    if (!canRotateItem(type)) return { w: it.w, d: it.d };
    return rotation === 90 || rotation === 270
      ? { w: it.d, d: it.w }
      : { w: it.w, d: it.d };
  }
  function canRotateItem(type) {
    const drawKey = catalog[type]?.drawKey || '';
    return ['bed', 'desk', 'chair', 'shelf', 'piano', 'tv', 'rug'].includes(drawKey);
  }
  function normalizePlacedItem(item) {
    if (isWallItem(item.type) || item.surface === 'wall') {
      const it = catalog[item.type] || {};
      return {
        id: item.id,
        type: item.type,
        surface: 'wall',
        wall: normalizeWall(item.wall || it.wall),
        wx: Number(item.wx ?? 2),
        wz: Number(item.wz ?? 42),
        rot: 0
      };
    }
    return {
      id: item.id,
      type: item.type,
      gx: item.gx,
      gy: item.gy,
      rot: getRotation(item.rot)
    };
  }
  function roomPayload() {
    return {
      [CONFIG.ROOM_FIELD]: { floor: room.floor, wall: room.wall, placed: room.placed.map(normalizePlacedItem) },
      userId: getUserId(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const uid = getUserId();
      if (!uid) return;
      try {
        await db.collection(CONFIG.COL_ROOM).doc(uid).set(roomPayload(), { merge: true });
      } catch (e) {
        console.error('[room] 저장 실패', e);
        showToast('저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
      }
    }, CONFIG.SAVE_DEBOUNCE_MS);
  }
  async function purchase(id) {
    const it = catalog[id];
    if (coins < it.price) { showToast(`DJ코인이 부족해요! (${(it.price - coins).toLocaleString()}개 더 필요)`); return; }
    try {
      showToast('구매 중...');
      // 운영 시그니처: { memberUserId, itemId } — index.html:7251 클라이언트 호출부와 동일
      await fns.httpsCallable(CONFIG.PURCHASE_FN)({ memberUserId: getUserId(), itemId: id });
      owned.add(id);
      selectedId = null;
      movingId = null;
      placingType = id;
      setTip(`「${it.name}」 구매 완료! 놓을 ${isWallItem(id) ? '벽 위치' : '바닥 칸'}을 눌러 배치하세요`);
      renderSidebar();
      render();
      showToast(`🎉 ${it.name} 구매 완료!`);
    } catch (e) {
      console.error('[room] 구매 실패', e);
      const code = e && e.code;
      const message = String(e && e.message || '');
      showToast(code === 'functions/not-found' ? '상품 정보가 아직 등록되지 않았어요.'
        : code === 'functions/failed-precondition' && message.includes('disabled') ? '지금은 판매 중지된 가구예요.'
        : code === 'functions/failed-precondition' && message.includes('Not enough') ? 'DJ코인이 부족해요.'
        : code === 'functions/failed-precondition' ? '구매 조건을 확인해 주세요.'
        : code === 'functions/already-exists' ? '이미 가지고 있는 아이템이에요!'
        : '구매에 실패했어요.');
    }
  }

  /* ---------- 배치 검사 ---------- */
  function fits(type, gx, gy, ignoreId) {
    if (isWallItem(type)) return false;
    const moving = room.placed.find(p => p.id === ignoreId);
    return fitsWithRotation(type, gx, gy, moving ? moving.rot : 0, ignoreId);
  }
  function fitsWithRotation(type, gx, gy, rot = 0, ignoreId) {
    const it = catalog[type];
    if (!it) return false;
    if (isWallItem(type)) return false;
    const fp = getFootprint(type, rot);
    if (gx < 0 || gy < 0 || gx + fp.w > CONFIG.GRID || gy + fp.d > CONFIG.GRID) return false;
    return !room.placed.some(p => {
      if (p.id === ignoreId) return false;
      const o = catalog[p.type];
      if (isWallItem(p.type)) return false;
      if (!o || !!o.flat !== !!it.flat) return false;
      const ofp = getFootprint(p.type, p.rot);
      return gx < p.gx + ofp.w && gx + fp.w > p.gx && gy < p.gy + ofp.d && gy + fp.d > p.gy;
    });
  }
  function getWallSize(type) {
    const it = catalog[type] || {};
    return {
      w: Math.max(.5, Math.min(CONFIG.GRID, Number(it.ww || it.w || 1.8))),
      h: Math.max(10, Math.min(WALL_H - 8, Number(it.wh || it.h || 32)))
    };
  }
  function fitsWall(type, wall, wx, wz, ignoreId) {
    if (!isWallItem(type)) return false;
    const size = getWallSize(type);
    const u = Number(wx), z = Number(wz);
    if (!Number.isFinite(u) || !Number.isFinite(z)) return false;
    if (u < .25 || u + size.w > CONFIG.GRID - .25 || z < 12 || z + size.h > WALL_H - 8) return false;
    return !room.placed.some(p => {
      if (p.id === ignoreId || !isWallItem(p.type)) return false;
      if (normalizeWall(p.wall) !== normalizeWall(wall)) return false;
      const other = getWallSize(p.type);
      const pu = Number(p.wx ?? 0), pz = Number(p.wz ?? 0);
      return u < pu + other.w && u + size.w > pu && z < pz + other.h && z + size.h > pz;
    });
  }
  function wallSlots() {
    const slots = [];
    ['left', 'right'].forEach(wall => {
      [1, 3.2, 5.4].forEach(wx => {
        [30, 62].forEach(wz => slots.push({ wall, wx, wz }));
      });
    });
    return slots;
  }
  function getHoverItem(type, item) {
    if (!type || !item) return null;
    if (isWallItem(type)) {
      const it = catalog[type] || {};
      return {
        type,
        surface: 'wall',
        wall: normalizeWall(item.wall || it.wall),
        wx: Number(item.wx ?? 2),
        wz: Number(item.wz ?? 42),
        rot: 0
      };
    }
    return { type, gx: item.gx, gy: item.gy, rot: item.rot || 0 };
  }

  /* ---------- 렌더링 ---------- */
  function getObjectMarkup(item) {
    const it = catalog[item.type];
    if (!it) return '';
    const rot = getRotation(item.rot);
    return DRAW[it.drawKey](item.gx || 0, item.gy || 0, canRotateItem(item.type) ? rot : 0, item);
  }
  function applyZoom() {
    if (!$svg) return;
    $svg.style.transform = `scale(${zoom.toFixed(2)})`;
    if ($zoomLabel) $zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  }
  function setZoom(nextZoom) {
    zoom = Math.min(CONFIG.MAX_ZOOM, Math.max(CONFIG.MIN_ZOOM, Number(nextZoom) || 1));
    applyZoom();
  }
  function render() {
    if (!$svg || !room) return;
    const F = FLOORS[room.floor] || FLOORS.wood, W = WALLS[room.wall] || WALLS.cream, G = CONFIG.GRID;
    let s = `<polygon points="${P([C(-.3, -.3, -6), C(G + .3, -.3, -6), C(G + .3, G + .3, -6), C(-.3, G + .3, -6)])}" fill="#000" fill-opacity="0.3"/>`;
    s += poly([C(0, 0, WALL_H), C(0, G, WALL_H), C(0, G, 0), C(0, 0, 0)], W.l);
    s += poly([C(0, 0, WALL_H), C(G, 0, WALL_H), C(G, 0, 0), C(0, 0, 0)], W.r);
    const ghostType = placingType || (movingId && (room.placed.find(p => p.id === movingId) || {}).type);
    const wallActive = ghostType && isWallItem(ghostType);
    if (wallActive) {
      for (const slot of wallSlots()) {
        const hov = hover && hover.surface === 'wall'
          && hover.wall === slot.wall && hover.wx === slot.wx && hover.wz === slot.wz;
        s += wallRect(slot.wall, slot.wx, slot.wz, 1.45, 24, hov ? '#ffd23f' : '#ffffff', hov ? .34 : .12)
          .replace('<polygon ', `<polygon class="rd-wall-tile" data-wall="${slot.wall}" data-wx="${slot.wx}" data-wz="${slot.wz}" `);
      }
    }
    const wallItems = room.placed.filter(p => catalog[p.type] && isWallItem(p.type));
    for (const p of wallItems) {
      if (p.id === movingId && hover) continue;
      s += `<g class="rd-obj${p.id === selectedId ? ' sel' : ''}" data-id="${p.id}">${getObjectMarkup(p)}</g>`;
    }
    s += poly([C(0, 0, 7), C(0, G, 7), C(0, G, 0), C(0, 0, 0)], shade(W.l, .82));
    s += poly([C(0, 0, 7), C(G, 0, 7), C(G, 0, 0), C(0, 0, 0)], shade(W.r, .82));
    for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
      const c = (gx + gy) % 2 ? F.b : F.a;
      const hov = (placingType || movingId) && hover && hover.surface !== 'wall' && hover.gx === gx && hover.gy === gy;
      s += `<polygon class="rd-tile" data-gx="${gx}" data-gy="${gy}" points="${P([C(gx, gy), C(gx + 1, gy), C(gx + 1, gy + 1), C(gx, gy + 1)])}" fill="${c}" stroke="${shade(F.b, .8)}" stroke-width="1" ${hov ? 'opacity="0.85"' : ''}/>`;
    }
    const sorted = room.placed.filter(p => catalog[p.type] && !isWallItem(p.type)).sort((a, b) => {
      const A = catalog[a.type], B = catalog[b.type];
      if (!!A.flat !== !!B.flat) return A.flat ? -1 : 1;
      const afp = getFootprint(a.type, a.rot);
      const bfp = getFootprint(b.type, b.rot);
      return (a.gx + afp.w + a.gy + afp.d) - (b.gx + bfp.w + b.gy + bfp.d);
    });
    for (const p of sorted) {
      if (p.id === movingId && hover) continue;
      s += `<g class="rd-obj${p.id === selectedId ? ' sel' : ''}" data-id="${p.id}">${getObjectMarkup(p)}</g>`;
    }
    if (ghostType && hover && catalog[ghostType]) {
      const moving = movingId ? room.placed.find(p => p.id === movingId) : null;
      const rot = moving ? moving.rot : 0;
      if (isWallItem(ghostType) && hover.surface === 'wall') {
        const ok = fitsWall(ghostType, hover.wall, hover.wx, hover.wz, movingId);
        const ghost = getHoverItem(ghostType, hover);
        s += `<g opacity="0.55" style="pointer-events:none">${ok ? '' : wallRect(hover.wall, hover.wx, hover.wz, getWallSize(ghostType).w, getWallSize(ghostType).h, '#e2574c', .55)}${getObjectMarkup(ghost)}</g>`;
      } else if (!isWallItem(ghostType) && hover.surface !== 'wall') {
        const ok = fits(ghostType, hover.gx, hover.gy, movingId);
        const fp = getFootprint(ghostType, rot);
        s += `<g opacity="0.55" style="pointer-events:none">${ok ? '' :
          `<polygon points="${P([C(hover.gx, hover.gy), C(hover.gx + fp.w, hover.gy), C(hover.gx + fp.w, hover.gy + fp.d), C(hover.gx, hover.gy + fp.d)])}" fill="#e2574c" fill-opacity="0.6"/>`
        }${getObjectMarkup({ type: ghostType, gx: hover.gx, gy: hover.gy, rot })}</g>`;
      }
    }
    $svg.innerHTML = s;
    $svg.classList.toggle('placing', !!(placingType || movingId));
    applyZoom();
  }
  function itemThumb(it) {
    if (isWallItem(it.id)) {
      return `<svg viewBox="-90 -120 180 150">${DRAW[it.drawKey](0, 0, 0, { type: it.id, wall: it.wall || 'left', wx: 1.2, wz: 22 })}</svg>`;
    }
    const minX = -it.d * TW2 - 6, w = (it.w + it.d) * TW2 + 12;
    const minY = -it.h - 8, h = (it.w + it.d) * TH2 + it.h + 16;
    return `<svg viewBox="${minX} ${minY} ${w} ${h}">${DRAW[it.drawKey](0, 0)}</svg>`;
  }
  function renderSidebar() {
    if (!$grid) return;
    if (curTab === 'style') {
      $grid.style.display = 'none'; $styleGrid.style.display = 'block';
      $styleGrid.innerHTML =
        `<h4>바닥</h4><div class="rd-swrow">${Object.entries(FLOORS).map(([k, f]) =>
          `<div class="rd-sw${room.floor === k ? ' on' : ''}" data-floor="${k}" title="${f.name}" style="background:linear-gradient(135deg, ${f.a} 50%, ${f.b} 50%)"></div>`).join('')}</div>` +
        `<h4>벽지</h4><div class="rd-swrow">${Object.entries(WALLS).map(([k, w]) =>
          `<div class="rd-sw${room.wall === k ? ' on' : ''}" data-wall="${k}" title="${w.name}" style="background:linear-gradient(135deg, ${w.r} 50%, ${w.l} 50%)"></div>`).join('')}</div>`;
      return;
    }
    $grid.style.display = 'grid'; $styleGrid.style.display = 'none';
    $grid.innerHTML = Object.values(catalog)
      .filter(it => it.cat === curTab)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map(it => {
        const locked = !isOwned(it.id);
        return `<div class="rd-card${locked ? ' locked' : ''}${placingType === it.id ? ' on' : ''}" data-item="${it.id}">
          ${itemThumb(it)}<div class="nm">${it.name}</div>
          ${locked ? `<div class="pr">🪙 ${Number(it.price || 0).toLocaleString()}</div>` : ''}
        </div>`;
      }).join('');
  }

  /* ---------- UI 유틸 ---------- */
  function showToast(msg) {
    if (!$toast) return;
    $toast.textContent = msg; $toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $toast.classList.remove('show'), 1800);
  }
  function setTip(msg) {
    if (!$tip) return;
    $tip.style.display = msg ? 'block' : 'none';
    if (msg) $tip.textContent = msg;
  }
  function updateActionBar() {
    const p = room && room.placed.find(p => p.id === selectedId);
    $bar.style.display = p ? 'flex' : 'none';
    if (p) {
      $view.querySelector('#rd-ab-name').textContent = catalog[p.type].name;
      const rotateButton = $view.querySelector('#rd-ab-rotate');
      if (rotateButton) rotateButton.disabled = !canRotateItem(p.type);
    }
  }
  function clearModes() {
    placingType = null; movingId = null; selectedId = null; hover = null;
    setTip(''); updateActionBar(); renderSidebar(); render();
  }

  /* ---------- 이벤트 바인딩 (1회) ---------- */
  function bindEvents() {
    $view.querySelectorAll('.rd-tabs button').forEach(b => b.onclick = () => {
      $view.querySelectorAll('.rd-tabs button').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); curTab = b.dataset.tab; renderSidebar();
    });
    $grid.onclick = e => {
      const card = e.target.closest('.rd-card'); if (!card) return;
      const id = card.dataset.item;
      if (!isOwned(id)) { purchase(id); return; }
      selectedId = null; movingId = null; updateActionBar();
      placingType = placingType === id ? null : id;
      setTip(placingType ? `${isWallItem(id) ? '벽 위치' : '바닥 칸'}을 눌러 「${catalog[id].name}」 배치` : '');
      renderSidebar(); render();
    };
    $styleGrid.onclick = e => {
      const f = e.target.dataset.floor, w = e.target.dataset.wall;
      if (f) room.floor = f;
      if (w) room.wall = w;
      if (f || w) { renderSidebar(); render(); scheduleSave(); }
    };
    $svg.addEventListener('mousemove', e => {
      if (!placingType && !movingId) return;
      const type = placingType || (room.placed.find(p => p.id === movingId) || {}).type;
      const wallTile = e.target.closest('.rd-wall-tile');
      const floorTile = e.target.closest('.rd-tile');
      const nh = isWallItem(type)
        ? (wallTile ? { surface: 'wall', wall: normalizeWall(wallTile.dataset.wall), wx: +wallTile.dataset.wx, wz: +wallTile.dataset.wz } : null)
        : (floorTile ? { surface: 'floor', gx: +floorTile.dataset.gx, gy: +floorTile.dataset.gy } : null);
      if (JSON.stringify(nh) !== JSON.stringify(hover)) { hover = nh; render(); }
    });
    $svg.addEventListener('click', e => {
      const tile = e.target.closest('.rd-tile');
      const wallTile = e.target.closest('.rd-wall-tile');
      const obj = e.target.closest('.rd-obj');
      if (placingType || movingId) {
        const current = movingId ? room.placed.find(p => p.id === movingId) : null;
        const type = placingType || current?.type;
        if (!type) return;
        if (isWallItem(type) && wallTile) {
          const wall = normalizeWall(wallTile.dataset.wall);
          const wx = +wallTile.dataset.wx, wz = +wallTile.dataset.wz;
          if (!fitsWall(type, wall, wx, wz, movingId)) { showToast('여기에는 놓을 수 없어요!'); return; }
          if (placingType) {
            room.placed.push({ id: nextId++, type: placingType, surface: 'wall', wall, wx, wz, rot: 0 });
            showToast(`${catalog[placingType].name} 배치 완료!`);
          } else if (current) {
            current.surface = 'wall'; current.wall = wall; current.wx = wx; current.wz = wz; current.rot = 0;
          }
          clearModes(); scheduleSave();
          return;
        }
        if (isWallItem(type)) return;
        if (!tile) return;
        const gx = +tile.dataset.gx, gy = +tile.dataset.gy;
        if (!fits(type, gx, gy, movingId)) { showToast('여기에는 놓을 수 없어요!'); return; }
        if (placingType) {
          room.placed.push({ id: nextId++, type: placingType, gx, gy, rot: 0 });
          showToast(`${catalog[placingType].name} 배치 완료!`);
        } else {
          const p = room.placed.find(p => p.id === movingId);
          p.gx = gx; p.gy = gy;
        }
        clearModes(); scheduleSave();
        return;
      }
      if (obj && !placingType && !movingId) {
        selectedId = +obj.dataset.id;
        movingId = selectedId;
        const p = room.placed.find(p => p.id === movingId);
        setTip(`「${catalog[p.type].name}」 새 위치를 누르세요`);
        updateActionBar(); render(); return;
      }
      if (!obj) { clearModes(); }
    });
    $view.querySelector('#rd-ab-move').onclick = () => {
      movingId = selectedId;
      const p = room.placed.find(p => p.id === movingId);
      setTip(`「${catalog[p.type].name}」 새 위치를 누르세요`);
      updateActionBar(); render();
    };
    $view.querySelector('#rd-ab-rotate').onclick = () => {
      const p = room.placed.find(p => p.id === selectedId);
      if (!p) return;
      if (!canRotateItem(p.type)) {
        showToast('이 아이템은 회전하지 않아도 되는 장식이에요.');
        return;
      }
      const nextRot = (getRotation(p.rot) + 90) % 360;
      if (!fitsWithRotation(p.type, p.gx, p.gy, nextRot, p.id)) {
        showToast('이 위치에서는 회전할 수 없어요!');
        return;
      }
      p.rot = nextRot;
      showToast('아이템을 회전했어요');
      updateActionBar(); render(); scheduleSave();
    };
    $view.querySelector('#rd-ab-del').onclick = () => {
      room.placed = room.placed.filter(p => p.id !== selectedId);
      selectedId = null; updateActionBar(); render(); scheduleSave();
      showToast('아이템을 보관함에 넣었어요');
    };
    $view.querySelector('#rd-ab-cancel').onclick = () => { clearModes(); };
    $view.querySelector('#rd-zoom-out').onclick = () => setZoom(zoom - CONFIG.ZOOM_STEP);
    $view.querySelector('#rd-zoom-in').onclick = () => setZoom(zoom + CONFIG.ZOOM_STEP);
    $view.querySelector('#rd-back').onclick = () => { close(); if (onBack) onBack(); };
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && opened) clearModes();
    });
  }

  /* ---------- 공개 API ---------- */
  function init(opts) {
    getUserId = opts.getUserId;
    onBack = opts.onBack || null;
    db = firebase.firestore();
    fns = firebase.app().functions(CONFIG.REGION);
    $view = document.getElementById('room-view');
    if (!$view) { console.error('[room] #room-view 마크업이 없습니다'); return; }
    $svg = $view.querySelector('#rd-svg');
    $grid = $view.querySelector('#rd-grid');
    $styleGrid = $view.querySelector('#rd-style');
    $coin = $view.querySelector('#rd-coin');
    $tip = $view.querySelector('#rd-tip');
    $bar = $view.querySelector('#rd-actionbar');
    $toast = $view.querySelector('#rd-toast');
    $zoomLabel = $view.querySelector('#rd-zoom-label');
    bindEvents();
    // 다른 show*View가 room-view를 hidden 처리하면 자동으로 정리/저장
    new MutationObserver(() => {
      if ($view.hidden && opened) close();
    }).observe($view, { attributes: true, attributeFilter: ['hidden'] });
  }
  async function open() {
    const uid = getUserId && getUserId();
    if (!uid) { console.warn('[room] 로그인 사용자 없음'); return; }
    opened = true;
    await loadCatalog();
    await loadRoom(uid);
    watchEconomy(uid);
    watchInventory(uid);
    setZoom(1);
    curTab = 'furniture';
    clearModes();
  }
  function close() {
    if (!opened) return;
    opened = false;
    unsubs.forEach(u => { try { u(); } catch (e) {} });
    unsubs = [];
    clearTimeout(saveTimer);
    // 닫을 때 즉시 저장
    const uid = getUserId && getUserId();
    if (uid && room) {
      db.collection(CONFIG.COL_ROOM).doc(uid).set(roomPayload(), { merge: true })
        .catch(e => console.error('[room] 종료 저장 실패', e));
    }
  }

  return { init, open, close };
})();
