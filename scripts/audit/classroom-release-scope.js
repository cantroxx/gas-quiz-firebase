#!/usr/bin/env node
'use strict';
// Audit the live classroom source without changing production.
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
async function main(){
 await requireAuth({project:site,...auth.getGlobalDefaultAccount()});
 const live=await api.getChannel('-',site,'live'),source=live.release.version.name,manifest=await files(source);
 const selected=Object.keys(manifest).filter(p=>/^\/(classroom[^/]*\.css|images\/classroom(?:-icons)?\/|js\/(?:features|domain|application|infrastructure)\/classroom[^/]*\.js)/.test(p));
 selected.push('/index.html','/styles.css','/js/app.bundle.js','/js/data/level-medal-assets.js','/coordi-shop/hair-prism.js');
 let count=0;
 for(let i=0;i<selected.length;i+=8) await Promise.all(selected.slice(i,i+8).map(async file=>{const r=await fetch(`https://${site}.web.app${file}?classroom-audit=${Date.now()}`);assert(r.ok,file);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(digest(pack(bytes)),manifest[file],file);save('before'+file,bytes);count++;}));
 assert.equal((await api.getChannel('-',site,'live')).release.version.name,source,'Live changed during audit');
 save('audit.json',JSON.stringify({source,config:live.release.version.config,files:manifest,downloaded:selected},null,2));
 console.log(JSON.stringify({source,downloaded:count,stage}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
