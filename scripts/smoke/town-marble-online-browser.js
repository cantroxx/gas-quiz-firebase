'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright-core');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
async function main() {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8181');
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9191');
  const app = initializeApp({ projectId: 'demo-dj48-rules' }, 'tm-browser'), db = getFirestore(app), auth = getAuth(app);
  const root = path.resolve(__dirname, '../../public'), people = [
    { uid: 'tmb-host', nickname: '하늘 여행가', email: 'tmb-host@example.test' },
    { uid: 'tmb-guest', nickname: '구름 친구', email: 'tmb-guest@example.test' }
  ];
  for (const p of people) {
    await auth.createUser({ uid: p.uid, email: p.email, password: 'demo-test-only-1234' });
    await db.doc('authLinks/' + p.uid).set({ memberUserId: 'member-' + p.uid });
    await db.doc('users/member-' + p.uid).set({ authUid: p.uid, nickname: p.nickname, status: 'active', active: true });
  }
  const server = http.createServer((req, res) => {
    let name = decodeURIComponent(req.url.split('?')[0]); if (name.endsWith('/')) name += 'index.html';
    const sdk = name.match(/^\/__\/firebase\/10\.12\.2\/(firebase-(?:app|auth|firestore|functions)-compat\.js)$/);
    const file = sdk ? path.resolve(__dirname, '../../node_modules/firebase', sdk[1]) : path.resolve(root, '.' + name);
    if (!sdk && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream'); res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.SMOKE_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
    const errors = [], pages = [];
    for (const person of people) {
      const context = await browser.newContext({ viewport: { width: 1366, height: 900 } }), page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + '/town-marble/?emulator=1&mode=online');
      await page.waitForFunction(() => window.firebase?.apps?.length && window.firebase.auth);
      await page.getByRole('link', { name: '퀴즈타운 로그인 후 친구와 대전할 수 있어요 →' }).waitFor();
      assert.equal(await page.getByRole('button', { name: '새로운 방 만들기' }).isDisabled(), true);
      await page.evaluate(email => firebase.auth().signInWithEmailAndPassword(email, 'demo-test-only-1234'), person.email);
      await page.waitForFunction(name => document.querySelector('.setup-panel input').value === name, person.nickname);
      await page.locator('canvas.world-canvas[data-ready=true]').waitFor(); pages.push(page);
    }
    const [host, guest] = pages;
    await host.getByRole('button', { name: '새로운 방 만들기' }).click(); await host.locator('.room-code').waitFor();
    const code = (await host.locator('.room-code').innerText()).split('\n')[0];
    await guest.getByLabel('참가할 방 코드').fill(code); await guest.getByRole('button', { name: '참가', exact: true }).click();
    await guest.locator('.room-code').waitFor();
    await host.waitForFunction(() => document.querySelectorAll('.lobby-members > div').length === 2);
    assert.equal(await host.getByRole('button', { name: '다 함께 출발하기' }).isDisabled(), true);
    for (const page of pages) await page.getByRole('button', { name: '준비 완료!', exact: true }).click();
    await host.getByRole('button', { name: '다 함께 출발하기' }).click();
    for (const page of pages) await page.locator('.action-panel').waitFor();
    assert.equal(await guest.getByRole('button', { name: '주사위 굴리기' }).count(), 0);
    await host.getByRole('button', { name: '주사위 굴리기' }).click();
    await guest.waitForFunction(() => document.querySelector('.travelling'), {}, { timeout: 10000 });
    await host.waitForFunction(() => !document.querySelector('.travelling') && !document.querySelector('.rolling'));
    const before = (await db.doc('townMarbleRooms/' + code).get()).data().game;
    assert.ok(before.revision > 0); assert.ok(before.dice.every(d => d >= 1 && d <= 6));
    if (before.phase === 'property' && !before.properties[before.players[0].position].owner) {
      await host.getByRole('button', { name: '땅 구매', exact: false }).click();
      await host.getByRole('button', { name: '별장 짓기', exact: false }).click();
    }
    await host.screenshot({ path: '/tmp/town-marble-firebase-online.png', fullPage: true });
    const version = (await db.doc('townMarbleRooms/' + code).get()).data().game.revision;
    await host.reload(); await host.getByRole('button', { name: /이어서 하기/ }).click(); await host.locator('.action-panel').waitFor();
    assert.equal((await db.doc('townMarbleRooms/' + code).get()).data().game.revision, version);
    await guest.context().setOffline(true); await guest.evaluate(() => firebase.firestore().disableNetwork());
    await guest.locator('.reconnect-banner').waitFor();
    await guest.context().setOffline(false); await guest.evaluate(() => firebase.firestore().enableNetwork());
    await guest.locator('.reconnect-banner').waitFor({ state: 'hidden' });
    // End a synthetic test match through the actual callable, then observe server-ranked results in both browsers.
    await db.doc('townMarbleRooms/' + code).update({ 'game.startedAt': Date.now() - 240000, 'game.endsAt': Date.now() - 1 });
    await host.evaluate(async code => { await firebase.app().functions('asia-northeast3').httpsCallable('townMarbleAction')({ type: 'sync', code }); }, code);
    for (const page of pages) {
      await page.locator('.results-panel').waitFor();
      await page.getByText('경기 결과가 퀴즈타운 마블 랭킹에 저장됐어요.').waitFor();
    }
    const rank = (await db.doc('townMarbleRanking/town-v1/entries/member-tmb-host').get()).data(); assert.equal(rank.games, 1);
    await host.evaluate(() => {
      const wrapper = document.createElement('section'); wrapper.id = 'ranking-board-root';
      document.body.append(wrapper);
    });
    for (const file of ['features/ranking-render', 'features/ranking-data', 'infrastructure/ranking-repository', 'ranking-visibility']) {
      await host.addScriptTag({ url: base + '/js/' + file + '.js' });
    }
    await host.evaluate(() => {
      const root = document.getElementById('ranking-board-root');
      DJ48RankingRender.renderRankingBoards(root, { boards: [{ id: 'quizKing', label: '퀴즈왕', rows: [] }] });
      root.addEventListener('click', event => DJ48RankingRender.handleRankingBoardRootClick(event));
    });
    await host.addScriptTag({ url: base + '/js/hideout-ranking-plaza.js' });
    await host.locator('[data-ranking-board-id="hideout"]').click();
    await host.locator('[data-ranking-sub-group-id="town-marble-rank"]').click();
    await host.waitForFunction(() => document.getElementById('town-marble-rank-rows')?.textContent.includes('하늘 여행가'));
    assert.equal(await host.locator('[data-ranking-sub-panel="town-marble-rank"]').isVisible(), true);
    assert.equal(await host.locator('[data-ranking-sub-group-id="town-marble-rank"]').count(), 1);
    await db.doc('townMarbleRanking/town-v1/entries/xss').set({ name: '<img src=x onerror=alert(1)>', total: rank.total, games: 1 });
    await host.getByRole('button', { name: '새로고침', exact: true }).click();
    await host.waitForFunction(() => document.getElementById('town-marble-rank-rows').textContent.includes('<img src=x'));
    assert.equal(await host.locator('#town-marble-rank-rows img[src="x"]').count(), 0);
    const ranks = await host.locator('#town-marble-rank-rows .ranking-podium-card, #town-marble-rank-rows .ranking-board-row').evaluateAll(items => items.map(item => ({ rank: item.querySelector('.ranking-medal-badge,.ranking-board-rank').textContent.replace(/[^0-9]/g, ''), total: item.querySelector('.ranking-card-score,.ranking-board-score').textContent })));
    assert.equal(new Set(ranks.filter(r => r.total === rank.total + '점').map(r => r.rank)).size, 1);
    await host.evaluate(() => firebase.auth().signOut());
    await host.getByText('퀴즈타운 로그인 후 랭킹을 볼 수 있어요.', { exact: true }).waitFor();
    assert.equal(await host.locator('#town-marble-rank-rows .ranking-podium-card, #town-marble-rank-rows .ranking-board-row').count(), 0);
    const menu = await browser.newPage({ viewport: { width: 390, height: 844 } }); await menu.goto(base + '/battle/');
    assert.equal(await menu.getByRole('link', { name: /두근두근 마블/ }).getAttribute('href'), '/town-marble/?mode=online');
    assert.equal(await menu.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log('Town Marble browser: real Auth/Functions/Firestore emulators, login gate, two accounts, ready/start, animated authoritative roll, purchase/build when applicable, reload/resume, offline recovery, server-ranked finish, ranking tab/ties/XSS/logout and mobile hub passed.');
  } finally { if (browser) await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await deleteApp(app); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
