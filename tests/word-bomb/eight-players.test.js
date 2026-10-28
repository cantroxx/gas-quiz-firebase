"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const D = require("../../functions/word-bomb/domain");
test("eight people keep selected characters, wrap to first, skip eliminated and require four of seven votes", () => {
  const people = Array.from({ length: 8 }, (_, i) => ({
    id: "p" + i,
    name: "친구" + i,
    characterId: 15 - i,
  }));
  let game = D.create(people, { mode: "challenge", durationSeconds: 300 }, 0);
  assert.deepEqual(
    game.players.map((p) => p.characterId),
    [15, 14, 13, 12, 11, 10, 9, 8],
  );
  assert.throws(() => D.create([...people, { id: "extra" }], {}, 0));
  for (let i = 0; i < 8; i++) {
    assert.equal(game.current, i);
    game = D.submit(
      game,
      "p" + i,
      D.choices(game)[0],
      game.turn,
      game.turnStartsAt + 100,
    ).state;
  }
  assert.equal(game.current, 0);
  const t = game.turnStartsAt + 100;
  game = D.propose(
    game,
    "p0",
    game.word.slice(-1) + "우리반제안시험기",
    game.turn,
    t,
  );
  assert.equal(game.proposal.required, 4);
  const id = game.proposal.id;
  for (let i = 1; i <= 3; i++) game = D.vote(game, "p" + i, id, true, t + 100);
  assert.ok(game.proposal);
  game = D.vote(game, "p4", id, true, t + 200);
  assert.equal(game.proposal, null);
  assert.equal(game.current, 1);
  game = D.leave(game, "p2", game.turnStartsAt);
  game = D.submit(
    game,
    "p1",
    D.choices(game)[0],
    game.turn,
    game.turnStartsAt + 100,
  ).state;
  assert.equal(game.current, 3);
});
