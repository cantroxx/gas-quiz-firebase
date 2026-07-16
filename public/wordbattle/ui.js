/* ui.js — 화면 그리기 + 조작.
 *  ★공용 보드★: 바닥 낱말과 내 손패의 타일을 '집어서(탭) → 놓기(탭)'로 자유롭게 옮겨
 *  판을 재구성한 뒤 [확인]으로 턴을 확정한다. (진짜 루미큐브식)
 *  window.WBUI.attach(session).
 */
(function (global) {
  'use strict';

  const H = global.WBHangul;
  const E = global.WBEngine;
  const W = global.WBWords;

  const app = function () { return document.getElementById('app'); };
  const esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function attach(session) {
    // 워크스페이스(내 차례 편집판): 바닥 낱말들 + 아직 안 낸 내 손패(tray)
    let ws = null;        // { words:[[tileRef,...],...], tray:[tileRef,...], held:id|null }
    let wsKey = '';       // 바닥·손패가 바뀌면 워크스페이스 새로 초기화하기 위한 키
    let notice = '';
    let proposable = null;   // 사전에 없어 '제안'할 수 있는 낱말 (없으면 null)
    let hintText = '';       // 힌트로 추천된 낱말 (없으면 '')
    let ticker = null;       // 타이머 인터벌
    let lastTimeoutTry = 0;  // 시간초과 처리 재시도 간격 조절
    let recorded = false;    // 랭크 점수 서버 기록을 한 번만 하기 위한 가드
    let recordMsg = '랭크 점수를 기록하는 중…';

    function tileRef(t, origin) { return { id: t.id, jamo: t.jamo, kind: t.kind, origin: origin }; }

    function sigOf(room, hand) {
      const b = room.board.map(function (w) { return w.tiles.map(function (t) { return t.id; }).join(','); }).join('|');
      const h = hand.map(function (t) { return t.id; }).join(',');
      return session.viewerId() + '#' + room.turn + '#' + room.status + '#' + b + '##' + h;
    }

    // 워크스페이스: words 배열의 ★맨 끝 낱말★이 항상 "만드는 중"(활성)이다.
    function initWs(room, hand) {
      ws = {
        words: room.board.map(function (w) { return w.tiles.map(function (t) { return tileRef(t, 'board'); }); }),
        tray: hand.map(function (t) { return tileRef(t, 'hand'); })
      };
      ws.words.push([]); // 새로 만들 낱말(활성) 자리
    }

    // 비어 있는 낱말 제거(단, 맨 끝 활성 자리는 남긴다)
    function pruneEmpty() {
      const last = ws.words.length - 1;
      ws.words = ws.words.filter(function (w, i) { return w.length > 0 || i === last; });
      if (!ws.words.length) ws.words = [[]];
    }

    function locationOf(id) {
      if (ws.tray.some(function (t) { return t.id === id; })) return { zone: 'tray' };
      for (let wi = 0; wi < ws.words.length; wi++) {
        if (ws.words[wi].some(function (t) { return t.id === id; })) return { zone: 'word', wi: wi };
      }
      return null;
    }
    function findAndRemove(id) {
      let i = ws.tray.findIndex(function (t) { return t.id === id; });
      if (i >= 0) return ws.tray.splice(i, 1)[0];
      for (const w of ws.words) { const j = w.findIndex(function (t) { return t.id === id; }); if (j >= 0) return w.splice(j, 1)[0]; }
      return null;
    }

    // 타일 하나를 탭했을 때: 손패/바닥의 타일 → '만드는 중'으로, 만드는 중의 타일 → 손패로 되돌리기
    function onTileTap(id) {
      const loc = locationOf(id);
      if (!loc) return;
      const last = ws.words.length - 1;
      if (loc.zone === 'word' && loc.wi === last) {
        // 만드는 중 낱말의 타일을 뺀다
        const t = findAndRemove(id);
        if (t.origin === 'hand') ws.tray.push(t);                 // 손패로 되돌림
        else ws.words.splice(ws.words.length - 1, 0, [t]);        // 바닥 타일은 손패로 못 감 → 따로 떼어둠
      } else {
        // 손패 타일 또는 다른(바닥) 낱말의 타일을 '만드는 중'으로 이어 붙인다
        const t = findAndRemove(id);
        if (t) ws.words[ws.words.length - 1].push(t);
      }
      notice = ''; render();
    }

    function render() {
      const room = session.getRoom();
      if (!room) { app().innerHTML = '<div class="loading">방 정보를 기다리는 중…</div>'; return; }
      global.WBRoom.syncApproved(room);   // 이 방에서 동의된 낱말을 판정기에 반영
      if (room.status === 'waiting') return renderWaiting(room);

      const hand = session.currentHand();
      const key = sigOf(room, hand);
      if (key !== wsKey) { initWs(room, hand); wsKey = key; notice = ''; hintText = ''; }  // 판이 바뀌면 새로 초기화

      if (room.status === 'finished') return renderFinished(room);
      return renderGame(room);
    }

    // ── 대기 화면 ──
    function renderWaiting(room) {
      const isHost = session.mode === 'local' || session.viewerId() === room.hostId;
      const players = room.players.map(function (p) {
        return '<li>' + esc(p.name) + (p.id === room.hostId ? ' <span class="host-badge">방장</span>' : '') + '</li>';
      }).join('');
      app().innerHTML =
        '<div class="screen"><div class="card">' +
          '<h1 class="title">' + esc(room.title || '낱말 대전') + '</h1>' +
          '<div class="room-code">방 번호 <b>' + esc(room.code) + '</b></div>' +
          '<h3>참가한 친구 (' + room.players.length + '/4)</h3>' +
          '<ul class="player-list">' + players + '</ul>' +
          (session.mode === 'online' ? '<p class="hint">친구들에게 <b>방 번호</b>를 알려주세요.</p>' : '') +
          (isHost ? '<button class="big-btn primary" id="btn-start">게임 시작 ▶</button>'
                  : '<p class="hint">방장이 시작하기를 기다리는 중…</p>') +
        '</div></div>';
      const b = document.getElementById('btn-start');
      if (b) b.onclick = function () { session.start().then(function (r) { if (!r.ok) alert(r.error); }); };
    }

    // ── 승리·결과 화면 (순위·점수·랭크) ──
    function renderFinished(room) {
      stopTicker();
      const winner = room.players.find(function (p) { return p.id === room.winner; });
      const rows = room.results || [];
      const medal = ['🥇', '🥈', '🥉', '4위'];
      const myId = session.viewerId();
      const rankHtml = rows.map(function (r) {
        const me = r.id === myId ? ' me' : '';
        return '<div class="rank-row' + me + '">' +
                 '<span class="rk-medal">' + (medal[r.rank - 1] || (r.rank + '위')) + '</span>' +
                 '<span class="rk-name">' + esc(r.name) + (r.surrendered ? ' <small>(항복)</small>' : '') + '</span>' +
                 '<span class="rk-detail">낱말 ' + r.words + '·자모 ' + r.jamo + (r.hints ? '·힌트 ' + r.hints : '') + '</span>' +
                 '<span class="rk-pts">+' + r.rankPoints + '점</span>' +
               '</div>';
      }).join('');

      app().innerHTML =
        '<div class="screen"><div class="card win-card">' +
          '<div class="win-emoji">🎉</div>' +
          '<h1 class="title">' + esc(winner ? winner.name : '') + ' 승리!</h1>' +
          '<div class="rank-table">' + (rankHtml || '<p>결과 집계 중…</p>') + '</div>' +
          '<div class="rank-note">' + recordMsg + '</div>' +
          '<button class="big-btn primary" onclick="location.reload()">처음으로</button>' +
        '</div></div>';

      // 랭크 점수 서버 기록 (한 번만). 결과 문구는 상태에 저장해 재렌더에도 유지.
      if (!recorded) {
        recorded = true;
        session.recordRank().then(function (r) {
          if (r && r.ok && !r.local) recordMsg = '✅ 내 랭크 점수 <b>+' + r.points + '</b> 기록됐어요!';
          else if (r && r.local) recordMsg = '연습 모드라 랭크 점수는 기록되지 않아요.';
          else recordMsg = '';
          render();
        });
      }
    }

    // ── 게임 화면(공용 보드) ──
    function tileBtn(t) {
      const orig = t.origin === 'board' ? ' onboard' : '';
      return '<button class="tile ' + (t.kind === 'C' ? 'cons' : 'vowel') + orig + '" data-pick="' + t.id + '">' + esc(t.jamo) + '</button>';
    }

    function renderGame(room) {
      const myTurn = session.isMyTurn();
      const turnName = (room.players.find(function (p) { return p.id === room.turn; }) || {}).name || '';
      pruneEmpty();

      const playersHtml = room.players.map(function (p) {
        return '<div class="' + (p.id === room.turn ? 'pchip turn' : 'pchip') + '">' + esc(p.name) +
               '<span class="pcount">' + p.handCount + '장</span></div>';
      }).join('');

      // 공용 낱말판: 맨 끝 낱말이 "만드는 중"(활성)
      const lastIdx = ws.words.length - 1;
      const wordsHtml = ws.words.map(function (w, wi) {
        const isActive = wi === lastIdx;
        const jamos = w.map(function (t) { return t.jamo; });
        // 미리보기 = 확인 때와 똑같은 판정 (조합 + 사전 + 이 방에서 동의된 낱말)
        let state, preview;
        if (!jamos.length) {
          state = '';
          preview = isActive
            ? (myTurn ? '<span class="muted">손패를 탭하면 여기에 →</span>' : '<span class="muted">⏳ ' + esc(turnName) + '님이 두는 중…</span>')
            : '';
        } else {
          const c = H.compose(jamos);
          if (!c.ok) { state = ' bad'; preview = '<span class="bad">✗ 아직 낱말이 아니에요</span>'; }
          else {
            const v = W.isValidWord(c.text);
            if (v.ok) { state = ' good'; preview = '<span class="ok">' + esc(c.text) + ' ✓</span>'; }
            else { state = ' warn'; preview = '<span class="warn">' + esc(c.text) + ' — ' + esc(v.reason) + '</span>'; }
          }
        }
        const tiles = w.map(function (t) { return tileBtn(t); }).join('');
        const cls = 'wsword' + state + (isActive ? ' building' : '');
        return '<div class="' + cls + '">' +
                 (isActive ? '<div class="ws-label">✏️ 만드는 중</div>' : '') +
                 '<div class="wsw-tiles">' + tiles + '</div>' +
                 '<div class="wsw-preview">' + preview + '</div>' +
               '</div>';
      }).join('');

      const trayHtml = ws.tray.length
        ? ws.tray.map(function (t) { return tileBtn(t); }).join('')
        : '<span class="muted">손패 없음</span>';

      const heldHint = myTurn
        ? '<div class="held-hint muted">손패 타일을 탭하면 <b>만드는 중</b> 칸에 이어져요. 낱말이 되면 초록색! 다 만들면 <b>확인</b>.</div>'
        : '<div class="held-hint waiting">⏳ <b>' + esc(turnName) + '</b>님이 두는 중이에요… 잠깐만 기다려요.</div>';

      // 사전엔 없지만 제안해볼 수 있는 낱말(= 지금 만드는 중인 낱말)이 있으면 [제안] 버튼을 띄운다
      proposable = null;
      if (myTurn && !room.proposal) {
        const act = ws.words[lastIdx] || [];
        if (act.length) {
          const c = H.compose(act.map(function (t) { return t.jamo; }));
          if (c.ok) { const v = W.isValidWord(c.text); if (!v.ok && v.canPropose) proposable = c.text; }
        }
      }

      // 제안 진행 중 배너
      const pr = room.proposal;
      let proposalHtml = '';
      if (pr) {
        const others = room.players.filter(function (x) { return x.id !== pr.byId; });
        const mine = pr.byId === session.viewerId();
        const iAgreed = pr.agrees.indexOf(session.viewerId()) >= 0;
        proposalHtml =
          '<div class="proposal">' +
            '<div class="pp-word">💬 <b>' + esc(pr.byName) + '</b>님의 제안: <span class="pp-text">' + esc(pr.text) + '</span></div>' +
            '<div class="pp-count">동의 ' + pr.agrees.length + ' / ' + others.length + '</div>' +
            (mine
              ? '<button class="mini-btn" id="btn-cancel-prop">제안 취소</button>'
              : (iAgreed
                  ? '<span class="pp-done">✅ 동의했어요</span>'
                  : '<button class="big-btn primary pp-btn" id="btn-agree">이 낱말 인정! 👍</button>')) +
          '</div>';
      }

      const paused = !!room.paused;
      const canAct = myTurn && !paused;

      // 일시정지 제안 배너
      let pauseHtml = '';
      if (room.pauseReq) {
        const rq = room.pauseReq;
        const mineP = rq.byId === session.viewerId();
        const need = room.players.filter(function (x) { return !x.out && x.id !== rq.byId; }).length;
        pauseHtml = '<div class="proposal">⏸ <b>' + esc(rq.byName) + '</b>님이 일시정지를 제안했어요. <span class="pp-count">동의 ' + rq.agrees.length + '/' + need + '</span>' +
          (mineP ? '<button class="mini-btn" id="btn-cancel-pause">취소</button>'
                 : '<button class="big-btn primary pp-btn" id="btn-agree-pause">일시정지 동의 👍</button>') +
          '</div>';
      }
      // 일시정지 중 배너
      let pausedHtml = '';
      if (paused) {
        pausedHtml = '<div class="paused-banner">⏸ <b>일시정지 중</b> — 아무나 이어서 시작할 수 있어요' +
          '<button class="big-btn primary" id="btn-resume">▶ 이어서 하기</button></div>';
      }

      app().innerHTML =
        '<div class="game' + (paused ? ' is-paused' : '') + '">' +
          '<div class="topbar">' +
            '<div class="turn-banner ' + (myTurn && session.mode === 'online' ? 'mine' : '') + '">' +
              (session.mode === 'local' ? '👉 <b>' + esc(turnName) + '</b> 차례'
                : (myTurn ? '👉 <b>내 차례!</b>' : '⏳ <b>' + esc(turnName) + '</b> 차례')) +
            '</div>' +
            '<div class="topright">' +
              (room.status === 'playing' && !paused ? '<div class="timer' + (myTurn ? ' mine' : '') + '" id="timer">2:00</div>' : '') +
              '<button class="help-btn" id="btn-howto-game" title="게임 방법">📖</button>' +
              '<div class="pool">봉지 ' + room.poolC + '·' + room.poolV + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="players-row">' + playersHtml + '</div>' +
          pausedHtml +

          '<div class="board">' +
            '<div class="board-head"><h3>공용 낱말판</h3>' +
              '<button class="mini-btn" id="btn-newword" ' + (myTurn ? '' : 'disabled') + '>＋ 낱말 하나 더</button></div>' +
            '<div class="wsboard">' + wordsHtml + '</div>' +
            heldHint +
          '</div>' +

          proposalHtml +
          pauseHtml +
          (notice ? '<div class="notice">' + esc(notice) + '</div>' : '') +
          (hintText ? '<div class="hint-box">💡 이런 낱말은 어때요? <b>' + esc(hintText) + '</b> <span class="hint-cost">(힌트 -3점)</span></div>' : '') +

          (proposable
            ? '<button class="big-btn propose-btn" id="btn-propose">💬 "' + esc(proposable) + '" 을(를) 친구들에게 제안하기</button>'
            : '') +

          '<div class="hand"><h3>내 손패 (탭하면 위 "만드는 중"으로)</h3>' +
            '<div class="hand-tiles" id="tray">' + trayHtml + '</div></div>' +

          '<div class="actions">' +
            '<button class="big-btn primary" id="btn-commit" ' + (canAct ? '' : 'disabled') + '>확인 ✅</button>' +
            '<button class="big-btn ghost" id="btn-reset" ' + (canAct ? '' : 'disabled') + '>다시 ↺</button>' +
            '<button class="big-btn ghost" id="btn-draw-c" ' + (canAct ? '' : 'disabled') + '>자음 뽑기</button>' +
            '<button class="big-btn ghost" id="btn-draw-v" ' + (canAct ? '' : 'disabled') + '>모음 뽑기</button>' +
          '</div>' +
          '<div class="tools">' +
            '<button class="tool-btn" id="btn-hint" ' + (canAct ? '' : 'disabled') + '>💡 힌트</button>' +
            (paused ? '' : '<button class="tool-btn" id="btn-pause" ' + (room.pauseReq ? 'disabled' : '') + '>⏸ 일시정지</button>') +
            '<button class="tool-btn" id="btn-leave">🏠 나가기</button>' +
            '<button class="tool-btn danger" id="btn-surrender">🏳️ 항복</button>' +
          '</div>' +
          '<div class="log">' + room.log.slice(-4).map(function (l) { return '<div>' + esc(l) + '</div>'; }).join('') + '</div>' +
        '</div>';

      wireGame();
    }

    function wireGame() {
      const myTurn = session.isMyTurn();
      // 모든 타일: 탭 한 번으로 '만드는 중'에 붙이거나(손패·바닥) 빼기(만드는 중)
      document.querySelectorAll('[data-pick]').forEach(function (btn) {
        btn.onclick = function () { if (myTurn) onTileTap(btn.getAttribute('data-pick')); };
      });
      // 낱말 하나 더 만들기: 지금 만드는 낱말을 굳히고 새 빈 칸을 연다
      const nw = document.getElementById('btn-newword');
      if (nw) nw.onclick = function () {
        if (ws.words[ws.words.length - 1].length > 0) ws.words.push([]);
        notice = ''; render();
      };
      // 확인(턴 확정)
      const commit = document.getElementById('btn-commit');
      if (commit) commit.onclick = function () {
        pruneEmpty();
        const words = ws.words.filter(function (w) { return w.length > 0; }).map(function (w) { return w.map(function (t) { return t.id; }); });
        session.commit(words).then(function (r) {
          notice = r.ok ? '' : (r.error + (r.results ? ' — 빨간 낱말을 고쳐 주세요.' : ''));
          render();
        });
      };
      const reset = document.getElementById('btn-reset');
      if (reset) reset.onclick = function () { initWs(session.getRoom(), session.currentHand()); notice = ''; render(); };
      const dc = document.getElementById('btn-draw-c'); if (dc) dc.onclick = function () { doDraw('C'); };
      const dv = document.getElementById('btn-draw-v'); if (dv) dv.onclick = function () { doDraw('V'); };
      const hb = document.getElementById('btn-howto-game'); if (hb) hb.onclick = function () { if (global.WBTutorial) global.WBTutorial.open(); };

      // 제안 / 동의 / 제안 취소
      const pb = document.getElementById('btn-propose');
      if (pb) pb.onclick = function () {
        if (!proposable) return;
        session.propose(proposable).then(function (r) { notice = r.ok ? '' : r.error; render(); });
      };
      const ab = document.getElementById('btn-agree');
      if (ab) ab.onclick = function () {
        session.agree().then(function (r) { notice = r.ok ? '' : r.error; render(); });
      };
      const cb = document.getElementById('btn-cancel-prop');
      if (cb) cb.onclick = function () {
        session.cancelProposal().then(function (r) { notice = r.ok ? '' : r.error; render(); });
      };

      // 힌트: 내 손패 + 바닥 자모로 만들 수 있는 낱말 추천 (-3점)
      const hbtn = document.getElementById('btn-hint');
      if (hbtn) hbtn.onclick = function () {
        const jamos = session.currentHand().map(function (t) { return t.jamo; });
        (session.getRoom().board || []).forEach(function (w) { w.tiles.forEach(function (t) { jamos.push(t.jamo); }); });
        const s = W.suggest(jamos);
        if (!s) { notice = '지금 자모로는 추천할 낱말을 못 찾았어요. 타일을 뽑아보세요.'; render(); return; }
        session.useHint().then(function () { hintText = s; notice = ''; render(); });
      };
      // 일시정지 / 동의 / 취소 / 이어서
      const pz = document.getElementById('btn-pause');
      if (pz) pz.onclick = function () { session.requestPause().then(function (r) { notice = r.ok ? '' : r.error; render(); }); };
      const apz = document.getElementById('btn-agree-pause');
      if (apz) apz.onclick = function () { session.agreePause().then(function (r) { notice = r.ok ? '' : r.error; render(); }); };
      const cpz = document.getElementById('btn-cancel-pause');
      if (cpz) cpz.onclick = function () { session.cancelPause().then(function () { render(); }); };
      const rz = document.getElementById('btn-resume');
      if (rz) rz.onclick = function () { session.resume().then(function () { render(); }); };
      // 나가기 / 항복
      const lv = document.getElementById('btn-leave');
      if (lv) lv.onclick = function () {
        if (!confirm('게임에서 나갈까요? 진행 중이면 랭크 점수가 조금 깎일 수 있어요.')) return;
        stopTicker();
        session.leave(false).then(function () { location.reload(); });
      };
      const sr = document.getElementById('btn-surrender');
      if (sr) sr.onclick = function () {
        if (!confirm('항복할까요? 랭크 점수가 깎여요.')) return;
        session.leave(true).then(function (r) {
          // 게임이 끝났으면 결과 화면이 떠서 랭크가 기록됨(홈으로 튕기지 않음)
          if (r && r.finished) { render(); return; }
          if (r && r.goHome) { stopTicker(); location.reload(); }
        });
      };
    }

    function doDraw(kind) {
      session.draw(kind).then(function (r) { notice = r.ok ? '' : r.error; render(); });
    }

    function stopTicker() { if (ticker) { clearInterval(ticker); ticker = null; } }
    function tick() {
      const room = session.getRoom();
      if (!room || room.status !== 'playing') return;
      // 일시정지 자동 해제 (50분 초과)
      if (room.paused) {
        if (room.pauseEndsAt && Date.now() > room.pauseEndsAt) session.resume().then(function () { render(); });
        return;
      }
      const el = document.getElementById('timer');
      const remain = (room.turnEndsAt || 0) - Date.now();
      if (el) {
        const s = Math.max(0, Math.ceil(remain / 1000));
        el.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        el.classList.toggle('urgent', s <= 15);
      }
      // 시간 초과 → 현재 차례인 사람(나)의 화면에서 자동 처리.
      // 실패해도 3초마다 다시 시도(가드가 영구히 막지 않도록).
      if (remain <= -800 && session.isMyTurn() && Date.now() - lastTimeoutTry > 3000) {
        lastTimeoutTry = Date.now();
        session.timeout().then(function (r) { render(); });
      }
    }

    session.onChange(render);
    render();
    ticker = setInterval(tick, 500);
    try { if (global.WBTutorial) global.WBTutorial.maybeAuto(); } catch (e) {}  // 처음이면 방법 자동 안내
  }

  global.WBUI = { attach: attach };
})(typeof window !== 'undefined' ? window : this);
