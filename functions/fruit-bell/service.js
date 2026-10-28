'use strict';
const crypto = require('node:crypto');
const D = require('./domain');
const HIDDEN = new Set(['G4-C8-N23']);
const DISCONNECT_MS = 35000, WAIT_MS = 30 * 60000;
function createService({ db, now = () => Date.now(), ErrorType = Error, watchMs = 15000 }) {
  const fail = (code, message) => { const error = new ErrorType(code, message); error.code = code; error.message = message; throw error; };
  const roomRef = code => db.doc('fruitBellRooms/' + code);
  const controlRef = uid => db.doc('fruitBellPlayers/' + uid);
  const rankRef = member => db.collection('fruitBellRanking').doc(D.VERSION).collection('entries').doc(member);
  async function identity(tx, uid) {
    const link = (await tx.get(db.doc('authLinks/' + uid))).data();
    if (!link?.memberUserId || !/^[A-Za-z0-9_-]{1,160}$/.test(link.memberUserId)) fail('permission-denied', '퀴즈타운에 로그인한 뒤 이용해 주세요.');
    const user = (await tx.get(db.doc('users/' + link.memberUserId))).data();
    if (!user || user.authUid !== uid || user.active === false || user.status !== 'active') fail('permission-denied', '활성 퀴즈타운 계정이 필요해요.');
    return { id: uid, memberUserId: link.memberUserId, name: String(user.nickname || user.displayNickname || '친구').normalize('NFC').slice(0, 20) };
  }
  function view(room, time) {
    return { code: room.code, host: room.host, revision: room.revision, mode: 'online', status: room.status,
      rankingStatus: room.rankingStatus || '', players: room.players.filter(p => !p.left).map(p => ({ id: p.id, name: p.name, ready: p.ready, connected: time - p.lastSeen < DISCONNECT_MS,
        emote: p.emote && time < p.emote.at + D.EMOTE_COOLDOWN ? p.emote : null })),
      game: room.game ? D.view(room.game) : null };
  }
  function active(room, uid, time) {
    return room && room.createdAt + WAIT_MS > time && ['waiting', 'playing'].includes(room.status) && room.players.some(p => p.id === uid && !p.left);
  }
  async function ranking(uid) {
    await db.runTransaction(tx => identity(tx, uid));
    const rows = []; let cursor;
    // Page past hidden/inactive members so they neither occupy places nor leak profiles.
    while (rows.length < 50) {
      let query = db.collection('fruitBellRanking').doc(D.VERSION).collection('entries').orderBy('total', 'desc').limit(100);
      if (cursor) query = query.startAfter(cursor);
      const snap = await query.get(); if (snap.empty) break;
      const profiles = await db.getAll(...snap.docs.map(doc => db.doc('users/' + doc.id)));
      snap.docs.forEach((doc, i) => {
        const user = profiles[i].data(), row = doc.data();
        if (HIDDEN.has(doc.id) || !user || user.active === false || user.status !== 'active' || user.authUid !== row.uid) return;
        rows.push({ memberUserId: doc.id, name: String(user.nickname || user.displayNickname || '친구').slice(0, 20),
          total: row.total, games: row.games, wins: row.wins, draws: row.draws, hits: row.hits, misses: row.misses });
      });
      cursor = snap.docs.at(-1); if (snap.size < 100) break;
    }
    return { mode: 'online', rows: rows.slice(0, 50).map(row => ({ ...row, rank: rows.findIndex(other => other.total === row.total) + 1 })), serverNow: now() };
  }
  async function settle(tx, room, time) {
    if (!['finished', 'aborted'].includes(room.game?.phase) || room.rankingStatus) return;
    const matchRef = db.doc('fruitBellMatches/' + room.matchId), match = await tx.get(matchRef);
    if (match.exists) { room.rankingStatus = match.data().rankingStatus; return; }
    const profiles = await Promise.all(room.players.map(p => tx.get(db.doc('users/' + p.memberUserId))));
    const links = await Promise.all(room.players.map(p => tx.get(db.doc('authLinks/' + p.id))));
    const ranks = await Promise.all(room.players.map(p => tx.get(rankRef(p.memberUserId))));
    const result = D.result(room.game);
    let reason = room.game.phase === 'aborted' ? 'cancelled' : time - room.game.startedAt < 45000 ? 'short' : room.players.some(p => p.actions < 1) ? 'inactive-play' : 'saved';
    if (reason === 'saved' && profiles.some((snap, i) => {
      const user = snap.data(), player = room.players[i];
      return !user || user.status !== 'active' || user.active === false || user.authUid !== player.id || links[i].data()?.memberUserId !== player.memberUserId;
    })) reason = 'inactive-account';
    room.rankingStatus = reason;
    if (reason === 'saved' && result && !result.practice) {
      for (let i = 0; i < room.players.length; i++) {
        const player = room.players[i]; if (HIDDEN.has(player.memberUserId)) continue;
        const stat = result.players.find(p => p.id === player.id), won = result.winners.includes(player.id), draw = result.winners.length > 1;
        const old = ranks[i].data() || {};
        if(won)require('../achievements/games').award(tx,db,player.memberUserId,'fruit-bell','stars');
        tx.set(rankRef(player.memberUserId), { uid: player.id, memberUserId: player.memberUserId, version: D.VERSION,
          total: (old.total || 0) + (won ? draw ? 1 : 3 : 0), games: (old.games || 0) + 1,
          wins: (old.wins || 0) + (won && !draw ? 1 : 0), draws: (old.draws || 0) + (won && draw ? 1 : 0),
          hits: (old.hits || 0) + stat.hits, misses: (old.misses || 0) + stat.misses, updatedAt: time });
      }
    }
    tx.create(matchRef, { version: D.VERSION, code: room.code, startedAt: room.game.startedAt, finishedAt: time, rankingStatus: reason,
      players: room.players.map(p => ({ uid: p.id, memberUserId: p.memberUserId })), result });
  }
  async function transaction(uid, data) {
    return db.runTransaction(async tx => {
      const me = await identity(tx, uid), control = (await tx.get(controlRef(uid))).data() || {};
      const previous = control.code ? (await tx.get(roomRef(control.code))).data() : null;
      const time = now(), action = data.action;
      if (action === 'profile') return { id: me.id, name: me.name, activeCode: active(previous, uid, time) ? previous.code : '', serverNow: time };
      if (action === 'create') {
        if (active(previous, uid, time)) fail('failed-precondition', '진행 중인 테이블로 돌아가거나 먼저 나가 주세요.');
        if (time - (control.createdAt || 0) < 5000) fail('resource-exhausted', '잠깐 기다린 뒤 새 테이블을 만들어 주세요.');
        const code = crypto.randomBytes(3).toString('hex').toUpperCase(), ref = roomRef(code);
        if ((await tx.get(ref)).exists) fail('aborted', '방 코드가 겹쳤어요. 한 번 더 눌러 주세요.');
        const room = { code, host: uid, createdAt: time, revision: 1, status: 'waiting', matchId: crypto.randomUUID(),
          players: [{ ...me, ready: false, lastSeen: time, actions: 0, left: false }], game: null, rankingStatus: '' };
        tx.create(ref, room); tx.set(controlRef(uid), { code, createdAt: time });
        return { room: view(room, time), serverNow: time };
      }
      const ref = roomRef(data.code), snap = await tx.get(ref);
      if (!snap.exists) fail('not-found', '방 코드를 다시 확인해 주세요.');
      const room = snap.data();
      if (room.status === 'waiting' && time - room.createdAt >= WAIT_MS && data.action !== 'leave') fail('failed-precondition', '대기 시간이 지난 방이에요. 새 테이블을 만들어 주세요.');
      if (action === 'join') {
        if (room.players.some(p => p.id === uid && !p.left)) return { room: view(room, time), serverNow: time };
        if (room.status !== 'waiting' || room.players.length >= 4) fail('failed-precondition', '이미 시작했거나 가득 찬 방이에요.');
        if (active(previous, uid, time)) fail('failed-precondition', '다른 테이블에서 먼저 나와 주세요.');
        room.players.push({ ...me, ready: false, lastSeen: time, actions: 0, left: false }); room.revision++;
        tx.set(ref, room); tx.set(controlRef(uid), { ...control, code: room.code });
        return { room: view(room, time), serverNow: time };
      }
      const player = room.players.find(p => p.id === uid && !p.left);
      if (!player) fail('permission-denied', '이 테이블의 참가자만 이용할 수 있어요.');
      let changed = false, accepted = false;
      // Test the previous heartbeat before touching it; a late reconnection cannot revive a forfeited game.
      if (room.game?.phase === 'playing') {
        if (room.players.some(p => p.left || time - p.lastSeen > DISCONNECT_MS)) { D.finish(room.game, 'disconnect'); changed = true; }
        else changed = D.tick(room.game, time);
        room.status = room.game.phase;
      }
      if (time - player.lastSeen > 8000 || ['ready', 'start'].includes(action)) { player.lastSeen = time; changed = true; }
      if (action === 'ready') {
        if (room.status !== 'waiting') fail('failed-precondition', '시작 전 대기실에서 준비해 주세요.');
        player.ready = data.ready === true; changed = true;
      }
      if (action === 'start') {
        if (room.host !== uid) fail('permission-denied', '방장만 시작할 수 있어요.');
        if (room.status !== 'waiting' || room.players.length < 2 || room.players.some(p => !p.ready || time - p.lastSeen >= DISCONNECT_MS)) fail('failed-precondition', '2명 이상 모두 연결하고 준비를 눌러 주세요.');
        room.game = D.create(room.players, time, () => crypto.randomInt(0, 0x1000000) / 0x1000000); room.status = 'playing';
        room.players.forEach(p => { p.lastSeen = time; }); changed = true;
      }
      if (room.game?.phase === 'playing' && ['ring', 'flip'].includes(action)) {
        if (data.round === room.game.round) {
          accepted = action === 'ring' ? D.ring(room.game, uid, data.round, time).accepted : D.flip(room.game, uid, time);
          if (accepted) { player.actions++; player.lastSeen = time; changed = true; }
        }
      }
      if (action === 'emote') {
        if (room.game?.phase !== 'playing') fail('failed-precondition', '경기 중에만 감정표현을 보낼 수 있어요.');
        if (player.emote && time - player.emote.at < D.EMOTE_COOLDOWN) fail('resource-exhausted', '감정표현은 3초에 한 번씩 보내요.');
        player.emote = { kind: data.kind, at: time }; changed = true;
      }
      if (action === 'leave') {
        if (room.status === 'waiting') {
          room.players = room.players.filter(p => p.id !== uid);
          if (room.host === uid) room.host = room.players[0]?.id || '';
          if (!room.players.length) room.status = 'closed';
        } else {
          if (room.game?.phase === 'playing') { D.finish(room.game, 'disconnect'); room.status = 'aborted'; }
          player.left = true;
        }
        changed = true;
      }
      // All ranking/profile reads happen before any transaction writes.
      const rankingBefore = room.rankingStatus;
      await settle(tx, room, time);
      if (rankingBefore !== room.rankingStatus) changed = true;
      if (action === 'leave' && control.code === room.code) tx.set(controlRef(uid), { ...control, code: '' });
      if (changed) { room.revision++; tx.set(ref, room); }
      return { room: view(room, time), accepted, left: action === 'leave', serverNow: time };
    });
  }
  function deadline(room, time) {
    const game = room.game;
    return game?.phase === 'playing' ? Math.min(game.endsAt, game.pending?.at || Infinity, game.contest?.until || Infinity,
      game.pending || game.contest ? Infinity : game.nextFlipAt) : time + watchMs;
  }
  async function watchSnapshot(uid, code) {
    // Most notifications need no write transaction: avoid making every spectator
    // compete with the bell input for the room's pessimistic Firestore lock.
    await identity({ get: ref => ref.get() }, uid);
    const snap = await roomRef(code).get();
    if (!snap.exists) fail('not-found', '방 코드를 다시 확인해 주세요.');
    const room = snap.data(), time = now();
    const player = room.players.find(p => p.id === uid && !p.left);
    if (!player) fail('permission-denied', '이 테이블의 참가자만 이용할 수 있어요.');
    if (time - player.lastSeen > 8000 || deadline(room, time) <= time ||
        (room.game?.phase === 'playing' && room.players.some(p => p.left || time - p.lastSeen > DISCONNECT_MS))) {
      return transaction(uid, { action: 'sync', code });
    }
    return { room: view(room, time), serverNow: time };
  }
  async function act(uid, data) {
    if (!uid || typeof uid !== 'string') fail('unauthenticated', '퀴즈타운에 로그인해 주세요.');
    const actions = ['profile', 'create', 'join', 'ready', 'start', 'ring', 'flip', 'emote', 'sync', 'watch', 'leave', 'list'];
    if (!data || !actions.includes(data.action)) fail('invalid-argument', '요청을 확인해 주세요.');
    if (data.action === 'emote' && !Object.hasOwn(D.EMOTES, data.kind)) fail('invalid-argument', '감정표현을 다시 골라 주세요.');
    if (data.action === 'list') return ranking(uid);
    if (!['profile', 'create'].includes(data.action) && (typeof data.code !== 'string' || !/^[A-F0-9]{6}$/.test(data.code))) fail('invalid-argument', '6자리 방 코드를 확인해 주세요.');
    if (['ring', 'flip'].includes(data.action) && (!Number.isInteger(data.round) || data.round < 0)) fail('invalid-argument', '카드를 다시 확인해 주세요.');
    const result = data.action === 'watch' ? await watchSnapshot(uid, data.code) : await transaction(uid, data);
    if (data.action !== 'watch' || result.room.revision !== data.revision || !['waiting', 'playing'].includes(result.room.status)) return result;
    const time = now(), nextDeadline = deadline(result.room, time);
    await new Promise((resolve, reject) => {
      let off = () => {}, done = false;
      const end = error => { if (done) return; done = true; clearTimeout(timer); off(); error ? reject(error) : resolve(); };
      const timer = setTimeout(() => end(), Math.max(15, Math.min(watchMs, nextDeadline - time + 10)));
      off = roomRef(data.code).onSnapshot(snap => { if (!snap.exists || snap.data().revision !== data.revision) end(); }, end);
      if (done) off();
    });
    return watchSnapshot(uid, data.code);
  }
  return { act };
}
module.exports = { createService, DISCONNECT_MS };
