const adminRequire=require('node:module').createRequire(require.resolve('../../functions/package.json'));
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { initializeApp, deleteApp } = adminRequire("firebase-admin/app");
const { getFirestore, FieldValue } = adminRequire("firebase-admin/firestore");
const {
  initializeTestEnvironment,
  assertFails,
} = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc } = require("firebase/firestore");
const { createService } = require("../../functions/word-bomb/service");
const D = require("../../functions/word-bomb/domain");
async function main() {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST||'', /^127\.0\.0\.1:\d+$/, 'Demo emulator only.');
  const projectId = "demo-word-bomb",
    app = initializeApp({ projectId }, "word-bomb-service-test"),
    db = getFirestore(app);
  const env = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: Number(process.env.FIRESTORE_EMULATOR_HOST.split(':')[1]),
      rules: fs.readFileSync("firestore.rules", "utf8"),
    },
  });
  let time = 1000000;
  const service = createService({ db, FieldValue, now: () => time, watchMs: 50 });
  const call = (uid, action, rest = {}) =>
    service.act(uid, { action, ...rest });
  const reject = async (p, code) => assert.rejects(p, (e) => e.code === code);
  const ids = [
    "bomb-a",
    "bomb-b",
    "bomb-c",
    "bomb-d",
    "bomb-e",
    "bomb-f",
    "bomb-g",
    "bomb-h",
    "bomb-i",
    "bomb-j",
    "bomb-inactive",
  ];
  try {
    for (const uid of ids) {
      await db.doc("authLinks/" + uid).set({ memberUserId: "member-" + uid });
      await db.doc("users/member-" + uid).set({
        authUid: uid,
        nickname: uid === "bomb-a" ? "<친구 A>" : uid,
        status: uid === "bomb-inactive" ? "inactive" : "active",
        active: uid !== "bomb-inactive",
      });
    }
    await reject(call(null, "profile"), "unauthenticated");
    await reject(call("outsider", "profile"), "permission-denied");
    await reject(call("bomb-inactive", "profile"), "permission-denied");
    await reject(
      call("bomb-a", "sync", { code: "../other" }),
      "invalid-argument",
    );
    const created = await call("bomb-a", "create", {
      options: { mode: "normal", turnSeconds: 5, hearts: 2 },
    });
    const code = created.room.code;
    await reject(call("bomb-a", "create"), "failed-precondition");
    const joins = await Promise.allSettled(
      [
        "bomb-b",
        "bomb-c",
        "bomb-d",
        "bomb-e",
        "bomb-g",
        "bomb-h",
        "bomb-i",
        "bomb-j",
      ].map((uid) => call(uid, "join", { code })),
    );
    assert.equal(joins.filter((r) => r.status === "fulfilled").length, 7);
    let room = (await call("bomb-a", "sync", { code })).room;
    assert.equal(room.players.length, 8);
    const members = room.players.map((p) => p.id),
      guest = members[1],
      outsider = ids.find(
        (uid) => !members.includes(uid) && uid !== "bomb-inactive",
      );
    await reject(call(outsider, "sync", { code }), "permission-denied");
    await reject(
      call(outsider, "watch", { code, revision: room.revision }),
      "permission-denied",
    );
    await reject(call(guest, "start", { code }), "permission-denied");
    await reject(call("bomb-a", "start", { code }), "failed-precondition");
    await reject(
      call(members[0], "ready", { code, ready: true }),
      "failed-precondition",
    );
    await reject(
      call(members[0], "character", { code, characterId: 16 }),
      "invalid-argument",
    );
    const picks = await Promise.allSettled(
      members
        .slice(0, 2)
        .map((uid) => call(uid, "character", { code, characterId: 15 })),
    );
    assert.equal(picks.filter((p) => p.status === "fulfilled").length, 1);
    room = (await call(members[0], "sync", { code })).room;
    const winner = room.players.find((p) => p.characterId === 15).id;
    await call(winner, "character", {
      code,
      characterId: members.indexOf(winner),
    });
    await call(winner, "ready", { code, ready: true });
    await call(winner, "character", { code, characterId: 6 });
    assert.equal(
      (await call(winner, "sync", { code })).room.players.find(
        (p) => p.id === winner,
      ).ready,
      false,
    );
    await call(winner, "character", {
      code,
      characterId: members.indexOf(winner),
    });
    for (const [characterId, id] of members.entries()) {
      await call(id, "character", { code, characterId });
      await call(id, "ready", { code, ready: true });
    }
    const watched = call(guest, "watch", {
      code,
      revision: (await call(guest, "sync", { code })).room.revision,
    });
    room = (await call("bomb-a", "start", { code })).room;
    assert.equal(room.game.endsAt, 0);
    assert.equal(new Set(room.game.players.map((p) => p.characterId)).size, 8);
    await reject(
      call(members[0], "character", { code, characterId: 0 }),
      "failed-precondition",
    );
    assert.equal((await watched).room.status, "playing");
    let word = D.choices(room.game)[0];
    await reject(
      call("bomb-a", "submit", { code, word, turn: room.game.turn }),
      "failed-precondition",
    );
    time = room.game.turnStartsAt + 100;
    await reject(
      call(guest, "submit", { code, word, turn: room.game.turn }),
      "failed-precondition",
    );
    await reject(
      call("bomb-a", "submit", {
        code,
        word: room.game.word.slice(-1) + "갛갛",
        turn: room.game.turn,
      }),
      "failed-precondition",
    );
    const submissions = await Promise.allSettled(
      [0, 1].map(() =>
        call("bomb-a", "submit", {
          code,
          word,
          turn: room.game.turn,
          score: 999999,
        }),
      ),
    );
    assert.equal(
      submissions.filter((r) => r.status === "fulfilled" && r.value.accepted)
        .length,
      1,
    );
    room = (await call(guest, "sync", { code })).room;
    assert.equal(room.game.players[0].score, 10);
    assert.equal(room.game.turn, 2);
    assert.equal(room.game.turnEndsAt - room.game.turnStartsAt, 5000);
    assert.equal((await call("bomb-a", "profile")).activeCode, code);
    assert.equal((await call("bomb-a", "join", { code })).room.game.turn, 2);
    // No new Firestore grants: participants, nonparticipants and guests cannot read or forge private state.
    for (const client of [
      env.authenticatedContext("bomb-a").firestore(),
      env.authenticatedContext(outsider).firestore(),
      env.unauthenticatedContext().firestore(),
    ]) {
      await assertFails(getDoc(doc(client, "wordBombRooms/" + code)));
      await assertFails(
        setDoc(doc(client, "wordBombRooms/" + code), { status: "finished" }),
      );
      await assertFails(getDoc(doc(client, "wordBombPlayers/bomb-a")));
      await assertFails(
        setDoc(doc(client, "wordBombPlayers/bomb-a"), { code: "000000" }),
      );
    }
    time = room.game.turnEndsAt;
    const settled = await Promise.all([
      call(guest, "sync", { code }),
      call("bomb-a", "sync", { code }),
    ]);
    assert.equal(settled[0].room.game.players[1].hearts, 1);
    assert.equal(settled[1].room.game.turn, 3);
    room = (await call("bomb-a", "sync", { code })).room;
    const current = room.game.players[room.game.current].id;
    room = (await call(current, "leave", { code })).room;
    assert.equal(room.game.players.find((p) => p.id === current).out, true);
    await reject(call(current, "join", { code }), "failed-precondition");
    time += 100000;
    room = (await call("bomb-a", "sync", { code })).room;
    assert.equal(room.status, "finished");
    for(const winner of room.game.winners){assert((await db.doc("users/member-"+winner).get()).data().gameHonors.stars>=1);}
    // Challenge real deadline, no early death, score is server-owned, joint winners allowed.
    const challenge = (
      await call("bomb-a", "create", {
        options: { mode: "challenge", turnSeconds: 10, durationSeconds: 60 },
      })
    ).room;
    await call(guest, "join", { code: challenge.code });
    for (const [characterId, id] of ["bomb-a", guest].entries()) {
      await call(id, "character", { code: challenge.code, characterId });
      await call(id, "ready", { code: challenge.code, ready: true });
    }
    room = (await call("bomb-a", "start", { code: challenge.code })).room;
    const end = room.game.endsAt;
    time = room.game.turnStartsAt + 100;
    room = (
      await call("bomb-a", "submit", {
        code: room.code,
        word: D.choices(room.game)[0],
        turn: room.game.turn,
      })
    ).room;
    assert.equal(room.game.endsAt, end);
    time = end + 1000;
    room = (await call(guest, "sync", { code: room.code })).room;
    assert.equal(room.status, "finished");
    assert.equal(room.game.reason, "time");
    assert.ok(room.game.players.every((p) => !p.out));
    // Leaving a waiting room transfers host; a closed/expired room cannot start or accept joins.
    const waiting = (await call("bomb-f", "create")).room;
    await call(guest, "join", { code: waiting.code });
    await call("bomb-f", "leave", { code: waiting.code });
    room = (await call(guest, "sync", { code: waiting.code })).room;
    assert.equal(room.hostId, guest);
    await call(guest, "leave", { code: waiting.code });
    await reject(
      call("bomb-f", "join", { code: waiting.code }),
      "failed-precondition",
    );
    const old = (await call("bomb-f", "create")).room;
    time += 41 * 60000;
    await reject(
      call(guest, "join", { code: old.code }),
      "failed-precondition",
    );
    assert.equal((await call("bomb-f", "profile")).activeCode, "");
    console.log(
      "Word Bomb online: active-account authorization, concurrent eight-player capacity, ready/host gates, private long-poll delivery, full turn reset, duplicate submit, clock boundaries, reconnect, timeout races, forfeits, challenge deadline, host migration and unchanged-rule read/write denial passed.",
    );
  } finally {
    await env.cleanup();
    await deleteApp(app);
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
