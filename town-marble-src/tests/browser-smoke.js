import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import { createMarbleServer } from "../server/index.js";

const app = createMarbleServer({ port: 0 });
await once(app.server, "listening");
const url = `http://127.0.0.1:${app.server.address().port}/town-marble/`;
const output = process.env.MARBLE_SCREENSHOTS || "/tmp/town-marble-smoke";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.SMOKE_CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const errors = [],
  failures = [],
  contexts = [];
async function pageFor(size = { width: 1366, height: 900 }) {
  const context = await browser.newContext({ viewport: size });
  await context.addInitScript(() => {
    const Original = window.WebSocket;
    window.__testSockets = [];
    window.WebSocket = class extends Original {
      constructor(...args) {
        super(...args);
        window.__testSockets.push(this);
      }
    };
  });
  contexts.push(context);
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      failures.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(url);
  await page.getByRole("button", { name: "여행 시작하기" }).waitFor();
  await page.locator("canvas.world-canvas[data-ready=true]").waitFor();
  return page;
}
try {
  const practice = await pageFor();
  await practice.getByRole("button", { name: "여행 시작하기" }).waitFor();
  await practice.screenshot({
    path: `${output}/desktop-home.png`,
    fullPage: true,
  });
  await practice.getByRole("button", { name: "여행 시작하기" }).click();
  await practice.getByRole("button", { name: "주사위 굴리기" }).click();
  await practice.waitForFunction(
    () =>
      !document.querySelector(".rolling") &&
      !document.querySelector(".travelling"),
  );
  await practice.locator(".action-panel").waitFor();
  assert.equal(
    await practice.locator("canvas.world-canvas").getAttribute("data-actors"),
    "4",
  );
  assert.equal(await practice.locator(".city-label").count(), 32);
  await practice.screenshot({
    path: `${output}/desktop-practice.png`,
    fullPage: true,
  });
  // Camera controls move real projected coordinates, not a static board picture.
  const city = practice.locator(".city-label").first();
  const beforeCamera = await city.getAttribute("style");
  await practice
    .getByRole("button", { name: "시점 돌리기", exact: true })
    .click();
  await practice.waitForTimeout(700);
  assert.notEqual(await city.getAttribute("style"), beforeCamera);
  await practice
    .getByRole("button", { name: "전체 보기", exact: true })
    .click();
  await practice
    .getByRole("button", { name: "여행 기록", exact: true })
    .click();
  await practice.getByRole("dialog", { name: "우리의 여행 기록" }).waitFor();
  await practice.keyboard.press("Escape");
  // Real 3D movement is observable during a normal roll; validate online with fixed dice below.
  const tablet = await pageFor({ width: 1024, height: 768 });
  await tablet.getByRole("button", { name: "게임 방법" }).click();
  await tablet.getByRole("dialog").waitFor();
  await tablet.keyboard.press("Escape");
  assert.equal(await tablet.getByRole("dialog").count(), 0);
  assert.equal(
    await tablet.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await tablet.screenshot({ path: `${output}/tablet.png`, fullPage: true });
  const phone = await pageFor({ width: 390, height: 844 });
  assert.equal(
    await phone.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await phone.getByRole("button", { name: "여행 시작하기" }).click();
  await phone.getByRole("button", { name: "모션 켜짐", exact: true }).click();
  await phone.getByRole("button", { name: "주사위 굴리기" }).click();
  await phone.screenshot({ path: `${output}/phone.png`, fullPage: true });

  // Context loss releases the animation lock and keeps the same game playable.
  await practice.evaluate(() => {
    const canvas = document.querySelector(".world-canvas");
    canvas
      .getContext("webgl2")
      .getExtension("WEBGL_lose_context")
      .loseContext();
  });
  await practice.locator(".flat-fallback").waitFor();
  assert.equal(await practice.locator(".piece").count(), 4);
  assert.ok(
    (await practice.locator(".action-panel button:not([disabled])").count()) >
      0,
  );

  app.rooms.rng = () => 0;
  const pages = [];
  let roomCode;
  for (let i = 0; i < 4; i++) {
    const page = await pageFor();
    pages.push(page);
    await page.getByLabel("여행가 이름").fill(`친구${i + 1}`);
    await page
      .getByRole("button", { name: "친구와 대전", exact: true })
      .click();
    if (i === 0) {
      await page.getByRole("button", { name: "새로운 방 만들기" }).click();
      await page.locator(".room-code").waitFor();
      roomCode = (await page.locator(".room-code").innerText()).split("\n")[0];
    } else {
      await page
        .getByRole("textbox", { name: "참가할 방 코드" })
        .fill(roomCode);
      await page.getByRole("button", { name: "참가", exact: true }).click();
      await page.locator(".room-code").waitFor();
    }
  }
  assert.equal(app.rooms.snapshot(roomCode).seats.length, 4);
  for (const page of pages)
    await page.getByRole("button", { name: "준비 완료!", exact: true }).click();
  await pages[0].getByRole("button", { name: "다 함께 출발하기" }).click();
  for (const page of pages) await page.locator(".action-panel").waitFor();
  assert.equal(
    await pages[1].getByRole("button", { name: "주사위 굴리기" }).count(),
    0,
  );
  await pages[0].getByRole("button", { name: "주사위 굴리기" }).click();
  await pages[0].locator(".travelling").waitFor({ timeout: 6000 });
  await pages[0].getByRole("button", { name: "땅 구매" }).click();
  await pages[0].getByRole("button", { name: "별장 짓기" }).click();
  for (const page of pages) {
    await page
      .getByRole("button", { name: /홍콩, 친구1 소유, 1단계/ })
      .waitFor();
    assert.ok(
      (
        await page
          .locator(".player-card")
          .filter({ hasText: "친구1" })
          .innerText()
      ).includes("183만"),
    );
  }
  const before = structuredClone(app.rooms.snapshot(roomCode).game);
  await pages[0].reload();
  await pages[0].getByRole("button", { name: /이어서 하기/ }).click();
  await pages[0].getByRole("button", { name: "빌딩 짓기" }).waitFor();
  assert.deepEqual(app.rooms.snapshot(roomCode).game, before);
  await pages[0].screenshot({
    path: `${output}/online-four-players.png`,
    fullPage: true,
  });
  // An offline browser recovers the exact state without repeating the purchase.
  await contexts[contexts.length - 1].setOffline(true);
  await pages[3].evaluate(() =>
    window.__testSockets.at(-1).close(4000, "smoke reconnect"),
  );
  await pages[3].locator(".reconnect-banner").waitFor();
  await contexts[contexts.length - 1].setOffline(false);
  await pages[3].waitForFunction(
    () =>
      document.querySelector(".room-status")?.textContent.includes("연결됨"),
    null,
    { timeout: 20000 },
  );
  assert.equal(app.rooms.snapshot(roomCode).game.properties[2].level, 1);
  await pages[0].getByRole("button", { name: "선택 마치기" }).click();
  await pages[0].getByRole("button", { name: "주사위 굴리기" }).waitFor();
  // Selling while waiting to roll must not replay the previous dice animation.
  await pages[0].getByRole("button", { name: /내 도시/ }).click();
  await pages[0].getByRole("button", { name: /에 팔기/ }).click();
  await pages[0].locator(".empty-assets").waitFor();
  await pages[0].keyboard.press("Escape");
  await pages[0].waitForTimeout(100);
  assert.equal(
    await pages[0].getByRole("button", { name: "주사위 굴리기" }).isEnabled(),
    true,
  );
  assert.equal(
    await pages[0].locator("canvas.world-canvas").getAttribute("data-phase"),
    "idle",
  );
  // Expiry returns every connected browser to a usable home screen, not a dead reconnect loop.
  app.rooms.room(roomCode).createdAt -= 7 * 3600000;
  app.rooms.tick();
  for (const page of pages) {
    await page.locator(".setup-panel").waitFor();
    assert.ok(
      (await page.getByRole("alert").innerText()).includes("방이 종료"),
    );
  }
  assert.equal(errors.length, 0, errors.join("\n"));
  assert.equal(failures.length, 0, failures.join("\n"));
  console.log(
    `Browser smoke passed: practice, animated movement, 4 players, purchase/build, reconnect, tablet/phone, dialogs. Screenshots: ${output}`,
  );
} finally {
  await browser.close();
  await app.close();
}
