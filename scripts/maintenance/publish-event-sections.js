#!/usr/bin/env node
'use strict';
// Clone the live site and publish only the reviewed event plaza presentation changes.
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const base = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth = require(base + 'auth'), { requireAuth } = require(base + 'requireAuth');
const api = require(base + 'hosting/api'), { Client } = require(base + 'apiv2');
const site = 'dj48-quiztown-firebase', root = path.resolve(__dirname, '../..');
const stage = '/tmp/event-sections-release';
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
      const r = await fetch(`https://${site}.web.app/${file}?event-sections-verify=${Date.now()}`);
      assert(r.ok, file);
      assert.equal(digest(Buffer.from(await r.arrayBuffer())), hash, file);
    }
    console.log('PASS live version, complete manifest, and all four published file hashes.');
    return;
  }
  if (process.argv.includes('--release')) {
    const plan = JSON.parse(fs.readFileSync(stage + '/hosting-plan.json'));
    assert.equal(source, plan.source, 'Live changed; stage and verify again');
    assert.deepEqual(await files(plan.version), plan.files);
    assert.deepEqual((await client.get(plan.version)).body.config, live.release.version.config);
    for (const [file, hash] of Object.entries(plan.rawHashes)) assert.equal(digest(fs.readFileSync(stage + '/candidate/' + file)), hash, file);
    const result = await api.createRelease(site, 'live', plan.version, { message: 'Event plaza: daily quest and season event buttons in one row' });
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
    const r = await fetch(`https://${site}.web.app/${file}?event-sections-stage=${Date.now()}`);
    assert(r.ok, 'Fetch failed: ' + file);
    const bytes = Buffer.from(await r.arrayBuffer());
    assert.equal(digest(pack(bytes)), before['/' + file], 'Live hash mismatch: ' + file);
    save('before/' + file, bytes);
    return bytes.toString('utf8');
  }
  let html = await liveText('index.html');
  const sections = /      <section class="event-section"[\s\S]*?(?=    <\/section>\n\n    <section id="classroom-view")/g;
  const oldSections = [...html.matchAll(sections)], nextSections = [...read('index.html').matchAll(sections)];
  assert.equal(oldSections.length, 1); assert.equal(nextSections.length, 1);
  assert(nextSections[0][0].includes('id="event-season-toggle"'));
  html = replaceOnce(html, oldSections[0][0], nextSections[0][0]);
  html = replaceOnce(html, '/plaza-views.css?v=event-cleanup-20261017', '/plaza-views.css?v=event-sections-20261017');
  const bundleRefs = [...html.matchAll(/src="\/js\/app\.bundle\.js(?:\?[^"]*)?"/g)];
  assert.equal(bundleRefs.length, 1);
  html = replaceOnce(html, bundleRefs[0][0], 'src="/js/app.bundle.js?v=event-sections-20261017"');
  let css = await liveText('plaza-views.css');
  const localCss = read('plaza-views.css');
  function localRule(prefix) {
    const matches = localCss.split('\n').filter(line => line.startsWith(prefix));
    assert.equal(matches.length, 1, prefix);
    return matches[0];
  }
  const toggleRule = localRule('#event-view .event-quest-toggle {');
  css = replaceOnce(css, toggleRule, toggleRule + '\n' + localRule('#event-view .event-quest-toggle[aria-expanded="true"]'));
  css = replaceOnce(css, '#event-view #quest-card-grid[hidden] { display:none; }', localRule('#event-view :is(#quest-card-grid,#season-event-grid)[hidden]'));
  const headingRule = localRule('#event-view .event-section-heading h3 {');
  css = replaceOnce(css, headingRule, headingRule + '\n' + localRule('#event-view .event-section-switcher {') + '\n' + localRule('#event-view .event-section-switcher h3 {'));
  css = replaceOnce(css, '@media(max-width:480px) {', '@media(max-width:480px) {\n' + localRule('  #event-view .event-section-switcher h3 {') + '\n' + localRule('  #event-view .event-section-switcher .event-quest-toggle {'));
  const modules = ['js/features/event-controller.js'];
  const originalBundle = await liveText('js/app.bundle.js');
  let bundle = originalBundle;
  const replacements = { 'index.html': html, 'plaza-views.css': css };
  function swapModule(text, file, next, expected) {
    const marker = `/* /${file} */\n`, endMarker = `\n//# sourceURL=/${file}`;
    const first = text.indexOf(marker), last = text.indexOf(endMarker, first);
    assert(first >= 0 && last > first && text.indexOf(marker, first + 1) < 0, file);
    if(expected !== undefined) assert.equal(text.slice(first + marker.length, last).trimEnd(), expected.trimEnd(), 'Bundle/module mismatch: ' + file);
    return text.slice(0, first + marker.length) + next.trimEnd() + text.slice(last);
  }
  for(const file of modules) {
    const prior = await liveText(file), next = read(file);
    bundle = swapModule(bundle, file, next, prior);
    replacements[file] = next;
  }
  const stripModules = text => modules.reduce((result, file) => swapModule(result, file, ''), text);
  assert.equal(stripModules(bundle), stripModules(originalBundle), 'Unrelated bundle content changed');
  new Function(bundle);
  replacements['js/app.bundle.js'] = bundle;
  const rawHashes = {};
  for(const [file, content] of Object.entries(replacements)) {
    save('candidate/' + file, content); rawHashes[file] = digest(content);
  }
  // Verification dependencies are downloaded but not added to the upload list.
  for(const file of ['styles.css', 'js/event-plaza-loader.js', 'js/domain/event-domain.js', 'js/features/event-render.js']) save('candidate/' + file, await liveText(file));
  save('candidate-manifest.json', JSON.stringify({ source, rawHashes }, null, 2));
  console.log(JSON.stringify({ staged: stage + '/candidate', source, changed: Object.keys(rawHashes) }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
