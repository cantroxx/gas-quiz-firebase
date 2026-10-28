#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2');
const stage='/tmp/popular-release-20261018',project='dj48-quiztown-firebase',targets=['popularQuizAction','auditPopularQuizSources'],prefix=`projects/${project}/locations/asia-northeast3/functions`;
(async()=>{
 assert(process.argv.includes('--deploy'),'Use --deploy after candidate validation');
 const checks=JSON.parse(fs.readFileSync(stage+'/checks.json'));assert.equal(checks.passed,true);assert.equal(checks.candidateDigest,crypto.createHash('sha256').update(fs.readFileSync(stage+'/candidate-manifest.json')).digest('hex'));
 for(const [file,digest]of Object.entries(checks.functionHashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(stage+'/functions-release/functions/'+file)).digest('hex'),digest,file);
 await requireAuth({project,...auth.getGlobalDefaultAccount()});const api=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true});
 async function list(){let pageToken='',out={};do{const r=(await api.get(prefix,{queryParams:{pageSize:1000,...pageToken?{pageToken}:{}}})).body;for(const f of r.functions||[])out[f.name]={updateTime:f.updateTime,state:f.state};pageToken=r.nextPageToken||'';}while(pageToken);return out;}
 const before=await list();for(const name of targets)assert(!before[prefix+'/'+name],'New endpoint already exists; inspect before replacing');
 const result=spawnSync('firebase',['deploy','--only',targets.map(n=>'functions:'+n).join(','),'--project',project,'--non-interactive'],{cwd:stage+'/functions-release',stdio:'inherit'});if(result.error)throw result.error;assert.equal(result.status,0,'Function deployment failed');
 const after=await list();for(const name of targets)assert.equal(after[prefix+'/'+name]?.state,'ACTIVE',name);
 const unrelatedChanges=Object.keys(before).filter(n=>before[n].updateTime!==after[n]?.updateTime);
 const endpoints={};for(const name of targets){const meta=(await api.get(prefix+'/'+name)).body;endpoints[name]={state:meta.state,updateTime:meta.updateTime,uri:meta.serviceConfig?.uri,revision:meta.serviceConfig?.revision};}
 fs.writeFileSync(stage+'/functions-receipt.json',JSON.stringify({at:new Date().toISOString(),targets,endpoints,unrelatedChanges},null,2)+'\n');assert.equal(unrelatedChanges.length,0,'Concurrent unrelated function update detected');console.log('PASS two new endpoints active; all existing functions preserved');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
