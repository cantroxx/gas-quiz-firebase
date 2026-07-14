// 하우징 가구 에셋 로더
//
// 가구 이미지(Habbo © Sulake)는 저작권 때문에 public 폴더로 공개 배포하지 않고,
// Firebase Storage(housingAssets/)에 두고 "로그인 + 학급 계정 연결" 사용자에게만 내려준다.
// 속도를 위해 가구 198종을 압축 묶음 1개(furni-bundle)로 받고,
// 받은 묶음은 브라우저 안(IndexedDB)에 저장해 두 번째 접속부터는 즉시 연다.
//
// 전역 공개: window.HousingAssets = { ready: Promise<번들>, furni: {classname: {def, frames, png}} }

(function () {
    'use strict';

    const BUNDLE_VERSION = 5; // 가구를 추가·수정해 새 묶음을 올릴 때마다 1씩 올린다
    const BUNDLE_FILE = `furni-bundle-v${BUNDLE_VERSION}.json.gz`;
    const STORAGE_PATH = `housingAssets/${BUNDLE_FILE}`;
    const IDB_NAME = 'housing-assets';
    const IDB_STORE = 'bundles';

    const isLocalDev = ['localhost', '127.0.0.1'].includes(location.hostname);

    // ---- IndexedDB (브라우저 저장고) ----

    function openDb() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(IDB_NAME, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function idbGet(key) {
        try {
            const db = await openDb();
            return await new Promise((resolve, reject) => {
                const req = db.transaction(IDB_STORE).objectStore(IDB_STORE).get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        } catch (e) { return undefined; } // 저장고를 못 써도 동작은 계속 (매번 다운로드)
    }

    async function idbSet(key, value) {
        try {
            const db = await openDb();
            await new Promise((resolve, reject) => {
                const tx = db.transaction(IDB_STORE, 'readwrite');
                tx.objectStore(IDB_STORE).put(value, key);
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            });
            // 옛 버전 묶음은 지워서 용량을 아낀다
            const db2 = await openDb();
            const tx2 = db2.transaction(IDB_STORE, 'readwrite');
            const store = tx2.objectStore(IDB_STORE);
            store.getAllKeys().onsuccess = e => {
                for (const k of e.target.result) if (k !== key) store.delete(k);
            };
        } catch (e) { /* 캐시 실패는 무시 */ }
    }

    // ---- 압축 해제 (gzip) ----

    async function gunzipToJson(arrayBuffer) {
        const stream = new Blob([arrayBuffer]).stream()
            .pipeThrough(new DecompressionStream('gzip'));
        const text = await new Response(stream).text();
        return JSON.parse(text);
    }

    // ---- 접근 안내 화면 (로그인/연결 안 된 사용자) ----

    function showGate(message) {
        const gate = document.createElement('div');
        gate.id = 'housing-gate';
        gate.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;'
            + 'align-items:center;justify-content:center;gap:16px;background:#0b1120;color:#e2e8f0;'
            + 'font-size:18px;text-align:center;padding:24px;line-height:1.6;';
        gate.innerHTML = `
            <div style="font-size:44px">🔒</div>
            <div>${message}</div>
            <a href="/" style="background:#0284c7;color:#fff;padding:12px 22px;border-radius:12px;
                text-decoration:none;font-weight:700">퀴즈타운으로 가기</a>`;
        document.body.appendChild(gate);
    }

    // ---- 묶음 내려받기 ----

    async function fetchBundleGz() {
        // 로컬 개발: dev-assets 폴더에서 직접 (배포 제외 + gitignore 대상)
        if (isLocalDev) {
            const res = await fetch(`dev-assets/${BUNDLE_FILE}`);
            if (!res.ok) throw new Error(`dev bundle not found (${res.status})`);
            return res.arrayBuffer();
        }

        // 운영: 로그인 세션 확인 → Storage에서 잠긴 묶음 다운로드
        const auth = window.firebase?.auth?.();
        const storage = window.firebase?.storage?.();
        if (!auth || !storage) throw new Error('firebase-unavailable');

        const user = await new Promise(resolve => {
            const unsub = auth.onAuthStateChanged(u => { unsub(); resolve(u); });
        });
        if (!user) throw new Error('login-required');

        // 학급 연결이 안 된 계정은 Storage 규칙이 거부한다 (storage/unauthorized)
        const url = await storage.ref(STORAGE_PATH).getDownloadURL();
        const res = await fetch(url);
        if (!res.ok) throw new Error(`bundle fetch failed (${res.status})`);
        return res.arrayBuffer();
    }

    async function loadBundle() {
        // 1) 브라우저 저장고에 같은 버전이 있으면 그걸로 즉시 시작
        const cacheKey = `v${BUNDLE_VERSION}`;
        const cached = await idbGet(cacheKey);
        if (cached) {
            try { return await gunzipToJson(cached); }
            catch (e) { /* 손상된 캐시 → 새로 받기 */ }
        }

        // 2) 없으면 내려받고 저장
        const gz = await fetchBundleGz();
        const bundle = await gunzipToJson(gz);
        idbSet(cacheKey, gz); // 저장은 기다리지 않음
        return bundle;
    }

    const ready = loadBundle().then(bundle => {
        window.HousingAssets.furni = bundle.furni;
        return bundle;
    }).catch(error => {
        const code = error?.code || error?.message || '';
        if (String(code).includes('unauthorized') || String(code).includes('object-not-found')) {
            showGate('이 방 꾸미기는 우리 반 친구들만 쓸 수 있어요.<br>퀴즈타운에서 계정을 연결한 뒤 다시 와 주세요!');
        } else if (String(code).includes('login-required') || String(code).includes('firebase-unavailable')) {
            showGate('퀴즈타운에 로그인한 뒤에 들어올 수 있어요.');
        } else {
            showGate('가구 데이터를 불러오지 못했어요.<br>인터넷 연결을 확인하고 새로고침해 주세요.');
        }
        throw error;
    });

    window.HousingAssets = { ready, furni: null };
})();
