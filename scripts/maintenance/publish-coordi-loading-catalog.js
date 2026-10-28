#!/usr/bin/env node
'use strict';
// Preserve the live site while releasing a lightweight storefront catalog.
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const base = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth = require(base + 'auth'), { requireAuth } = require(base + 'requireAuth');
const api = require(base + 'hosting/api'), { Client } = require(base + 'apiv2');
const site = 'dj48-quiztown-firebase', root = path.resolve(__dirname, '../..');
const stage = '/tmp/loading-next-20261007/hosting';
const client = new Client({ urlPrefix: 'https://firebasehosting.googleapis.com', apiVersion: 'v1beta1', auth: true });
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const pack = bytes => zlib.gzipSync(bytes, { level: 9 });
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
    const result = await api.createRelease(site, 'live', plan.version, { message: 'Coordi loading: separate compact display catalog; preserve full audit source' });
    const receipt = { release: result.name, version: plan.version, previous: source, changed: plan.changed };
    save('receipt.json', JSON.stringify(receipt, null, 2));
    console.log(JSON.stringify(receipt));
    return;
  }
  const before = await files(source);
  async function liveBytes(file) {
    const cached = stage + '/before/' + file;
    if(fs.existsSync(cached)) {
      const bytes = fs.readFileSync(cached);
      if(digest(pack(bytes)) === before['/' + file]) return bytes;
    }
    const r = await fetch(`https://${site}.web.app/${file}?classroom-release=${Date.now()}`);
    assert(r.ok, 'Fetch failed: ' + file);
    const bytes = Buffer.from(await r.arrayBuffer());
    assert.equal(digest(pack(bytes)), before['/' + file], 'Live file hash mismatch: ' + file);
    save('before/' + file, bytes);
    return bytes;
  }
  const replacements = {};
  for(const name of ['index.html','town-bridge.js','dressing-room.js']) {
    const file='coordi-shop/'+name;
    const prior=await liveBytes(file);
    assert.equal(prior.toString(),fs.readFileSync('/tmp/loading-next-20261007/before/'+name,'utf8'),'Live storefront differs from reviewed baseline: '+name);
    replacements[file]=fs.readFileSync(root+'/public/'+file);
  }
  const catalogSource='coordi-shop/data/verified-top50.json';
  assert.equal((await liveBytes(catalogSource)).toString(),fs.readFileSync(root+'/public/'+catalogSource,'utf8'),'Live audit catalog differs');
  const display='coordi-shop/data/verified-top50-display.json';
  replacements[display]=fs.readFileSync(root+'/public/'+display);
  require('node:child_process').execFileSync(process.execPath,[root+'/scripts/build-coordi-display-catalog.js','--check'],{stdio:'inherit'});
  new Function(replacements['coordi-shop/dressing-room.js'].toString());
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
