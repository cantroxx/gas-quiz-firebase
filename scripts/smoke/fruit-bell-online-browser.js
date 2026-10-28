'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { serve } = require('./word-bomb-test-server');
const D = require('../../functions/fruit-bell/domain');
async function main() {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8497');
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9497');
  const app = initializeApp({ projectId: 'demo-fruit-bell' }, 'fruit-bell-browser'), db = getFirestore(app), auth = getAuth(app), server = await serve();
  const people = ['토끼', '곰', '냥이', '개굴'].map((name, i) => ({ uid: 'fruit-browser-' + i, name, email: `fruit-${i}@example.test` }));
  let browser;
  try {
    for (const p of people) {
      await auth.createUser({ uid: p.uid, email: p.email, password: 'emulator-fruit-only-1234' });
      await db.doc('authLinks/' + p.uid).set({ memberUserId: 'member-' + p.uid });
      await db.doc('users/member-' + p.uid).set({ authUid: p.uid, nickname: p.name, status: 'active', active: true });
    }
    browser = await chromium.launch({ executablePath: process.env.SMOKE_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
    const pages = [], errors = [];
    for (let i = 0; i < people.length; i++) {
      const context = await browser.newContext({ viewport: i === 3 ? { width: 390, height: 844 } : { width: 1280, height: 1000 } });
      const page = await context.newPage(); pages.push(page); page.on('pageerror', error => errors.push(error.message));
      await page.goto(server.url + '/fruit-bell/?emulator=1');
      await page.waitForFunction(() => typeof FruitBellNet !== 'undefined');
      await page.evaluate(async p => { await FruitBellNet.load(); await firebase.auth().signInWithEmailAndPassword(p.email, 'emulator-fruit-only-1234'); }, people[i]);
      await page.waitForFunction(() => !document.getElementById('create').disabled);
      assert.equal(await page.locator('#nickname').inputValue(), people[i].name);
      assert.equal(await page.locator('#nickname').getAttribute('readonly'), '');
    }
    const host = pages[0]; await host.click('#create'); await host.locator('#waiting:visible').waitFor();
    const code = await host.locator('#code-display').innerText();
    for (const guest of pages.slice(1)) { await guest.fill('#room-code', code); await guest.click('#join'); await guest.locator('#waiting:visible').waitFor(); }
    await host.waitForFunction(() => FruitBellApp.room()?.players.length === 4);
    for (const page of pages) await page.click('#ready');
    await host.waitForFunction(() => !document.getElementById('start').disabled); await host.click('#start');
    await Promise.all(pages.map(p => p.locator('#match:visible').waitFor()));
    await host.click('[data-emote="laugh"]');
    await Promise.all(pages.map(p => p.waitForFunction(() => [...document.querySelectorAll('.emote-bubble')].some(b => !b.hidden && b.textContent === '🤣'))));
    assert(await host.locator('[data-emote="tease"]').isDisabled());
    await pages[3].screenshot({ path: '/tmp/fruit-bell-emotes-mobile.png', fullPage: true });
    await Promise.all(pages.map(p => p.waitForFunction(() => [...document.querySelectorAll('.emote-bubble')].every(b => b.hidden))));
    await host.waitForFunction(() => FruitBellApp.state()?.round >= 1 && !FruitBellApp.state()?.pending);
    await pages[2].reload(); await pages[2].locator('#match:visible').waitFor();
    assert.equal(await pages[2].evaluate(() => FruitBellApp.room().code), code);
    // Drive the actual 90-second game using only user input. No client result submission or fixture deadline edits.
    for (const page of pages) await page.evaluate(() => {
      window.fruitBotTimer = setInterval(() => {
        const s = FruitBellApp.state(); if (!s || s.phase !== 'playing') return;
        const bell = document.getElementById('bell'), flip = document.getElementById('flip');
        if (!bell.disabled) {
          const totals = [0,0,0,0]; s.players.forEach(p => { if (p.card) totals[p.card.fruit] += p.card.count; });
          if (totals.includes(5) || s.round < 5) bell.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
        }
        if (!flip.disabled) flip.click();
      }, 250 + Math.random() * 150);
    });
    await host.screenshot({ path: '/tmp/fruit-bell-online-desktop.png', fullPage: true });
    await pages[3].screenshot({ path: '/tmp/fruit-bell-online-mobile.png', fullPage: true });
    assert(await pages[3].evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await Promise.all(pages.map(p => p.locator('#result-dialog[open]').waitFor({ timeout: 125000 })));
    assert.equal(await host.evaluate(() => FruitBellApp.room().rankingStatus), 'saved');
    const stored = (await db.doc('fruitBellRooms/' + code).get()).data();
    assert.equal(stored.rankingStatus, 'saved'); assert(stored.players.every(p => p.actions >= 1));
    for (const p of people) assert.equal((await db.doc(`fruitBellRanking/${D.VERSION}/entries/member-${p.uid}`).get()).data().games, 1);
    await host.click('#result-rank'); await host.locator('#ranking-rows .result-row').first().waitFor();
    assert.match(await host.locator('#ranking-rows').innerText(), /토끼/);
    assert.match(await host.locator('#ranking-rows').innerText(), /\d+승 \d+패 · 공동 우승 \d+회/);
    await host.screenshot({ path: '/tmp/fruit-bell-online-ranking.png', fullPage: true });
    await host.click('[data-close="ranking-dialog"]'); await host.click('#again'); await host.locator('#lobby:visible').waitFor();
    // Persistence survives browser reload, and logging out removes access to online actions.
    await host.reload(); await host.waitForFunction(() => !document.getElementById('create').disabled);
    await host.click('#rank-open'); await host.locator('#ranking-rows .result-row').first().waitFor();
    assert.match(await host.locator('#ranking-rows').innerText(), /토끼/);
    await host.click('[data-close="ranking-dialog"]');
    await host.evaluate(() => firebase.auth().signOut()); await host.waitForFunction(() => document.getElementById('create').disabled);
    assert(await host.locator('#login-link').isVisible());
    assert.deepEqual(errors, []);
    console.log('Fruit Bell online browser passed: Firebase login, four players, 90-second authoritative match, reconnect, atomic student rankings, reload, mobile and sign-out. Synthetic emulator accounts only.');
  } finally { await browser?.close(); await server.close(); await deleteApp(app); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
