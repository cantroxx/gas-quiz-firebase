// 카탈로그·아바타 부품·방 모양·벽지 데이터는 housing-catalog.js 로 분리됨 (index.html에서 먼저 로드)


// heightmap 문자열을 타일 정보로 해석
function parseRoomModel(modelName) {
    const def = ROOM_MODELS[modelName];
    const rows = def.map.split("|");
    const h = rows.length;
    const w = rows[0].length;

    const floor = [];       // floor[y][x] = true (문 타일 포함)
    const rowMinX = {};     // 각 행의 첫 바닥 x (벽 그리기용, 문 제외)
    const colMinY = {};     // 각 열의 첫 바닥 y (벽 그리기용, 문 제외)

    for (let y = 0; y < h; y++) {
        floor[y] = [];
        for (let x = 0; x < w; x++) {
            const isF = rows[y][x] !== 'x';
            floor[y][x] = isF;
            if (isF) {
                if (rowMinX[y] === undefined) rowMinX[y] = x;
                if (colMinY[x] === undefined) colMinY[x] = y;
            }
        }
    }

    // 문 타일도 걸을 수 있는 바닥으로 추가
    floor[def.door.y][def.door.x] = true;

    // 방을 화면 중앙에 놓기 위한 등각투영 좌표 범위
    let isoXMin = Infinity, isoXMax = -Infinity, isoYMin = Infinity, isoYMax = -Infinity;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (!floor[y][x]) continue;
            isoXMin = Math.min(isoXMin, x - y); isoXMax = Math.max(isoXMax, x - y);
            isoYMin = Math.min(isoYMin, x + y); isoYMax = Math.max(isoYMax, x + y);
        }
    }

    return { name: modelName, def, w, h, floor, rowMinX, colMinY, isoXMin, isoXMax, isoYMin, isoYMax, door: def.door };
}

let currentRoom = parseRoomModel("model_a");

function isFloorTile(x, y) {
    return y >= 0 && y < currentRoom.h && x >= 0 && x < currentRoom.w && currentRoom.floor[y][x];
}

function isDoorTile(x, y) {
    return x === currentRoom.door.x && y === currentRoom.door.y;
}

// 2. 상태 관리 + localStorage 저장
const SAVE_KEY = "housing_save_v1";

let state = {
    credits: 2000,
    playerName: "나",
    roomModel: "model_a",
    wallTheme: 0,         // 벽지 (WALL_THEMES id)
    floorTheme: 0,        // 바닥 (FLOOR_THEMES id)
    inventory: [],        // classname 배열
    placedItems: [],      // { id, classname, x, y, rot }
    selectedCatalogItem: null,
    selectedPlacedItem: null,
    visiting: null,       // 친구집 방문 중이면 { ownerId, ownerName } — 구경 전용
    trialPaper: null,     // 벽지·바닥 발라보기 중이면 { paper: 'wall'|'floor', themeId, item }
    unlockedModels: [],   // 게스트 모드에서 구매한 방 모양 (온라인은 서버 보유 목록 사용)
    simMode: null,        // 연습 모드 중이면 { snapshot, remaining, usedBefore, startedAt, timer }
    simUsage: null,       // 오늘 연습 사용 시간 { dateKey: 'YYYY-MM-DD', seconds }
    favorites: [],        // 즐겨찾기 상품 ID 목록 (room_<cn> / room_paper_...) 최대 50개

    mode: 'normal',       // 'normal' | 'placing' | 'moving'
    placementItem: null,  // 배치 중인 가구 모델
    placementSource: null,// { type: 'inventory' } | { type: 'move', original: {...} }
    placementX: 0,
    placementY: 0,
    placementRot: 0,

    avatar: {
        x: 3, y: 5, z: 0, // 시작 위치는 초기화 시 문 좌표로 다시 설정됨
        dir: 2,
        isWalking: false,
        path: [],
        stepTimer: 0,
        sitting: null,    // { itemId, pose: 'sit'|'lay', dir, z }
        pendingPose: null,// 도착하면 앉거나 누울 예약 { itemId, pose }
        // 아바타 생김새 (부품별 선택값) — figure 문자열은 여기서 만들어짐
        look: { gender: 'M', skin: 1, hd: 180, hr: 100, ha: 0, haColor: 61, ea: 0, fa: 0, cc: 0, ccColor: 64, ca: 0, wa: 0, ch: 225, chColor: 82, lg: 270, lgColor: 64, sh: 290, shColor: 61 },
        genderLocked: false, // 남/여를 한 번 정하면 true — 이후 변경 불가 (구제는 문의하기)
        figure: "" // buildFigure()가 채움
    }
};

// look 객체 → 하보 figure 문자열
function buildFigure(look) {
    const parts = [`hd-${look.hd}-${look.skin}`];
    if (look.hr !== 0) parts.push(`hr-${look.hr}-${HAIR_COLOR}`);
    if (look.ha !== 0) parts.push(`ha-${look.ha}-${look.haColor}`);
    if (look.ea !== 0) parts.push(`ea-${look.ea}-62`); // 안경은 색 고정
    if (look.fa !== 0) parts.push(`fa-${look.fa}-62`);   // 얼굴 장식
    if (look.cc !== 0) parts.push(`cc-${look.cc}-${look.ccColor}`); // 외투
    if (look.ca !== 0) parts.push(`ca-${look.ca}-62`);   // 목걸이·가슴 장식
    if (look.wa !== 0) parts.push(`wa-${look.wa}-62`);   // 벨트
    parts.push(`ch-${look.ch}-${look.chColor}`);
    parts.push(`lg-${look.lg}-${look.lgColor}`);
    parts.push(`sh-${look.sh}-${look.shColor}`);
    return parts.join(".");
}

// look이 바뀔 때마다 figure 문자열과 프로필 아이콘을 갱신 + 이동 스프라이트 미리 로딩
function refreshAvatarFigure() {
    state.avatar.figure = buildFigure(state.avatar.look);
    const profileImg = document.querySelector('#btn-profile img');
    if (profileImg) {
        profileImg.src = imagerUrl(`figure=${state.avatar.figure}&size=m&direction=2&head_direction=2&gesture=sml&headonly=1`);
    }
    preloadAvatarSprites();
}

// 8방향의 서기·걷기·앉기 스프라이트를 미리 받아둠 → 첫 걸음에 아바타가 사라지지 않게
function preloadAvatarSprites() {
    const fig = state.avatar.figure;
    for (let d = 0; d < 8; d++) {
        getCachedImage(imagerUrl(`figure=${fig}&size=m&direction=${d}&head_direction=${d}&action=std`));
        getCachedImage(imagerUrl(`figure=${fig}&size=m&direction=${d}&head_direction=${d}&action=wlk`));
    }
    // 앉기는 의자 방향(2,4,6,0)만 쓰이므로 그 방향만
    for (const d of [0, 2, 4, 6]) {
        getCachedImage(imagerUrl(`figure=${fig}&size=m&direction=${d}&head_direction=${d}&action=sit`));
    }
}

function saveGame() {
    const payload = {
        credits: state.credits,
        playerName: state.playerName,
        roomModel: state.roomModel,
        wallTheme: state.wallTheme,
        floorTheme: state.floorTheme,
        look: state.avatar.look,
        genderLocked: state.avatar.genderLocked === true,
        inventory: state.inventory,
        unlockedModels: state.unlockedModels,
        favorites: state.favorites,
        simUsage: state.simUsage,
        placedItems: state.placedItems.filter(i => !i.trial) // 배치 테스트품은 저장하지 않음
    };
    if (state.visiting) return; // 친구집 구경 중에는 아무것도 저장하지 않음

    // 연습 모드 중에는 방 내용은 진입 전 스냅샷을 저장 (연습 결과물이 새어나가지 않게)
    // — 즐겨찾기·연습 사용 시간은 현재 값 그대로 저장됨
    if (state.simMode) {
        const s = state.simMode.snapshot;
        payload.roomModel = s.roomModel;
        payload.wallTheme = s.wallTheme;
        payload.floorTheme = s.floorTheme;
        payload.inventory = s.inventory;
        payload.placedItems = s.placedItems;
    }

    // 온라인 모드: 코인·가방은 서버(userEconomy·userInventory)가 관리하므로 방 상태만 저장
    if (window.HousingData?.mode === 'online') {
        HousingData.saveRoom(payload);
        return;
    }
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (e) { /* 저장 실패는 무시 (사파리 시크릿 모드 등) */ }
}

function loadGame() {
    // 온라인 모드: Firestore 방 문서 + 서버 보유 목록에서 복원
    if (window.HousingData?.mode === 'online') {
        state.credits = HousingData.djCoin;
        if (HousingData.roomData) applySavedData(HousingData.roomData);
        // 이름은 항상 퀴즈타운 닉네임이 이김 (저장된 옛 이름을 덮어씀 — 자동 연동)
        const nickname = HousingData.member?.nickname;
        if (nickname) state.playerName = String(nickname).slice(0, 10);
        // 가방 = 서버 보유 수량 − 방에 배치된 수량 (배치/회수는 이 관계를 그대로 유지함)
        const placedCount = {};
        state.placedItems.forEach(i => { placedCount[i.classname] = (placedCount[i.classname] || 0) + 1; });
        state.inventory = [];
        CATALOG_ITEMS.forEach(item => {
            const owned = HousingData.ownedCount(HousingData.furniItemId(item.classname));
            const inBag = owned - (placedCount[item.classname] || 0);
            for (let k = 0; k < inBag; k++) state.inventory.push(item.classname);
        });
        return;
    }
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (typeof data.credits === 'number') state.credits = data.credits;
        if (Array.isArray(data.inventory)) state.inventory = data.inventory.filter(c => getModel(c));
        applySavedData(data);
    } catch (e) { /* 손상된 저장 데이터는 무시 */ }
}

// 저장 데이터(로컬/Firestore 공용)를 검증하며 state에 반영
function applySavedData(data) {
    try {
        if (typeof data.playerName === 'string') state.playerName = data.playerName;
        if (typeof data.roomModel === 'string' && ROOM_MODELS[data.roomModel]) state.roomModel = data.roomModel;
        if (typeof data.wallTheme === 'number' && WALL_THEMES[data.wallTheme]) state.wallTheme = data.wallTheme;
        if (typeof data.floorTheme === 'number' && FLOOR_THEMES[data.floorTheme]) state.floorTheme = data.floorTheme;
        if (data.look && typeof data.look === 'object') {
            // 저장된 부품 ID가 유효 목록에 있을 때만 반영 (목록이 바뀌어도 안전)
            const l = state.avatar.look;
            if (SKIN_COLORS.some(c => c.id === data.look.skin)) l.skin = data.look.skin;
            if (AVATAR_PART_SETS.hd.includes(data.look.hd)) l.hd = data.look.hd;
            if (AVATAR_PART_SETS.hr.includes(data.look.hr)) l.hr = data.look.hr;
            if (AVATAR_PART_SETS.ha.includes(data.look.ha)) l.ha = data.look.ha;
            if (AVATAR_PART_SETS.ea.includes(data.look.ea)) l.ea = data.look.ea;
            if (AVATAR_PART_SETS.ch.includes(data.look.ch)) l.ch = data.look.ch;
            if (AVATAR_PART_SETS.lg.includes(data.look.lg)) l.lg = data.look.lg;
            if (AVATAR_PART_SETS.sh.includes(data.look.sh)) l.sh = data.look.sh;
            if (AVATAR_PART_SETS.fa.includes(data.look.fa)) l.fa = data.look.fa;
            if (AVATAR_PART_SETS.cc.includes(data.look.cc)) l.cc = data.look.cc;
            if (AVATAR_PART_SETS.ca.includes(data.look.ca)) l.ca = data.look.ca;
            if (AVATAR_PART_SETS.wa.includes(data.look.wa)) l.wa = data.look.wa;
            if (data.look.gender === 'M' || data.look.gender === 'F') l.gender = data.look.gender;
            if (CLOTH_COLORS.some(c => c.id === data.look.ccColor)) l.ccColor = data.look.ccColor;
            if (CLOTH_COLORS.some(c => c.id === data.look.haColor)) l.haColor = data.look.haColor;
            if (CLOTH_COLORS.some(c => c.id === data.look.chColor)) l.chColor = data.look.chColor;
            if (CLOTH_COLORS.some(c => c.id === data.look.lgColor)) l.lgColor = data.look.lgColor;
            if (CLOTH_COLORS.some(c => c.id === data.look.shColor)) l.shColor = data.look.shColor;
        }
        if (Array.isArray(data.placedItems)) state.placedItems = data.placedItems.filter(i => getModel(i.classname));
        if (Array.isArray(data.unlockedModels)) state.unlockedModels = data.unlockedModels.filter(n => ROOM_MODELS[n]);
        if (Array.isArray(data.favorites)) state.favorites = data.favorites.filter(id => typeof id === 'string').slice(0, 50);
        if (data.simUsage && typeof data.simUsage.dateKey === 'string' && typeof data.simUsage.seconds === 'number') {
            state.simUsage = { dateKey: data.simUsage.dateKey, seconds: Math.max(0, data.simUsage.seconds) };
        }
        if (data.genderLocked === true) state.avatar.genderLocked = true;
    } catch (e) { /* 손상된 저장 데이터는 무시 */ }
}

// 방 모델 적용: 새 방 바닥에 없는 가구는 가방으로 돌려보냄, 아바타는 문에서 재시작
function applyRoomModel(modelName) {
    state.roomModel = modelName;
    currentRoom = parseRoomModel(modelName);

    const kept = [], returned = [];
    for (const item of state.placedItems) {
        if (isFloorTile(item.x, item.y) && !isDoorTile(item.x, item.y)) kept.push(item);
        else returned.push(item);
    }
    if (returned.length > 0) {
        returned.forEach(i => state.inventory.push(i.classname));
        state.placedItems = kept;
    }

    const a = state.avatar;
    a.x = currentRoom.door.x;
    a.y = currentRoom.door.y;
    a.z = 0;
    a.dir = currentRoom.door.dir;
    a.path = [];
    a.sitting = null;
    a.pendingPose = null;
    a.stepTimer = 0;

    resizeCanvas();
    return returned.length;
}

// 3. 이미지 캐싱
const imageCache = {};
function getCachedImage(url) {
    if (!imageCache[url]) {
        const img = new Image();
        img.src = url;
        imageCache[url] = img;
    }
    return imageCache[url];
}

