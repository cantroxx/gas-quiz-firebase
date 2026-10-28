#!/usr/bin/env node
'use strict';
// Clone the live site and publish only reviewed classroom changes; preserve other work.
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const base = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth = require(base + 'auth'), { requireAuth } = require(base + 'requireAuth');
const api = require(base + 'hosting/api'), { Client } = require(base + 'apiv2');
const site = 'dj48-quiztown-firebase', root = path.resolve(__dirname, '../..');
const stage = '/tmp/classroom-interface-20261017/hosting';
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
      const r = await fetch(`https://${site}.web.app/${file}?classroom-interface-verify=${Date.now()}`);
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
    const result = await api.createRelease(site, 'live', plan.version, { message: 'Classroom interface: refreshed icons, growth routine planner and classroom return navigation' });
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
  const selected = Object.keys(before).filter(p => /^\/(classroom[^/]*\.css|images\/classroom(?:-icons)?\/|js\/(?:features|domain|application|infrastructure)\/classroom[^/]*\.js)/.test(p));
  selected.push('/index.html','/styles.css','/js/app.bundle.js','/js/data/level-medal-assets.js','/coordi-shop/hair-prism.js','/coordi-shop/verified/female-1032038.png');
  for(let i = 0; i < selected.length; i += 8) {
    const results = await Promise.allSettled(selected.slice(i,i+8).map(async file => {
      assert(before[file], file);
      const response = await fetch(`https://${site}.web.app${file}?interface-stage=${Date.now()}`);
      assert(response.ok, file);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(digest(pack(bytes)), before[file], 'Live hash mismatch: ' + file);
      save('before' + file, bytes); save('candidate' + file, bytes);
    }));
    for(const result of results) if(result.status === 'rejected') throw result.reason;
  }
  save('audit.json', JSON.stringify({source, config:live.release.version.config, files:before},null,2));
  const local = file => fs.readFileSync(root + '/public/' + file);
  const prior = file => fs.readFileSync(stage + '/before/' + file, 'utf8');
  const baseline = file => fs.readFileSync('/tmp/classroom-ui-before/' + path.basename(file),'utf8');
  const replacements = {};
  const put = (file, bytes) => { if(typeof bytes === 'string') bytes = Buffer.from(bytes); save('candidate/' + file, bytes); if(digest(pack(bytes)) !== before['/' + file]) replacements[file] = bytes; };
  let html = prior('index.html'), originalHtml = html;
  const localHtml = read('index.html'), undo = [];
  const change = (old,next) => { html = replaceOnce(html,old,next); undo.push([next,old]); };
  const section = text => { const a=text.indexOf('    <section id="classroom-view"'),b=text.indexOf('    <section id="admin-view"',a); assert(a>=0&&b>a); return text.slice(a,b); };
  assert.equal(section(html),section(baseline('index.html')),'Live classroom changed since local review');
  change(section(html), section(localHtml));
  const fn = (text,name) => { const match=text.match(new RegExp('^    (?:async )?function '+name+'\\([^]*?^    \\}', 'm'));assert(match,name);return match[0]; };
  for(const name of ['getClassroomControllerEvents','showHomeView']) {
    assert.equal(fn(html,name),fn(baseline('index.html'),name),'Live function changed: '+name);
    const next = name === 'showHomeView' ? '    let classroomHomeReturnContext = null;\n' + fn(localHtml,'returnHomeToClassroom') + '\n\n' + fn(localHtml,name) : fn(localHtml,name);
    change(fn(html,name),next);
  }
  change('      <div class="home-topbar">','      <div class="home-topbar">\n        <button id="home-classroom-return" class="button secondary" type="button" hidden>← 우리 교실로 돌아가기</button>');
  for(const pattern of [/src="\/js\/app\.bundle\.js(?:\?[^"]*)?"/,/href="\/classroom\.css(?:\?[^"]*)?"/,/href="\/styles\.css(?:\?[^"]*)?"/]) {
    const old = html.match(pattern)?.[0];assert(old,String(pattern));change(old,old.split('?')[0].replace(/"$/,'')+'?v=classroom-interface-20261017"');
  }
  let restored=html;for(const [next,old] of undo.reverse())restored=replaceOnce(restored,next,old);assert.equal(restored,originalHtml);
  for(const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi))new Function(match[1]);
  put('index.html',html);
  const modules = ['js/features/classroom-controller.js','js/features/classroom-form.js','js/features/classroom-render.js'];
  let bundle = prior('js/app.bundle.js'), originalBundle=bundle;
  function swap(text,file,code,expected) {
    const startMarker=`/* /${file} */\n`, endMarker=`\n//# sourceURL=/${file}`;
    const a=text.indexOf(startMarker),b=text.indexOf(endMarker,a);assert(a>=0&&b>a&&text.indexOf(startMarker,a+1)<0,file);
    if(expected!==undefined)assert.equal(text.slice(a+startMarker.length,b).trimEnd(),expected.trimEnd(),file);
    return text.slice(0,a+startMarker.length)+code.trimEnd()+text.slice(b);
  }
  for(const file of modules) {
    assert.equal(prior(file),baseline(file),'Live module changed since review: '+file);
    const next=read(file);new Function(next);bundle=swap(bundle,file,next,prior(file));put(file,next);
  }
  const strip = text => modules.reduce((text,file)=>swap(text,file,''),text);
  assert.equal(strip(bundle),strip(originalBundle),'Unrelated bundle modules changed');new Function(bundle);put('js/app.bundle.js',bundle);
  assert.equal(prior('classroom.css'),baseline('classroom.css'),'Live classroom stylesheet changed');put('classroom.css',local('classroom.css'));
  let css=prior('styles.css');
  for(const [key,asset] of Object.entries({quest:'cards/fox-quest',routine:'cards/bunny-routine',mission:'community-tree'})) css=replaceOnce(css,`images/classroom-icons/${key}.svg`,`images/classroom/${asset}-320.webp`);
  put('styles.css',css);
  const icons=['student-card','bank','exchange','point-token','dj-coin','inventory','point-shop','coin-shop','group-purchase','home',...['star','heart','book','pencil','crown','medal','trophy','sprout','lightning','ribbon','shield'].map(x=>'keyring-'+x)];
  for(const name of icons)put(`images/classroom-icons/${name}.svg`,local(`images/classroom-icons/${name}.svg`));
  const rawHashes=Object.fromEntries(Object.entries(replacements).map(([file,bytes])=>[file,digest(bytes)]));
  assert.equal(Object.keys(rawHashes).length,28,'Unexpected release scope');
  assert.equal((await api.getChannel('-',site,'live')).release.version.name,source,'Live changed; stage again');
  save('candidate-manifest.json',JSON.stringify({source,rawHashes,modules,sharedShellPreserved:true,unrelatedBundleModulesPreserved:true},null,2));
  console.log(JSON.stringify({source,changed:Object.keys(rawHashes),staged:stage+'/candidate'}));
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
