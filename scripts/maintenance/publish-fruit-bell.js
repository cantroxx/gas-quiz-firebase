#!/usr/bin/env node
'use strict';
// Scoped Hosting release: clone live and replace only reviewed Fruit Bell files/links.
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const base = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth = require(base + 'auth'), { requireAuth } = require(base + 'requireAuth'), api = require(base + 'hosting/api'), { Client } = require(base + 'apiv2');
const site = 'dj48-quiztown-firebase', root = path.resolve(__dirname, '../..'), stage = process.env.FRUIT_BELL_RELEASE_STAGE || '/tmp/fruit-bell-release';
const client = new Client({ urlPrefix: 'https://firebasehosting.googleapis.com', apiVersion: 'v1beta1', auth: true });
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), pack = bytes => zlib.gzipSync(bytes, { level: 9 });
async function files(version) {
  let token = ''; const rows = {};
  do { const r = await client.get(version + '/files', { queryParams: { pageSize: 1000, ...(token ? { pageToken: token } : {}) } });
    for (const file of r.body.files || []) rows[file.path] = file.hash; token = r.body.nextPageToken || '';
  } while (token);
  return rows;
}
function snapshot() {
  const names = ['index.html', 'battle/index.html', 'js/school-rooms.js', 'js/hideout-ranking-plaza.js'];
  const before = Object.fromEntries(names.map(file => [file, fs.readFileSync(stage + '/before/' + file, 'utf8')]));
  const local = file => fs.readFileSync(root + '/public/' + file, 'utf8');
  const card = local('battle/index.html').match(/    <a class="entry" href="\/fruit-bell\/"[\s\S]*?<\/a>/)?.[0]; assert(card);
  let battle = before['battle/index.html'];
  if (battle.includes('href="/fruit-bell/"')) battle = battle.replace(/    <a class="entry" href="\/fruit-bell\/"[\s\S]*?<\/a>/, card);
  else { const anchor = '    <a class="entry entry-cloud"'; assert(battle.includes(anchor)); battle = battle.replace(anchor, card + '\n\n' + anchor); }
  const replacement = { 'battle/index.html': battle, 'js/school-rooms.js': local('js/school-rooms.js'), 'js/hideout-ranking-plaza.js': local('js/hideout-ranking-plaza.js') };
  let index = before['index.html'];
  for (const file of ['js/school-rooms.js', 'js/hideout-ranking-plaza.js']) {
    const re = new RegExp('src="/' + file.replace(/\./g, '\\.') + '(?:\\?[^\"]*)?"', 'g');
    assert.equal([...index.matchAll(re)].length, 1); index = index.replace(re, 'src="/' + file + '?v=fruit-bell-online-20260929"');
  }
  replacement['index.html'] = index;
  for (const file of ['index.html', 'app.js', 'net.js', 'domain.js', 'style.css']) replacement['fruit-bell/' + file] = local('fruit-bell/' + file);
  const rawHashes = {}, beforeHashes = {};
  for (const [file, value] of Object.entries(before)) beforeHashes['/' + file] = digest(pack(Buffer.from(value)));
  for (const [file, value] of Object.entries(replacement)) {
    fs.mkdirSync(path.dirname(stage + '/candidate/' + file), { recursive: true }); fs.writeFileSync(stage + '/candidate/' + file, value); rawHashes[file] = digest(Buffer.from(value));
    if (file.endsWith('.js')) new Function(value);
  }
  fs.writeFileSync(stage + '/reviewed.json', JSON.stringify({ rawHashes, beforeHashes }, null, 2));
  console.log(JSON.stringify({ candidate: stage + '/candidate', files: Object.keys(rawHashes) }));
}
async function main() {
  if (process.argv.includes('--snapshot')) return snapshot();
  await requireAuth({ project: site, ...auth.getGlobalDefaultAccount() });
  const live = await api.getChannel('-', site, 'live'), source = live.release.version.name;
  if (process.argv.includes('--release')) {
    const plan = JSON.parse(fs.readFileSync(stage + '/hosting-plan.json'));
    assert.equal(source, plan.source, 'Live changed; re-audit and prepare again'); assert.deepEqual(await files(plan.version), plan.files);
    assert.deepEqual((await client.get(plan.version)).body.config, live.release.version.config);
    for (const [file, hash] of Object.entries(plan.rawHashes)) assert.equal(digest(fs.readFileSync(stage + '/candidate/' + file)), hash);
    const release = await api.createRelease(site, 'live', plan.version, { message: process.env.FRUIT_BELL_RELEASE_MESSAGE || 'Fruit Bell: authenticated 2–4 player rooms, server-authoritative play and student rankings' });
    const receipt = { release: release.name, version: plan.version, previous: source, changed: plan.changed };
    fs.writeFileSync(stage + '/receipt.json', JSON.stringify(receipt, null, 2)); console.log(JSON.stringify(receipt)); return;
  }
  const before = await files(source);
  if (!process.argv.includes('--prepare')) return console.log(JSON.stringify({ source, count: Object.keys(before).length }));
  const reviewed = JSON.parse(fs.readFileSync(stage + '/reviewed.json'));
  for (const [file, hash] of Object.entries(reviewed.beforeHashes)) assert.equal(before[file], hash, `Live changed since review: ${file}`);
  const changes = {}, uploads = {};
  for (const [file, hash] of Object.entries(reviewed.rawHashes)) {
    const raw = fs.readFileSync(stage + '/candidate/' + file); assert.equal(digest(raw), hash, 'Candidate changed: ' + file);
    const bytes = pack(raw), packedHash = digest(bytes); if (before['/' + file] === packedHash) continue;
    changes['/' + file] = packedHash; uploads[packedHash] = bytes;
  }
  assert.equal((await api.getChannel('-', site, 'live')).release.version.name, source, 'Live changed');
  const clone = await api.cloneVersion(site, source, false), version = clone.name || clone.response?.name;
  assert.match(version, /sites\/[^/]+\/versions\//);
  const populated = await client.post(version + ':populateFiles', { files: changes });
  const uploader = new Client({ urlPrefix: populated.body.uploadUrl, auth: true });
  for (const hash of populated.body.uploadRequiredHashes || []) {
    const response = await uploader.request({ method: 'POST', path: '/' + hash, body: require('node:stream').Readable.from(uploads[hash]), responseType: 'stream', resolveOnHTTPError: true });
    assert(response.status < 400, 'Upload failed');
  }
  await api.updateVersion(site, version.split('/').pop(), { status: 'FINALIZED' });
  const expected = { ...before, ...changes }; assert.deepEqual(await files(version), expected, 'Unrelated files changed');
  assert.deepEqual((await client.get(version)).body.config, live.release.version.config, 'Hosting settings changed');
  fs.writeFileSync(stage + '/hosting-plan.json', JSON.stringify({ source, version, files: expected, rawHashes: reviewed.rawHashes, changed: Object.keys(changes) }, null, 2));
  console.log(JSON.stringify({ version, changed: Object.keys(changes), preservedFiles: Object.keys(before).filter(file => !changes[file]).length }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
