'use strict';
const crypto = require('node:crypto');
const domain = import('./domain/game.js');
const RULESET = 'town-v1';
const MIN_RANK_MS = 180000;
function createService({ db, now = () => Date.now(), rng = crypto.randomInt, ErrorType = Error }) {
  const ref = (collection, id) => db.collection(collection).doc(id);
  const fail = (code, message) => {
    const error = new ErrorType(code, message);
    error.code = code;
    if (ErrorType === Error) error.message = message;
    throw error;
  };
  const requireThat = (ok, message) => { if (!ok) fail('failed-precondition', message); };
  const clone = value => JSON.parse(JSON.stringify(value));
  const rankRef = id => ref('townMarbleRanking', RULESET).collection('entries').doc(id);
  async function identity(tx, uid) {
    const memberId = (await tx.get(ref('authLinks', uid))).data()?.memberUserId;
    if (!memberId) fail('permission-denied', '퀴즈타운에 로그인한 뒤 이용해 주세요.');
    const user = (await tx.get(ref('users', memberId))).data();
    if (!user || user.authUid !== uid || user.status !== 'active' || user.active === false)
      fail('permission-denied', '활성 퀴즈타운 계정으로 로그인해 주세요.');
    return { id: memberId, name: String(user.nickname || user.displayNickname || '여행가').normalize('NFC').slice(0, 12), rankEligible: memberId !== 'G4-C8-N23' };
  }
  function snapshot(room, time) {
    return { code: room.code, version: room.version, hostId: room.hostId, minutes: room.minutes,
      seats: room.seats.map(({ id, name, character, ready, connected }) => ({ id, name, character, ready, connected })),
      game: room.game, ranking: room.ranking, serverNow: time };
  }
  async function act(uid, payload) {
    if (!uid) fail('unauthenticated', '퀴즈타운에 로그인해 주세요.');
    if (!payload || typeof payload !== 'object' || JSON.stringify(payload).length > 4096)
      fail('invalid-argument', '요청 내용을 확인해 주세요.');
    const { createGame, applyAction, timeoutGame } = await domain;
    const type = payload.type, time = now();
    const generatedCode = String(crypto.randomInt(100000, 1000000));
    return db.runTransaction(async tx => {
      const me = await identity(tx, uid);
      const controlRef = ref('townMarblePlayers', me.id);
      const control = (await tx.get(controlRef)).data();
      if (type === 'profile') return { ...me, code: control?.until > time ? control.code : null, serverNow: time };
      if (!['create', 'join', 'resume', 'sync', 'action'].includes(type)) fail('invalid-argument', '지원하지 않는 동작이에요.');
      const code = type === 'create' ? generatedCode : payload.code;
      if (typeof code !== 'string' || !/^\d{6}$/.test(code)) fail('invalid-argument', '6자리 방 번호를 확인해 주세요.');
      const roomRef = ref('townMarbleRooms', code), roomSnap = await tx.get(roomRef);
      // Account lock prevents the same member entering several simultaneous matches.
      if (['create', 'join'].includes(type) && control?.until > time && control.code !== code) {
        const other = (await tx.get(ref('townMarbleRooms', control.code))).data();
        requireThat(!other || other.closed || other.game?.status === 'ended' || other.game?.players.find(p => p.id === me.id)?.out,
          '진행 중인 방으로 이어 하거나 먼저 여행에서 나가 주세요.');
      }
      function seat() {
        if (!Number.isInteger(payload.character) || payload.character < 0 || payload.character > 3)
          fail('invalid-argument', '캐릭터를 다시 골라 주세요.');
        return { ...me, uid, character: payload.character, ready: false, connected: true, lastSeen: time };
      }
      if (type === 'create') {
        requireThat(!roomSnap.exists, '방 번호를 다시 만들어 주세요.');
        requireThat([0, 20, 30].includes(payload.minutes), '여행 시간을 확인해 주세요.');
        const room = { code, version: 1, ruleset: RULESET, hostId: me.id, minutes: payload.minutes, seats: [seat()],
          participantIds: [uid], game: null, createdAt: time, expiresAt: time + 1800000, closed: false, seen: [], ranking: null };
        tx.create(roomRef, room); tx.set(controlRef, { code, until: room.expiresAt });
        return { state: snapshot(room, time), session: { code, playerId: me.id, transport: 'firebase', uid } };
      }
      if (!roomSnap.exists) fail('not-found', '방이 없어요. 방 번호를 확인해 주세요.');
      const room = clone(roomSnap.data());
      requireThat(room.ruleset === RULESET && !room.closed, '종료된 방이에요. 새 방을 만들어 주세요.');
      let member = room.seats.find(s => s.id === me.id && s.uid === uid);
      if (type === 'join' && !member) {
        requireThat(!room.game && room.expiresAt > time, '이미 시작했거나 만료된 방이에요.');
        requireThat(room.seats.length < 4, '방이 꽉 찼어요. 최대 4명이에요.');
        requireThat(!room.seats.some(s => s.id === me.id), '로그인 계정이 바뀌었어요. 기존 방을 마친 뒤 다시 참가해 주세요.');
        member = seat(); room.seats.push(member); room.participantIds.push(uid); room.version++;
        tx.set(roomRef, room); tx.set(controlRef, { code, until: room.expiresAt });
        return { state: snapshot(room, time), session: { code, playerId: me.id, transport: 'firebase', uid } };
      }
      if (!member) fail('permission-denied', '방에 참가한 친구만 이용할 수 있어요.');
      requireThat(room.game || room.expiresAt > time, '대기실이 만료됐어요. 새 방을 만들어 주세요.');
      let changed = false;
      const touch = !member.connected || time - member.lastSeen >= 12000;
      if (touch) { member.lastSeen = time; member.connected = true; changed = true; }
      for (const s of room.seats) {
        if (s.id !== me.id && s.connected && time - s.lastSeen > 45000) {
          s.connected = false; if (!room.game) s.ready = false; changed = true;
        }
      }
      if (!room.game && !room.seats.find(s => s.id === room.hostId)?.connected) { room.hostId = me.id; changed = true; }
      const before = room.game;
      if (room.game?.status === 'playing') {
        if (room.expiresAt <= time && !room.game.endsAt) room.game.endsAt = time;
        room.game = timeoutGame(room.game, rng, time);
        if (room.game !== before) { room.version++; changed = true; }
      }
      let left = false, started = false;
      if (type === 'action') {
        if (typeof payload.id !== 'string' || !/^[A-Za-z0-9-]{8,80}$/.test(payload.id)) fail('invalid-argument', '요청 번호를 확인해 주세요.');
        const key = me.id + ':' + payload.id;
        if (!room.seen.includes(key) && room.game === before) {
          requireThat(payload.version === room.version, '화면이 갱신됐어요. 확인한 뒤 다시 선택해 주세요.');
          const action = payload.action;
          if (!action || typeof action.type !== 'string') fail('invalid-argument', '선택 내용을 확인해 주세요.');
          if (!room.game) {
            if (action.type === 'READY') { requireThat(typeof action.ready === 'boolean', '준비 상태를 확인해 주세요.'); member.ready = action.ready; }
            else if (action.type === 'START') {
              requireThat(room.hostId === me.id, '방장만 시작할 수 있어요.');
              requireThat(room.seats.length >= 2 && room.seats.every(s => s.ready && s.connected), '2명 이상 모두 준비하면 출발할 수 있어요.');
              room.game = createGame(room.seats, { minutes: room.minutes, now: time });
              started = true;
              room.expiresAt = time + 6 * 3600000;
              // Read every lock before writing, to serialize concurrent leave/start/join.
              const locks = await Promise.all(room.seats.map(s => tx.get(ref('townMarblePlayers', s.id))));
              requireThat(locks.every(lock => lock.data()?.code === code), '참가 상태가 바뀌었어요.');
            } else if (action.type === 'LEAVE' || action.type === 'REMOVE_DISCONNECTED') {
              const target = action.type === 'LEAVE' ? me.id : action.playerId;
              if (action.type === 'REMOVE_DISCONNECTED') requireThat(room.hostId === me.id && room.seats.some(s => s.id === target && !s.connected), '방장만 연결이 끊긴 자리를 정리할 수 있어요.');
              room.seats = room.seats.filter(s => s.id !== target); room.participantIds = room.seats.map(s => s.uid);
              if (room.hostId === target) room.hostId = room.seats[0]?.id || '';
              room.closed = room.seats.length === 0; left = target === me.id;
              // Released below, after all reads including rank documents.
              room.releasedPlayer = target;
            } else fail('invalid-argument', '대기실에서 할 수 없는 행동이에요.');
          } else {
            try { room.game = applyAction(room.game, me.id, action, rng, time); if(action.type==='ROLL'){room.questTurns=room.questTurns||{};room.questTurns[me.id]=(room.questTurns[me.id]||0)+1;} if(action.type==='SURRENDER'){room.questAbandoned=room.questAbandoned||{};room.questAbandoned[me.id]=true;} }
            catch (error) { fail('failed-precondition', error.message); }
          }
          room.seen = [...room.seen.slice(-99), key]; room.version++; changed = true;
        }
      }
      // Final result and all ranking increments commit atomically exactly once.
      if (room.game?.status === 'ended' && !room.ranking) {
        const eligible = time - room.game.startedAt >= MIN_RANK_MS;
        const participants = room.seats.filter(s => s.rankEligible);
        const records = eligible ? await Promise.all(participants.map(s => tx.get(rankRef(s.id)))) : [];
        room.ranking = { status: eligible ? 'saved' : 'unranked', reason: eligible ? 'completed' : 'short-game', finishedAt: time };
        if (eligible) participants.forEach((s, i) => {
          const old = records[i].data() || {}, won = room.game.winners.includes(s.id), draw = won && room.game.winners.length > 1;
          if(won)require('../achievements/games').award(tx,db,s.id,'town-marble','stars');
          tx.set(rankRef(s.id), { name: s.name, total: (old.total || 0) + (draw ? 1 : won ? 3 : 0), games: (old.games || 0) + 1,
            wins: (old.wins || 0) + (won && !draw ? 1 : 0), draws: (old.draws || 0) + (draw ? 1 : 0), updatedAt: time });
        });
        for(const participant of room.seats) if(eligible && participant.connected && !room.questAbandoned?.[participant.id] && Number(room.questTurns?.[participant.id]||0)>=3) require('../growth/activity').record(tx,db,{source:'marble:'+code+':'+room.game.startedAt+':'+participant.id,memberId:participant.id,counts:{marbleComplete:1},time});
        tx.create(ref('townMarbleResults', code), { ruleset: RULESET, winners: room.game.winners, ranking: room.ranking, game: room.game });
        changed = true;
      }
      if (room.releasedPlayer) { tx.set(ref('townMarblePlayers', room.releasedPlayer), { code, until: 0 }); delete room.releasedPlayer; }
      if (started) {
        room.seats.forEach(s => tx.set(ref('townMarblePlayers', s.id), { code, until: room.expiresAt }));
      }
      if (changed) tx.set(roomRef, clone(room));
      return { state: left ? null : snapshot(room, time), left, session: { code, playerId: me.id, transport: 'firebase', uid } };
    });
  }
  return { act };
}
module.exports = { createService, RULESET, MIN_RANK_MS };
