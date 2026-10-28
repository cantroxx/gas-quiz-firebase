#!/usr/bin/env node
'use strict';
// Read-only deployment verification: metadata, source archive and unauthenticated guards.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2');
const project='dj48-quiztown-firebase',stage='/tmp/quiztown-release-20261028',root=path.resolve(__dirname,'../..');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 await requireAuth({project,...auth.getGlobalDefaultAccount()});const api=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true});
 const before=JSON.parse(fs.readFileSync(stage+'/functions-before.json')),endpoints=JSON.parse(fs.readFileSync(stage+'/local-endpoints.json'));let token='',all=[];
 do{const r=(await api.get(`projects/${project}/locations/-/functions`,{queryParams:{pageSize:1000,...token?{pageToken:token}:{}}})).body;all.push(...r.functions||[]);token=r.nextPageToken||'';}while(token);
 fs.writeFileSync(stage+'/functions-after.json',JSON.stringify(all,null,2));
 const settings=['serviceAccountEmail','availableMemory','timeoutSeconds','maxInstanceCount','minInstanceCount','ingressSettings','vpcConnector','vpcConnectorEgressSettings','secretEnvironmentVariables','environmentVariables','maxInstanceRequestConcurrency','availableCpu'];
 for(const e of endpoints){const f=all.find(f=>f.name.endsWith('/'+e.name));assert(f&&f.state==='ACTIVE','Function not active: '+e.name);const old=before.find(b=>b.name===f.name);if(!old)continue;
  assert.notEqual(f.updateTime,old.updateTime,'Function was not updated: '+e.name);
  for(const key of settings){
   const actual=structuredClone(f.serviceConfig[key]),expected=old.serviceConfig[key];
   // The Functions framework adds this reserved HTTP signature to some old revisions.
   if(key==='environmentVariables'&&expected?.FUNCTION_SIGNATURE_TYPE===undefined&&actual?.FUNCTION_SIGNATURE_TYPE==='http')delete actual.FUNCTION_SIGNATURE_TYPE;
   assert(require('node:util').isDeepStrictEqual(actual,expected),'Service setting changed: '+e.name+'/'+key);
  }
  assert.equal(f.buildConfig.runtime,old.buildConfig.runtime,'Runtime changed: '+e.name);
 }
 const name=`projects/${project}/locations/asia-northeast3/functions/renderCoordiShopPreview`,signed=(await api.post(name+':generateDownloadUrl',{})).body;
 const response=await fetch(signed.downloadUrl);assert(response.ok);fs.writeFileSync(stage+'/source-after.zip',Buffer.from(await response.arrayBuffer()));execFileSync('unzip',['-oq',stage+'/source-after.zip','-d',stage+'/source-after']);
 const sourceFiles=['index.js','coordi-shop/service.js','coordi-shop/official-provider.js','coordi-shop/default-outfit.js','coordi-shop/commerce.js','classroom/board.js','classroom/followup.js'];
 for(const f of sourceFiles)assert.equal(hash(fs.readFileSync(stage+'/source-after/'+f)),hash(fs.readFileSync(root+'/functions/'+f)),'Source differs: '+f);
 const denied=[];for(const id of ['renderCoordiShopPreview','coordiShopAction','classroomBoardAction','classroomFollowupAction']){const r=await fetch(`https://asia-northeast3-${project}.cloudfunctions.net/${id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:id==='coordiShopAction'?{action:'status'}:{}})});assert.equal(r.status,401,'Unauthenticated guard: '+id);denied.push(id);}
 const receipt={passed:true,verifiedAt:new Date().toISOString(),functions:endpoints.length,newFunctions:endpoints.filter(e=>!before.some(b=>b.name.endsWith('/'+e.name))).map(e=>e.name),existingServiceSettingsPreserved:true,frameworkMetadataAddition:'FUNCTION_SIGNATURE_TYPE=http for older HTTP revisions',sourceFilesMatch:sourceFiles,unauthenticatedDenied:denied,revisions:all.map(f=>({name:f.name.split('/').pop(),updateTime:f.updateTime,revision:f.serviceConfig.revision,state:f.state}))};
 fs.writeFileSync(stage+'/functions-deployed.json',JSON.stringify(receipt,null,2)+'\n');console.log('PASS '+endpoints.length+' ACTIVE functions, preserved settings, deployed source and 401 access guards');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
