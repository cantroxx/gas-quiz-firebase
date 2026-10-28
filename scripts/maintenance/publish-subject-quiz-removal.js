#!/usr/bin/env node
'use strict';
// Clone the live site and publish only the reviewed subject quiz list changes.
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const base = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth = require(base + 'auth'), { requireAuth } = require(base + 'requireAuth');
const api = require(base + 'hosting/api'), { Client } = require(base + 'apiv2');
const site = 'dj48-quiztown-firebase', root = path.resolve(__dirname, '../..');
const stage = '/tmp/subject-quiz-removal-release';
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
      const r = await fetch(`https://${site}.web.app/${file}?subject-verify=${Date.now()}`);
      assert(r.ok, file);
      assert.equal(digest(Buffer.from(await r.arrayBuffer())), hash, file);
    }
    console.log('PASS live version, complete manifest, and all published file hashes.');
    return;
  }
  if (process.argv.includes('--release')) {
    const plan = JSON.parse(fs.readFileSync(stage + '/hosting-plan.json'));
    assert.equal(source, plan.source, 'Live changed; stage and verify again');
    assert.deepEqual(await files(plan.version), plan.files);
    assert.deepEqual((await client.get(plan.version)).body.config, live.release.version.config);
    for (const [file, hash] of Object.entries(plan.rawHashes)) assert.equal(digest(fs.readFileSync(stage + '/candidate/' + file)), hash, file);
    const result = await api.createRelease(site, 'live', plan.version, { message: 'Subject quizzes: remove science unit assessment and keep triangle absent' });
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
    const r = await fetch(`https://${site}.web.app/${file}?subject-stage=${Date.now()}`);
    assert(r.ok, 'Fetch failed: ' + file);
    const bytes = Buffer.from(await r.arrayBuffer());
    assert.equal(digest(pack(bytes)), before['/' + file], 'Live hash mismatch: ' + file);
    save('before/' + file, bytes);
    return bytes.toString('utf8');
  }
  const catalog = await liveText('js/data/quiz-catalog.js');
  const context = { window: {} };
  require('node:vm').runInNewContext(catalog, context);
  const subjects = context.window.DJ48QuizCatalog.SUBJECT_CATALOG;
  assert.deepEqual(Array.from(subjects.math.quizzes), ['random-basic', 'fraction-basic', 'fraction-assessment', 'calculation_practice']);
  assert.deepEqual(Array.from(subjects.science.quizzes), ['space-explorer', 'science-general']);
  const edits = [
    ["quizzes: ['space-explorer', 'science-general']", "quizzes: ['science-general']"],
    [subjects.math.desc, '곱셈·나눗셈과 분수를 연습합니다.'],
    [subjects.math.cardDesc, '계산·분수 퀴즈와 분수 평가를 고르는 화면입니다.']
  ];
  function patchCatalog(source) {
    for (const [old, next] of edits) source = replaceOnce(source, old, next);
    new Function(source);
    return source;
  }
  const nextCatalog = patchCatalog(catalog);
  let bundle = await liveText('js/app.bundle.js');
  // Require the standalone catalog and the actual app bundle to agree before patching.
  assert(bundle.includes(catalog.trimEnd()), 'Bundle catalog differs from standalone source');
  bundle = replaceOnce(bundle, catalog.trimEnd(), nextCatalog.trimEnd());
  new Function(bundle);
  let html = await liveText('index.html');
  const scripts = [...html.matchAll(/src="(\/js\/app\.bundle\.js[^"\s]*)"/g)];
  assert.equal(scripts.length, 1);
  html = replaceOnce(html, scripts[0][1], '/js/app.bundle.js?v=subject-removal-20261017');
  const replacements = { 'index.html': html, 'js/data/quiz-catalog.js': nextCatalog, 'js/app.bundle.js': bundle };
  const rawHashes = {};
  for (const [file, content] of Object.entries(replacements)) {
    save('candidate/' + file, content); rawHashes[file] = digest(content);
  }
  save('candidate-manifest.json', JSON.stringify({ source, rawHashes }, null, 2));
  console.log(JSON.stringify({ staged: stage + '/candidate', source, changed: Object.keys(rawHashes) }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
