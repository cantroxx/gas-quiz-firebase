#!/usr/bin/env node
'use strict';
// Targeted entry fix: preserve the live site and replace only gem read composition.
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const base = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth = require(base + 'auth'), { requireAuth } = require(base + 'requireAuth');
const api = require(base + 'hosting/api'), { Client } = require(base + 'apiv2');
const site = 'dj48-quiztown-firebase', root = path.resolve(__dirname, '../..');
const stage = '/tmp/classroom-entry-fix-20261004';
const client = new Client({ urlPrefix: 'https://firebasehosting.googleapis.com', apiVersion: 'v1beta1', auth: true });
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const pack = bytes => zlib.gzipSync(bytes, { level: 9 });
const modules = ['application/classroom-usecases.js', 'infrastructure/classroom-repository.js'];
async function files(version) {
  let token = '', all = {};
  do {
    const r = await client.get(version + '/files', { queryParams: { pageSize: 1000, ...(token ? { pageToken: token } : {}) } });
    for (const f of r.body.files || []) all[f.path] = f.hash;
    token = r.body.nextPageToken || '';
  } while (token);
  return all;
}
function save(file, bytes) {
  fs.mkdirSync(path.dirname(stage + '/' + file), { recursive: true });
  fs.writeFileSync(stage + '/' + file, bytes);
}
async function main() {
  await requireAuth({ project: site, ...auth.getGlobalDefaultAccount() });
  const live = await api.getChannel('-', site, 'live'), source = live.release.version.name;
  if (process.argv.includes('--release')) {
    const plan = JSON.parse(fs.readFileSync(stage + '/hosting-plan.json'));
    assert.equal(source, plan.source, 'Live changed; prepare again');
    assert.deepEqual(await files(plan.version), plan.files);
    assert.deepEqual((await client.get(plan.version)).body.config, live.release.version.config);
    for (const [file, hash] of Object.entries(plan.rawHashes)) assert.equal(digest(fs.readFileSync(stage + '/candidate/' + file)), hash);
    const result = await api.createRelease(site, 'live', plan.version, { message: 'Fix classroom entry: use authorized economy catalog instead of denied direct gem catalog read' });
    const receipt = { release: result.name, version: plan.version, previous: source, changed: plan.changed };
    save('receipt.json', JSON.stringify(receipt, null, 2));
    console.log(JSON.stringify(receipt));
    return;
  }
  const before = await files(source);
  async function liveBytes(file) {
    const r = await fetch(`https://${site}.web.app/${file}?classroom-release=${Date.now()}`);
    assert(r.ok, 'Fetch failed: ' + file);
    const bytes = Buffer.from(await r.arrayBuffer());
    assert.equal(digest(pack(bytes)), before['/' + file], 'Live file hash mismatch: ' + file);
    save('before/' + file, bytes);
    return bytes;
  }
  let html = (await liveBytes('index.html')).toString();
  assert(html.includes('/js/app.bundle.js?'), 'Missing bundle');
  html = html.replace(/\/js\/app\.bundle\.js[^"']*/, '/js/app.bundle.js?v=classroom-entry-20261004');
  let bundle = (await liveBytes('js/app.bundle.js')).toString();
  const replacements = { 'index.html': Buffer.from(html) };
  for (const module of modules) {
    const file = 'js/' + module, prior = (await liveBytes(file)).toString();
    const local = fs.readFileSync(root + '/public/' + file, 'utf8');
    const marker = `/* /${file} */\n`, endMarker = `\n//# sourceURL=/${file}`;
    const start = bundle.indexOf(marker), end = bundle.indexOf(endMarker, start);
    assert(start >= 0 && end > start && bundle.indexOf(marker, start + 1) < 0, 'Bundle markers: ' + file);
    assert.equal(bundle.slice(start + marker.length, end).trimEnd(), prior.trimEnd(), 'Live bundle/module mismatch: ' + file);
    bundle = bundle.slice(0, start + marker.length) + local.trimEnd() + bundle.slice(end);
    replacements[file] = Buffer.from(local);
  }
  replacements['js/app.bundle.js'] = Buffer.from(bundle);
  // These live dependencies are copied only for candidate verification, never uploaded.
  for (const file of ['styles.css', 'classroom.css', 'js/data/level-medal-assets.js', 'js/domain/classroom-domain.js', 'js/features/classroom-data.js', 'js/features/classroom-state.js', 'js/features/classroom-form.js', 'js/features/classroom-render.js', 'js/features/classroom-controller.js']) save('candidate/' + file, await liveBytes(file));
  const changes = {}, uploads = {}, rawHashes = {};
  for (const [file, bytes] of Object.entries(replacements)) {
    save('candidate/' + file, bytes);
    const packed = pack(bytes), hash = digest(packed);
    changes['/' + file] = hash; uploads[hash] = packed; rawHashes[file] = digest(bytes);
  }
  save('candidate-manifest.json', JSON.stringify({ source, rawHashes, changed: Object.keys(changes) }, null, 2));
  if (!process.argv.includes('--prepare')) {
    console.log(JSON.stringify({ staged: stage + '/candidate', source, changed: Object.keys(changes) }));
    return;
  }
  assert.equal((await api.getChannel('-', site, 'live')).release.version.name, source, 'Live changed during preparation');
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
  assert.deepEqual(await files(version), expected, 'Unrelated Hosting files changed');
  assert.deepEqual((await client.get(version)).body.config, live.release.version.config, 'Hosting settings changed');
  save('hosting-plan.json', JSON.stringify({ source, version, files: expected, rawHashes, changed: Object.keys(changes) }, null, 2));
  console.log(JSON.stringify({ prepared: version, changed: Object.keys(changes), preservedFiles: Object.keys(before).filter(p => !changes[p]).length }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
