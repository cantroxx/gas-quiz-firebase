(function (root) {
  'use strict';
  let loading;
  function script(src) {
    return new Promise((resolve, reject) => {
      const element = document.createElement('script'); element.src = src; element.onload = resolve;
      element.onerror = () => reject(Error('로그인 연결 파일을 불러오지 못했어요. 새로고침해 주세요.')); document.head.append(element);
    });
  }
  async function load() {
    if (root.firebase?.apps?.length) return root.firebase;
    if (loading) return loading;
    loading = (async () => {
      const local = ['localhost', '127.0.0.1'].includes(location.hostname);
      const emulator = local && new URLSearchParams(location.search).get('emulator') === '1';
      for (const name of ['app', 'auth', 'functions']) await script('/__/firebase/10.12.2/firebase-' + name + '-compat.js');
      if (emulator) {
        root.firebase.initializeApp({ apiKey: 'demo-key', projectId: 'demo-fruit-bell', authDomain: 'localhost', appId: 'demo-fruit-bell' });
        root.firebase.auth().useEmulator('http://127.0.0.1:9497', { disableWarnings: true });
        root.firebase.app().functions('asia-northeast3').useEmulator('127.0.0.1', 5297);
      } else {
        if (local) throw Error('로컬 연습을 이용해 주세요.');
        await script('/__/firebase/init.js');
      }
      return root.firebase;
    })().catch(error => { loading = null; throw error; });
    return loading;
  }
  function create(firebase, onRoom, onConnection) {
    const callable = firebase.app().functions('asia-northeast3').httpsCallable('fruitBellAction', { timeout: 35000 });
    let code = '', revision = -1, epoch = 0, offset = 0, rtt = 0, bestRtt = Infinity;
    const time = () => performance.timeOrigin + performance.now();
    async function request(action, data = {}) {
      if (!firebase.auth().currentUser) throw Error('퀴즈타운에 로그인한 뒤 친구 대전을 시작해 주세요.');
      const sent = time();
      const result = (await callable({ ...data, action, ...(!['profile', 'create', 'list'].includes(action) ? { code: data.code || code } : {}) })).data;
      const received = time();
      if (action !== 'watch' && Number.isFinite(result.serverNow)) {
        rtt = Math.round(received - sent);
        if (rtt < bestRtt) { bestRtt = rtt; offset = result.serverNow - (sent + received) / 2; }
      }
      return result;
    }
    function accept(value) {
      if (!value || value.code !== code || value.revision < revision) return;
      revision = value.revision; onRoom(value);
    }
    async function watch(nextCode) {
      code = nextCode; revision = -1; const token = ++epoch;
      let failures = 0;
      while (token === epoch) {
        try {
          const result = await request(revision < 0 ? 'sync' : 'watch', { code: nextCode, revision });
          if (token !== epoch) return;
          failures = 0; onConnection(true); accept(result.room);
          if (['finished', 'aborted', 'closed'].includes(result.room.status)) return;
        } catch (error) {
          if (token !== epoch) return;
          onConnection(false, error);
          if (['functions/permission-denied', 'functions/unauthenticated', 'functions/not-found', 'functions/failed-precondition'].includes(error.code)) return;
          failures++; await new Promise(resolve => setTimeout(resolve, Math.min(4000, 500 * failures)));
          revision = -1;
        }
      }
    }
    return {
      clock: () => ({ offset, rtt }), request, watch,
      stop() { epoch++; code = ''; revision = -1; },
      async action(action, data = {}) {
        if (action === 'session') {
          const result = await request('profile');
          return { ...result, room: result.activeCode ? (await request('sync', { code: result.activeCode })).room : null };
        }
        const token = epoch;
        const result = await request(action, data);
        if (action === 'create' || action === 'join') {
          code = result.room.code; revision = result.room.revision; onRoom(result.room); void watch(code);
        } else if (token === epoch && result.room && action !== 'leave') accept(result.room);
        if (action === 'leave' && token === epoch) { epoch++; code = ''; revision = -1; }
        return result;
      }
    };
  }
  root.FruitBellNet = { load, create };
})(globalThis);
