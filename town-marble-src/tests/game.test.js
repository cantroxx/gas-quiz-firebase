import { test } from "node:test";
import assert from "node:assert/strict";
import { BOARD, CARDS, TURN_MS } from "../shared/data.js";
import {
  createGame,
  applyAction,
  botAction,
  rentAt,
  netWorth,
  timeoutGame,
  resale,
} from "../shared/game.js";

const seats = Array.from({ length: 4 }, (_, i) => ({
  id: `p${i}`,
  name: `친구${i}`,
  character: i,
}));
const create = (count = 4) => createGame(seats.slice(0, count), { now: 1000 });
const sequence =
  (...values) =>
  () => {
    assert.ok(values.length, "Missing deterministic random value");
    return values.shift();
  };
const act = (state, action, rng = () => 0) =>
  applyAction(state, state.players[state.current].id, action, rng, 2000);
test("two dice, salary, purchase, construction and rent are calculated authoritatively", () => {
  let state = create();
  state.players[0].position = 31;
  const before = structuredClone(state);
  state = act(
    state,
    { type: "ROLL", dice: [6, 6], cash: 9999 },
    sequence(0, 1),
  );
  assert.deepEqual(state.dice, [1, 2]);
  assert.equal(state.players[0].position, 2);
  assert.equal(state.players[0].cash, 220);
  assert.equal(before.players[0].position, 31);
  assert.equal(before.players[0].cash, 200);
  state = act(state, { type: "BUY" });
  assert.equal(state.players[0].cash, 210);
  state = act(state, { type: "BUILD" });
  assert.equal(state.properties[2].level, 1);
  assert.equal(rentAt(state, 2), BOARD[2].rent * 3);
  state = act(state, { type: "END" });
  const ownerCash = state.players[0].cash;
  state.players[1].position = 31;
  state = act(state, { type: "ROLL" }, sequence(0, 1));
  assert.equal(state.players[0].cash, ownerCash + BOARD[2].rent * 3);
  assert.equal(state.players[1].cash, 220 - BOARD[2].rent * 3);
  assert.equal(state.phase, "end");
  assert.equal(state.debt, null);
});
test("illegal turns, unsupported actions and insufficient funds do not mutate state", () => {
  const state = create(),
    original = structuredClone(state);
  assert.throws(() => applyAction(state, "p1", { type: "ROLL" }), /내 차례/);
  assert.throws(() => act(state, { type: "BUY" }), /지금 살/);
  assert.throws(() => act(state, { type: "TRAVEL", index: -1 }), /다른 칸/);
  assert.throws(() => act(state, { type: "SET_CASH", cash: 1000 }), /지원하지/);
  assert.deepEqual(state, original);
});
test("three consecutive doubles send the player to the island with no extra turn or salary", () => {
  let state = create();
  for (let i = 0; i < 2; i++) {
    state = act(state, { type: "ROLL" }, sequence(0, 0));
    state = act(state, { type: "END" });
  }
  assert.equal(state.current, 0);
  assert.equal(state.doubles, 2);
  state = act(state, { type: "ROLL" }, sequence(0, 0));
  assert.equal(state.players[0].position, 8);
  assert.equal(state.players[0].jail, 3);
  assert.equal(state.extraTurn, false);
  assert.equal(state.players[0].cash, 200);
  state = act(state, { type: "END" });
  assert.equal(state.current, 1);
});
test("island consumes three failed attempts; a double or escape card releases correctly", () => {
  for (const method of ["wait", "double", "card"]) {
    let state = create(2);
    state.players[0].position = 8;
    state.players[0].jail = 3;
    if (method === "card") state.players[0].escape = true;
    if (method === "wait") {
      for (let i = 0; i < 3; i++) {
        state = act(state, { type: "ROLL" }, sequence(0, 1));
        state.phase = "roll";
      }
      assert.equal(state.players[0].jail, 0);
      assert.equal(state.players[0].position, 8);
    } else {
      state = act(
        state,
        { type: "ROLL" },
        method === "double" ? sequence(0, 0) : sequence(0, 1, 0),
      );
      assert.equal(state.players[0].jail, 0);
      assert.equal(state.players[0].escape, false);
      assert.equal(state.extraTurn, false);
      assert.equal(state.players[0].position, method === "double" ? 10 : 11);
    }
  }
});
test("a golden-key flight keeps both animation paths and grants salary once", () => {
  let state = create();
  state.players[0].position = 25;
  const card = CARDS.findIndex((c) => c.move === 0);
  state = act(state, { type: "ROLL" }, sequence(0, 0, card));
  assert.equal(state.players[0].position, 0);
  assert.equal(state.players[0].cash, 220);
  assert.equal(state.motion.segments.length, 2);
  assert.deepEqual(state.motion.segments[0].path, [26, 27]);
  assert.deepEqual(state.motion.segments[1].path, [0]);
});
test("space travel starts on the next turn and executes the destination rent", () => {
  let state = create(2);
  state.players[0].position = 22;
  state.properties[2] = { owner: "p1", level: 2 };
  state = act(state, { type: "ROLL" }, sequence(0, 0));
  assert.equal(state.phase, "end");
  assert.equal(state.extraTurn, false);
  state = act(state, { type: "END" });
  state = act(state, { type: "ROLL" }, sequence(1, 2));
  state = act(state, { type: "END" });
  assert.equal(state.current, 0);
  assert.equal(state.phase, "travel");
  state = act(state, { type: "TRAVEL", index: 2 });
  assert.equal(state.players[0].cash, 220 - BOARD[2].rent * 7);
  assert.equal(state.phase, "end");
});
test("debt is settled only once after liquidation; ownership and bank balances are correct", () => {
  let state = create();
  state.properties[2] = { owner: "p1", level: 3 };
  state.properties[31] = { owner: "p0", level: 1 };
  state.players[0].cash = 1;
  state = act(state, { type: "ROLL" }, sequence(0, 0));
  assert.equal(state.phase, "debt");
  assert.equal(state.players[1].cash, 200);
  assert.throws(() => act(state, { type: "END" }), /먼저/);
  assert.throws(() => act(state, { type: "BANKRUPT" }), /땅을 팔면/);
  const amount = resale(state.properties[31], 31);
  state = act(state, { type: "SELL", index: 31 });
  assert.equal(state.players[0].cash, 1 + amount - rentAt(state, 2));
  assert.equal(state.players[1].cash, 200 + rentAt(state, 2));
  assert.equal(state.debt, null);
  assert.equal(state.properties[31].owner, null);
  assert.throws(() => act(state, { type: "SELL", index: 31 }), /내 땅/);
});
test("bankruptcy transfers remaining assets to creditor and finishes a two-player match", () => {
  let state = create(2);
  state.properties[2] = { owner: "p1", level: 3 };
  state.properties[1] = { owner: "p0", level: 1 };
  state.players[0].cash = 0;
  state = act(state, { type: "ROLL" }, sequence(0, 0));
  state = act(state, { type: "BANKRUPT" });
  assert.equal(state.properties[1].owner, "p1");
  assert.equal(state.properties[1].level, 1);
  assert.equal(state.players[0].out, true);
  assert.equal(state.status, "ended");
  assert.deepEqual(state.winners, ["p1"]);
});
test("fund deposit and collection conserve game money", () => {
  let state = create();
  state.players[0].position = 3;
  state = act(state, { type: "ROLL" }, sequence(0, 1));
  assert.equal(state.fund, 5);
  assert.equal(state.players[0].cash, 195);
  state = act(state, { type: "END" });
  state.players[1].position = 13;
  state = act(state, { type: "ROLL" }, sequence(0, 1));
  assert.equal(state.fund, 0);
  assert.equal(state.players[1].cash, 205);
});
test("timeouts finish choices without a connected browser; time mode supports ties", () => {
  let state = create();
  state.phase = "property";
  state.players[0].position = 1;
  state = timeoutGame(state, () => 0, 1000 + TURN_MS);
  assert.equal(state.current, 1);
  assert.equal(state.properties[1].owner, null);
  let timed = createGame(seats, { minutes: 20, now: 1000 });
  timed = timeoutGame(timed, () => 0, 1000 + 20 * 60000);
  assert.equal(timed.status, "ended");
  assert.equal(timed.reason, "time");
  assert.equal(timed.winners.length, 4);
});
test("100 complete bot games preserve integer money, ownership, valid turns and termination", () => {
  let seed = 29;
  const rng = (n) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return Math.floor((seed / 4294967296) * n);
  };
  for (let run = 0; run < 100; run++) {
    let state = create((run % 3) + 2);
    let count = 0;
    while (state.status === "playing" && count++ < 12000) {
      state = act(state, botAction(state), rng);
      for (const p of state.players) {
        assert.ok(Number.isInteger(p.cash) && p.cash >= 0);
        assert.ok(p.position >= 0 && p.position < 32);
        assert.ok(netWorth(state, p.id) >= p.cash);
      }
      for (const lot of state.properties) {
        assert.ok(lot.level >= 0 && lot.level <= 3);
        if (lot.owner)
          assert.ok(state.players.some((p) => p.id === lot.owner && !p.out));
      }
      if (state.status === "playing")
        assert.equal(state.players[state.current].out, false);
    }
    assert.equal(
      state.status,
      "ended",
      `game ${run} failed to finish at turn ${state.turn}`,
    );
    assert.ok(state.winners.length >= 1);
  }
});
