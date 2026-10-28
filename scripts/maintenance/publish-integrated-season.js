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
const releaseDirectory = '/tmp/integrated-hosting-release';
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
  const localHtml=fs.readFileSync('public/index.html','utf8'), replacements={};
  function replaceFunction(old,local,name,indent='  '){
    const pattern=new RegExp('^'+indent+'(?:async )?function '+name+'\\([^]*?^'+indent+'}', 'm');
    const a=old.match(pattern),b=local.match(pattern);assert(a&&b,'Missing function '+name);return old.replace(a[0],b[0]);
  }
  const panel=localHtml.match(/<details class="season-draft-admin"[\s\S]*?<\/details>/)?.[0];assert(panel);
  let nextHtml=html.replace(/<details class="growth-season-admin"[\s\S]*?<\/details>/,panel);assert(nextHtml!==html);
  nextHtml=replaceFunction(nextHtml,localHtml,'normalizeSeasonEvents','    ');
  nextHtml=nextHtml.replace(/src="\/js\/admin-growth-season.js[^"<>]*"/,'src="/js/admin-season-draft.js?v=integrated-20260921"').replace(/src="\/js\/app.bundle.js[^"<>]*"/,'src="/js/app.bundle.js?v=integrated-20260921"').replace(/src="\/js\/player-status-shortcut.js[^"<>]*"/,'src="/js/player-status-shortcut.js?v=floating-20260921"').replace(/href="\/styles.css[^"<>]*"/,'href="/styles.css?v=integrated-20260921"');
  replacements['index.html']=nextHtml;
  let bundle=await liveText('js/app.bundle.js',before);
  const changesByModule={
    'features/admin-render':['renderAdminSeasonEventRows'],
    'features/admin-form':['getAdminSeasonEventsFormValues'],
    'features/ranking-data':['buildSeasonRankingGroups'],
    'features/ranking-render':['renderRankingGroupPanel'],
    'domain/event-domain':['getEventProgressRenderData'],
    'features/event-render':['renderQuestCards','renderSeasonEvents','renderEventCycleGuide','renderEventSections']
  };
  for(const [module,names]of Object.entries(changesByModule)){const file='js/'+module+'.js',local=fs.readFileSync('public/'+file,'utf8');let next=await liveText(file,before);for(const name of names)next=replaceFunction(next,local,name);replacements[file]=next;bundle=swapModule(bundle,file,next);}
  replacements['js/app.bundle.js']=bundle;new Function(bundle);
  let css=await liveText('styles.css',before);const localCss=fs.readFileSync('public/styles.css','utf8');
  for(const selector of ['.map-buttons.town-info-shortcuts','.map-buttons.town-info-shortcuts button','.map-buttons.town-info-shortcuts button:focus-visible']){const start=css.indexOf(selector+' {'),end=css.indexOf('}',start)+1;const localStart=localCss.indexOf(selector+' {'),localEnd=localCss.indexOf('}',localStart)+1;assert(start>=0&&localStart>=0);css=css.slice(0,start)+localCss.slice(localStart,localEnd)+css.slice(end);}
  css+='\n'+localCss.split('\n').filter(line=>line.startsWith('.season-goal-editor')).join('\n');replacements['styles.css']=css;
  for(const file of ['js/admin-season-draft.js','js/player-status-shortcut.js','player-status/index.html','player-status/status.js'])replacements[file]=fs.readFileSync('public/'+file);
  replacements['player-status/index.html']=String(replacements['player-status/index.html']).replace('href="style.css"','href="style.css?v=20260921"').replace('src="status.js"','src="status.js?v=integrated-20260921"');
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
  fs.writeFileSync(planPath, JSON.stringify({ source, version, files: expected, rawHashes, changed: Object.keys(changes), message: 'Integrated admin-defined seasons and floating home links' }, null, 2));
  console.log(JSON.stringify({ prepared: version, stage, changedCount: Object.keys(changes).length, preservedFiles: Object.keys(before).filter(file => !changes[file]).length }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
