const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent('<div id="ranking-card-grid"></div><div id="ranking-board-root"></div>');
    const source = process.env.RANKING_PUBLIC_DIR || 'public';
    for(const file of ['app.bundle', 'ranking-plaza-loader']) await page.addScriptTag({ path: `${source}/js/${file}.js` });
    await page.evaluate(() => {
      window.calls = []; window.pending = {}; window.activeBoard = 'quizKing'; window.scope = 'member-a';
      const ids = ['quizKing', 'season', 'korean', 'social', 'math', 'science', 'popular', 'pokemon', 'tiniping'];
      const cardIds = ['quiz_king', 'korean_king', 'social_king', 'math_king', 'science_king', 'popular_king', 'pokemon_king', 'tiniping_king'];
      const boards = () => ids.map(id => ({ id, label: id, rows: [] }));
      window.resolveBoard = id => {
        pending[id].resolve({ cards: cardIds.map(rankId => ({ rankId, nickname: '합성 1등' })), boards: boards().map(board => ({ ...board, rows: [{ nickname: '합성 기록', score: 100 }] })) });
      };
      const renderDeps = {
        getRankingRowsForGroup: group => group.rows || [],
        getActiveRankingBoardId: () => activeBoard,
        onRankingBoardSelect: id => { activeBoard = id; DJ48RankingPlaza.select(id); }
      };
      window.fixtureDeps = {
        scope: () => scope, fallbackCards: cardIds.map(rankId => ({ rankId })), emptyBoards: boards,
        activeBoard: () => activeBoard, setModel: model => { window.currentModel = model; },
        renderCards: DJ48RankingRender.renderRankingCards,
        renderBoards: model => DJ48RankingRender.renderRankingBoards(document.getElementById('ranking-board-root'), model, renderDeps),
        renderPanel: (panel, board) => DJ48RankingRender.renderRankingBoardPanel(panel, board, renderDeps),
        loadBoard: id => { calls.push(id); return new Promise((resolve, reject) => { pending[id] = { resolve, reject }; }); }
      };
      document.getElementById('ranking-board-root').addEventListener('click', event => DJ48RankingRender.handleRankingBoardRootClick(event, renderDeps));
      DJ48RankingPlaza.show(fixtureDeps);
    });
    assert.equal(await page.locator('[data-ranking-board-id]').count(), 9, 'Tabs exist while reads are unresolved');
    const initial = await page.evaluate(() => calls.slice());
    assert(initial.includes('quizKing'));
    assert(initial.length <= 2, 'Only active and featured boards load initially');
    assert(!initial.includes('season'), 'Season event scan cannot block the initial view');
    await page.click('[data-ranking-board-id="math"]');
    await page.evaluate(() => resolveBoard('math'));
    const math = page.locator('[data-ranking-board-panel="math"]');
    await math.locator('.ranking-podium-card').waitFor();
    assert.match(await math.innerText(), /합성 기록/);
    await page.click('[data-ranking-board-id="quizKing"]');
    await page.click('[data-ranking-board-id="math"]');
    assert.equal(await page.evaluate(() => calls.filter(id => id === 'math').length), 1, 'Reentry reuses loaded rows');
    await page.click('[data-ranking-refresh="math"]');
    assert.equal(await math.locator('.ranking-podium-card').count(), 1, 'Refresh keeps old rows');
    await page.evaluate(() => pending.math.reject(Error('fixture offline')));
    await math.getByText(/기록을 불러오지 못했어요/).waitFor();
    assert.equal(await math.locator('.ranking-podium-card').count(), 1);
    await page.click('[data-ranking-refresh="math"]');
    await page.evaluate(() => resolveBoard('math'));
    await page.waitForFunction(() => !document.querySelector('[data-ranking-refresh="math"]').disabled);
    // Resolve other initial work before testing expiration.
    await page.evaluate(() => calls.filter(id => id !== 'math').forEach(resolveBoard));
    await page.evaluate(() => { const now = Date.now; Date.now = () => now() + 61000; });
    await page.click('[data-ranking-board-id="quizKing"]');
    await page.click('[data-ranking-board-id="math"]');
    assert.equal(await page.evaluate(() => calls.filter(id => id === 'math').length), 4, 'Expired list refreshes');
    assert.equal(await math.locator('.ranking-podium-card').count(), 1);
    // A late response for the previous account must not populate the new scope.
    await page.evaluate(() => {
      const old = pending.math;
      scope = 'member-b'; DJ48RankingPlaza.show(fixtureDeps);
      old.resolve({ cards: [], boards: [{ id: 'math', rows: [{ nickname: '이전 계정', score: 1 }] }] });
    });
    assert.equal(await math.locator('.ranking-podium-card').count(), 0);
    await page.evaluate(() => resolveBoard('math'));
    await math.locator('.ranking-podium-card').waitFor();
    assert(!(await math.innerText()).includes('이전 계정'));
    await page.locator('.ranking-hall-summary').click();
    await page.waitForFunction(() => ['quizKing', 'korean', 'social', 'math', 'science', 'popular', 'pokemon', 'tiniping'].every(id => calls.includes(id)));
    assert(!await page.evaluate(() => calls.includes('season')), 'Opening hall does not scan season events');
    assert.deepEqual(errors, []);
    console.log('PASS incremental ranking: immediate tabs, selected field reads, no season blocking, TTL, refresh keeps rows, retry, account race, hall on demand.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
