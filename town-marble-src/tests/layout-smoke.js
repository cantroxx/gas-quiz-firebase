import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { createMarbleServer } from "../server/index.js";

const app = createMarbleServer({ port: 0 });
await once(app.server, "listening");
const output = process.env.MARBLE_LAYOUT_SHOTS || "/tmp/town-marble-layout";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.SMOKE_CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const errors = [],
  reports = [];
async function audit(page, label, checkNames = true) {
  const report = await page.evaluate(
    ({ label, checkNames }) => {
      const issues = [],
        visible = (el) => {
          const c = getComputedStyle(el);
          return (
            c.display !== "none" &&
            c.visibility !== "hidden" &&
            Number(c.opacity) > 0
          );
        };
      const area = (a, b) =>
        Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
        Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const elements = [
        ...document.querySelectorAll(
          ".player-card,.world-viewport,.scene-controls,.action-panel,.setup-panel,.room-status,.scene-cue,.app-header .brand,.app-header nav,.header-actions",
        ),
      ].filter(visible);
      for (let i = 0; i < elements.length; i++)
        for (let j = i + 1; j < elements.length; j++)
          if (
            area(
              elements[i].getBoundingClientRect(),
              elements[j].getBoundingClientRect(),
            ) > 2
          )
            issues.push(
              `overlap ${elements[i].className} / ${elements[j].className}`,
            );
      const controls = [
        ...document.querySelectorAll(
          ".action-panel button,.action-notice,.active-player,.turn-top,.turn-timer span",
        ),
      ].filter(visible);
      for (let i = 0; i < controls.length; i++)
        for (let j = i + 1; j < controls.length; j++)
          if (
            area(
              controls[i].getBoundingClientRect(),
              controls[j].getBoundingClientRect(),
            ) > 2
          )
            issues.push(
              `action overlap ${controls[i].textContent.trim()} / ${controls[j].textContent.trim()}`,
            );
      const dock = document.querySelector(".action-panel");
      if (dock && dock.getBoundingClientRect().bottom > innerHeight + 1)
        issues.push("action dock outside viewport");
      if (document.documentElement.scrollWidth > innerWidth)
        issues.push("horizontal overflow");
      if (checkNames) {
        const polygons = [...document.querySelectorAll(".city-label")].map(
          (el) => {
            const r = el.getBoundingClientRect(),
              values =
                getComputedStyle(el)
                  .clipPath.match(/[\d.]+/g)
                  ?.map(Number) || [];
            return [0, 2, 4, 6].map((i) => ({
              x: r.left + (values[i] / 100) * r.width,
              y: r.top + (values[i + 1] / 100) * r.height,
            }));
          },
        );
        // Separating-axis test checks actual projected parallelograms, not their overlapping bounding boxes.
        function overlap(a, b) {
          for (const poly of [a, b])
            for (let i = 0; i < 4; i++) {
              const p = poly[i],
                q = poly[(i + 1) % 4],
                axis = { x: -(q.y - p.y), y: q.x - p.x };
              const aa = a.map((p) => p.x * axis.x + p.y * axis.y),
                bb = b.map((p) => p.x * axis.x + p.y * axis.y);
              if (
                Math.max(...aa) <= Math.min(...bb) + 0.01 ||
                Math.max(...bb) <= Math.min(...aa) + 0.01
              )
                return false;
            }
          return true;
        }
        for (let i = 0; i < polygons.length; i++)
          for (let j = i + 1; j < polygons.length; j++)
            if (overlap(polygons[i], polygons[j]))
              issues.push(`city surfaces overlap ${i}/${j}`);
      }
      return { label, width: innerWidth, height: innerHeight, issues };
    },
    { label, checkNames },
  );
  reports.push(report);
  assert.deepEqual(report.issues, [], `${label}: ${report.issues.join("; ")}`);
}
try {
  for (const [width, height] of [
    [1440, 960],
    [1366, 768],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [360, 740],
  ]) {
    const tag = `${width}x${height}`,
      context = await browser.newContext({ viewport: { width, height } }),
      page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      `http://127.0.0.1:${app.server.address().port}/town-marble/`,
    );
    await page.locator("canvas[data-ready=true]").waitFor();
    await audit(page, `${tag}-lobby`);
    await page.screenshot({
      path: `${output}/${tag}-lobby.png`,
      fullPage: true,
    });
    const sessions = [];
    for (let i = 0; i < 4; i++)
      sessions.push(
        i
          ? app.rooms.join({
              code: sessions[0].code,
              name: `친구${i}`,
              character: i,
            })
          : app.rooms.create({ name: "함께여행하는친구", character: 0 }),
      );
    const code = sessions[0].code,
      command = (s, action) =>
        app.rooms.command(code, s.token, {
          id: randomUUID(),
          version: app.rooms.snapshot(code).version,
          action,
        });
    for (const s of sessions) command(s, { type: "READY", ready: true });
    command(sessions[0], { type: "START" });
    app.rooms.rng = () => 0;
    await page.evaluate(
      (s) =>
        sessionStorage.setItem(
          "dj48-town-marble-session-v1",
          JSON.stringify(s),
        ),
      sessions[0],
    );
    await page.reload();
    await page.getByRole("button", { name: /이어서 하기/ }).click();
    await page.locator("canvas[data-ready=true]").waitFor();
    await page.waitForTimeout(300);
    await audit(page, `${tag}-roll`);
    await page.screenshot({
      path: `${output}/${tag}-game.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "도시 목록", exact: true }).click();
    await page.getByRole("dialog", { name: "도시 안내" }).waitFor();
    await page
      .locator(".city-directory button")
      .filter({ hasText: "서울" })
      .click();
    await page.getByRole("dialog", { name: "서울" }).waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /^서울,/ }).click();
    await page.getByRole("dialog", { name: "서울" }).waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "주사위 굴리기" }).click();
    await page.locator(".travelling").waitFor();
    await audit(page, `${tag}-moving`, false);
    await page.getByRole("button", { name: "땅 구매" }).click();
    await page.getByRole("button", { name: "별장 짓기" }).click();
    await page.waitForTimeout(350);
    await audit(page, `${tag}-building`);
    await page.screenshot({
      path: `${output}/${tag}-building.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "선택 마치기" }).click();
    await page.waitForTimeout(1700);
    for (let turn = 0; turn < 4; turn++) {
      await page
        .getByRole("button", { name: "시점 돌리기", exact: true })
        .click();
      await page.waitForTimeout(750);
      await audit(page, `${tag}-camera-${turn}`);
    }
    await page
      .getByRole("button", { name: "가까이 보기", exact: true })
      .click();
    await page.waitForTimeout(750);
    await audit(page, `${tag}-zoom`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    `Layout smoke passed: ${reports.length} states, six viewports, separate HUD/controls, 32 non-overlapping projected name surfaces, city directory.`,
  );
} finally {
  await writeFile(
    `${output}/report.json`,
    JSON.stringify({ reports, errors }, null, 2),
  );
  await browser.close();
  await app.close();
}
