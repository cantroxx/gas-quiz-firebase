#!/usr/bin/env node
'use strict';
// Re-encode PNG files only. Preserve original bytes/URLs and require exact decoded pixels.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const sharp = require(require.resolve('sharp', {paths: [root, '/Users/kdw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules']}));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function main() {
  const source = JSON.parse(fs.readFileSync(path.join(root, 'docs/product/popular-image-selection-2026-10-18/selection.json')));
  const dir = path.join(root, 'public/popular-quiz/assets'), out = path.join(root, 'public/popular-quiz/optimized');
  const originalFiles = fs.readdirSync(dir);
  fs.mkdirSync(out, {recursive: true});
  const policy = JSON.parse(fs.readFileSync(path.join(root, 'docs/product/popular-image-selection-2026-10-18/lossless-policy.json')));
  const exclusions = new Map(policy.exclusions.map(row => [row.id, row]));
  const entries = [], rejected = [];
  for (const row of source.selected) {
    const file = originalFiles.find(name => name === row.sha256 + '.png');
    if (!file) continue;
    const exclusion = exclusions.get(row.id);
    if (exclusion) {
      assert.equal(exclusion.sourceSha256, row.sha256, 'Excluded source changed; review browser pixels again');
      rejected.push({id: row.id, reason: exclusion.reason}); continue;
    }
    const original = fs.readFileSync(path.join(dir, file));
    assert.equal(hash(original), row.sha256, 'Source changed: ' + row.id);
    const metadata = await sharp(original).metadata();
    if ((metadata.pages || 1) > 1) { rejected.push({id: row.id, reason: 'animated'}); continue; }
    const bytes = await sharp(original).keepMetadata().webp({lossless: true, effort: 4}).toBuffer();
    if (bytes.length >= original.length) { rejected.push({id: row.id, reason: 'not-smaller', before: original.length, after: bytes.length}); continue; }
    const before = await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject: true});
    const after = await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject: true});
    if (JSON.stringify(after.info) !== JSON.stringify(before.info) || !before.data.equals(after.data)) {
      rejected.push({id: row.id, reason: 'decoded-pixels-differ'}); continue;
    }
    const digest = hash(bytes), imageUrl = '/popular-quiz/optimized/' + digest + '.webp';
    fs.writeFileSync(path.join(root, 'public' + imageUrl), bytes);
    entries.push({id: row.id, sourceSha256: row.sha256, originalUrl: '/popular-quiz/assets/' + file,
      imageUrl, imageSha256: digest, originalBytes: original.length, bytes: bytes.length, width: metadata.width, height: metadata.height, decodedPixelsIdentical: true});
  }
  const manifest = {version: 'lossless-png-v1', sourceVersion: source.version, policy: 'PNG only, no resize, exact decoded pixel equality, smaller files only; originals retained', entries, rejected};
  fs.writeFileSync(path.join(root, 'functions/popular-quiz/image-derivatives.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({converted: entries.length, rejected: rejected.length, savedBytes: entries.reduce((n,r) => n + r.originalBytes - r.bytes, 0)}));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
