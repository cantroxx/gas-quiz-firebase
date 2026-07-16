/* room.js — 방 하나의 게임 상태를 바꾸는 규칙 처리기(reducer).
 *  ★공용 보드(루미큐브식)★: 바닥의 모든 타일은 공용. 내 차례에 자유롭게 재배치하고,
 *  턴을 끝낼 때 (1) 모든 낱말이 유효, (2) 내 손패 1개 이상 사용, (3) 바닥 타일이 하나도
 *  사라지지 않음 을 만족하면 확정된다.
 *
 *  game 구조:
 *    room: { code, title, createdAt, hostId, status, approvedWords, proposal,
 *            players:[{id,name,handCount,laid,out,surrendered,hints}], turn, turnEndsAt,
 *            paused, pauseReq, pauseRemainingMs, pauseEndsAt,
 *            board:[{tiles:[tile,...], text}], winner, poolC, poolV, log:[] }
 *    hands: { playerId: [tile,...] }             // 비공개(자기 것만)
 *    bag:   { consonants:[tile], vowels:[tile] }
 *  window.WBRoom 로 노출.
 */
(function (global) {
  'use strict';

  const E = global.WBEngine;
  const W = global.WBWords;

  const TURN_MS = 120000;              // 한 턴 최대 2분
  const MAX_PAUSE_MS = 50 * 60 * 1000; // 일시정지 최대 50분

  function newGame(code, host, title) {
    return {
      room: {
        code: code, title: (title || '').slice(0, 20) || (host.name + '의 방'),
        createdAt: Date.now(), hostId: host.id, status: 'waiting',
        players: [{ id: host.id, name: host.name, handCount: 0, laid: false, out: false, surrendered: false, hints: 0 }],
        turn: null, turnEndsAt: null,
        paused: false, pauseReq: null, pauseRemainingMs: null, pauseEndsAt: null,
        board: [], winner: null, poolC: 0, poolV: 0,
        approvedWords: [], proposal: null,
        log: ['방이 만들어졌어요. 친구를 기다리는 중…']
      },
      hands: {}, bag: { consonants: [], vowels: [] }
    };
  }

  function syncApproved(room) { W.setApproved(room.approvedWords || []); }
  function findPlayer(room, id) { return room.players.find(function (p) { return p.id === id; }); }
  function setTurnTimer(room) { room.turnEndsAt = Date.now() + TURN_MS; }

  // 다음 '살아있는'(나가거나 항복하지 않은) 플레이어로 턴을 넘기고 타이머를 새로 건다.
  function nextTurn(room) {
    const n = room.players.length;
    let i = room.players.findIndex(function (p) { return p.id === room.turn; });
    for (let k = 0; k < n; k++) {
      i = (i + 1) % n;
      if (!room.players[i].out) { room.turn = room.players[i].id; setTurnTimer(room); return; }
    }
  }
  // 한 명만 남으면 그 사람 승리로 종료
  function checkLastStanding(room) {
    if (room.status !== 'playing') return;
    const active = room.players.filter(function (p) { return !p.out; });
    if (active.length <= 1) {
      room.status = 'finished';
      room.winner = active.length ? active[0].id : null;
      if (active.length) log(room, '🏆 ' + active[0].name + ' 님만 남아 승리했어요!');
      finalizeScores(room);
    }
  }

  // 게임 끝: 낱말·자모·힌트·남은타일로 점수 → 순위 → 랭크 점수
  const RANK_POINTS = [30, 15, 5, 0];  // 1등~4등이 얻는 랭크 점수
  function finalizeScores(room) {
    if (room.scored) return;
    room.scored = true;
    const rows = room.players.map(function (p) {
      let g = (p.wordsMade || 0) * 10 + (p.jamoPlayed || 0) * 2 - (p.hints || 0) * 3 - (p.handCount || 0);
      if (p.surrendered) g -= 20;   // 항복 감점
      return {
        id: p.id, name: p.name, gameScore: g,
        words: p.wordsMade || 0, jamo: p.jamoPlayed || 0, hints: p.hints || 0,
        surrendered: !!p.surrendered, win: p.id === room.winner
      };
    });
    rows.sort(function (a, b) {
      if (a.win !== b.win) return a.win ? -1 : 1;       // 승자 먼저
      return b.gameScore - a.gameScore;
    });
    rows.forEach(function (r, i) { r.rank = i + 1; r.rankPoints = (RANK_POINTS[i] != null ? RANK_POINTS[i] : 0); });
    room.results = rows;
  }
  function refreshCounts(game) {
    game.room.poolC = game.bag.consonants.length;
    game.room.poolV = game.bag.vowels.length;
    game.room.players.forEach(function (p) {
      if (game.hands[p.id]) p.handCount = game.hands[p.id].length;
    });
  }
  function log(room, msg) { room.log.push(msg); if (room.log.length > 30) room.log.shift(); }

  // ── 액션 ──────────────────────────────────────────────
  function join(game, p) {
    const room = game.room;
    if (room.status !== 'waiting') return { ok: false, error: '이미 시작된 방이에요.' };
    if (findPlayer(room, p.id)) return { ok: true };
    if (room.players.length >= 4) return { ok: false, error: '방이 가득 찼어요 (최대 4명).' };
    room.players.push({ id: p.id, name: p.name, handCount: 0, laid: false, out: false, surrendered: false, hints: 0 });
    log(room, p.name + ' 님이 들어왔어요.');
    return { ok: true };
  }

  function start(game, p) {
    const room = game.room;
    if (p.id !== room.hostId) return { ok: false, error: '방장만 시작할 수 있어요.' };
    if (room.status !== 'waiting') return { ok: false, error: '이미 시작했어요.' };
    if (room.players.length < 2) return { ok: false, error: '2명 이상 모여야 시작할 수 있어요.' };
    const bag = E.makeBag();
    const result = E.deal(bag, room.players.length);
    game.bag = result.bag;
    room.players.forEach(function (pl, i) { game.hands[pl.id] = result.hands[i]; pl.laid = false; });
    room.status = 'playing';
    room.turn = room.players[0].id;
    setTurnTimer(room);
    refreshCounts(game);
    log(room, '게임 시작! 먼저 ' + room.players[0].name + ' 님 차례예요.');
    return { ok: true };
  }

  function commitTurn(game, p, payload) {
    const room = game.room;
    if (room.status !== 'playing') return { ok: false, error: '게임 중이 아니에요.' };
    if (room.paused) return { ok: false, error: '일시정지 중이에요.' };
    if (room.turn !== p.id) return { ok: false, error: '아직 내 차례가 아니에요.' };

    const hand = game.hands[p.id] || [];
    const handMap = {}; hand.forEach(function (t) { handMap[t.id] = t; });
    const boardMap = {};
    room.board.forEach(function (w) { w.tiles.forEach(function (t) { boardMap[t.id] = t; }); });

    const groups = (payload.words || []).filter(function (g) { return g && g.length > 0; });
    const usedSet = new Set();
    for (const g of groups) {
      for (const id of g) {
        if (usedSet.has(id)) return { ok: false, error: '같은 타일을 두 번 쓸 수 없어요.' };
        if (!handMap[id] && !boardMap[id]) return { ok: false, error: '쓸 수 없는 타일이 있어요.' };
        usedSet.add(id);
      }
    }
    for (const bid in boardMap) {
      if (!usedSet.has(bid)) return { ok: false, error: '바닥에 있던 타일은 그대로 두거나 다른 낱말에 넣어야 해요 (버릴 수 없어요).' };
    }
    let handUsed = 0;
    usedSet.forEach(function (id) { if (handMap[id]) handUsed++; });
    if (handUsed < 1) return { ok: false, error: '내 손패에서 최소 1개는 내려놔야 해요.' };

    syncApproved(room);
    const results = [];
    const newBoard = [];
    let allOk = groups.length > 0;
    for (const g of groups) {
      const tiles = g.map(function (id) { return handMap[id] || boardMap[id]; });
      const r = E.validateWord(tiles);
      results.push(r);
      if (!r.ok) allOk = false;
      newBoard.push({ tiles: tiles, text: r.text });
    }
    if (!allOk) return { ok: false, error: '아직 못 내요', results: results };

    game.hands[p.id] = hand.filter(function (t) { return !usedSet.has(t.id); });
    room.board = newBoard;
    const me = findPlayer(room, p.id); me.laid = true;
    me.jamoPlayed = (me.jamoPlayed || 0) + handUsed;      // 이번 턴에 낸 손패 자모 수
    me.wordsMade = (me.wordsMade || 0) + groups.length;   // 이번 턴에 만든 낱말 수
    refreshCounts(game);
    log(room, p.name + ' 님이 판을 바꿨어요: [' + newBoard.map(function (w) { return w.text; }).join(' · ') + ']');

    if (game.hands[p.id].length === 0) {
      room.status = 'finished'; room.winner = p.id;
      log(room, '🎉 ' + me.name + ' 님이 타일을 다 내려놓고 "루미큐브!" 외쳤어요. 승리!');
      finalizeScores(room);
      return { ok: true, results: results, win: true };
    }
    nextTurn(room);
    log(room, '다음 차례: ' + findPlayer(room, room.turn).name + ' 님');
    return { ok: true, results: results };
  }

  // ── 제안 → 동의 ──
  function propose(game, p, payload) {
    const room = game.room;
    if (room.status !== 'playing') return { ok: false, error: '게임 중이 아니에요.' };
    if (room.turn !== p.id) return { ok: false, error: '내 차례에만 제안할 수 있어요.' };
    if (room.proposal) return { ok: false, error: '이미 제안 중인 낱말이 있어요.' };
    const text = (payload.text || '').trim();
    if (!text) return { ok: false, error: '제안할 낱말이 없어요.' };
    syncApproved(room);
    const v = W.isValidWord(text);
    if (v.ok) return { ok: false, error: '이미 쓸 수 있는 낱말이에요.' };
    if (!v.canPropose) return { ok: false, error: '이 낱말은 제안할 수 없어요.' };
    if (room.players.filter(function (x) { return !x.out; }).length < 2) return { ok: false, error: '동의해 줄 친구가 없어요.' };
    room.proposal = { text: text, byId: p.id, byName: p.name, agrees: [] };
    log(room, '💬 ' + p.name + ' 님이 [' + text + ']을(를) 제안했어요. 친구들의 동의를 기다려요.');
    return { ok: true };
  }
  function agree(game, p) {
    const room = game.room;
    const pr = room.proposal;
    if (!pr) return { ok: false, error: '제안된 낱말이 없어요.' };
    if (pr.byId === p.id) return { ok: false, error: '내가 낸 제안에는 동의할 수 없어요.' };
    if (!findPlayer(room, p.id)) return { ok: false, error: '참가자가 아니에요.' };
    if (pr.agrees.indexOf(p.id) < 0) pr.agrees.push(p.id);
    const others = room.players.filter(function (x) { return x.id !== pr.byId && !x.out; }).length;
    if (pr.agrees.length >= others) {
      room.approvedWords = (room.approvedWords || []).concat([pr.text]);
      log(room, '✅ 모두 동의! [' + pr.text + ']을(를) 이 방에서 쓸 수 있게 됐어요.');
      room.proposal = null; syncApproved(room);
      return { ok: true, approved: true };
    }
    log(room, p.name + ' 님이 [' + pr.text + ']에 동의했어요. (' + pr.agrees.length + '/' + others + ')');
    return { ok: true };
  }
  function cancelProposal(game, p) {
    const room = game.room;
    if (!room.proposal) return { ok: false, error: '제안이 없어요.' };
    if (room.proposal.byId !== p.id) return { ok: false, error: '제안한 사람만 취소할 수 있어요.' };
    log(room, room.proposal.byName + ' 님이 제안을 취소했어요.');
    room.proposal = null;
    return { ok: true };
  }

  function draw(game, p, payload) {
    const room = game.room;
    if (room.status !== 'playing') return { ok: false, error: '게임 중이 아니에요.' };
    if (room.paused) return { ok: false, error: '일시정지 중이에요.' };
    if (room.turn !== p.id) return { ok: false, error: '아직 내 차례가 아니에요.' };
    const kind = payload.kind === 'C' ? 'C' : 'V';
    const t = E.drawTile(game.bag, kind);
    if (!t) return { ok: false, error: (kind === 'C' ? '자음' : '모음') + ' 봉지가 비었어요.' };
    game.hands[p.id] = (game.hands[p.id] || []).concat([t]);
    refreshCounts(game);
    log(room, p.name + ' 님이 ' + (kind === 'C' ? '자음' : '모음') + ' 타일을 뽑았어요.');
    nextTurn(room);
    log(room, '다음 차례: ' + findPlayer(room, room.turn).name + ' 님');
    return { ok: true };
  }

  // ── 타이머 초과: 자동으로 타일 한 장 받고 넘김 ──
  function timeout(game, p) {
    const room = game.room;
    if (room.status !== 'playing' || room.paused) return { ok: false, error: '지금은 처리하지 않아요.' };
    if (room.turn !== p.id) return { ok: false, error: '내 차례가 아니에요.' };
    let kind = game.bag.consonants.length >= game.bag.vowels.length ? 'C' : 'V';
    let t = E.drawTile(game.bag, kind) || E.drawTile(game.bag, kind === 'C' ? 'V' : 'C');
    if (t) game.hands[p.id] = (game.hands[p.id] || []).concat([t]);
    room.proposal = null;
    refreshCounts(game);
    log(room, '⏰ ' + p.name + ' 님 시간 초과! 타일 한 장 받고 넘어가요.');
    nextTurn(room);
    log(room, '다음 차례: ' + findPlayer(room, room.turn).name + ' 님');
    return { ok: true };
  }

  // ── 나가기 / 항복 ──
  function leave(game, p, payload) {
    const room = game.room;
    const me = findPlayer(room, p.id);
    if (!me) return { ok: true, left: true };
    const surrender = !!(payload && payload.surrender);
    if (room.status === 'waiting') {
      room.players = room.players.filter(function (x) { return x.id !== p.id; });
      if (room.hostId === p.id && room.players.length) room.hostId = room.players[0].id;
      log(room, p.name + ' 님이 방을 나갔어요.');
      return { ok: true, left: true };
    }
    const wasTurn = room.turn === p.id;
    me.out = true; me.surrendered = surrender;
    log(room, p.name + ' 님이 ' + (surrender ? '항복했어요. (랭크 점수가 깎여요)' : '게임에서 나갔어요.'));
    if (room.proposal && room.proposal.byId === p.id) room.proposal = null;
    refreshCounts(game);
    checkLastStanding(room);
    if (room.status === 'playing' && wasTurn) nextTurn(room);
    return { ok: true, left: true, finished: room.status === 'finished' };
  }

  // ── 일시정지 (동의 필요, 최대 50분) ──
  function requestPause(game, p) {
    const room = game.room;
    if (room.status !== 'playing') return { ok: false, error: '게임 중이 아니에요.' };
    if (room.paused) return { ok: false, error: '이미 일시정지 중이에요.' };
    if (room.pauseReq) return { ok: false, error: '이미 요청 중이에요.' };
    room.pauseReq = { byId: p.id, byName: p.name, agrees: [] };
    log(room, '⏸ ' + p.name + ' 님이 일시정지를 제안했어요. 모두 동의하면 멈춰요.');
    return { ok: true };
  }
  function agreePause(game, p) {
    const room = game.room; const rq = room.pauseReq;
    if (!rq) return { ok: false, error: '일시정지 요청이 없어요.' };
    if (p.id !== rq.byId && rq.agrees.indexOf(p.id) < 0) rq.agrees.push(p.id);
    const need = room.players.filter(function (x) { return !x.out && x.id !== rq.byId; }).length;
    if (rq.agrees.length >= need) {
      room.paused = true;
      room.pauseRemainingMs = Math.max(3000, (room.turnEndsAt || Date.now()) - Date.now());
      room.pauseEndsAt = Date.now() + MAX_PAUSE_MS;
      room.pauseReq = null;
      log(room, '⏸ 일시정지! 아무나 "이어서 하기"를 누르면 다시 시작해요. (최대 50분)');
      return { ok: true, paused: true };
    }
    log(room, p.name + ' 님이 일시정지에 동의했어요. (' + rq.agrees.length + '/' + need + ')');
    return { ok: true };
  }
  function cancelPause(game, p) {
    const room = game.room;
    if (!room.pauseReq) return { ok: false, error: '요청이 없어요.' };
    room.pauseReq = null;
    log(room, '일시정지 제안이 취소됐어요.');
    return { ok: true };
  }
  function resume(game, p) {
    const room = game.room;
    if (!room.paused) return { ok: false, error: '일시정지 상태가 아니에요.' };
    room.paused = false;
    room.turnEndsAt = Date.now() + (room.pauseRemainingMs || TURN_MS);
    room.pauseRemainingMs = null; room.pauseEndsAt = null;
    log(room, '▶ ' + p.name + ' 님이 다시 시작했어요.');
    return { ok: true };
  }

  // ── 힌트 사용 횟수 기록 (점수 계산은 3단계) ──
  function useHint(game, p) {
    const me = findPlayer(game.room, p.id);
    if (!me) return { ok: false };
    me.hints = (me.hints || 0) + 1;
    return { ok: true };
  }

  global.WBRoom = {
    newGame, join, start, commitTurn, draw, timeout,
    propose, agree, cancelProposal, syncApproved,
    leave, requestPause, agreePause, cancelPause, resume, useHint,
    findPlayer, refreshCounts, TURN_MS, MAX_PAUSE_MS
  };
})(typeof window !== 'undefined' ? window : this);
