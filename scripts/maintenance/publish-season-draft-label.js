#!/usr/bin/env node
'use strict';
// Clone current live Hosting and change only season draft labels and help text.
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
const releaseDirectory = '/tmp/season-draft-label-release';
const stage = releaseDirectory + '/candidate';
const planPath = releaseDirectory + '/hosting-plan.json';
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
    const result = await api.createRelease(site, 'live', plan.version, { message: plan.message || 'Clarify season draft creation and activation instructions' });
    console.log(JSON.stringify({ release: result.name, version: plan.version, previous: source, changed: plan.changed }));
    return;
  }
  const before = await files(source);
  if(!process.argv.includes('--prepare')) { console.log(JSON.stringify({ source, files: Object.keys(before).length })); return; }
  const html = await liveText('index.html', before);
  const replacements={};
  let nextHtml=html;
  const oldLabel='disabled>편집기에 추가</button>',newLabel='disabled>이 초안으로 시즌 만들기</button>';
  const oldHelp='리롤로 대상 활동을 바꾸고, 아래 편집기에 추가해 확인한 뒤 활성화·저장하세요.';
  const newHelp='리롤로 대상 활동을 바꿀 수 있습니다. ‘이 초안으로 시즌 만들기’를 누르면 아래 시즌 이벤트 설계에 입력됩니다. 내용을 확인하고 ‘활성’ 체크 후 ‘저장’해야 학생에게 적용됩니다.';
  assert.equal(html.split(oldLabel).length,2);assert.equal(html.split(oldHelp).length,2);
  nextHtml=nextHtml.replace(oldLabel,newLabel).replace(oldHelp,newHelp);
  assert(/src="\/js\/admin-season-draft.js[^"<>]*"/.test(nextHtml));
  nextHtml=nextHtml.replace(/src="\/js\/admin-season-draft.js[^"<>]*"/,'src="/js/admin-season-draft.js?v=label-20260929"');
  replacements['index.html']=nextHtml;
  let script=await liveText('js/admin-season-draft.js',before);
  const messages=[
    ['이 초안은 이미 편집기에 있습니다. 기존 내용을 확인해 주세요.','이 초안은 이미 아래 시즌 이벤트 설계에 추가되어 있습니다. 기존 내용을 확인해 주세요.'],
    ['편집기는 최대 6개 시즌을 지원합니다. 기존 항목을 정리한 뒤 추가하세요.','시즌은 최대 6개까지 설정할 수 있습니다. 기존 항목을 정리한 뒤 추가하세요.'],
    ['편집기에 추가했습니다. 대상·조건·보상을 확인하고 활성 체크 후 저장하세요.','아래 시즌 이벤트 설계에 초안을 입력했습니다. 아직 학생에게 적용되지 않았습니다. 대상·조건·보상을 확인하고 ‘활성’ 체크 후 ‘저장’하세요.']
  ];
  for(const [oldText,newText]of messages){assert.equal(script.split(oldText).length,2);script=script.replace(oldText,newText);}
  new Function(script);replacements['js/admin-season-draft.js']=script;
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
  const pendingHashes = [...(populated.body.uploadRequiredHashes || [])];
  console.log(`Required uploads: ${pendingHashes.length}`);
  await Promise.all(Array.from({length:32},async()=>{ while(pendingHashes.length) { const hash=pendingHashes.shift();
    const result = await uploader.request({ method: 'POST', path: '/' + hash, body: require('node:stream').Readable.from(uploads[hash]), responseType: 'stream', resolveOnHTTPError: true });
    assert(result.status < 400, `Upload failed: ${result.status}`);
  }
  }));
  await api.updateVersion(site, version.split('/').pop(), { status: 'FINALIZED' });
  const expected = { ...before, ...changes };
  assert.deepEqual(await files(version), expected, 'Unrelated Hosting files changed');
  assert.deepEqual((await client.get(version)).body.config, live.release.version.config, 'Hosting config changed');
  fs.writeFileSync(planPath, JSON.stringify({ source, version, files: expected, rawHashes, changed: Object.keys(changes), message: 'Clarify season draft creation and activation instructions' }, null, 2));
  console.log(JSON.stringify({ prepared: version, stage, changedCount: Object.keys(changes).length, preservedFiles: Object.keys(before).filter(file => !changes[file]).length }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
