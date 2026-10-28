#!/usr/bin/env node
'use strict';
// Update only popularQuizAction from an audited live source snapshot.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2');
const stage='/tmp/popular-completion-release',project='dj48-quiztown-firebase',prefix=`projects/${project}/locations/asia-northeast3/functions`;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 assert(process.argv.includes('--deploy'));const checks=JSON.parse(fs.readFileSync(stage+'/checks.json'));assert.equal(checks.passed,true);assert.equal(checks.fullCheckPassed,true);
 assert.equal(checks.candidateDigest,hash(fs.readFileSync(stage+'/candidate-manifest.json')));
 for(const [file,digest]of Object.entries(checks.functionHashes))assert.equal(hash(fs.readFileSync(stage+'/functions-release/functions/'+file)),digest,file);
 await requireAuth({project,...auth.getGlobalDefaultAccount()});const api=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true});
 async function list(){let pageToken='',out={};do{const r=(await api.get(prefix,{queryParams:{pageSize:1000,...pageToken?{pageToken}:{}}})).body;for(const f of r.functions||[])out[f.name]=f.updateTime;pageToken=r.nextPageToken||'';}while(pageToken);return out;}
 const before=JSON.parse(fs.readFileSync(stage+'/function-before.json')),allBefore=await list();assert.equal(allBefore[before.name],before.updateTime,'Function changed; refresh source first');
 const result=spawnSync('firebase',['deploy','--only','functions:popularQuizAction','--project',project,'--non-interactive'],{cwd:stage+'/functions-release',stdio:'inherit'});if(result.error)throw result.error;assert.equal(result.status,0);
 const after=(await api.get(before.name)).body,allAfter=await list();assert.equal(after.state,'ACTIVE');assert.notEqual(after.updateTime,before.updateTime);
 for(const key of ['serviceAccountEmail','availableMemory','timeoutSeconds','maxInstanceCount','minInstanceCount','ingressSettings','environmentVariables','secretEnvironmentVariables','maxInstanceRequestConcurrency','availableCpu'])assert.deepEqual(after.serviceConfig[key],before.serviceConfig[key],key);
 const unrelated=Object.keys(allBefore).filter(k=>k!==before.name&&allBefore[k]!==allAfter[k]);assert.deepEqual(unrelated,[]);
 fs.writeFileSync(stage+'/functions-receipt.json',JSON.stringify({at:new Date().toISOString(),name:after.name,state:after.state,updateTime:after.updateTime,previousUpdateTime:before.updateTime,revision:after.serviceConfig.revision,unrelatedChanges:unrelated,serviceSettingsPreserved:true},null,2)+'\n');console.log('PASS popularQuizAction updated; existing service settings and all other functions preserved');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
