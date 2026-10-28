"use strict";
// Public-page and unauthenticated callable checks only; never writes student data.
const assert = require("node:assert/strict"),
  { chromium } = require("playwright-core");
async function main() {
  const url = "https://dj48-quiztown-firebase.web.app";
  const browser = await chromium.launch({
    executablePath:
      process.env.SMOKE_CHROME_PATH ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url + "/battle/");
    assert.equal(await page.locator('a[href="/word-bomb/"]').count(), 1);
    assert.equal(await page.locator('a[href="/wordbattle/"]').count(), 0);
    await page.click('a[href="/word-bomb/"]');
    await page.locator("#mode-bot").waitFor();
    await page.waitForFunction(
      () => window.WordBombApp && window.WordBombDomain,
    );
    assert.equal(await page.evaluate(() => WordBombDomain.wordCount), 100000);
    assert.equal(await page.evaluate(() => {
      const words = new Set(WordBombDictionary.words);
      return ["인공지능", "일기예보", "이산화탄소", "미세먼지"].every(w=>words.has(w)) && WordBombDictionary.practiceWords.length===10001;
    }),true);

    assert.equal(
      await page.evaluate(() => {
        const D = WordBombDomain;
        const s = D.create(
          [
            { id: "test-a", name: "A" },
            { id: "test-b", name: "B" },
          ],
          {},
          1000,
        );
        s.word = "우산";
        s.used = ["우산"];
        return D.submit(s, "test-a", "산성비", s.turn, s.turnStartsAt).accepted;
      }),
      true,
    );

    assert.equal(
      await page.locator("#word-input").getAttribute("maxlength"),
      "100",
    );
    assert.equal(
      await page.evaluate(async () => {
        const image = new Image();
        image.src = "/word-bomb/assets/people-extra-v4.png";
        await image.decode();
        return image.naturalWidth > 1000;
      }),
      true,
    );
    const gate = await page.evaluate(async () => {
      await WordBombNet.load();
      try {
        await firebase
          .app()
          .functions("asia-northeast3")
          .httpsCallable("wordBombAction")({ action: "profile" });
        return "unexpected-success";
      } catch (e) {
        return e.code;
      }
    });
    assert.equal(gate, "functions/unauthenticated");
    await page.selectOption("#one-shot", "on");
    assert.equal(
      await page.evaluate(() => {
        const D = WordBombDomain;
        const s = D.create(
          [
            { id: "a", name: "A" },
            { id: "b", name: "B" },
          ],
          { allowOneShot: true },
          1000,
        );
        s.word = "우산";
        s.used = ["우산"];
        const r = D.submit(s, "a", "산기슭", s.turn, s.turnStartsAt);
        return r.accepted && r.state.event.reset && r.state.current === 1;
      }),
      true,
    );
    await page.click("#mode-bot");
    assert.equal(
      await page.locator("#practice-characters [data-character]").count(),
      16,
    );
    await page.click('#practice-characters [data-character="13"]');
    await page.selectOption("#bot-count", "7");
    await page.click("#practice");
    assert.equal(
      await page.evaluate(() => WordBombApp.state().players.length),
      8,
    );
    assert.equal(
      await page.evaluate(() => WordBombApp.state().players[0].characterId),
      13,
    );
    await page.waitForFunction(
      () => !document.getElementById("submit-word").disabled,
    );
    await page.locator(".bomb-holder .bomb-prop").evaluate(async (im) => {
      await im.decode();
      if (!im.src.includes("bomb-body-v6.png")) throw Error("Old bomb asset");
    });
    assert.equal(await page.locator(".bomb-ring").count(), 0);
    const fuse = Number(
      await page.locator(".bomb-holder").getAttribute("data-fuse-remaining"),
    );
    await page.waitForTimeout(1100);
    assert.ok(
      Number(
        await page.locator(".bomb-holder").getAttribute("data-fuse-remaining"),
      ) <
        fuse - 0.08,
    );
    assert.ok(
      await page.evaluate(
        () =>
          document.querySelector(".bomb-holder").getBoundingClientRect()
            .bottom <
          document
            .querySelector(".seat.active .human-art")
            .getBoundingClientRect().top,
      ),
    );
    const word = await page.evaluate(
      () => WordBombDomain.choices(WordBombApp.state())[0],
    );
    await page.fill("#word-input", word);
    await page.press("#word-input", "Enter");
    await page.waitForFunction(() => WordBombApp.state()?.turn === 2);
    assert.equal(
      await page.evaluate(() => WordBombApp.state().players[0].score),
      10,
    );
    await page.screenshot({
      path: "/tmp/word-bomb-production.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "Production: game entry replacement, 100000-word dictionary, new character asset, 100-character input, callable unauthenticated denial and bot word passing passed. No student-data writes.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
