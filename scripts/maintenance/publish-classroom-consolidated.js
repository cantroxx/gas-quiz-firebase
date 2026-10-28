#!/usr/bin/env node
'use strict';
// Clone the live site and publish only reviewed classroom changes; preserve other work.
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const base = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth = require(base + 'auth'), { requireAuth } = require(base + 'requireAuth');
const api = require(base + 'hosting/api'), { Client } = require(base + 'apiv2');
const site = 'dj48-quiztown-firebase', root = path.resolve(__dirname, '../..');
const stage = '/tmp/classroom-consolidated-20261017/hosting';
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
    const result = await api.createRelease(site, 'live', plan.version, { message: 'Classroom consolidated: icon selection, student home loading, classroom layout and artwork; quiz preserved' });
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

  const audit=JSON.parse(fs.readFileSync(stage+'/audit.json'));assert.equal(source,audit.source,'Live changed; run classroom-release-scope audit again');
  const before=audit.files,local=file=>fs.readFileSync(root+'/public/'+file),old=file=>fs.readFileSync(stage+'/before/'+file);
  const replacements={},candidate=stage+'/candidate';fs.cpSync(stage+'/before',candidate,{recursive:true});
  const put=(file,bytes)=>{save('candidate/'+file,bytes);if(digest(pack(bytes))!==before['/'+file])replacements[file]=bytes;};
  let html=old('index.html').toString(),originalHtml=html;const localHtml=local('index.html').toString(),undo=[];
  const change=(prior,next)=>{html=replaceOnce(html,prior,next);undo.push([next,prior]);};
  const classroomSection=text=>{const a=text.indexOf('    <section id="classroom-view"'),b=text.indexOf('    <section id="admin-view"',a);assert(a>=0&&b>a);return text.slice(a,b);};
  change(classroomSection(html),classroomSection(localHtml));
  const fn=(text,name)=>{const match=text.match(new RegExp('^    (?:async )?function '+name+'\\([^]*?^    \\}', 'm'));assert(match,name);return match[0];};
  for(const name of ['getClassroomRepository','renderClassroomPrototype','showClassroomView','getClassroomControllerEvents']) change(fn(html,name),fn(localHtml,name));
  const home=fn(localHtml,'loadClassroomHomeData');assert(!html.includes('async function loadClassroomHomeData('));
  const anchor='    async function loadClassroomStudentCards(';change(anchor,home+'\n\n'+anchor);
  const listenerStart=localHtml.indexOf("    document.getElementById('classroom-view')?.addEventListener('click', event => {",localHtml.indexOf('    async function renderClassroomPrototype('));
  const listenerEnd=localHtml.indexOf('    function setClassroomQuestEditorStatus(',listenerStart);assert(listenerEnd>listenerStart);
  const listeners=localHtml.slice(listenerStart,listenerEnd);assert(listeners.includes('classroom-tab-changed'));change('    function setClassroomQuestEditorStatus(',listeners+'    function setClassroomQuestEditorStatus(');
  for(const pattern of [/src="\/js\/app\.bundle\.js(?:\?[^"]*)?"/,/href="\/classroom\.css(?:\?[^"]*)?"/,/href="\/classroom-market-art\.css(?:\?[^"]*)?"/]){
    const prior=html.match(pattern)?.[0];assert(prior);change(prior,prior.split('?')[0].replace(/"$/,'')+'?v=classroom-consolidated-20261017"');
  }
  let restored=html;for(const [next,prior] of undo.reverse())restored=replaceOnce(restored,next,prior);assert.equal(restored,originalHtml,'Shared shell changed outside classroom patches');
  put('index.html',Buffer.from(html));
  let bundle=old('js/app.bundle.js').toString(),originalBundle=bundle;
  const modules=Object.keys(before).filter(f=>/^\/js\/(features|domain|application|infrastructure)\/classroom[^/]*\.js$/.test(f)).map(f=>f.slice(1));
  function swap(text,file,code,expected){const a=`/* /${file} */\n`,b=`\n//# sourceURL=/${file}`;const start=text.indexOf(a),end=text.indexOf(b,start);assert(start>=0&&end>start,file);if(expected!==undefined)assert.equal(text.slice(start+a.length,end).trimEnd(),expected.trimEnd(),file);return text.slice(0,start+a.length)+code.trimEnd()+text.slice(end);}
  for(const file of modules){const next=local(file);new Function(next.toString());bundle=swap(bundle,file,next.toString(),old(file).toString());put(file,next);}
  const strip=text=>modules.reduce((value,file)=>swap(value,file,''),text);assert.equal(strip(bundle),strip(originalBundle),'Non-classroom bundled modules changed');new Function(bundle);put('js/app.bundle.js',Buffer.from(bundle));
  for(const file of ['classroom.css','classroom-diary.css','classroom-market-art.css'])put(file,local(file));
  function walk(dir){return fs.readdirSync(root+'/public/'+dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);}
  for(const file of [...walk('images/classroom'),...walk('images/classroom-icons')]){assert(/\.(png|webp|svg)$/.test(file));put(file,local(file));}
  const rawHashes=Object.fromEntries(Object.entries(replacements).map(([file,bytes])=>[file,digest(bytes)]));
  save('candidate-manifest.json',JSON.stringify({source,rawHashes,sharedShellPreserved:true,unrelatedBundleModulesPreserved:true,modules},null,2));
  console.log(JSON.stringify({source,changed:Object.keys(rawHashes),changedCount:Object.keys(rawHashes).length,staged:candidate}));
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
