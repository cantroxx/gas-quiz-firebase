"use strict";
const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");
const { initializeApp, deleteApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { serve } = require("./word-bomb-test-server");
async function main() {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, "127.0.0.1:8383");
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, "127.0.0.1:9393");
  const app = initializeApp(
      { projectId: "demo-word-bomb" },
      "word-bomb-browser",
    ),
    db = getFirestore(app),
    auth = getAuth(app),
    server = await serve();
  let browser;
  const people = [
    {
      uid: "word-bomb-browser-host",
      name: "호두",
      email: "word-bomb-host@example.test",
    },
    {
      uid: "word-bomb-browser-guest",
      name: "보라",
      email: "word-bomb-guest@example.test",
    },
  ];
  try {
    for (const p of people) {
      await auth.createUser({
        uid: p.uid,
        email: p.email,
        password: "demo-test-only-1234",
      });
      await db
        .doc("authLinks/" + p.uid)
        .set({ memberUserId: "member-" + p.uid });
      await db.doc("users/member-" + p.uid).set({
        authUid: p.uid,
        nickname: p.name,
        status: "active",
        active: true,
      });
    }
    browser = await chromium.launch({
      executablePath:
        process.env.SMOKE_CHROME_PATH ||
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      headless: true,
    });
    const pages = [],
      errors = [];
    for (const p of people) {
      const context = await browser.newContext({
          viewport: { width: 1280, height: 1000 },
        }),
        page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(server.url + "/word-bomb/?emulator=1");
      await page.evaluate(async (email) => {
        await WordBombNet.load();
        await firebase
          .auth()
          .signInWithEmailAndPassword(email, "demo-test-only-1234");
      }, p.email);
      pages.push(page);
    }
    const [host, guest] = pages;
    await host.selectOption("#turn-seconds", "15");
    await host.selectOption("#one-shot", "on");
    await host.selectOption("#game-speed", "2");
    await host.click("#create-room");
    await host.locator("#room-number").waitFor();
    const code = await host.locator("#room-number").innerText();
    assert.equal(await host.evaluate(() => WordBombApp.room().options.speed),2);
    assert.match(await host.locator(".room-rules").innerText(),/2배/);
    assert.equal(await host.evaluate(() => WordBombApp.room().options.allowOneShot),true);
    assert.match(await host.locator(".room-rules").innerText(),/한방 허용/);
    await guest.fill("#room-code", code);
    await guest.click("#join-room");
    await guest.locator("#ready").waitFor();
    await host.waitForFunction(() => WordBombApp.room()?.players.length === 2);
    assert.equal(await host.locator("#start-room").isDisabled(), true);
    await host.click('#room-characters [data-character="14"]');
    await host.waitForFunction(
      () => WordBombApp.room()?.players[0].characterId === 14,
    );
    await guest.click('#room-characters [data-character="11"]');
    await guest.waitForFunction(
      () => WordBombApp.room()?.players[1].characterId === 11,
    );
    await host.click("#ready");
    await guest.click("#ready");
    await host.waitForFunction(
      () => !document.getElementById("start-room").disabled,
    );
    await host.screenshot({
      path: "/tmp/word-bomb-online-lobby.png",
      fullPage: true,
    });
    await host.click("#start-room");
    await host.waitForFunction(
      () =>
        WordBombApp.state()?.phase === "playing" &&
        !document.getElementById("submit-word").disabled,
    );
    let word = await host.evaluate(
      () => WordBombDomain.choices(WordBombApp.state())[0],
    );
    await host.fill("#word-input", word);
    await host.press("#word-input", "Enter");
    await guest.waitForFunction(() => WordBombApp.state()?.turn === 2);
    assert.equal(await guest.locator("#current-word").innerText(), word);
    await guest.waitForFunction(
      () =>
        WordBombApp.state()?.phase === "playing" &&
        !document.getElementById("submit-word").disabled,
    );
    const clock = await guest.locator(".bomb-number").innerText();
    assert.ok(Number(clock) >= 13 && Number(clock) <= 15);
    await guest.screenshot({
      path: "/tmp/word-bomb-online-turn.png",
      fullPage: true,
    });
    word = await guest.evaluate(
      () => WordBombDomain.choices(WordBombApp.state())[0],
    );
    await guest.fill("#word-input", word);
    await guest.press("#word-input", "Enter");
    await host.waitForFunction(() => WordBombApp.state()?.turn === 3);
    // Reload actually detaches the callable watcher and restores the same room/account.
    await guest.reload();
    await guest.locator("#resume:visible").waitFor();
    await guest.click("#resume");
    await guest.waitForFunction(() => WordBombApp.state()?.turn >= 3);
    assert.equal(await guest.evaluate(() => WordBombApp.room().code), code);
    await host.waitForFunction(
      () => WordBombApp.state()?.turn === 4,
      {},
      { timeout: 23000 },
    );
    assert.equal(
      await host.evaluate(() => WordBombApp.state().players[0].hearts),
      1,
    );
    await guest.click("#leave-match");
    await guest.click("#confirm-leave");
    await guest.locator("#setup:visible").waitFor();
    await host.waitForFunction(() => WordBombApp.state()?.phase === "finished");
    await host.locator("#result-dialog[open]").waitFor();
    assert.match(await host.locator("#result-title").innerText(), /호두 우승/);
    await host.click("#play-again");
    // Second round uses the actual challenge callable path and a shortened emulator-only deadline.
    await host.click("#mode-challenge");
    // Leave room for emulator reload/network latency; final expiry is forced below.
    await host.selectOption("#duration", "180");
    await host.selectOption("#turn-seconds", "20");
    await host.click("#create-room");
    await host.locator("#room-number").waitFor();
    const challengeCode = await host.locator("#room-number").innerText();
    await guest.fill("#room-code", challengeCode);
    await guest.click("#join-room");
    await guest.locator("#ready").waitFor();
    await host.click('#room-characters [data-character="6"]');
    await host.waitForFunction(
      () => WordBombApp.room()?.players[0].characterId === 6,
    );
    await guest.click('#room-characters [data-character="3"]');
    await guest.waitForFunction(
      () => WordBombApp.room()?.players[1].characterId === 3,
    );
    await host.click("#ready");
    await guest.click("#ready");
    await host.waitForFunction(
      () => !document.getElementById("start-room").disabled,
    );
    await host.click("#start-room");
    await host.waitForFunction(
      () => WordBombApp.state()?.options.mode === "challenge",
    );
    await host.waitForFunction(
      () =>
        WordBombApp.state()?.phase === "playing" &&
        !document.getElementById("submit-word").disabled,
    );
    const challenge = await host.evaluate(() => ({
      end: WordBombApp.state().endsAt,
      word:
        WordBombApp.state().word.slice(-1) +
        "우리반이함께확인하는아주긴시험낱말기",
    }));
    await host.fill("#word-input", challenge.word);
    await host.click("#propose-word");
    await guest.locator("#vote-yes").waitFor();
    const frozen = await guest.locator(".bomb-number").innerText();
    const frozenFuse=await guest.locator(".bomb-holder").getAttribute("data-fuse-remaining");
    await guest.waitForTimeout(1200);
    assert.equal(await guest.locator(".bomb-holder").getAttribute("data-fuse-remaining"),frozenFuse);
    assert.equal(await guest.locator(".bomb-number").innerText(), frozen);
    assert.equal(await guest.locator("#submit-word").isDisabled(), true);
    await guest.reload();
    await guest.locator("#resume:visible").waitFor();
    await guest.click("#resume");
    await guest.locator("#vote-yes").waitFor();
    await guest.screenshot({
      path: "/tmp/word-bomb-online-proposal.png",
      fullPage: true,
    });
    await guest.click("#vote-yes");
    await host.waitForFunction(() => WordBombApp.state()?.turn === 2);
    await guest.waitForFunction(() => WordBombApp.state()?.turn === 2);
    assert.equal(
      await host.evaluate(() => WordBombApp.state().players[0].score),
      10,
    );
    assert.ok(
      await host.evaluate(
        (end) => WordBombApp.state().endsAt > end,
        challenge.end,
      ),
    );
    assert.equal(
      await host.locator("#current-word").innerText(),
      challenge.word,
    );
    await guest.waitForFunction(
      () => !document.getElementById("propose-word").disabled,
    );
    const rejectedWord = await guest.evaluate(
      () => WordBombApp.state().word.slice(-1) + "새로운제안시험기",
    );
    await guest.fill("#word-input", rejectedWord);
    await guest.click("#propose-word");
    try {
      await host.locator("#vote-no").waitFor();
    } catch (error) {
      console.error("Second proposal diagnostics", await guest.evaluate(() => ({
        state: WordBombApp.state(), feedback: document.getElementById("feedback")?.textContent,
        status: document.getElementById("status")?.textContent,
      })));
      throw error;
    }
    await host.click("#vote-no");
    await guest.waitForFunction(
      () => WordBombApp.state()?.lastProposal?.accepted === false,
    );
    assert.equal(await guest.evaluate(() => WordBombApp.state().turn), 2);
    assert.equal(await guest.locator("#propose-word").isDisabled(), true);
    // Synthetic test state only. No production endpoint or data is accessed by this suite.
    await db
      .doc("wordBombRooms/" + challengeCode)
      .update({ "game.endsAt": Date.now() + 700, revision: 1000 });
    for (const page of pages) {
      await page.waitForFunction(
        () => WordBombApp.state()?.phase === "finished",
        {},
        { timeout: 10000 },
      );
      await page.locator("#result-dialog[open]").waitFor();
      assert.match(
        await page.locator("#result-title").innerText(),
        /호두 우승/,
      );
    }
    assert.equal(
      await guest.evaluate(() => WordBombApp.state().players[1].explosions),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Word Bomb browser online: two Auth accounts, real Functions + Firestore, room/create/join/ready, reciprocal word passes, 15-second reset, reload/rejoin, automatic explosion, forfeit, replay, challenge absolute clock and no final-expiry penalty passed.",
    );
  } finally {
    if (browser) await browser.close();
    await server.close();
    await deleteApp(app);
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
