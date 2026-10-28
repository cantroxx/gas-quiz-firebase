const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright-core');

(async () => {
  const source = process.env.EVENT_PUBLIC_DIR || 'public';
  const html = fs.readFileSync(`${source}/index.html`, 'utf8');
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if(url.origin !== 'http://127.0.0.1:5329') return route.fulfill({ body: '' });
      if(url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '') });
      const file = fs.existsSync(source + url.pathname) ? source + url.pathname : 'public' + url.pathname;
      return fs.existsSync(file) ? route.fulfill({ path: file }) : route.fulfill({ status: 404, body: '' });
    });
    await page.goto('http://127.0.0.1:5329/');
    await page.addScriptTag({ path: `${source}/js/app.bundle.js` });
    for(const name of ['renderEventSections', 'renderEventLoadingState', 'loadEventProgress', 'renderEventProgressFromFunctions', 'showEventView']) {
      const match = new RegExp(`^    (?:async )?function ${name}\\(`, 'm').exec(html);
      assert(match, name);
      const end = html.indexOf('\n    }', match.index) + 6;
      await page.addScriptTag({ content: html.slice(match.index, end) });
    }
    await page.evaluate(() => {
      DJ48AccountState.setCurrentMemberUserId('fixture');
      window.loads = []; window.flagLoads = 0;
      window.sample = { memberUserId: 'fixture', dateKey: '2026-09-17', weekKey: '2026-09-14', quests: [
        { questId: 'fixture-quest', title: '합성 도전', icon: '🌱', current: 2, target: 3, status: '진행 중', reward: '5코인', claimable: false }
      ], seasonEvents: [] };
      window.getEventRepository = () => ({ loadEventProgress: () => new Promise((resolve, reject) => loads.push({ resolve, reject })) });
      window.loadFeatureFlags = () => { flagLoads++; return new Promise(resolve => { window.resolveFlags = resolve; }); };
      window.isCurrentAdminMember = () => false;
      window.enterAppView = ({ viewId }) => document.querySelectorAll('.app-view').forEach(view => { view.hidden = view.id !== viewId; });
      window.showTownView = () => enterAppView({ viewId: 'town-view' });
      window.navigation = showEventView();
    });
    assert.deepEqual(await page.evaluate(() => [loads.length, flagLoads]), [1, 1], 'Progress and flags start together');
    await page.getByRole('status').getByText('이벤트 기록을 불러오는 중…').waitFor();
    await page.evaluate(() => { loads[0].resolve(sample); resolveFlags({ eventPlazaEnabled: true }); });
    const card = page.locator('#quest-card-grid .quest-card');
    await card.waitFor();
    await page.evaluate(() => { window.originalCard = document.querySelector('.quest-card'); window.navigation = showEventView(); resolveFlags({ eventPlazaEnabled: true }); });
    assert.equal(await page.evaluate(() => loads.length), 1, 'Fresh reentry has no callable');
    assert(await page.evaluate(() => originalCard === document.querySelector('.quest-card')), 'Reentry does not destroy/rebuild cards');
    await page.evaluate(() => { renderEventProgressFromFunctions(true); renderEventProgressFromFunctions(true); });
    assert.equal(await page.evaluate(() => loads.length), 2, 'Repeated refresh shares one request');
    assert(await page.evaluate(() => originalCard === document.querySelector('.quest-card')));
    await page.evaluate(() => loads[1].reject(Error('fixture offline')));
    await page.getByRole('status').getByText(/불러오지 못했어요/).waitFor();
    assert.equal(await card.count(), 1, 'Failed refresh retains last good progress');
    await page.locator('#event-refresh-button').click();
    await page.evaluate(() => loads[2].resolve({ ...sample, quests: [{ ...sample.quests[0], current: 3, status: '완료 가능', claimable: true }] }));
    await card.getByText('완료 가능', { exact: true }).waitFor();
    assert.equal(await card.locator('button').isEnabled(), true);
    await page.evaluate(() => { DJ48EventState.resetEventProgressCache(); showTownView(); });
    await page.addScriptTag({ path: `${source}/js/event-plaza-loader.js` });
    await page.evaluate(() => document.querySelector('[data-place="event"]').dispatchEvent(new Event('pointerover', { bubbles: true })));
    assert.equal(await page.evaluate(() => loads.length), 4, 'Entry intent prefetches once');
    await page.evaluate(() => { window.navigation = showEventView(); resolveFlags({ eventPlazaEnabled: true }); });
    assert.equal(await page.evaluate(() => loads.length), 4, 'Navigation shares prefetch');
    await page.evaluate(() => { DJ48AccountState.setCurrentMemberUserId('another-fixture'); loads[3].resolve(sample); });
    await page.waitForTimeout(50);
    assert.equal(await card.count(), 0, 'Late response for previous member cannot render');
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    console.log('PASS event plaza: real entry functions, parallel flags/progress, cached DOM identity, coalesced refresh, error/retry, intent prefetch, account race, mobile. Synthetic data only.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
