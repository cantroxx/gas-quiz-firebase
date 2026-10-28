// Reproducible footage of real UI actions against an isolated test server.
// Fixed dice and test players exist only in this process, never in the playable app.
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { createMarbleServer } from "../server/index.js";

const output = process.env.MARBLE_CAPTURE || "/tmp/town-marble-v2";
await mkdir(output, { recursive: true });
const app = createMarbleServer({ port: 0 });
await once(app.server, "listening");
const sessions = [];
for (const [i, name] of ["모찌", "삐약", "치즈", "코코"].entries())
  sessions.push(
    i
      ? app.rooms.join({ code: sessions[0].code, name, character: i })
      : app.rooms.create({ name, character: i }),
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
app.rooms.rng = () => 0;
const browser = await chromium.launch({
  executablePath:
    process.env.SMOKE_CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1366, height: 900 },
  recordVideo: { dir: output, size: { width: 1366, height: 900 } },
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
try {
  await page.goto(`http://127.0.0.1:${app.server.address().port}/town-marble/`);
  await page.locator("canvas[data-ready=true]").waitFor();
  await page.getByRole("button", { name: /이어서 하기/ }).click();
  await page.getByRole("button", { name: "주사위 굴리기" }).waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${output}/gameplay.png` });
  const frames = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const samples = [];
        let last = performance.now();
        function step(t) {
          samples.push(t - last);
          last = t;
          if (samples.length < 180) requestAnimationFrame(step);
          else resolve(samples.slice(5).sort((a, b) => a - b));
        }
        requestAnimationFrame(step);
      }),
  );
  const initialStyle = await page
    .locator(".actor-name.active")
    .getAttribute("style");
  await page.getByRole("button", { name: "주사위 굴리기" }).click();
  await page.waitForTimeout(520);
  await page.screenshot({ path: `${output}/dice.png` });
  await page.locator(".stage3d.travelling").waitFor();
  await page.waitForTimeout(220);
  await page.screenshot({ path: `${output}/walking.png` });
  assert.notEqual(
    await page.locator(".actor-name.active").getAttribute("style"),
    initialStyle,
  );
  await page.getByRole("button", { name: "땅 구매" }).click();
  await page.getByRole("button", { name: "별장 짓기" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${output}/construction.png` });
  await page.getByRole("button", { name: "빌딩 짓기" }).click();
  await page.getByRole("button", { name: "호텔 짓기" }).click();
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${output}/hotel.png` });
  assert.equal(app.rooms.snapshot(code).game.properties[2].level, 3);
  await page.getByRole("button", { name: "선택 마치기" }).click();
  const sequence = [3, 4, 0];
  app.rooms.rng = () => sequence.shift() ?? 0;
  await page.getByRole("button", { name: "주사위 굴리기" }).click();
  await page.locator(".cue-card").waitFor();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${output}/golden-key.png` });
  await page.waitForTimeout(2200);
  // A resize or camera orbit must keep labels on the projected board immediately.
  await page.getByRole("button", { name: "시점 돌리기", exact: true }).click();
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${output}/rotated.png` });
  await page.getByRole("button", { name: "전체 보기", exact: true }).click();
  await page.waitForTimeout(1400);
  const metrics = {
    environment:
      "One headless macOS Chrome, 1366×900, local server; not a school-device benchmark",
    frameMedianMs: frames[Math.floor(frames.length * 0.5)],
    frameP95Ms: frames[Math.floor(frames.length * 0.95)],
    canvas: await page
      .locator("canvas.world-canvas")
      .evaluate((e) => ({ ...e.dataset })),
    errors,
  };
  await writeFile(`${output}/metrics.json`, JSON.stringify(metrics, null, 2));
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(metrics));
} finally {
  const video = page.video();
  await context.close();
  await rename(await video.path(), `${output}/gameplay.webm`);
  await browser.close();
  await app.close();
}
