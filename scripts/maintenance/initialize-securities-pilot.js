#!/usr/bin/env node
'use strict';
// Explicit C/D authorization, 4-8 only. Never creates or funds student accounts.
const fs=require('node:fs'),assert=require('node:assert/strict');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client,getAccessToken}=require(lib+'apiv2');
const {Firestore}=require('@google-cloud/firestore'),{GoogleAuth,OAuth2Client}=require('google-auth-library');
const {createEngine,reference}=require('../../functions/classroom/securities/market-engine'),{TARGET}=require('../../functions/classroom/securities/production'),{POLICY}=require('../../functions/classroom/securities/coin');
const stage='/tmp/securities-cd-20261018',project='dj48-quiztown-firebase';
(async()=>{
 assert(!process.env.FIRESTORE_EMULATOR_HOST,'Production initialization must be explicit');assert(process.argv.includes('--initialize')||process.argv.includes('--verify'));
 await requireAuth({project,...auth.getGlobalDefaultAccount()});
 const token=await getAccessToken(),client=new OAuth2Client();client.setCredentials({access_token:token,expiry_date:Date.now()+3500000});
 const db=new Firestore({projectId:project,auth:new GoogleAuth({authClient:client,projectId:project})});
 try{
 const ref=reference(db,TARGET.classId,TARGET.marketId);
 if(process.argv.includes('--initialize')){
  assert(fs.existsSync(stage+'/hosting-receipt.json')&&fs.existsSync(stage+'/functions-receipt.json'),'Deploy verified code first');
  const existing=await ref.get();assert(!existing.exists,'Market exists. Use --verify; never reset it.');
  const engine=createEngine({db});assert.equal((await engine.initialize({...TARGET,startDate:'2026-10-19',mode:'coin'})).created,true);
  await db.runTransaction(async tx=>{const m=(await tx.get(ref)).data();assert.equal(m.mode,'coin');assert.equal(m.lifecycle,'disabled');assert.equal(m.studentAccess,false);
   tx.update(ref,{lifecycle:'enabled',configVersion:m.configVersion+1});
   tx.create(ref.collection('adminAudit').doc('launch-cd-20261018'),{action:'pilotInitialize',actor:'authorized-deployment',reason:'사용자 C·D단계 진행 승인 및 시범 학급 4-8 지정. 교사 수업 점검 후 학생 공개.',before:{lifecycle:'disabled'},after:{lifecycle:'enabled',studentAccess:false},policy:POLICY,createdAt:Date.now()});
  });
 }
 const m=(await ref.get()).data(),accounts=await ref.collection('accounts').limit(1).get(),treasury=(await ref.collection('treasury').doc('current').get()).data();assert.equal(m.mode,'coin');assert.equal(m.currencyScale,100);
 if(process.argv.includes('--initialize')){assert.equal(m.studentAccess,false);assert.equal(accounts.size,0);assert.equal(treasury.initialGrantsMinor,0);}
 const rules=new Client({urlPrefix:'https://firebaserules.googleapis.com',apiVersion:'v1',auth:true}),rule=(await rules.get(`projects/${project}/releases/cloud.firestore`)).body;assert.equal(rule.rulesetName,JSON.parse(fs.readFileSync(stage+'/rules-before.json')).rulesetName,'Rules changed during deployment');
 const report={...TARGET,startDate:m.startDate,mode:m.mode,lifecycle:m.lifecycle,studentAccess:m.studentAccess,configVersion:m.configVersion,accountCount:treasury.accountCount,initialGrantsMinor:treasury.initialGrantsMinor,rulesUnchanged:rule.rulesetName,verifiedAt:new Date().toISOString()};fs.writeFileSync(stage+'/pilot-receipt.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await db.terminate();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
