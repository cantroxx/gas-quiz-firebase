#!/usr/bin/env node
'use strict';
// Clone the live site and publish only the reviewed shop presentation changes.
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const base = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth = require(base + 'auth'), { requireAuth } = require(base + 'requireAuth');
const api = require(base + 'hosting/api'), { Client } = require(base + 'apiv2');
const site = 'dj48-quiztown-firebase', root = path.resolve(__dirname, '../..');
const stage = '/tmp/coupon-retirement-20261018/hosting';
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
      const r = await fetch(`https://${site}.web.app/${file}?shop-verify=${Date.now()}`);
      assert(r.ok, file);
      assert.equal(digest(Buffer.from(await r.arrayBuffer())), hash, file);
    }
    console.log('PASS live version, complete manifest, and all coupon-removal file hashes.');
    return;
  }
  if (process.argv.includes('--release')) {
    const plan = JSON.parse(fs.readFileSync(stage + '/hosting-plan.json'));
    assert.equal(source, plan.source, 'Live changed; stage and verify again');
    assert.deepEqual(await files(plan.version), plan.files);
    assert.deepEqual((await client.get(plan.version)).body.config, live.release.version.config);
    for (const [file, hash] of Object.entries(plan.rawHashes)) assert.equal(digest(fs.readFileSync(stage + '/candidate/' + file)), hash, file);
    const result = await api.createRelease(site, 'live', plan.version, { message: 'Retire housing coupons and remove automatic claim UI; preserve town shop' });
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
    const r = await fetch(`https://${site}.web.app/${file}?shop-stage=${Date.now()}`);
    assert(r.ok, 'Fetch failed: ' + file);
    const bytes = Buffer.from(await r.arrayBuffer());
    assert.equal(digest(pack(bytes)), before['/' + file], 'Live hash mismatch: ' + file);
    save('before/' + file, bytes);
    return bytes.toString('utf8');
  }
  function cut(text, start, end, replacement = '') {
    assert.equal(text.split(start).length, 2, 'Missing/duplicate UI start: ' + start);
    const a = text.indexOf(start), b = text.indexOf(end, a); assert(b > a);
    return text.slice(0, a) + replacement + text.slice(b);
  }
  const rawHashes = {};
  for (const file of ['index.html', 'housing/index.html', 'housing/app.js', 'housing/housing-data.js']) {
    let text = await liveText(file);
    if (file === 'index.html') {
      text = replaceOnce(text, '      claimHousingDailyCouponSilently(profile);\n', '');
      text = cut(text, '    // 하우징 주간 쿠폰:', '    // ---- 문의하기');
    } else if (file === 'housing/index.html') {
      text = cut(text, '            <div class="status-box" id="coupon-box"', '            <div class="status-box" id="room-name-box"');
      for (const match of ['id="btn-coupon-item"', 'id="profile-info-coupon"', '쿠폰이 2장으로 초기화']) {
        assert.equal(text.split(match).length, 2, match);
        text = text.split('\n').filter(line => !line.includes(match)).join('\n');
      }
      text = text.replace(/(src="(?:housing-data|app)\.js\?v=)[^"]+/g, '$1coupon-retirement-20261018');
    } else if (file === 'housing/app.js') {
      text = cut(text, '    // 쿠폰으로 받기:', '// 벽지·바닥 결제 공통', '}\n\n');
      text = cut(text, '            // 오늘의 쿠폰 표시', '            updateUI();');
      text = text.split('\n').filter(line => !line.includes("getElementById('profile-info-coupon')") && !line.includes("const coupon = document.getElementById('coupon-box')")).join('\n');
    } else {
      text = text.split('\n').filter(line => !['coupons: api.coupons', 'coupons: 0,', 'const coupons = Number(data.housingCoupons);', 'api.coupons = Number.isFinite(coupons)', '        claimDailyCouponSilently();'].some(match => line.includes(match))).join('\n');
      text = cut(text, '    // 월요일 자동 초기화의 안전망.', '    // ---- 서버 구매 ----');
      text = cut(text, '            if (Number.isFinite(Number(data.nextCoupons))) {', '            notifyCoin();');
      text = replaceOnce(text, 'async function purchase(itemId, options = {})', 'async function purchase(itemId)');
      text = replaceOnce(text, '{ memberUserId, itemId, useCoupon: options.useCoupon === true }', '{ memberUserId, itemId }');
    }
    if (file.endsWith('.js')) new Function(text);
    else for (const script of text.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) new Function(script[1]);
    save('candidate/' + file, text); rawHashes[file] = digest(Buffer.from(text));
  }
  save('candidate-manifest.json', JSON.stringify({source, rawHashes}, null, 2));
  console.log(JSON.stringify({source, changed: Object.keys(rawHashes), preservedFiles: Object.keys(before).length - 4}));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
