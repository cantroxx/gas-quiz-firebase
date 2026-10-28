#!/usr/bin/env node
'use strict';
// Clone the live site and publish only the reviewed 2026-10-18 town UI changes.
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const base = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth = require(base + 'auth'), { requireAuth } = require(base + 'requireAuth');
const api = require(base + 'hosting/api'), { Client } = require(base + 'apiv2');
const site = 'dj48-quiztown-firebase', root = path.resolve(__dirname, '../..');
const stage = '/tmp/town-ui-release';
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
      const r = await fetch(`https://${site}.web.app/${file}?town-ui-verify=${Date.now()}`);
      assert(r.ok, file);
      assert.equal(digest(Buffer.from(await r.arrayBuffer())), hash, file);
    }
    console.log('PASS live version, complete manifest, and all published UI file hashes.');
    return;
  }
  if (process.argv.includes('--release')) {
    const plan = JSON.parse(fs.readFileSync(stage + '/hosting-plan.json'));
    assert.equal(source, plan.source, 'Live changed; stage and verify again');
    assert.deepEqual(await files(plan.version), plan.files);
    assert.deepEqual((await client.get(plan.version)).body.config, live.release.version.config);
    for (const [file, hash] of Object.entries(plan.rawHashes)) assert.equal(digest(fs.readFileSync(stage + '/candidate/' + file)), hash, file);
    const result = await api.createRelease(site, 'live', plan.version, { message: 'Town UI: illustrated login/boutique, simplified quests, consistent village navigation' });
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
  const targets = ['index.html','js/player-status-shortcut.js','js/features/home-render.js','js/data/place-details.js','coordi-shop/index.html','player-status/index.html','player-status/status.js','player-status/style.css','js/app.bundle.js'];
  const dependencies = ['styles.css','town-entry.css','school-entry.css','school-rooms.css','town-shop.css','plaza-views.css','profile-view.css','coordi-shop/dressing-room.css','coordi-shop/dressing-room.js','coordi-shop/town-bridge.js','js/features/event-render.js','js/features/event-controller.js','js/features/ranking-render.js','js/domain/event-domain.js','js/features/shop-render.js','js/event-plaza-loader.js'];
  for (const file of [...targets,...dependencies]) {
    assert(before['/'+file], 'Missing live file: '+file);
    const response = await fetch(`https://${site}.web.app/${file}?town-ui-stage=${Date.now()}`);
    assert(response.ok, file);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(digest(pack(bytes)),before['/'+file],'Live hash mismatch: '+file);
    save('before/'+file,bytes);save('candidate/'+file,bytes);
  }
  save('live-manifest.json',JSON.stringify({source,files:before,config:live.release.version.config},null,2));
  console.log(JSON.stringify({downloaded:targets.length+dependencies.length,source,staging:stage}));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