// 3-2. 원본 가구 스프라이트 (하보 SWF → CycloneIO 변환본)
// 가구마다: dimensions(크기·앉는높이 z), 방향별 스프라이트 오프셋, 레이어 순서, 정품 색상값 포함
// 저작권 보호를 위해 개별 파일 대신 Storage의 잠긴 묶음(assets-loader.js)에서 읽는다
const furniCache = {}; // classname → { status: 'loading'|'ready'|'failed', data }

function loadFurni(cn) {
    if (furniCache[cn]) return furniCache[cn];
    const entry = { status: 'loading' };
    furniCache[cn] = entry;

    window.HousingAssets.ready.then(() => {
        const b = window.HousingAssets.furni[cn];
        if (!b) { entry.status = 'failed'; return; }
        const img = new Image();
        img.onload = () => {
            entry.data = { cn, def: b.def, frames: b.frames, img };
            entry.status = 'ready';
        };
        img.onerror = () => { entry.status = 'failed'; };
        img.src = 'data:image/png;base64,' + b.png;
    }).catch(() => { entry.status = 'failed'; });

    return entry;
}

// 준비됐으면 데이터, 아니면 null (로딩은 자동 시작)
function furniReady(cn) {
    const e = loadFurni(cn);
    return e.status === 'ready' ? e.data : null;
}

// 에셋 이름 → 실제 프레임/오프셋/좌우반전 정보 (source 참조 따라가기)
function resolveFurniAsset(fd, name) {
    const a = fd.def.assets[name];
    if (!a) return null;
    const frameName = a.source || name;
    if (!fd.frames[`${fd.cn}_${frameName}.png`]) return null;
    return { frameName, x: a.x || 0, y: a.y || 0, flipH: !!a.flipH };
}

// 요청 방향/프레임에 에셋이 없으면 있는 것으로 대체
function furniAssetForDir(fd, layerKey, dir, frame) {
    frame = frame || 0;
    for (const f of (frame ? [frame, 0] : [0])) {          // 요청 프레임 우선, 없으면 0번
        for (const d of [dir, 0, 2, 4, 6]) {               // 요청 방향 우선, 없으면 대체 방향
            const res = resolveFurniAsset(fd, `${fd.cn}_64_${layerKey}_${d}_${f}`);
            if (res) return res;
        }
    }
    return null;
}

// 가전 상태(작동) 관련 --------------------------------------------------------
const ANIM_MS = 120; // 애니메이션 프레임 간격(ms)

// 이 가구가 '작동' 가능한지 (상태가 2개 이상)
function usableStates(fd) {
    const anims = fd && fd.def.visualization.animations;
    if (!anims) return [];
    return Object.keys(anims).map(Number).sort((a, b) => a - b);
}
function isUsable(cn) {
    const fd = furniReady(cn);
    return fd ? usableStates(fd).length >= 2 : false;
}
// 새로 놓을 때의 기본 상태(대개 0=꺼짐)
function defaultState(fd) {
    const s = usableStates(fd);
    return s.includes(0) ? 0 : (s.length ? s[0] : 0);
}
// 특정 레이어가 현재 상태에서 보여줄 프레임 번호 (애니메이션이면 시간에 따라 순환)
function frameForLayer(fd, item, layerIdx) {
    const anims = fd.def.visualization.animations;
    if (!anims) return 0;
    const st = (item.state !== undefined) ? item.state : defaultState(fd);
    const sd = anims[st];
    const ld = sd && sd.layers && sd.layers[layerIdx];
    if (!ld || !ld.frames || ld.frames.length === 0) return 0;
    if (ld.frames.length === 1) return ld.frames[0];
    const idx = Math.floor(performance.now() / ANIM_MS) % ld.frames.length;
    return ld.frames[idx];
}

// 기본 색상(원본 색상표의 첫 번째)의 레이어별 색 정보
function furniDefaultColors(fd) {
    const colors = fd.def.visualization && fd.def.visualization.colors;
    if (!colors) return null;
    const first = Object.keys(colors).sort((a, b) => Number(a) - Number(b))[0];
    return first !== undefined && colors[first] ? (colors[first].layers || null) : null;
}

// 색칠(틴트)된 스프라이트 캔버스 (결과 캐시)
const tintCache = {};
function tintedFrame(fd, frameName, colorInt) {
    const key = `${fd.cn}|${frameName}|${colorInt}`;
    if (tintCache[key]) return tintCache[key];

    const fr = fd.frames[`${fd.cn}_${frameName}.png`].frame;
    const c = document.createElement('canvas');
    c.width = fr.w; c.height = fr.h;
    const cx = c.getContext('2d');
    cx.drawImage(fd.img, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
    if (colorInt !== null && colorInt !== undefined) {
        cx.globalCompositeOperation = 'multiply';
        cx.fillStyle = '#' + colorInt.toString(16).padStart(6, '0');
        cx.fillRect(0, 0, fr.w, fr.h);
        cx.globalCompositeOperation = 'destination-in';
        cx.drawImage(fd.img, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
    }
    tintCache[key] = c;
    return c;
}

// 가구 스프라이트 기준점: 오프셋 좌표계의 원점 = 타일 중심 (타일 위 꼭짓점 + 16px)
const FURNI_ANCHOR_DY = 16;

// 가구 레이어 한 장 그리기. layerKey: 'a'~'h'(레이어) 또는 'sd'(그림자)
function drawFurniLayer(item, fd, layerKey, isGhost) {
    const dir = rotToDir(item.rot);
    const layerIdx = (layerKey === 'sd') ? -1 : layerKey.charCodeAt(0) - 97;
    const frame = (layerIdx >= 0 && !isGhost) ? frameForLayer(fd, item, layerIdx) : 0;
    const res = furniAssetForDir(fd, layerKey, dir, frame);
    if (!res) return;

    const s = gridToScreen(item.x, item.y, item.z || 0); // 테이블 위 등 높이 반영
    const ax = s.x;
    const ay = s.y + FURNI_ANCHOR_DY;

    // 레이어 인덱스에 해당하는 정품 색상
    let colorInt = null;
    if (layerKey !== 'sd') {
        const layerIdx = layerKey.charCodeAt(0) - 97;
        const colorLayers = furniDefaultColors(fd);
        if (colorLayers && colorLayers[layerIdx] && colorLayers[layerIdx].color !== undefined) {
            colorInt = colorLayers[layerIdx].color;
        }
    }

    const sprite = tintedFrame(fd, res.frameName, colorInt);

    ctx.save();
    if (isGhost) ctx.globalAlpha = 0.5;
    if (item.trial && !isGhost && layerKey !== 'sd') ctx.globalAlpha = 0.55; // 배치 테스트품은 반투명
    if (layerKey === 'sd') ctx.globalAlpha = (isGhost ? 0.15 : 0.3); // 그림자는 반투명
    if (!isGhost && state.selectedPlacedItem && state.selectedPlacedItem.id === item.id && layerKey !== 'sd') {
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
    }

    if (res.flipH) {
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, -(ax + res.x), ay - res.y);
    } else {
        ctx.drawImage(sprite, ax - res.x, ay - res.y);
    }
    ctx.restore();
}

// 배치 미리보기(유령)용: 그림자+전 레이어를 한 번에
function drawFurniGhost(item, fd) {
    drawFurniLayer(item, fd, 'sd', true);
    const lc = fd.def.visualization.layerCount || 1;
    for (let i = 0; i < lc; i++) {
        drawFurniLayer(item, fd, String.fromCharCode(97 + i), true);
    }
}

// ==== 상점 아이콘 로컬 렌더 ====
// habboassets 원격 아이콘 대신, 로컬 스프라이트시트에 든 정품 icon 프레임(_icon_a, _icon_b...)을
// 합성해 dataURL로 만든다. → 상점 로딩 지연 제거 + habboassets 의존 제거.
const iconCache = {}; // classname → dataURL

function furniIconDataURL(cn) {
    if (iconCache[cn]) return iconCache[cn];
    const fd = furniReady(cn);
    if (!fd) return null;

    // icon 레이어 수집 (a, b, c ... 순서 = 색칠 레이어 인덱스와 대응)
    const layers = [];
    for (let i = 0; i < 8; i++) {
        const res = resolveFurniAsset(fd, `${cn}_icon_${String.fromCharCode(97 + i)}`);
        if (res) layers.push({ res, idx: i });
    }
    if (layers.length === 0) return null;

    // 배치 범위 계산 (오프셋 기준점 0,0)
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (const L of layers) {
        const fr = fd.frames[`${cn}_${L.res.frameName}.png`].frame;
        const left = L.res.flipH ? (L.res.x - fr.w) : -L.res.x;
        const top = -L.res.y;
        minX = Math.min(minX, left); maxX = Math.max(maxX, left + fr.w);
        minY = Math.min(minY, top);  maxY = Math.max(maxY, top + fr.h);
    }

    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(maxX - minX));
    c.height = Math.max(1, Math.ceil(maxY - minY));
    const cx = c.getContext('2d');
    const colorLayers = furniDefaultColors(fd);
    for (const L of layers) {
        let colorInt = null;
        if (colorLayers && colorLayers[L.idx] && colorLayers[L.idx].color !== undefined) {
            colorInt = colorLayers[L.idx].color;
        }
        const sprite = tintedFrame(fd, L.res.frameName, colorInt);
        const left = (L.res.flipH ? (L.res.x - sprite.width) : -L.res.x) - minX;
        const top = -L.res.y - minY;
        if (L.res.flipH) {
            cx.save(); cx.scale(-1, 1);
            cx.drawImage(sprite, -(left + sprite.width), top);
            cx.restore();
        } else {
            cx.drawImage(sprite, left, top);
        }
    }
    iconCache[cn] = c.toDataURL();
    return iconCache[cn];
}

// <img>에 로컬 아이콘 적용. 아직 로딩 전이면 로딩 완료 후 채워 넣음.
function setFurniIcon(img, cn) {
    const url = furniIconDataURL(cn);
    if (url) { img.src = url; return; }
    loadFurni(cn);
    const timer = setInterval(() => {
        const e = furniCache[cn];
        if (!e || e.status === 'loading') return;
        clearInterval(timer);
        const u = furniIconDataURL(cn);
        if (u) img.src = u;
        else { const m = getModel(cn); if (m && m.imgUrl) img.src = m.imgUrl; } // 최후 폴백: 원격 아이콘
    }, 120);
}

// 벽지·바닥 데이터(WALL_THEMES·FLOOR_THEMES·PAPER_ITEMS)는 housing-catalog.js 에 있음

// 밝기 조절: f<1 어둡게, f>1 밝게 (흰색 쪽으로)
function shadeHex(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f <= 1) { r *= f; g *= f; b *= f; }
    else { const t = f - 1; r += (255 - r) * t; g += (255 - g) * t; b += (255 - b) * t; }
    const c = v => Math.max(0, Math.min(255, Math.round(v)));
    return '#' + ((c(r) << 16) | (c(g) << 8) | c(b)).toString(16).padStart(6, '0');
}

// 상점 카드용 색 견본 이미지
function paperSwatchURL(p) {
    const key = `paper|${p.paper}|${p.themeId}`;
    if (iconCache[key]) return iconCache[key];
    const c = document.createElement('canvas'); c.width = 40; c.height = 40;
    const cx = c.getContext('2d');
    if (p.paper === 'wall') {
        cx.fillStyle = p.hex; cx.fillRect(0, 0, 40, 40);
        cx.fillStyle = shadeHex(p.hex, 0.55); cx.fillRect(0, 32, 40, 8); // 걸레받이 느낌
    } else {
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
            cx.fillStyle = (i + j) % 2 ? shadeHex(p.hex, 0.92) : p.hex;
            cx.fillRect(i * 10, j * 10, 10, 10);
        }
    }
    iconCache[key] = c.toDataURL();
    return iconCache[key];
}

// 현재 방의 벽/바닥 색 (state가 아직 없을 수 있어 함수로)
// 발라보기(구매 전 미리보기) 중이면 그 색을 우선 보여줌
function currentWallHex()  {
    const id = (state.trialPaper && state.trialPaper.paper === 'wall') ? state.trialPaper.themeId : state.wallTheme;
    return (WALL_THEMES[id] || WALL_THEMES[0]).hex;
}
function currentFloorHex() {
    const id = (state.trialPaper && state.trialPaper.paper === 'floor') ? state.trialPaper.themeId : state.floorTheme;
    return (FLOOR_THEMES[id] || FLOOR_THEMES[0]).hex;
}

// 4. 캔버스 설정과 등각투영 수학
const canvas = document.getElementById('room-canvas');
const ctx = canvas.getContext('2d');

const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const HALF_WIDTH = TILE_WIDTH / 2;
const HALF_HEIGHT = TILE_HEIGHT / 2;
const Z_SCALE = 30;

let originX = 0;
let originY = 0;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // 현재 방 모델의 바닥 범위를 기준으로 방을 화면 중앙에 배치
    const r = currentRoom;
    originX = canvas.width / 2 - ((r.isoXMin + r.isoXMax) / 2) * HALF_WIDTH;
    originY = canvas.height / 2 - ((r.isoYMin + r.isoYMax) / 2) * HALF_HEIGHT + 30;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 그리드 → 화면 (타일의 위쪽 꼭짓점 기준)
function gridToScreen(x, y, z = 0) {
    return {
        x: originX + (x - y) * HALF_WIDTH,
        y: originY + (x + y) * HALF_HEIGHT - z * Z_SCALE
    };
}

// 화면 → 그리드 (타일 '중심' 기준으로 역변환해 반 칸 밀림 방지)
function screenToGrid(screenX, screenY) {
    const dx = screenX - originX;
    const dy = screenY - originY - HALF_HEIGHT;
    return {
        x: Math.round((dx / HALF_WIDTH + dy / HALF_HEIGHT) / 2),
        y: Math.round((dy / HALF_HEIGHT - dx / HALF_WIDTH) / 2)
    };
}

// 5. 충돌 검사와 A* 길찾기

// 가구가 차지하는 칸 크기 [가로,세로].
// 하보 원본 dimensions(x,y)는 '방향 0(북)' 기준인데, 우리 rot0 스프라이트는 방향 2(90도)로
// 그림 → rot 0·2에서 가로세로를 교환해야 그림과 막는 칸이 일치한다. (rot 1·3은 원본 그대로)
function itemDims(item) {
    const d = FURNI_DIMS[item.classname];
    const dx = d ? d[0] : 1;
    const dy = d ? d[1] : 1;
    return (item.rot === 1 || item.rot === 3) ? [dx, dy] : [dy, dx];
}

