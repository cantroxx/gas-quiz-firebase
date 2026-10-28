'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { createServer } = require('../../functions/fruit-bell/local-server');
async function main() {
  const server = createServer(), url = await server.listen();
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.SMOKE_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
    const errors = [], pages = [];
    for (let i = 0; i < 4; i++) {
      const context = await browser.newContext({ viewport: i === 3 ? { width: 390, height: 844 } : { width: 1280, height: 1000 }, reducedMotion: i === 3 ? 'reduce' : 'no-preference' });
      await context.route('**/*', route => new URL(route.request().url()).origin === url ? route.continue() : route.abort());
      const page = await context.newPage(); pages.push(page); page.on('pageerror', error => errors.push(error.message));
      await page.goto(url + '/fruit-bell/'); await page.waitForFunction(() => !document.getElementById('create').disabled);
    }
    const a = pages[0];
    await a.screenshot({ path: '/tmp/fruit-bell-lobby.png', fullPage: true });
    await a.click('#practice'); await a.waitForFunction(() => FruitBellApp.state()?.event.type === 'reveal');
    assert.equal(await a.locator('.seat').count(), 4);
    assert.equal(await a.locator('#mode-label').innerText(), '동물 친구와 연습 · 랭킹 제외');
    await a.screenshot({ path: '/tmp/fruit-bell-practice.png', fullPage: true });
    await a.click('#leave'); await a.click('#confirm-leave'); await a.locator('#lobby:visible').waitFor();
    await a.fill('#nickname', '토끼'); await a.click('#create'); await a.locator('#waiting:visible').waitFor();
    const code = await a.locator('#code-display').innerText();
    for (let i = 1; i < 4; i++) { await pages[i].fill('#nickname', ['','곰','냥이','개굴'][i]); await pages[i].fill('#room-code', code); await pages[i].click('#join'); await pages[i].locator('#waiting:visible').waitFor(); }
    for (const page of pages) await page.click('#ready');
    await a.waitForFunction(() => !document.getElementById('start').disabled); await a.click('#start');
    await Promise.all(pages.map(page => page.locator('#match:visible').waitFor()));
    await a.click('[data-emote="tease"]');
    await Promise.all(pages.map(page => page.waitForFunction(() => [...document.querySelectorAll('.emote-bubble')].some(b => !b.hidden && b.textContent === '😜'))));
    assert(await a.locator('[data-emote="laugh"]').isDisabled());
    await a.waitForFunction(() => FruitBellApp.state()?.event.type === 'reveal');
    const firstFaces = await Promise.all(pages.map(page => page.evaluate(() => FruitBellApp.state().players.map(p => p.card))));
    firstFaces.forEach(faces => assert.deepEqual(faces, firstFaces[0]));
    await pages[2].reload(); await pages[2].locator('#match:visible').waitFor();
    assert.equal(await pages[2].evaluate(() => FruitBellApp.room().code), code, 'Reload resumes same server session');
    const live = server.rooms.get(code).game;
    live.pending = null; live.contest = null; live.round++; live.locked = []; live.turn = 1;
    live.nextFlipAt = Date.now() + 10000; live.revealAt = Date.now() - 1000;
    live.players.forEach(p => { p.pile = []; });
    live.players[0].pile = [{ fruit: 0, count: 2 }]; live.players[1].pile = [{ fruit: 0, count: 3 }];
    live.event = { id: live.event.id + 1, type: 'reveal', text: '테이블 위 과일을 살펴봐요.' }; live.revision++;
    await a.evaluate(() => fetch('/api/fruit-bell/flip', { method: 'POST', body: '{}' }));
    await a.waitForFunction(() => FruitBellApp.state().players[1].card?.count === 3 && !document.getElementById('bell').disabled);
    assert.equal(await a.evaluate(() => {
      const bell = document.getElementById('bell'); bell.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true })); return bell.classList.contains('ringing');
    }), true, 'Bell visual acknowledges input synchronously before server result');
    await Promise.all(pages.map(page => page.waitForFunction(() => FruitBellApp.state().event.type === 'win')));
    assert.equal(live.players[0].hits, 1); assert(live.players.every(p => !p.pile.length));
    await a.keyboard.down('Space'); await a.keyboard.down('Space'); await a.keyboard.up('Space'); assert.equal(live.players[0].hits, 1);
    // Populate visible cards for visual inspection without changing the result rules.
    live.turn = 1; live.pending = null; live.round++; live.locked = []; live.revealAt = Date.now() - 1000; live.nextFlipAt = Date.now() + 10000;
    live.players.forEach((p, i) => { p.pile = [{ fruit: i, count: i + 1 }]; });
    live.event = { id: live.event.id + 1, type: 'reveal', text: '테이블 위 과일을 살펴봐요.' }; live.revision++;
    await a.evaluate(() => fetch('/api/fruit-bell/flip', { method: 'POST', body: '{}' }));
    await Promise.all(pages.map(page => page.waitForFunction(() => FruitBellApp.state().players[3].card?.count === 4 && !document.getElementById('bell').disabled)));
    await a.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await a.waitForFunction(() => !document.querySelector('.flight-card'));
    await a.screenshot({ path: '/tmp/fruit-bell-table-desktop.png', fullPage: true });
    await pages[3].screenshot({ path: '/tmp/fruit-bell-table-mobile.png', fullPage: true });
    assert(await pages[3].evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const bell = await pages[3].locator('#bell').boundingBox(); assert(bell.y + bell.height < 844);
    await pages[3].locator('#bell').dispatchEvent('pointerdown', { button: 0 });
    await pages[3].waitForFunction(() => FruitBellApp.state().event.type === 'miss');
    assert.equal(live.players[3].misses, 1);
    live.endsAt = Date.now() + 20;
    await Promise.all(pages.map(page => page.locator('#result-dialog[open]').waitFor()));
    await a.click('#result-rank'); await a.locator('#ranking-rows .result-row').first().waitFor();
    assert.equal(await a.locator('#ranking-rows .result-row').count(), 4);
    assert.match(await a.locator('#ranking-rows').innerText(), /\d+승 \d+패 · 공동 우승 \d+회/);
    await a.screenshot({ path: '/tmp/fruit-bell-results.png', fullPage: true });
    await a.click('[data-close="ranking-dialog"]'); await a.click('#again'); await a.locator('#lobby:visible').waitFor();
    assert.equal(server.ranking.list().length, 4);
    // Exercise the real Quiztown ranking renderer with the new local board, no Firebase SDK.
    const rankPage = await browser.newPage();
    rankPage.on('pageerror', error => errors.push(error.message));
    await rankPage.route(url + '/rank-fixture', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>' }));
    await rankPage.goto(url + '/rank-fixture');
    await rankPage.evaluate(() => {
      document.body.innerHTML = '<div id="ranking-board-root"></div>';
      window.DJ48RankingVisibility = { register: (id, callback) => { window.localRankLoad = window.localRankLoad || {}; window.localRankLoad[id] = callback; } };
    });
    for (const file of ['features/ranking-render.js', 'hideout-ranking-plaza.js']) {
      if (file.startsWith('hideout')) await rankPage.evaluate(() => {
        DJ48RankingRender.renderRankingBoards(document.getElementById('ranking-board-root'), { boards: [{ id: 'quizKing', label: '퀴즈왕', rows: [] }] });
        document.getElementById('ranking-board-root').addEventListener('click', event => DJ48RankingRender.handleRankingBoardRootClick(event));
      });
      await rankPage.addScriptTag({ url: url + '/js/' + file });
    }
    await rankPage.click('[data-ranking-board-id="hideout"]'); await rankPage.click('[data-ranking-sub-group-id="fruit-bell-rank"]');
    await rankPage.evaluate(() => localRankLoad['fruit-bell-rank-rows']());
    assert.match(await rankPage.locator('#fruit-bell-rank-rows').innerText(), /1판/);
    assert.match(await rankPage.locator('#fruit-bell-rank-rows').innerText(), /토끼/);
    assert.match(await rankPage.locator('#fruit-bell-rank-rows').innerText(), /\d+승 \d+패 · 공동 우승 \d+회/);
    assert.deepEqual(errors, []);
    console.log('Fruit bell browser smoke passed: practice, four clients, reconnect, immediate input, authority, mobile, results and Quiztown ranking.');
  } finally { await browser?.close(); await server.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
