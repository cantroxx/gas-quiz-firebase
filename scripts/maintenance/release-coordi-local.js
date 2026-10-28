#!/usr/bin/env node
'use strict';
// Explicit operator commands only. No Firestore/Storage writes, IAM or rules changes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2'),hosting=require(lib+'hosting/api');
const project='dj48-quiztown-firebase',root=path.resolve(__dirname,'../..');
const stage=process.env.COORDI_RELEASE_STAGE||'/tmp/coordi-production-20261028';
const candidate=process.env.COORDI_RELEASE_CANDIDATE||'/tmp/coordi-supplement-results-20261028/release';
const config=JSON.parse(fs.readFileSync(root+'/public/coordi-shop/runtime-config.json'));
assert.equal(config.mode,'local');
const name=`projects/${project}/locations/asia-northeast3/functions/renderCoordiShopPreview`;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const versionKey=v=>v.replace(/^projects\/[^/]+\//,'');
const read=f=>JSON.parse(fs.readFileSync(path.join(stage,f)));
function write(f,v){fs.mkdirSync(stage,{recursive:true});fs.writeFileSync(path.join(stage,f),JSON.stringify(v,null,2)+'\n',{mode:0o600});}
function filesAt(dir,prefix=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{assert(!e.isSymbolicLink());return e.isDirectory()?filesAt(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name];});}
function checked(){assert.equal(read('checks.json').passed,true,'Run the full check before publishing');}
const clientFiles=['coordi-shop/data-provider.js','coordi-shop/dressing-room.js','coordi-shop/index.html','coordi-shop/renderer/browser-reader.js','coordi-shop/runtime-config.json','coordi-shop/town-bridge.js'];
async function pool(items,fn,n=128){let cursor=0;await Promise.all(Array.from({length:Math.min(n,items.length)},async()=>{while(cursor<items.length)await fn(items[cursor++]);}));}
async function retry(fn){for(let i=0;;i++){try{return await fn();}catch(e){if(i===4)throw e;await new Promise(r=>setTimeout(r,500*2**i));}}}
(async()=>{
 await requireAuth({project,...auth.getGlobalDefaultAccount()});
 const h=new Client({urlPrefix:'https://firebasehosting.googleapis.com',apiVersion:'v1beta1',auth:true});
 const f=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true});
 const live=()=>hosting.getChannel('-',project,'live');
 async function manifest(version){let token='',out={};do{const r=(await h.get(version+'/files',{queryParams:{pageSize:1000,...token?{pageToken:token}:{}}})).body;for(const file of r.files||[])out[file.path]=file.hash;token=r.nextPageToken||'';}while(token);return out;}
 async function allFunctions(){let token='',out=[];do{const r=(await f.get(`projects/${project}/locations/-/functions`,{queryParams:{pageSize:1000,...token?{pageToken:token}:{}}})).body;out.push(...r.functions||[]);token=r.nextPageToken||'';}while(token);return out;}
 const command=process.argv[2];
 if(command==='--snapshot'){
  assert(!fs.existsSync(path.join(stage,'before.json')),'Never overwrite the rollback snapshot');
  const current=await live(),functions=await allFunctions();
  write('before.json',{at:new Date().toISOString(),hosting:current.release.version,files:await manifest(current.release.version.name),functions});
  const before=functions.find(x=>x.name===name);assert(before);write('function-before.json',before);
  const download=(await f.post(name+':generateDownloadUrl',{})).body.downloadUrl;
  const response=await fetch(download);assert(response.ok);fs.writeFileSync(path.join(stage,'function-before.zip'),Buffer.from(await response.arrayBuffer()),{mode:0o600});
  console.log(JSON.stringify({version:current.release.version.name,files:Object.keys(read('before.json').files).length,functions:functions.length,revision:before.serviceConfig.revision,runtime:before.buildConfig.runtime}));return;
 }
 if(command==='--prepare-data'||command==='--prepare-client'){
  const kind=command==='--prepare-data'?'data':'client',planFile=kind+'-plan.json';
  const before=read('before.json'),current=await live();
  const expectedSource=kind==='data'?before.hosting.name:read('data-receipt.json').version;
  assert.equal(versionKey(current.release.version.name),versionKey(expectedSource),'Live changed; rebase explicitly');
  const prior=kind==='data'?before.files:read('data-plan.json').files;
  assert.deepEqual(await manifest(expectedSource),prior);
  const sourceDir=kind==='data'?path.join(candidate,'public'):path.join(root,'public');
  const paths=kind==='data'?filesAt(path.join(sourceDir,'codi')).map(p=>'codi/'+p):clientFiles;
  const changes={},rawHashes={},uploads={};
  for(const file of paths){const full=path.join(sourceDir,file),bytes=fs.readFileSync(full),zipped=zlib.gzipSync(bytes,{level:9}),key=hash(zipped);changes['/'+file]=key;rawHashes[file]=hash(bytes);uploads[key]=full;}
  let plan;
  if(fs.existsSync(path.join(stage,planFile))){plan=read(planFile);assert.equal(plan.source,expectedSource);assert.deepEqual(plan.rawHashes,rawHashes);}
  else{
   const cloned=await hosting.cloneVersion(project,expectedSource,false),version=cloned.name||cloned.response?.name;assert(version);
   const nextConfig=structuredClone(current.release.version.config);
   if(kind==='data'){
    const headers=JSON.parse(fs.readFileSync(path.join(candidate,'hosting-headers.json')));
    nextConfig.headers=[...(nextConfig.headers||[]),...headers.map(x=>({glob:x.source,headers:Object.fromEntries(x.headers.map(v=>[v.key,v.value]))}))];
    await hosting.updateVersion(project,version.split('/').pop(),{config:nextConfig});
   }
   plan={source:expectedSource,version,files:{...prior,...changes},config:nextConfig,rawHashes,completedBatches:0};write(planFile,plan);
  }
  const entries=Object.entries(changes),batchSize=1000;
  for(let i=plan.completedBatches*batchSize;i<entries.length;i+=batchSize){
   const pop=(await retry(()=>h.post(plan.version+':populateFiles',{files:Object.fromEntries(entries.slice(i,i+batchSize))}))).body;
   const uploader=new Client({urlPrefix:pop.uploadUrl,auth:true});
   await pool(pop.uploadRequiredHashes||[],async key=>retry(async()=>{const zipped=zlib.gzipSync(fs.readFileSync(uploads[key]),{level:9});assert.equal(hash(zipped),key);const r=await uploader.request({method:'POST',path:'/'+key,body:require('node:stream').Readable.from(zipped),responseType:'stream',resolveOnHTTPError:true});assert(r.status<400,'Upload status '+r.status);}));
   plan.completedBatches++;write(planFile,plan);console.log(`${kind}: ${Math.min(i+batchSize,entries.length)}/${entries.length} files ready`);
  }
  await hosting.updateVersion(project,plan.version.split('/').pop(),{status:'FINALIZED'});
  assert.deepEqual(await manifest(plan.version),plan.files);assert.deepEqual((await h.get(plan.version)).body.config,plan.config);
  write(kind+'-prepared.json',{version:plan.version,changed:paths.length,preserved:Object.keys(prior).filter(p=>!changes[p]).length,verifiedManifest:true});return;
 }
 if(command==='--publish-data'||command==='--publish-client'){
  checked();const kind=command==='--publish-data'?'data':'client',p=read(kind+'-plan.json');
  assert.equal(read(kind+'-prepared.json').version,p.version);
  assert.equal(versionKey((await live()).release.version.name),versionKey(p.source),'Live changed; do not overwrite');
  assert.deepEqual(await manifest(p.version),p.files);assert.deepEqual((await h.get(p.version)).body.config,p.config);
  if(kind==='client')assert.equal(read('function-receipt.json').localMode,true);
  const result=await hosting.createRelease(project,'live',p.version,{message:`Approved Quiztown local coordi ${kind}, snapshot ${config.snapshot}; preserve existing files and commerce`});
  const receipt={at:new Date().toISOString(),release:result.name,previous:p.source,version:p.version,changed:Object.keys(p.rawHashes).length,totalFiles:Object.keys(p.files).length};write(kind+'-receipt.json',receipt);console.log(JSON.stringify(receipt));return;
 }
 if(command==='--function'){
  checked();assert.equal(read('cdn-reference.json').ok,true,'Production CDN reference validation required');
  const before=read('function-before.json'),current=(await f.get(name)).body;assert.equal(current.updateTime,before.updateTime,'Function changed; rebase explicitly');
  const zip=path.join(stage,'function-candidate.zip');assert(!fs.existsSync(zip));
  const sourceFiles=execFileSync('git',['ls-files','functions'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(p=>!path.basename(p).startsWith('.env')).map(p=>p.slice(10));
  execFileSync('zip',['-q',zip,...sourceFiles],{cwd:path.join(root,'functions')});
  const sourceHashes=Object.fromEntries(sourceFiles.map(p=>[p,hash(fs.readFileSync(path.join(root,'functions',p)))]));write('function-source-hashes.json',sourceHashes);
  const upload=(await f.post(`projects/${project}/locations/asia-northeast3/functions:generateUploadUrl`,{})).body;
  const result=await fetch(upload.uploadUrl,{method:'PUT',headers:{'Content-Type':'application/zip'},body:fs.readFileSync(zip)});assert(result.ok,'Source upload failed');
  const env={...before.serviceConfig.environmentVariables,COORDI_RENDERER_MODE:'local',COORDI_DATA_BASE_URL:`https://${project}.web.app${config.baseUrl}`,COORDI_DATA_SNAPSHOT:config.snapshot,COORDI_MANIFEST_SHA256:config.manifestSha256};
  // A narrow REST field mask preserves all unrelated service/build options and all other functions.
  const operation=(await f.patch(name,{name,buildConfig:{source:{storageSource:upload.storageSource}},serviceConfig:{environmentVariables:env}},{queryParams:{updateMask:'buildConfig.source,serviceConfig.environmentVariables'}})).body;
  write('function-operation.json',{name:operation.name});console.log('Started scoped function deployment');return;
 }
 if(command==='--function-status'){
  const operation=(await f.get(read('function-operation.json').name)).body;if(!operation.done){console.log('Function build/deploy is still running');return;}assert(!operation.error,JSON.stringify(operation.error));
  const before=read('function-before.json'),after=(await f.get(name)).body;assert.equal(after.state,'ACTIVE');
  const clean=x=>{const s=structuredClone(x.serviceConfig);delete s.revision;delete s.environmentVariables;return s;};assert.deepEqual(clean(after),clean(before),'Unrelated service settings changed');
  for(const [k,v]of Object.entries(before.serviceConfig.environmentVariables||{}))assert.equal(after.serviceConfig.environmentVariables[k],v,'Existing environment changed: '+k);
  assert.equal(after.serviceConfig.environmentVariables.COORDI_RENDERER_MODE,'local');assert.equal(after.serviceConfig.environmentVariables.COORDI_MANIFEST_SHA256,config.manifestSha256);
  const oldOthers=read('before.json').functions.filter(x=>x.name!==name),others=(await allFunctions()).filter(x=>x.name!==name);assert.deepEqual(others.sort((a,b)=>a.name.localeCompare(b.name)),oldOthers.sort((a,b)=>a.name.localeCompare(b.name)),'Another function changed');
  const download=(await f.post(name+':generateDownloadUrl',{})).body.downloadUrl,r=await fetch(download);assert(r.ok);fs.writeFileSync(path.join(stage,'function-after.zip'),Buffer.from(await r.arrayBuffer()));execFileSync('unzip',['-oq',path.join(stage,'function-after.zip'),'-d',path.join(stage,'function-after')]);
  const hashes=read('function-source-hashes.json');for(const [p,sha]of Object.entries(hashes))assert.equal(hash(fs.readFileSync(path.join(stage,'function-after',p))),sha,p);
  const receipt={at:new Date().toISOString(),name,revision:after.serviceConfig.revision,previousRevision:before.serviceConfig.revision,state:after.state,runtime:after.buildConfig.runtime,localMode:true,snapshot:config.snapshot,manifestSha256:config.manifestSha256,unchangedOtherFunctions:others.length,existingServiceSettingsPreserved:true,sourceFilesVerified:Object.keys(hashes).length};write('function-receipt.json',receipt);console.log(JSON.stringify(receipt));return;
 }
 if(command==='--verify'){
  const p=read('client-plan.json');assert.equal(versionKey((await live()).release.version.name),versionKey(p.version));assert.deepEqual(await manifest(p.version),p.files);assert.deepEqual((await h.get(p.version)).body.config,p.config);
  for(const [file,sha]of Object.entries(p.rawHashes)){const r=await fetch(`https://${project}.web.app/${file}?coordiVerify=${Date.now()}`);assert(r.ok);assert.equal(hash(Buffer.from(await r.arrayBuffer())),sha,file);}
  const unauthenticated=[];for(const id of ['renderCoordiShopPreview','coordiShopAction']){const r=await fetch(`https://asia-northeast3-${project}.cloudfunctions.net/${id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{action:'status'}})});assert.equal(r.status,401);unauthenticated.push({id,status:r.status});}
  const receipt={at:new Date().toISOString(),version:p.version,verifiedCompleteManifestFiles:Object.keys(p.files).length,verifiedClientFiles:Object.keys(p.rawHashes).length,existingHostingConfigPreserved:true,unauthenticated};write('verified.json',receipt);console.log(JSON.stringify(receipt));return;
 }
 throw Error('Use --snapshot, --prepare-data, --publish-data, --function, --function-status, --prepare-client, --publish-client or --verify');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