// 가구 높이 z (앉기·쌓기용). FURNI_DIMS 우선.
function furniHeightZ(classname) {
    const d = FURNI_DIMS[classname];
    if (d) return d[2];
    const fd = furniReady(classname);
    return (fd && fd.def.dimensions) ? (fd.def.dimensions.z || 0) : 0;
}

// 가구가 실제로 덮는 모든 칸 (원점에서 +x,+y 방향으로 확장)
function footprintTiles(item) {
    const [w, h] = itemDims(item);
    const tiles = [];
    for (let i = 0; i < w; i++)
        for (let j = 0; j < h; j++)
            tiles.push({ x: item.x + i, y: item.y + j });
    return tiles;
}

function footprintCovers(item, x, y) {
    const [w, h] = itemDims(item);
    return x >= item.x && x < item.x + w && y >= item.y && y < item.y + h;
}

// 이 칸을 덮는 가구 (여러 개면 나중에 놓인=위에 있는 것)
function itemAt(x, y) {
    for (let i = state.placedItems.length - 1; i >= 0; i--) {
        if (footprintCovers(state.placedItems[i], x, y)) return state.placedItems[i];
    }
    return null;
}

// 바닥이 없거나(void) 걸을 수 없는 가구가 덮고 있으면 true
function isBlocked(x, y) {
    if (!isFloorTile(x, y)) return true;
    for (const item of state.placedItems) {
        const model = getModel(item.classname);
        if (model && model.walkable) continue;   // 러그는 통과 가능
        if (footprintCovers(item, x, y)) return true;
    }
    return false;
}

// 가구의 윗면 높이 (z). 스택 계산용.
function itemTopZ(item) {
    return (item.z || 0) + furniHeightZ(item.classname);
}

// 그리기 순서 기준점(깊이). 다칸 가구는 '뷰어에 가장 가까운 코너'(footprint 합 최대 칸) 기준 —
// 원점(합 최소) 기준이면 옆 칸에 선 아바타가 가구 위에 덧칠되는 문제가 생긴다.
// 러그(walkable)는 바닥에 깔린 것이라 원점 기준으로 항상 먼저(뒤에) 그림.
// 테이블 위에 쌓인 물건은 받침 가구보다 항상 앞에 오도록 보정.
function furniDepthBase(item) {
    const model = getModel(item.classname);
    const [w, h] = itemDims(item);
    if (model && model.walkable) return item.x + item.y;
    let base = (item.x + w - 1) + (item.y + h - 1);
    if ((item.z || 0) > 0) {
        for (const s of state.placedItems) {
            if (s.id === item.id) continue;
            const sm = getModel(s.classname);
            if (sm && sm.canStandOn && footprintCovers(s, item.x, item.y)) {
                base = Math.max(base, furniDepthBase(s) + 0.05);
            }
        }
    }
    return base;
}

// (x,y) 칸에 새 물건을 올릴 때의 바닥 높이. 못 올리면 -1.
// 러그(walkable)=높이0 위 허용, 테이블(canStandOn)=그 윗면 높이 위 허용, 그 외 가구=막힘.
function surfaceHeightAt(x, y, ignoreId) {
    let z = 0, blocked = false;
    for (const it of state.placedItems) {
        if (ignoreId !== undefined && it.id === ignoreId) continue;
        if (!footprintCovers(it, x, y)) continue;
        const m = getModel(it.classname);
        if (m && m.walkable) continue;                 // 러그: 바닥 높이 유지
        if (m && m.canStandOn) z = Math.max(z, itemTopZ(it)); // 테이블: 윗면 위에
        else blocked = true;                            // 못 올리는 가구
    }
    return blocked ? -1 : z;
}

// (x,y)에 이 가구를 놓을 수 있으면 배치 높이 z를 반환, 못 놓으면 null.
// footprint 전체가 바닥·문 아님이고, 모든 칸이 같은 높이여야 함(테이블 위에 걸침 방지).
function canPlace(classname, x, y, rot, ignoreId) {
    const tiles = footprintTiles({ classname, x, y, rot });
    let placeZ = null;
    for (const t of tiles) {
        if (!isFloorTile(t.x, t.y) || isDoorTile(t.x, t.y)) return null;
        const h = surfaceHeightAt(t.x, t.y, ignoreId);
        if (h < 0) return null;                 // 못 올리는 가구가 있음
        if (placeZ === null) placeZ = h;
        else if (placeZ !== h) return null;     // 칸마다 높이가 다르면(반은 테이블, 반은 바닥) 불가
    }
    return placeZ;
}

// allowEndBlocked: 도착 칸(의자 등)은 막혀 있어도 허용
function findPath(startX, startY, endX, endY, allowEndBlocked = false) {
    if (!isFloorTile(endX, endY)) return [];
    if (isBlocked(endX, endY) && !allowEndBlocked) return [];
    if (startX === endX && startY === endY) return [];

    const blockedAtEndOk = (x, y) => (x === endX && y === endY) ? false : isBlocked(x, y);
    const blocked = allowEndBlocked ? blockedAtEndOk : isBlocked;

    let openList = [];
    let closedList = new Set();

    const startNode = { x: startX, y: startY, g: 0, h: heuristic(startX, startY, endX, endY), parent: null };
    startNode.f = startNode.g + startNode.h;
    openList.push(startNode);

    while (openList.length > 0) {
        openList.sort((a, b) => a.f - b.f);
        let curr = openList.shift();

        if (curr.x === endX && curr.y === endY) {
            let path = [];
            let temp = curr;
            while (temp.parent) {
                path.push({ x: temp.x, y: temp.y });
                temp = temp.parent;
            }
            return path.reverse();
        }

        closedList.add(`${curr.x},${curr.y}`);

        const neighbors = [
            { x: curr.x + 1, y: curr.y }, { x: curr.x - 1, y: curr.y },
            { x: curr.x, y: curr.y + 1 }, { x: curr.x, y: curr.y - 1 },
            { x: curr.x + 1, y: curr.y + 1 }, { x: curr.x - 1, y: curr.y - 1 },
            { x: curr.x + 1, y: curr.y - 1 }, { x: curr.x - 1, y: curr.y + 1 }
        ];

        for (let n of neighbors) {
            if (!isFloorTile(n.x, n.y)) continue;
            if (closedList.has(`${n.x},${n.y}`)) continue;
            if (blocked(n.x, n.y)) continue;

            // 대각선 이동 시 모서리 끼임 방지
            if (n.x !== curr.x && n.y !== curr.y) {
                if (blocked(n.x, curr.y) || blocked(curr.x, n.y)) continue;
            }

            const gScore = curr.g + (n.x !== curr.x && n.y !== curr.y ? 1.4 : 1);
            const existing = openList.find(o => o.x === n.x && o.y === n.y);

            if (!existing) {
                const newNode = { x: n.x, y: n.y, g: gScore, h: heuristic(n.x, n.y, endX, endY), parent: curr };
                newNode.f = newNode.g + newNode.h;
                openList.push(newNode);
            } else if (gScore < existing.g) {
                existing.g = gScore;
                existing.f = existing.g + existing.h;
                existing.parent = curr;
            }
        }
    }
    return [];
}

function heuristic(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

// 가구 회전값(0~3) → 하보 아바타 방향(0~7)
function rotToDir(rot, pose) {
    if (pose === 'lay') return [2, 4, 2, 4][rot % 4]; // 눕기는 2/4 방향만 지원
    return [2, 4, 6, 0][rot % 4];
}

// 앉는 높이(z-단위): 원본 가구 데이터가 있으면 그 좌석 높이를, 없으면 model.sitHeight 사용.
// 하보 규칙상 좌석 표면은 가구 z의 절반(등받이가 z까지, 좌석은 그 중간).
function seatZ(classname) {
    const h = furniHeightZ(classname);
    if (h > 0) return h * 0.5;
    const model = getModel(classname);
    return (model && model.sitHeight) || 0.45;
}

// 서쪽 벽 한 조각(면+걸레받이+상단 캡)을 그림. 배경 벽 루프와 문 앞 조각(렌더 큐) 양쪽에서 사용.
function drawWestWallSegment(x, y) {
    const WALL_HEIGHT = 120;
    const WALL_DEPTH = 6;
    const p1 = gridToScreen(x, y, 0);       // N(x,y)
    const p2 = gridToScreen(x, y + 1, 0);   // N(x,y+1)

    // 벽면
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p2.x, p2.y - WALL_HEIGHT); ctx.lineTo(p1.x, p1.y - WALL_HEIGHT);
    ctx.closePath();
    ctx.fillStyle = currentWallHex();
    ctx.fill();

    // 걸레받이
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p2.x, p2.y - 12); ctx.lineTo(p1.x, p1.y - 12);
    ctx.closePath();
    ctx.fillStyle = shadeHex(currentWallHex(), 0.55);
    ctx.fill();

    // 벽 상단 두께 캡
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y - WALL_HEIGHT); ctx.lineTo(p2.x, p2.y - WALL_HEIGHT);
    ctx.lineTo(p2.x - WALL_DEPTH, p2.y - WALL_HEIGHT - WALL_DEPTH / 2);
    ctx.lineTo(p1.x - WALL_DEPTH, p1.y - WALL_HEIGHT - WALL_DEPTH / 2);
    ctx.closePath();
    ctx.fillStyle = shadeHex(currentWallHex(), 1.28);
    ctx.fill();
}

