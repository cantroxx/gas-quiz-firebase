#!/usr/bin/env node
'use strict';
// Update each function from its own audited live source, preserving runtime/trigger/IAM settings.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2');
const stage='/tmp/admin-refresh-deploy-20261021',project='dj48-quiztown-firebase',prefix=`projects/${project}/locations/asia-northeast3/functions`;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 assert(process.argv.includes('--deploy')||process.argv.includes('--verify'));
 const checks=JSON.parse(fs.readFileSync(stage+'/checks.json'));assert.equal(checks.passed,true);assert.equal(checks.fullCheckPassed,true);
 const manifests=JSON.parse(fs.readFileSync(stage+'/function-manifests.json')),targets=Object.keys(manifests);
 await requireAuth({project,...auth.getGlobalDefaultAccount()});const api=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true});
 async function list(){let token='',out={};do{const r=(await api.get(prefix,{queryParams:{pageSize:1000,...token?{pageToken:token}:{}}})).body;for(const f of r.functions||[])out[f.name]=f.updateTime;token=r.nextPageToken||'';}while(token);return out;}
 const original=process.argv.includes('--deploy')?await list():JSON.parse(fs.readFileSync(stage+'/functions-before-all.json'));
 if(process.argv.includes('--deploy'))fs.writeFileSync(stage+'/functions-before-all.json',JSON.stringify(original));
 const operations=[];
 if(process.argv.includes('--deploy')){
  // Finish all validation before the first remote mutation.
  for(const target of targets){const d=stage+'/'+target,before=JSON.parse(fs.readFileSync(d+'/before.json'));assert.equal((await api.get(before.name)).body.updateTime,before.updateTime,'Concurrent update: '+target);assert.equal(hash(fs.readFileSync(d+'/candidate.zip')),checks.archiveHashes[target]);for(const [file,h]of Object.entries(manifests[target]))assert.equal(hash(fs.readFileSync(d+'/release/functions/'+file)),h);}
  for(const target of ['getMemberAchievements','subjectQuizAction','popularQuizAction']){const before=JSON.parse(fs.readFileSync(stage+'/reference/'+target+'/before.json'));assert.equal((await api.get(before.name)).body.updateTime,before.updateTime,'Reference version changed: '+target);}
  for(const target of targets){
   const d=stage+'/'+target,before=JSON.parse(fs.readFileSync(d+'/before.json'));
   const upload=(await api.post(`projects/${project}/locations/asia-northeast3/functions:generateUploadUrl`,{})).body;
   assert(upload.storageSource&&upload.uploadUrl);const bytes=fs.readFileSync(d+'/candidate.zip');
   const response=await fetch(upload.uploadUrl,{method:'PUT',headers:{'Content-Type':'application/zip'},body:bytes});assert(response.ok,'Upload '+target);
   assert.equal((await api.get(before.name)).body.updateTime,before.updateTime,'Concurrent update: '+target);
   // No serviceConfig/eventTrigger mask: quotas, identity, retries, env and secrets stay as-is.
   const labels={...before.labels,'firebase-functions-hash':crypto.createHash('sha1').update(bytes).digest('hex')};
   const op=(await api.patch(before.name,{name:before.name,buildConfig:{source:{storageSource:upload.storageSource}},labels},{queryParams:{updateMask:'buildConfig.source,labels'}})).body;
   operations.push({target,name:op.name});fs.writeFileSync(stage+'/operations.json',JSON.stringify(operations,null,2));console.log('Started source-only update: '+target);
  }
  let pending=[...operations],round=0;
  while(pending.length){const next=[];for(const op of pending){const r=(await api.get(op.name)).body;if(r.done){assert(!r.error,JSON.stringify({target:op.target,error:r.error}));console.log('Completed '+op.target);}else next.push(op);}pending=next;if(pending.length){if(round++%4===0)console.log('Building: '+pending.map(x=>x.target).join(', '));await new Promise(r=>setTimeout(r,5000));}}
 }
 const verified=[];
 for(const target of targets){const d=stage+'/'+target,before=JSON.parse(fs.readFileSync(d+'/before.json'));const after=(await api.get(before.name)).body;assert.equal(after.state,'ACTIVE');
  for(const [key,value]of Object.entries(before.serviceConfig))if(!['revision','uri'].includes(key))assert.deepEqual(after.serviceConfig[key],value,'Runtime '+target+'/'+key);
  for(const key of ['runtime','entryPoint','environmentVariables','serviceAccount','dockerRepository','workerPool'])assert.deepEqual(after.buildConfig[key],before.buildConfig[key],'Build '+target+'/'+key);
  assert.deepEqual(after.eventTrigger,before.eventTrigger,'Trigger '+target);
  const signed=(await api.post(before.name+':generateDownloadUrl',{})).body;const r=await fetch(signed.downloadUrl);assert(r.ok);fs.writeFileSync(d+'/verified.zip',Buffer.from(await r.arrayBuffer()));
  execFileSync('python3',['-c',`import sys,zipfile,json,hashlib\nz=zipfile.ZipFile(sys.argv[1]);expected=json.load(open(sys.argv[2]))[sys.argv[3]]\nactual={n:hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist() if not n.endswith('/')}\nassert actual==expected,sys.argv[3]`,d+'/verified.zip',stage+'/function-manifests.json',target]);
  verified.push({target,updateTime:after.updateTime,sourceFiles:Object.keys(manifests[target]).length,state:after.state});fs.writeFileSync(stage+'/functions-progress.json',JSON.stringify(verified,null,2));console.log('Verified source, runtime and trigger: '+target);
 }
 const current=await list(),unrelated=Object.keys(original).filter(n=>!targets.includes(n.split('/').pop())&&current[n]!==original[n]);
 fs.writeFileSync(stage+'/functions-receipt.json',JSON.stringify({verified,unrelatedChanges:unrelated,verifiedAt:new Date().toISOString()},null,2));assert.equal(unrelated.length,0,'Unrelated concurrent function update; review receipt');
})().catch(e=>{console.error(e.message);process.exitCode=1});
