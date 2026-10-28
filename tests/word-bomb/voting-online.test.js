"use strict";
const assert = require("node:assert/strict");
const { initializeApp, deleteApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { createService } = require("../../functions/word-bomb/service");
async function main() {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST||'', /^127\.0\.0\.1:\d+$/, 'Demo emulator only.');
  const app = initializeApp({ projectId: "demo-word-bomb" }, "vote-test"),
    db = getFirestore(app);
  let time = 9000000;
  const service = createService({ db, FieldValue, now: () => time, watchMs: 30 });
  const ids = ["vote-a", "vote-b", "vote-c", "vote-d"];
  let code;
  const call = (uid, action, rest = {}) =>
    service.act(uid, { action, code, ...rest });
  try {
    for (const uid of ids) {
      await db.doc("authLinks/" + uid).set({ memberUserId: uid });
      await db
        .doc("users/" + uid)
        .set({ authUid: uid, nickname: uid, active: true, status: "active" });
    }
    code = (
      await call(ids[0], "create", {
        options: { mode: "challenge", turnSeconds: 10, durationSeconds: 60 },
      })
    ).room.code;
    for (const uid of ids.slice(1)) await call(uid, "join");
    for (const [characterId, uid] of ids.entries()) {
      await call(uid, "character", { characterId });
      await call(uid, "ready", { ready: true });
    }
    let room = (await call(ids[0], "start")).room;
    time = room.game.turnStartsAt + 1000;
    const end = room.game.endsAt,
      word = room.game.word.slice(-1) + "우리학급긴낱말테스트기";
    room = (await call(ids[0], "propose", { word, turn: 1 })).room;
    assert.equal(room.game.proposal.required, 2);
    await assert.rejects(call(ids[0], "vote", { proposalId: 1, agree: true }));
    await assert.rejects(
      call(ids[1], "vote", { proposalId: 1, agree: "true" }),
    );
    time += 3000;
    await Promise.all(
      [1, 1].map(() => call(ids[1], "vote", { proposalId: 1, agree: true })),
    );
    room = (await call(ids[0], "sync")).room;
    assert.equal(room.game.proposal.votes.length, 1);
    assert.equal(room.game.turn, 1);
    await Promise.allSettled(
      ids
        .slice(2)
        .map((uid) => call(uid, "vote", { proposalId: 1, agree: true })),
    );
    room = (await call(ids[0], "sync")).room;
    assert.equal(room.game.proposal, null);
    assert.equal(room.game.turn, 2);
    assert.equal(room.game.players[0].score, 10);
    assert.equal(room.game.endsAt, end + 3000);
    assert.ok(room.game.approvedWords.includes(word));
    time = room.game.turnStartsAt + 1200;
    const turnEnd = room.game.turnEndsAt;
    room = (
      await call(ids[1], "propose", {
        word: room.game.word.slice(-1) + "시간초과시험기",
        turn: 2,
      })
    ).room;
    time = room.game.proposal.expiresAt;
    room = (await call(ids[2], "sync")).room;
    assert.equal(room.game.proposal, null);
    assert.equal(room.game.lastProposal.accepted, false);
    assert.equal(room.game.turnEndsAt, turnEnd + 20000);
    const persisted = (await db.doc("wordBombRooms/" + code).get()).data();
    assert.equal(persisted.game.proposal, null);
    assert.equal(persisted.game.turn, 2);
    console.log(
      "Online proposal: fixed majority, proposer denial, boolean validation, concurrent duplicate votes, exactly-once score, paused challenge clock and persisted timeout passed.",
    );
  } finally {
    await deleteApp(app);
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
