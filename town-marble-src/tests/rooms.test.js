import { test } from "node:test";
import assert from "node:assert/strict";
import { Rooms } from "../server/rooms.js";

const profile = (i) => ({ name: `여행가${i}`, character: i });
function command(manager, session, action, id = `command-${Math.random()}`) {
  return manager.command(session.code, session.token, {
    id,
    version: manager.snapshot(session.code).version,
    action,
  });
}
test("rooms protect tokens, enforce host/readiness/capacity and deduplicate state changes", () => {
  const manager = new Rooms({ rng: () => 0 });
  const host = manager.create(profile(0));
  assert.throws(() => manager.auth(host.code, "wrong-token"), /만료/);
  assert.throws(
    () => manager.create({ name: "<".repeat(20), character: 0 }),
    /별명/,
  );
  const guests = [1, 2, 3].map((i) =>
    manager.join({ ...profile(i), code: host.code }),
  );
  assert.throws(() => manager.join({ ...profile(0), code: host.code }), /가득/);
  assert.equal(
    JSON.stringify(manager.snapshot(host.code)).includes(host.token),
    false,
  );
  assert.throws(() => command(manager, guests[0], { type: "START" }), /방장/);
  assert.throws(() => command(manager, host, { type: "START" }), /모두 준비/);
  for (const session of [host, ...guests])
    command(manager, session, { type: "READY", ready: true });
  command(manager, host, { type: "START" });
  const message = {
    id: "unique-roll-1",
    version: manager.snapshot(host.code).version,
    action: { type: "ROLL", dice: [6, 6] },
  };
  const once = manager.command(host.code, host.token, message);
  const twice = manager.command(host.code, host.token, message);
  assert.deepEqual(twice.game, once.game);
  assert.deepEqual(once.game.dice, [1, 1]);
  assert.throws(
    () =>
      manager.command(host.code, host.token, {
        ...message,
        id: "stale-roll-2",
      }),
    /画面|화면/,
  );
  assert.throws(() => command(manager, guests[0], { type: "BUY" }), /내 차례/);
  const before = manager.snapshot(host.code);
  manager.connection(host.code, host.token, false);
  manager.connection(host.code, host.token, true);
  assert.deepEqual(manager.snapshot(host.code).game, before.game);
});
test("lobby host migration and token removal on voluntary leave", () => {
  const manager = new Rooms();
  const a = manager.create(profile(0));
  const b = manager.join({ ...profile(1), code: a.code });
  command(manager, a, { type: "LEAVE" });
  assert.equal(manager.snapshot(b.code).hostId, b.playerId);
  assert.throws(() => manager.auth(a.code, a.token));
});
test("a disconnected lobby host transfers leadership and only absent seats can be removed", () => {
  const manager = new Rooms();
  const a = manager.create(profile(0));
  const b = manager.join({ ...profile(1), code: a.code });
  manager.connection(a.code, a.token, false);
  assert.equal(manager.snapshot(a.code).hostId, b.playerId);
  assert.throws(
    () =>
      command(manager, a, {
        type: "REMOVE_DISCONNECTED",
        playerId: b.playerId,
      }),
    /방장/,
  );
  assert.throws(
    () =>
      command(manager, b, {
        type: "REMOVE_DISCONNECTED",
        playerId: b.playerId,
      }),
    /연결이 끊긴/,
  );
  command(manager, b, { type: "REMOVE_DISCONNECTED", playerId: a.playerId });
  assert.equal(manager.snapshot(a.code).seats.length, 1);
  assert.throws(() => manager.auth(a.code, a.token));
});
test("disconnected rooms advance on server time and expired room IDs are not reusable", () => {
  let now = 1000;
  const manager = new Rooms({ now: () => now, rng: (n) => n - 1 });
  const a = manager.create(profile(0));
  const b = manager.join({ ...profile(1), code: a.code });
  command(manager, a, { type: "READY", ready: true });
  command(manager, b, { type: "READY", ready: true });
  command(manager, a, { type: "START" });
  manager.connection(a.code, a.token, false);
  manager.connection(b.code, b.token, false);
  now += 45001;
  manager.tick();
  assert.ok(manager.snapshot(a.code).game.revision > 0);
  now += 6 * 3600000;
  manager.tick();
  assert.throws(() => manager.room(a.code), /찾을 수/);
});
