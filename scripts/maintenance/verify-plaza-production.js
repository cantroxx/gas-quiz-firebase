#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2');
const project='dj48-quiztown-firebase',stage='/tmp/plaza-deploy-20261019';
(async()=>{
 await requireAuth({project,...auth.getGlobalDefaultAccount()});const api=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true});
 const verified=[];
 for(const target of ['specialRewardAction','adminSpecialRewardAction']){
  const name=`projects/${project}/locations/asia-northeast3/functions/${target}`,meta=(await api.get(name)).body;assert.equal(meta.state,'ACTIVE');assert.equal(meta.buildConfig.entryPoint,target);
  const signed=(await api.post(name+':generateDownloadUrl',{})).body,r=await fetch(signed.downloadUrl);assert(r.ok);fs.writeFileSync(stage+'/'+target+'.zip',Buffer.from(await r.arrayBuffer()));
  execFileSync('python3',['-c',`import zipfile,sys,pathlib\nz=zipfile.ZipFile(sys.argv[1]);root=pathlib.Path(sys.argv[2])\nfor f in ['index.js','growth/special-rewards.js','package.json','package-lock.json']:\n if (root/f).exists():assert z.read(f)==(root/f).read_bytes(),f`,stage+'/'+target+'.zip',stage+'/new-functions/functions']);
  verified.push({target,state:meta.state,revision:meta.serviceConfig.revision,updateTime:meta.updateTime});
 }
 // Callable checks deliberately omit authentication and never create student activity.
 const authChecks=[];
 for(const target of ['getEventProgress','claimEventQuestReward','grantPracticeReward','grantRankingCompleteXp','survivorQuestQuiz','wordBombAction','subjectQuizAction','popularQuizAction','specialRewardAction','adminSpecialRewardAction']){
  const response=await fetch(`https://asia-northeast3-${project}.cloudfunctions.net/${target}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{action:'list'}})}),body=await response.json();
  assert.equal(response.status,401,target);assert.equal(body.error?.status,'UNAUTHENTICATED',target);authChecks.push(target);
 }
 const receipt={verified,unauthenticatedCallsRejected:authChecks,studentWritesPerformed:0,verifiedAt:new Date().toISOString()};fs.writeFileSync(stage+'/production-verification.json',JSON.stringify(receipt,null,2));console.log('PASS new function source hashes and authentication for '+authChecks.length+' live callables');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
