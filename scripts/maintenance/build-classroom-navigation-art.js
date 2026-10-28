#!/usr/bin/env node
// Export generated originals without changing their artwork or transparency.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(require.resolve('sharp', { paths: [
  process.cwd(), '/Users/kdw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
] }));
const root = path.resolve(__dirname, '../..');
const docs = path.join(root, 'docs/product/classroom-navigation-art-2026-10-17');
const out = path.join(root, 'public/images/classroom/navigation-v2');
async function run() {
  const entries = JSON.parse(fs.readFileSync(path.join(docs, 'prompts.json'), 'utf8'));
  fs.mkdirSync(path.join(docs, 'originals'), { recursive: true });
  fs.mkdirSync(out, { recursive: true });
  const report = [];
  for(const entry of entries) {
    const original = path.join(docs, 'originals', `${entry.key}.png`);
    if(!fs.existsSync(original)) fs.copyFileSync(entry.source, original);
    const metadata = await sharp(original).metadata();
    const stats = await sharp(original).stats();
    if(!metadata.hasAlpha || stats.channels[3].min !== 0) throw new Error(`Missing transparency: ${entry.key}`);
    for(const size of [96, 160, 320]) {
      const file = path.join(out, `${entry.key}-${size}.webp`);
      await sharp(original).resize(size, size, { fit: 'contain', background: '#00000000' })
        .webp({ quality: 86, alphaQuality: 100, effort: 6 }).toFile(file);
      report.push({ key: entry.key, size, bytes: fs.statSync(file).size });
    }
  }
  fs.writeFileSync(path.join(docs, 'index.html'), `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>교실 메뉴 아이콘</title><style>body{font:16px system-ui;background:#faf6ed;color:#253c35;margin:32px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px}figure{margin:0;background:white;border-radius:18px;padding:20px;text-align:center}img{width:180px;height:180px;object-fit:contain}figcaption{font-weight:700;margin-top:12px}</style><h1>교실 메뉴와 직업 아이콘 · 3종</h1><p>투명 배경 · 입체 미니어처 · image_gen 생성</p><main>${entries.map(entry => `<figure><img src="../../../public/images/classroom/navigation-v2/${entry.key}-320.webp" alt=""><figcaption>${entry.key}</figcaption></figure>`).join('')}</main></html>`);
  fs.writeFileSync(path.join(docs, 'exports.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ artworks: entries.length, exports: report.length, totalBytes: report.reduce((sum, item) => sum + item.bytes, 0) }));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
