// 하우징 ↔ 퀴즈타운 데이터 브리지
//
// 운영(온라인 모드): DJ코인(userEconomy 실시간 구독) + 서버 구매(purchaseHousingItem 함수)
//   + 보유 가구(userInventory, room_ 접두사) + 방 상태 저장(userHomeRooms/{회원ID}, 디바운스)
// 로컬 개발(게스트 모드): Firebase가 없으면 기존 localStorage 방식 그대로 동작
//
// 전역 공개: window.HousingData
//   .ready: Promise<{mode}>            초기화 완료 (mode: 'online'|'guest')
//   .mode, .member                     'online'일 때 member = {userId, nickname}
//   .djCoin                            현재 DJ코인 (구독으로 자동 갱신)
//   .onCoinChange(cb)                  코인 변동 콜백 등록
//   .ownedCount(itemId)                보유 수량 (구매 성공 시 자동 반영)
//   .roomData                          저장된 방 문서 (없으면 null)
//   .purchase(itemId): Promise         서버 구매 (코인 차감·수량 증가)
//   .saveRoom(payload)                 방 상태 저장 (0.8초 디바운스)

(function () {
    'use strict';

    const REGION = 'asia-northeast3';
    const SAVE_DEBOUNCE_MS = 800;
    const isLocalDev = ['localhost', '127.0.0.1'].includes(location.hostname);

    // 가구 classname / 벽지·바닥 → 상점 문서 ID
    // room_ 접두사는 퀴즈타운 메인 상점 화면에서 자동으로 숨겨지는 규칙을 재활용한 것
    function furniItemId(classname) { return `room_${classname}`; }
    function paperItemId(paper, themeId) { return `room_paper_${paper}_${themeId}`; }

    const api = {
        mode: 'guest',
        member: null,
        djCoin: 0,
        roomData: null,
        furniItemId,
        paperItemId,
        ownedCount(itemId) { return ownedCounts[itemId] || 0; },
        onCoinChange(cb) { coinListeners.push(cb); },
        purchase,
        saveRoom,
        flushRoomSave
    };

    let ownedCounts = {};        // shopItems 문서 ID → 보유 수량
    const coinListeners = [];
    let db = null, functionsInstance = null, memberUserId = '';
    let saveTimer = null, pendingPayload = null;

    function notifyCoin() { coinListeners.forEach(cb => { try { cb(api.djCoin); } catch (e) {} }); }

    // ---- 회원 확인 (메인 앱과 같은 쿼리: users에서 내 authUid로 찾기) ----

    async function resolveMember(authUid) {
        const snapshot = await db.collection('users')
            .where('authUid', '==', authUid)
            .limit(1)
            .get();
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        const data = doc.data() || {};
        return { userId: doc.id, nickname: data.nickname || data.name || '' };
    }

    // ---- 초기 데이터 로드 ----

    async function loadOwnedItems() {
        // userInventory에서 하우징 아이템(room_*)만 — 문서 ID 접두사 범위 조회
        const snapshot = await db.collection('userInventory').doc(memberUserId).collection('items')
            .orderBy(window.firebase.firestore.FieldPath.documentId())
            .startAt('room_').endAt('room_')
            .get();
        ownedCounts = {};
        snapshot.docs.forEach(doc => {
            const q = Number(doc.data()?.quantity);
            ownedCounts[doc.id] = Number.isFinite(q) && q > 0 ? q : 1;
        });
    }

    async function loadRoomDoc() {
        const doc = await db.collection('userHomeRooms').doc(memberUserId).get();
        api.roomData = doc.exists ? doc.data() : null;
    }

    function subscribeCoin() {
        db.collection('userEconomy').doc(memberUserId).onSnapshot(doc => {
            const coin = Number(doc.data()?.djCoin);
            api.djCoin = Number.isFinite(coin) ? coin : 0;
            notifyCoin();
        }, () => { /* 구독 실패해도 구매 응답으로 갱신됨 */ });
    }

    // ---- 서버 구매 ----

    const PURCHASE_ERROR_MESSAGES = {
        'functions/failed-precondition': 'DJ코인이 부족하거나 지금은 살 수 없는 물건이에요.',
        'functions/not-found': '상점에서 물건 정보를 찾지 못했어요.',
        'functions/permission-denied': '지금 로그인으로는 살 수 없어요. 퀴즈타운에서 다시 로그인해 주세요.',
        'functions/unauthenticated': '로그인이 풀렸어요. 퀴즈타운에서 다시 로그인해 주세요.',
        'functions/invalid-argument': '구매 요청이 올바르지 않아요.'
    };

    async function purchase(itemId) {
        if (api.mode !== 'online') throw new Error('guest-mode');
        const callable = functionsInstance.httpsCallable('purchaseHousingItem');
        try {
            const result = await callable({ memberUserId, itemId });
            const data = result?.data || {};
            if (Number.isFinite(Number(data.nextDjCoin))) {
                api.djCoin = Number(data.nextDjCoin);
                notifyCoin();
            }
            ownedCounts[itemId] = Number(data.quantity) || (ownedCounts[itemId] || 0) + 1;
            return data;
        } catch (error) {
            const friendly = PURCHASE_ERROR_MESSAGES[error?.code] || '구매 중 문제가 생겼어요. 잠시 후 다시 해 보세요.';
            const wrapped = new Error(friendly);
            wrapped.original = error;
            throw wrapped;
        }
    }

    // ---- 방 상태 저장 (디바운스) ----

    function saveRoom(payload) {
        if (api.mode !== 'online') return;
        pendingPayload = payload;
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(flushRoomSave, SAVE_DEBOUNCE_MS);
    }

    function flushRoomSave() {
        if (api.mode !== 'online' || !pendingPayload) return;
        const payload = pendingPayload;
        pendingPayload = null;
        if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
        db.collection('userHomeRooms').doc(memberUserId).set({
            userId: memberUserId,
            playerName: payload.playerName || '',
            roomModel: payload.roomModel || 'model_a',
            wallTheme: payload.wallTheme ?? 0,
            floorTheme: payload.floorTheme ?? 0,
            look: payload.look || null,
            placedItems: payload.placedItems || [],
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: false }).catch(() => { /* 일시 실패 — 다음 저장에서 다시 시도됨 */ });
    }

    // 페이지를 떠날 때 저장 대기분을 마저 보냄
    window.addEventListener('pagehide', flushRoomSave);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushRoomSave();
    });

    // ---- 초기화 ----

    async function init() {
        if (isLocalDev || !window.firebase?.apps?.length || !window.firebase.firestore) {
            api.mode = 'guest';
            return { mode: 'guest' };
        }

        const auth = window.firebase.auth();
        const user = await new Promise(resolve => {
            const unsub = auth.onAuthStateChanged(u => { unsub(); resolve(u); });
        });
        if (!user) { api.mode = 'guest'; return { mode: 'guest' }; }
        // (로그인이 없으면 assets-loader가 이미 잠금 화면을 띄우므로 여기 오지 않음)

        db = window.firebase.firestore();
        functionsInstance = window.firebase.app().functions(REGION);

        const member = await resolveMember(user.uid);
        if (!member) { api.mode = 'guest'; return { mode: 'guest' }; }

        memberUserId = member.userId;
        api.member = member;
        api.mode = 'online';

        await Promise.all([loadOwnedItems(), loadRoomDoc()]);
        subscribeCoin();
        return { mode: 'online' };
    }

    api.ready = init().catch(() => { api.mode = 'guest'; return { mode: 'guest' }; });
    window.HousingData = api;
})();
