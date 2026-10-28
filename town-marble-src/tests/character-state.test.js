import test from "node:test";
import assert from "node:assert/strict";
import {
  standingSlot,
  characterReactions,
} from "../src/scene/character-state.js";
import { createGame, applyAction } from "../shared/game.js";
const game = () =>
  createGame(
    [
      { id: "a", name: "A", character: 0 },
      { id: "b", name: "B", character: 1 },
    ],
    { now: 1000 },
  );
test("one to four characters keep their entire footprint in the tile and apart", () => {
  for (let count = 1; count <= 4; count++) {
    const slots = Array.from({ length: count }, (_, i) =>
      standingSlot(count, i),
    );
    for (const p of slots) {
      assert.ok(Math.abs(p.x) + p.scale * 0.7 < 1.01);
      assert.ok(Math.abs(p.z) + p.scale * 0.7 < 1.01);
    }
    for (let a = 0; a < count; a++)
      for (let b = a + 1; b < count; b++)
        assert.ok(
          Math.hypot(slots[a].x - slots[b].x, slots[a].z - slots[b].z) >
            slots[a].scale * 1.2,
        );
  }
});
test("rent is sad for payer and happy for owner; purchase is happy despite cash loss", () => {
  const before = game();
  before.properties[2] = { owner: "b", level: 3 };
  const paid = applyAction(before, "a", { type: "ROLL" }, () => 0, 2000);
  const reactions = characterReactions(before, paid);
  assert.ok(
    reactions.some(
      (r) => r.playerId === "a" && ["sad", "cry"].includes(r.kind),
    ),
  );
  assert.ok(reactions.some((r) => r.playerId === "b" && r.kind === "happy"));
  const landed = applyAction(game(), "a", { type: "ROLL" }, () => 0, 2000);
  const bought = applyAction(landed, "a", { type: "BUY" }, () => 0, 2001);
  assert.ok(bought.players[0].cash < landed.players[0].cash);
  assert.deepEqual(characterReactions(landed, bought), [
    { playerId: "a", kind: "happy" },
  ]);
  assert.deepEqual(characterReactions(bought, structuredClone(bought)), []);
  assert.deepEqual(characterReactions(null, paid), []);
});
