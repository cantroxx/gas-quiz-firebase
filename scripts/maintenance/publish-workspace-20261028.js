#!/usr/bin/env node
'use strict';
// Explicitly authorized workspace release. Preserve the complete live manifest/config.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),zlib=require('node:zlib');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2'),api=require(lib+'hosting/api');
const site='dj48-quiztown-firebase',root=path.resolve(__dirname,'../..'),stage='/tmp/quiztown-release-20261028';
const client=new Client({urlPrefix:'https://firebasehosting.googleapis.com',apiVersion:'v1beta1',auth:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),pack=b=>zlib.gzipSync(b,{level:9});
const save=(f,v)=>fs.writeFileSync(path.join(stage,f),JSON.stringify(v,null,2)+'\n');
const read=f=>JSON.parse(fs.readFileSync(path.join(stage,f)));
async function files(version){let token='',all={};do{const r=(await client.get(version+'/files',{queryParams:{pageSize:1000,...token?{pageToken:token}:{}}})).body;for(const f of r.files||[])all[f.path]=f.hash;token=r.nextPageToken||'';}while(token);return all;}
const sameVersion=(a,b)=>a.replace(/^projects\/[^/]+\//,'')===b.replace(/^projects\/[^/]+\//,'');
(async()=>{
 await requireAuth({project:site,...auth.getGlobalDefaultAccount()});const live=await api.getChannel('-',site,'live'),source=live.release.version.name;
 if(process.argv.includes('--verify')){
  const plan=read('hosting-plan.json');assert(sameVersion(source,plan.version));assert.deepEqual(await files(source),plan.files);assert.deepEqual(live.release.version.config,plan.config);
  const queue=Object.entries(plan.rawHashes);await Promise.all(Array.from({length:8},async()=>{while(queue.length){const [f,h]=queue.shift(),r=await fetch(`https://${site}.web.app${f}?release=20261028-${Date.now()}`);assert(r.ok,f);assert.equal(hash(Buffer.from(await r.arrayBuffer())),h,f);}}));
  save('hosting-verified.json',{version:source,verifiedFiles:Object.keys(plan.rawHashes).length,manifestMatches:true,configPreserved:true});console.log('PASS live manifest/config and every changed file hash');return;
 }
 if(process.argv.includes('--release')){
  const plan=read('hosting-plan.json');assert.equal(source,plan.source,'Live changed; prepare again');assert.equal(read('checks.json').passed,true);assert.equal(read('functions-deployed.json').passed,true);
  for(const [f,h]of Object.entries(plan.rawHashes))assert.equal(hash(fs.readFileSync(path.join(root,'public',f))),h,'Local changed: '+f);
  assert.deepEqual(await files(plan.version),plan.files);assert.deepEqual((await client.get(plan.version)).body.config,plan.config);
  const result=await api.createRelease(site,'live',plan.version,{message:'2026-10-28: default coordi clothes, common preview and validated workspace changes'});
  save('hosting-receipt.json',{release:result.name,version:plan.version,previous:source,changed:plan.changed,preservedFiles:Object.keys(plan.files).length-plan.changed.length});console.log('Released '+plan.version);return;
 }
 assert(process.argv.includes('--prepare'),'Use --prepare, --release or --verify');assert.equal(read('checks.json').passed,true);
 const snapshot=read('hosting-before.json');assert.equal(source,snapshot.source,'Live changed since inventory');
 const changes={},rawHashes={},uploads={},excluded=[];
 function walk(dir){for(const e of fs.readdirSync(path.join(root,'public',dir),{withFileTypes:true})){
  const f=path.posix.join(dir,e.name);
  // Retain established Vercel/local-preview boundaries, incomplete downloads and dev assets.
  if(e.name.startsWith('.')||['node_modules','dev-assets'].includes(e.name)||/^(fraction-world|town-preview|cozy-home-preview)(\/|$)/.test(f)||f.endsWith('.partial')||f==='js/data/securities-fixture.js'){excluded.push(f);continue;}
  if(e.isDirectory()){walk(f);continue;}
  const bytes=fs.readFileSync(path.join(root,'public',f)),zip=pack(bytes),h=hash(zip);if(snapshot.files['/'+f]===h)continue;
  changes['/'+f]=h;rawHashes['/'+f]=hash(bytes);uploads[h]=zip;
 }}walk('');assert(Object.keys(changes).length>0);
 const clone=await api.cloneVersion(site,source,false),version=clone.name||clone.response?.name;assert.match(version,/sites\/[^/]+\/versions\//);
 const populated=(await client.post(version+':populateFiles',{files:changes})).body,uploader=new Client({urlPrefix:populated.uploadUrl,auth:true}),pending=[...(populated.uploadRequiredHashes||[])];
 await Promise.all(Array.from({length:8},async()=>{while(pending.length){const h=pending.shift(),r=await uploader.request({method:'POST',path:'/'+h,body:require('node:stream').Readable.from(uploads[h]),responseType:'stream',resolveOnHTTPError:true});assert(r.status<400,'Upload '+r.status);}}));
 await api.updateVersion(site,version.split('/').pop(),{status:'FINALIZED'});const expected={...snapshot.files,...changes};assert.deepEqual(await files(version),expected);assert.deepEqual((await client.get(version)).body.config,snapshot.config);
 save('hosting-plan.json',{source,version,files:expected,config:snapshot.config,rawHashes,changed:Object.keys(changes),excluded});console.log(JSON.stringify({prepared:version,changed:Object.keys(changes).length,preserved:Object.keys(snapshot.files).length-Object.keys(changes).filter(f=>snapshot.files[f]).length,excluded}));
})().catch(e=>{console.error(e);process.exitCode=1;});
