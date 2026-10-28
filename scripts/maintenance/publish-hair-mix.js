#!/usr/bin/env node
'use strict';
// Clone live and publish only the reviewed hair mix controls.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const base='/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth=require(base+'auth'),{requireAuth}=require(base+'requireAuth'),api=require(base+'hosting/api'),{Client}=require(base+'apiv2');
const site='dj48-quiztown-firebase',root=path.resolve(__dirname,'../..'),stage='/tmp/hair-mix-release';
const client=new Client({urlPrefix:'https://firebasehosting.googleapis.com',apiVersion:'v1beta1',auth:true});
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const pack=b=>zlib.gzipSync(b,{level:9});
const readJson=f=>JSON.parse(fs.readFileSync(stage+'/'+f));
const save=(f,b)=>{fs.mkdirSync(path.dirname(stage+'/'+f),{recursive:true});fs.writeFileSync(stage+'/'+f,b);};
const saveJson=(f,v)=>save(f,JSON.stringify(v,null,2));
const changedFiles=['coordi-shop/index.html','coordi-shop/dressing-room.js','coordi-shop/dressing-room.css','coordi-shop/town-bridge.js'];
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
    console.log('PASS live manifest, Hosting configuration and all 4 published file hashes.');return;
  }
  if(process.argv.includes('--release')){
    const plan=readJson('hosting-plan.json');assert.equal(source,plan.source,'Live changed; rebuild candidate');
    assert.deepEqual(await files(plan.version),plan.files);assert.deepEqual((await client.get(plan.version)).body.config,live.release.version.config);
    for(const [file,hash]of Object.entries(plan.rawHashes))assert.equal(digest(fs.readFileSync(stage+'/candidate/'+file)),hash,file);
    const checks=readJson('checks.json');assert.equal(checks.candidateDigest,digest(fs.readFileSync(stage+'/candidate-manifest.json')));assert.equal(checks.passed,true);
    const release=await api.createRelease(site,'live',plan.version,{message:'Hair native mix dye: eight base/mix colors, percent control, legacy appearance retained'});
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
  const rawHashes={};
  for(const file of changedFiles){
    const bytes=await download(file,before);
    assert.deepEqual(bytes,fs.readFileSync(stage+'/live/'+file),'Hair baseline changed; review before rebuilding: '+file);
    save('before/'+file,bytes);
    const candidate=fs.readFileSync(root+'/public/'+file);save('candidate/'+file,candidate);rawHashes[file]=digest(candidate);
  }
  saveJson('candidate-manifest.json',{source,rawHashes});
  saveJson('live-manifest.json',{source,files:before,config:live.release.version.config});
  console.log(JSON.stringify({source,stage,existingFiles:Object.keys(before).length,downloaded:changedFiles.length}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
