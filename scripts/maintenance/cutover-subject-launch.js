#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const base='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(base+'auth'),{requireAuth}=require(base+'requireAuth'),{Client}=require(base+'apiv2');
const stage='/tmp/subject-launch-20261017',project='dj48-quiztown-firebase',doc=`projects/${project}/databases/(default)/documents/appSettings/featureFlags`;
(async()=>{
await requireAuth({project,...auth.getGlobalDefaultAccount()});
if(process.argv.includes('--rules')){
const api=new Client({urlPrefix:'https://firebaserules.googleapis.com',apiVersion:'v1',auth:true}),before=JSON.parse(fs.readFileSync(stage+'/rules-before.json')),name=`projects/${project}/releases/cloud.firestore`;
assert.equal((await api.get(name)).body.rulesetName,before.rulesetName,'Rules changed; inspect before proceeding');
const dir=stage+'/rules-release';fs.mkdirSync(dir,{recursive:true});fs.copyFileSync(path.resolve(__dirname,'../../firestore.rules'),dir+'/firestore.rules');fs.writeFileSync(dir+'/firebase.json',JSON.stringify({firestore:{rules:'firestore.rules'}}));
const r=spawnSync('firebase',['deploy','--only','firestore:rules','--project',project,'--non-interactive'],{cwd:dir,stdio:'inherit'});if(r.error)throw r.error;assert.equal(r.status,0);
const after=(await api.get(name)).body,source=(await api.get(after.rulesetName)).body;assert.equal(source.source.files[0].content,fs.readFileSync(dir+'/firestore.rules','utf8'));fs.writeFileSync(stage+'/rules-receipt.json',JSON.stringify({before:before.rulesetName,after:after.rulesetName},null,2));console.log('PASS generated subject ranking rules deployed');return;
}
const api=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1',auth:true}),snapshot=(await api.get(doc)).body;
if(process.argv.includes('--enable')){
assert(fs.existsSync(stage+'/hosting-receipt.json')&&fs.existsSync(stage+'/functions-receipt.json')&&fs.existsSync(stage+'/rules-receipt.json'),'Deploy all candidates before enabling');
for(const subject of ['korean','math','social','science']){const r=(await api.post(`projects/${project}/databases/(default)/documents/subjectQuizRankings/subject-2022-v1:runQuery`,{structuredQuery:{from:[{collectionId:subject}],limit:1,select:{fields:[{fieldPath:'totalScore'}]}}})).body;assert(!r.some(x=>x.document),'New ranking version already has records; inspect before cutover');}
fs.writeFileSync(stage+'/flags-before.json',JSON.stringify(snapshot,null,2));
const r=(await api.patch(doc,{fields:{subjectQuizEnabled:{booleanValue:true}}},{queryParams:{'updateMask.fieldPaths':'subjectQuizEnabled','currentDocument.updateTime':snapshot.updateTime}})).body;
const expected={...snapshot.fields,subjectQuizEnabled:{booleanValue:true}};assert.deepEqual(r.fields,expected,'Only subject flag may change');fs.writeFileSync(stage+'/cutover-receipt.json',JSON.stringify({version:'subject-2022-v1',subjectQuizEnabled:true,updateTime:r.updateTime,initialRankings:'four subject collections empty; old records preserved'},null,2));console.log('PASS subject flag enabled; all other fields preserved; four subject boards begin at zero');return;
}
assert(process.argv.includes('--verify'),'Use --rules, --enable or --verify');assert.equal(snapshot.fields.subjectQuizEnabled.booleanValue,true);console.log('PASS subject migration enabled');
})().catch(e=>{console.error(e.message);process.exitCode=1});
