#!/usr/bin/env node
'use strict';
// Clone the live site and publish only the reviewed shop presentation changes.
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const base = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth = require(base + 'auth'), { requireAuth } = require(base + 'requireAuth');
const api = require(base + 'hosting/api'), { Client } = require(base + 'apiv2');
const site = 'dj48-quiztown-firebase', root = path.resolve(__dirname, '../..');
const stage = '/tmp/shop-cleanup-release';
const client = new Client({ urlPrefix: 'https://firebasehosting.googleapis.com', apiVersion: 'v1beta1', auth: true });
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const pack = bytes => zlib.gzipSync(bytes, { level: 9 });
const read = file => fs.readFileSync(root + '/public/' + file, 'utf8');
function save(file, bytes) {
  fs.mkdirSync(path.dirname(stage + '/' + file), { recursive: true });
  fs.writeFileSync(stage + '/' + file, bytes);
}
function replaceOnce(source, old, next) {
  assert.equal(source.split(old).length, 2, 'Expected exactly one match: ' + old.slice(0, 100));
  return source.replace(old, () => next);
}
async function files(version) {
  let token = '', all = {};
  do {
    const r = await client.get(version + '/files', { queryParams: { pageSize: 1000, ...(token ? { pageToken: token } : {}) } });
    for (const f of r.body.files || []) all[f.path] = f.hash;
    token = r.body.nextPageToken || '';
  } while (token);
  return all;
}
async function main() {
  await requireAuth({ project: site, ...auth.getGlobalDefaultAccount() });
  const live = await api.getChannel('-', site, 'live'), source = live.release.version.name;
  if (process.argv.includes('--verify')) {
    const plan = JSON.parse(fs.readFileSync(stage + '/hosting-plan.json'));
    assert.equal(source.replace(/^projects\/[^/]+\//, ''), plan.version.replace(/^projects\/[^/]+\//, ''));
    assert.deepEqual(await files(source), plan.files);
    for (const [file, hash] of Object.entries(plan.rawHashes)) {
      const r = await fetch(`https://${site}.web.app/${file}?shop-verify=${Date.now()}`);
      assert(r.ok, file);
      assert.equal(digest(Buffer.from(await r.arrayBuffer())), hash, file);
    }
    console.log('PASS live version, complete manifest, and all five published file hashes.');
    return;
  }
  if (process.argv.includes('--release')) {
    const plan = JSON.parse(fs.readFileSync(stage + '/hosting-plan.json'));
    assert.equal(source, plan.source, 'Live changed; stage and verify again');
    assert.deepEqual(await files(plan.version), plan.files);
    assert.deepEqual((await client.get(plan.version)).body.config, live.release.version.config);
    for (const [file, hash] of Object.entries(plan.rawHashes)) assert.equal(digest(fs.readFileSync(stage + '/candidate/' + file)), hash, file);
    const result = await api.createRelease(site, 'live', plan.version, { message: 'Shop: simple title, remove promotional copy, remaining coupons next to purchase controls' });
    const receipt = { release: result.name, version: plan.version, previous: source, changed: plan.changed };
    save('receipt.json', JSON.stringify(receipt, null, 2));
    console.log(JSON.stringify(receipt));
    return;
  }
  if (process.argv.includes('--prepare')) {
    const staged = JSON.parse(fs.readFileSync(stage + '/candidate-manifest.json'));
    assert.equal(source, staged.source, 'Live changed; stage and verify again');
    const changes = {}, uploads = {};
    for (const [file, hash] of Object.entries(staged.rawHashes)) {
      const bytes = fs.readFileSync(stage + '/candidate/' + file);
      assert.equal(digest(bytes), hash, file);
      const zipped = pack(bytes), compressedHash = digest(zipped);
      changes['/' + file] = compressedHash; uploads[compressedHash] = zipped;
    }
    const before = await files(source);
    const clone = await api.cloneVersion(site, source, false), version = clone.name || clone.response?.name;
    assert.match(version, /sites\/[^/]+\/versions\//);
    const pop = await client.post(version + ':populateFiles', { files: changes });
    const uploader = new Client({ urlPrefix: pop.body.uploadUrl, auth: true });
    for (const hash of pop.body.uploadRequiredHashes || []) {
      const r = await uploader.request({ method: 'POST', path: '/' + hash, body: require('node:stream').Readable.from(uploads[hash]), responseType: 'stream', resolveOnHTTPError: true });
      assert(r.status < 400, 'Upload failed');
    }
    await api.updateVersion(site, version.split('/').pop(), { status: 'FINALIZED' });
    const expected = { ...before, ...changes };
    assert.deepEqual(await files(version), expected, 'Unrelated files changed');
    assert.deepEqual((await client.get(version)).body.config, live.release.version.config, 'Hosting settings changed');
    const plan = { source, version, files: expected, rawHashes: staged.rawHashes, changed: Object.keys(changes) };
    save('hosting-plan.json', JSON.stringify(plan, null, 2));
    console.log(JSON.stringify({ prepared: version, changed: plan.changed, preservedFiles: Object.keys(before).filter(p => !changes[p]).length }));
    return;
  }
  const before = await files(source);
  async function liveText(file) {
    const r = await fetch(`https://${site}.web.app/${file}?shop-stage=${Date.now()}`);
    assert(r.ok, 'Fetch failed: ' + file);
    const bytes = Buffer.from(await r.arrayBuffer());
    assert.equal(digest(pack(bytes)), before['/' + file], 'Live hash mismatch: ' + file);
    save('before/' + file, bytes);
    return bytes.toString('utf8');
  }
  let html = await liveText('index.html');
  const section = /    <section id="shop-view"[\s\S]*?(?=    <section id="event-view")/g;
  const oldSections = [...html.matchAll(section)], newSections = [...read('index.html').matchAll(section)];
  assert.equal(oldSections.length, 1); assert.equal(newSections.length, 1);
  let nextSection = newSections[0][0];
  // The local entry-loading indicator belongs to a separate, unpublished change.
  if (!oldSections[0][0].includes('id="shop-entry-status"')) {
    nextSection = replaceOnce(nextSection, '      <p id="shop-entry-status" role="status" aria-live="polite" hidden></p>\n', '');
  }
  html = replaceOnce(html, oldSections[0][0], nextSection);
  assert(!html.includes('/town-shop.css'), 'Shop stylesheet already exists; review again');
  html = replaceOnce(html, '</head>', '  <link rel="stylesheet" href="/town-shop.css?v=20261017">\n</head>');
  let coordi = await liveText('coordi-shop/index.html');
  coordi = replaceOnce(coordi, '<p id="starter-coupons" class="dressroom-notice" role="status">구매 쿠폰을 확인하고 있어요.</p>\n', '');
  coordi = replaceOnce(coordi, '</span></p><button type="button" id="coordi-buy"', '</span></p><p id="starter-coupons" role="status" aria-live="polite">구매 쿠폰 확인 중…</p><button type="button" id="coordi-buy"');
  coordi = replaceOnce(coordi, 'town-bridge.js?v=catalog-20261007', 'town-bridge.js?v=shop-cleanup-20261017');
  assert.equal(coordi, read('coordi-shop/index.html'));
  let room = await liveText('coordi-shop/dressing-room.js');
  const couponLine = /^    document\.getElementById\('starter-coupons'\)\.textContent = .*;$/gm;
  const oldLines = [...room.matchAll(couponLine)], newLines = [...read('coordi-shop/dressing-room.js').matchAll(couponLine)];
  assert.equal(oldLines.length, 1); assert.equal(newLines.length, 1);
  room = replaceOnce(room, oldLines[0][0], newLines[0][0]);
  let bridge = await liveText('coordi-shop/town-bridge.js');
  bridge = replaceOnce(bridge, 'dressing-room.js?v=catalog-20261007', 'dressing-room.js?v=shop-cleanup-20261017');
  assert.equal(bridge, read('coordi-shop/town-bridge.js'));
  new Function(room); new Function(bridge);
  const replacements = { 'index.html': html, 'town-shop.css': read('town-shop.css'), 'coordi-shop/index.html': coordi, 'coordi-shop/dressing-room.js': room, 'coordi-shop/town-bridge.js': bridge };
  const rawHashes = {};
  for (const [file, content] of Object.entries(replacements)) {
    save('candidate/' + file, content); rawHashes[file] = digest(content);
  }
  for (const file of ['styles.css', 'js/features/shop-render.js']) save('candidate/' + file, await liveText(file));
  save('candidate-manifest.json', JSON.stringify({ source, rawHashes }, null, 2));
  console.log(JSON.stringify({ staged: stage + '/candidate', source, changed: Object.keys(rawHashes) }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
