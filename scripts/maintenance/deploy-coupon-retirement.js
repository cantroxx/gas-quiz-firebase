#!/usr/bin/env node
'use strict';
const fs = require('node:fs'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { spawnSync, execFileSync } = require('node:child_process');
const lib = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth = require(lib + 'auth'), { requireAuth } = require(lib + 'requireAuth'), { Client } = require(lib + 'apiv2');
const stage = '/tmp/coupon-retirement-20261018', project = 'dj48-quiztown-firebase';
const targets = { coordiShopAction: 'coordi-shop/commerce.js', claimHousingDailyCoupon: 'housing-coupons.js',
  resetHousingWeeklyCoupons: 'housing-coupons.js', purchaseHousingItem: 'index.js' };
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
async function main() {
  assert(process.argv.includes('--deploy') || process.argv.includes('--verify'));
  const checks = JSON.parse(fs.readFileSync(stage + '/checks.json')); assert.equal(checks.passed, true);
  await requireAuth({ project, ...auth.getGlobalDefaultAccount() });
  const api = new Client({ urlPrefix: 'https://cloudfunctions.googleapis.com', apiVersion: 'v2', auth: true });
  const verifiedTargets = [];
  for (const [target, file] of Object.entries(targets)) {
    const dir = stage + '/' + target, before = JSON.parse(fs.readFileSync(dir + '/before.json'));
    assert.equal(digest(fs.readFileSync(dir + '/release/functions/' + file)), checks.hashes[target], 'Candidate changed after tests');
    const current = (await api.get(before.name)).body;
    if (process.argv.includes('--deploy')) {
      assert.equal(current.updateTime, before.updateTime, 'Live changed; re-prepare ' + target);
      console.log('Deploying only ' + target);
      const result = spawnSync('/opt/homebrew/bin/firebase', ['deploy', '--only', 'functions:' + target, '--project', project, '--non-interactive'], { cwd: dir + '/release', stdio: 'inherit' });
      if (result.error) throw result.error;
      assert.equal(result.status, 0, 'Deploy failed: ' + target);
    }
    const after = (await api.get(before.name)).body; assert.equal(after.state, 'ACTIVE');
    const signed = (await api.post(before.name + ':generateDownloadUrl', {})).body;
    const response = await fetch(signed.downloadUrl); assert(response.ok);
    fs.writeFileSync(dir + '/verified-source.zip', Buffer.from(await response.arrayBuffer()), { mode: 0o600 });
    const actual = execFileSync('unzip', ['-p', dir + '/verified-source.zip', file], { maxBuffer: 20 * 1024 * 1024 });
    assert.equal(digest(actual), checks.hashes[target], 'Deployed source mismatch: ' + target);
    for (const key of ['serviceAccountEmail', 'availableMemory', 'timeoutSeconds', 'maxInstanceCount', 'minInstanceCount', 'ingressSettings', 'vpcConnector', 'secretEnvironmentVariables', 'environmentVariables', 'maxInstanceRequestConcurrency', 'availableCpu']) {
      assert.deepEqual(after.serviceConfig[key], before.serviceConfig[key], 'Service setting changed: ' + target + '/' + key);
    }
    assert.equal(after.buildConfig.runtime, before.buildConfig.runtime);
    verifiedTargets.push({ target, updateTime: after.updateTime, sha256: digest(actual) });
    fs.writeFileSync(stage + '/functions-progress.json', JSON.stringify({ verifiedTargets }, null, 2));
    console.log('Verified deployed source and settings: ' + target);
  }
  fs.writeFileSync(stage + '/functions-receipt.json', JSON.stringify({ verifiedTargets, verifiedAt: new Date().toISOString() }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
