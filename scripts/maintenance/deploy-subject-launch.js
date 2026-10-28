#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const base='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(base+'auth'),{requireAuth}=require(base+'requireAuth'),{Client}=require(base+'apiv2');
const stage='/tmp/subject-launch-20261017',project='dj48-quiztown-firebase',prefix=`projects/${project}/locations/asia-northeast3/functions`;
(async()=>{
assert(process.argv.includes('--deploy'),'Use --deploy after candidate checks pass');await requireAuth({project,...auth.getGlobalDefaultAccount()});
const api=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true});
async function list(){let token='',out={};do{const r=(await api.get(prefix,{queryParams:{pageSize:1000,...(token?{pageToken:token}:{})}})).body;for(const f of r.functions||[])out[f.name]={updateTime:f.updateTime,state:f.state};token=r.nextPageToken||'';}while(token);return out;}
const before=await list(),baseline=JSON.parse(fs.readFileSync(stage+'/functions-extra-before.json')),candidate=JSON.parse(fs.readFileSync(stage+'/functions-candidate.json'));
assert(!before[prefix+'/subjectQuizAction'],'New subject function already exists; inspect before replacing');
for(const key of ['adminGetDashboard','renderCoordiShopPreview'])assert.equal(before[prefix+'/'+key].updateTime,baseline[key].updateTime,'Concurrent change: '+key);
for(const [p,h]of Object.entries(candidate.hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(stage,'functions-release/functions',p))).digest('hex'),h,p);
fs.writeFileSync(stage+'/functions-list-before.json',JSON.stringify(before,null,2));
const r=spawnSync('firebase',['deploy','--only',candidate.targets.map(x=>'functions:'+x).join(','),'--project',project,'--non-interactive'],{cwd:stage+'/functions-release',stdio:'inherit'});if(r.error)throw r.error;assert.equal(r.status,0,'Function deployment failed');
const after=await list(),changes=Object.keys(before).filter(key=>before[key].updateTime!==after[key]?.updateTime),unrelated=changes.filter(key=>!candidate.targets.includes(key.split('/').pop()));for(const key of candidate.targets)assert.equal(after[prefix+'/'+key]?.state,'ACTIVE',key);
fs.writeFileSync(stage+'/functions-receipt.json',JSON.stringify({targets:candidate.targets,after:Object.fromEntries(candidate.targets.map(key=>[key,after[prefix+'/'+key]])),unrelatedChanges:unrelated},null,2));assert.equal(unrelated.length,0,'Concurrent function change detected');console.log('PASS selected functions active; all other function update times preserved');
})().catch(e=>{console.error(e.message);process.exitCode=1});