// 6. 렌더링 루프
function drawRoom() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false; // 레트로 픽셀 유지

    // (1) 바닥 타일 — heightmap의 바닥('0')과 문 타일만 그림
    const room = currentRoom;
    for (let y = 0; y < room.h; y++) {
        for (let x = 0; x < room.w; x++) {
            if (!room.floor[y][x]) continue;
            const screen = gridToScreen(x, y, 0);
            ctx.beginPath();
            ctx.moveTo(screen.x, screen.y);
            ctx.lineTo(screen.x + HALF_WIDTH, screen.y + HALF_HEIGHT);
            ctx.lineTo(screen.x, screen.y + TILE_HEIGHT);
            ctx.lineTo(screen.x - HALF_WIDTH, screen.y + HALF_HEIGHT);
            ctx.closePath();
            ctx.fillStyle = (x + y) % 2 === 0 ? currentFloorHex() : shadeHex(currentFloorHex(), 0.94);
            ctx.fill();
            ctx.strokeStyle = shadeHex(currentFloorHex(), 0.8);
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
    }

    // (1-1) 바닥 단상 옆면 — 바닥의 남동/남서쪽 가장자리마다 두께를 그림
    const PLATFORM_HEIGHT = 8;
    ctx.lineWidth = 1;
    ctx.strokeStyle = shadeHex(currentFloorHex(), 0.5);
    for (let y = 0; y < room.h; y++) {
        for (let x = 0; x < room.w; x++) {
            if (!room.floor[y][x]) continue;
            const s = gridToScreen(x, y, 0);
            const N = { x: s.x, y: s.y };
            const E = { x: s.x + HALF_WIDTH, y: s.y + HALF_HEIGHT };
            const S = { x: s.x, y: s.y + TILE_HEIGHT };
            const W = { x: s.x - HALF_WIDTH, y: s.y + HALF_HEIGHT };

            // 남동쪽(오른쪽 아래)에 바닥 없음 → 옆면
            if (!isFloorTile(x + 1, y)) {
                ctx.beginPath();
                ctx.moveTo(E.x, E.y); ctx.lineTo(S.x, S.y);
                ctx.lineTo(S.x, S.y + PLATFORM_HEIGHT); ctx.lineTo(E.x, E.y + PLATFORM_HEIGHT);
                ctx.closePath();
                ctx.fillStyle = shadeHex(currentFloorHex(), 0.7);
                ctx.fill(); ctx.stroke();
            }
            // 남서쪽(왼쪽 아래)에 바닥 없음 → 옆면 (더 어두운 그림자 톤)
            if (!isFloorTile(x, y + 1)) {
                ctx.beginPath();
                ctx.moveTo(W.x, W.y); ctx.lineTo(S.x, S.y);
                ctx.lineTo(S.x, S.y + PLATFORM_HEIGHT); ctx.lineTo(W.x, W.y + PLATFORM_HEIGHT);
                ctx.closePath();
                ctx.fillStyle = shadeHex(currentFloorHex(), 0.58);
                ctx.fill(); ctx.stroke();
            }
        }
    }

    // (1-2) 벽면 — Habbo 방식: 각 행의 첫 바닥 타일 서쪽에, 각 열의 첫 바닥 타일 북쪽에 벽.
    // 방 모양이 계단식이면 벽도 따라 꺾임 (model_b, model_f 등)
    const WALL_HEIGHT = 120;
    const WALL_DEPTH = 6;
    const DOOR_HEIGHT = 90;

    // 서쪽(왼쪽) 벽: 벽 한 조각은 타일 (x,y)의 북서쪽 모서리 N(x,y)→N(x,y+1) 위에 세움
    for (let y = 0; y < room.h; y++) {
        const mx = room.rowMinX[y];
        if (mx === undefined) continue;

        if (y === room.door.y) {
            // 문이 있는 행: 벽 대신 문 타일 서쪽에 어두운 입구 통로를 그림
            const d1 = gridToScreen(room.door.x, y, 0);
            const d2 = gridToScreen(room.door.x, y + 1, 0);
            ctx.beginPath();
            ctx.moveTo(d1.x, d1.y); ctx.lineTo(d2.x, d2.y);
            ctx.lineTo(d2.x, d2.y - DOOR_HEIGHT); ctx.lineTo(d1.x, d1.y - DOOR_HEIGHT);
            ctx.closePath();
            ctx.fillStyle = '#090e1a';
            ctx.fill();

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(d1.x, d1.y); ctx.lineTo(d1.x, d1.y - DOOR_HEIGHT);
            ctx.lineTo(d2.x, d2.y - DOOR_HEIGHT); ctx.lineTo(d2.x, d2.y);
            ctx.stroke();
            continue;
        }

        // 문 바로 남쪽 벽 조각은 배경이 아니라 렌더 큐에서 그림 —
        // 문 타일에 선 아바타를 가려 '문 안에 들어가 있는' 하보식 모습을 만들기 위해
        if (y === room.door.y + 1) continue;

        drawWestWallSegment(mx, y);
    }

    // 북쪽(오른쪽 위) 벽: 타일 (x,y)의 북동쪽 모서리 N(x,y)→N(x+1,y) 위에 세움
    for (let x = 0; x < room.w; x++) {
        const my = room.colMinY[x];
        if (my === undefined) continue;

        const p1 = gridToScreen(x, my, 0);
        const p2 = gridToScreen(x + 1, my, 0);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p2.x, p2.y - WALL_HEIGHT); ctx.lineTo(p1.x, p1.y - WALL_HEIGHT);
        ctx.closePath();
        ctx.fillStyle = shadeHex(currentWallHex(), 0.82);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p2.x, p2.y - 12); ctx.lineTo(p1.x, p1.y - 12);
        ctx.closePath();
        ctx.fillStyle = shadeHex(currentWallHex(), 0.45);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y - WALL_HEIGHT); ctx.lineTo(p2.x, p2.y - WALL_HEIGHT);
        ctx.lineTo(p2.x + WALL_DEPTH, p2.y - WALL_HEIGHT - WALL_DEPTH / 2);
        ctx.lineTo(p1.x + WALL_DEPTH, p1.y - WALL_HEIGHT - WALL_DEPTH / 2);
        ctx.closePath();
        ctx.fillStyle = shadeHex(currentWallHex(), 1.12);
        ctx.fill();
    }

    // (2) 렌더 큐 구성 (가구 + 아바타를 깊이 순으로)
    let renderQueue = [];

    // 문 바로 남쪽 벽 조각: 문 타일의 아바타(합 door.x+door.y+0.2)보다 앞, 방 안쪽
    // 타일의 아바타(합 wx+wy+0.2)보다는 뒤가 되도록 wx+wy+0.05 깊이로 큐에 넣음
    {
        const wy = room.door.y + 1;
        const wx = room.rowMinX[wy];
        if (wx !== undefined) {
            renderQueue.push({ type: 'doorwall', depth: wx + wy + 0.05, wx, wy });
        }
    }

    for (let item of state.placedItems) {
        const model = getModel(item.classname);
        const fd = furniReady(item.classname);

        if (fd) {
            const depthBase = furniDepthBase(item); // 다칸 가구는 뷰어에 가까운 코너 기준
            // 원본 스프라이트: 그림자 먼저, 그다음 레이어들.
            renderQueue.push({ type: 'flayer', depth: depthBase + 0.02, item, fd, layer: 'sd' });

            // 레이어 z값은 '가구 내부의 앞뒤 순서'용이지 아바타보다 앞에 두라는 뜻이 아님
            // (club_sofa는 z=1000·1500처럼 큰 값 사용). z 오름차순으로 정렬해 가구끼리만
            // 앞뒤를 맞추고, 전체는 base+0.1(=앉은 아바타 +0.2보다 뒤)에 배치한다.
            const dir = rotToDir(item.rot);
            const viz = fd.def.visualization;
            const lc = viz.layerCount || 1;
            const dirLayers = viz.directions && viz.directions[dir] && viz.directions[dir].layers;
            const layers = [];
            for (let i = 0; i < lc; i++) {
                const zOff = (dirLayers && dirLayers[i] && dirLayers[i].z !== undefined) ? dirLayers[i].z
                           : (viz.layers && viz.layers[i] && viz.layers[i].z !== undefined) ? viz.layers[i].z
                           : 0;
                layers.push({ i, zOff });
            }
            layers.sort((a, b) => (a.zOff - b.zOff) || (a.i - b.i));
            layers.forEach((L, rank) => {
                renderQueue.push({
                    type: 'flayer',
                    depth: depthBase + 0.1 + rank * 0.002,
                    item, fd, layer: String.fromCharCode(97 + L.i)
                });
            });
        } else {
            // 아직 로딩 중이거나 원본 데이터가 없는 가구(roomdimmer)는 기존 아이콘 방식
            renderQueue.push({
                type: 'furniture',
                depth: item.x + item.y + 0.1,
                item, model
            });
        }
    }

    // (3) 배치 모드 가이드 — 가구 footprint 전체를 초록(가능)/빨강(불가)으로 표시
    if ((state.mode === 'placing' || state.mode === 'moving') && state.placementItem) {
        const x = state.placementX;
        const y = state.placementY;
        const cn = state.placementItem.classname;
        const placeZ = canPlace(cn, x, y, state.placementRot);
        const ok = placeZ !== null;

        for (const t of footprintTiles({ classname: cn, x, y, rot: state.placementRot })) {
            if (!isFloorTile(t.x, t.y)) continue;
            const screen = gridToScreen(t.x, t.y, 0);
            ctx.beginPath();
            ctx.moveTo(screen.x, screen.y);
            ctx.lineTo(screen.x + HALF_WIDTH, screen.y + HALF_HEIGHT);
            ctx.lineTo(screen.x, screen.y + TILE_HEIGHT);
            ctx.lineTo(screen.x - HALF_WIDTH, screen.y + HALF_HEIGHT);
            ctx.closePath();
            ctx.fillStyle = ok ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
            ctx.fill();
            ctx.strokeStyle = ok ? '#10b981' : '#ef4444';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        if (isFloorTile(x, y)) {
            const ghostItem = { classname: cn, x, y, rot: state.placementRot, z: placeZ || 0 };
            const [gw, gh] = itemDims(ghostItem);
            renderQueue.push({
                type: 'ghost',
                depth: (x + gw - 1) + (y + gh - 1) + 0.26, // 유령은 항상 맨 위에
                item: ghostItem,
                model: state.placementItem
            });
        }
    }

    // (4) 아바타 위치 보간
    const avatar = state.avatar;
    let ax = avatar.x, ay = avatar.y, az = avatar.z;

    if (avatar.path.length > 0) {
        const next = avatar.path[0];
        const nextZ = tileHeight(next.x, next.y);
        ax = avatar.x + (next.x - avatar.x) * avatar.stepTimer;
        ay = avatar.y + (next.y - avatar.y) * avatar.stepTimer;
        az = avatar.z + (nextZ - avatar.z) * avatar.stepTimer;
    }

    // 앉아 있을 땐 그 좌석 가구 기준 깊이 + ε — 다칸 소파에서도 아바타가 좌석 위에 그려지게
    let avatarDepth = ax + ay + 0.2;
    if (avatar.sitting) {
        const seat = state.placedItems.find(i => i.id === avatar.sitting.itemId);
        if (seat) avatarDepth = furniDepthBase(seat) + 0.15;
    }
    renderQueue.push({ type: 'avatar', depth: avatarDepth, ax, ay, az });

    // (5) 깊이 정렬 후 그리기
    renderQueue.sort((a, b) => a.depth - b.depth);

    for (let el of renderQueue) {
        if (el.type === 'doorwall') drawWestWallSegment(el.wx, el.wy);
        else if (el.type === 'flayer') drawFurniLayer(el.item, el.fd, el.layer, false);
        else if (el.type === 'furniture') drawFurniture(el.item, el.model, false);
        else if (el.type === 'ghost') {
            const gfd = furniReady(el.model.classname);
            if (gfd) drawFurniGhost(el.item, gfd);
            else drawFurniture(el.item, el.model, true);
        }
        else drawAvatar(el.ax, el.ay, el.az);
    }

    requestAnimationFrame(drawRoom);
}

// 해당 칸을 밟았을 때의 높이 (러그 위 등)
function tileHeight(x, y) {
    const item = itemAt(x, y);
    if (!item) return 0;
    const model = getModel(item.classname);
    return (model && model.walkable) ? 0.02 : 0;
}

function drawFurniture(item, model, isGhost) {
    if (!model) return;
    const screen = gridToScreen(item.x, item.y, 0);

    if (!isGhost) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(screen.x, screen.y + HALF_HEIGHT, 22, 11, 0, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fill();
        ctx.restore();
    }

    const img = getCachedImage(model.imgUrl);
    if (!img.complete || img.naturalWidth === 0) return;

    ctx.save();
    if (isGhost) ctx.globalAlpha = 0.5;

    if (!isGhost && state.selectedPlacedItem && state.selectedPlacedItem.id === item.id) {
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 15;
    }

    // 회전 1·3번 방향은 좌우 반전으로 표현 (아이콘 스프라이트 한계)
    const shouldFlip = item.rot === 1 || item.rot === 3;
    const offsetY = model.offsetY || 0;

    ctx.translate(screen.x, screen.y + HALF_HEIGHT + offsetY);
    if (shouldFlip) ctx.scale(-1, 1);

    // 아이콘(14~30px)을 '한 변 52*scale 크기의 박스'에 비율 유지로 맞춰 확대
    const box = 52 * (model.scale || 1.2);
    const m = box / Math.max(img.naturalWidth, img.naturalHeight);
    const w = img.naturalWidth * m;
    const h = img.naturalHeight * m;

    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
}

function drawAvatar(x, y, z) {
    const avatar = state.avatar;
    const screen = gridToScreen(x, y, z);

    // 발밑 그림자
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(screen.x, screen.y + HALF_HEIGHT + z * Z_SCALE, 14, 7, 0, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fill();
    ctx.restore();

    let action = 'std';
    let dir = avatar.dir;
    if (avatar.sitting) {
        action = avatar.sitting.pose; // 'sit' | 'lay'
        dir = avatar.sitting.dir;
    } else if (avatar.isWalking) {
        action = 'wlk';
    }

    // 이 이미저에는 '오른쪽 비스듬 뒷모습(하보 방향 0)' 그림이 없다 (0번은 여분의 앞모습).
    // → 방향 0은 '왼쪽 비스듬 뒷모습(6번)'을 좌우반전해서 그린다. 진짜 하보와 같은 각도가 됨.
    let drawDir = dir, flip = false;
    if (dir === 0) { drawDir = 6; flip = true; }

    const url = imagerUrl(`figure=${avatar.figure}&size=m&direction=${drawDir}&head_direction=${drawDir}&action=${action}`);
    const img = getCachedImage(url);
    // 이메이저 sit 스프라이트는 앉은 엉덩이 접촉점(픽셀행 ~85)이 서 있는 발 접촉점(행 ~106)보다
    // 21px 위에 있음. sit일 때만 그 차이(SIT_SPRITE_DY)만큼 내려 그려 엉덩이를 좌석면에 얹는다.
    const poseDY = (action === 'sit') ? SIT_SPRITE_DY : 0;

    let drawImg = img, drawDY = poseDY;
    if (!(img.complete && img.naturalWidth > 0)) {
        // 목표 스프라이트가 아직 로딩 안 됐으면 같은 방향 '서기'로 대체, 그것도 없으면 직전 정상 스프라이트.
        // → 로딩되는 0.5초 동안 아바타가 사라지는 문제 방지.
        const stdImg = getCachedImage(imagerUrl(`figure=${avatar.figure}&size=m&direction=${drawDir}&head_direction=${drawDir}&action=std`));
        if (stdImg.complete && stdImg.naturalWidth > 0) { drawImg = stdImg; drawDY = 0; }
        else if (avatar._lastImg) { drawImg = avatar._lastImg; drawDY = avatar._lastDY; flip = avatar._lastFlip; }
        else return; // 그릴 게 아무것도 없으면 이번 프레임만 건너뜀
    }

    if (flip) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(drawImg, -(screen.x + 32), screen.y - 85 + drawDY, 64, 110);
        ctx.restore();
    } else {
        ctx.drawImage(drawImg, screen.x - 32, screen.y - 85 + drawDY, 64, 110);
    }
    if (drawImg === img) { avatar._lastImg = img; avatar._lastDY = poseDY; avatar._lastFlip = flip; } // 정상 프레임만 기억
}
const SIT_SPRITE_DY = 21; // 측정값: 서있는 발행(106) - 앉은 엉덩이행(85)

// 7. 아바타 이동 갱신 (시간 기반 — 타이머가 느려져도 속도 일정)
const MS_PER_TILE = 500; // Habbo 표준 이동 속도: 타일당 500ms (초당 2타일)
let lastTick = performance.now();

function updateAvatar() {
    const now = performance.now();
    const dt = Math.min(now - lastTick, 200); // 탭 전환 등으로 오래 멈췄을 땐 점프 방지
    lastTick = now;

    const avatar = state.avatar;
    if (avatar.path.length > 0) {
        avatar.isWalking = true;
        avatar.sitting = null;

        avatar.stepTimer += dt / MS_PER_TILE;
        if (avatar.stepTimer >= 1.0) {
            const next = avatar.path.shift();
            avatar.x = next.x;
            avatar.y = next.y;
            avatar.z = tileHeight(next.x, next.y);
            avatar.stepTimer -= 1.0; // 남은 시간을 다음 타일로 이월해 속도 일정 유지
            if (avatar.path.length === 0) avatar.stepTimer = 0;

            // 목적지 도착 → 예약된 앉기/눕기 실행
            if (avatar.path.length === 0 && avatar.pendingPose) {
                const item = state.placedItems.find(i => i.id === avatar.pendingPose.itemId);
                if (item && item.x === avatar.x && item.y === avatar.y) {
                    avatar.sitting = {
                        itemId: item.id,
                        pose: avatar.pendingPose.pose,
                        dir: rotToDir(item.rot, avatar.pendingPose.pose),
                        z: seatZ(item.classname)
                    };
                    avatar.z = avatar.sitting.z;
                }
                avatar.pendingPose = null;
            }
        } else {
            const next = avatar.path[0];
            if (next) {
                const dx = next.x - avatar.x;
                const dy = next.y - avatar.y;
                // 이동 방향 → 하보 방향번호. 방향 0(위-오른쪽 뒷모습)은 이미저에 그림이 없어
                // drawAvatar가 6번을 좌우반전해 그림 — 여기서는 의미 그대로 0을 지정.
                if (dx > 0 && dy === 0) avatar.dir = 2;       // 아래-오른쪽 (앞, 다가옴)
                else if (dx < 0 && dy === 0) avatar.dir = 6;  // 위-왼쪽 (비스듬 뒷모습)
                else if (dx === 0 && dy > 0) avatar.dir = 4;  // 아래-왼쪽 (앞, 다가옴)
                else if (dx === 0 && dy < 0) avatar.dir = 0;  // 위-오른쪽 (비스듬 뒷모습, 반전 렌더)
                else if (dx > 0 && dy > 0) avatar.dir = 3;    // 바로 아래 (정면)
                else if (dx < 0 && dy < 0) avatar.dir = 7;    // 바로 위 (정후면)
                else if (dx > 0 && dy < 0) avatar.dir = 1;    // 바로 오른쪽 (오른쪽 옆모습)
                else if (dx < 0 && dy > 0) avatar.dir = 5;    // 바로 왼쪽 (왼쪽 옆모습)
            }
        }
    } else {
        avatar.isWalking = false;
        avatar.stepTimer = 0;
    }
}
setInterval(updateAvatar, 20);

