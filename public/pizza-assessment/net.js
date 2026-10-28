(function (root) {
  'use strict';
  let client, connecting, adminClient;
  const emulator = ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).get('emulator') === '1';
  const script = src => new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = () => reject(Error('연결 파일을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.')); document.head.append(s); });
  async function initialize() {
    if (client) return client;
    if (['localhost', '127.0.0.1'].includes(location.hostname) && !emulator) throw Error('로컬에서는 에뮬레이터 연결 주소(?emulator=1)를 사용해 주세요.');
    for (const name of ['app', 'functions']) await script(`/__/firebase/10.12.2/firebase-${name}-compat.js`);
    const config = emulator ? { projectId: 'demo-dj48-rules', apiKey: 'demo-key', appId: 'demo-pizza' } : await fetch('/__/firebase/init.json').then(r => { if (!r.ok) throw Error('Firebase 설정을 읽지 못했어요.'); return r.json(); });
    const app = root.firebase.initializeApp(config, 'pizza-assessment');
    const functions = app.functions('asia-northeast3');
    if (emulator) functions.useEmulator('127.0.0.1', 5001);
    client = functions.httpsCallable('pizzaAssessmentAction', { timeout: 20000 });
    return client;
  }
  function connect() { return connecting ||= initialize().catch(e => { connecting = null; throw e; }); }
  async function adminRequest(action, data = {}) {
    await connect();
    if (!adminClient) {
      await script('/__/firebase/10.12.2/firebase-auth-compat.js');
      // Quiztown uses the default Firebase app. Reusing its name and project restores its persisted login.
      const app = root.firebase.apps.find(a => a.name === '[DEFAULT]') || root.firebase.initializeApp(root.firebase.app('pizza-assessment').options);
      if (emulator) app.auth().useEmulator('http://127.0.0.1:9191', { disableWarnings: true });
      const functions = app.functions('asia-northeast3');
      if (emulator) functions.useEmulator('127.0.0.1', 5001);
      await new Promise((resolve, reject) => { const off = app.auth().onAuthStateChanged(() => { off(); resolve(); }, reject); });
      adminClient = functions.httpsCallable('pizzaAssessmentAction', { timeout: 30000 });
    }
    if (!root.firebase.app().auth().currentUser) { const e = Error('같은 브라우저에서 퀴즈타운 총관리자 계정으로 로그인한 뒤 다시 연결해 주세요.'); e.code = 'unauthenticated'; throw e; }
    try { return (await adminClient({ action, ...data })).data; }
    catch (e) { const code = String(e.code || '').replace('functions/', ''); const error = Error(code === 'permission-denied' ? '퀴즈타운 총관리자만 사용할 수 있어요. 반 관리자와 일반 교사 계정은 접근할 수 없습니다.' : messages[code] || e.message); error.code = code; throw error; }
  }
  const messages = { unavailable: '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.', internal: '요청을 처리하지 못했어요. 연결과 서버 배포 상태를 확인해 주세요.', 'deadline-exceeded': '연결이 늦어지고 있어요. 같은 버튼으로 다시 시도해 주세요.' };
  async function request(action, data = {}) {
    try { return (await (await connect())({ action, ...data })).data; }
    catch (e) { const code = String(e.code || '').replace('functions/', ''); const error = Error(messages[code] || e.message || '연결을 확인해 주세요.'); error.code = code; throw error; }
  }
  function token() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join(''); }
  root.PizzaNet = { request, adminRequest, token, emulator };
})(globalThis);
