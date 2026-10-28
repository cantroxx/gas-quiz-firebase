const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const source = process.env.RANKING_PUBLIC_DIR || 'public';
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if(url.origin !== 'http://127.0.0.1:5328') return route.fulfill({ body: '' });
      if(url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: fs.readFileSync(source + '/index.html', 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '') });
      const file = fs.existsSync(source + url.pathname) ? source + url.pathname : 'public' + url.pathname;
      return fs.existsSync(file) ? route.fulfill({ path: file }) : route.fulfill({ status: 404, body: '' });
    });
    await page.goto('http://127.0.0.1:5328/');
    const rankingScripts = process.env.HIDEOUT_BUNDLE === '1' ? ['app.bundle'] : ['features/ranking-render', 'features/ranking-data', 'infrastructure/ranking-repository', 'data/level-medal-assets'];
    for(const file of rankingScripts) {
      await page.addScriptTag({ path: `${source}/js/${file}.js` });
    }
    await page.evaluate(() => {
      window.reads = []; window.failRanking = false; window.delayRanking = 0;
      const docs = {};
      for(let i = 1; i <= 5; i++) {
        docs[`users/member-${i}`] = { authUid: `uid-${i}`, nickname: `모험가${i}`, profileImageUrl: '/favicon.svg', rankingMessage: `오늘도 도전 ${i}`, selectedTitleName: '배움의 탐험가' };
        docs[`userLevelSummary/member-${i}`] = { totalXp: 50 * i, tier: 'bronze', medalId: 'bronze-02' };
        docs[`presence/uid-${i}`] = { memberUserId: `member-${i}` };
      }
      docs['presence/spoof'] = { memberUserId: 'member-1' };
      const rows = Array.from({ length: 5 }, (_, i) => ({ id: `uid-${i + 1}`, name: '이전 이름', bestScore: 500 - i * 100, score: 500 - i * 100, sortKey: 500 - i * 100, total: i < 2 ? 12 : 10 - i, games: 3, plays: 4, floor: 5, accPct: 80, accuracy: 90 }));
      const lists = {
        mathsurvivorRanking: rows,
        'cloudTowerRanking/cloud-120-v1/entries': rows.concat({ id: 'spoof', nickname: '연결 없는 친구', sortKey: 1, score: 1 }),
        'townMarbleRanking/town-v1/entries': rows.map((row, i) => ({ ...row, id: `member-${i + 1}` })).concat({ id: 'xss', name: '<img src=x onerror=alert(1)>', total: 1 })
      };
      const snapshot = (id, value) => ({ id, exists: Boolean(value), data: () => value });
      const query = path => ({
        doc: id => query(`${path}/${id}`), collection: name => query(`${path}/${name}`),
        orderBy: () => query(path), limit: () => query(path),
        get: async () => {
          reads.push(path);
          if(lists[path]) {
            if(delayRanking) await new Promise(resolve => setTimeout(resolve, delayRanking));
            if(failRanking) throw Error('fixture-offline');
            return { docs: lists[path].map(row => snapshot(row.id, row)) };
          }
          return snapshot(path.split('/').pop(), docs[path]);
        }
      });
      const auth = { currentUser: { uid: 'viewer' }, onAuthStateChanged: callback => { window.authChanged = callback; queueMicrotask(() => callback(auth.currentUser)); } };
      const db = { collection: query };
      window.firebase = { auth: () => auth, firestore: () => db, functions: () => ({ httpsCallable: name => async payload => {
        reads.push(`${name}/${payload.tier}`);
        if(payload.tier === 'intermediate') await new Promise(resolve => setTimeout(resolve, 200));
        return { data: { rows: payload.tier === 'advanced' ? [] : [{ memberUserId: 'member-1', nickname: '이전 이름', rank: 1, bosses: 2, rooms: 12, correct: 3, attempts: 4 }] } };
      } }) };
      document.querySelectorAll('.app-view').forEach(view => { view.hidden = view.id !== 'ranking-view'; });
      const root = document.getElementById('ranking-board-root');
      window.renderFixture = () => DJ48RankingRender.renderRankingBoards(root, { boards: [{ id: 'quizKing', label: '퀴즈왕', rows: [] }] });
      renderFixture(); root.addEventListener('click', event => DJ48RankingRender.handleRankingBoardRootClick(event));
    });
    for(const file of ['ranking-visibility', 'hideout-ranking-plaza']) await page.addScriptTag({ path: fs.existsSync(`${source}/js/${file}.js`) ? `${source}/js/${file}.js` : `public/js/${file}.js` });
    const board = page.locator('[data-ranking-board-panel="hideout"]');
    await page.click('[data-ranking-board-id="hideout"]');
    assert.deepEqual(await board.locator('[data-ranking-sub-group-id]').allTextContents(), ['🌗 스터디 타운', '✏️ 퀴즈 서바이버', '🎲 두근두근 마블', '☁️ 타닥타닥 구름탑', '🔔 딩동! 과일종']);
    assert.equal(await board.locator('a').count(), 0, 'Ranking fields have no game launch links');
    const study = page.locator('#study-town-rank-rows');
    await study.locator('.ranking-podium-card').waitFor();
    assert.match(await study.innerText(), /보스 2명 · 방 12개/);
    assert.match(await study.innerText(), /첫 정답률 75%/);
    assert.match(await study.innerText(), /오늘도 도전 1/);
    await board.getByRole('button', { name: '중수', exact: true }).click();
    await board.getByRole('button', { name: '고수', exact: true }).click();
    await page.waitForTimeout(250);
    assert.match(await study.innerText(), /아직 표시할 기록이 없어요/);
    await board.getByRole('button', { name: '초보', exact: true }).click();
    await study.locator('.ranking-podium-card').waitFor();
    assert.equal(await page.evaluate(() => reads.filter(path => path === 'studyTownAction/beginner').length), 1, 'Cached tier avoids another callable');
    await page.click('[data-ranking-sub-group-id="mathsurvivor-rank"]');
    const survivor = page.locator('#mathsurvivor-rank-rows');
    await survivor.locator('.ranking-podium-card').first().waitFor();
    assert.equal(await survivor.locator('.ranking-podium-card').count(), 3);
    assert.equal(await survivor.locator('.ranking-board-row').count(), 2);
    assert.equal(await survivor.locator('.ranking-avatar img').count(), 5);
    assert.equal(await survivor.locator('.ranking-level-badge').count(), 5);
    assert.equal(await survivor.locator('.ranking-title-chip').count(), 5);
    assert.equal(await survivor.locator('.ranking-card-message-inline').count(), 5);
    assert.match(await survivor.innerText(), /브론즈 등급/);
    assert(!(await survivor.innerText()).includes('이전 이름'));
    await page.screenshot({ path: '/tmp/hideout-ranking-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: '/tmp/hideout-ranking-mobile.png', fullPage: true });
    await page.click('[data-ranking-sub-group-id="town-marble-rank"]');
    const marble = page.locator('#town-marble-rank-rows');
    await marble.locator('.ranking-podium-card').first().waitFor();
    assert.deepEqual(await marble.locator('.ranking-medal-badge').allTextContents(), ['🥇 1위', '🥇 1위', '🥉 3위']);
    assert.match(await marble.innerText(), /<img src=x onerror=alert\(1\)>/);
    assert.equal(await marble.locator('img[src="x"]').count(), 0);
    await page.evaluate(() => renderFixture());
    await board.waitFor({ state: 'visible' });
    await marble.locator('.ranking-podium-card').first().waitFor();
    assert.equal(await board.locator('[data-ranking-sub-group-id]').count(), 5);
    assert.equal(await page.evaluate(() => reads.filter(path => path === 'townMarbleRanking/town-v1/entries').length), 1, 'Rerender reuses game rows');
    assert.equal(await page.evaluate(() => reads.filter(path => /^(userRoomSettings|userTitleSummary|userTitles)\//.test(path)).length), 0, 'Friends require no private profile reads');
    assert(await page.locator('[data-ranking-sub-panel="town-marble-rank"]').isVisible());
    assert(!(await page.locator('[data-ranking-board-panel="quizKing"]').isVisible()));
    await page.click('[data-ranking-sub-group-id="cloud-tower-rank"]');
    const cloud = page.locator('#cloud-tower-rank-rows');
    await cloud.locator('.ranking-podium-card').first().waitFor();
    const unmatched = cloud.locator('.ranking-board-row').last();
    assert.match(await unmatched.innerText(), /연결 없는 친구/);
    assert.equal(await unmatched.locator('.ranking-level-badge,.ranking-card-message-inline').count(), 0, 'Unverified identity must not borrow another profile');
    await page.evaluate(() => { failRanking = true; });
    await board.getByRole('button', { name: '새로고침' }).filter({ visible: true }).click();
    await cloud.getByText(/랭킹을 불러오지 못했어요/).waitFor();
    assert.equal(await cloud.locator('.ranking-podium-card').count(), 3, 'Failed refresh preserves cached rows');
    await page.evaluate(() => { failRanking = false; });
    await board.getByRole('button', { name: '새로고침' }).filter({ visible: true }).click();
    await cloud.locator('.ranking-podium-card').first().waitFor();
    await page.evaluate(() => { delayRanking = 150; });
    await board.getByRole('button', { name: '새로고침' }).filter({ visible: true }).click();
    await page.evaluate(() => { firebase.auth().currentUser = null; authChanged(null); });
    await page.waitForTimeout(250);
    assert.match(await cloud.innerText(), /로그인 후/);
    assert.equal(await board.locator('.ranking-podium-card').count(), 0, 'Sign-out clears all cached profiles and late requests');
    assert(!(await page.evaluate(() => reads)).some(path => /^(wordbattleRanking|marbleRanking|geosangRanking)/.test(path)));
    assert.deepEqual(errors, []);
    console.log('PASS hideout rankings: five fields, lazy reads, shared profile cards, verified UID mapping, ties, rerender state, XSS, error retry, sign-out race, desktop/mobile. Synthetic data only.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
