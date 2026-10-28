#!/usr/bin/env node
'use strict';
// Clone live Hosting; publish only growth quests and shortcut integration.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const base = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth = require(base + 'auth');
const { requireAuth } = require(base + 'requireAuth');
const api = require(base + 'hosting/api');
const { Client } = require(base + 'apiv2');
const site = 'dj48-quiztown-firebase';
const client = new Client({ urlPrefix: 'https://firebasehosting.googleapis.com', apiVersion: 'v1beta1', auth: true });
const homeLoadingMode = process.argv.includes('--home-loading');
const homeMode = process.argv.includes('--home-dashboard');
const schoolMode = process.argv.includes('--school-rooms');
const eventMode = process.argv.includes('--events');
const releaseDirectory = '/tmp/season-ui-hosting-release';
const stage = releaseDirectory + '/candidate';
const planPath = releaseDirectory + '/hosting-plan.json';
const modules = ['js/features/ranking-render.js', 'js/infrastructure/ranking-repository.js'];
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const packed = bytes => zlib.gzipSync(bytes, { level: 9 });

async function files(version) {
  let token = ''; const result = {};
  do {
    const response = await client.get(version + '/files', { queryParams: { pageSize: 1000, ...(token ? { pageToken: token } : {}) } });
    for(const file of response.body.files || []) result[file.path] = file.hash;
    token = response.body.nextPageToken || '';
  } while(token);
  return result;
}

