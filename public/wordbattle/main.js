/* main.js — 첫 화면(방 만들기 / 참가 / 연습) 후 게임 세션을 만든다.
 *  온라인: 퀴즈타운과 같은 익명 로그인 사용. 학생 이름은 Firestore users 문서에서 가져온다.
 *  난이도 모드는 없앴고, 사전(국립국어원 학습용 어휘 5,500여 개) 하나로 통일했다.
 */
(function (global) {
  'use strict';

  const app = document.getElementById('app');
  const esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // 로컬(localhost) + Firebase 에뮬레이터로 접속했을 때만 에뮬레이터에 연결한다.
  // 운영 사이트(dj48-quiztown-firebase.web.app)에선 hostname이 달라 절대 실행되지 않음.
  (function connectEmulatorsIfLocal() {
    try {
      const h = location.hostname;
      const isLocal = (h === 'localhost' || h === '127.0.0.1');
      if (isLocal && global.firebase && global.firebase.apps && global.firebase.apps.length) {
        global.firebase.firestore().useEmulator('localhost', 8181);
        global.firebase.auth().useEmulator('http://localhost:9191', { disableWarnings: true });
        // 뽑기 서버 함수(wbDraw)도 에뮬레이터로
        try { global.firebase.app().functions('asia-northeast3').useEmulator('localhost', 5001); } catch (e) {}
        // 테스트용: 탭마다 다른 익명 계정이 되도록 로그인 유지를 끈다(로컬 전용).
        try { global.firebase.auth().setPersistence(global.firebase.auth.Auth.Persistence.NONE); } catch (e) {}
        console.log('[낱말대전] Firebase 에뮬레이터에 연결됨 (로컬 테스트)');
      }
    } catch (e) { console.warn('[낱말대전] 에뮬레이터 연결 건너뜀:', e); }
  })();

  function firebaseReady() {
    return !!(global.firebase && global.firebase.apps && global.firebase.apps.length &&
              global.firebase.firestore && global.firebase.auth);
  }

  function renderHome() {
    const online = firebaseReady();
    const dictSize = (global.WBWords && global.WBWords.size()) || 0;
    app.innerHTML =
      '<div class="screen"><div class="card">' +
        '<h1 class="title">낱말 대전</h1>' +
        '<p class="subtitle">자음·모음 타일로 낱말을 만들어 먼저 다 내려놓으면 승리! (한글판 루미큐브)</p>' +

        '<div class="section"><h3>방 만들기</h3>' +
          '<div class="join-row">' +
            '<input id="room-title" maxlength="20" placeholder="방 제목 (예: 4반 낱말대전)" ' + (online ? '' : 'disabled') + '>' +
            '<button class="big-btn primary" id="btn-create" ' + (online ? '' : 'disabled') + '>만들기</button>' +
          '</div>' +
        '</div>' +

        (online
          ? '<div class="section"><h3>열린 방 (눌러서 입장)</h3>' +
              '<div id="room-list" class="room-list"><div class="rl-empty">방 목록 불러오는 중…</div></div>' +
              '<button class="mini-btn" id="btn-refresh">새로고침 ↻</button>' +
            '</div>'
          : '<p class="hint warn">지금은 온라인 서버에 연결되지 않아 <b>연습 모드</b>만 됩니다.</p>') +

        '<button class="big-btn ghost" id="btn-bot">🤖 봇과 대전' + (online ? ' (랭크전)' : '') + ' ▶</button>' +
        '<button class="big-btn ghost" id="btn-local">혼자 연습(2명 번갈아) ▶</button>' +

        '<button class="big-btn ghost" id="btn-howto">📖 게임 방법 보기</button>' +
        '<p class="dict-note">사전 ' + dictSize.toLocaleString() + '개 낱말 · 사전에 없는 말은 게임 중 <b>제안</b>해서 친구들 동의를 받으면 돼요</p>' +
        '<a class="town-link" href="/">🏘️ 퀴즈타운으로</a>' +
        '<p class="credit">어휘 출처: 국립국어원 학습용 어휘(공공누리 1유형) · hunspell-dict-ko(CC BY-SA 2.0 KR)</p>' +
      '</div></div>';

    document.getElementById('btn-howto').onclick = function () { global.WBTutorial.open(); };
    document.getElementById('btn-local').onclick = function () {
      const session = global.WBNet.LocalNet({ seatNames: ['1번 친구', '2번 친구'] });
      global.WBUI.attach(session);
    };
    document.getElementById('btn-bot').onclick = function () {
      // 온라인(로그인 가능)이면 사람 이름·서버 랭크 기록까지, 아니면 로컬로 봇 대전
      if (online) {
        app.innerHTML = '<div class="loading">봇을 부르는 중…</div>';
        ensureAuth().then(function (user) {
          const db = global.firebase.firestore();
          return lookupNickname(db, user).then(function (name) {
            const session = global.WBNet.BotNet({
              db: db, FieldValue: global.firebase.firestore.FieldValue, me: { id: user.uid, name: name }
            });
            global.WBUI.attach(session);
          });
        }).catch(function () {
          global.WBUI.attach(global.WBNet.BotNet({}));
        });
      } else {
        global.WBUI.attach(global.WBNet.BotNet({}));
      }
    };
    const createBtn = document.getElementById('btn-create');
    if (createBtn) createBtn.onclick = function () {
      const title = (document.getElementById('room-title').value || '').trim();
      startOnline('create', { title: title });
    };
    const refreshBtn = document.getElementById('btn-refresh');
    if (refreshBtn) refreshBtn.onclick = loadRooms;
    if (online) loadRooms();
  }

  // 대기 중인 방 목록을 불러와 그린다 (제목 클릭 → 입장)
  function loadRooms() {
    const box = document.getElementById('room-list');
    if (!box) return;
    box.innerHTML = '<div class="rl-empty">불러오는 중…</div>';
    ensureAuth().then(function (user) {
      const db = global.firebase.firestore();
      return global.WBNet.listWaitingRooms({ db: db });
    }).then(function (rooms) {
      if (!rooms.length) { box.innerHTML = '<div class="rl-empty">아직 열린 방이 없어요. 위에서 방을 만들어 보세요!</div>'; return; }
      box.innerHTML = rooms.map(function (r) {
        return '<button class="room-item" data-code="' + esc(r.code) + '">' +
                 '<span class="ri-title">' + esc(r.title) + '</span>' +
                 '<span class="ri-meta">' + r.count + '/4 · ' + esc(r.code) + '</span>' +
               '</button>';
      }).join('');
      box.querySelectorAll('[data-code]').forEach(function (btn) {
        btn.onclick = function () { startOnline('join', { code: btn.getAttribute('data-code') }); };
      });
    }).catch(function (e) {
      box.innerHTML = '<div class="rl-empty">목록을 불러오지 못했어요. 새로고침 해보세요.</div>';
    });
  }

  // 로그인 보장.
  //  ★중요★ 퀴즈타운에 이미 로그인한 학생/교사가 있으면 그 계정을 그대로 쓴다.
  //  예전엔 무조건 signInAnonymously() 를 먼저 불러서 기존 로그인을 익명 계정으로
  //  덮어써 버렸다(→ 이름이 '친구XXXX'로 뜨고 랭크가 익명에 쌓임). 이제는
  //  먼저 로그인 복원을 기다린 뒤, 정말 로그인이 없을 때만 익명 로그인한다.
  let _authUser = null;
  function ensureAuth() {
    if (_authUser) return Promise.resolve(_authUser);
    const auth = global.firebase.auth();
    return new Promise(function (resolve) {
      const off = auth.onAuthStateChanged(function (user) {
        off();
        if (user) { _authUser = user; resolve(user); return; }   // 기존 로그인 사용
        auth.signInAnonymously().catch(function () {}).then(function () {
          _authUser = auth.currentUser; resolve(_authUser);
        });
      });
    });
  }

  function startOnline(kind, opts) {
    app.innerHTML = '<div class="loading">서버에 연결하는 중…</div>';
    ensureAuth().then(function (user) {
      const db = global.firebase.firestore();
      return lookupNickname(db, user).then(function (name) {
        const me = { id: user.uid, name: name };
        const deps = { db: db, FieldValue: global.firebase.firestore.FieldValue, me: me };
        const p = (kind === 'create')
          ? global.WBNet.createOnlineRoom(deps, opts.title)
          : global.WBNet.joinOnlineRoom(deps, opts.code);
        return p.then(function (session) { global.WBUI.attach(session); });
      });
    }).catch(function (e) {
      app.innerHTML = '<div class="screen"><div class="card"><h2>연결 실패</h2><p>' + esc(e.message || e) +
        '</p><button class="big-btn primary" onclick="location.reload()">다시</button></div></div>';
    });
  }

  /* 퀴즈타운에 로그인한 학생의 진짜 이름 찾기.
   * 퀴즈타운은 users 문서에 nickname 을 두고, 익명 로그인 계정과 authUid 로 연결해 둔다.
   * 보안 규칙이 "내 authUid 로 내 문서 찾기"를 허용하므로 아래 조회가 가능하다.
   * 퀴즈타운에 로그인하지 않고 바로 들어온 경우엔 찾을 수 없어 임시 이름을 쓴다.
   */
  function lookupNickname(db, user) {
    return db.collection('users').where('authUid', '==', user.uid).limit(1).get()
      .then(function (snap) {
        if (!snap.empty) {
          const d = snap.docs[0].data() || {};
          const nick = d.nickname || d.name || d.displayNickname;
          if (nick) return String(nick);
        }
        return fallbackName(user);
      })
      .catch(function () { return fallbackName(user); });
  }

  function fallbackName(user) {
    if (user.displayName) return user.displayName;
    return '친구' + String(user.uid).slice(-4);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderHome);
  else renderHome();
})(typeof window !== 'undefined' ? window : this);
