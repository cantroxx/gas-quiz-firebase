#!/usr/bin/env node
'use strict';
// Reviewed popular-quiz overlay on an exact live Hosting manifest.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),api=require(lib+'hosting/api'),{Client}=require(lib+'apiv2');
const site='dj48-quiztown-firebase',stage=process.env.POPULAR_RELEASE_STAGE||'/tmp/popular-release-20261018';
const client=new Client({urlPrefix:'https://firebasehosting.googleapis.com',apiVersion:'v1beta1',auth:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),pack=b=>zlib.gzipSync(b,{level:9});
const read=f=>JSON.parse(fs.readFileSync(path.join(stage,f))),save=(f,v)=>fs.writeFileSync(path.join(stage,f),JSON.stringify(v,null,2)+'\n');
const normalize=v=>v.replace(/^projects\/[^/]+\//,'');
async function files(version){let pageToken='',out={};do{const r=(await client.get(version+'/files',{queryParams:{pageSize:1000,...pageToken?{pageToken}:{}}})).body;for(const f of r.files||[])out[f.path]=f.hash;pageToken=r.nextPageToken||'';}while(pageToken);return out;}
async function parallel(items,fn){let i=0;await Promise.all(Array.from({length:6},async()=>{while(i<items.length)await fn(items[i++]);}));}
async function main(){
 await requireAuth({project:site,...auth.getGlobalDefaultAccount()});
 const live=await api.getChannel('-',site,'live'),source=live.release.version.name,baseline=read('live.json');
 if(process.argv.includes('--verify')){
  const plan=read('hosting-plan.json');assert.equal(normalize(source),normalize(plan.version));assert.deepEqual(await files(source),plan.files);assert.deepEqual(live.release.version.config,baseline.config);
  await parallel(Object.entries(plan.rawHashes),async([file,digest])=>{const r=await fetch('https://'+site+'.web.app/'+file+'?popular-verify='+Date.now());assert(r.ok,file);assert.equal(hash(Buffer.from(await r.arrayBuffer())),digest,file);});
  save('verified.json',{passed:true,at:new Date().toISOString(),version:source,fileCount:Object.keys(plan.rawHashes).length,allHostedBytesMatch:true});console.log('PASS entire published manifest, preserved Hosting settings and every published file byte hash.');return;
 }
 assert.equal(source,baseline.source,'Live changed; rebuild and review the overlay');
 if(process.argv.includes('--release')){
  const plan=read('hosting-plan.json');assert.equal(plan.source,source);assert.deepEqual(await files(plan.version),plan.files);assert.deepEqual((await client.get(plan.version)).body.config,baseline.config);
  const checks=read('checks.json');assert.equal(checks.passed,true);assert.equal(checks.candidateDigest,hash(fs.readFileSync(path.join(stage,'candidate-manifest.json'))));
  for(const [file,digest]of Object.entries(plan.rawHashes))assert.equal(hash(fs.readFileSync(path.join(stage,'candidate',file))),digest,file);
  const result=await api.createRelease(site,'live',plan.version,{message:process.env.POPULAR_RELEASE_MESSAGE||'Popular photo quizzes: five categories, untimed practice/ranking, shared XP/coin rules, curated idol/anime pack'});
  const receipt={at:new Date().toISOString(),release:result.name,version:plan.version,previous:source,changedFiles:plan.changed.length,preservedFiles:Object.keys(baseline.files).filter(p=>!plan.changed.includes(p)).length};save('receipt.json',receipt);console.log(JSON.stringify(receipt));return;
 }
 assert(process.argv.includes('--prepare'),'Use --prepare, --release or --verify');
 const candidate=read('candidate-manifest.json');assert.equal(candidate.source,source);const changes={},uploads=new Map();
 for(const [file,digest]of Object.entries(candidate.rawHashes)){
  assert(file.startsWith('popular-quiz/')||['index.html','js/app.bundle.js','js/school-rooms.js','js/data/popular-quiz-catalog.js','js/domain/ranking-domain.js','js/features/ranking-data.js','js/features/quiz-render.js','js/infrastructure/ranking-repository.js'].includes(file),'Out of scope '+file);
  const bytes=fs.readFileSync(path.join(stage,'candidate',file));assert.equal(hash(bytes),digest,file);const zipped=pack(bytes),h=hash(zipped);changes['/'+file]=h;uploads.set(h,file);
 }
 assert.deepEqual(await files(source),baseline.files);
 const clone=await api.cloneVersion(site,source,false),version=clone.name||clone.response?.name;assert.match(version,/sites\/[^/]+\/versions\//);
 const pop=(await client.post(version+':populateFiles',{files:changes})).body,uploader=new Client({urlPrefix:pop.uploadUrl,auth:true});let done=0;
 await parallel(pop.uploadRequiredHashes||[],async h=>{const bytes=pack(fs.readFileSync(path.join(stage,'candidate',uploads.get(h))));assert.equal(hash(bytes),h);const r=await uploader.request({method:'POST',path:'/'+h,body:require('node:stream').Readable.from(bytes),responseType:'stream',resolveOnHTTPError:true});assert(r.status<400,'Upload failed');if(++done%100===0)console.log('Uploaded '+done+' files');});
 await api.updateVersion(site,version.split('/').pop(),{status:'FINALIZED'});const expected={...baseline.files,...changes};assert.deepEqual(await files(version),expected);assert.deepEqual((await client.get(version)).body.config,baseline.config);
 save('hosting-plan.json',{source,version,files:expected,rawHashes:candidate.rawHashes,changed:Object.keys(changes)});console.log(JSON.stringify({prepared:version,changedFiles:Object.keys(changes).length}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
