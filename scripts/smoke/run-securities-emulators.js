#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'dj48-securities-emulator-'));
const config=path.join(dir,'firebase.json');
const settings={firestore:{rules:process.env.SECURITIES_RULES_PATH||path.join(root,'firestore.rules')},emulators:{firestore:{host:'127.0.0.1',port:8387},hub:{host:'127.0.0.1',port:4487},logging:{host:'127.0.0.1',port:4587},ui:{enabled:false},singleProjectMode:true}};
if(process.argv.includes('--callable')){
 const source=path.join(dir,'functions');fs.mkdirSync(source);fs.symlinkSync(path.join(root,'functions/node_modules'),path.join(source,'node_modules'),'dir');
 fs.copyFileSync(path.join(root,'functions/package.json'),path.join(source,'package.json'));
 fs.writeFileSync(path.join(source,'index.js'),`const {initializeApp}=require('firebase-admin/app');const {getFirestore}=require('firebase-admin/firestore');const {onCall,HttpsError}=require('firebase-functions/v2/https');initializeApp({projectId:'demo-dj48-securities'});const db=getFirestore();Object.assign(exports,require(${JSON.stringify(path.join(root,'functions/classroom/securities',process.env.SECURITIES_PRODUCTION_TEST?'production':'callables'))}).register({onCall,onSchedule:()=>({}),ErrorType:HttpsError,region:'asia-northeast3',db,...require(${JSON.stringify(path.join(root,'tests/securities/emulator-support'))}).helpersFor(db)}));`);
 settings.functions={source:'functions'};settings.emulators.functions={host:'127.0.0.1',port:5087};settings.emulators.auth={host:'127.0.0.1',port:9287};
}
fs.writeFileSync(config,JSON.stringify(settings));
const command=process.argv.includes('--coin-browser')?'node scripts/smoke/classroom-securities-coin-browser.js':process.argv.includes('--callable')?'node tests/securities/callable.integration.js':process.argv.includes('--browser-only')?'node scripts/smoke/classroom-securities-server-browser.js':process.argv.includes('--preview')?'node scripts/smoke/serve-securities-emulator.js':'node tests/securities/emulator.integration.js && node tests/securities/coin.integration.js && node scripts/smoke/classroom-securities-server-browser.js && node scripts/smoke/classroom-securities-coin-browser.js';
try{const r=spawnSync('firebase',['emulators:exec','--project','demo-dj48-securities','--config',config,'--only',process.argv.includes('--callable')?'firestore,auth,functions':'firestore',command],{cwd:root,stdio:'inherit',env:{...process.env,GCLOUD_PROJECT:'demo-dj48-securities',JAVA_TOOL_OPTIONS:'-Xmx512m'}});if(r.error)throw r.error;process.exitCode=r.status??1;}finally{fs.rmSync(dir,{recursive:true,force:true});}
