#!/usr/bin/env node
'use strict';
// Download the exact deployed sources before creating a narrowly scoped release.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const base = '/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const { Client } = require(base + 'apiv2'), auth = require(base + 'auth'), { requireAuth } = require(base + 'requireAuth');
const root = path.resolve(__dirname, '../..'), stage = '/tmp/classroom-home-20261004';
const site = 'dj48-quiztown-firebase';
async function main() {
  await requireAuth({ project: site, ...auth.getGlobalDefaultAccount() });
  const api = new Client({ urlPrefix: 'https://cloudfunctions.googleapis.com', apiVersion: 'v2', auth: true });
  for(const id of ['getClassroomStudentCards', 'coordiShopAction']) {
    const name = `projects/${site}/locations/asia-northeast3/functions/${id}`;
    const meta = (await api.get(name)).body;
    assert.equal(meta.state, 'ACTIVE');
    fs.writeFileSync(`${stage}/${id}-before.json`, JSON.stringify({ name: meta.name, updateTime: meta.updateTime, buildConfig: { source: meta.buildConfig.source } }, null, 2));
    const download = (await api.post(name + ':generateDownloadUrl', {})).body;
    const result = await fetch(download.downloadUrl); assert(result.ok);
    fs.writeFileSync(`${stage}/${id}.zip`, Buffer.from(await result.arrayBuffer()));
    fs.mkdirSync(`${stage}/live-${id}`, { recursive: true });
    execFileSync('unzip', ['-oq', `${stage}/${id}.zip`, '-d', `${stage}/live-${id}`]);
  }
  const liveDir = `${stage}/live-getClassroomStudentCards`;
  const live = fs.readFileSync(liveDir + '/index.js', 'utf8');
  const local = fs.readFileSync(root + '/functions/index.js', 'utf8');
  for(const name of ['assertLinkedMemberAuth', 'assertMemberCanEnterClassroom', 'loadClassroomSettingsForTransaction']) {
    const pattern = new RegExp('^(?:async )?function ' + name + '\\([\\s\\S]*?^\\}', 'm');
    assert.equal(live.match(pattern)?.[0], local.match(pattern)?.[0], `Authorization helper differs: ${name}`);
    assert(live.match(pattern));
  }
  const start = live.indexOf('function publicClassroomStudentCard(');
  const end = live.indexOf('\nfunction ', start + 10);
  assert(start >= 0 && end > start);
  const oldField = '    profileImageUrl: String(data.profileImageUrl || "").slice(0, 1200),';
  assert(live.slice(start, end).includes(oldField));
  const service = local.slice(local.indexOf('const classroomPortraitService = '), local.indexOf('exports.setClassroomSelectedBadge = '));
  assert(service.includes('exports.classroomPortraitAction')); assert(!live.includes('exports.classroomPortraitAction'));
  const output = `${stage}/functions-release/functions`;
  fs.cpSync(liveDir, output, { recursive: true });
  let candidate = live.slice(0, start) + live.slice(start, end).replace(oldField, '    ...classroomPortrait.publicPortrait(data, profile),') + live.slice(end);
  candidate = candidate.replace('initializeApp();', "const { getStorage } = require('firebase-admin/storage');\nconst classroomPortrait = require('./classroom/portrait');\n\ninitializeApp();");
  candidate += '\n' + service;
  fs.writeFileSync(output + '/index.js', candidate);
  fs.cpSync(root + '/functions/classroom', output + '/classroom', { recursive: true });
  fs.mkdirSync(output + '/coordi-shop', { recursive: true });
  const deployedCatalog = fs.readFileSync(`${stage}/live-coordiShopAction/coordi-shop/catalog.json`);
  assert.equal(deployedCatalog.toString(), fs.readFileSync(root + '/functions/coordi-shop/catalog.json', 'utf8'), 'Market catalog differs from deployed catalog');
  fs.writeFileSync(output + '/coordi-shop/catalog.json', deployedCatalog);
  fs.writeFileSync(`${stage}/functions-release/firebase.json`, JSON.stringify({ functions: { source: 'functions' } }, null, 2));
  if(!fs.existsSync(output + '/node_modules')) fs.symlinkSync(root + '/functions/node_modules', output + '/node_modules', 'dir');
  execFileSync(process.execPath, ['--check', output + '/index.js']);
  console.log('Prepared deployed-source-based classroom functions. Targets: classroomPortraitAction, getClassroomStudentCards. Authorization helpers and deployed market catalog match.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