// 아바타를 특정 가구로 걸어가 앉거나 눕게 하기
function walkAndPose(item, pose) {
    const avatar = state.avatar;
    avatar.pendingPose = null;

    if (avatar.x === item.x && avatar.y === item.y) {
        // 이미 그 칸 위에 있으면 즉시 자세 변경
        avatar.sitting = {
            itemId: item.id,
            pose,
            dir: rotToDir(item.rot, pose),
            z: seatZ(item.classname)
        };
        avatar.z = avatar.sitting.z;
        return;
    }

    const path = findPath(avatar.x, avatar.y, item.x, item.y, true);
    if (path.length > 0) {
        avatar.path = path;
        avatar.pendingPose = { itemId: item.id, pose };
    }
}

// 8. 클릭/키보드 입력
// Habbo 방식: 목적지가 막혀 있으면 갈 수 있는 가장 가까운 이웃 타일까지 걸어감
function walkToward(tx, ty) {
    const a = state.avatar;
    let path = findPath(a.x, a.y, tx, ty);

    if (path.length === 0) {
        const neighbors = [
            { x: tx + 1, y: ty }, { x: tx - 1, y: ty }, { x: tx, y: ty + 1 }, { x: tx, y: ty - 1 },
            { x: tx + 1, y: ty + 1 }, { x: tx - 1, y: ty - 1 }, { x: tx + 1, y: ty - 1 }, { x: tx - 1, y: ty + 1 }
        ];
        let best = null;
        for (const n of neighbors) {
            if (n.x === a.x && n.y === a.y) { best = []; break; } // 이미 바로 옆에 있음
            const p = findPath(a.x, a.y, n.x, n.y);
            if (p.length > 0 && (best === null || p.length < best.length)) best = p;
        }
        path = best || [];
    }

    if (path.length > 0) {
        a.pendingPose = null;
        a.path = path;
    }
}

canvas.addEventListener('click', function (e) {
    const grid = screenToGrid(e.clientX, e.clientY);
    if (grid.x < 0 || grid.x >= currentRoom.w || grid.y < 0 || grid.y >= currentRoom.h) return;

    if (state.mode === 'normal') {
        const clickedItem = itemAt(grid.x, grid.y);

        if (clickedItem) {
            // 친구집에서는 구경 카드(이름·가격·⭐담기)만 열림
            selectPlacedItem(clickedItem);
        } else if (isFloorTile(grid.x, grid.y)) {
            closeFurnitureControlPanel();
            walkToward(grid.x, grid.y);
        }
        return;
    }

    // 배치/이동 모드
    if (state.mode === 'placing' || state.mode === 'moving') {
        // 이 가구의 footprint 전체가 놓일 수 있어야 함. 반환값 = 배치 높이 z (테이블 위면 그 높이)
        const cn = state.placementItem.classname;
        const placeZ = canPlace(cn, grid.x, grid.y, state.placementRot);
        if (placeZ === null) return;

        if (state.mode === 'placing') {
            const isTrial = state.placementSource && state.placementSource.type === 'trial';

            // 가방에서 꺼내 배치 (결제는 구매할 때 이미 끝남 — 여기서 차감하지 않음)
            // 배치 테스트는 가방과 무관 (아직 산 게 아님)
            if (!isTrial) {
                const idx = state.inventory.indexOf(state.placementItem.classname);
                if (idx !== -1) state.inventory.splice(idx, 1);
            }

            const newItem = {
                id: Date.now(),
                classname: state.placementItem.classname,
                x: grid.x, y: grid.y, z: placeZ,
                rot: state.placementRot
            };
            if (isTrial) {
                newItem.trial = true;
                // 테스트는 동시에 5개까지 — 넘치면 가장 먼저 놓은 테스트품부터 사라짐 (선입선출)
                const trials = state.placedItems.filter(i => i.trial);
                if (trials.length >= 5) {
                    state.placedItems.splice(state.placedItems.indexOf(trials[0]), 1);
                }
            }
            const nfd = furniReady(newItem.classname);
            if (nfd && usableStates(nfd).length >= 2) newItem.state = defaultState(nfd); // 가전은 꺼진 상태로 시작
            state.placedItems.push(newItem);
        } else {
            // 기존 가구 이동 완료
            const original = state.placementSource.original;
            state.placedItems.push({
                ...original,
                x: grid.x, y: grid.y, z: placeZ,
                rot: state.placementRot
            });
        }

        finishPlacement();
        saveGame();
        updateUI();
    }
});

canvas.addEventListener('mousemove', function (e) {
    if (state.mode === 'placing' || state.mode === 'moving') {
        const grid = screenToGrid(e.clientX, e.clientY);
        state.placementX = grid.x;
        state.placementY = grid.y;
    }
});

window.addEventListener('keydown', function (e) {
    if (e.target && e.target.tagName === 'INPUT') return; // 글자 입력 중에는 단축키 무시

    if (e.key === 'r' || e.key === 'R' || e.key === 'ㄱ') {
        if (state.mode === 'placing' || state.mode === 'moving') {
            state.placementRot = (state.placementRot + 1) % 4;
        } else if (state.selectedPlacedItem) {
            rotateSelectedFurniture();
        }
    }
    if (e.key === 'Escape') {
        cancelPlacement();
    }
});

// 9. 배치 모드 관리
const tooltip = document.getElementById('placement-helper-tooltip');

function enterPlacementMode(model, source) {
    state.mode = source.type === 'move' ? 'moving' : 'placing';
    state.placementItem = model;
    state.placementSource = source;
    state.placementRot = source.type === 'move' ? source.original.rot : 0;
    closeFurnitureControlPanel();
    tooltip.classList.remove('hidden');
}

// 배치 확정 후 정리
function finishPlacement() {
    state.mode = 'normal';
    state.placementItem = null;
    state.placementSource = null;
    tooltip.classList.add('hidden');
}

// Esc 취소: 이동 중이던 가구는 원래 자리로 복원
function cancelPlacement() {
    if (state.mode === 'moving' && state.placementSource && state.placementSource.original) {
        state.placedItems.push(state.placementSource.original);
    }
    // placing 취소 시 가구는 가방에 그대로 남아 있음 (배치 확정 때만 차감)
    finishPlacement();
    closeFurnitureControlPanel();
    updateUI();
}

// 10. 가구 선택 패널
const controlPanel = document.getElementById('furniture-control-panel');
const sitBtn = document.getElementById('action-sit');
const layBtn = document.getElementById('action-lay');
const useBtn = document.getElementById('action-use');

function selectPlacedItem(item) {
    state.selectedPlacedItem = item;
    const model = getModel(item.classname);
    if (!model) return;
    const visiting = !!state.visiting;

    document.getElementById('selected-furni-name').innerText = item.trial ? `${model.name} (테스트 중)` : model.name;
    document.getElementById('selected-furni-desc').innerText = item.trial
        ? '배치 테스트 중이에요. 마음에 들면 사고, 아니면 치워요!'
        : (visiting ? `상점 가격 ${model.cost}${window.HousingData?.mode === 'online' ? ' DJ코인' : ' 크레딧'} — 마음에 들면 ⭐ 담아 두세요!` : model.desc);
    setFurniIcon(document.getElementById('selected-furni-preview'), item.classname);

    // 테스트품은 앉기·작동 불가 (아직 산 게 아니라서), 대신 '이대로 사기' 버튼 표시
    // 친구집에서는 구경만 — ⭐담기 말고는 전부 숨김
    sitBtn.classList.toggle('hidden', visiting || !!item.trial || !model.canSit);
    layBtn.classList.toggle('hidden', visiting || !!item.trial || !model.canLay);
    useBtn.classList.toggle('hidden', visiting || !!item.trial || !isUsable(item.classname)); // 작동 가능한 가전만
    document.getElementById('action-buy-trial').classList.toggle('hidden', visiting || !item.trial);
    ['action-rotate', 'action-move', 'action-pickup'].forEach(id =>
        document.getElementById(id).classList.toggle('hidden', visiting));
    document.getElementById('action-pickup').innerText = item.trial ? '🧹 치우기' : '🎒 가방에 넣기';

    const favBtn = document.getElementById('action-fav');
    favBtn.classList.toggle('hidden', !visiting);
    if (visiting) {
        const faved = state.favorites.includes(`room_${item.classname}`);
        favBtn.innerText = faved ? '★ 이미 담았어요' : '⭐ 즐겨찾기에 담기';
        favBtn.disabled = faved;
    }

    controlPanel.classList.remove('hidden');
}

// 작동하기: 다음 상태로 전환 (꺼짐↔켜짐, 주사위 눈금 등)
useBtn.addEventListener('click', () => {
    const sel = state.selectedPlacedItem;
    if (!sel) return;
    const item = state.placedItems.find(i => i.id === sel.id);
    const fd = furniReady(item.classname);
    if (!item || !fd) return;
    const states = usableStates(fd);
    const cur = (item.state !== undefined) ? item.state : defaultState(fd);
    const idx = states.indexOf(cur);
    item.state = states[(idx + 1) % states.length];
    saveGame();
});

function closeFurnitureControlPanel() {
    state.selectedPlacedItem = null;
    controlPanel.classList.add('hidden');
}
document.getElementById('close-panel-btn').addEventListener('click', closeFurnitureControlPanel);

sitBtn.addEventListener('click', () => {
    if (!state.selectedPlacedItem) return;
    walkAndPose(state.selectedPlacedItem, 'sit');
    closeFurnitureControlPanel();
});

layBtn.addEventListener('click', () => {
    if (!state.selectedPlacedItem) return;
    walkAndPose(state.selectedPlacedItem, 'lay');
    closeFurnitureControlPanel();
});

document.getElementById('action-rotate').addEventListener('click', rotateSelectedFurniture);

function rotateSelectedFurniture() {
    if (!state.selectedPlacedItem) return;
    const item = state.placedItems.find(i => i.id === state.selectedPlacedItem.id);
    if (item) {
        item.rot = (item.rot + 1) % 4;
        saveGame();
    }
}

document.getElementById('action-move').addEventListener('click', () => {
    if (!state.selectedPlacedItem) return;
    const item = state.selectedPlacedItem;
    const model = getModel(item.classname);

    // 목록에서 잠시 빼되, 취소하면 복원할 수 있게 원본 보관
    state.placedItems = state.placedItems.filter(i => i.id !== item.id);
    if (state.avatar.sitting && state.avatar.sitting.itemId === item.id) state.avatar.sitting = null;
    enterPlacementMode(model, { type: 'move', original: { ...item } });
});

document.getElementById('action-pickup').addEventListener('click', () => {
    if (!state.selectedPlacedItem) return;
    const item = state.selectedPlacedItem;

    state.placedItems = state.placedItems.filter(i => i.id !== item.id);
    if (!item.trial) state.inventory.push(item.classname); // 테스트품은 가방에 안 들어감 (산 게 아님)
    if (state.avatar.sitting && state.avatar.sitting.itemId === item.id) {
        state.avatar.sitting = null;
        state.avatar.z = 0;
    }

    closeFurnitureControlPanel();
    saveGame();
    updateUI();
});

// 11. 상점 모달
const catalogModal = document.getElementById('catalog-modal');
const inventoryModal = document.getElementById('inventory-modal');

document.getElementById('btn-catalog').addEventListener('click', () => {
    catalogModal.classList.remove('hidden');
    renderCatalogGrid(document.querySelector('.tab-btn.active').dataset.category);
});
document.getElementById('close-catalog').addEventListener('click', () => {
    catalogModal.classList.add('hidden');
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        renderCatalogGrid(e.currentTarget.dataset.category);
    });
});

document.getElementById('btn-buy-item').addEventListener('click', async () => {
    const item = state.selectedCatalogItem;
    if (!item) return;
    const online = window.HousingData?.mode === 'online';
    const coinName = online ? 'DJ코인' : '크레딧';
    const buyBtn = document.getElementById('btn-buy-item');

    // 온라인 결제: 서버 함수가 코인 차감·보유 기록까지 처리 (성공하면 true)
    async function payOnline(itemId) {
        buyBtn.disabled = true;
        buyBtn.innerText = '사는 중…';
        try {
            await HousingData.purchase(itemId);
            return true;
        } catch (e) {
            alert(e.message);
            return false;
        } finally {
            buyBtn.disabled = false;
            buyBtn.innerText = '사기';
        }
    }

    // 벽지·바닥: 한 번 사면 계속 보유 — 이미 산 색은 무료로 다시 적용 (공통 함수 사용)
    if (item.paper) {
        buyBtn.disabled = true;
        try {
            if (await purchasePaperAndApply(item)) catalogModal.classList.add('hidden');
        } finally {
            buyBtn.disabled = false;
        }
        return;
    }

    // 연습 모드: 결제 없이 가방에 넣고 바로 배치 (나가면 원상복구)
    if (state.simMode) {
        state.inventory.push(item.classname);
        updateUI();
        catalogModal.classList.add('hidden');
        enterPlacementMode(item, { type: 'inventory' });
        return;
    }

    if (state.credits < item.cost) {
        alert(`${coinName}이 부족해요! 😢`);
        return;
    }

    // 결제는 여기서 딱 한 번
    if (online) {
        if (!await payOnline(HousingData.furniItemId(item.classname))) return;
    } else {
        state.credits -= item.cost;
    }
    removeFavorite(`room_${item.classname}`); // 샀으면 즐겨찾기에서 제거
    state.inventory.push(item.classname);
    saveGame();
    updateUI();

    // 바로 배치 모드로
    catalogModal.classList.add('hidden');
    enterPlacementMode(item, { type: 'inventory' });
});

