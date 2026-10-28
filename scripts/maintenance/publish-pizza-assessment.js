#!/usr/bin/env node
"use strict";
// Pizza assessment only: preserve every unrelated live file and Hosting setting.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const base='/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth=require(base+'auth'),{requireAuth}=require(base+'requireAuth'),api=require(base+'hosting/api'),{Client}=require(base+'apiv2');
const site='dj48-quiztown-firebase',root=path.resolve(__dirname,'../..'),stage='/tmp/pizza-release';
const client=new Client({urlPrefix:'https://firebasehosting.googleapis.com',apiVersion:'v1beta1',auth:true});
const digest=b=>crypto.createHash('sha256').update(b).digest('hex'),pack=b=>zlib.gzipSync(b,{level:9});
async function files(version){let token='',all={};do{const r=await client.get(version+'/files',{queryParams:{pageSize:1000,...(token?{pageToken:token}:{})}});for(const f of r.body.files||[])all[f.path]=f.hash;token=r.body.nextPageToken||'';}while(token);return all;}
function localFiles(dir,prefix='pizza-assessment'){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?localFiles(path.join(dir,e.name),prefix+'/'+e.name):[prefix+'/'+e.name]);}
async function main(){
  await requireAuth({project:site,...auth.getGlobalDefaultAccount()});
  const live=await api.getChannel('-',site,'live'),source=live.release.version.name;
  if(process.argv.includes('--release')){
    const plan=JSON.parse(fs.readFileSync(stage+'/hosting-plan.json'));
    assert.equal(source,plan.source,'Live changed; prepare again');
    assert.deepEqual(await files(plan.version),plan.files);
    assert.deepEqual((await client.get(plan.version)).body.config,live.release.version.config);
    for(const [file,hash]of Object.entries(plan.rawHashes))assert.equal(digest(fs.readFileSync(stage+'/candidate/'+file)),hash);
    const result=await api.createRelease(site,'live',plan.version,{message:'Pizza fraction assessment and super-admin management; preserve other games'});
    const receipt={release:result.name,version:plan.version,previous:source,changed:plan.changed};
    fs.writeFileSync(stage+'/receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));return;
  }
  const before=await files(source);
  if(!process.argv.includes('--prepare')){console.log(JSON.stringify({source,files:Object.keys(before).length,existingPizza:Object.keys(before).filter(p=>p.startsWith('/pizza-assessment/'))}));return;}
  async function liveText(file){
    const response=await fetch(`https://${site}.web.app/${file}?pizza-review=${Date.now()}`);assert(response.ok);
    const bytes=Buffer.from(await response.arrayBuffer());assert.equal(digest(pack(bytes)),before['/'+file],`Live mismatch: ${file}`);return bytes.toString('utf8');
  }
  let bundle=await liveText('js/app.bundle.js');
  const replacements={};
  for(const file of ['js/data/quiz-catalog.js','js/features/quiz-render.js','js/features/admin-render.js']){
    const prior=await liveText(file),local=fs.readFileSync(root+'/public/'+file,'utf8');
    const marker=`/* /${file} */\n`,endMarker=`\n//# sourceURL=/${file}`;
    const start=bundle.indexOf(marker),end=bundle.indexOf(endMarker,start);
    assert(start>=0&&end>start&&bundle.indexOf(marker,start+1)<0);
    assert.equal(bundle.slice(start+marker.length,end).trimEnd(),prior.trimEnd(),'Live bundle/module mismatch');
    bundle=bundle.slice(0,start+marker.length)+local.trimEnd()+bundle.slice(end);
    replacements[file]=Buffer.from(local);
  }
  replacements['js/app.bundle.js']=Buffer.from(bundle);
  let html=await liveText('index.html');
  assert(/js\/app\.bundle\.js[^"']*/.test(html));
  html=html.replace(/js\/app\.bundle\.js[^"']*/, 'js/app.bundle.js?v=pizza-assessment-20260916');
  replacements['index.html']=Buffer.from(html);
  for(const file of localFiles(root+'/public/pizza-assessment'))replacements[file]=fs.readFileSync(root+'/public/'+file);
  const changes={},uploads={},rawHashes={};
  for(const [file,bytes]of Object.entries(replacements)){
    fs.mkdirSync(path.dirname(stage+'/candidate/'+file),{recursive:true});fs.writeFileSync(stage+'/candidate/'+file,bytes);
    const packed=pack(bytes),hash=digest(packed);changes['/'+file]=hash;uploads[hash]=packed;rawHashes[file]=digest(bytes);
  }
  assert.equal((await api.getChannel('-',site,'live')).release.version.name,source,'Live changed');
  const clone=await api.cloneVersion(site,source,false),version=clone.name||clone.response?.name;assert.match(version,/sites\/[^/]+\/versions\//);
  const pop=await client.post(version+':populateFiles',{files:changes}),uploader=new Client({urlPrefix:pop.body.uploadUrl,auth:true});
  for(const hash of pop.body.uploadRequiredHashes||[]){const r=await uploader.request({method:'POST',path:'/'+hash,body:require('node:stream').Readable.from(uploads[hash]),responseType:'stream',resolveOnHTTPError:true});assert(r.status<400,'Upload failed');}
  await api.updateVersion(site,version.split('/').pop(),{status:'FINALIZED'});
  const expected={...before,...changes};assert.deepEqual(await files(version),expected,'Unrelated Hosting files changed');
  assert.deepEqual((await client.get(version)).body.config,live.release.version.config,'Hosting settings changed');
  fs.writeFileSync(stage+'/hosting-plan.json',JSON.stringify({source,version,files:expected,rawHashes,changed:Object.keys(changes)},null,2));
  console.log(JSON.stringify({prepared:version,stage,changed:Object.keys(changes),preservedFiles:Object.keys(before).filter(p=>!changes[p]).length}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
