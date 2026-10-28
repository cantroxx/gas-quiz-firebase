#!/usr/bin/env node
'use strict';
// Only initialize the special reward registry if absent; never rewrite student records.
const fs=require('node:fs'),assert=require('node:assert/strict');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2');
const project='dj48-quiztown-firebase',stage='/tmp/plaza-deploy-20261019';
(async()=>{
 await requireAuth({project,...auth.getGlobalDefaultAccount()});
 const api=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1',auth:true});
 const base=`projects/${project}/databases/(default)/documents`,name=base+'/appSettings/specialRewards';
 const flags=(await api.get(base+'/appSettings/featureFlags')).body.fields||{};
 const get=await api.request({method:'GET',path:name,resolveOnHTTPError:true});assert([200,404].includes(get.status));
 const result={eventPlazaEnabled:flags.eventPlazaEnabled?.booleanValue!==false,rankingEnabled:flags.rankingEnabled?.booleanValue!==false,registryExists:get.status===200,studentRecordsChanged:0};
 assert(result.eventPlazaEnabled&&result.rankingEnabled,'Plaza disabled: review feature flags before changing policy');
 if(process.argv.includes('--apply')&&get.status===404){
  assert(fs.existsSync(stage+'/functions-receipt.json'),'Deploy and verify functions first');
  await api.post(`projects/${project}/databases/(default)/documents:commit`,{writes:[{update:{name,fields:{items:{arrayValue:{values:[]}}}},currentDocument:{exists:false}}]});
  result.createdEmptyRegistry=true;
 }
 const after=process.argv.includes('--apply')?(await api.get(name)).body:get.body;
 result.activeRewardCount=(after?.fields?.items?.arrayValue?.values||[]).filter(v=>v.mapValue?.fields?.active?.booleanValue).length;
 fs.writeFileSync(stage+'/settings-'+(process.argv.includes('--apply')?'receipt':'before')+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