function renderCatalogGrid(category) {
    const grid = document.getElementById('catalog-grid');
    grid.innerHTML = "";

    // ⭐ 즐겨찾기 탭: 담아 둔 가구·벽지 모아보기 + 전부 사면 얼마인지 합계
    if (category === 'fav') {
        const items = state.favorites.map(findItemByFavId).filter(Boolean);
        if (items.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'fav-summary';
            empty.innerText = '아직 담은 물건이 없어요.\n마음에 드는 물건에서 ⭐ 즐겨찾기를 눌러 보세요!';
            grid.appendChild(empty);
            return;
        }
        const online = window.HousingData?.mode === 'online';
        const total = items.reduce((sum, it) => {
            // 이미 산 벽지·바닥은 무료 적용이라 합계에서 뺌
            const owned = online && it.paper
                && HousingData.ownedCount(HousingData.paperItemId(it.paper, it.themeId)) > 0;
            return sum + (owned ? 0 : it.cost);
        }, 0);
        const summary = document.createElement('div');
        summary.className = 'fav-summary';
        summary.innerText = `⭐ ${items.length}개 담김 — 전부 사려면 ${total}${online ? ' DJ코인' : ' 크레딧'} (지금 ${state.credits})`;
        grid.appendChild(summary);

        items.forEach(it => {
            const card = document.createElement('div');
            card.className = 'item-card';
            const img = document.createElement('img');
            img.alt = it.name;
            if (it.paper) img.src = paperSwatchURL(it);
            else setFurniIcon(img, it.classname);
            card.appendChild(img);
            card.addEventListener('click', () => {
                document.querySelectorAll('#catalog-grid .item-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectCatalogItem(it);
            });
            grid.appendChild(card);
        });
        return;
    }

    // 벽지·바닥 탭: 가구가 아니라 '방 속성' 상품 (색 견본 카드)
    if (category === 'paper') {
        PAPER_ITEMS.forEach(p => {
            const card = document.createElement('div');
            card.className = "item-card";
            const img = document.createElement('img');
            img.src = paperSwatchURL(p);
            img.alt = p.name;
            card.appendChild(img);
            card.addEventListener('click', () => {
                document.querySelectorAll('#catalog-grid .item-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectCatalogItem(p);
            });
            grid.appendChild(card);
        });
        return;
    }

    CATALOG_ITEMS.filter(i => i.category === category).forEach(item => {
        const card = document.createElement('div');
        card.className = "item-card";
        const img = document.createElement('img');
        img.alt = item.name;
        setFurniIcon(img, item.classname); // 로컬 스프라이트시트의 정품 아이콘
        card.appendChild(img);

        card.addEventListener('click', () => {
            document.querySelectorAll('#catalog-grid .item-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectCatalogItem(item);
        });

        grid.appendChild(card);
    });
}

function selectCatalogItem(item) {
    state.selectedCatalogItem = item;
    document.getElementById('catalog-detail-name').innerText = item.name;
    const detailImg = document.getElementById('catalog-detail-img');
    if (item.paper) detailImg.src = paperSwatchURL(item);
    else setFurniIcon(detailImg, item.classname);
    document.getElementById('catalog-detail-desc').innerText = item.desc;
    document.getElementById('catalog-detail-price').innerText = item.cost;

    const buyBtn = document.getElementById('btn-buy-item');
    buyBtn.classList.remove('disabled');
    buyBtn.removeAttribute('disabled');
    buyBtn.innerText = state.simMode ? '🧪 무료로 해보기' : '사기';
    syncFavButton(item);

    // 배치해보기(가구) / 발라보기(벽지·바닥) — 사기 전에 미리 보기
    const tryBtn = document.getElementById('btn-try-item');
    tryBtn.innerText = item.paper ? '발라보기' : '배치해보기';
    tryBtn.classList.remove('disabled');
    tryBtn.removeAttribute('disabled');

    // 쿠폰으로 받기: 온라인 + 쿠폰 보유 + 50코인 이하 (이미 가진 벽지는 제외)
    const couponBtn = document.getElementById('btn-coupon-item');
    const online = window.HousingData?.mode === 'online';
    const paperOwned = online && item.paper
        && HousingData.ownedCount(HousingData.paperItemId(item.paper, item.themeId)) > 0;
    const couponOk = online && HousingData.coupons > 0 && item.cost <= 50 && !paperOwned && !state.simMode;
    couponBtn.classList.toggle('hidden', !couponOk);
}

// 쿠폰 결제: 코인 대신 오늘의 쿠폰 1장 사용
document.getElementById('btn-coupon-item').addEventListener('click', async () => {
    const item = state.selectedCatalogItem;
    if (!item || window.HousingData?.mode !== 'online') return;
    const couponBtn = document.getElementById('btn-coupon-item');
    couponBtn.disabled = true;
    try {
        const itemId = item.paper
            ? HousingData.paperItemId(item.paper, item.themeId)
            : HousingData.furniItemId(item.classname);
        try { await HousingData.purchase(itemId, { useCoupon: true }); }
        catch (e) { alert(e.message); return; }

        if (item.paper) {
            if (item.paper === 'wall') state.wallTheme = item.themeId;
            else state.floorTheme = item.themeId;
            saveGame();
            updateUI();
            catalogModal.classList.add('hidden');
            return;
        }
        state.inventory.push(item.classname);
        saveGame();
        updateUI();
        catalogModal.classList.add('hidden');
        enterPlacementMode(item, { type: 'inventory' });
    } finally {
        couponBtn.disabled = false;
    }
});

// 벽지·바닥 결제 공통 (이미 가진 색은 무료 적용) — 성공하면 true
async function purchasePaperAndApply(item) {
    // 연습 모드: 결제 없이 바로 적용 (나가면 원상복구됨)
    if (state.simMode) {
        if (item.paper === 'wall') state.wallTheme = item.themeId;
        else state.floorTheme = item.themeId;
        endPaperTrial();
        updateUI();
        return true;
    }
    const online = window.HousingData?.mode === 'online';
    const coinName = online ? 'DJ코인' : '크레딧';
    const paperId = online ? HousingData.paperItemId(item.paper, item.themeId) : null;
    const alreadyOwned = online && HousingData.ownedCount(paperId) > 0;

    if (!alreadyOwned) {
        if (state.credits < item.cost) { alert(`${coinName}이 부족해요! 😢`); return false; }
        if (online) {
            try { await HousingData.purchase(paperId); }
            catch (e) { alert(e.message); return false; }
        } else {
            state.credits -= item.cost;
        }
    }
    if (item.paper === 'wall') state.wallTheme = item.themeId;
    else state.floorTheme = item.themeId;
    removeFavorite(`room_paper_${item.paper}_${item.themeId}`); // 샀으면 즐겨찾기에서 제거
    endPaperTrial(); // 발라보기 중이었다면 확정으로 종료
    saveGame();
    updateUI();
    return true;
}

// 발라보기: 돈 안 내고 벽·바닥에 임시로 발라보기 (저장 안 됨)
function startPaperTrial(item) {
    state.trialPaper = { paper: item.paper, themeId: item.themeId, item };
    const online = window.HousingData?.mode === 'online';
    const owned = online && HousingData.ownedCount(HousingData.paperItemId(item.paper, item.themeId)) > 0;
    document.getElementById('paper-trial-label').innerText =
        `${item.paper === 'wall' ? '벽지' : '바닥'} '${item.name}' 발라보는 중`;
    document.getElementById('paper-trial-buy').innerText = owned ? '✅ 무료로 적용' : `💰 이대로 사기 (${item.cost})`;
    document.getElementById('paper-trial-bar').classList.remove('hidden');
    catalogModal.classList.add('hidden');
}

function endPaperTrial() {
    state.trialPaper = null;
    document.getElementById('paper-trial-bar').classList.add('hidden');
}

document.getElementById('paper-trial-buy').addEventListener('click', async () => {
    const item = state.trialPaper && state.trialPaper.item;
    if (!item) return;
    const btn = document.getElementById('paper-trial-buy');
    btn.disabled = true;
    try { await purchasePaperAndApply(item); }
    finally { btn.disabled = false; }
});
document.getElementById('paper-trial-cancel').addEventListener('click', endPaperTrial);

// 배치해보기(가구) / 발라보기(벽지·바닥): 돈 안 내고 미리 보기 (저장 안 됨)
document.getElementById('btn-try-item').addEventListener('click', () => {
    const item = state.selectedCatalogItem;
    if (!item) return;
    if (item.paper) {
        startPaperTrial(item);
        return;
    }
    catalogModal.classList.add('hidden');
    enterPlacementMode(item, { type: 'trial' });
});

// 테스트품을 그 자리에서 구매 확정
document.getElementById('action-buy-trial').addEventListener('click', async () => {
    const item = state.selectedPlacedItem;
    if (!item || !item.trial) return;
    const model = getModel(item.classname);
    if (!model) return;
    const online = window.HousingData?.mode === 'online';
    const coinName = online ? 'DJ코인' : '크레딧';

    // 연습 모드: 테스트품도 결제 없이 그대로 승격 (나가면 원상복구)
    if (state.simMode) {
        delete item.trial;
        selectPlacedItem(item);
        updateUI();
        return;
    }

    if (state.credits < model.cost) { alert(`${coinName}이 부족해요! 😢`); return; }

    const btn = document.getElementById('action-buy-trial');
    btn.disabled = true;
    try {
        if (online) {
            try { await HousingData.purchase(HousingData.furniItemId(item.classname)); }
            catch (e) { alert(e.message); return; }
        } else {
            state.credits -= model.cost;
        }
        delete item.trial; // 진짜 가구로 승격
        selectPlacedItem(item); // 패널 갱신 (앉기 등 활성화)
        saveGame();
        updateUI();
    } finally {
        btn.disabled = false;
    }
});

// 12. 가방 모달
document.getElementById('btn-inventory').addEventListener('click', () => {
    inventoryModal.classList.remove('hidden');
    renderInventoryGrid();
});
document.getElementById('close-inventory').addEventListener('click', () => {
    inventoryModal.classList.add('hidden');
});

function renderInventoryGrid() {
    const grid = document.getElementById('inventory-grid');
    const emptyMsg = document.getElementById('inventory-empty-msg');
    grid.innerHTML = "";

    if (state.inventory.length === 0) {
        emptyMsg.classList.remove('hidden');
        return;
    }
    emptyMsg.classList.add('hidden');

    const itemCounts = {};
    state.inventory.forEach(c => itemCounts[c] = (itemCounts[c] || 0) + 1);

    Object.keys(itemCounts).forEach(classname => {
        const model = getModel(classname);
        if (!model) return;

        const card = document.createElement('div');
        card.className = "item-card";
        card.title = model.name;
        const img = document.createElement('img');
        img.alt = model.name;
        setFurniIcon(img, classname);
        const badge = document.createElement('span');
        badge.className = "item-count-badge";
        badge.textContent = itemCounts[classname];
        card.appendChild(img);
        card.appendChild(badge);

        card.addEventListener('click', () => {
            inventoryModal.classList.add('hidden');
            enterPlacementMode(model, { type: 'inventory' });
        });

        grid.appendChild(card);
    });
}

// 13. 크레딧/가방 UI 갱신
function updateUI() {
    document.getElementById('credits-count').innerText = state.credits.toLocaleString();
    document.getElementById('inventory-count').innerText = state.inventory.length;
}

// 14. 채팅 말풍선
const chatInput = document.getElementById('chat-input');
const chatBubblesContainer = document.getElementById('chat-bubbles-container');

function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    const bubble = document.createElement('div');
    bubble.className = "chat-bubble";

    const avatarImg = document.createElement('div');
    avatarImg.className = "chat-bubble-avatar";
    const img = document.createElement('img');
    img.src = imagerUrl(`figure=${state.avatar.figure}&size=m&head_direction=2&headonly=1`);
    img.alt = "avatar";
    avatarImg.appendChild(img);

    const textDiv = document.createElement('div');
    textDiv.className = "chat-bubble-text";
    const nameSpan = document.createElement('span');
    nameSpan.className = "chat-username";
    nameSpan.textContent = state.playerName;
    textDiv.appendChild(nameSpan);
    textDiv.appendChild(document.createTextNode(": " + text)); // textContent 사용 — HTML 삽입 방지

    bubble.appendChild(avatarImg);
    bubble.appendChild(textDiv);

    const screen = gridToScreen(state.avatar.x, state.avatar.y, state.avatar.z);
    bubble.style.left = `${screen.x}px`;
    bubble.style.top = `${screen.y - 100}px`;

    chatBubblesContainer.appendChild(bubble);
    setTimeout(() => bubble.remove(), 5500);

    chatInput.value = "";
}

document.getElementById('chat-send-btn').addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

// 15. 아바타 꾸미기 모달
const avatarModal = document.getElementById('avatar-modal');
const nameInput = document.getElementById('player-name-input');
let currentAvatarTab = 'skin';

const AVATAR_TABS = [
    { key: 'skin', label: '🙂 얼굴' }, // 얼굴 모양 + 피부색
    { key: 'hr', label: '💇 머리' },
    { key: 'ha', label: '🎩 모자' },
    { key: 'ea', label: '👓 안경' },
    { key: 'fa', label: '🧔 수염·장식' },
    { key: 'ch', label: '👕 상의' },
    { key: 'cc', label: '🧥 외투' },
    { key: 'ca', label: '📿 목걸이' },
    { key: 'wa', label: '🎀 벨트' },
    { key: 'lg', label: '👖 하의' },
    { key: 'sh', label: '👟 신발' }
];

document.getElementById('btn-profile').addEventListener('click', () => {
    nameInput.value = state.playerName;
    // 온라인 모드: 이름은 퀴즈타운 닉네임과 자동 연동 — 여기서는 못 바꿈
    const online = window.HousingData?.mode === 'online';
    nameInput.readOnly = online;
    document.getElementById('name-sync-hint').classList.toggle('hidden', !online);
    avatarModal.classList.remove('hidden');
    renderAvatarEditor();
});

document.getElementById('close-avatar').addEventListener('click', () => {
    // 이름 직접 바꾸기는 게스트(로컬 체험) 모드에서만 — 온라인은 닉네임 연동
    if (window.HousingData?.mode !== 'online') {
        const name = nameInput.value.trim();
        if (name) state.playerName = name.slice(0, 10);
    }
    avatarModal.classList.add('hidden');
    saveGame();
});

// 성별 선택: 처음 한 번만 고를 수 있고, 정하면 바꿀 수 없음 (실수 구제는 문의하기)
document.querySelectorAll('#gender-toggle .gender-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (state.avatar.genderLocked) return;
        const g = btn.dataset.g;
        const name = g === 'M' ? '남자' : '여자';
        if (!confirm(`아바타를 '${name}'로 정할까요?\n⚠️ 한 번 정하면 바꿀 수 없어요!`)) return;
        if (!confirm(`정말이죠? '${name}'로 확정할게요!`)) return;
        state.avatar.look.gender = g;
        state.avatar.genderLocked = true;
        saveGame();
        renderAvatarEditor();
    });
});

// look의 특정 부품만 바꾼 미리보기용 figure 문자열
function figureWith(partKey, setId) {
    const look = { ...state.avatar.look };
    look[partKey] = setId;
    return buildFigure(look);
}

function updateAvatarPreview() {
    document.getElementById('avatar-preview-img').src =
        imagerUrl(`figure=${state.avatar.figure}&size=l&direction=2&head_direction=2&action=std`);
}

