"use strict";
const crypto = require("node:crypto");
const D = require("./domain");

// Private collections remain denied by the existing catch-all Firestore rule.
// Authenticated, membership-checked callable long polling carries room changes.
function createService({
  db,
  now = () => Date.now(),
  ErrorType = Error,
  FieldValue = require('firebase-admin/firestore').FieldValue,
  watchMs = 20000,
}) {
  const fail = (code, message) => {
    const e = new ErrorType(code, message);
    e.code = code;
    e.message = message;
    throw e;
  };
  const roomRef = (code) => db.collection("wordBombRooms").doc(code);
  const controlRef = (uid) => db.collection("wordBombPlayers").doc(uid);
  async function identity(tx, uid) {
    const link = (await tx.get(db.doc("authLinks/" + uid))).data();
    if (!link?.memberUserId)
      fail("permission-denied", "퀴즈타운에 로그인한 뒤 이용해 주세요.");
    const user = (await tx.get(db.doc("users/" + link.memberUserId))).data();
    if (
      !user ||
      user.authUid !== uid ||
      user.active === false ||
      user.status !== "active"
    )
      fail("permission-denied", "활성 퀴즈타운 계정이 필요해요.");
    return {
      id: uid,
      memberUserId: link.memberUserId,
      name: String(user.nickname || user.displayNickname || "친구")
        .normalize("NFC")
        .slice(0, 20),
    };
  }
  function member(room, uid) {
    const p = room.players.find((p) => p.id === uid && !p.left);
    if (!p) fail("permission-denied", "이 방의 참가자만 이용할 수 있어요.");
    return p;
  }
  function expired(room, time) {
    return room.status === "waiting" && time - room.createdAt > 40 * 60000;
  }
  async function transaction(uid, data) {
    if (!uid) fail("unauthenticated", "퀴즈타운에 로그인해 주세요.");
    if (
      !data ||
      typeof data !== "object" ||
      ![
        "profile",
        "create",
        "join",
        "sync",
        "watch",
        "ready",
        "character",
        "start",
        "submit",
        "propose",
        "vote",
        "leave",
      ].includes(data.action)
    )
      fail("invalid-argument", "요청을 확인해 주세요.");
    const action = data.action;
    if (
      !["profile", "create"].includes(action) &&
      (typeof data.code !== "string" || !/^\d{6}$/.test(data.code))
    )
      fail("invalid-argument", "여섯 자리 방 번호를 입력해 주세요.");
    return db.runTransaction(async (tx) => {
      const me = await identity(tx, uid),
        control = (await tx.get(controlRef(uid))).data();
      const previous = control?.code
        ? (await tx.get(roomRef(control.code))).data()
        : null;
      const time = now();
      const active =
        previous &&
        !expired(previous, time) &&
        ["waiting", "playing"].includes(previous.status) &&
        previous.players.some((p) => p.id === uid && !p.left)
          ? previous.code
          : "";
      if (action === "profile")
        return { me, activeCode: active, serverNow: time };
      if (action === "create") {
        if (active)
          fail(
            "failed-precondition",
            "진행 중인 방으로 돌아가거나 먼저 나가 주세요.",
          );
        const code = String(crypto.randomInt(100000, 1000000)),
          ref = roomRef(code);
        if ((await tx.get(ref)).exists)
          fail("aborted", "방 번호가 겹쳤어요. 한 번 더 눌러 주세요.");
        const room = {
          code,
          hostId: uid,
          status: "waiting",
          createdAt: time,
          revision: 1,
          options: D.settings(data.options),
          players: [{ ...me, characterId: null, ready: false, left: false }],
          game: null,
        };
        tx.create(ref, room);
        tx.set(controlRef(uid), { code });
        return { room, serverNow: time };
      }
      const ref = roomRef(data.code),
        snap = await tx.get(ref);
      if (!snap.exists)
        fail("not-found", "방을 찾을 수 없어요. 번호를 확인해 주세요.");
      const room = snap.data();
      if (expired(room, time))
        fail(
          "failed-precondition",
          "대기 시간이 지난 방이에요. 새 방을 만들어 주세요.",
        );
      if (action === "join") {
        if (room.players.some((p) => p.id === uid && !p.left))
          return { room, serverNow: time };
        if (room.status !== "waiting")
          fail("failed-precondition", "이미 시작했거나 끝난 방이에요.");
        if (active && active !== room.code)
          fail("failed-precondition", "다른 방에서 먼저 나와 주세요.");
        if (room.players.length >= 8)
          fail("resource-exhausted", "방이 꽉 찼어요. 최대 8명이에요.");
        room.players.push({
          ...me,
          characterId: null,
          ready: false,
          left: false,
        });
        room.revision++;
        tx.set(ref, room);
        tx.set(controlRef(uid), { code: room.code });
        return { room, serverNow: time };
      }
      const player = member(room, uid);
      let changed = false,
        accepted = false,
        message = "";
      if (room.game?.phase === "playing") {
        const before = JSON.stringify(room.game);
        D.advance(room.game, time);
        changed = JSON.stringify(room.game) !== before;
        if (room.game.phase === "finished") room.status = "finished";
      }
      if (action === "character") {
        if (room.status !== "waiting")
          fail("failed-precondition", "캐릭터는 시작 전에 선택해 주세요.");
        if (
          !Number.isInteger(data.characterId) ||
          data.characterId < 0 ||
          data.characterId > 15
        )
          fail("invalid-argument", "캐릭터를 다시 선택해 주세요.");
        if (
          room.players.some(
            (p, i) => p.id !== uid && p.characterId === data.characterId,
          )
        )
          fail("already-exists", "친구가 선택한 캐릭터예요.");
        if (player.characterId !== data.characterId) {
          player.characterId = data.characterId;
          player.ready = false;
          changed = true;
        }
      }
      if (action === "ready") {
        if (data.ready === true && !Number.isInteger(player.characterId))
          fail("failed-precondition", "먼저 내 캐릭터를 선택해 주세요.");
        if (room.status !== "waiting")
          fail("failed-precondition", "대기실에서만 준비할 수 있어요.");
        player.ready = data.ready === true;
        changed = true;
      }
      if (action === "start") {
        if (room.hostId !== uid)
          fail("permission-denied", "방장만 시작할 수 있어요.");
        if (
          room.status !== "waiting" ||
          room.players.length < 2 ||
          room.players.some((p) => !p.ready || !Number.isInteger(p.characterId))
        )
          fail(
            "failed-precondition",
            "2명 이상 모두 준비하면 시작할 수 있어요.",
          );
        room.game = D.create(room.players, room.options, time);
        room.status = "playing";
        changed = true;
      }
      if (action === "submit") {
        if (changed || room.status !== "playing")
          message = "시간이 끝났어요. 현재 차례를 확인해 주세요.";
        else {
          try {
            const result = D.submit(room.game, uid, data.word, data.turn, time);
            room.game = result.state;
            accepted = result.accepted;
            if(accepted)require('../growth/activity').record(tx,db,{source:'bomb:'+room.code+':'+room.createdAt+':'+room.revision,uid,counts:{bombWord:1},time});
            message = result.message;
            changed = true;
          } catch (error) {
            fail("failed-precondition", error.message);
          }
        }
        if (room.game?.phase === "finished") room.status = "finished";
      }
      if (action === "propose" || action === "vote") {
        if (changed || room.status !== "playing")
          message = "현재 차례와 제안 상태를 다시 확인해 주세요.";
        else {
          try {
            room.game =
              action === "propose"
                ? D.propose(room.game, uid, data.word, data.turn, time)
                : D.vote(room.game, uid, data.proposalId, data.agree, time);
            changed = true;
          } catch (error) {
            fail("failed-precondition", error.message);
          }
        }
        if (room.game?.phase === "finished") room.status = "finished";
      }
      if (action === "leave") {
        if (room.status === "waiting") {
          room.players = room.players.filter((p) => p.id !== uid);
          if (room.hostId === uid) room.hostId = room.players[0]?.id || "";
          if (!room.players.length) room.status = "closed";
        } else {
          player.left = true;
          if (room.game?.phase === "playing")
            room.game = D.leave(room.game, uid, time);
          if (room.game?.phase === "finished") room.status = "finished";
        }
        if (control?.code === room.code) tx.set(controlRef(uid), { code: "" });
        changed = true;
      }
      if (changed) {
        if(room.status === 'finished' && !room.questWinRecorded) {
          room.questWinRecorded = true;
          for(const winner of room.game?.winners || []) {
            require('../growth/activity').record(tx, db, { source: 'bomb-win:' + room.code + ':' + room.createdAt + ':' + winner,
              uid: winner, counts: { bombWin: 1 }, time });
            const player = room.players.find(p => p.id === winner);
            if(player?.memberUserId) require('../achievements/games').award(tx,db,player.memberUserId,'word-bomb','stars');
            if(player?.memberUserId) tx.set(db.collection('wordBombRanking').doc(player.memberUserId), {
              memberUserId: player.memberUserId, nickname: player.name,
              wins: FieldValue.increment(1), updatedAt: time
            }, {merge:true});
          }
        }
        room.revision++;
        tx.set(ref, room);
      }
      return {
        room,
        accepted,
        message,
        serverNow: time,
        left: action === "leave",
      };
    });
  }
  async function act(uid, data) {
    if(data?.action === 'list') {
      if(!uid) fail('unauthenticated', '로그인이 필요해요.');
      await db.runTransaction(tx => identity(tx, uid));
      const snapshot = await db.collection('wordBombRanking').orderBy('wins', 'desc').limit(50).get();
      const checked = await Promise.all(snapshot.docs.map(async doc => {
        const row = doc.data(), user = (await db.doc('users/' + doc.id).get()).data();
        if(doc.id === 'G4-C8-N23' || !user || user.status !== 'active' || user.active === false) return null;
        return {memberUserId:doc.id,nickname:String(user.nickname || '친구').slice(0,24),wins:Number(row.wins)||0};
      }));
      const values = checked.filter(Boolean);
      return {rows: values.map(row => ({...row,rank:values.findIndex(other=>other.wins===row.wins)+1}))};
    }
    const result = await transaction(uid, data);
    if (
      data.action !== "watch" ||
      result.room.revision !== data.revision ||
      ["finished", "closed"].includes(result.room.status)
    )
      return result;
    const game = result.room.game,
      time = now();
    const deadline =
      game?.phase === "playing"
        ? game.proposal
          ? game.proposal.expiresAt
          : Math.min(game.turnEndsAt, game.endsAt || Infinity)
        : time + watchMs;
    // No public room reads, client writes, or new Rules grants are needed.
    await new Promise((resolve, reject) => {
      let off = () => {},
        done = false;
      const end = (error) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        off();
        error ? reject(error) : resolve();
      };
      const timer = setTimeout(
        () => end(),
        Math.max(20, Math.min(watchMs, deadline - time + 20)),
      );
      off = roomRef(data.code).onSnapshot(
        (snap) => {
          if (!snap.exists || snap.data().revision !== data.revision) end();
        },
        (error) => end(error),
      );
      if (done) off();
    });
    // Recheck active membership and settle the authoritative deadline on wakeup.
    return transaction(uid, { action: "sync", code: data.code });
  }
  return { act };
}
module.exports = { createService };
