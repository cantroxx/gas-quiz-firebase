#!/usr/bin/env node
'use strict';
// Clone the live site and publish only the reviewed classroom diary changes.
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const base = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth = require(base + 'auth'), { requireAuth } = require(base + 'requireAuth');
const api = require(base + 'hosting/api'), { Client } = require(base + 'apiv2');
const site = 'dj48-quiztown-firebase', root = path.resolve(__dirname, '../..');
const stage = '/tmp/classroom-diary-release-20261017/hosting';
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
      const r = await fetch(`https://${site}.web.app/${file}?classroom-diary-verify=${Date.now()}`);
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
    assert.equal((await api.getChannel('-', site, 'live')).release.version.name, plan.source, 'Live changed immediately before release; preserve it and rebase');
    const result = await api.createRelease(site, 'live', plan.version, { message: 'Classroom student cards, selectable portraits and private/class diary with comments' });
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
  async function liveBytes(file) {
    assert(before['/' + file], 'Missing live dependency: ' + file);
    const r = await fetch(`https://${site}.web.app/${file}?diary-stage=${Date.now()}`);
    assert(r.ok, file);
    const bytes = Buffer.from(await r.arrayBuffer());
    assert.equal(digest(pack(bytes)), before['/' + file], 'Live hash mismatch: ' + file);
    save('before/' + file, bytes); return bytes;
  }
  const local = file => fs.readFileSync(root + '/public/' + file);
  const originalHtml = (await liveBytes('index.html')).toString();
  let html = originalHtml;
  const cssLink = '  <link rel="stylesheet" href="/classroom-diary.css?v=20261017">\n';
  const classLink = html.match(/^.*<link[^\n]+href="\/classroom\.css[^\n]+\n/m)?.[0];
  assert(classLink); html = replaceOnce(html, classLink, classLink + cssLink);
  const navAnchor = '          <div class="classroom-tabs" role="tablist" aria-label="우리 교실 메뉴">';
  const diaryNav = '          <button type="button" class="classroom-diary-nav" data-classroom-diary="friends">마음 일기</button>\n';
  html = replaceOnce(html, navAnchor, diaryNav + navAnchor);
  const localHtml=read('index.html');
  const callback=localHtml.slice(localHtml.indexOf('        openClassroomDiary: async options => {'),localHtml.indexOf('        handleClassroomEntrySubmit,',localHtml.indexOf('        openClassroomDiary: async options => {')));
  assert(callback.includes("httpsCallable('classroomDiaryAction')"));
  html=replaceOnce(html,'        handleClassroomEntrySubmit,',callback+'        handleClassroomEntrySubmit,');
  const oldBundleRef=html.match(/src="\/js\/app\.bundle\.js(?:\?[^\"]*)?"/g);assert.equal(oldBundleRef.length,1);
  const nextBundleRef='src="/js/app.bundle.js?v=classroom-diary-20261017"';
  html=replaceOnce(html,oldBundleRef[0],nextBundleRef);
  // Undo only authorized edits; the rest of the shared shell, including quiz work, must be identical.
  assert.equal(html.replace(cssLink,'').replace(diaryNav,'').replace(callback,'').replace(nextBundleRef,oldBundleRef[0]),originalHtml);
  const originalBundle=(await liveBytes('js/app.bundle.js')).toString();let bundle=originalBundle;
  const replacements={'index.html':Buffer.from(html)};
  const modules=['js/features/classroom-portrait.js','js/features/classroom-render.js','js/features/classroom-controller.js','js/features/classroom-state.js'];
  function swap(text,file,next,expected){
    const a=`/* /${file} */\n`,b=`\n//# sourceURL=/${file}`;
    const start=text.indexOf(a),end=text.indexOf(b,start);assert(start>=0&&end>start&&text.indexOf(a,start+1)<0,file);
    if(expected!==undefined)assert.equal(text.slice(start+a.length,end).trimEnd(),expected.trimEnd(),'Bundle mismatch: '+file);
    return text.slice(0,start+a.length)+next.trimEnd()+text.slice(end);
  }
  function functionBody(source,name){const re=new RegExp('^  function '+name+'\\([\\s\\S]*?^  \\}', 'm');const found=source.match(re);assert(found,name);return found[0];}
  for(const file of modules){
    const prior=(await liveBytes(file)).toString();let next=prior;
    if(file.endsWith('classroom-portrait.js')) next=read(file);
    if(file.endsWith('classroom-render.js')){
      next=replaceOnce(next,functionBody(prior,'fillClassroomPortrait'),functionBody(read(file),'fillClassroomPortrait'));
      const anchor='  function renderClassroomTodayHome(data = {}, deps = {}) {\n';
      const hook="    if(deps.isCurrentClassroomTeacher?.(data.settings || {}) !== true && rootCardHome()) {\n      window.DJ48ClassroomCardHome.render(data, deps, { fillPortrait: fillClassroomPortrait, quests: getVisibleClassroomQuests(data.settings || {}, deps) });\n      return;\n    }\n";
      next=replaceOnce(next,anchor,anchor+hook);
      next=replaceOnce(next,'  window.DJ48ClassroomRender = {\n','  window.DJ48ClassroomRender = {\n    fillClassroomPortrait,\n');
      next=replaceOnce(next,'})();',"  function rootCardHome() { return typeof window.DJ48ClassroomCardHome?.render === 'function'; }\n})();");
    }
    if(file.endsWith('classroom-controller.js')){
      const anchor="      if(event.target.closest('[data-classroom-edit-portrait]')) deps.editClassroomPortrait?.();\n";
      next=replaceOnce(next,anchor,anchor+"      const diary = event.target.closest('[data-classroom-diary]');\n      if(diary && !diary.disabled) deps.openClassroomDiary?.({ mode: diary.dataset.classroomDiary === 'friends' ? 'friends' : 'mine', ownerId: diary.dataset.classroomDiaryOwner });\n");
    }
    if(file.endsWith('classroom-state.js')) next=replaceOnce(next,'  function resetClassroomRuntimeData() {\n','  function resetClassroomRuntimeData() {\n    window.DJ48ClassroomDiary?.close();\n');
    new Function(next);bundle=swap(bundle,file,next,prior);replacements[file]=Buffer.from(next);
  }
  const strip=text=>modules.reduce((result,file)=>swap(result,file,''),text);
  assert.equal(strip(bundle),strip(originalBundle),'Unrelated bundled modules changed');
  let additions='';
  for(const file of ['js/features/classroom-card-home.js','js/features/classroom-diary.js']){
    assert(!bundle.includes(`/* /${file} */`));const code=local(file);new Function(code.toString());
    additions+=`/* /${file} */\n${code.toString().trimEnd()}\n//# sourceURL=/${file}\n\n`;replacements[file]=code;
  }
  bundle=replaceOnce(bundle,'/* /js/features/classroom-render.js */',additions+'/* /js/features/classroom-render.js */');
  assert.equal(strip(bundle.replace(additions,'')),strip(originalBundle));new Function(bundle);
  replacements['js/app.bundle.js']=Buffer.from(bundle);
  for(const file of ['classroom-diary.css','images/classroom/cards/owl-notice-320.webp','images/classroom/cards/fox-quest-320.webp','images/classroom/cards/bunny-routine-320.webp','images/classroom/stationery/notebook-160.webp','images/classroom/community-tree-320.webp']){
    const bytes=local(file);if(before['/'+file])assert.equal(digest(pack(bytes)),before['/'+file],'Existing art differs; review first: '+file);
    else replacements[file]=bytes;
    save('candidate/'+file,bytes);
  }
  // Exact live dependencies for offline tests; none enter the upload list.
  const deps=Object.keys(before).filter(f=>/^\/js\/.+classroom.+\.js$/.test(f)||/^\/images\/classroom-icons\/.+\.svg$/.test(f));
  deps.push('/classroom.css','/styles.css','/js/data/level-medal-assets.js','/js/data/quiz-catalog.js','/coordi-shop/hair-prism.js','/coordi-shop/verified/female-1032038.png','/images/classroom/reading-sprout.png');
  for(const file of [...new Set(deps)])if(!replacements[file.slice(1)])save('candidate'+file,await liveBytes(file.slice(1)));
  // Test-only fixture picture, not part of the release.
  save('candidate/images/classroom/reading-sprout-320.webp',local('images/classroom/reading-sprout-320.webp'));
  const rawHashes={};for(const [file,bytes] of Object.entries(replacements)){save('candidate/'+file,bytes);rawHashes[file]=digest(bytes);}
  assert.equal((await api.getChannel('-',site,'live')).release.version.name,source,'Live changed; stage again');
  save('candidate-manifest.json',JSON.stringify({source,rawHashes,sharedShellPreserved:true,unrelatedBundleModulesPreserved:true},null,2));
  console.log(JSON.stringify({staged:stage+'/candidate',source,changed:Object.keys(rawHashes),sharedShellPreserved:true,unrelatedBundleModulesPreserved:true}));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
