'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {chromium} = require('playwright-core');
const root = path.resolve(__dirname, '../..');
async function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'functions/popular-quiz/image-derivatives.json')));
  const browser = await chromium.launch({executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 960, height: 1000}});
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'https://quiz-images.invalid') return route.abort();
      if (url.pathname === '/') return route.fulfill({contentType: 'text/html', body: '<meta charset="utf-8"><style>body{font:16px sans-serif}main{display:grid;grid-template-columns:1fr 1fr;gap:12px}img{width:420px;height:250px;object-fit:contain}figure{margin:0}</style><h1>원본 / 무손실 파생본</h1><main></main>'});
      const known = manifest.entries.some(row => row.originalUrl === url.pathname || row.imageUrl === url.pathname);
      if (!known) return route.abort();
      return route.fulfill({contentType: url.pathname.endsWith('.png') ? 'image/png' : 'image/webp', body: fs.readFileSync(path.join(root, 'public' + url.pathname))});
    });
    await page.goto('https://quiz-images.invalid/');
    const results = await page.evaluate(async entries => {
      async function pixels(url) {
        const img = new Image(); img.src = url; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const context = canvas.getContext('2d', {willReadFrequently: true}); context.drawImage(img, 0, 0);
        return {width: canvas.width, height: canvas.height, bytes: context.getImageData(0, 0, canvas.width, canvas.height).data};
      }
      const rows = [];
      for (const entry of entries) {
        const a = await pixels(entry.originalUrl), b = await pixels(entry.imageUrl);
        rows.push({id: entry.id, same: a.width === b.width && a.height === b.height && a.bytes.length === b.bytes.length && a.bytes.every((value, i) => value === b.bytes[i])});
      }
      for (const entry of entries.slice(0, 3)) for (const url of [entry.originalUrl, entry.imageUrl]) {
        const figure = document.createElement('figure'), img = document.createElement('img'), caption = document.createElement('figcaption');
        img.src = url; await img.decode(); caption.textContent = entry.id; figure.append(img, caption); document.querySelector('main').append(figure);
      }
      return rows;
    }, manifest.entries);
    const out = '/tmp/quiz-cleanup-followup-20261018'; fs.mkdirSync(out, {recursive: true});
    fs.writeFileSync(path.join(out, 'image-browser.json'), JSON.stringify(results, null, 2) + '\n');
    await page.screenshot({path: path.join(out, 'image-comparison.png'), fullPage: true});
    assert.deepEqual(results.filter(row => !row.same), [], 'Browser pixels changed');
    console.log('PASS browser decoded pixels and dimensions: ' + results.length + ' original/derived pairs; all requests local.');
  } finally { await browser.close(); }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