function renderAvatarEditor() {
    // 성별 우선 게이트: 남/여를 확정하기 전에는 옷 고르기를 막고 안내만 표시
    const locked = state.avatar.genderLocked;
    document.getElementById('gender-gate').classList.toggle('hidden', locked);
    ['avatar-tabs', 'avatar-options', 'avatar-colors'].forEach(id => {
        document.getElementById(id).style.display = locked ? '' : 'none';
    });

    // 성별 토글 (M/F 필터 — 공용 부품은 양쪽 다 표시)
    // 확정 후에는 고른 쪽만 남기고 반대쪽 버튼은 숨김
    document.querySelectorAll('#gender-toggle .gender-btn').forEach(btn => {
        const mine = btn.dataset.g === (state.avatar.look.gender || 'M');
        btn.classList.toggle('active', mine);
        btn.style.display = (state.avatar.genderLocked && !mine) ? 'none' : '';
        btn.innerText = (btn.dataset.g === 'M' ? '👦 남자' : '👧 여자') + (state.avatar.genderLocked && mine ? ' ✔' : '');
    });

    // 탭 버튼
    const tabsEl = document.getElementById('avatar-tabs');
    tabsEl.innerHTML = "";
    AVATAR_TABS.forEach(tab => {
        const btn = document.createElement('button');
        btn.className = "avatar-tab-btn" + (currentAvatarTab === tab.key ? " active" : "");
        btn.textContent = tab.label;
        btn.addEventListener('click', () => {
            currentAvatarTab = tab.key;
            renderAvatarEditor();
        });
        tabsEl.appendChild(btn);
    });

    const optionsEl = document.getElementById('avatar-options');
    const colorsEl = document.getElementById('avatar-colors');
    optionsEl.innerHTML = "";
    colorsEl.innerHTML = "";
    const look = state.avatar.look;

    // (1) 부품 선택 카드 — '얼굴' 탭은 hd(얼굴 모양) 부품을 보여줌
    const partKey = currentAvatarTab === 'skin' ? 'hd' : currentAvatarTab;
    const HEAD_PARTS = ['hd', 'hr', 'ha', 'ea', 'fa']; // 얼굴만 크게 보여줄 부품들

    // 성별 필터: 선택한 성별(M/F) + 공용(U)만 표시. 0(없음)은 항상 표시.
    const g = look.gender || 'M';
    const visibleSets = AVATAR_PART_SETS[partKey].filter(id =>
        id === 0 || PART_INFO[partKey][id] === 'U' || PART_INFO[partKey][id] === g
    );

    visibleSets.forEach(setId => {
        const card = document.createElement('div');
        card.className = "avatar-option-card" + (look[partKey] === setId ? " selected" : "");

        const img = document.createElement('img');
        img.loading = "lazy"; // 화면에 보이는 카드만 요청 → 이메이저 순간 부하 방지
        const fig = figureWith(partKey, setId);
        img.src = HEAD_PARTS.includes(partKey)
            ? imagerUrl(`figure=${fig}&size=m&direction=2&head_direction=2&headonly=1`)
            : imagerUrl(`figure=${fig}&size=m&direction=2&head_direction=2&action=std`);
        img.alt = setId === 0 ? "없음" : `${partKey}-${setId}`;
        card.appendChild(img);

        card.addEventListener('click', () => {
            look[partKey] = setId;
            refreshAvatarFigure();
            saveGame();
            renderAvatarEditor();
        });
        optionsEl.appendChild(card);
    });

    // (2) 색상 견본 — 얼굴: 피부색 / 모자·옷·신발: 옷 색상 / 머리·안경: 색 없음
    if (currentAvatarTab === 'skin') {
        SKIN_COLORS.forEach(c => {
            colorsEl.appendChild(makeSwatch(c.hex, look.skin === c.id, () => {
                look.skin = c.id;
                refreshAvatarFigure();
                saveGame();
                renderAvatarEditor();
            }));
        });
    } else if (['ha', 'ch', 'cc', 'lg', 'sh'].includes(currentAvatarTab)) {
        const colorKey = currentAvatarTab + "Color"; // haColor / chColor / lgColor / shColor
        CLOTH_COLORS.forEach(c => {
            colorsEl.appendChild(makeSwatch(c.hex, look[colorKey] === c.id, () => {
                look[colorKey] = c.id;
                refreshAvatarFigure();
                saveGame();
                renderAvatarEditor();
            }));
        });
    }

    updateAvatarPreview();
}

function makeSwatch(hex, isSelected, onClick) {
    const sw = document.createElement('button');
    sw.className = "color-swatch" + (isSelected ? " selected" : "");
    sw.style.background = hex;
    sw.addEventListener('click', onClick);
    return sw;
}

document.getElementById('btn-reset').addEventListener('click', () => {
    // 온라인 모드: 방 배치만 초기화 (DJ코인·산 가구는 서버에 그대로)
    if (window.HousingData?.mode === 'online') {
        if (confirm("방을 처음 상태로 되돌릴까요?\n가구는 모두 가방으로 들어가고, DJ코인과 산 물건은 그대로예요.")) {
            cancelPlacement(); // 배치·이동 중이면 취소 + 가구 패널 닫기
            state.placedItems.forEach(i => state.inventory.push(i.classname));
            state.placedItems = [];
            state.wallTheme = 0;
            state.floorTheme = 0;
            applyRoomModel(state.roomModel); // 아바타를 문으로 (앉은 상태 등 해제)
            saveGame();
            updateUI();
        }
        return;
    }
    if (confirm("정말 처음부터 다시 할까요?\n방, 가구, 크레딧이 모두 초기화돼요.")) {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
    }
});

// 16. 방 모양 바꾸기 모달
const roomModal = document.getElementById('room-modal');

document.getElementById('btn-room').addEventListener('click', () => {
    roomModal.classList.remove('hidden');
    renderRoomModelGrid();
});
document.getElementById('close-room').addEventListener('click', () => {
    roomModal.classList.add('hidden');
});

// 방 모양 미리보기: heightmap을 작은 다이아몬드 타일로 그림
function drawModelPreview(canvasEl, modelName) {
    const def = ROOM_MODELS[modelName];
    const rows = def.map.split("|");
    const pctx = canvasEl.getContext('2d');
    const PW = 5, PH = 2.5; // 미리보기용 반타일 크기

    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
            if (row[x] === 'x') continue;
            xMin = Math.min(xMin, x - y); xMax = Math.max(xMax, x - y);
            yMin = Math.min(yMin, x + y); yMax = Math.max(yMax, x + y);
        }
    });
    const ox = canvasEl.width / 2 - ((xMin + xMax) / 2) * PW;
    const oy = canvasEl.height / 2 - ((yMin + yMax) / 2) * PH;

    pctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
            const isDoor = x === def.door.x && y === def.door.y;
            if (row[x] === 'x' && !isDoor) continue;
            const sx = ox + (x - y) * PW;
            const sy = oy + (x + y) * PH;
            pctx.beginPath();
            pctx.moveTo(sx, sy);
            pctx.lineTo(sx + PW, sy + PH);
            pctx.lineTo(sx, sy + PH * 2);
            pctx.lineTo(sx - PW, sy + PH);
            pctx.closePath();
            pctx.fillStyle = isDoor ? '#f59e0b' : '#9cb08a';
            pctx.fill();
        }
    });
}

// 방 모양이 열려 있는지 (무료거나 구매함)
function isModelUnlocked(modelName) {
    const def = ROOM_MODELS[modelName];
    if (!def.price) return true; // 기본 6종은 무료
    if (window.HousingData?.mode === 'online') {
        return HousingData.ownedCount(`room_model_${modelName}`) > 0;
    }
    return state.unlockedModels.includes(modelName);
}

// 잠긴 방 모양 구매 → 성공하면 true
async function purchaseRoomModel(modelName) {
    if (state.simMode) return true; // 연습 모드: 뭐든 무료 (나가면 원상복구)
    const def = ROOM_MODELS[modelName];
    const online = window.HousingData?.mode === 'online';
    if (shopClosedForMe()) {
        alert('지금은 상점이 쉬는 시간이라 방 모양도 살 수 없어요.');
        return false;
    }
    const coinName = online ? 'DJ코인' : '크레딧';
    if (state.credits < def.price) { alert(`${coinName}이 부족해요! 😢`); return false; }
    if (!confirm(`'${def.label}'을 ${def.price}${coinName}에 살까요?\n한 번 사면 계속 쓸 수 있어요!`)) return false;

    if (online) {
        try { await HousingData.purchase(`room_model_${modelName}`); }
        catch (e) { alert(e.message); return false; }
    } else {
        state.credits -= def.price;
        state.unlockedModels.push(modelName);
    }
    saveGame();
    updateUI();
    return true;
}

function renderRoomModelGrid() {
    const grid = document.getElementById('room-model-grid');
    grid.innerHTML = "";

    Object.keys(ROOM_MODELS).forEach(modelName => {
        const def = ROOM_MODELS[modelName];
        const unlocked = isModelUnlocked(modelName);
        const card = document.createElement('div');
        card.className = "room-model-card"
            + (state.roomModel === modelName ? " selected" : "")
            + (unlocked ? "" : " locked");

        const cv = document.createElement('canvas');
        cv.width = 140;
        cv.height = 100;
        drawModelPreview(cv, modelName);

        const label = document.createElement('span');
        label.textContent = unlocked ? def.label : `🔒 ${def.label} — ${def.price}`;

        card.appendChild(cv);
        card.appendChild(label);

        card.addEventListener('click', async () => {
            if (!isModelUnlocked(modelName)) {
                if (!await purchaseRoomModel(modelName)) return;
                renderRoomModelGrid(); // 잠금 해제 반영
            }
            if (state.roomModel === modelName) {
                roomModal.classList.add('hidden');
                return;
            }
            const returned = applyRoomModel(modelName);
            saveGame();
            updateUI();
            roomModal.classList.add('hidden');
            if (returned > 0) {
                alert(`새 방 바닥에 놓을 수 없는 가구 ${returned}개를 가방에 넣어 두었어요!`);
            }
        });

        grid.appendChild(card);
    });
}

// 16-2. 친구집 방문 + 방명록
const visitModal = document.getElementById('visit-modal');
const guestbookModal = document.getElementById('guestbook-modal');

function setupSocialUI() {
    if (window.HousingData?.mode !== 'online') return; // 게스트 모드엔 소셜 기능 없음

    if (state.visiting) {
        // 친구집: 편집 관련 버튼 전부 숨기고 구경 전용으로
        ['btn-catalog', 'btn-inventory', 'btn-room', 'btn-reset'].forEach(id => {
            document.getElementById(id).style.display = 'none';
        });
        document.querySelector('.avatar-profile-circle').style.display = 'none';
        document.getElementById('btn-go-home').style.display = '';
        document.getElementById('btn-guestbook').style.display = '';
        document.querySelector('#top-status-bar .status-box:last-of-type .value').innerText =
            `${state.visiting.ownerName}네 방`;
    } else {
        document.getElementById('btn-visit').style.display = '';
        document.getElementById('btn-guestbook').style.display = '';
    }
}

document.getElementById('btn-go-home').addEventListener('click', () => { location.href = '/housing/'; });

document.getElementById('btn-visit').addEventListener('click', async () => {
    visitModal.classList.remove('hidden');
    const listEl = document.getElementById('visit-friend-list');
    listEl.innerHTML = '<p class="visit-loading">친구 목록을 불러오는 중…</p>';
    try {
        const rooms = await HousingData.listRooms();
        listEl.innerHTML = '';
        if (!rooms.length) {
            listEl.innerHTML = '<p class="visit-loading">아직 방을 꾸민 친구가 없어요!</p>';
            return;
        }
        rooms.forEach(room => {
            const btn = document.createElement('button');
            btn.className = 'friend-btn';
            btn.innerText = room.playerName;
            btn.title = room.userId;
            btn.addEventListener('click', () => { location.href = `/housing/?visit=${encodeURIComponent(room.userId)}`; });
            listEl.appendChild(btn);
        });
        document.getElementById('btn-visit-random').onclick = () => {
            const pick = rooms[Math.floor(Math.random() * rooms.length)];
            location.href = `/housing/?visit=${encodeURIComponent(pick.userId)}`;
        };
    } catch (e) {
        listEl.innerHTML = '<p class="visit-loading">목록을 불러오지 못했어요. 다시 열어 보세요.</p>';
    }
});
document.getElementById('close-visit').addEventListener('click', () => visitModal.classList.add('hidden'));

async function renderGuestbook() {
    const ownerId = state.visiting ? state.visiting.ownerId : HousingData.member.userId;
    document.getElementById('guestbook-title').innerText = state.visiting
        ? `📖 ${state.visiting.ownerName}네 방명록` : '📖 내 방명록';
    document.getElementById('guestbook-write').style.display = state.visiting ? '' : 'none';

    const listEl = document.getElementById('guestbook-list');
    listEl.innerHTML = '<p class="guestbook-empty">불러오는 중…</p>';
    try {
        const entries = await HousingData.fetchGuestbook(ownerId);
        listEl.innerHTML = '';
        if (!entries.length) {
            listEl.innerHTML = `<p class="guestbook-empty">${state.visiting ? '첫 방명록을 남겨 보세요!' : '아직 방명록이 없어요. 친구들을 초대해 보세요!'}</p>`;
            return;
        }
        entries.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'guestbook-entry';
            const who = document.createElement('span');
            who.className = 'who';
            who.innerText = `${entry.authorName} (${entry.authorUserId})`;
            const text = document.createElement('span');
            text.innerText = entry.text; // innerText — HTML 삽입 방지
            const report = document.createElement('button');
            report.className = 'report-btn';
            report.innerText = '🚨 신고';
            report.addEventListener('click', async () => {
                if (!confirm('이 글을 신고할까요?\n신고하면 선생님이 확인할 때까지 가려져요.')) return;
                try {
                    await HousingData.reportGuestbook(ownerId, entry.entryId);
                    renderGuestbook();
                } catch (e) { alert('신고 처리에 실패했어요.'); }
            });
            div.appendChild(report);
            div.appendChild(who);
            div.appendChild(text);
            listEl.appendChild(div);
        });
    } catch (e) {
        listEl.innerHTML = '<p class="guestbook-empty">방명록을 불러오지 못했어요.</p>';
    }
}

document.getElementById('btn-guestbook').addEventListener('click', () => {
    guestbookModal.classList.remove('hidden');
    renderGuestbook();
});
document.getElementById('close-guestbook').addEventListener('click', () => guestbookModal.classList.add('hidden'));

document.getElementById('guestbook-send').addEventListener('click', async () => {
    if (!state.visiting) return;
    const input = document.getElementById('guestbook-input');
    const text = input.value.trim();
    if (!text) return;
    const sendBtn = document.getElementById('guestbook-send');
    sendBtn.disabled = true;
    try {
        await HousingData.writeGuestbook(state.visiting.ownerId, text);
        input.value = '';
        renderGuestbook();
    } catch (e) {
        alert(e.message);
    } finally {
        sendBtn.disabled = false;
    }
});

