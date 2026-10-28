#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2');
const stage='/tmp/hair-mix-release',project='dj48-quiztown-firebase';
(async()=>{
  await requireAuth({project,...auth.getGlobalDefaultAccount()});
  const before=JSON.parse(fs.readFileSync(stage+'/function-before.json'));
  const api=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true});
  const current=(await api.get(before.name)).body;
  assert.equal(current.updateTime,before.updateTime,'Live function changed; prepare again');
  const candidate=fs.readFileSync(stage+'/functions-release/functions/coordi-shop/commerce.js');
  assert.equal(crypto.createHash('sha256').update(candidate).digest('hex'),JSON.parse(fs.readFileSync(stage+'/functions-candidate.json')).sha256);
  assert.equal(JSON.parse(fs.readFileSync(stage+'/checks.json')).passed,true,'Checks required before deployment');
  const result=spawnSync('firebase',['deploy','--only','functions:coordiShopAction','--project',project,'--non-interactive'],{cwd:stage+'/functions-release',stdio:'inherit'});
  if(result.error)throw result.error;assert.equal(result.status,0,'Firebase deployment failed');
  const after=(await api.get(before.name)).body;assert.equal(after.state,'ACTIVE');assert.notEqual(after.updateTime,before.updateTime);
  const stableKeys=['serviceAccountEmail','availableMemory','timeoutSeconds','maxInstanceCount','minInstanceCount','ingressSettings','vpcConnector','vpcConnectorEgressSettings','secretEnvironmentVariables','environmentVariables','maxInstanceRequestConcurrency','availableCpu'];
  for(const key of stableKeys) assert.deepEqual(after.serviceConfig[key],before.serviceConfig[key],'Service setting changed: '+key);
  assert.equal(after.buildConfig.runtime,before.buildConfig.runtime);
  const receipt={name:after.name,beforeUpdateTime:before.updateTime,updateTime:after.updateTime,state:after.state,serviceSettingsPreserved:true,revision:after.serviceConfig.revision};
  fs.writeFileSync(stage+'/function-receipt.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
