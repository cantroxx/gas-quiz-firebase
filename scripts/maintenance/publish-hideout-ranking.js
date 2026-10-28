#!/usr/bin/env node
'use strict';
// Clone live Hosting; change only the reviewed ranking modules and entry points.
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
const releaseDirectory = homeLoadingMode ? '/tmp/home-loading-release' : homeMode ? '/tmp/home-dashboard-release' : schoolMode ? '/tmp/school-rooms-release' : eventMode ? '/tmp/event-release' : '/tmp/hideout-release';
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
  let replacements;
  if(homeLoadingMode) {
    const html = await liveText('index.html', before), bundle = await liveText('js/app.bundle.js', before);
    const local = fs.readFileSync('public/index.html', 'utf8');
    const names = ['renderHomeView', 'loadHomeMemberDataFromFirestore', 'renderHomeMemberDataFromFirestore', 'getHomeControllerEvents', 'resetShopRuntimeData', 'resetUserEconomyCache', 'resetRoomSettingsCache', 'showQuizComplete', 'renderHomeOwnedItemsFromFirestore', 'renderProfileRankingRecordsFromFirestore'];
    let next = html;
    assert(!next.includes('let homeLoadEpoch ='), 'Home loading patch already present');
    for(const name of names) {
      const old = functionRange(next, name), replacement = functionRange(local, name);
      next = next.slice(0, old.start) + replacement.text + next.slice(old.end);
    }
    const start = local.indexOf('    let homeLoadEpoch =');
    const end = local.indexOf('    function renderHomeView()', start);
    assert(start > 0 && end > start);
    next = next.replace('    function renderHomeView()', local.slice(start, end) + '    function renderHomeView()');
    next = next.replace(/src="\/js\/app\.bundle\.js(?:\?[^"]*)?"/, 'src="/js/app.bundle.js?v=home-loading-20260917"');
    replacements = { 'index.html': next };
    let nextBundle = bundle;
    for(const file of ['js/application/home-usecases.js', 'js/features/home-render.js', 'js/features/home-controller.js']) {
      const old = await liveText(file, before);
      fs.mkdirSync(path.dirname(releaseDirectory + '/before/' + file), {recursive:true});
      fs.writeFileSync(releaseDirectory + '/before/' + file, old);
      replacements[file] = fs.readFileSync('public/' + file, 'utf8');
      nextBundle = swapModule(nextBundle, file, replacements[file]);
    }
    replacements['js/app.bundle.js'] = nextBundle;
    new Function(nextBundle);
    for(const inline of next.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) new Function(inline[1]);
    fs.writeFileSync(releaseDirectory + '/before/index.html', html);
  } else if(homeMode) {
    const html = await liveText('index.html', before);
    const start = html.indexOf("      if(placeId === 'home') {");
    const end = html.indexOf("      if(placeId === 'school') {", start);
    assert(start > 0 && end > start);
    assert(html.slice(start, end).includes("window.location.href = '/housing/'"));
    let next = html.slice(0, start) + "      if(placeId === 'home') {\n        showHomeView();\n        return;\n      }\n" + html.slice(end);
    const link = '        <a class="home-detail-toggle home-housing-link" href="/housing/">🏠 우리집 꾸미기</a>\n';
    assert(next.includes(link)); next = next.replace(link, '');
    for(const inline of next.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) new Function(inline[1]);
    replacements = { 'index.html': next };
    fs.mkdirSync(releaseDirectory + '/before', { recursive: true });
    fs.writeFileSync(releaseDirectory + '/before/index.html', html);
  } else if(schoolMode) {
    const names = ['index.html', 'js/app.bundle.js', 'js/features/quiz-render.js', 'js/battle-hub.js'];
    const originals = Object.fromEntries(await Promise.all(names.map(async file => [file, await liveText(file, before)])));
    const local = fs.readFileSync('public/index.html', 'utf8');
    const once = (source, from, to) => {
      assert(source.includes(from) && source.indexOf(from) === source.lastIndexOf(from), `Unique anchor missing: ${from}`);
      return source.replace(from, to);
    };
    let html = originals['index.html'];
    assert(!html.includes('/js/school-rooms.js'), 'School rooms already deployed; review live');
    html = once(html, '<link rel="stylesheet" href="/school-entry.css?v=3">', '<link rel="stylesheet" href="/school-entry.css?v=3">\n  <link rel="stylesheet" href="/school-rooms.css?v=1">');
    const section = local.match(/^.*<section id="school-room-view".*$/m)[0];
    const subjectSection = html.match(/^.*<section id="subject-view".*$/m)[0];
    html = once(html, subjectSection, section + '\n\n' + subjectSection);
    html = once(html, "      'school-view',", "      'school-view',\n      'school-room-view',");
    html = once(html, '/js/school-hubs.js?v=1', '/js/school-rooms.js?v=1');
    html = once(html, '/js/battle-hub.js?v=5', '/js/battle-hub.js?v=6');
    html = html.replace(/src="\/js\/app\.bundle\.js(?:\?[^"]*)?"/, 'src="/js/app.bundle.js?v=school-rooms-20260917"');
    for(const name of ['renderSchoolQuizCards', 'showSubjectView']) {
      const old = functionRange(html, name), next = functionRange(local, name);
      html = html.slice(0, old.start) + next.text + html.slice(old.end);
    }
    html = once(html, "        } else if(!document.getElementById('subject-view')?.hidden) {", "        } else if(!document.getElementById('school-room-view')?.hidden) {\n          await window.DJ48SchoolHubs.refresh();\n        } else if(!document.getElementById('subject-view')?.hidden) {");
    let render = originals['js/features/quiz-render.js'];
    render = once(render, '      if(viewModel.externalQuizHub &&', "      if(viewModel.subjectId === 'popular') viewModel.schoolHub = 'popular';\n      if(viewModel.externalQuizHub &&");
    for(const node of ['item', 'button']) render = once(render, `if(viewModel.subjectId) ${node}.dataset.subjectId`, `if(viewModel.subjectId && !viewModel.schoolHub) ${node}.dataset.subjectId`);
    const battle = once(originals['js/battle-hub.js'], "    window.location.href = '/battle/';", "    if(window.DJ48SchoolHubs?.open) window.DJ48SchoolHubs.open('games');\n    else window.location.href = '/battle/';");
    const bundle = swapModule(originals['js/app.bundle.js'], 'js/features/quiz-render.js', render);
    assert.equal(swapModule(bundle, 'js/features/quiz-render.js', ''), swapModule(originals['js/app.bundle.js'], 'js/features/quiz-render.js', ''));
    new Function(bundle); new Function(battle);
    for(const inline of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) new Function(inline[1]);
    replacements = { 'index.html': html, 'js/app.bundle.js': bundle, 'js/features/quiz-render.js': render, 'js/battle-hub.js': battle };
    for(const file of ['js/school-rooms.js', 'school-rooms.css']) replacements[file] = fs.readFileSync('public/' + file, 'utf8');
    for(const [file, content] of Object.entries(originals)) {
      fs.mkdirSync(path.dirname(releaseDirectory + '/before/' + file), {recursive:true});
      fs.writeFileSync(releaseDirectory + '/before/' + file, content);
    }
  } else if(eventMode) {
    const [html, bundle] = await Promise.all(['index.html', 'js/app.bundle.js'].map(file => liveText(file, before)));
    const local = fs.readFileSync('public/index.html', 'utf8');
    let nextHtml = html;
    for(const name of ['renderEventLoadingState', 'loadEventProgress', 'renderEventProgressFromFunctions', 'showEventView', 'showQuizComplete', 'leaveQuizPlaySession']) {
      const old = functionRange(nextHtml, name), next = functionRange(local, name);
      nextHtml = nextHtml.slice(0, old.start) + next.text + nextHtml.slice(old.end);
    }
    const anchor = '  <script src="/js/ranking-plaza-loader.js?v=1"></script>';
    assert(nextHtml.includes(anchor) && !nextHtml.includes('/js/event-plaza-loader.js'));
    nextHtml = nextHtml.replace(anchor, anchor + '\n  <script src="/js/event-plaza-loader.js?v=1"></script>');
    nextHtml = nextHtml.replace(/src="\/js\/app\.bundle\.js(?:\?[^"]*)?"/, 'src="/js/app.bundle.js?v=event-20260917"');
    for(const inline of nextHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) new Function(inline[1]);
    replacements = { 'index.html': nextHtml };
    let nextBundle = bundle, unchangedBefore = bundle;
    const changedModules = ['js/features/event-state.js', 'js/features/event-render.js', 'js/application/event-usecases.js'];
    for(const file of changedModules) {
      const content = fs.readFileSync('public/' + file, 'utf8');
      replacements[file] = content;
      nextBundle = swapModule(nextBundle, file, content);
      unchangedBefore = swapModule(unchangedBefore, file, '');
    }
    let unchangedAfter = nextBundle;
    for(const file of changedModules) unchangedAfter = swapModule(unchangedAfter, file, '');
    assert.equal(unchangedAfter, unchangedBefore, 'Unrelated bundle modules changed');
    new Function(nextBundle);
    replacements['js/app.bundle.js'] = nextBundle;
    replacements['js/event-plaza-loader.js'] = fs.readFileSync('public/js/event-plaza-loader.js', 'utf8');
    fs.mkdirSync(releaseDirectory + '/before/js', { recursive: true });
    fs.writeFileSync(releaseDirectory + '/before/index.html', html);
    fs.writeFileSync(releaseDirectory + '/before/js/app.bundle.js', bundle);
  } else if(process.argv.includes('--performance')) {
    const [html, bundle] = await Promise.all(['index.html', 'js/app.bundle.js'].map(file => liveText(file, before)));
    const local = fs.readFileSync('public/index.html', 'utf8');
    let nextHtml = html;
    for(const name of ['clearRuntimeDataCaches', 'runProfileHomeAction', 'renderRankingView', 'getRankingRenderDeps', 'loadRankingPlazaCardsFromFirestore', 'renderRankingSaveStatus']) {
      const old = functionRange(nextHtml, name), next = functionRange(local, name);
      nextHtml = nextHtml.slice(0, old.start) + next.text + nextHtml.slice(old.end);
    }
    assert(nextHtml.includes('/js/hideout-ranking-plaza.js?v=2'));
    assert(!nextHtml.includes('/js/ranking-plaza-loader.js'));
    nextHtml = nextHtml.replace('  <script src="/js/hideout-ranking-plaza.js?v=2"></script>',
      '  <script src="/js/ranking-plaza-loader.js?v=1"></script>\n  <script src="/js/hideout-ranking-plaza.js?v=3"></script>');
    assert(/src="\/js\/app\.bundle\.js(?:\?[^"]*)?"/.test(nextHtml));
    nextHtml = nextHtml.replace(/src="\/js\/app\.bundle\.js(?:\?[^"]*)?"/, 'src="/js/app.bundle.js?v=ranking-20260916"');
    for(const inline of nextHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) new Function(inline[1]);
    replacements = { 'index.html': nextHtml };
    let nextBundle = bundle, unchangedBefore = bundle;
    const changedModules = [...modules, 'js/application/ranking-usecases.js'];
    for(const file of changedModules) {
      const content = fs.readFileSync('public/' + file, 'utf8');
      replacements[file] = content;
      nextBundle = swapModule(nextBundle, file, content);
      unchangedBefore = swapModule(unchangedBefore, file, '');
    }
    let unchangedAfter = nextBundle;
    for(const file of changedModules) unchangedAfter = swapModule(unchangedAfter, file, '');
    assert.equal(unchangedAfter, unchangedBefore, 'Unrelated bundle modules changed');
    new Function(nextBundle);
    replacements['js/app.bundle.js'] = nextBundle;
    for(const file of ['js/hideout-ranking-plaza.js', 'js/ranking-plaza-loader.js']) replacements[file] = fs.readFileSync('public/' + file, 'utf8');
    fs.mkdirSync('/tmp/hideout-release/before/js', { recursive: true });
    fs.writeFileSync('/tmp/hideout-release/before/index.html', html);
    fs.writeFileSync('/tmp/hideout-release/before/js/app.bundle.js', bundle);
  } else if(process.argv.includes('--links-only')) {
    const [html, script] = await Promise.all(['index.html', 'js/hideout-ranking-plaza.js'].map(file => liveText(file, before)));
    const nextScript = fs.readFileSync('public/js/hideout-ranking-plaza.js', 'utf8');
    const removed = "      const link = document.createElement('a'); link.href = game.href; link.textContent = `${game.label} 도전하기`;\n      actions.append(link);\n";
    assert(script.includes(removed), 'Expected game launch links are missing; review live code');
    assert.equal(script.replace(removed, ''), nextScript, 'Only launch link removal is authorized in this release');
    const oldTag = '/js/hideout-ranking-plaza.js?v=1';
    assert(html.includes(oldTag));
    replacements = { 'index.html': html.replace(oldTag, '/js/hideout-ranking-plaza.js?v=2'), 'js/hideout-ranking-plaza.js': nextScript };
  } else {
  const [html, bundle, css] = await Promise.all(['index.html', 'js/app.bundle.js', 'plaza-views.css'].map(file => liveText(file, before)));
  assert(!html.includes('/js/hideout-ranking-plaza.js'), 'Hideout already present; review before a new release');
  let nextHtml = html;
  for(const name of ['wb', 'mb', 'gs', 'ct', 'tm']) {
    const expression = new RegExp(`^.*<script src="/js/${name}-ranking-plaza\\.js[^"\\n]*"></script>\\r?\\n`, 'm');
    assert(expression.test(nextHtml), `Missing existing ${name} ranking script`);
    nextHtml = nextHtml.replace(expression, '');
  }
  nextHtml = nextHtml.replace(/^.*<script src="\/js\/study-town-ranking-compat\.js[^"\n]*"><\/script>\r?\n/gm, '');
  const anchor = '  <script src="/js/ranking-visibility.js?v=1"></script>';
  assert(nextHtml.includes(anchor));
  nextHtml = nextHtml.replace(anchor, anchor + '\n  <script src="/js/hideout-ranking-plaza.js?v=1"></script>')
    .replace('<!-- 온라인 대전(낱말대전) 탭은 wb-ranking-plaza.js 가 아래 탭 줄에 끼워 넣는다 -->', '<!-- 아지트의 네 분야 랭킹은 hideout-ranking-plaza.js에서 연결한다. -->');
  replacements = { 'index.html': nextHtml };
  let nextBundle = bundle;
  for(const file of modules) {
    const content = fs.readFileSync('public/' + file, 'utf8');
    replacements[file] = content;
    nextBundle = swapModule(nextBundle, file, content);
  }
  // Replacing our two modules must leave every other module byte-identical.
  let unchangedBefore = bundle, unchangedAfter = nextBundle;
  for(const file of modules) {
    unchangedBefore = swapModule(unchangedBefore, file, '');
    unchangedAfter = swapModule(unchangedAfter, file, '');
  }
  assert.equal(unchangedAfter, unchangedBefore);
  replacements['js/app.bundle.js'] = nextBundle;
  replacements['js/hideout-ranking-plaza.js'] = fs.readFileSync('public/js/hideout-ranking-plaza.js', 'utf8');
  const extraCss = fs.readFileSync('public/plaza-views.css', 'utf8').split('\n').filter(line =>
    /^#ranking-view \.(ranking-row-identity|ranking-row-avatar|hideout-ranking-actions)/.test(line)
    || line.startsWith('#ranking-view [data-ranking-board-panel="hideout"]'));
  assert.equal(extraCss.length, 5);
  replacements['plaza-views.css'] = css.trimEnd() + '\n' + extraCss.join('\n') + '\n';
  }
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
  for(const hash of populated.body.uploadRequiredHashes || []) {
    const result = await uploader.request({ method: 'POST', path: '/' + hash, body: require('node:stream').Readable.from(uploads[hash]), responseType: 'stream', resolveOnHTTPError: true });
    assert(result.status < 400, `Upload failed: ${result.status}`);
  }
  await api.updateVersion(site, version.split('/').pop(), { status: 'FINALIZED' });
  const expected = { ...before, ...changes };
  assert.deepEqual(await files(version), expected, 'Unrelated Hosting files changed');
  assert.deepEqual((await client.get(version)).body.config, live.release.version.config, 'Hosting config changed');
  fs.writeFileSync(planPath, JSON.stringify({ source, version, files: expected, rawHashes, changed: Object.keys(changes), message: homeLoadingMode ? 'Home: deferred rewards, lazy details and scoped loading cache' : homeMode ? 'Home: restore profile journal as the default home entrance' : schoolMode ? 'School rooms: five unified activity spaces and direct quiz entry' : eventMode ? 'Event plaza: scoped cache, intent preload and nonblocking refresh' : process.argv.includes('--performance') ? 'Ranking: incremental field loading and shared short-lived profile cache' : undefined }, null, 2));
  console.log(JSON.stringify({ prepared: version, stage, changed: Object.keys(changes), preservedFiles: Object.keys(before).filter(file => !changes[file]).length }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