// 상점이 '나에게' 닫혀 있는지 — 관리자(교사)는 항상 입장 가능 (서버 함수도 같은 예외)
function shopClosedForMe() {
    return window.HousingData?.mode === 'online'
        && HousingData.shopEnabled === false
        && !HousingData.member?.isAdmin;
}

// 16-3. 연습(시뮬레이션) 모드 — 10분/일, 뭐든 무료, 나가면 원상복구
const SIM_DAILY_LIMIT = 600; // 초 (10분)

function kstDateKey() {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function simUsedToday() {
    const u = state.simUsage;
    return (u && u.dateKey === kstDateKey()) ? u.seconds : 0;
}

function commitSimUsage() {
    if (!state.simMode) return;
    const elapsed = Math.floor((Date.now() - state.simMode.startedAt) / 1000);
    state.simUsage = { dateKey: kstDateKey(), seconds: state.simMode.usedBefore + elapsed };
    saveGame(); // 연습 중 저장은 방 내용 대신 스냅샷 + 최신 사용 시간을 기록
}

function enterSimMode() {
    if (state.simMode || state.visiting) return;
    const used = simUsedToday();
    if (used >= SIM_DAILY_LIMIT - 3) {
        alert('오늘의 연습 시간(10분)을 다 썼어요.\n내일 다시 연습할 수 있어요!');
        return;
    }
    cancelPlacement();
    endPaperTrial();

    state.simMode = {
        snapshot: {
            roomModel: state.roomModel,
            wallTheme: state.wallTheme,
            floorTheme: state.floorTheme,
            inventory: [...state.inventory],
            placedItems: JSON.parse(JSON.stringify(state.placedItems))
        },
        usedBefore: used,
        startedAt: Date.now(),
        timer: null
    };

    // 상점이 닫혀 있어도 연습 중에는 열어줌 (돈을 안 쓰는 모드라서)
    document.getElementById('btn-catalog').style.display = '';
    document.getElementById('sim-banner').classList.remove('hidden');
    updateSimTimer();
    state.simMode.timer = setInterval(() => {
        updateSimTimer();
        const total = state.simMode.usedBefore + Math.floor((Date.now() - state.simMode.startedAt) / 1000);
        if (total % 15 === 0) commitSimUsage(); // 15초마다 사용 시간 기록
        if (total >= SIM_DAILY_LIMIT) exitSimMode(true);
    }, 1000);
}

function updateSimTimer() {
    if (!state.simMode) return;
    const total = state.simMode.usedBefore + Math.floor((Date.now() - state.simMode.startedAt) / 1000);
    const left = Math.max(0, SIM_DAILY_LIMIT - total);
    document.getElementById('sim-timer').innerText =
        `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}

function exitSimMode(timeUp) {
    if (!state.simMode) return;
    clearInterval(state.simMode.timer);
    cancelPlacement();
    endPaperTrial();
    commitSimUsage();

    // 연습에서 새로 놓아본 가구 → 즐겨찾기 일괄 담기 제안
    const before = new Set(state.simMode.snapshot.placedItems.map(i => i.classname));
    const newOnes = [...new Set(state.placedItems.filter(i => !before.has(i.classname)).map(i => i.classname))];
    if (newOnes.length > 0) {
        const total = newOnes.reduce((s, cn) => s + (getModel(cn)?.cost || 0), 0);
        if (confirm(`연습에서 새로 놓아본 가구 ${newOnes.length}종을 즐겨찾기에 담을까요?\n(전부 사려면 ${total}${window.HousingData?.mode === 'online' ? 'DJ코인' : '크레딧'})`)) {
            newOnes.forEach(cn => addFavorite(`room_${cn}`));
        }
    }

    // 방 원상복구
    const s = state.simMode.snapshot;
    state.simMode = null;
    state.roomModel = s.roomModel;
    state.wallTheme = s.wallTheme;
    state.floorTheme = s.floorTheme;
    state.inventory = s.inventory;
    state.placedItems = s.placedItems;
    applyRoomModel(state.roomModel);

    document.getElementById('sim-banner').classList.add('hidden');
    catalogModal.classList.add('hidden');
    // 상점 닫힘 상태였다면 버튼 다시 숨김
    if (shopClosedForMe()) {
        document.getElementById('btn-catalog').style.display = 'none';
    }
    saveGame();
    updateUI();
    if (timeUp) alert('⏱ 오늘의 연습 시간 10분이 끝났어요!\n방은 원래 모습으로 돌아갔어요. 내일 또 연습해요!');
}

document.getElementById('btn-sim').addEventListener('click', enterSimMode);
document.getElementById('sim-exit').addEventListener('click', () => exitSimMode(false));

// 16-3-1. 하우징 가이드 — 언제든 ❓버튼으로, 처음 온 사람에겐 자동으로 한 번
const GUIDE_SEEN_KEY = 'housingGuideSeen_v1';

function openGuide() {
    document.getElementById('guide-modal').classList.remove('hidden');
    try { localStorage.setItem(GUIDE_SEEN_KEY, '1'); } catch (e) {}
}

document.getElementById('btn-guide').addEventListener('click', openGuide);
document.getElementById('close-guide').addEventListener('click', () => {
    document.getElementById('guide-modal').classList.add('hidden');
});

// 16-4. 즐겨찾기 — 방 문서에 저장, 상점 ⭐탭에서 모아보고 구매
function addFavorite(itemId) {
    if (state.favorites.includes(itemId)) return true;
    if (state.favorites.length >= 50) { alert('즐겨찾기는 50개까지만 담을 수 있어요!'); return false; }
    state.favorites.push(itemId);
    persistFavorites();
    return true;
}

function removeFavorite(itemId) {
    if (!state.favorites.includes(itemId)) return;
    state.favorites = state.favorites.filter(id => id !== itemId);
    persistFavorites();
}

// 친구집 구경 중에는 saveGame이 통째로 꺼져 있어서(내 방 보호) 즐겨찾기만 따로 저장
function persistFavorites() {
    if (state.visiting) {
        if (window.HousingData?.saveFavorites) HousingData.saveFavorites([...state.favorites]);
    } else {
        saveGame();
    }
}

function catalogItemFavId(item) {
    return item.paper ? `room_paper_${item.paper}_${item.themeId}` : `room_${item.classname}`;
}

// 즐겨찾기 ID → 카탈로그 항목 찾기
function findItemByFavId(favId) {
    if (favId.startsWith('room_paper_')) {
        const m = favId.match(/^room_paper_(wall|floor)_(\d+)$/);
        return m ? PAPER_ITEMS.find(p => p.paper === m[1] && p.themeId === Number(m[2])) : null;
    }
    const cn = favId.replace(/^room_/, '');
    return CATALOG_ITEMS.find(i => i.classname === cn) || null;
}

function syncFavButton(item) {
    const btn = document.getElementById('btn-fav-item');
    const faved = state.favorites.includes(catalogItemFavId(item));
    btn.classList.toggle('faved', faved);
    btn.innerText = faved ? '★ 담김 — 눌러서 빼기' : '⭐ 즐겨찾기';
}

document.getElementById('btn-fav-item').addEventListener('click', () => {
    const item = state.selectedCatalogItem;
    if (!item) return;
    const favId = catalogItemFavId(item);
    if (state.favorites.includes(favId)) removeFavorite(favId);
    else addFavorite(favId);
    syncFavButton(item);
    // ⭐탭을 보고 있었다면 목록 갱신
    if (document.querySelector('.tab-btn.active')?.dataset.category === 'fav') renderCatalogGrid('fav');
});

// 친구집에서 가구 구경 → ⭐만 담을 수 있는 카드
document.getElementById('action-fav').addEventListener('click', () => {
    const item = state.selectedPlacedItem;
    if (!item) return;
    if (addFavorite(`room_${item.classname}`)) {
        const favBtn = document.getElementById('action-fav');
        favBtn.innerText = '★ 담았어요!';
        favBtn.disabled = true;
    }
});

// 17. 시작!
(async () => {
    // 온라인/게스트 모드 판정과 서버 데이터(코인·보유·방)를 기다린 뒤 시작
    if (window.HousingData) {
        try { await HousingData.ready; } catch (e) { /* 실패 시 게스트 모드 */ }
    }

    // 이용 일시정지 중이면 안내 화면만 표시하고 시작하지 않음
    if (window.HousingData?.mode === 'suspended') {
        const until = new Date(HousingData.suspendedUntil);
        const untilText = `${until.getMonth() + 1}월 ${until.getDate()}일`;
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;'
            + 'align-items:center;justify-content:center;gap:16px;background:#0b1120;color:#e2e8f0;'
            + 'font-size:18px;text-align:center;padding:24px;line-height:1.6;';
        overlay.innerHTML = `
            <div style="font-size:44px">⏸️</div>
            <div>지금은 방 꾸미기를 쉬는 시간이에요.<br>${untilText}까지 이용이 잠시 멈춰 있어요.<br>궁금하면 선생님께 문의해 주세요.</div>
            <a href="/" style="background:#0284c7;color:#fff;padding:12px 22px;border-radius:12px;
                text-decoration:none;font-weight:700">퀴즈타운으로 가기</a>`;
        document.body.appendChild(overlay);
        return;
    }

    // 연결이 풀렸거나 확인 실패 (운영에서는 게스트 시뮬 대신 재로그인 안내)
    if (window.HousingData?.mode === 'locked') {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;'
            + 'align-items:center;justify-content:center;gap:16px;background:#0b1120;color:#e2e8f0;'
            + 'font-size:18px;text-align:center;padding:24px;line-height:1.6;';
        overlay.innerHTML = `
            <div style="font-size:44px">🔑</div>
            <div>로그인이 풀렸어요.<br>퀴즈타운에서 다시 로그인한 뒤 와 주세요!</div>
            <a href="/" style="background:#0284c7;color:#fff;padding:12px 22px;border-radius:12px;
                text-decoration:none;font-weight:700">퀴즈타운으로 가기</a>`;
        document.body.appendChild(overlay);
        return;
    }

    loadGame();

    // 친구집 방문 모드 (?visit=회원ID): 방 요소만 친구 것, 아바타·이름은 내 것 유지
    if (window.HousingData?.mode === 'online') {
        const visitId = new URLSearchParams(location.search).get('visit');
        if (visitId && visitId !== HousingData.member.userId) {
            try {
                const visitData = await HousingData.loadVisitRoom(visitId);
                if (visitData) {
                    state.visiting = { ownerId: visitId, ownerName: visitData.playerName || visitId };
                    if (typeof visitData.roomModel === 'string' && ROOM_MODELS[visitData.roomModel]) state.roomModel = visitData.roomModel;
                    if (typeof visitData.wallTheme === 'number' && WALL_THEMES[visitData.wallTheme]) state.wallTheme = visitData.wallTheme;
                    if (typeof visitData.floorTheme === 'number' && FLOOR_THEMES[visitData.floorTheme]) state.floorTheme = visitData.floorTheme;
                    state.placedItems = Array.isArray(visitData.placedItems)
                        ? visitData.placedItems.filter(i => getModel(i.classname)) : [];
                    state.inventory = [];
                } else {
                    alert('친구 방을 찾지 못했어요. 내 방으로 돌아갈게요.');
                    location.href = '/housing/';
                    return;
                }
            } catch (e) {
                alert('친구 방을 여는 데 실패했어요. 내 방으로 돌아갈게요.');
                location.href = '/housing/';
                return;
            }
        }
    }

    applyRoomModel(state.roomModel); // 문 위치에 아바타 배치 + 화면 중앙 정렬 + 저장 데이터 검증
    refreshAvatarFigure();           // look → figure 문자열 생성 + 프로필 아이콘 갱신
    setupSocialUI();                 // 친구집/방명록 버튼 (온라인 모드 전용)

    // 온라인 모드: 화폐 라벨을 DJ코인으로, 잔액은 서버 구독으로 실시간 갱신
    if (window.HousingData?.mode === 'online') {
        const coinLabel = document.querySelector('#top-status-bar .status-box .label');
        if (coinLabel) coinLabel.innerText = 'DJ코인';
        const priceUnit = document.getElementById('catalog-price-unit');
        if (priceUnit) priceUnit.innerText = 'DJ코인';
        HousingData.onCoinChange(coin => {
            state.credits = coin;
            // 오늘의 쿠폰 표시 (1장 이상일 때만 상자 노출)
            const box = document.getElementById('coupon-box');
            box.style.display = HousingData.coupons > 0 ? '' : 'none';
            document.getElementById('coupon-count').innerText = `${HousingData.coupons}장`;
            updateUI();
        });
    }
    updateUI();

    // 🧪 연습 모드 버튼: 내 방에서만 (친구집 구경 중엔 숨김)
    if (!state.visiting) document.getElementById('btn-sim').style.display = '';

    // 관리자가 상점을 닫아뒀으면: 상점 버튼 숨김 + 자동 열기 무시 (관리자 본인은 예외)
    const shopClosed = shopClosedForMe();
    if (shopClosed) {
        document.getElementById('btn-catalog').style.display = 'none';
    }

    // 퀴즈타운 상점에서 넘어온 경우 (?shop=1): 상점을 바로 열어줌
    if (new URLSearchParams(location.search).get('shop') === '1') {
        if (shopClosed) {
            alert('지금은 상점이 쉬는 시간이에요. 나중에 다시 와 주세요!');
        } else {
            document.getElementById('btn-catalog').click();
        }
    }

    // 처음 온 학생에게는 가이드를 자동으로 한 번 보여줌 (그 뒤로는 ❓버튼으로)
    let guideSeen = false;
    try { guideSeen = localStorage.getItem(GUIDE_SEEN_KEY) === '1'; } catch (e) {}
    if (!guideSeen) openGuide();

    // 저장된 방의 가구는 즉시, 나머지 카탈로그는 유휴 시간에 미리 로딩(원본 스프라이트 팝인 방지)
    state.placedItems.forEach(i => loadFurni(i.classname));
    const preloadIdle = window.requestIdleCallback || (fn => setTimeout(fn, 200));
    let preloadIdx = 0;
    function preloadNextFurni() {
        if (preloadIdx >= CATALOG_ITEMS.length) return;
        loadFurni(CATALOG_ITEMS[preloadIdx++].classname);
        preloadIdle(preloadNextFurni);
    }
    preloadIdle(preloadNextFurni);

    requestAnimationFrame(drawRoom);
})();
