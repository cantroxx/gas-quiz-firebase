#!/usr/bin/env node
'use strict';
// Authorized 2026-10-17 batch: generated subjects and pending admin/shop loading improvements.
// Clone the current Hosting manifest, retaining previously deployed files and configuration.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),zlib=require('node:zlib');
const base='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(base+'auth'),{requireAuth}=require(base+'requireAuth'),api=require(base+'hosting/api'),{Client}=require(base+'apiv2');
const root=path.resolve(__dirname,'../..'),stage='/tmp/subject-launch-20261017',site='dj48-quiztown-firebase';
const client=new Client({urlPrefix:'https://firebasehosting.googleapis.com',apiVersion:'v1beta1',auth:true});
const digest=b=>crypto.createHash('sha256').update(b).digest('hex'),pack=b=>zlib.gzipSync(b,{level:9});
const files=['index.html','js/app.bundle.js','js/application/admin-usecases.js','js/features/admin-state.js','js/infrastructure/admin-repository.js','js/features/shop-data.js','coordi-shop/dressing-room.js','js/application/ranking-usecases.js','js/features/ranking-data.js','js/infrastructure/ranking-repository.js','js/school-rooms.js','js/data/subject-quiz-catalog.js','subject-quiz/index.html','subject-quiz/app.js','subject-quiz/style.css'];
const save=(p,v)=>fs.writeFileSync(path.join(stage,p),JSON.stringify(v,null,2));
async function manifest(version){let token='',out={};do{const r=(await client.get(version+'/files',{queryParams:{pageSize:1000,...(token?{pageToken:token}:{})}})).body;for(const f of r.files||[])out[f.path]=f.hash;token=r.nextPageToken||'';}while(token);return out;}
(async()=>{
await requireAuth({project:site,...auth.getGlobalDefaultAccount()});const live=await api.getChannel('-',site,'live'),current=live.release.version.name;
if(process.argv.includes('--verify')){const plan=JSON.parse(fs.readFileSync(stage+'/hosting-plan.json'));assert.equal(current.replace(/^projects\/[^/]+\//,''),plan.version.replace(/^projects\/[^/]+\//,''));assert.deepEqual(await manifest(current),plan.files);for(const [p,h]of Object.entries(plan.rawHashes)){const r=await fetch(`https://${site}.web.app/${p}?verify=${Date.now()}`);assert(r.ok);assert.equal(digest(Buffer.from(await r.arrayBuffer())),h,p)}console.log('PASS: complete live manifest and all changed file hashes');return;}
if(process.argv.includes('--release')){const plan=JSON.parse(fs.readFileSync(stage+'/hosting-plan.json'));assert.equal(current,plan.source,'Live changed; inspect and rebase');assert.deepEqual(await manifest(plan.version),plan.files);assert.deepEqual((await client.get(plan.version)).body.config,live.release.version.config);for(const [p,h]of Object.entries(plan.rawHashes))assert.equal(digest(fs.readFileSync(stage+'/candidate/'+p)),h,p);const r=await api.createRelease(site,'live',plan.version,{message:'Generated subject quizzes, cumulative rankings, admin/shop loading improvements'});save('hosting-receipt.json',{release:r.name,version:plan.version,previous:current,changed:Object.keys(plan.rawHashes)});console.log(JSON.stringify({released:r.name,version:plan.version}));return;}
assert(process.argv.includes('--prepare'),'Use --prepare, --release or --verify');
const before=JSON.parse(fs.readFileSync(stage+'/hosting-before.json'));assert.equal(current,before.version,'Live changed; inspect before preparing');assert.deepEqual(await manifest(current),before.files);
const rawHashes={},changes={},uploads={};for(const p of files){const b=fs.readFileSync(root+'/public/'+p);fs.mkdirSync(path.dirname(stage+'/candidate/'+p),{recursive:true});fs.writeFileSync(stage+'/candidate/'+p,b);rawHashes[p]=digest(b);const packed=pack(b),h=digest(packed);changes['/'+p]=h;uploads[h]=packed;}
const cloned=await api.cloneVersion(site,current,false),version=cloned.name||cloned.response?.name;
const pop=(await client.post(version+':populateFiles',{files:changes})).body,uploader=new Client({urlPrefix:pop.uploadUrl,auth:true});
for(const h of pop.uploadRequiredHashes||[]){const r=await uploader.request({method:'POST',path:'/'+h,body:require('node:stream').Readable.from(uploads[h]),responseType:'stream',resolveOnHTTPError:true});assert(r.status<400,'Upload failed')}
await api.updateVersion(site,version.split('/').pop(),{status:'FINALIZED'});const expected={...before.files,...changes};assert.deepEqual(await manifest(version),expected);assert.deepEqual((await client.get(version)).body.config,before.config);save('hosting-plan.json',{source:current,version,files:expected,rawHashes});console.log(JSON.stringify({prepared:version,changed:files.length,preserved:Object.keys(before.files).filter(p=>!changes[p]).length}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