async function liveText(file, manifest) {
  const response = await fetch(`https://${site}.web.app/${file}?hideout-review=${Date.now()}`);
  assert(response.ok, `Unable to read live ${file}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(digest(packed(bytes)), manifest['/' + file], `Live content/manifest mismatch: ${file}`);
  return bytes.toString('utf8');
}

function swapModule(bundle, file, source) {
  const start = `/* /${file} */\n`, end = `\n//# sourceURL=/${file}`;
  const first = bundle.indexOf(start), last = bundle.indexOf(end, first);
  assert(first >= 0 && last > first && bundle.indexOf(start, first + 1) < 0, `Unique module missing: ${file}`);
  return bundle.slice(0, first + start.length) + source.trimEnd() + bundle.slice(last);
}

function functionRange(source, name) {
  const pattern = new RegExp(`^    (?:async )?function ${name}\\(`, 'gm');
  const match = pattern.exec(source);
  assert(match && !pattern.exec(source), `Unique function missing: ${name}`);
  const end = source.indexOf('\n    }', match.index) + '\n    }'.length;
  assert(end > match.index, `Function end missing: ${name}`);
  return { start: match.index, end, text: source.slice(match.index, end) };
}

(async () => {
  await requireAuth({ project: site, ...auth.getGlobalDefaultAccount() });
  const live = await api.getChannel('-', site, 'live');
  const source = live.release.version.name;
  if(process.argv.includes('--release')) {
    const plan = JSON.parse(fs.readFileSync(planPath));
    assert.equal(source, plan.source, 'Live changed; prepare and verify again');
    assert.deepEqual(await files(plan.version), plan.files);
    for(const [file, hash] of Object.entries(plan.rawHashes)) assert.equal(digest(fs.readFileSync(path.join(stage, file))), hash, `Candidate changed: ${file}`);
    const detail = (await client.get(plan.version)).body;
    assert.deepEqual(detail.config, live.release.version.config);
    const result = await api.createRelease(site, 'live', plan.version, { message: plan.message || 'Hideout rankings: four game fields and shared profile cards' });
    console.log(JSON.stringify({ release: result.name, version: plan.version, previous: source, changed: plan.changed }));
    return;
  }
  const before = await files(source);
  if(!process.argv.includes('--prepare')) { console.log(JSON.stringify({ source, files: Object.keys(before).length })); return; }
  const html = await liveText('index.html', before);
  const localHtml=fs.readFileSync('public/index.html','utf8');
  const replacements={};
  let nextHtml=html;
  const localNav=localHtml.match(/      <nav class="map-buttons town-info-shortcuts"[\s\S]*?<\/nav>/)[0];
  assert(!nextHtml.includes('town-info-shortcuts'),'Home shortcuts already changed');
  nextHtml=nextHtml.replace('      <section id="daily-notice-drop"',localNav+'\n\n      <section id="daily-notice-drop"');
  nextHtml=nextHtml.replace(/        <button class="notice-board-button"[\s\S]*?(?=        <button class="place my-home")/,'');
  const bottom='        <button type="button" data-place="notice">알림판</button>\n        <button type="button" data-place="guide">이용안내</button>\n';
  const navStart=nextHtml.indexOf('<nav class="map-buttons"');assert(navStart>0);
  nextHtml=nextHtml.slice(0,navStart)+nextHtml.slice(navStart).replace(bottom,'');
  const adminPanel=localHtml.match(/<details class="growth-season-admin"[\s\S]*?<\/details>/)[0];
  assert(!nextHtml.includes('growth-season-admin'));
  nextHtml=nextHtml.replace('<div id="admin-season-event-list"',adminPanel+'\n          <div id="admin-season-event-list"');
  nextHtml=nextHtml.replace('</body>','<script src="/js/admin-growth-season.js?v=20260921"></script>\n</body>');
  nextHtml=nextHtml.replace(/href="\/styles.css[^"<>]*"/,'href="/styles.css?v=season-ui-20260921"');
  assert.equal((nextHtml.match(/data-place="notice"/g)||[]).length,1);
  assert.equal((nextHtml.match(/data-place="guide"/g)||[]).length,1);
  replacements['index.html']=nextHtml;
  const localCss=fs.readFileSync('public/styles.css','utf8');
  const cssChunk=localCss.slice(localCss.indexOf('.map-buttons.town-info-shortcuts {'),localCss.indexOf('.map-buttons button {'));
  assert(cssChunk.includes('grid-template-columns'));
  replacements['styles.css']=(await liveText('styles.css',before))+'\n'+cssChunk;
  for(const file of ['js/admin-growth-season.js','js/data/level-medal-assets.js','player-status/index.html','player-status/style.css','player-status/status.js'])replacements[file]=fs.readFileSync('public/'+file);
  replacements['player-status/index.html']=String(replacements['player-status/index.html']).replace('href="style.css"','href="style.css?v=20260921"').replace('src="status.js"','src="status.js?v=20260921"');
  const changes = {}, uploads = {}, rawHashes = {};
  for(const [file, content] of Object.entries(replacements)) {
    fs.mkdirSync(path.dirname(path.join(stage, file)), { recursive: true });
    fs.writeFileSync(path.join(stage, file), content);
    const bytes = Buffer.from(content), zip = packed(bytes), hash = digest(zip);
    changes['/' + file] = hash; uploads[hash] = zip; rawHashes[file] = digest(bytes);
  }
  assert.equal((await api.getChannel('-', site, 'live')).release.version.name, source, 'Live changed during preparation');
  const clone = await api.cloneVersion(site, source, false);
  const version = clone.name || clone.response?.name;
  assert.match(version, /sites\/[^/]+\/versions\//);
  const populated = await client.post(version + ':populateFiles', { files: changes });
  const uploader = new Client({ urlPrefix: populated.body.uploadUrl, auth: true });
  const pendingHashes = [...(populated.body.uploadRequiredHashes || [])];
  console.log(`Required uploads: ${pendingHashes.length}`);
  await Promise.all(Array.from({length:32},async()=>{ while(pendingHashes.length) { const hash=pendingHashes.shift();
    const result = await uploader.request({ method: 'POST', path: '/' + hash, body: require('node:stream').Readable.from(uploads[hash]), responseType: 'stream', resolveOnHTTPError: true });
    assert(result.status < 400, `Upload failed: ${result.status}`);
  }
  }));
  await api.updateVersion(site, version.split('/').pop(), { status: 'FINALIZED' });
  const expected = { ...before, ...changes };
  assert.deepEqual(await files(version), expected, 'Unrelated Hosting files changed');
  assert.deepEqual((await client.get(version)).body.config, live.release.version.config, 'Hosting config changed');
  fs.writeFileSync(planPath, JSON.stringify({ source, version, files: expected, rawHashes, changed: Object.keys(changes), message: 'Next-month season reroll, compact profile and quest toggles, home shortcuts' }, null, 2));
  console.log(JSON.stringify({ prepared: version, stage, changedCount: Object.keys(changes).length, preservedFiles: Object.keys(before).filter(file => !changes[file]).length }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
