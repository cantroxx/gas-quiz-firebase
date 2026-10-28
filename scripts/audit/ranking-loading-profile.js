#!/usr/bin/env node
'use strict';
// Synthetic accounts only. Measures the shipped loader's reads and render cost.
const fs = require('node:fs');
const vm = require('node:vm');
const { chromium } = require('playwright-core');

(async () => {
  const html = fs.readFileSync('public/index.html', 'utf8');
  const categorySource = html.slice(html.indexOf('    const POKEMON_RANKING_CATEGORY_KEYS'), html.indexOf('    const RANKING_CATEGORY_QUIZ_ID_MAP'));
  const keys = vm.runInNewContext(categorySource + '\nRANKING_PLAZA_CATEGORY_KEYS');
  const limitFor = key => key.includes('티니핑') ? 800 : key.startsWith('포켓몬') ? 240 : 40;
  console.log(JSON.stringify({ categoryQueriesBeforeFeatureFlags: keys.length, uniqueCategories: new Set(keys).size,
    duplicateCategories: keys.filter((key, index) => keys.indexOf(key) !== index), maxCategoryDocuments: keys.reduce((sum, key) => sum + limitFor(key) + 1, 0),
    profileLookupLimit: 180, beforeBaseProfileReadsAtLimit: 180 * 4, afterBaseProfileReadsAtLimit: 180 * 2 + 2 }));
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.route('**/*', route => route.fulfill({ body: '' }));
    await page.setContent('<section id="ranking-view"><div id="ranking-board-root"></div></section>');
    for(const script of ['features/ranking-render', 'features/ranking-data', 'infrastructure/ranking-repository']) await page.addScriptTag({ path: `public/js/${script}.js` });
    await page.evaluate(() => {
      window.readCounts = {}; window.renderCosts = [];
      const original = DJ48RankingRender.renderRankingRows;
      DJ48RankingRender.renderRankingRows = (...args) => {
        const start = performance.now(); const result = original(...args);
        renderCosts.push(performance.now() - start); return result;
      };
      const gameRows = Array.from({ length: 50 }, (_, i) => ({ id: `fixture-${i}`, total: 50 - i, bestScore: 50 - i }));
      const query = path => ({
        collection: name => query(`${path}/${name}`), doc: id => query(`${path}/${id}`), orderBy: () => query(path), limit: () => query(path),
        get: async () => {
          const collection = path.split('/')[0]; readCounts[collection] = (readCounts[collection] || 0) + 1;
          await new Promise(resolve => setTimeout(resolve, 40));
          if(collection === 'townMarbleRanking' || collection === 'mathsurvivorRanking') return { docs: gameRows.map(row => ({ id: row.id, data: () => row })) };
          const id = path.split('/')[1];
          const data = collection === 'presence' ? { memberUserId: id }
            : collection === 'users' ? { authUid: id, nickname: '합성 모험가', rankingMessage: '도전해요' }
              : collection === 'userLevelSummary' ? { totalXp: 500, tier: 'bronze' } : {};
          return { exists: true, data: () => data };
        }
      });
      const db = { collection: query };
      window.firebase = { firestore: () => db, auth: () => ({ currentUser: { uid: 'fixture' }, onAuthStateChanged: callback => queueMicrotask(() => callback({ uid: 'fixture' })) }),
        functions: () => ({ httpsCallable: () => async () => ({ data: { rows: [] } }) }) };
      const root = document.getElementById('ranking-board-root');
      DJ48RankingRender.renderRankingBoards(root, { boards: [{ id: 'quizKing', label: '퀴즈왕', rows: [] }] });
      root.addEventListener('click', event => DJ48RankingRender.handleRankingBoardRootClick(event));
    });
    for(const script of ['ranking-visibility', 'hideout-ranking-plaza']) await page.addScriptTag({ path: `public/js/${script}.js` });
    await page.click('[data-ranking-board-id="hideout"]');
    for(const field of ['town-marble-rank', 'mathsurvivor-rank', 'town-marble-rank']) {
      await page.evaluate(() => { readCounts = {}; renderCosts = []; });
      await page.click(`[data-ranking-sub-group-id="${field}"]`);
      await page.waitForFunction(id => document.getElementById(`${id}-rows`).querySelectorAll('.ranking-podium-card,.ranking-board-row').length === 50, field);
      console.log(JSON.stringify(await page.evaluate(id => ({ field: id, fixtureRows: 50, reads: readCounts,
        totalReadOperations: Object.values(readCounts).reduce((sum, count) => sum + count, 0),
        renderOnlyMs: Math.round(renderCosts.reduce((sum, value) => sum + value, 0) * 100) / 100 }), field)));
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
