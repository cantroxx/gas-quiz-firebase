'use strict';

// Isolated local-file fixtures only. All browser requests are intercepted.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const publicRoot = path.resolve(process.env.COORDI_PUBLIC_DIR || path.resolve(__dirname, '../../public'));
const prices = require('../../functions/coordi-shop/catalog.json');
const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9X8AAAAASUVORK5CYII=';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }

async function fixture(browser, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const gates = { catalogs: deferred(), status: deferred() };
  const calls = [], errors = [];
  let catalogsStarted = 0;
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if(url.origin !== 'https://coordi-loading.test') return route.fulfill({ status: 404, body: '' });
    if(url.pathname === '/fixture') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html>
      <script>
      window.DJ48AccountState={getCurrentMemberUserId:()=> 'synthetic'};
      window.DJ48Firebase={getFirebaseFunctions:()=>({httpsCallable:name=>async data=>{
        const response=await fetch('/fixture/call',{method:'POST',body:JSON.stringify({name,data})});
        if(!response.ok) throw new Error('합성 연결 실패');
        return response.json();
      }})};</script><iframe title="상점" src="/coordi-shop/"></iframe>` });
    if(url.pathname === '/fixture/call') {
      const call = JSON.parse(route.request().postData());
      calls.push(call);
      if(call.data.action === 'status') {
        if(options.timed) await sleep(400); else await gates.status.promise;
        if(options.failStatus) return route.fulfill({ status: 503, body: '{}' });
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: {
          balance: 1000, purchaseCoupons: 20, prices, version: 'synthetic',
          profile: { owned: [], prisms: {}, look: { gender: 'female', equipped: {} } }
        } }) });
      }
      if(call.name === 'renderCoordiShopPreview') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { success: true, hash: 'fixture', imageUrl: pixel } }) });
      return route.fulfill({ status: 400, body: '{}' });
    }
    if(url.pathname.startsWith('/coordi-shop/data/') && url.pathname.endsWith('.json')) {
      catalogsStarted++;
      if(options.timed) await sleep(400); else await gates.catalogs.promise;
    }
    const file = url.pathname === '/coordi-shop/dressing-room.js' && options.script
      ? options.script
      : path.resolve(publicRoot, '.' + (url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname));
    if((!file.startsWith(publicRoot + '/') && file !== options.script) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
    const contentType = { '.js': 'application/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(file)] || 'text/html; charset=utf-8';
    return route.fulfill({ path: file, contentType });
  });
  const start = Date.now();
  await page.goto('https://coordi-loading.test/fixture', { waitUntil: 'domcontentloaded' });
  return {
    page, frame: page.frameLocator('iframe'), gates, calls, errors, start,
    catalogsStarted: () => catalogsStarted,
    async close() { gates.catalogs.resolve(); gates.status.resolve(); await context.close(); }
  };
}

async function waitUntil(predicate) {
  const deadline = Date.now() + 5000;
  while(!predicate()) {
    assert(Date.now() < deadline, 'Member lookup must start while catalogs are still pending');
    await sleep(20);
  }
}

async function checkOrder(browser, order) {
  const f = await fixture(browser, { failStatus: order === 'status-error' });
  try {
    await waitUntil(() => f.catalogsStarted() === 4 && f.calls.some(c => c.data.action === 'status'));
    f.gates[order === 'catalogs-first' ? 'catalogs' : 'status'].resolve();
    await sleep(100);
    for(const id of ['coordi-buy', 'coordi-buy-coupon', 'coordi-equip']) {
      assert(await f.frame.locator('#' + id).isDisabled(), `${order}: ${id} stays disabled until both are ready`);
      await f.frame.locator('#' + id).dispatchEvent('click');
    }
    assert.equal(f.calls.filter(c => ['purchase', 'equip', 'dye'].includes(c.data.action)).length, 0);
    assert.deepEqual(f.errors, [], 'Early rejection must be handled while catalogs are pending');
    f.gates.catalogs.resolve(); f.gates.status.resolve();
    if(order === 'status-error') {
      await f.frame.locator('#coordi-commerce-status').filter({ hasText: '합성 연결 실패' }).waitFor();
      assert(await f.frame.locator('#coordi-buy').isDisabled());
    } else {
      await f.frame.locator('#coordi-wallet').filter({ hasText: '1,000' }).waitFor();
      assert(await f.frame.locator('#coordi-buy').isEnabled());
      assert.equal(await f.frame.locator('#coordi-commerce-status').textContent(), '');
    }
    assert.equal(f.calls.filter(c => c.data.action === 'status').length, 1);
    assert.deepEqual(f.errors, []);
    console.log(`PASS ${order}: concurrent reads, completion gate, single member lookup, no unintended mutation`);
  } finally { await f.close(); }
}

async function measure(browser, script) {
  const f = await fixture(browser, { timed: true, script });
  try {
    await f.frame.locator('#coordi-wallet').filter({ hasText: '1,000' }).waitFor();
    return Date.now() - f.start;
  } finally { await f.close(); }
}

module.exports = { fixture, measure };

if(require.main === module) (async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    for(const order of ['status-first', 'catalogs-first', 'status-error']) await checkOrder(browser, order);
    const baselineMs = process.env.COORDI_LOADING_BASELINE ? await measure(browser, path.resolve(process.env.COORDI_LOADING_BASELINE)) : undefined;
    const updatedMs = await measure(browser);
    console.log(JSON.stringify({ fixture: 'Synthetic local browser; each catalog and status delayed 400ms. Not production latency.', baselineMs, updatedMs }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
