#!/usr/bin/env node
'use strict';
// Download live sources and prepare only the authorized coupon changes locally.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const lib = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth = require(lib + 'auth'), { requireAuth } = require(lib + 'requireAuth'), { Client } = require(lib + 'apiv2');
const root = path.resolve(__dirname, '../..'), stage = '/tmp/coupon-retirement-20261018';
const project = 'dj48-quiztown-firebase';
const targets = ['coordiShopAction', 'claimHousingDailyCoupon', 'resetHousingWeeklyCoupons', 'purchaseHousingItem'];
function replaceOnce(source, old, next) {
  assert.equal(source.split(old).length, 2, 'Live source mismatch: ' + old.slice(0, 90));
  return source.replace(old, () => next);
}
async function main() {
  await requireAuth({ project, ...auth.getGlobalDefaultAccount() });
  const api = new Client({ urlPrefix: 'https://cloudfunctions.googleapis.com', apiVersion: 'v2', auth: true });
  for (const target of targets) {
    const dir = stage + '/' + target;
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const name = `projects/${project}/locations/asia-northeast3/functions/${target}`;
    const meta = (await api.get(name)).body;
    assert.equal(meta.state, 'ACTIVE');
    fs.writeFileSync(dir + '/before.json', JSON.stringify(meta, null, 2), { mode: 0o600 });
    const signed = (await api.post(name + ':generateDownloadUrl', {})).body;
    const response = await fetch(signed.downloadUrl); assert(response.ok);
    fs.writeFileSync(dir + '/source.zip', Buffer.from(await response.arrayBuffer()), { mode: 0o600 });
    execFileSync('unzip', ['-oq', dir + '/source.zip', '-d', dir + '/before']);
    const output = dir + '/release/functions';
    fs.cpSync(dir + '/before', output, { recursive: true });
    let file;
    if (target === 'coordiShopAction') {
      file = 'coordi-shop/commerce.js';
      let text = fs.readFileSync(output + '/' + file, 'utf8');
      text = replaceOnce(text, " if(profile.purchaseCouponGrant !== 'welcome-20-v1') return 20;\n", '');
      text = replaceOnce(text, " next.purchaseCouponGrant='welcome-20-v1';next.purchaseCoupons=purchaseCoupons(profile);", ' next.purchaseCoupons=purchaseCoupons(profile);');
      fs.writeFileSync(output + '/' + file, text);
    } else if (target === 'purchaseHousingItem') {
      file = 'index.js';
      let text = fs.readFileSync(output + '/' + file, 'utf8');
      const start = text.indexOf('exports.purchaseHousingItem ='); assert(start > 0);
      const prefix = text.slice(0, start), body = text.slice(start);
      // Reject old coupon clients before any item or wallet write; preserve live coin purchases.
      text = prefix + replaceOnce(body, '    if (useCoupon) {\n', '    if (useCoupon) {\n      throw new HttpsError("failed-precondition", "가구 쿠폰은 폐지되어 사용할 수 없어요.");\n');
      fs.writeFileSync(output + '/' + file, text);
    } else {
      file = 'housing-coupons.js';
      fs.copyFileSync(root + '/functions/' + file, output + '/' + file);
    }
    fs.writeFileSync(dir + '/release/firebase.json', JSON.stringify({ functions: { source: 'functions' } }));
    if (!fs.existsSync(output + '/node_modules')) fs.symlinkSync(root + '/functions/node_modules', output + '/node_modules', 'dir');
    execFileSync(process.execPath, ['--check', output + '/' + file]);
    const diff = require('node:child_process').spawnSync('diff', ['-u', dir + '/before/' + file, output + '/' + file], { encoding: 'utf8' });
    assert([0, 1].includes(diff.status));
    fs.writeFileSync(dir + '/candidate.diff', diff.stdout);
    console.log(JSON.stringify({ target, updateTime: meta.updateTime, changedFile: file, diff: dir + '/candidate.diff' }));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
