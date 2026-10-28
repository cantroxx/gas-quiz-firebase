'use strict';
// Public read-only production verification. Never signs in or creates student records.
const assert = require('node:assert/strict'), fs = require('node:fs'), crypto = require('node:crypto');
const { chromium } = require('playwright-core');
const base = 'https://dj48-quiztown-firebase.web.app';
async function main() {
  const planPath = (process.env.FRUIT_BELL_RELEASE_STAGE || '/tmp/fruit-bell-release') + '/hosting-plan.json';
  if (fs.existsSync(planPath)) {
    const plan = JSON.parse(fs.readFileSync(planPath));
    for (const [file, hash] of Object.entries(plan.rawHashes)) {
      const response = await fetch(base + '/' + file + '?fruit-bell-verify=' + Date.now()); assert(response.ok, file);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), hash, 'Live file differs: ' + file);
    }
  }
  const endpoint = 'https://asia-northeast3-dj48-quiztown-firebase.cloudfunctions.net/fruitBellAction';
  const result = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { action: 'profile' } }) });
  assert.equal(result.status, 401); assert.equal((await result.json()).error.status, 'UNAUTHENTICATED');
  const browser = await chromium.launch({ executablePath: process.env.SMOKE_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/fruit-bell/'); await page.locator('#login-link:visible').waitFor();
    assert(await page.locator('#create').isDisabled()); assert(await page.locator('#join').isDisabled());
    await page.click('#rank-open'); assert.match(await page.locator('#ranking-rows').innerText(), /로그인/);
    await page.click('[data-close="ranking-dialog"]');
    await page.screenshot({ path: '/tmp/fruit-bell-live-lobby.png', fullPage: true });
    await page.click('#practice'); await page.waitForFunction(() => FruitBellApp.state()?.event.type === 'reveal');
    assert.equal(await page.locator('.seat').count(), 4);
    assert.equal(await page.locator('[data-emote]').count(), 4);
    await page.locator('[data-emote="clap"]').focus(); await page.keyboard.press('Space');
    await page.waitForFunction(() => [...document.querySelectorAll('.emote-bubble')].some(b => !b.hidden && b.textContent === '👏'));
    assert(await page.locator('[data-emote="laugh"]').isDisabled());
    await page.screenshot({ path: '/tmp/fruit-bell-live-practice.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: '/tmp/fruit-bell-live-mobile.png', fullPage: true });
    assert.deepEqual(errors, []);
    console.log('Fruit Bell production read-only smoke passed: exact Hosting candidate hashes, unauthenticated callable denial, login gate, practice, desktop/mobile and no page errors. No student records written.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
