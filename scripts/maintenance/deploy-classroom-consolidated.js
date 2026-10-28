#!/usr/bin/env node
// Release only the reviewed student-card callable from its exact deployed source.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2');
const project='dj48-quiztown-firebase',stage='/tmp/classroom-consolidated-20261017/functions/getClassroomStudentCards';
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
(async()=>{
 await requireAuth({project,...auth.getGlobalDefaultAccount()});const api=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true});
 const before=JSON.parse(fs.readFileSync(stage+'/metadata.json')),current=(await api.get(before.name)).body;
 if(process.argv.includes('--verify')){
  assert.equal(current.state,'ACTIVE');const response=await fetch(`https://asia-northeast3-${project}.cloudfunctions.net/getClassroomStudentCards`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{memberOnly:true}})});
  assert.equal(response.status,401);assert.equal((await response.json()).error.status,'UNAUTHENTICATED');console.log('PASS student-card callable ACTIVE; anonymous request rejected with 401.');return;
 }
 assert(process.argv.includes('--deploy'));assert.equal(current.updateTime,before.updateTime,'Function changed; audit again');
 const manifest=JSON.parse(fs.readFileSync(stage+'/candidate.json'));assert.equal(digest(fs.readFileSync(stage+'/release/functions/index.js')),manifest.sha256);
 const result=spawnSync('/opt/homebrew/bin/firebase',['deploy','--only','functions:getClassroomStudentCards','--project',project,'--non-interactive'],{cwd:stage+'/release',stdio:'inherit'});if(result.error)throw result.error;assert.equal(result.status,0,'Deployment failed');
 const after=(await api.get(before.name)).body;assert.equal(after.state,'ACTIVE');assert.notEqual(after.updateTime,before.updateTime);
 for(const key of ['serviceAccountEmail','availableMemory','timeoutSeconds','maxInstanceCount','minInstanceCount','ingressSettings','vpcConnector','vpcConnectorEgressSettings','secretEnvironmentVariables','environmentVariables','maxInstanceRequestConcurrency','availableCpu'])assert.deepEqual(after.serviceConfig[key],before.serviceConfig[key],key);
 assert.equal(after.buildConfig.runtime,before.buildConfig.runtime);
 const receipt={target:after.name,previousUpdate:before.updateTime,updateTime:after.updateTime,revision:after.serviceConfig.revision,state:after.state,serviceSettingsPreserved:true,sourceSha256:manifest.sha256};fs.writeFileSync(stage+'/receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
