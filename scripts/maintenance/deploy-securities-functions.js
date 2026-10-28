#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2');
const project='dj48-quiztown-firebase',stage='/tmp/securities-cd-20261018',prefix=`projects/${project}/locations/asia-northeast3/functions`;
(async()=>{
 assert(process.argv.includes('--deploy'));await requireAuth({project,...auth.getGlobalDefaultAccount()});const api=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true});
 async function list(){let token='',out={};do{const r=(await api.get(prefix,{queryParams:{pageSize:1000,...(token?{pageToken:token}:{})}})).body;for(const f of r.functions||[])out[f.name]={state:f.state,updateTime:f.updateTime,uri:f.serviceConfig?.uri};token=r.nextPageToken||'';}while(token);return out;}
 const plan=JSON.parse(fs.readFileSync(stage+'/functions-candidate.json')),before=await list();
 for(const target of plan.targets)assert(!before[prefix+'/'+target],'Already exists; inspect deployment before retry');
 for(const [p,h]of Object.entries(plan.hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(stage+'/functions-release/functions/'+p)).digest('hex'),h,p);
 fs.writeFileSync(stage+'/functions-list-before.json',JSON.stringify(before,null,2));
 const r=spawnSync('firebase',['deploy','--only',plan.targets.map(x=>'functions:'+x).join(','),'--project',project,'--non-interactive'],{cwd:stage+'/functions-release',stdio:'inherit'});if(r.error)throw r.error;assert.equal(r.status,0,'Deploy failed');
 const after=await list(),unrelated=Object.keys(before).filter(k=>before[k].updateTime!==after[k]?.updateTime);for(const target of plan.targets)assert.equal(after[prefix+'/'+target]?.state,'ACTIVE',target);
 fs.writeFileSync(stage+'/functions-receipt.json',JSON.stringify({targets:plan.targets,functions:Object.fromEntries(plan.targets.map(k=>[k,after[prefix+'/'+k]])),unrelatedChanges:unrelated},null,2));assert.equal(unrelated.length,0,'Concurrent function changes; inspect');console.log('PASS four securities functions active; all previous function update times unchanged');
})().catch(e=>{console.error(e.message);process.exitCode=1});
