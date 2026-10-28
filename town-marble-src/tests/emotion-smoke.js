import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright-core";
import { createMarbleServer } from "../server/index.js";
import { tilePoint } from "../shared/data.js";

const app = createMarbleServer({ port: 0 });
await once(app.server, "listening");
const sessions = [];
for (let i = 0; i < 4; i++)
  sessions.push(
    i
      ? app.rooms.join({
          code: sessions[0].code,
          name: `친구${i}`,
          character: i,
        })
      : app.rooms.create({ name: "여행가", character: 0 }),
  );
const code = sessions[0].code;
const command = (session, action) =>
  app.rooms.command(code, session.token, {
    id: randomUUID(),
    version: app.rooms.snapshot(code).version,
    action,
  });
for (const session of sessions)
  command(session, { type: "READY", ready: true });
command(sessions[0], { type: "START" });
const room = app.rooms.room(code);
room.game.players.forEach((p, i) => (p.position = i ? 2 : 0));
room.game.properties[2] = { owner: sessions[1].playerId, level: 3 };
room.game.players[0].cash = 60;
app.rooms.rng = () => 0;
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addInitScript(
    (session) =>
      sessionStorage.setItem(
        "dj48-town-marble-session-v1",
        JSON.stringify(session),
      ),
    sessions[0],
  );
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${app.server.address().port}/town-marble/`);
  await page.getByRole("button", { name: /이어서 하기/ }).click();
  await page.getByRole("button", { name: "주사위 굴리기" }).click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".actor-name")].some((el) =>
      ["sad", "cry"].includes(el.dataset.emotion),
    ),
  );
  assert.ok(await page.locator('.actor-name[data-emotion="happy"]').count());
  await page.waitForTimeout(350);
  await page.screenshot({ path: "/tmp/town-marble-emotion.png" });
  await page.waitForTimeout(1500);
  const read = () =>
    page
      .locator("[data-standing]")
      .evaluateAll((elements) =>
        elements.map((el) => JSON.parse(el.dataset.standing)),
      );
  const before = await read();
  for (const actor of before) {
    const tile = tilePoint(actor.tile),
      x = (tile.x - 4) * 2.12,
      z = (tile.y - 4) * 2.12;
    assert.ok(Math.abs(actor.x - x) + actor.scale * 0.7 < 1.01);
    assert.ok(Math.abs(actor.z - z) + actor.scale * 0.7 < 1.01);
  }
  await page.getByRole("button", { name: "시점 돌리기" }).click();
  await page.waitForTimeout(1000);
  assert.deepEqual(
    await read(),
    before,
    "Camera rotation must not move characters out of their tile",
  );
  await page.screenshot({ path: "/tmp/town-marble-standing.png" });
  await page.waitForFunction(
    () =>
      !document.querySelector(
        '.actor-name[data-emotion="cry"],.actor-name[data-emotion="sad"],.actor-name[data-emotion="happy"]',
      ),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/town-marble-standing-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(
    "Emotion smoke passed: rent payer sad/cry, recipient happy after landing, four feet contained, fixed positions during camera rotation, reaction expiry, desktop/mobile renders.",
  );
} finally {
  await browser.close();
  await app.close();
}
