#!/usr/bin/env node
'use strict';
// Refinement release: clone current live; apply only scoped deltas and two new display assets.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const base='/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth=require(base+'auth'),{requireAuth}=require(base+'requireAuth'),api=require(base+'hosting/api'),{Client}=require(base+'apiv2');
const site='dj48-quiztown-firebase',root=path.resolve(__dirname,'../..'),stage='/tmp/town-refinement-release';
const client=new Client({urlPrefix:'https://firebasehosting.googleapis.com',apiVersion:'v1beta1',auth:true});
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const pack=b=>zlib.gzipSync(b,{level:9});
const readJson=f=>JSON.parse(fs.readFileSync(stage+'/'+f));
const save=(f,b)=>{fs.mkdirSync(path.dirname(stage+'/'+f),{recursive:true});fs.writeFileSync(stage+'/'+f,b);};
const saveJson=(f,v)=>save(f,JSON.stringify(v,null,2));
const changedFiles=['index.html','town-spatial.css','js/town-spatial.js','js/school-rooms.js','js/features/ranking-render.js','js/features/event-render.js','js/features/quiz-render.js','js/app.bundle.js','js/town-avatar.js','images/town-spatial-20261018/school-v2.webp'];
const additions=changedFiles.slice(-2);
const normalize=v=>v.replace(/^projects\/[^/]+\//,'');
async function files(version){let token='',result={};do{const r=await client.get(version+'/files',{queryParams:{pageSize:1000,...(token?{pageToken:token}:{})}});for(const f of r.body.files||[])result[f.path]=f.hash;token=r.body.nextPageToken||'';}while(token);return result;}
async function download(file,manifest){const r=await fetch('https://'+site+'.web.app/'+file+'?spatial-snapshot='+Date.now());assert(r.ok,file);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(digest(pack(bytes)),manifest['/'+file],file+' live content mismatch');return bytes;}
async function main(){
  await requireAuth({project:site,...auth.getGlobalDefaultAccount()});
  const live=await api.getChannel('-',site,'live'),source=live.release.version.name;
  if(process.argv.includes('--verify')){
    const plan=readJson('hosting-plan.json');assert.equal(normalize(source),normalize(plan.version));assert.deepEqual(await files(source),plan.files);
    assert.deepEqual(live.release.version.config,readJson('live-manifest.json').config);
    for(const [file,hash]of Object.entries(plan.rawHashes)){const b=await download(file,plan.files);assert.equal(digest(b),hash,file);}
    console.log('PASS live manifest, Hosting configuration and all 10 published file hashes.');return;
  }
  if(process.argv.includes('--release')){
    const plan=readJson('hosting-plan.json');assert.equal(source,plan.source,'Live changed; rebuild candidate');
    assert.deepEqual(await files(plan.version),plan.files);assert.deepEqual((await client.get(plan.version)).body.config,live.release.version.config);
    for(const [file,hash]of Object.entries(plan.rawHashes))assert.equal(digest(fs.readFileSync(stage+'/candidate/'+file)),hash,file);
    const checks=readJson('checks.json');assert.equal(checks.candidateDigest,digest(fs.readFileSync(stage+'/candidate-manifest.json')));assert.equal(checks.passed,true);
    const release=await api.createRelease(site,'live',plan.version,{message:'Town refinement: saved avatar, full hall, school cleanup, conditional reward dropdown'});
    const receipt={release:release.name,version:plan.version,previous:source,changed:plan.changed,preservedFiles:Object.keys(plan.files).filter(p=>!plan.changed.includes(p)).length};
    saveJson('receipt.json',receipt);console.log(JSON.stringify(receipt));return;
  }
  if(process.argv.includes('--prepare')){
    const candidate=readJson('candidate-manifest.json');assert.equal(source,candidate.source,'Live changed; rebuild candidate');
    const changes={},uploads={};
    for(const [file,hash]of Object.entries(candidate.rawHashes)){const b=fs.readFileSync(stage+'/candidate/'+file);assert.equal(digest(b),hash,file);const zipped=pack(b),h=digest(zipped);changes['/'+file]=h;uploads[h]=zipped;}
    assert.deepEqual(Object.keys(changes).sort(),changedFiles.map(p=>'/'+p).sort());
    const before=await files(source),clone=await api.cloneVersion(site,source,false),version=clone.name||clone.response?.name;assert.match(version,/sites\/[^/]+\/versions\//);
    const pop=await client.post(version+':populateFiles',{files:changes}),uploader=new Client({urlPrefix:pop.body.uploadUrl,auth:true});
    for(const hash of pop.body.uploadRequiredHashes||[]){const r=await uploader.request({method:'POST',path:'/'+hash,body:require('node:stream').Readable.from(uploads[hash]),responseType:'stream',resolveOnHTTPError:true});assert(r.status<400,'Upload failed');}
    await api.updateVersion(site,version.split('/').pop(),{status:'FINALIZED'});
    const expected={...before,...changes};assert.deepEqual(await files(version),expected);assert.deepEqual((await client.get(version)).body.config,live.release.version.config);
    saveJson('hosting-plan.json',{source,version,files:expected,rawHashes:candidate.rawHashes,changed:Object.keys(changes)});
    console.log(JSON.stringify({version,changed:Object.keys(changes),preservedFiles:Object.keys(before).filter(p=>!changes[p]).length}));return;
  }
  assert(process.argv.includes('--snapshot'),'Use --snapshot, --prepare, --release or --verify');
  const before=await files(source);
  const checked=JSON.parse(fs.readFileSync(root+'/docs/product/town-refinement-review-2026-10-18/source-manifest.json'));
  for(const [file,hash]of Object.entries(checked))assert.equal(digest(fs.readFileSync(root+'/public/'+file)),hash,'Changed since full check: '+file);
  await Promise.all(changedFiles.filter(file=>!additions.includes(file)).map(async file=>save('before/'+file,await download(file,before))));
  saveJson('live-manifest.json',{source,files:before,config:live.release.version.config});
  console.log(JSON.stringify({source,stage,existingFiles:Object.keys(before).length,downloaded:changedFiles.length-additions.length}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
