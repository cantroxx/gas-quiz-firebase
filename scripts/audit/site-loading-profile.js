#!/usr/bin/env node
'use strict';

// Public static-shell audit only. No account login, backend reads, or writes.
// CDP blocking (instead of Playwright routing) preserves normal HTTP caching.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright-core');
const ROOT = path.resolve(__dirname, '../..');
const BASE = process.env.SITE_PROFILE_BASE || 'https://dj48-quiztown-firebase.web.app';
const SAMPLES = Math.max(1, Number(process.env.SITE_PROFILE_SAMPLES || 1));
const BLOCKED = [
  '*identitytoolkit.googleapis.com*', '*securetoken.googleapis.com*',
  '*firestore.googleapis.com*', '*firebasestorage.googleapis.com*',
  '*cloudfunctions.net*', '*run.app*', '*firebaseio.com*',
  '*storage.googleapis.com*', `${BASE}/api/*`
];
const round = n => Math.round(n * 10) / 10;
const sha = buffer => crypto.createHash('sha256').update(buffer).digest('hex');

async function measure(browser, scenario) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: BLOCKED });
  if(scenario.throttled) {
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 80,
      downloadThroughput: 4 * 1000 * 1000 / 8,
      uploadThroughput: 1000 * 1000 / 8
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  await page.addInitScript(() => {
    window.__loadingAudit = { longTasks: [], lcp: [] };
    new PerformanceObserver(list => list.getEntries().forEach(e => {
      window.__loadingAudit.longTasks.push({ start: e.startTime, duration: e.duration });
    })).observe({ type: 'longtask', buffered: true });
    new PerformanceObserver(list => list.getEntries().forEach(e => {
      window.__loadingAudit.lcp.push({ time: e.startTime, tag: e.element?.tagName, id: e.element?.id });
    })).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  const runs = [];
  for(let run = 0; run < (scenario.repeat || 1); run++) {
    const network = new Map();
    const errors = [];
    const responses = event => {
      const r = event.response;
      network.set(event.requestId, {
        url: r.url.split('?')[0], type: event.type, status: r.status,
        cacheControl: r.headers['cache-control'] || r.headers['Cache-Control'] || '',
        encoding: r.headers['content-encoding'] || '',
        diskCache: !!r.fromDiskCache, serviceWorker: !!r.fromServiceWorker
      });
    };
    const finished = event => {
      const row = network.get(event.requestId);
      if(row) row.wireBytes = event.encodedDataLength;
    };
    const failed = event => {
      errors.push({ blockedReason: event.blockedReason || '', error: event.errorText });
    };
    cdp.on('Network.responseReceived', responses);
    cdp.on('Network.loadingFinished', finished);
    cdp.on('Network.loadingFailed', failed);
    await page.goto(`${BASE}${scenario.pathname}`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(2200);
    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return {
        ttfb: nav.responseStart, domContentLoaded: nav.domContentLoadedEventEnd,
        load: nav.loadEventEnd, documentDecodedBytes: nav.decodedBodySize,
        documentTransferBytes: nav.transferSize,
        paints: performance.getEntriesByType('paint').map(e => ({ name: e.name, time: e.startTime })),
        ...window.__loadingAudit,
        resources: performance.getEntriesByType('resource').map(e => ({
          url: e.name.split('?')[0], initiator: e.initiatorType, start: e.startTime,
          duration: e.duration, transfer: e.transferSize,
          encoded: e.encodedBodySize, decoded: e.decodedBodySize
        }))
      };
    });
    const entries = [...network.values()];
    const result = {
      scenario: scenario.name, run: run === 0 ? 'cold' : 'warm-revisit',
      timing, network: entries, failures: errors,
      summary: {
        documentStatus: entries.find(e => e.type === 'Document')?.status || null,
        ttfbMs: round(timing.ttfb), dclMs: round(timing.domContentLoaded), loadMs: round(timing.load),
        fcpMs: round(timing.paints.find(e => e.name === 'first-contentful-paint')?.time || 0),
        lcpMs: round(timing.lcp.at(-1)?.time || 0),
        responses: entries.length, wireBytes: entries.reduce((sum, e) => sum + (e.wireBytes || 0), 0),
        longTaskCount: timing.longTasks.length,
        longTaskBlockingMs: round(timing.longTasks.reduce((sum, e) => sum + Math.max(0, e.duration - 50), 0)),
        fontBytes: entries.filter(e => e.type === 'Font').reduce((sum, e) => sum + (e.wireBytes || 0), 0)
      }
    };
    runs.push(result);
    console.log(JSON.stringify({ scenario: scenario.name, run: result.run, ...result.summary }));
    cdp.off('Network.responseReceived', responses);
    cdp.off('Network.loadingFinished', finished);
    cdp.off('Network.loadingFailed', failed);
  }
  await context.close();
  return runs;
}

async function comparePublicAssets() {
  const paths = [
    '/', '/js/app.bundle.js', '/styles.css', '/classroom.css', '/housing/index.html',
    '/housing/app.js', '/housing/housing-data.js', '/coordi-shop/town-bridge.js',
    '/coordi-shop/dressing-room.js', '/coordi-shop/data/maple-cosmetics-catalog.json',
    '/coordi-shop/data/verified-top50.json',
    '/js/application/classroom-usecases.js', '/js/features/account-data.js',
    '/js/application/account-usecases.js', '/js/core/firebase.js'
  ];
  const result = [];
  for(const pathname of paths) {
    const start = performance.now();
    const response = await fetch(`${BASE}${pathname}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const file = path.join(ROOT, 'public', pathname === '/' ? 'index.html' : pathname);
    const local = fs.existsSync(file) ? fs.readFileSync(file) : null;
    result.push({ pathname, status: response.status, ms: round(performance.now() - start),
      decodedBytes: buffer.length, cacheControl: response.headers.get('cache-control'),
      encoding: response.headers.get('content-encoding'),
      productionSha256: sha(buffer), localSha256: local && sha(local),
      sameAsLocal: !!local && sha(buffer) === sha(local)
    });
  }
  return result;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true
  });
  const result = {
    measuredAt: new Date().toISOString(), baseUrl: BASE,
    scope: 'Unauthenticated public static shells, isolated browser contexts; backend APIs blocked. Not authenticated user latency or school-device field data.',
    throttling: 'Mobile simulation: 390x844 viewport, 4 Mbps down, 1 Mbps up, 80ms latency, CPU 4x slowdown. Unthrottled uses same viewport.',
    blockedUrls: BLOCKED, runs: []
  };
  try {
    const scenarios = [
      { name: 'main-unthrottled', pathname: '/', repeat: 2 },
      { name: 'main-mobile-simulation', pathname: '/', throttled: true, repeat: 2 },
      { name: 'housing-unthrottled', pathname: '/housing/' },
      { name: 'coordi-unthrottled', pathname: '/coordi-shop/' },
      { name: 'fraction-unthrottled', pathname: '/fraction-world/' }
    ];
    for(let sample = 1; sample <= SAMPLES; sample++) {
      for(const scenario of scenarios.filter(s => !process.env.SITE_PROFILE_MAIN_ONLY || s.pathname === '/')) {
        result.runs.push(...(await measure(browser, scenario)).map(run => ({ sample, ...run })));
      }
    }
    result.assets = await comparePublicAssets();
    const output = path.resolve(process.env.SITE_PROFILE_OUTPUT || path.join(ROOT, 'docs/operations/SITE_LOADING_PROFILE_2026-10-04.json'));
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
    console.log(`Saved ${output}`);
    console.log(JSON.stringify(result.assets));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
