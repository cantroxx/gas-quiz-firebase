/* ============================================================
 * DJ48 Quiztown - Interiors native room decorator
 * - Renderer is built around Pixel Salvaje TinyHouse interiors assets.
 * - Legacy SVG/Kenney drawing paths are intentionally removed.
 * - Data contracts remain: userRoomSettings.homeRoom, userInventory,
 *   userEconomy, assetCatalog, purchaseShopItem, purchaseRoomLayout.
 * ============================================================ */
window.RoomDecor = (function () {
  'use strict';

  const CONFIG = {
    REGION: 'asia-northeast3',
    COL_ROOM: 'userRoomSettings',
    ROOM_FIELD: 'homeRoom',
    COL_INVENTORY: 'userInventory',
    COL_ECONOMY: 'userEconomy',
    COL_CATALOG: 'assetCatalog',
    CATALOG_TYPE: 'roomFurniture',
    PURCHASE_FN: 'purchaseShopItem',
    PURCHASE_LAYOUT_FN: 'purchaseRoomLayout',
    SAVE_DEBOUNCE_MS: 800,
    MIN_ZOOM: 0.7,
    MAX_ZOOM: 1.7,
    ZOOM_STEP: 0.1
  };

  const TILE_W = 64;
  const TILE_H = 32;
  const HALF_W = TILE_W / 2;
  const HALF_H = TILE_H / 2;
  const WALL_H = 120;
  const ROTATIONS = ['0', '90', '180', '270'];

  const FLOOR_STYLES = {
    woodbright: {
      name: '우드 브라이트',
      asset: '/images/room-assets/interiors/floor_wall_tiles_64/floor_64_woodbright.png'
    },
    woodlight: {
      name: '우드 라이트',
      asset: '/images/room-assets/interiors/floor_wall_tiles_64/floor_64_woodlight.png'
    },
    bone: {
      name: '본 타일',
      asset: '/images/room-assets/interiors/floor_wall_tiles_64/floor_64_bone.png'
    },
    sky: {
      name: '스카이',
      asset: '/images/room-assets/interiors/floor_wall_tiles_64/floor_64_sky.png'
    },
    japan: {
      name: '재패니즈',
      asset: '/images/room-assets/interiors/floor_wall_tiles_64/floor_64_japan_1.png'
    },
    bath: {
      name: '욕실',
      asset: '/images/room-assets/interiors/floor_wall_tiles_64/floor_bath_1_64.png'
    }
  };

  const WALL_STYLES = {
    woodbright: {
      name: '우드 브라이트',
      left: '/images/room-assets/interiors/floor_wall_tiles_64/wall_l_64_woodbright.png',
      right: '/images/room-assets/interiors/floor_wall_tiles_64/wall_r_64_woodbright.png'
    },
    bone: {
      name: '본 벽',
      left: '/images/room-assets/interiors/floor_wall_tiles_64/wall_l_64_bone.png',
      right: '/images/room-assets/interiors/floor_wall_tiles_64/wall_r_64_bone.png'
    },
    sky: {
      name: '스카이',
      left: '/images/room-assets/interiors/floor_wall_tiles_64/wall_l_64_sky.png',
      right: '/images/room-assets/interiors/floor_wall_tiles_64/wall_r_64_sky.png'
    },
    brick: {
      name: '브릭',
      left: '/images/room-assets/interiors/floor_wall_tiles_64/wall_l_64_brick.png',
      right: '/images/room-assets/interiors/floor_wall_tiles_64/wall_r_64_brick.png'
    },
    japan: {
      name: '재패니즈',
      left: '/images/room-assets/interiors/floor_wall_tiles_64/wall_l_64_japan_1.png',
      right: '/images/room-assets/interiors/floor_wall_tiles_64/wall_r_64_japan_1.png'
    },
    bath: {
      name: '욕실',
      left: '/images/room-assets/interiors/floor_wall_tiles_64/wall_bath_3_64.png',
      right: '/images/room-assets/interiors/floor_wall_tiles_64/wall_bath_4_64.png'
    }
  };

  const ROOM_LAYOUTS = {
    cozy: { id: 'cozy', name: '기본방', desc: '처음 내 집', w: 8, d: 8, price: 0 },
    wide: { id: 'wide', name: '넓은 방', desc: '가로 공간 확장', w: 10, d: 8, price: 120 },
    studio: { id: 'studio', name: '스튜디오', desc: '정사각형 큰 방', w: 10, d: 10, price: 220 },
    suite: { id: 'suite', name: '큰 집', desc: '여러 구역 배치용', w: 12, d: 10, price: 360 }
  };

  const DEFAULT_ROOM = {
    floor: 'woodbright',
    wall: 'bone',
    skin: 'interiors',
    layout: 'cozy',
    unlockedLayouts: ['cozy'],
    lightsOn: true,
    lightLevel: 100,
    placed: []
  };

  const NATIVE_SHOWROOM_ITEMS = [
    { type: 'room_interiors_bed_a', gx: 2, gy: 1, rot: 0 },
    { type: 'room_interiors_night_table', gx: 4, gy: 1, rot: 0 },
    { type: 'room_interiors_sofa_3', gx: 5, gy: 3, rot: 180 },
    { type: 'room_interiors_carpet_3', gx: 2, gy: 4, rot: 0 },
    { type: 'room_interiors_desk_1', gx: 4, gy: 5, rot: 0 },
    { type: 'room_interiors_chair_2', gx: 5, gy: 6, rot: 180 },
    { type: 'room_interiors_plant_1', gx: 1, gy: 6, rot: 0 },
    { type: 'room_interiors_lamp_8', gx: 7, gy: 2, rot: 0 },
    { type: 'room_interiors_window_11', surface: 'wall', wall: 'right', wx: 4, wz: 52, rot: 0 }
  ];

  const escAttr = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const deepClone = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const iso = (x, y, z = 0) => [(x - y) * HALF_W, (x + y) * HALF_H - z];
  const points = pts => pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  let db = null;
  let fns = null;
  let getUserId = null;
  let onBack = null;
  let catalog = {};
  let owned = new Set();
  let coins = 0;
  let room = null;
  let nextId = 1;
  let placingType = null;
  let movingId = null;
  let selectedId = null;
  let hover = null;
  let zoom = 1;
  let curTab = 'furniture';
  let openVersion = 0;
  let unsubs = [];
  let saveTimer = null;
  let opened = false;
  let toastTimer = null;
  let $view, $svg, $grid, $styleGrid, $coin, $tip, $bar, $toast, $zoomLabel;

  function normalizeRenderType(value) {
    return value === 'image' ? 'image' : 'image';
  }

  function normalizeRotation(value) {
    const rot = Math.round(Number(value) || 0) % 360;
    return rot < 0 ? rot + 360 : rot;
  }

  function normalizeRotationSprites(value = {}) {
    const source = value && typeof value === 'object' ? value : {};
    return ROTATIONS.reduce((next, key) => {
      next[key] = String(source[key] || '').trim();
      return next;
    }, {});
  }

  function normalizePlacementOffsets(value = {}) {
    const source = value && typeof value === 'object' ? value : {};
    return ROTATIONS.reduce((next, key) => {
      const raw = source[key] && typeof source[key] === 'object' ? source[key] : {};
      next[key] = {
        x: Number(raw.x || 0) || 0,
        y: Number(raw.y || 0) || 0
      };
      return next;
    }, {});
  }

  function hasRotationSprites(item = {}) {
    const sprites = normalizeRotationSprites(item.rotationSprites);
    return ROTATIONS.some(key => !!sprites[key]);
  }

  function imageUrlForRotation(item = {}, rot = 0) {
    const sprites = normalizeRotationSprites(item.rotationSprites);
    const key = String(normalizeRotation(rot));
    return sprites[key] || sprites['0'] || String(item.assetUrl || '').trim();
  }

  function placementOffsetForRotation(item = {}, rot = 0) {
    const offsets = normalizePlacementOffsets(item.placementOffsets);
    return offsets[String(normalizeRotation(rot))] || offsets['0'] || { x: 0, y: 0 };
  }

  function normalizeLayer(value) {
    return ['floor', 'seat', 'surface', 'furniture', 'wall'].includes(value) ? value : '';
  }

  function normalizeCatalogItem(id, data = {}) {
    return {
      id,
      ...data,
      renderType: normalizeRenderType(data.renderType),
      layer: normalizeLayer(data.layer),
      assetUrl: String(data.assetUrl || '').trim(),
      thumbUrl: String(data.thumbUrl || '').trim(),
      rotationSprites: normalizeRotationSprites(data.rotationSprites),
      placementOffsets: normalizePlacementOffsets(data.placementOffsets),
      w: Math.max(1, Number(data.w || 1) || 1),
      d: Math.max(1, Number(data.d || 1) || 1),
      h: Math.max(1, Number(data.h || 30) || 30),
      pixelWidth: Number(data.pixelWidth || 0) || 0,
      pixelHeight: Number(data.pixelHeight || 0) || 0,
      anchorX: Number(data.anchorX || 0) || 0,
      anchorY: Number(data.anchorY || 0) || 0,
      offsetX: Number(data.offsetX || 0) || 0,
      offsetY: Number(data.offsetY || 0) || 0,
      zIndexOffset: Number(data.zIndexOffset || 0) || 0,
      sortOrder: Number(data.sortOrder || 100) || 100
    };
  }

  function canRenderCatalogItem(item = {}) {
    return item.enabled !== false && !!(item.assetUrl || hasRotationSprites(item));
  }

  async function loadCatalog() {
    catalog = {};
    try {
      const snap = await db.collection(CONFIG.COL_CATALOG)
        .where('type', '==', CONFIG.CATALOG_TYPE)
        .get();
      snap.forEach(doc => {
        const item = normalizeCatalogItem(doc.id, doc.data() || {});
        if (canRenderCatalogItem(item) && String(item.id || '').startsWith('room_interiors_')) {
          catalog[doc.id] = item;
        }
      });
    } catch (error) {
      console.warn('[room] assetCatalog load failed.', error);
    }
  }

  function normalizeFloor(value) {
    return FLOOR_STYLES[value] ? value : DEFAULT_ROOM.floor;
  }

  function normalizeWall(value) {
    return WALL_STYLES[value] ? value : DEFAULT_ROOM.wall;
  }

  function normalizeLayout(value) {
    return ROOM_LAYOUTS[value] ? value : DEFAULT_ROOM.layout;
  }

  function normalizeUnlockedLayouts(value) {
    const next = new Set(Array.isArray(value) ? value.filter(id => ROOM_LAYOUTS[id]) : []);
    next.add(DEFAULT_ROOM.layout);
    return Array.from(next);
  }

  function normalizeLightLevel(value) {
    return clamp(Math.round(Number(value) || 100), 20, 100);
  }

  function isWallItem(type) {
    const item = catalog[type];
    return !!item && (item.surface === 'wall' || item.layer === 'wall');
  }

  function normalizePlacedItem(item = {}) {
    if (isWallItem(item.type) || item.surface === 'wall') {
      const catalogItem = catalog[item.type] || {};
      return {
        id: Number(item.id || nextId++),
        type: item.type,
        surface: 'wall',
        wall: item.wall === 'left' ? 'left' : (catalogItem.wall || 'right'),
        wx: Number(item.wx ?? 2),
        wz: Number(item.wz ?? 48),
        rot: 0
      };
    }
    return {
      id: Number(item.id || nextId++),
      type: item.type,
      gx: Number(item.gx || 0),
      gy: Number(item.gy || 0),
      rot: normalizeRotation(item.rot)
    };
  }

  function normalizeRoomData(data = {}) {
    const normalized = {
      ...DEFAULT_ROOM,
      ...data,
      floor: normalizeFloor(data.floor),
      wall: normalizeWall(data.wall),
      skin: 'interiors',
      layout: normalizeLayout(data.layout),
      unlockedLayouts: normalizeUnlockedLayouts(data.unlockedLayouts),
      lightsOn: data.lightsOn !== false,
      lightLevel: normalizeLightLevel(data.lightLevel),
      placed: Array.isArray(data.placed) ? data.placed.filter(p => catalog[p.type]).map(normalizePlacedItem) : []
    };
    return normalized;
  }

  async function loadRoom(uid) {
    try {
      const doc = await db.collection(CONFIG.COL_ROOM).doc(uid).get();
      const data = doc.exists ? (doc.data() || {})[CONFIG.ROOM_FIELD] : null;
      room = data && typeof data === 'object' ? normalizeRoomData(data) : deepClone(DEFAULT_ROOM);
    } catch (error) {
      console.warn('[room] userRoomSettings load failed.', error);
      room = deepClone(DEFAULT_ROOM);
    }
    nextId = room.placed.reduce((max, item) => Math.max(max, Number(item.id || 0)), 0) + 1;
  }

  function roomPayload() {
    return {
      [CONFIG.ROOM_FIELD]: {
        floor: normalizeFloor(room.floor),
        wall: normalizeWall(room.wall),
        skin: 'interiors',
        layout: normalizeLayout(room.layout),
        unlockedLayouts: normalizeUnlockedLayouts(room.unlockedLayouts),
        lightsOn: room.lightsOn !== false,
        lightLevel: normalizeLightLevel(room.lightLevel),
        placed: room.placed.map(normalizePlacedItem)
      },
      userId: getUserId(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const uid = getUserId && getUserId();
      if (!uid || !room) return;
      try {
        await db.collection(CONFIG.COL_ROOM).doc(uid).set(roomPayload(), { merge: true });
      } catch (error) {
        console.error('[room] save failed.', error);
        showToast('저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
      }
    }, CONFIG.SAVE_DEBOUNCE_MS);
  }

  function watchEconomy(uid) {
    unsubs.push(db.collection(CONFIG.COL_ECONOMY).doc(uid).onSnapshot(doc => {
      const data = doc.exists ? doc.data() || {} : {};
      coins = Number(data.djCoin ?? data.coin ?? 0) || 0;
      if ($coin) $coin.textContent = coins.toLocaleString();
    }, error => console.warn('[room] economy watch failed.', error)));
  }

  function watchInventory(uid) {
    unsubs.push(db.collection(CONFIG.COL_INVENTORY).doc(uid).collection('items').onSnapshot(snap => {
      owned = new Set();
      snap.forEach(doc => owned.add(doc.id));
      renderSidebar();
    }, error => console.warn('[room] inventory watch failed.', error)));
  }

  function isOwned(id) {
    const item = catalog[id];
    return !!item && (item.free === true || owned.has(id));
  }

  async function purchase(id) {
    const item = catalog[id];
    if (!item) return;
    if (coins < Number(item.price || 0)) {
      showToast(`DJ코인이 부족해요! (${(Number(item.price || 0) - coins).toLocaleString()}개 더 필요)`);
      return;
    }
    try {
      showToast('구매 중...');
      await fns.httpsCallable(CONFIG.PURCHASE_FN)({ memberUserId: getUserId(), itemId: id });
      owned.add(id);
      selectedId = null;
      movingId = null;
      placingType = id;
      setTip(`「${item.name}」 구매 완료! 놓을 위치를 선택하세요`);
      renderSidebar();
      render();
      showToast(`${item.name} 구매 완료!`);
    } catch (error) {
      console.error('[room] purchase failed.', error);
      showToast(error?.message || '구매에 실패했어요.');
    }
  }

  function getRoomSize(layoutId = room?.layout) {
    const layout = ROOM_LAYOUTS[normalizeLayout(layoutId)] || ROOM_LAYOUTS.cozy;
    return { w: Number(layout.w || 8), d: Number(layout.d || 8) };
  }

  function getLayer(type) {
    const item = catalog[type] || {};
    if (isWallItem(type)) return 'wall';
    return normalizeLayer(item.layer) || (item.flat ? 'floor' : 'furniture');
  }

  function getFootprint(type, rot = 0) {
    const item = catalog[type];
    if (!item || isWallItem(type)) return { w: 0, d: 0 };
    if (!canRotateItem(type)) return { w: item.w, d: item.d };
    const rotation = normalizeRotation(rot);
    return rotation === 90 || rotation === 270
      ? { w: item.d, d: item.w }
      : { w: item.w, d: item.d };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.d && a.y + a.d > b.y;
  }

  function canOverlap(typeA, typeB) {
    const a = getLayer(typeA);
    const b = getLayer(typeB);
    if (a === 'floor' || b === 'floor') return true;
    if ((a === 'seat' && b === 'surface') || (a === 'surface' && b === 'seat')) return true;
    return false;
  }

  function fits(type, gx, gy, ignoreId = null, rot = null) {
    const item = catalog[type];
    if (!item || isWallItem(type)) return false;
    const moving = ignoreId ? room.placed.find(p => p.id === ignoreId) : null;
    const rotation = rot == null ? normalizeRotation(moving?.rot || 0) : normalizeRotation(rot);
    const fp = getFootprint(type, rotation);
    const size = getRoomSize();
    if (gx < 0 || gy < 0 || gx + fp.w > size.w || gy + fp.d > size.d) return false;
    const rect = { x: gx, y: gy, w: fp.w, d: fp.d };
    return room.placed.every(other => {
      if (other.id === ignoreId || isWallItem(other.type)) return true;
      const otherFp = getFootprint(other.type, other.rot);
      const otherRect = { x: other.gx, y: other.gy, w: otherFp.w, d: otherFp.d };
      return !rectsOverlap(rect, otherRect) || canOverlap(type, other.type);
    });
  }

  function fitsWithRotation(type, gx, gy, rot, ignoreId = null) {
    return fits(type, gx, gy, ignoreId, rot);
  }

  function getWallLength(wall) {
    const size = getRoomSize();
    return wall === 'left' ? size.d : size.w;
  }

  function getWallSize(type) {
    const item = catalog[type] || {};
    return { w: Number(item.ww || 1), h: Number(item.wh || item.h || 40) };
  }

  function wallSlots() {
    const slots = [];
    for (const wall of ['left', 'right']) {
      const length = getWallLength(wall);
      for (let u = 1; u < length; u += 1) {
        slots.push({ surface: 'wall', wall, wx: u, wz: 44 });
        slots.push({ surface: 'wall', wall, wx: u, wz: 72 });
      }
    }
    return slots;
  }

  function fitsWall(type, wall, wx, wz, ignoreId = null) {
    const size = getWallSize(type);
    if (wx < 0 || wz < 16 || wx + size.w > getWallLength(wall) || wz + size.h > WALL_H - 8) return false;
    return room.placed.every(other => {
      if (other.id === ignoreId || !isWallItem(other.type) || other.wall !== wall) return true;
      const otherSize = getWallSize(other.type);
      return wx >= other.wx + otherSize.w
        || wx + size.w <= other.wx
        || wz >= other.wz + otherSize.h
        || wz + size.h <= other.wz;
    });
  }

  function canUseLayout(layoutId) {
    const size = getRoomSize(layoutId);
    return room.placed.every(item => {
      if (isWallItem(item.type)) {
        const itemSize = getWallSize(item.type);
        return item.wx + itemSize.w <= (item.wall === 'left' ? size.d : size.w);
      }
      const fp = getFootprint(item.type, item.rot);
      return item.gx + fp.w <= size.w && item.gy + fp.d <= size.d;
    });
  }

  function isLayoutUnlocked(layoutId) {
    return normalizeUnlockedLayouts(room?.unlockedLayouts).includes(layoutId);
  }

  async function chooseLayout(layoutId) {
    const layout = ROOM_LAYOUTS[layoutId];
    if (!layout) return;
    if (!canUseLayout(layoutId)) {
      showToast('현재 배치된 가구가 새 집 크기를 벗어나요.');
      return;
    }
    if (isLayoutUnlocked(layoutId)) {
      room.layout = layoutId;
      room.unlockedLayouts = normalizeUnlockedLayouts(room.unlockedLayouts);
      renderSidebar();
      render();
      scheduleSave();
      showToast(`${layout.name}으로 변경했어요`);
      return;
    }
    if (coins < layout.price) {
      showToast(`DJ코인이 부족해요! (${(layout.price - coins).toLocaleString()}개 더 필요)`);
      return;
    }
    try {
      showToast('이사 준비 중...');
      const result = await fns.httpsCallable(CONFIG.PURCHASE_LAYOUT_FN)({ memberUserId: getUserId(), layoutId });
      room.layout = result?.data?.layoutId || layoutId;
      room.unlockedLayouts = normalizeUnlockedLayouts(result?.data?.unlockedLayouts);
      renderSidebar();
      render();
      showToast(`${layout.name}으로 이사했어요`);
    } catch (error) {
      console.error('[room] layout purchase failed.', error);
      showToast(error?.message || '이사에 실패했어요.');
    }
  }

  function canRotateItem(type) {
    return hasRotationSprites(catalog[type] || {});
  }

  function floorSortKey(item) {
    const fp = getFootprint(item.type, item.rot);
    return (item.gx + fp.w + item.gy + fp.d) * 100 + (catalog[item.type]?.zIndexOffset || 0);
  }

  function layerSortWeight(type) {
    return { floor: 0, furniture: 1, seat: 1.5, surface: 2, wall: 4 }[getLayer(type)] ?? 1;
  }

  function tileAnchor(gx, gy, fp) {
    return iso(gx + fp.w / 2, gy + fp.d / 2, 0);
  }

  function renderImage(x, y, href, width, height, extra = '') {
    return `<image href="${escAttr(href)}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${width.toFixed(1)}" height="${height.toFixed(1)}" preserveAspectRatio="xMidYMax meet"${extra}/>`;
  }

  function renderFloorTile(gx, gy, hoverActive) {
    const asset = FLOOR_STYLES[normalizeFloor(room.floor)].asset;
    const [x, y] = iso(gx, gy);
    const tilePoly = points([iso(gx, gy), iso(gx + 1, gy), iso(gx + 1, gy + 1), iso(gx, gy + 1)]);
    return renderImage(x - 32, y - 16, asset, 64, 64, ' style="pointer-events:none"')
      + `<polygon class="rd-tile" data-gx="${gx}" data-gy="${gy}" points="${tilePoly}" fill="${hoverActive ? '#ffd23f' : '#fff'}" fill-opacity="${hoverActive ? '.32' : '.01'}" stroke="#211820" stroke-opacity=".18" stroke-width="1"/>`;
  }

  function renderWalls(size) {
    const style = WALL_STYLES[normalizeWall(room.wall)];
    let html = '';
    for (let gy = size.d - 1; gy >= 0; gy -= 1) {
      const [x, y] = iso(0, gy);
      html += renderImage(x - 32, y - 80, style.left, 64, 64, ' style="pointer-events:none"');
    }
    for (let gx = size.w - 1; gx >= 0; gx -= 1) {
      const [x, y] = iso(gx, 0);
      html += renderImage(x - 32, y - 80, style.right, 64, 64, ' style="pointer-events:none"');
    }
    const leftBase = points([iso(0, 0, 0), iso(0, size.d, 0), iso(0, size.d, 8), iso(0, 0, 8)]);
    const rightBase = points([iso(0, 0, 0), iso(size.w, 0, 0), iso(size.w, 0, 8), iso(0, 0, 8)]);
    html += `<polygon points="${leftBase}" fill="#2a2025" opacity=".35" style="pointer-events:none"/>`;
    html += `<polygon points="${rightBase}" fill="#2a2025" opacity=".25" style="pointer-events:none"/>`;
    return html;
  }

  function renderFloorObject(item) {
    const def = catalog[item.type];
    if (!def) return '';
    const rot = normalizeRotation(item.rot);
    const href = imageUrlForRotation(def, canRotateItem(item.type) ? rot : 0);
    if (!href) return '';
    const fp = getFootprint(item.type, rot);
    const [sx, sy] = tileAnchor(item.gx, item.gy, fp);
    const width = Number(def.pixelWidth || 0) || 64;
    const height = Number(def.pixelHeight || 0) || 64;
    const anchorX = Number(def.anchorX || 0) || width / 2;
    const anchorY = Number(def.anchorY || 0) || height;
    const placement = placementOffsetForRotation(def, rot);
    const x = sx - anchorX + Number(def.offsetX || 0) + placement.x;
    const y = sy - anchorY + Number(def.offsetY || 0) + placement.y;
    return renderImage(x, y, href, width, height);
  }

  function wallAnchor(item) {
    if (item.wall === 'left') return iso(0, Number(item.wx || 0), Number(item.wz || 48));
    return iso(Number(item.wx || 0), 0, Number(item.wz || 48));
  }

  function renderWallObject(item) {
    const def = catalog[item.type];
    if (!def) return '';
    const href = imageUrlForRotation(def, 0);
    if (!href) return '';
    const [sx, sy] = wallAnchor(item);
    const width = Number(def.pixelWidth || 0) || 64;
    const height = Number(def.pixelHeight || 0) || 64;
    const anchorX = Number(def.anchorX || 0) || width / 2;
    const anchorY = Number(def.anchorY || 0) || height / 2;
    return renderImage(sx - anchorX + Number(def.offsetX || 0), sy - anchorY + Number(def.offsetY || 0), href, width, height);
  }

  function objectMarkup(item) {
    return isWallItem(item.type) ? renderWallObject(item) : renderFloorObject(item);
  }

  function wallSlotMarkup(slot, active) {
    const u = Number(slot.wx || 0);
    const z = Number(slot.wz || 48);
    const wall = slot.wall === 'left' ? 'left' : 'right';
    const a = wall === 'left' ? iso(0, u, z + 22) : iso(u, 0, z + 22);
    const b = wall === 'left' ? iso(0, u + 1, z + 22) : iso(u + 1, 0, z + 22);
    const c = wall === 'left' ? iso(0, u + 1, z) : iso(u + 1, 0, z);
    const d = wall === 'left' ? iso(0, u, z) : iso(u, 0, z);
    return `<polygon class="rd-wall-tile" data-wall="${wall}" data-wx="${u}" data-wz="${z}" points="${points([a, b, c, d])}" fill="${active ? '#ffd23f' : '#fff'}" fill-opacity="${active ? '.34' : '.1'}" stroke="#211820" stroke-opacity=".12" stroke-width="1"/>`;
  }

  function render() {
    if (!$svg || !room) return;
    const size = getRoomSize();
    const viewX = -size.d * HALF_W - 110;
    const viewY = -WALL_H - 80;
    const viewW = (size.w + size.d) * HALF_W + 220;
    const viewH = (size.w + size.d) * HALF_H + WALL_H + 160;
    $svg.setAttribute('viewBox', `${viewX} ${viewY} ${viewW} ${viewH}`);

    let html = `<polygon points="${points([iso(-.4, -.4, -10), iso(size.w + .4, -.4, -10), iso(size.w + .4, size.d + .4, -10), iso(-.4, size.d + .4, -10)])}" fill="#0b0b20" opacity=".7"/>`;
    html += renderWalls(size);

    const ghostType = placingType || (movingId && room.placed.find(p => p.id === movingId)?.type);
    const wallMode = ghostType && isWallItem(ghostType);
    if (wallMode) {
      for (const slot of wallSlots()) {
        const active = hover && hover.surface === 'wall' && hover.wall === slot.wall && hover.wx === slot.wx && hover.wz === slot.wz;
        html += wallSlotMarkup(slot, active);
      }
    }

    const wallItems = room.placed.filter(item => catalog[item.type] && isWallItem(item.type));
    for (const item of wallItems) {
      if (item.id === movingId && hover) continue;
      html += `<g class="rd-obj${item.id === selectedId ? ' sel' : ''}" data-id="${item.id}">${objectMarkup(item)}</g>`;
    }

    for (let gy = 0; gy < size.d; gy += 1) {
      for (let gx = 0; gx < size.w; gx += 1) {
        const active = (placingType || movingId) && hover && hover.surface !== 'wall' && hover.gx === gx && hover.gy === gy;
        html += renderFloorTile(gx, gy, active);
      }
    }

    const floorItems = room.placed
      .filter(item => catalog[item.type] && !isWallItem(item.type))
      .sort((a, b) => {
        const layerDiff = layerSortWeight(a.type) - layerSortWeight(b.type);
        return layerDiff || floorSortKey(a) - floorSortKey(b);
      });
    for (const item of floorItems) {
      if (item.id === movingId && hover) continue;
      html += `<g class="rd-obj${item.id === selectedId ? ' sel' : ''}" data-id="${item.id}">${objectMarkup(item)}</g>`;
    }

    if (ghostType && hover && catalog[ghostType]) {
      const moving = movingId ? room.placed.find(p => p.id === movingId) : null;
      const rot = moving ? moving.rot : 0;
      if (isWallItem(ghostType) && hover.surface === 'wall') {
        const ok = fitsWall(ghostType, hover.wall, hover.wx, hover.wz, movingId);
        const ghost = { type: ghostType, surface: 'wall', wall: hover.wall, wx: hover.wx, wz: hover.wz, rot: 0 };
        html += `<g opacity=".58" style="pointer-events:none">${ok ? '' : wallSlotMarkup(hover, true)}${objectMarkup(ghost)}</g>`;
      } else if (!isWallItem(ghostType) && hover.surface !== 'wall') {
        const ok = fits(ghostType, hover.gx, hover.gy, movingId, rot);
        const fp = getFootprint(ghostType, rot);
        if (!ok) {
          html += `<polygon points="${points([iso(hover.gx, hover.gy), iso(hover.gx + fp.w, hover.gy), iso(hover.gx + fp.w, hover.gy + fp.d), iso(hover.gx, hover.gy + fp.d)])}" fill="#e2574c" fill-opacity=".55" style="pointer-events:none"/>`;
        }
        html += `<g opacity=".58" style="pointer-events:none">${objectMarkup({ type: ghostType, gx: hover.gx, gy: hover.gy, rot })}</g>`;
      }
    }

    const lightLevel = normalizeLightLevel(room.lightLevel);
    const dimOpacity = room.lightsOn === false ? .48 : Math.max(0, (100 - lightLevel) / 100 * .26);
    if (dimOpacity > 0) html += `<rect x="-1000" y="-1000" width="2000" height="2000" fill="#050719" opacity="${dimOpacity.toFixed(2)}" style="pointer-events:none"/>`;
    if (room.lightsOn !== false && lightLevel >= 70) {
      const [lx, ly] = iso(size.w * .58, size.d * .18, WALL_H - 20);
      html += `<ellipse cx="${lx}" cy="${ly}" rx="${70 + lightLevel * .35}" ry="${24 + lightLevel * .12}" fill="#fff0a8" opacity="${(lightLevel / 100 * .16).toFixed(2)}" style="pointer-events:none"/>`;
    }

    $svg.innerHTML = html;
    $svg.classList.toggle('placing', !!(placingType || movingId));
    applyZoom();
  }

  function itemThumb(item) {
    const href = item.thumbUrl || imageUrlForRotation(item, 0);
    return `<img class="rd-thumb-img" src="${escAttr(href)}" alt="${escAttr(item.name || '')}" loading="lazy">`;
  }

  function renderSidebar() {
    if (!$grid || !$styleGrid || !room) return;
    if (curTab === 'style') {
      $grid.style.display = 'none';
      $styleGrid.style.display = 'block';
      $styleGrid.innerHTML =
        `<h4>조명</h4><div class="rd-control-row">` +
          `<button class="rd-light-toggle${room.lightsOn === false ? '' : ' on'}" data-light-toggle type="button">${room.lightsOn === false ? '불 켜기' : '불 끄기'}</button>` +
          `<label class="rd-range-label">밝기 <strong>${normalizeLightLevel(room.lightLevel)}%</strong><input data-light-level type="range" min="20" max="100" step="10" value="${normalizeLightLevel(room.lightLevel)}"${room.lightsOn === false ? ' disabled' : ''}></label>` +
        `</div>` +
        `<button class="rd-showroom-button" data-native-showroom type="button">Interiors 예시방 배치</button>` +
        `<h4>집 크기</h4><div class="rd-layout-grid">${Object.values(ROOM_LAYOUTS).map(layout => {
          const unlocked = isLayoutUnlocked(layout.id);
          const active = normalizeLayout(room.layout) === layout.id;
          return `<button class="rd-layout-card${active ? ' on' : ''}${unlocked ? '' : ' locked'}" data-layout="${layout.id}" type="button">
            <span><strong>${layout.name}</strong><small>${layout.desc} · ${layout.w}x${layout.d}</small></span>
            <em>${unlocked ? (active ? '사용 중' : '선택') : `DJ ${Number(layout.price || 0).toLocaleString()}`}</em>
          </button>`;
        }).join('')}</div>` +
        `<h4>바닥</h4><div class="rd-swrow">${Object.entries(FLOOR_STYLES).map(([key, floor]) =>
          `<button class="rd-sw${normalizeFloor(room.floor) === key ? ' on' : ''}" data-floor="${key}" title="${escAttr(floor.name)}" type="button"><img src="${escAttr(floor.asset)}" alt=""></button>`).join('')}</div>` +
        `<h4>벽지</h4><div class="rd-swrow">${Object.entries(WALL_STYLES).map(([key, wall]) =>
          `<button class="rd-sw${normalizeWall(room.wall) === key ? ' on' : ''}" data-wall-style="${key}" title="${escAttr(wall.name)}" type="button"><img src="${escAttr(wall.right)}" alt=""></button>`).join('')}</div>`;
      return;
    }

    $grid.style.display = 'grid';
    $styleGrid.style.display = 'none';
    $grid.innerHTML = Object.values(catalog)
      .filter(item => item.cat === curTab)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
      .map(item => {
        const locked = !isOwned(item.id);
        return `<div class="rd-card${locked ? ' locked' : ''}${placingType === item.id ? ' on' : ''}" data-item="${escAttr(item.id)}">
          ${itemThumb(item)}
          <div class="nm">${escAttr(item.name)}</div>
          ${locked ? `<div class="pr">DJ ${Number(item.price || 0).toLocaleString()}</div>` : ''}
        </div>`;
      }).join('');
  }

  function setTip(message) {
    if (!$tip) return;
    $tip.textContent = message || '';
    $tip.style.display = message ? 'block' : 'none';
  }

  function showToast(message) {
    if (!$toast) return;
    $toast.textContent = message;
    $toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $toast.classList.remove('show'), 1800);
  }

  function updateActionBar() {
    if (!$bar) return;
    const item = room && room.placed.find(p => p.id === selectedId);
    if (!item || !catalog[item.type]) {
      $bar.style.display = 'none';
      return;
    }
    $bar.style.display = 'flex';
    $view.querySelector('#rd-ab-name').textContent = catalog[item.type].name;
    const rotate = $view.querySelector('#rd-ab-rotate');
    if (rotate) rotate.disabled = !canRotateItem(item.type);
  }

  function clearModes() {
    placingType = null;
    movingId = null;
    selectedId = null;
    hover = null;
    setTip('');
    updateActionBar();
    renderSidebar();
    render();
  }

  function applyShowroom() {
    const next = [];
    NATIVE_SHOWROOM_ITEMS.forEach(sample => {
      if (!catalog[sample.type] || !isOwned(sample.type)) return;
      next.push({ id: nextId++, ...sample });
    });
    if (!next.length) {
      showToast('보유한 Interiors 가구가 아직 없어요');
      return;
    }
    room.placed = next;
    room.floor = 'woodbright';
    room.wall = 'bone';
    renderSidebar();
    render();
    scheduleSave();
    showToast('Interiors 예시방을 배치했어요');
  }

  function applyZoom() {
    if (!$svg) return;
    $svg.style.transform = `scale(${zoom.toFixed(2)})`;
    if ($zoomLabel) $zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  }

  function setZoom(value) {
    zoom = clamp(Number(value) || 1, CONFIG.MIN_ZOOM, CONFIG.MAX_ZOOM);
    applyZoom();
  }

  function bindEvents() {
    $view.querySelectorAll('.rd-tabs button').forEach(button => {
      button.onclick = () => {
        $view.querySelectorAll('.rd-tabs button').forEach(node => node.classList.remove('on'));
        button.classList.add('on');
        curTab = button.dataset.tab;
        clearModes();
      };
    });

    $grid.onclick = event => {
      const card = event.target.closest('.rd-card');
      if (!card) return;
      const id = card.dataset.item;
      const item = catalog[id];
      if (!item) return;
      if (!isOwned(id)) {
        purchase(id);
        return;
      }
      selectedId = null;
      movingId = null;
      placingType = id;
      hover = null;
      setTip(`「${item.name}」 놓을 위치를 선택하세요`);
      renderSidebar();
      render();
    };

    $styleGrid.onclick = event => {
      if (event.target.closest('[data-light-toggle]')) {
        room.lightsOn = room.lightsOn === false;
        renderSidebar();
        render();
        scheduleSave();
        showToast(room.lightsOn === false ? '불을 껐어요' : '불을 켰어요');
        return;
      }
      const showroom = event.target.closest('[data-native-showroom]');
      if (showroom) {
        applyShowroom();
        return;
      }
      const layout = event.target.closest('[data-layout]');
      if (layout) {
        chooseLayout(layout.dataset.layout);
        return;
      }
      const floor = event.target.closest('[data-floor]');
      if (floor) {
        room.floor = normalizeFloor(floor.dataset.floor);
        renderSidebar();
        render();
        scheduleSave();
        return;
      }
      const wall = event.target.closest('[data-wall-style]');
      if (wall) {
        room.wall = normalizeWall(wall.dataset.wallStyle);
        renderSidebar();
        render();
        scheduleSave();
      }
    };

    $styleGrid.oninput = event => {
      if (!event.target.matches('[data-light-level]')) return;
      room.lightLevel = normalizeLightLevel(event.target.value);
      const value = event.target.closest('.rd-range-label')?.querySelector('strong');
      if (value) value.textContent = `${room.lightLevel}%`;
      render();
      scheduleSave();
    };

    $svg.addEventListener('mousemove', event => {
      if (!placingType && !movingId) return;
      const type = placingType || room.placed.find(p => p.id === movingId)?.type;
      const wallTile = event.target.closest('.rd-wall-tile');
      const floorTile = event.target.closest('.rd-tile');
      const nextHover = isWallItem(type)
        ? (wallTile ? { surface: 'wall', wall: wallTile.dataset.wall, wx: Number(wallTile.dataset.wx), wz: Number(wallTile.dataset.wz) } : null)
        : (floorTile ? { surface: 'floor', gx: Number(floorTile.dataset.gx), gy: Number(floorTile.dataset.gy) } : null);
      if (JSON.stringify(nextHover) !== JSON.stringify(hover)) {
        hover = nextHover;
        render();
      }
    });

    $svg.addEventListener('click', event => {
      const obj = event.target.closest('.rd-obj');
      const tile = event.target.closest('.rd-tile');
      const wallTile = event.target.closest('.rd-wall-tile');

      if (placingType || movingId) {
        const current = movingId ? room.placed.find(p => p.id === movingId) : null;
        const type = placingType || current?.type;
        if (!type) return;
        if (isWallItem(type)) {
          if (!wallTile) return;
          const wall = wallTile.dataset.wall;
          const wx = Number(wallTile.dataset.wx);
          const wz = Number(wallTile.dataset.wz);
          if (!fitsWall(type, wall, wx, wz, movingId)) {
            showToast('여기에는 놓을 수 없어요!');
            return;
          }
          if (placingType) {
            room.placed.push({ id: nextId++, type, surface: 'wall', wall, wx, wz, rot: 0 });
            showToast(`${catalog[type].name} 배치 완료!`);
          } else if (current) {
            current.surface = 'wall';
            current.wall = wall;
            current.wx = wx;
            current.wz = wz;
            current.rot = 0;
          }
          clearModes();
          scheduleSave();
          return;
        }
        if (!tile) return;
        const gx = Number(tile.dataset.gx);
        const gy = Number(tile.dataset.gy);
        const rot = current ? current.rot : 0;
        if (!fits(type, gx, gy, movingId, rot)) {
          showToast('여기에는 놓을 수 없어요!');
          return;
        }
        if (placingType) {
          room.placed.push({ id: nextId++, type, gx, gy, rot: 0 });
          showToast(`${catalog[type].name} 배치 완료!`);
        } else if (current) {
          current.gx = gx;
          current.gy = gy;
        }
        clearModes();
        scheduleSave();
        return;
      }

      if (obj) {
        selectedId = Number(obj.dataset.id);
        const item = room.placed.find(p => p.id === selectedId);
        setTip(`「${catalog[item.type].name}」 선택됨 · 이동/회전/삭제를 선택하세요`);
        updateActionBar();
        render();
        return;
      }
      clearModes();
    });

    $view.querySelector('#rd-ab-move').onclick = () => {
      if (!selectedId) return;
      movingId = selectedId;
      const item = room.placed.find(p => p.id === movingId);
      if (!item) return;
      setTip(`「${catalog[item.type].name}」 새 위치를 선택하세요`);
      updateActionBar();
      render();
    };

    $view.querySelector('#rd-ab-rotate').onclick = () => {
      const item = room.placed.find(p => p.id === selectedId);
      if (!item) return;
      if (!canRotateItem(item.type)) {
        showToast('이 아이템은 회전하지 않아도 되는 장식이에요.');
        return;
      }
      const nextRot = (normalizeRotation(item.rot) + 90) % 360;
      if (!isWallItem(item.type) && !fitsWithRotation(item.type, item.gx, item.gy, nextRot, item.id)) {
        showToast('이 위치에서는 회전할 수 없어요!');
        return;
      }
      item.rot = nextRot;
      showToast('아이템을 회전했어요');
      updateActionBar();
      render();
      scheduleSave();
    };

    $view.querySelector('#rd-ab-del').onclick = () => {
      room.placed = room.placed.filter(p => p.id !== selectedId);
      selectedId = null;
      updateActionBar();
      render();
      scheduleSave();
      showToast('아이템을 보관함에 넣었어요');
    };

    $view.querySelector('#rd-ab-cancel').onclick = () => clearModes();
    $view.querySelector('#rd-zoom-out').onclick = () => setZoom(zoom - CONFIG.ZOOM_STEP);
    $view.querySelector('#rd-zoom-in').onclick = () => setZoom(zoom + CONFIG.ZOOM_STEP);
    $svg.addEventListener('wheel', event => {
      if (!opened) return;
      event.preventDefault();
      setZoom(zoom + (event.deltaY < 0 ? CONFIG.ZOOM_STEP : -CONFIG.ZOOM_STEP));
    }, { passive: false });
    $view.querySelector('#rd-back').onclick = () => {
      close();
      if (onBack) onBack();
    };
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && opened) clearModes();
    });
  }

  function init(opts = {}) {
    getUserId = opts.getUserId;
    onBack = opts.onBack || null;
    db = firebase.firestore();
    fns = firebase.app().functions(CONFIG.REGION);
    $view = document.getElementById('room-view');
    if (!$view) {
      console.error('[room] #room-view is missing.');
      return;
    }
    $svg = $view.querySelector('#rd-svg');
    $grid = $view.querySelector('#rd-grid');
    $styleGrid = $view.querySelector('#rd-style');
    $coin = $view.querySelector('#rd-coin');
    $tip = $view.querySelector('#rd-tip');
    $bar = $view.querySelector('#rd-actionbar');
    $toast = $view.querySelector('#rd-toast');
    $zoomLabel = $view.querySelector('#rd-zoom-label');
    bindEvents();
    new MutationObserver(() => {
      if ($view.hidden && opened) close();
    }).observe($view, { attributes: true, attributeFilter: ['hidden'] });
  }

  async function open() {
    const uid = getUserId && getUserId();
    if (!uid) {
      console.warn('[room] no user id.');
      return;
    }
    const version = ++openVersion;
    opened = true;
    await loadCatalog();
    if (!opened || version !== openVersion) return;
    await loadRoom(uid);
    if (!opened || version !== openVersion) return;
    watchEconomy(uid);
    watchInventory(uid);
    setZoom(1);
    curTab = 'furniture';
    $view.querySelectorAll('.rd-tabs button').forEach(button => {
      button.classList.toggle('on', button.dataset.tab === curTab);
    });
    clearModes();
  }

  function close() {
    if (!opened) return;
    opened = false;
    openVersion += 1;
    unsubs.forEach(unsub => {
      try { unsub(); } catch (error) { console.warn('[room] unsubscribe failed.', error); }
    });
    unsubs = [];
    clearTimeout(saveTimer);
    saveTimer = null;
    placingType = null;
    movingId = null;
    selectedId = null;
    hover = null;
    setTip('');
    if ($bar) $bar.style.display = 'none';
  }

  return { init, open, close };
})();
