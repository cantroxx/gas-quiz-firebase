#!/usr/bin/env node
'use strict';
// Read deployment metadata only. Never invoke a callable or read/write student records.
const fs=require('node:fs');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2');
const project='dj48-quiztown-firebase';
const names=['classroomBoardAction','classroomFollowupAction','saveClassroomQuest','completeClassroomAutoQuest','exchangeClassroomCurrency','claimClassroomJobSalary','purchaseClassroomShopItem','getClassroomEconomyBoard'];
async function main(){
 await requireAuth({project,...auth.getGlobalDefaultAccount()});
 const functions=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true});
 const firestore=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1',auth:true});
 const results=await Promise.all(names.map(async id=>{
   try {const {body:m}=await functions.get(`projects/${project}/locations/asia-northeast3/functions/${id}`);
     return {id,state:m.state,updateTime:m.updateTime,runtime:m.buildConfig?.runtime,revision:m.serviceConfig?.revision};
   }catch(e){if(e.status===404||e.context?.response?.statusCode===404)return {id,state:'NOT_DEPLOYED'};throw e;}
 }));
 const indexes=[];let pageToken;
 do {const {body}=await firestore.get(`projects/${project}/databases/(default)/collectionGroups/-/indexes`,{queryParams:pageToken?{pageToken}:{}});
   indexes.push(...(body.indexes||[]).map(i=>({collectionGroup:i.name.split('/collectionGroups/')[1].split('/')[0],queryScope:i.queryScope,state:i.state,fields:i.fields})));pageToken=body.nextPageToken;
 }while(pageToken);
 const output='docs/operations/classroom-board-2026-10-21/final-production-metadata.json';
 fs.writeFileSync(output,JSON.stringify({observedAt:new Date().toISOString(),project,mode:'metadata-read-only',functions:results,indexes,deployed:false,migrated:false},null,2)+'\n');
 console.log(JSON.stringify({output,functions:results,indexes:indexes.map(i=>({collectionGroup:i.collectionGroup,state:i.state}))}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
