"use strict";
const assert = require("node:assert/strict"),
  { chromium } = require("playwright-core"),
  { serve } = require("./word-bomb-test-server");
async function main() {
  const server = await serve(),
    browser = await chromium.launch({
      executablePath:
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      headless: true,
    });
  try {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(server.url + "/word-bomb/");
    await page.click("#mode-bot");
    assert.equal(
      await page.locator("#practice-characters [data-character]").count(),
      16,
    );
    await page.click('#practice-characters [data-character="13"]');
    await page.selectOption("#bot-count", "7");
    assert.equal(await page.locator(".seat").count(), 8);
    await page.evaluate(async () => {
      const im = new Image();
      im.src = "/word-bomb/assets/people-extra-v4.png";
      await im.decode();
    });
    const tops = await page
      .locator(".seat")
      .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().top));
    assert.ok(tops.every((y) => Math.abs(y - tops[0]) < 1));
    await page.screenshot({
      path: "/tmp/word-bomb-eight-desktop.png",
      fullPage: true,
    });
    await page.click("#practice");
    assert.deepEqual(
      await page.evaluate(() =>
        WordBombApp.state().players.map((p) => p.characterId),
      ),
      [13, 14, 15, 0, 1, 2, 3, 4],
    );
    await page.waitForFunction(
      () => !document.getElementById("submit-word").disabled,
    );
    await page.locator(".bomb-prop").evaluate(async (im) => im.decode());
    const hold = await page.evaluate(() => {
      const holder = document
          .querySelector(".bomb-holder")
          .getBoundingClientRect(),
        art = document
          .querySelector(".seat.active .human-art")
          .getBoundingClientRect(),
        clock = document.querySelector(".bomb-number").getBoundingClientRect();
      return {
        relative: (holder.bottom - art.top) / art.height,
        center: Math.abs(holder.x + holder.width / 2 - art.x - art.width / 2),
        above: clock.bottom <= holder.top || clock.left >= holder.right,
        ring: !!document.querySelector(".bomb-ring"),
      };
    });
    assert.ok(hold.relative < 0 && hold.relative > -0.1);
    assert.ok(hold.center < 1);
    assert.ok(hold.above, JSON.stringify(hold));
    assert.equal(hold.ring, false);
    await page.screenshot({
      path: "/tmp/word-bomb-prop-desktop.png",
      fullPage: true,
    });
    const initialFuse = await page
      .locator(".bomb-holder")
      .getAttribute("data-fuse-remaining");
    await page.waitForTimeout(1100);
    const laterFuse = await page
      .locator(".bomb-holder")
      .getAttribute("data-fuse-remaining");
    assert.ok(Number(laterFuse) < Number(initialFuse) - 0.08);
    const word = await page.evaluate(
      () => WordBombDomain.choices(WordBombApp.state())[0],
    );
    await page.fill("#word-input", word);
    await page.press("#word-input", "Enter");
    await page.waitForFunction(
      () => document.getElementById("flight").getAnimations().length > 0,
    );
    assert.equal(
      await page.evaluate(
        () =>
          document
            .getElementById("flight")
            .getAnimations()[0]
            .effect.getKeyframes().length,
      ),
      25,
    );
    assert.equal(await page.evaluate(() => WordBombApp.state().current), 1);
    assert.ok(
      Number(
        await page.locator(".bomb-holder").getAttribute("data-fuse-remaining"),
      ) > 0.95,
    );
    await page.setViewportSize({ width: 390, height: 900 });
    assert.equal(await page.locator(".seat").count(), 8);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.ok(
      await page.evaluate(
        () =>
          document.getElementById("arena").scrollWidth >
          document.getElementById("arena").clientWidth,
      ),
    );
    await page.evaluate(
      () => (document.getElementById("arena").scrollLeft = 1000),
    );
    await page.screenshot({
      path: "/tmp/word-bomb-eight-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "Eight-player browser: selected sprite IDs, single row, two-bounce animation, mobile internal scrolling, no page overflow passed.",
    );
  } finally {
    await browser.close();
    await server.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
