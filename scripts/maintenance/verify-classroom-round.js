#!/usr/bin/env node
'use strict';
const fs = require('node:fs'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const base = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const { Client } = require(base + 'apiv2'), auth = require(base + 'auth'), { requireAuth } = require(base + 'requireAuth');
const hosting = require(base + 'hosting/api');
const site = 'dj48-quiztown-firebase', stage = '/tmp/classroom-round-20261004';
async function main() {
  await requireAuth({ project: site, ...auth.getGlobalDefaultAccount() });
  const plan = JSON.parse(fs.readFileSync(stage + '/hosting/hosting-plan.json'));
  const live = await hosting.getChannel('-', site, 'live');
  assert(live.release.version.name.endsWith(plan.version));
  await Promise.all(Object.entries(plan.rawHashes).map(async ([file, hash]) => {
    const response = await fetch(`https://${site}.web.app/${file}?classroom-verify=${Date.now()}`);
    assert(response.ok, file);
    assert.equal(crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'), hash, file);
  }));
  const result = { version: plan.version, previous: plan.source, release: live.release.name, verifiedFiles: Object.keys(plan.rawHashes) };
  fs.writeFileSync(stage + '/verification.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
