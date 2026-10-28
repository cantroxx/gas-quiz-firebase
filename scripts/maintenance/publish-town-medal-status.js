#!/usr/bin/env node
'use strict';
// Clone live and publish only the reviewed place/status scope.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const base='/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth=require(base+'auth'),{requireAuth}=require(base+'requireAuth'),api=require(base+'hosting/api'),{Client}=require(base+'apiv2');
const site='dj48-quiztown-firebase',root=path.resolve(__dirname,'../..'),stage='/tmp/town-medal-status-followup-release';
const client=new Client({urlPrefix:'https://firebasehosting.googleapis.com',apiVersion:'v1beta1',auth:true});
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const pack=b=>zlib.gzipSync(b,{level:9});
const readJson=f=>JSON.parse(fs.readFileSync(stage+'/'+f));
const save=(f,b)=>{fs.mkdirSync(path.dirname(stage+'/'+f),{recursive:true});fs.writeFileSync(stage+'/'+f,b);};
const saveJson=(f,v)=>save(f,JSON.stringify(v,null,2));
const changedFiles=["index.html", "js/app.bundle.js", "js/data/level-medal-assets.js", "player-status/index.html", "player-status/status.js", "js/player-status-shortcut.js", "images/town-medals-20261018/level-001.svg", "images/town-medals-20261018/level-002.svg", "images/town-medals-20261018/level-003.svg", "images/town-medals-20261018/level-004.svg", "images/town-medals-20261018/level-005.svg", "images/town-medals-20261018/level-006.svg", "images/town-medals-20261018/level-007.svg", "images/town-medals-20261018/level-008.svg", "images/town-medals-20261018/level-009.svg", "images/town-medals-20261018/level-010.svg", "images/town-medals-20261018/level-011.svg", "images/town-medals-20261018/level-012.svg", "images/town-medals-20261018/level-013.svg", "images/town-medals-20261018/level-014.svg", "images/town-medals-20261018/level-015.svg", "images/town-medals-20261018/level-016.svg", "images/town-medals-20261018/level-017.svg", "images/town-medals-20261018/level-018.svg", "images/town-medals-20261018/level-019.svg", "images/town-medals-20261018/level-020.svg", "images/town-medals-20261018/level-021.svg", "images/town-medals-20261018/level-022.svg", "images/town-medals-20261018/level-023.svg", "images/town-medals-20261018/level-024.svg", "images/town-medals-20261018/level-025.svg", "images/town-medals-20261018/level-026.svg", "images/town-medals-20261018/level-027.svg", "images/town-medals-20261018/level-028.svg", "images/town-medals-20261018/level-029.svg", "images/town-medals-20261018/level-030.svg", "images/town-medals-20261018/level-031.svg", "images/town-medals-20261018/level-032.svg", "images/town-medals-20261018/level-033.svg", "images/town-medals-20261018/level-034.svg", "images/town-medals-20261018/level-035.svg", "images/town-medals-20261018/level-036.svg", "images/town-medals-20261018/level-037.svg", "images/town-medals-20261018/level-038.svg", "images/town-medals-20261018/level-039.svg", "images/town-medals-20261018/level-040.svg", "images/town-medals-20261018/level-041.svg", "images/town-medals-20261018/level-042.svg", "images/town-medals-20261018/level-043.svg", "images/town-medals-20261018/level-044.svg", "images/town-medals-20261018/level-045.svg", "images/town-medals-20261018/level-046.svg", "images/town-medals-20261018/level-047.svg", "images/town-medals-20261018/level-048.svg", "images/town-medals-20261018/level-049.svg", "images/town-medals-20261018/level-050.svg", "images/town-medals-20261018/level-051.svg", "images/town-medals-20261018/level-052.svg", "images/town-medals-20261018/level-053.svg", "images/town-medals-20261018/level-054.svg", "images/town-medals-20261018/level-055.svg", "images/town-medals-20261018/level-056.svg", "images/town-medals-20261018/level-057.svg", "images/town-medals-20261018/level-058.svg", "images/town-medals-20261018/level-059.svg", "images/town-medals-20261018/level-060.svg", "images/town-medals-20261018/level-061.svg", "images/town-medals-20261018/level-062.svg", "images/town-medals-20261018/level-063.svg", "images/town-medals-20261018/level-064.svg", "images/town-medals-20261018/level-065.svg", "images/town-medals-20261018/level-066.svg", "images/town-medals-20261018/level-067.svg", "images/town-medals-20261018/level-068.svg", "images/town-medals-20261018/level-069.svg", "images/town-medals-20261018/level-070.svg", "images/town-medals-20261018/level-071.svg", "images/town-medals-20261018/level-072.svg", "images/town-medals-20261018/level-073.svg", "images/town-medals-20261018/level-074.svg", "images/town-medals-20261018/level-075.svg", "images/town-medals-20261018/level-076.svg", "images/town-medals-20261018/level-077.svg", "images/town-medals-20261018/level-078.svg", "images/town-medals-20261018/level-079.svg", "images/town-medals-20261018/level-080.svg", "images/town-medals-20261018/level-081.svg", "images/town-medals-20261018/level-082.svg", "images/town-medals-20261018/level-083.svg", "images/town-medals-20261018/level-084.svg", "images/town-medals-20261018/level-085.svg", "images/town-medals-20261018/level-086.svg", "images/town-medals-20261018/level-087.svg", "images/town-medals-20261018/level-088.svg", "images/town-medals-20261018/level-089.svg", "images/town-medals-20261018/level-090.svg", "images/town-medals-20261018/level-091.svg", "images/town-medals-20261018/level-092.svg", "images/town-medals-20261018/level-093.svg", "images/town-medals-20261018/level-094.svg", "images/town-medals-20261018/level-095.svg", "images/town-medals-20261018/level-096.svg", "images/town-medals-20261018/level-097.svg", "images/town-medals-20261018/level-098.svg", "images/town-medals-20261018/level-099.svg", "images/town-medals-20261018/level-100.svg"];
const additions=[];
const normalize=v=>v.replace(/^projects\/[^/]+\//,'');
async function files(version){let token='',result={};do{const r=await client.get(version+'/files',{queryParams:{pageSize:1000,...(token?{pageToken:token}:{})}});for(const f of r.body.files||[])result[f.path]=f.hash;token=r.body.nextPageToken||'';}while(token);return result;}
async function download(file,manifest){const r=await fetch('https://'+site+'.web.app/'+file+'?spatial-snapshot='+Date.now());assert(r.ok,file);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(digest(pack(bytes)),manifest['/'+file],file+' live content mismatch');return bytes;}
async function main(){
  await requireAuth({project:site,...auth.getGlobalDefaultAccount()});
  const live=await api.getChannel('-',site,'live'),source=live.release.version.name;
  if(process.argv.includes('--verify')){
    const plan=readJson('hosting-plan.json');assert.equal(normalize(source),normalize(plan.version));assert.deepEqual(await files(source),plan.files);
    assert.deepEqual(live.release.version.config,readJson('live-manifest.json').config);
    const entries=Object.entries(plan.rawHashes);for(let i=0;i<entries.length;i+=6)await Promise.all(entries.slice(i,i+6).map(async([file,hash])=>{const b=await download(file,plan.files);assert.equal(digest(b),hash,file);}));
    console.log('PASS live manifest, Hosting configuration and all 106 published file hashes.');return;
  }
  if(process.argv.includes('--release')){
    const plan=readJson('hosting-plan.json');assert.equal(source,plan.source,'Live changed; rebuild candidate');
    assert.deepEqual(await files(plan.version),plan.files);assert.deepEqual((await client.get(plan.version)).body.config,live.release.version.config);
    for(const [file,hash]of Object.entries(plan.rawHashes))assert.equal(digest(fs.readFileSync(stage+'/candidate/'+file)),hash,file);
    const checks=readJson('checks.json');assert.equal(checks.candidateDigest,digest(fs.readFileSync(stage+'/candidate-manifest.json')));assert.equal(checks.passed,true);
    const release=await api.createRelease(site,'live',plan.version,{message:'Number-free jewel medals and progressive authenticated status panel'});
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
    const hashes=pop.body.uploadRequiredHashes||[];for(let i=0;i<hashes.length;i+=6)await Promise.all(hashes.slice(i,i+6).map(async hash=>{const r=await uploader.request({method:'POST',path:'/'+hash,body:require('node:stream').Readable.from(uploads[hash]),responseType:'stream',resolveOnHTTPError:true});assert(r.status<400,'Upload failed');}));
    await api.updateVersion(site,version.split('/').pop(),{status:'FINALIZED'});
    const expected={...before,...changes};assert.deepEqual(await files(version),expected);assert.deepEqual((await client.get(version)).body.config,live.release.version.config);
    saveJson('hosting-plan.json',{source,version,files:expected,rawHashes:candidate.rawHashes,changed:Object.keys(changes)});
    console.log(JSON.stringify({version,changed:Object.keys(changes),preservedFiles:Object.keys(before).filter(p=>!changes[p]).length}));return;
  }
  assert(process.argv.includes('--snapshot'),'Use --snapshot, --prepare, --release or --verify');
  const before=await files(source);
  const checked=JSON.parse(fs.readFileSync(root+'/docs/product/town-medal-status-review-2026-10-18/source-manifest.json'));
  for(const [file,hash]of Object.entries(checked))assert.equal(digest(fs.readFileSync(root+'/public/'+file)),hash,'Changed since full check: '+file);
  await Promise.all(changedFiles.filter(file=>!additions.includes(file)).map(async file=>save('before/'+file,await download(file,before))));
  saveJson('live-manifest.json',{source,files:before,config:live.release.version.config});
  console.log(JSON.stringify({source,stage,existingFiles:Object.keys(before).length,downloaded:changedFiles.length-additions.length}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
