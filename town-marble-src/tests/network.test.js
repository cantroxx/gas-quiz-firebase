import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";
import { createMarbleServer } from "../server/index.js";

async function connect(port, origin = `http://127.0.0.1:${port}`) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/town-marble/socket`, {
    origin,
  });
  const pending = new Map();
  const client = {
    socket,
    state: null,
    session: null,
    request: (type, payload = {}) =>
      new Promise((resolve, reject) => {
        const id = randomUUID();
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error("request timed out"));
        }, 5000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ ...payload, type, id }));
      }),
  };
  socket.on("message", (raw) => {
    const message = JSON.parse(raw);
    if (message.state) client.state = message.state;
    if (message.session) client.session = message.session;
    const item = pending.get(message.id);
    if (item) {
      clearTimeout(item.timer);
      pending.delete(message.id);
      message.error
        ? item.reject(new Error(message.error))
        : item.resolve(message);
    }
  });
  socket.on("error", () => {});
  await once(socket, "open");
  return client;
}
test("32 clients in eight rooms synchronize independently; snapshots recover after disconnect", async (t) => {
  const app = createMarbleServer({ port: 0 });
  await once(app.server, "listening");
  const port = app.server.address().port,
    clients = [],
    samples = [];
  t.after(async () => {
    for (const client of clients) client.socket.terminate();
    await app.close();
  });
  app.rooms.rng = () => 0;
  for (let roomIndex = 0; roomIndex < 8; roomIndex++) {
    const party = [];
    for (let i = 0; i < 4; i++) {
      const client = await connect(port);
      clients.push(client);
      party.push(client);
      await client.request(i ? "join" : "create", {
        name: `테스트${roomIndex}-${i}`,
        character: i,
        code: party[0].session?.code,
      });
    }
    const code = party[0].session.code;
    for (const client of party)
      await client.request("action", {
        version: app.rooms.snapshot(code).version,
        action: { type: "READY", ready: true },
      });
    await party[0].request("action", {
      version: app.rooms.snapshot(code).version,
      action: { type: "START" },
    });
    for (const type of ["ROLL", "BUY", "BUILD"]) {
      const started = performance.now();
      await party[0].request("action", {
        version: app.rooms.snapshot(code).version,
        action: { type },
      });
      samples.push(performance.now() - started);
      const expected = app.rooms.snapshot(code).game;
      // The ack follows the broadcast on each socket; wait for the other sockets' messages.
      await new Promise((resolve) => setTimeout(resolve, 10));
      for (const client of party) assert.deepEqual(client.state.game, expected);
    }
    assert.equal(party[0].state.game.properties[2].level, 1);
    await assert.rejects(
      party[1].request("action", {
        version: app.rooms.snapshot(code).version,
        action: { type: "BUILD" },
      }),
      /내 차례/,
    );
  }
  assert.equal(app.rooms.rooms.size, 8);
  const first = clients[0],
    session = first.session,
    before = structuredClone(first.state.game);
  const closed = once(first.socket, "close");
  first.socket.close();
  await closed;
  const reconnected = await connect(port);
  clients.push(reconnected);
  await reconnected.request("resume", session);
  assert.deepEqual(reconnected.state.game, before);
  const intruder = await connect(port);
  clients.push(intruder);
  await assert.rejects(
    intruder.request("resume", { code: session.code, token: "invalid" }),
    /만료/,
  );
  samples.sort((a, b) => a - b);
  console.log(
    `Loopback only: 32 players / 8 rooms, ${samples.length} action acknowledgements, p95=${samples[Math.ceil(samples.length * 0.95) - 1].toFixed(2)}ms. Not a school Wi-Fi benchmark.`,
  );
});
test("server serves only its built game and rejects foreign WebSocket origins", async (t) => {
  const app = createMarbleServer({ port: 0 });
  await once(app.server, "listening");
  const port = app.server.address().port;
  t.after(() => app.close());
  await assert.rejects(
    connect(port, "https://unrelated.example"),
    /socket hang up|Unexpected/,
  );
  for (const path of [
    "/town-marble/../../functions/index.js",
    "/town-marble/%2e%2e/%2e%2e/.git/config",
    "/private/test",
  ]) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    assert.equal(response.status, 404);
  }
  const html = await fetch(`http://127.0.0.1:${port}/town-marble/`);
  assert.equal(html.status, 200);
  assert.ok((await html.text()).includes("두근두근"));
});
