#!/usr/bin/env node
'use strict';
// Clone live Hosting; change only the coordi shop module and shop entry point.
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
const releaseDirectory = '/tmp/coordi-prism-release/hosting';
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
  const response = await fetch(`https://${site}.web.app/${file}?coordi-review=${Date.now()}`);
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
    const result = await api.createRelease(site, 'live', plan.version, { message: plan.message || 'Curated coordi shop and free student dressroom' });
    console.log(JSON.stringify({ release: result.name, version: plan.version, previous: source, changed: plan.changed }));
    return;
  }
  const before = await files(source);
  if(!process.argv.includes('--prepare')) { console.log(JSON.stringify({ source, files: Object.keys(before).length })); return; }
  const html = await liveText('index.html', before);
  const bundle = await liveText('js/app.bundle.js', before);
  const moduleFile = 'js/features/shop-render.js';
  const marker = `/* /${moduleFile} */\n`, endMarker = `\n//# sourceURL=/${moduleFile}`;
  const first = bundle.indexOf(marker), last = bundle.indexOf(endMarker, first);
  assert(first >= 0 && last > first);
  const oldModule = bundle.slice(first + marker.length, last);
  const localModule = fs.readFileSync('public/' + moduleFile, 'utf8');
  function market(source) {
    const start = source.indexOf('  function renderAvatarMarket(');
    const end = source.indexOf('\n  function renderShopItems', start);
    assert(start >= 0 && end > start);
    return {start,end,text:source.slice(start,end)};
  }
  const updatedModule = localModule;
  const controllerFile = 'js/features/shop-controller.js';
  const controller = fs.readFileSync('public/' + controllerFile, 'utf8');
  const nextBundle = swapModule(swapModule(bundle,moduleFile,updatedModule),controllerFile,controller);
  assert.equal(swapModule(swapModule(nextBundle,moduleFile,''),controllerFile,''),swapModule(swapModule(bundle,moduleFile,''),controllerFile,''));
  new Function(nextBundle);
  let nextHtml = html.replace(/src="\/js\/app\.bundle\.js(?:\?[^"]*)?"/, 'src="/js/app.bundle.js?v=hair-pixels-20261002"');
  const shopEntry = /if\(placeId === 'shop'\) \{[\s\S]*?\n      \}/g;
  assert.equal([...html.matchAll(shopEntry)].length, 1, 'Unique shop entry required');
  nextHtml = nextHtml.replace(shopEntry, "if(placeId === 'shop') {\n        showShopView();\n        return;\n      }");
  const localHtml = fs.readFileSync('public/index.html','utf8');
  const shopSection = /    <section id="shop-view"[\s\S]*?(?=    <section id="event-view")/;
  assert(shopSection.test(nextHtml) && shopSection.test(localHtml));
  nextHtml = nextHtml.replace(shopSection,localHtml.match(shopSection)[0]);
  for(const name of ['showShopView','renderShopFromFirestore']) {
    const old = functionRange(nextHtml,name), next = functionRange(localHtml,name);
    nextHtml = nextHtml.slice(0,old.start)+next.text+nextHtml.slice(old.end);
  }
  assert.notEqual(nextHtml,html);
  const replacements = {'index.html':nextHtml,'js/app.bundle.js':nextBundle,[moduleFile]:updatedModule,[controllerFile]:controller};
  function collect(dir) {
    for(const entry of fs.readdirSync('public/'+dir,{withFileTypes:true})) {
      const file = dir+'/'+entry.name;
      if(entry.isDirectory()) collect(file);
      else if(!file.endsWith('.partial')) replacements[file]=fs.readFileSync('public/'+file);
    }
  }
  for(const file of ['index.html','dressing-room.js','dressing-room.css','town-bridge.js','hair-prism.js']) replacements['coordi-shop/'+file]=fs.readFileSync('public/coordi-shop/'+file);
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
  fs.writeFileSync(planPath, JSON.stringify({ source, version, files: expected, rawHashes, changed: Object.keys(changes), message: 'Maple-only shop and centered free hair prism editor' }, null, 2));
  console.log(JSON.stringify({ prepared: version, stage, changedCount: Object.keys(changes).length, preservedFiles: Object.keys(before).filter(file => !changes[file]).length }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
