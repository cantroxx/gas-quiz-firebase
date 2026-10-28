#!/usr/bin/env node
'use strict';
// Exact-source candidate prepared under /tmp; deploy only the new diary callable.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2');
const stage='/tmp/classroom-diary-release-20261017',project='dj48-quiztown-firebase';
const prefix=`projects/${project}/locations/asia-northeast3/functions`;
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
(async()=>{
  await requireAuth({project,...auth.getGlobalDefaultAccount()});
  const api=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true});
  const list=async()=>{
    let token='',all={};do {
      const r=(await api.get(prefix,{queryParams:{pageSize:1000,...(token?{pageToken:token}:{})}})).body;
      for(const f of r.functions||[])all[f.name]={updateTime:f.updateTime,state:f.state};token=r.nextPageToken||'';
    }while(token);return all;
  };
  const before=await list(),name=prefix+'/classroomDiaryAction';
  if(process.argv.includes('--verify')){
    const meta=(await api.get(name)).body;assert.equal(meta.state,'ACTIVE');
    const r=await fetch(`https://asia-northeast3-${project}.cloudfunctions.net/classroomDiaryAction`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{}})});
    assert.equal(r.status,401);const body=await r.json();assert.equal(body.error.status,'UNAUTHENTICATED');
    console.log(JSON.stringify({name,state:meta.state,updateTime:meta.updateTime,unauthenticatedStatus:r.status}));return;
  }
  assert(process.argv.includes('--deploy'),'Use --deploy or --verify');
  assert(!before[name],'Diary function already exists; do not overwrite without inspection');
  const baseline=JSON.parse(fs.readFileSync(stage+'/functions-before.json')).classroomPortraitAction;
  assert.equal(before[baseline.name]?.updateTime,baseline.updateTime,'Source helper function changed; prepare again');
  const manifest=JSON.parse(fs.readFileSync(stage+'/functions-candidate.json'));
  assert.equal(manifest.target,'classroomDiaryAction');
  for(const [file,hash] of Object.entries(manifest.hashes))assert.equal(digest(fs.readFileSync(path.join(stage,'functions-release/functions',file))),hash,file);
  fs.writeFileSync(stage+'/functions-list-before.json',JSON.stringify(before,null,2));
  const result=spawnSync('firebase',['deploy','--only','functions:classroomDiaryAction','--project',project,'--non-interactive'],{cwd:stage+'/functions-release',stdio:'inherit'});
  if(result.error)throw result.error;assert.equal(result.status,0,'Deployment failed');
  const after=await list();assert.equal(after[name]?.state,'ACTIVE');
  const otherChanges=Object.keys(before).filter(key=>JSON.stringify(before[key])!==JSON.stringify(after[key]));
  const meta=(await api.get(name)).body;
  const receipt={name,state:meta.state,updateTime:meta.updateTime,revision:meta.serviceConfig.revision,runtime:meta.buildConfig.runtime,entryPoint:meta.buildConfig.entryPoint,targetOnly:'classroomDiaryAction',existingFunctionChangesObserved:otherChanges};
  fs.writeFileSync(stage+'/function-receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
  assert.equal(otherChanges.length,0,'Another function changed during deployment; inspect concurrent work before proceeding');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
