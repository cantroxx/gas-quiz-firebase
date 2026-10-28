#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2'),hosting=require(lib+'hosting/api');
const project='dj48-quiztown-firebase',stage='/tmp/securities-cd-20261018';
(async()=>{
 fs.mkdirSync(stage,{recursive:true});await requireAuth({project,...auth.getGlobalDefaultAccount()});
 const h=new Client({urlPrefix:'https://firebasehosting.googleapis.com',apiVersion:'v1beta1',auth:true}),live=await hosting.getChannel('-',project,'live');let token='',files={};
 do{const r=(await h.get(live.release.version.name+'/files',{queryParams:{pageSize:1000,...(token?{pageToken:token}:{})}})).body;for(const f of r.files||[])files[f.path]=f.hash;token=r.nextPageToken||'';}while(token);
 fs.writeFileSync(stage+'/hosting-before.json',JSON.stringify({version:live.release.version.name,config:live.release.version.config,files},null,2));
 for(const p of ['index.html','js/app.bundle.js']){const r=await fetch(`https://${project}.web.app/${p}?securitiesAudit=${Date.now()}`);assert(r.ok);const dest=stage+'/before/'+p;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,Buffer.from(await r.arrayBuffer()));}
 const cloud=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true}),name=`projects/${project}/locations/asia-northeast3/functions/getClassroomEconomyBoard`,meta=(await cloud.get(name)).body;
 fs.writeFileSync(stage+'/function-before.json',JSON.stringify(meta,null,2));const download=(await cloud.post(name+':generateDownloadUrl',{})).body;const r=await fetch(download.downloadUrl);assert(r.ok);fs.writeFileSync(stage+'/source.zip',Buffer.from(await r.arrayBuffer()));fs.mkdirSync(stage+'/live-functions',{recursive:true});execFileSync('unzip',['-oq',stage+'/source.zip','-d',stage+'/live-functions']);
 const firestore=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1',auth:true}),base=`projects/${project}/databases/(default)/documents`;
 const rows=(await firestore.post(base+':runQuery',{structuredQuery:{from:[{collectionId:'classrooms'}],select:{fields:[{fieldPath:'grade'},{fieldPath:'classNumber'}]},limit:100}})).body;
 const candidates=rows.filter(r=>r.document).map(r=>({id:r.document.name.split('/').pop(),fields:r.document.fields}));
 const matching=candidates.filter(r=>String(r.fields?.grade?.stringValue??r.fields?.grade?.integerValue)==='4'&&String(r.fields?.classNumber?.stringValue??r.fields?.classNumber?.integerValue)==='8');
 assert.equal(matching.length,1,'Expected one matching 4-8 classroom');const scope={exists:true,classId:matching[0].id,...matching[0].fields};
 fs.writeFileSync(stage+'/classroom-scope.json',JSON.stringify(scope,null,2));
 const rules=new Client({urlPrefix:'https://firebaserules.googleapis.com',apiVersion:'v1',auth:true});const release=(await rules.get(`projects/${project}/releases/cloud.firestore`)).body;const ruleSet=(await rules.get(release.rulesetName)).body;fs.writeFileSync(stage+'/live-firestore.rules',ruleSet.source.files[0].content);fs.writeFileSync(stage+'/rules-before.json',JSON.stringify({rulesetName:release.rulesetName},null,2));
 console.log(JSON.stringify({hosting:live.release.version.name,files:Object.keys(files).length,functionUpdate:meta.updateTime,classroom:scope,rules:release.rulesetName}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
