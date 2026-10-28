"use strict";
const assert = require("node:assert/strict"),
  { chromium } = require("playwright-core");
const { serve } = require("./word-bomb-test-server");
async function main() {
  const server = await serve();
  let browser;
  try {
    browser = await chromium.launch({
      executablePath:
        process.env.SMOKE_CHROME_PATH ||
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      headless: true,
    });
    const errors = [];
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(server.url + "/word-bomb/");
    await page.locator("#mode-bot").waitFor();
    assert.equal(await page.locator("#practice-characters").isVisible(), false);
    assert.equal(await page.locator("#create-room").isVisible(), true);
    await page.screenshot({
      path: "/tmp/word-bomb-desktop.png",
      fullPage: true,
    });
    await page.click("#mode-challenge");
    assert.equal(await page.locator("#duration-setting").isVisible(), true);
    assert.equal(await page.locator("#hearts-setting").isVisible(), false);
    assert.equal(await page.locator("#practice").isVisible(), false);
    assert.equal(await page.locator("#practice-characters").isVisible(), false);
    await page.evaluate(() => document.getElementById("practice").click());
    assert.equal(await page.evaluate(() => WordBombApp.state()), null);
    await page.click("#mode-bot");
    assert.equal(await page.locator("#create-room").isVisible(), false);
    assert.equal(await page.locator("#duration-setting").isVisible(), false);
    assert.equal(await page.locator("#hearts-setting").isVisible(), true);
    assert.equal(await page.locator("#practice-characters").isVisible(), true);
    await page.selectOption("#turn-seconds", "5");
    await page.selectOption("#bot-count", "3");
    await page.selectOption("#one-shot", "on");
    await page.click("#practice");
    await page.waitForFunction(
      () =>
        WordBombApp.state()?.phase === "playing" &&
        !document.getElementById("submit-word").disabled,
    );
    assert.equal(
      await page.evaluate(() => WordBombApp.state().options.allowOneShot),
      true,
    );
    const snapshot = await page.evaluate(() => {
      const s = WordBombApp.state();
      return {
        endsAt: s.endsAt,
        word: WordBombDomain.choices(s)[0],
        turn: s.turn,
      };
    });
    assert.equal(
      await page.evaluate(() => WordBombApp.state().options.mode),
      "normal",
    );
    // IME composition Enter must not submit a partial Korean syllable.
    await page.fill("#word-input", snapshot.word);
    await page.locator("#word-input").dispatchEvent("keydown", {
      key: "Enter",
      isComposing: true,
      keyCode: 229,
    });
    assert.equal(
      await page.evaluate(() => WordBombApp.state().turn),
      snapshot.turn,
    );
    await page.press("#word-input", "Enter");
    await page.waitForFunction(() => WordBombApp.state().turn >= 2);
    assert.equal(
      await page.evaluate(() => WordBombApp.state().players[0].score),
      10,
    );
    assert.equal(
      await page.evaluate(() => WordBombApp.state().endsAt),
      snapshot.endsAt,
    );
    assert.equal(await page.locator("#dictionary-info").isDisabled(), true);
    await page.screenshot({
      path: "/tmp/word-bomb-game-desktop.png",
      fullPage: true,
    });
    await page.click("#leave-match");
    await page.click("#confirm-leave");
    await page.locator("#setup:visible").waitFor();
    await page.click("#mode-bot");
    await page.selectOption("#turn-seconds", "5");
    await page.selectOption("#hearts", "1");
    await page.selectOption("#bot-count", "1");
    await page.click("#practice");
    await page.waitForFunction(
      () => WordBombApp.state()?.phase === "finished",
      {},
      { timeout: 15000 },
    );
    await page.locator("#result-dialog[open]").waitFor();
    assert.equal(
      await page.evaluate(() => WordBombApp.state().players[0].hearts),
      0,
    );
    await page.screenshot({
      path: "/tmp/word-bomb-result.png",
      fullPage: true,
    });
    await page.click("#play-again");
    await page.locator("#setup:visible").waitFor();
    await page.click("#mode-normal");
    await page.click("#create-room");
    await page.waitForFunction(() =>
      document.getElementById("status").textContent.includes("로컬 미리보기"),
    );
    await page.click("#dictionary-info");
    await page.fill("#dictionary-search", "사과");
    assert.match(await page.locator("#dictionary-list").innerText(), /사과/);
    await page.click('[data-close="dictionary-dialog"]');
    await page.click("#mode-bot");
    // Narrow phone layout, touch controls, reduced motion and input visibility.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click("#motion");
    await page.screenshot({
      path: "/tmp/word-bomb-mobile.png",
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.click("#practice");
    await page.waitForFunction(
      () =>
        WordBombApp.state()?.phase === "playing" &&
        !document.getElementById("submit-word").disabled,
    );
    await page.screenshot({
      path: "/tmp/word-bomb-game-mobile.png",
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    const buttons = await page.locator("#word-input").boundingBox();
    assert.ok(buttons.width >= 160);
    await page.setViewportSize({ width: 320, height: 700 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Word Bomb browser: mode settings, full turn reset, friends-only challenge and bot routing, Korean IME, real timeout/result, replay, dictionary, local online fallback, mobile 390/320, reduced motion: passed.",
    );
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
