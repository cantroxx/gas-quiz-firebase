#!/usr/bin/env node
'use strict';
// Clone the live site and publish only the reviewed classroom market artwork changes.
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const base = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth = require(base + 'auth'), { requireAuth } = require(base + 'requireAuth');
const api = require(base + 'hosting/api'), { Client } = require(base + 'apiv2');
const site = 'dj48-quiztown-firebase', root = path.resolve(__dirname, '../..');
const stage = '/tmp/classroom-market-art-20261017/hosting';
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
    const result = await api.createRelease(site, 'live', plan.version, { message: 'Classroom market item artwork refresh; quiz and purchase behavior preserved' });
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
  const cssLink = '  <link rel="stylesheet" href="/classroom-market-art.css?v=20261017">\n';
  const anchor = originalHtml.match(/^.*<link[^\n]+href="\/classroom-diary\.css[^\n]+\n/m)?.[0];
  assert(anchor);
  const oldRef = originalHtml.match(/src="\/js\/app\.bundle\.js(?:\?[^"]*)?"/g); assert.equal(oldRef.length,1);
  const newRef = 'src="/js/app.bundle.js?v=classroom-market-art-20261017"';
  const html = replaceOnce(replaceOnce(originalHtml,anchor,anchor+cssLink),oldRef[0],newRef);
  assert.equal(html.replace(cssLink,'').replace(newRef,oldRef[0]),originalHtml);
  const file='js/features/classroom-render.js', prior=(await liveBytes(file)).toString();
  const oldDeclaration = "      const assetIcon = createClassroomIconImage(getClassroomShopIconKey(item), item.title || '교실 상품', 'classroom-shop-card-image');\n";
  const start=prior.indexOf("      visual.className = 'classroom-shop-card-visual';");
  const a=prior.indexOf('      if(imageUrl) {',start), b=prior.indexOf("      badge.className = 'classroom-card-badge';",a);
  assert(a>start&&b>a); const oldBlock=prior.slice(a,b);
  assert(oldBlock.includes('else if(assetIcon)') && !oldBlock.includes('purchase'));
  const newBlock='      visual.appendChild(window.DJ48ClassroomShopArt.createImage(item, imageUrl));\n';
  const next=replaceOnce(replaceOnce(prior,oldDeclaration,''),oldBlock,newBlock);
  const originalBundle=(await liveBytes('js/app.bundle.js')).toString();
  const marker=`/* /${file} */\n`, endMarker=`\n//# sourceURL=/${file}`;
  const begin=originalBundle.indexOf(marker), end=originalBundle.indexOf(endMarker,begin);
  assert(begin>=0&&end>begin);assert.equal(originalBundle.slice(begin+marker.length,end).trimEnd(),prior.trimEnd());
  const artFile='js/features/classroom-shop-art.js', art=local(artFile);
  const addition=`/* /${artFile} */\n${art.toString().trimEnd()}\n//# sourceURL=/${artFile}\n\n`;
  assert(!originalBundle.includes(`/* /${artFile} */`));
  const bundle=originalBundle.slice(0,begin)+addition+marker+next.trimEnd()+originalBundle.slice(end);
  assert.equal(bundle.replace(addition,'').replace(next.trimEnd(),prior.trimEnd()),originalBundle);
  new Function(bundle); new Function(next);
  const replacements={'index.html':Buffer.from(html),[file]:Buffer.from(next),'js/app.bundle.js':Buffer.from(bundle),[artFile]:art,'classroom-market-art.css':local('classroom-market-art.css')};
  for(const name of fs.readdirSync(root+'/public/images/classroom/market-v2')) {
    assert(/^[a-z]+-(320|640)\.webp$/.test(name));const file='images/classroom/market-v2/'+name;replacements[file]=local(file);
  }
  assert.equal(Object.keys(replacements).length,59);
  const deps=Object.keys(before).filter(f=>/^\/js\/.+classroom.+\.js$/.test(f)||/^\/images\/classroom-icons\/.+\.svg$/.test(f)||/^\/images\/classroom\/.+\.(webp|png)$/.test(f));
  deps.push('/classroom.css','/classroom-diary.css','/styles.css','/js/data/level-medal-assets.js');
  for(const file of [...new Set(deps)]) if(!replacements[file.slice(1)]) save('candidate'+file,await liveBytes(file.slice(1)));
  const rawHashes={};for(const [file,bytes] of Object.entries(replacements)){save('candidate/'+file,bytes);rawHashes[file]=digest(bytes);}
  assert.equal((await api.getChannel('-',site,'live')).release.version.name,source,'Live changed; stage again');
  save('candidate-manifest.json',JSON.stringify({source,rawHashes,sharedShellPreserved:true,unrelatedBundleModulesPreserved:true},null,2));
  console.log(JSON.stringify({staged:stage+'/candidate',source,changed:Object.keys(rawHashes),sharedShellPreserved:true,unrelatedBundleModulesPreserved:true}));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
