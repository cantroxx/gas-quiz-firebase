/* net.js — 방 통신 어댑터. 두 가지 모드가 같은 인터페이스를 제공한다.
 *   LocalNet  : 백엔드 없이 한 화면에서 번갈아 하는 '연습 모드' (동작 검증·시연용)
 *   OnlineNet : Firestore 실시간 동기화 '온라인 대전' (퀴즈타운 로그인 그대로 사용)
 *
 *  공통 세션 인터페이스:
 *    session.mode            'local' | 'online'
 *    session.getRoom()       공개 방 상태(room)
 *    session.viewerId()      지금 화면에서 조작 중인 플레이어 id
 *    session.currentHand()   그 플레이어가 볼 손패 [tile,...]
 *    session.isMyTurn()      viewer 차례인가
 *    session.onChange(cb)    상태가 바뀔 때 cb() 호출
 *    session.start() / lay(groups) / draw(kind) / leave()
 *  window.WBNet 로 노출.
 */
(function (global) {
  'use strict';

  const R = global.WBRoom;

  // ── 로컬 연습 모드 (pass-and-play) ─────────────────────────
  function LocalNet(opts) {
    const listeners = [];
    let game = R.newGame(genCode(), { id: 'p1', name: opts.hostName || '1번' }, opts.title);
    // 연습 모드는 한 화면에서 여러 명이 번갈아 하므로, 시작 시 인원을 미리 채운다.
    const seatNames = opts.seatNames || ['1번', '2번'];
    seatNames.slice(1).forEach(function (nm, i) {
      R.join(game, { id: 'p' + (i + 2), name: nm });
    });

    function notify() { listeners.forEach(function (cb) { cb(); }); }
    function actor() {
      // 대기 중엔 방장, 게임 중엔 현재 차례 플레이어가 조작 주체
      return game.room.status === 'playing' ? game.room.turn : game.room.hostId;
    }

    return {
      mode: 'local',
      getRoom: function () { return game.room; },
      viewerId: function () { return actor(); },
      currentHand: function () { return game.hands[actor()] || []; },
      isMyTurn: function () { return game.room.status === 'playing'; },
      onChange: function (cb) { listeners.push(cb); },
      start: function () { const r = R.start(game, { id: game.room.hostId }); notify(); return Promise.resolve(r); },
      commit: function (words) { const r = R.commitTurn(game, { id: actor(), name: nameOf(actor()) }, { words: words }); if (r.ok) notify(); return Promise.resolve(r); },
      draw: function (kind) { const r = R.draw(game, { id: actor(), name: nameOf(actor()) }, { kind: kind }); if (r.ok) notify(); return Promise.resolve(r); },
      propose: function (text) { const r = R.propose(game, { id: actor(), name: nameOf(actor()) }, { text: text }); notify(); return Promise.resolve(r); },
      // 연습 모드는 한 화면이라, 제안하면 '다른 사람'이 동의해 주는 상황을 그대로 눌러볼 수 있게 한다
      agree: function (voterId) {
        const pr = game.room.proposal; if (!pr) return Promise.resolve({ ok: false, error: '제안이 없어요.' });
        const other = game.room.players.find(function (x) { return x.id !== pr.byId; });
        const id = voterId || (other && other.id);
        const r = R.agree(game, { id: id, name: nameOf(id) }); notify(); return Promise.resolve(r);
      },
      cancelProposal: function () { const r = R.cancelProposal(game, { id: actor() }); notify(); return Promise.resolve(r); },
      timeout: function () { const r = R.timeout(game, { id: actor(), name: nameOf(actor()) }); if (r.ok) notify(); return Promise.resolve(r); },
      requestPause: function () { const r = R.requestPause(game, { id: actor(), name: nameOf(actor()) }); notify(); return Promise.resolve(r); },
      // 연습 모드: 일시정지에 '다른 사람'이 동의하는 상황을 눌러볼 수 있게 함
      agreePause: function () {
        const rq = game.room.pauseReq; if (!rq) return Promise.resolve({ ok: false, error: '요청이 없어요.' });
        const other = game.room.players.find(function (x) { return x.id !== rq.byId && !x.out; });
        const r = R.agreePause(game, { id: other ? other.id : rq.byId }); notify(); return Promise.resolve(r);
      },
      cancelPause: function () { const r = R.cancelPause(game, { id: actor() }); notify(); return Promise.resolve(r); },
      resume: function () { const r = R.resume(game, { id: actor(), name: nameOf(actor()) }); notify(); return Promise.resolve(r); },
      useHint: function () { const r = R.useHint(game, { id: actor() }); notify(); return Promise.resolve(r); },
      recordRank: function () {
        const res = game.room.results || [];
        const mine = res.find(function (r) { return r.id === actor(); });
        return Promise.resolve({ ok: true, local: true, points: mine ? mine.rankPoints : 0 });
      },
      leave: function (surrender) {
        // 연습 모드에선 '나가기'는 홈으로 돌아가는 것과 같음(항복 로그만 남김)
        if (surrender) {
          R.leave(game, { id: actor(), name: nameOf(actor()) }, { surrender: true }); notify();
          return Promise.resolve({ ok: true, finished: game.room.status === 'finished', goHome: false });
        }
        return Promise.resolve({ ok: true, goHome: true });
      }
    };

    function nameOf(id) { const p = R.findPlayer(game.room, id); return p ? p.name : id; }
  }

  // ── 온라인 모드 (Firestore) ───────────────────────────────
  // 문서 구조:
  //   wordbattleRooms/{code}                → 공개 방 상태(room)
  //   wordbattleRooms/{code}/secret/deck    → 남은 봉지(bag)  ※규칙 read:false — 서버 함수만 읽음
  //   wordbattleRooms/{code}/hands/{uid}    → 각자 손패 (본인만 읽기)
  // 뽑기·시간초과는 봉지를 읽어야 해서 서버 함수(wbDraw)가 처리한다(공정성: 봉지 훔쳐보기 방지).
  const FN_REGION = 'asia-northeast3';
  function callWbDraw(data) {
    try {
      const fns = global.firebase.app().functions(FN_REGION);
      return fns.httpsCallable('wbDraw')(data)
        .then(function (res) { return (res && res.data) || { ok: true }; })
        .catch(function (e) { return { ok: false, error: e.message || '뽑기에 실패했어요.' }; });
    } catch (e) {
      return Promise.resolve({ ok: false, error: '뽑기 서버에 연결하지 못했어요. 새로고침 해보세요.' });
    }
  }

  function OnlineNet(opts) {
    const db = opts.db;
    const FieldValue = opts.FieldValue;
    const me = opts.me;                 // { id(uid), name }
    const code = opts.code;
    const roomRef = db.collection('wordbattleRooms').doc(code);
    const deckRef = roomRef.collection('secret').doc('deck');
    const handRef = roomRef.collection('hands').doc(me.id);

    let room = null;
    let myHand = [];
    const listeners = [];
    function notify() { listeners.forEach(function (cb) { cb(); }); }

    // 실시간 구독: 방 문서 + 내 손패 문서
    const unsubRoom = roomRef.onSnapshot(function (snap) {
      room = snap.exists ? snap.data() : null;
      notify();
    });
    const unsubHand = handRef.onSnapshot(function (snap) {
      myHand = snap.exists ? (snap.data().tiles || []) : [];
      notify();
    });

    // 트랜잭션으로 한 액션을 안전하게 적용 (동시 접근 충돌 방지)
    function runAction(applyFn, needDeck) {
      return db.runTransaction(function (tx) {
        return tx.get(roomRef).then(function (roomSnap) {
          if (!roomSnap.exists) throw new Error('방이 없어졌어요.');
          const rdata = roomSnap.data();
          const reads = [tx.get(handRef)];
          if (needDeck) reads.push(tx.get(deckRef));
          return Promise.all(reads).then(function (snaps) {
            const handSnap = snaps[0];
            const deckSnap = snaps[1];
            const game = {
              room: rdata,
              hands: {},
              bag: (deckSnap && deckSnap.exists) ? deckSnap.data().bag : { consonants: [], vowels: [] }
            };
            game.hands[me.id] = handSnap.exists ? (handSnap.data().tiles || []) : [];
            const beforePoolC = rdata.poolC, beforePoolV = rdata.poolV;
            const res = applyFn(game);
            if (!res.ok) throw Object.assign(new Error(res.error || '실패'), { appResult: res });
            // 봉지를 안 읽는 액션(낱말 내기)에선 봉지 개수를 원래대로 보존 (0으로 덮이는 것 방지)
            if (!needDeck) { game.room.poolC = beforePoolC; game.room.poolV = beforePoolV; }
            // 변경분 기록
            tx.set(roomRef, game.room);
            tx.set(handRef, { tiles: game.hands[me.id] });
            if (needDeck) tx.set(deckRef, { bag: game.bag });
            return res;
          });
        });
      }).catch(function (e) {
        return e.appResult || { ok: false, error: e.message };
      });
    }

    return {
      mode: 'online',
      code: code,   // 방 번호 (튕김 복구용으로 기기에 저장)
      getRoom: function () { return room; },
      viewerId: function () { return me.id; },
      currentHand: function () { return myHand; },
      isMyTurn: function () { return room && room.status === 'playing' && room.turn === me.id; },
      onChange: function (cb) { listeners.push(cb); },
      start: function () {
        // 방장이 봉지를 만들어 모두에게 나눠주고 각자 hands/{uid} 에 기록
        return db.runTransaction(function (tx) {
          return tx.get(roomRef).then(function (snap) {
            const game = { room: snap.data(), hands: {}, bag: { consonants: [], vowels: [] } };
            const res = R.start(game, { id: me.id });
            if (!res.ok) throw Object.assign(new Error(res.error), { appResult: res });
            tx.set(roomRef, game.room);
            tx.set(deckRef, { bag: game.bag });
            game.room.players.forEach(function (p) {
              tx.set(roomRef.collection('hands').doc(p.id), { tiles: game.hands[p.id] });
            });
            return res;
          });
        }).catch(function (e) { return e.appResult || { ok: false, error: e.message }; });
      },
      commit: function (words) { return runAction(function (g) { return R.commitTurn(g, me, { words: words }); }, false); },
      draw: function (kind) { return callWbDraw({ code: code, action: 'draw', kind: kind }); },
      propose: function (text) { return runAction(function (g) { return R.propose(g, me, { text: text }); }, false); },
      agree: function () { return runAction(function (g) { return R.agree(g, me); }, false); },
      cancelProposal: function () { return runAction(function (g) { return R.cancelProposal(g, me); }, false); },
      timeout: function () { return callWbDraw({ code: code, action: 'timeout' }); },
      requestPause: function () { return runAction(function (g) { return R.requestPause(g, me); }, false); },
      agreePause: function () { return runAction(function (g) { return R.agreePause(g, me); }, false); },
      cancelPause: function () { return runAction(function (g) { return R.cancelPause(g, me); }, false); },
      resume: function () { return runAction(function (g) { return R.resume(g, me); }, false); },
      useHint: function () { return runAction(function (g) { return R.useHint(g, me); }, false); },
      // 게임 끝: 내 랭크 점수를 서버에 기록 (각자 자기 것만 기록)
      recordRank: function () {
        if (!room || room.status !== 'finished' || !room.results) return Promise.resolve({ ok: false });
        const mine = room.results.find(function (r) { return r.id === me.id; });
        if (!mine) return Promise.resolve({ ok: false });
        const ref = db.collection('wordbattleRanking').doc(me.id);
        const inc = FieldValue.increment;
        return ref.set({
          name: me.name,
          total: inc(mine.rankPoints),
          games: inc(1),
          wins: inc(mine.win ? 1 : 0),
          updatedAt: Date.now()
        }, { merge: true })
          .then(function () { return { ok: true, points: mine.rankPoints }; })
          .catch(function (e) { return { ok: false, error: e.message }; });
      },
      leave: function (surrender) {
        return runAction(function (g) { return R.leave(g, me, { surrender: !!surrender }); }, false)
          .then(function (r) {
            // 항복으로 게임이 끝났으면 구독 유지 → 결과 화면이 뜨고 랭크가 기록됨
            if (surrender && r && r.finished) return { ok: true, finished: true, goHome: false };
            if (unsubRoom) unsubRoom(); if (unsubHand) unsubHand();
            return { ok: true, goHome: true };
          });
      }
    };
  }

  // 온라인: 방 만들기 / 참가하기 (세션 생성 전 단계)
  function createOnlineRoom(deps, title) {
    const code = genCode();
    const roomRef = deps.db.collection('wordbattleRooms').doc(code);
    const game = R.newGame(code, deps.me, title);
    return roomRef.set(game.room).then(function () {
      return OnlineNet({ db: deps.db, FieldValue: deps.FieldValue, me: deps.me, code: code });
    });
  }

  // 대기 중인 방 목록 (제목 클릭 입장용). 최근 40분 이내 방만, 최신순.
  function listWaitingRooms(deps) {
    return deps.db.collection('wordbattleRooms')
      .where('status', '==', 'waiting')
      .get().then(function (snap) {
        const cutoff = Date.now() - 40 * 60 * 1000;
        const rooms = [];
        snap.forEach(function (d) {
          const r = d.data();
          if ((r.createdAt || 0) >= cutoff && (r.players || []).length < 4) {
            rooms.push({ code: r.code, title: r.title || (r.code + '번 방'), count: (r.players || []).length, createdAt: r.createdAt || 0 });
          }
        });
        rooms.sort(function (a, b) { return b.createdAt - a.createdAt; });
        return rooms;
      });
  }

  function joinOnlineRoom(deps, code) {
    const roomRef = deps.db.collection('wordbattleRooms').doc(code);
    return deps.db.runTransaction(function (tx) {
      return tx.get(roomRef).then(function (snap) {
        if (!snap.exists) throw new Error('그런 방 번호가 없어요.');
        const game = { room: snap.data(), hands: {}, bag: null };
        const res = R.join(game, deps.me);
        if (!res.ok) throw new Error(res.error);
        tx.set(roomRef, game.room);
      });
    }).then(function () {
      return OnlineNet({ db: deps.db, FieldValue: deps.FieldValue, me: deps.me, code: code });
    });
  }

  // ── 봇 대전 모드 (혼자 vs AI, 랭크 기록) ───────────────────
  // 게임은 로컬(메모리)에서 돌고, 끝나면 사람의 랭크 점수만 서버에 기록한다.
  const BOT_ID = 'bot';
  const BOT_NAME = '또박이 봇';

  // 봇 손패로 만들 수 있는 사전 낱말 하나 → 타일 id 배열(낱말 순서). 없으면 null.
  function botFindWord(hand) {
    const W = global.WBWords, H = global.WBHangul;
    const jamos = hand.map(function (t) { return t.jamo; });
    const word = W.suggest(jamos);
    if (!word) return null;
    const need = H.decompose(word);
    if (!need) return null;
    const used = {}; const ids = [];
    for (const j of need) {
      const tile = hand.find(function (t) { return t.jamo === j && !used[t.id]; });
      if (!tile) return null;
      used[tile.id] = true; ids.push(tile.id);
    }
    return ids;
  }

  function BotNet(opts) {
    const listeners = [];
    const human = opts.me || { id: 'human', name: '나' };
    const db = opts.db, FieldValue = opts.FieldValue, canRecord = !!(db && FieldValue && opts.me);
    let game = R.newGame(genCode(), { id: human.id, name: human.name }, '봇과 대전');
    R.join(game, { id: BOT_ID, name: BOT_NAME });
    let scheduled = false;

    function notify() { listeners.forEach(function (cb) { cb(); }); maybeBot(); }

    // 봇 차례거나, 사람이 낸 제안/일시정지에 봇이 응해야 할 때 자동으로 처리
    function maybeBot() {
      if (scheduled) return;
      const room = game.room;
      const need =
        (room.status === 'playing' && !room.paused && room.turn === BOT_ID) ||
        (room.proposal && room.proposal.byId === human.id) ||
        (room.pauseReq && room.pauseReq.byId === human.id);
      if (!need) return;
      scheduled = true;
      setTimeout(function () { scheduled = false; botAct(); }, 900);
    }
    function botAct() {
      const room = game.room;
      if (room.proposal && room.proposal.byId === human.id) { R.agree(game, { id: BOT_ID }); notify(); return; }
      if (room.pauseReq && room.pauseReq.byId === human.id) { R.agreePause(game, { id: BOT_ID }); notify(); return; }
      if (!(room.status === 'playing' && !room.paused && room.turn === BOT_ID)) return;
      global.WBRoom.syncApproved(room);
      const hand = game.hands[BOT_ID] || [];
      const ids = botFindWord(hand);
      if (ids) {
        const boardGroups = room.board.map(function (w) { return w.tiles.map(function (t) { return t.id; }); });
        R.commitTurn(game, { id: BOT_ID, name: BOT_NAME }, { words: boardGroups.concat([ids]) });
      } else {
        const kind = game.bag.consonants.length >= game.bag.vowels.length ? 'C' : 'V';
        const r = R.draw(game, { id: BOT_ID, name: BOT_NAME }, { kind: kind });
        if (!r.ok) {  // 뽑을 것도 없고 낼 것도 없으면 무승부로 종료 (봉지 소진 안전장치)
          const rr = R.draw(game, { id: BOT_ID, name: BOT_NAME }, { kind: kind === 'C' ? 'V' : 'C' });
          if (!rr.ok) { room.status = 'finished'; room.winner = null; }
        }
      }
      notify();
    }

    function nameOf(id) { const p = R.findPlayer(game.room, id); return p ? p.name : id; }

    return {
      mode: 'bot',
      getRoom: function () { return game.room; },
      viewerId: function () { return human.id; },
      currentHand: function () { return game.hands[human.id] || []; },
      isMyTurn: function () { return game.room.status === 'playing' && !game.room.paused && game.room.turn === human.id; },
      onChange: function (cb) { listeners.push(cb); },
      start: function () { const r = R.start(game, { id: game.room.hostId }); notify(); return Promise.resolve(r); },
      commit: function (words) { const r = R.commitTurn(game, { id: human.id, name: human.name }, { words: words }); if (r.ok) notify(); return Promise.resolve(r); },
      draw: function (kind) { const r = R.draw(game, { id: human.id, name: human.name }, { kind: kind }); if (r.ok) notify(); return Promise.resolve(r); },
      propose: function (text) { const r = R.propose(game, { id: human.id, name: human.name }, { text: text }); notify(); return Promise.resolve(r); },
      agree: function () { const r = R.agree(game, { id: BOT_ID }); notify(); return Promise.resolve(r); },
      cancelProposal: function () { const r = R.cancelProposal(game, { id: human.id }); notify(); return Promise.resolve(r); },
      timeout: function () { const r = R.timeout(game, { id: human.id, name: human.name }); if (r.ok) notify(); return Promise.resolve(r); },
      requestPause: function () { const r = R.requestPause(game, { id: human.id, name: human.name }); notify(); return Promise.resolve(r); },
      agreePause: function () { const r = R.agreePause(game, { id: BOT_ID }); notify(); return Promise.resolve(r); },
      cancelPause: function () { const r = R.cancelPause(game, { id: human.id }); notify(); return Promise.resolve(r); },
      resume: function () { const r = R.resume(game, { id: human.id, name: human.name }); notify(); return Promise.resolve(r); },
      useHint: function () { const r = R.useHint(game, { id: human.id }); notify(); return Promise.resolve(r); },
      recordRank: function () {
        const mine = (game.room.results || []).find(function (r) { return r.id === human.id; });
        if (canRecord && mine) {
          const ref = db.collection('wordbattleRanking').doc(human.id);
          return ref.set({
            name: human.name, total: FieldValue.increment(mine.rankPoints),
            games: FieldValue.increment(1), wins: FieldValue.increment(mine.win ? 1 : 0), updatedAt: Date.now()
          }, { merge: true }).then(function () { return { ok: true, points: mine.rankPoints }; })
            .catch(function (e) { return { ok: false, error: e.message }; });
        }
        return Promise.resolve({ ok: true, local: true, points: mine ? mine.rankPoints : 0 });
      },
      leave: function (surrender) {
        if (surrender) {
          R.leave(game, { id: human.id, name: human.name }, { surrender: true }); notify();
          return Promise.resolve({ ok: true, finished: game.room.status === 'finished', goHome: false });
        }
        return Promise.resolve({ ok: true, goHome: true });
      }
    };
  }

  function genCode() {
    return String(Math.floor(1000 + Math.random() * 9000)); // 4자리 방 번호
  }

  global.WBNet = { LocalNet, OnlineNet, BotNet, createOnlineRoom, joinOnlineRoom, listWaitingRooms, genCode };
})(typeof window !== 'undefined' ? window : this);
