#!/usr/bin/env node
'use strict';
// Preserve the live site while releasing the verified classroom and coordi loading changes.
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const base = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth = require(base + 'auth'), { requireAuth } = require(base + 'requireAuth');
const api = require(base + 'hosting/api'), { Client } = require(base + 'apiv2');
const site = 'dj48-quiztown-firebase', root = path.resolve(__dirname, '../..');
const stage = '/tmp/site-loading-release-20261004/hosting';
const client = new Client({ urlPrefix: 'https://firebasehosting.googleapis.com', apiVersion: 'v1beta1', auth: true });
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const pack = bytes => zlib.gzipSync(bytes, { level: 9 });
const modules = ['application/classroom-usecases.js', 'features/classroom-state.js', 'features/classroom-render.js'];
const baseline = '/tmp/classroom-loading-20261004/before';
const coordiBaseline = '/tmp/coordi-loading-before-20261004';
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
    const result = await api.createRelease(site, 'live', plan.version, { message: 'Loading: progressive classroom home, shared reads and parallel coordi startup' });
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
  let html = (await liveBytes('index.html')).toString();
  const localHtml = fs.readFileSync(root + '/public/index.html', 'utf8');
  const baselineHtml = fs.readFileSync(baseline + '/index.html', 'utf8');
  function section(text, start, end) {
    const a = text.indexOf(start), b = text.indexOf(end, a);
    assert(a >= 0 && b > a && text.indexOf(start, a + 1) < 0, 'Unique HTML section: ' + start);
    return text.slice(a, b);
  }
  for(const [start, end] of [
    ['    async function loadClassroomSettings(', '    function isCurrentClassroomTeacher('],
    ['    function getClassroomRepository(', '    async function loadClassroomWallet(']
  ]) {
    const prior = section(baselineHtml, start, end);
    assert.equal(section(html, start, end), prior, 'Live classroom section differs from reviewed baseline');
    html = html.replace(prior, section(localHtml, start, end));
  }
  const oldCoordinator = section(baselineHtml, '    let classroomRenderPromise =', '    function setClassroomQuestEditorStatus');
  assert.equal(section(html, '    let classroomRenderPromise =', '    function setClassroomQuestEditorStatus'), oldCoordinator);
  html = html.replace(oldCoordinator, section(localHtml, '    let classroomRenderRequest =', '    function setClassroomQuestEditorStatus'));
  html = html.replace(/\/js\/app\.bundle\.js[^"']*/, '/js/app.bundle.js?v=classroom-loading-20261004');
  html = html.replace(/\/classroom\.css[^"']*/, '/classroom.css?v=classroom-loading-20261004');
  let bundle = (await liveBytes('js/app.bundle.js')).toString();
  const replacements = { 'index.html': Buffer.from(html) };
  for (const module of modules) {
    const file = 'js/' + module, prior = (await liveBytes(file)).toString();
    assert.equal(prior, fs.readFileSync(baseline + '/' + path.basename(file), 'utf8'), 'Live module differs from reviewed baseline: ' + file);
    const local = fs.readFileSync(root + '/public/' + file, 'utf8');
    const marker = `/* /${file} */\n`, endMarker = `\n//# sourceURL=/${file}`;
    const start = bundle.indexOf(marker), end = bundle.indexOf(endMarker, start);
    assert(start >= 0 && end > start && bundle.indexOf(marker, start + 1) < 0, 'Bundle markers: ' + file);
    assert.equal(bundle.slice(start + marker.length, end).trimEnd(), prior.trimEnd(), 'Live bundle/module mismatch: ' + file);
    bundle = bundle.slice(0, start + marker.length) + local.trimEnd() + bundle.slice(end);
    replacements[file] = Buffer.from(local);
  }
  const liveCss = await liveBytes('classroom.css');
  const localCss = fs.readFileSync(root + '/public/classroom.css');
  if(!liveCss.equals(localCss)) {
    assert.equal(liveCss.toString(), fs.readFileSync(baseline + '/classroom.css', 'utf8'), 'New classroom CSS requires review');
    replacements['classroom.css'] = localCss;
  }
  save('candidate/classroom.css', liveCss.equals(localCss) ? liveCss : localCss);
  for(const name of ['dressing-room.js', 'town-bridge.js']) {
    const file = 'coordi-shop/' + name;
    assert.equal((await liveBytes(file)).toString(), fs.readFileSync(coordiBaseline + '/' + name, 'utf8'), 'Coordi baseline changed: ' + name);
    replacements[file] = fs.readFileSync(root + '/public/' + file);
  }
  const coordiHtml = (await liveBytes('coordi-shop/index.html')).toString();
  assert.equal((coordiHtml.match(/\/coordi-shop\/town-bridge\.js/g) || []).length, 1);
  replacements['coordi-shop/index.html'] = Buffer.from(coordiHtml.replace(/\/coordi-shop\/town-bridge\.js[^"']*/, '/coordi-shop/town-bridge.js?v=loading-20261004'));
  new Function(bundle);
  for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new Function(match[1]);
  replacements['js/app.bundle.js'] = Buffer.from(bundle);
  // Copy live dependencies into the verification fixture only, never into changes.
  const dependencies = [
    'styles.css', 'js/data/level-medal-assets.js', 'js/domain/classroom-domain.js',
    'js/features/classroom-data.js', 'js/features/classroom-form.js', 'js/features/classroom-controller.js',
    'js/features/classroom-portrait.js', 'js/features/classroom-workspace.js',
    ...Object.keys(before).filter(file => (/^\/coordi-shop\/[^/]+\.(js|css|html)$/.test(file) || /^\/coordi-shop\/data\/[^/]+\.json$/.test(file)) || file.startsWith('/images/classroom/') || file.startsWith('/images/classroom-icons/')).map(file => file.slice(1))
  ];
  for(const file of [...new Set(dependencies)].filter(file => !replacements[file])) save('candidate/' + file, await liveBytes(file));
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
