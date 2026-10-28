#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',stage='/tmp/loading-next-20261007',project='dj48-quiztown-firebase';
const auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
(async()=>{
  await requireAuth({project,...auth.getGlobalDefaultAccount()});
  const plan=JSON.parse(fs.readFileSync(stage+'/hosting/hosting-plan.json'));
  const live=await require(lib+'hosting/api').getChannel('-',project,'live');
  assert(live.release.version.name.endsWith('/'+plan.version.split('/').pop()));
  for(const [file,digest] of Object.entries(plan.rawHashes)) {
    const response=await fetch(`https://${project}.web.app/${file}?verify=${Date.now()}`);assert(response.ok,file);
    assert.equal(hash(Buffer.from(await response.arrayBuffer())),digest,file);
  }
  const result={hostingVersion:plan.version,verifiedHostingFiles:Object.keys(plan.rawHashes)};
  if(!process.argv.includes('--hosting-only')) {
    const before=JSON.parse(fs.readFileSync(stage+'/function-before.json'));
    const api=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true});
    const meta=(await api.get(before.name)).body;assert.equal(meta.state,'ACTIVE');
    const link=(await api.post(before.name+':generateDownloadUrl',{})).body;
    const response=await fetch(link.downloadUrl);assert(response.ok);
    const archive=stage+'/function-after.zip';fs.writeFileSync(archive,Buffer.from(await response.arrayBuffer()));
    const deployed=execFileSync('unzip',['-p',archive,'index.js'],{maxBuffer:20*1024*1024});
    assert.equal(hash(deployed),fs.readFileSync(stage+'/function-candidate-sha256','utf8'));
    result.function={name:meta.name,updateTime:meta.updateTime,state:meta.state,sourceVerified:true};
  }
  fs.writeFileSync(stage+'/verification'+(process.argv.includes('--hosting-only')?'-hosting':'')+'.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
