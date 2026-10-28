import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright-core";
import { createMarbleServer } from "../server/index.js";
const app = createMarbleServer({ port: 0 });
await once(app.server, "listening");
app.rooms.rng = () => 0;
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const times = {},
  errors = [];
try {
  for (const [speed, fallback] of [
    [1, false],
    [2, false],
    [2, true],
  ]) {
    const first = app.rooms.create({ name: "배속 확인", character: 0 }),
      second = app.rooms.join({ code: first.code, name: "친구", character: 1 });
    const command = (s, action) =>
      app.rooms.command(s.code, s.token, {
        id: randomUUID(),
        version: app.rooms.snapshot(s.code).version,
        action,
      });
    for (const s of [first, second]) command(s, { type: "READY", ready: true });
    command(first, { type: "START" });
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
    });
    await context.addInitScript(
      ({ first, speed }) => {
        sessionStorage.setItem(
          "dj48-town-marble-session-v1",
          JSON.stringify(first),
        );
        localStorage.setItem("town-marble-speed", String(speed));
      },
      { first, speed },
    );
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      `http://127.0.0.1:${app.server.address().port}/town-marble/`,
    );
    await page.getByRole("button", { name: /이어서 하기/ }).click();
    await page.getByRole("button", { name: "주사위 굴리기" }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: `진행 배속 ${speed}배, 눌러서 변경` })
        .count(),
      1,
    );
    if (fallback) {
      await page.evaluate(() =>
        document
          .querySelector("canvas.world-canvas")
          .getContext("webgl2")
          .getExtension("WEBGL_lose_context")
          .loseContext(),
      );
      await page.locator(".flat-fallback").waitFor();
    }
    const started = Date.now();
    await page.getByRole("button", { name: "주사위 굴리기" }).click();
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll("button")].find((b) =>
        b.textContent.includes("땅 구매"),
      );
      return b && !b.disabled;
    });
    if (!fallback) times[speed] = Date.now() - started;
    const game = app.rooms.snapshot(first.code).game;
    assert.deepEqual(game.dice, [1, 1]);
    assert.equal(game.players[0].position, 2);
    assert.equal(game.revision, 1);
    // Changing speed must not change the authoritative clock, version or rules.
    const snapshot = structuredClone(app.rooms.snapshot(first.code));
    await page.getByRole("button", { name: /진행 배속/ }).click();
    assert.equal(
      await page.evaluate(() => localStorage.getItem("town-marble-speed")),
      speed === 1 ? "1.5" : "1",
    );
    const after = app.rooms.snapshot(first.code);
    assert.equal(after.version, snapshot.version);
    assert.deepEqual(after.game, snapshot.game);
    if (speed === 1 && !fallback) {
      command(first, { type: "END" });
      await page.getByRole("button", { name: "주사위 굴리기" }).click();
      await page.waitForFunction(
        () =>
          document.querySelector("canvas.world-canvas")?.dataset.phase ===
          "walking",
      );
      const inFlight = structuredClone(app.rooms.snapshot(first.code));
      await page.getByRole("button", { name: /진행 배속/ }).click();
      await page.waitForFunction(() => {
        const b = [...document.querySelectorAll("button")].find((b) =>
          b.textContent.includes("땅 구매"),
        );
        return b && !b.disabled;
      });
      assert.equal(app.rooms.snapshot(first.code).game.players[0].position, 4);
      assert.deepEqual(app.rooms.snapshot(first.code).game, inFlight.game);
      assert.equal(
        await page.evaluate(() => localStorage.getItem("town-marble-speed")),
        "2",
      );
    }
    await page.setViewportSize({ width: 360, height: 740 });
    assert.ok(
      await page.getByRole("button", { name: /진행 배속/ }).isVisible(),
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await context.close();
  }
  assert.ok(times[2] < times[1] * 0.8, JSON.stringify(times));
  assert.deepEqual(errors, []);
  console.log(
    "Speed smoke passed: real 1x/2x timings",
    times,
    "unchanged dice/deadline/version, saved setting, fallback and 360px control.",
  );
} finally {
  await browser.close();
  await app.close();
}
