#!/usr/bin/env node
'use strict';
// Read-only cloud source download; narrowly transplant the read phase locally.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2');
const project='dj48-quiztown-firebase',root=path.resolve(__dirname,'../..'),stage='/tmp/loading-next-20261007';
const name=`projects/${project}/locations/asia-northeast3/functions/getClassroomEconomyBoard`;
function phase(source){const start=source.indexOf('exports.getClassroomEconomyBoard =');const end=source.indexOf('  const jobs = jobsSnapshot.docs',start);assert(start>0&&end>start);return {start,end,text:source.slice(start,end)};}
(async()=>{
  await requireAuth({project,...auth.getGlobalDefaultAccount()});
  const api=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true});
  const meta=(await api.get(name)).body;assert.equal(meta.state,'ACTIVE');
  fs.writeFileSync(stage+'/function-before.json',JSON.stringify({name:meta.name,updateTime:meta.updateTime,buildConfig:meta.buildConfig,serviceConfig:meta.serviceConfig},null,2));
  const download=(await api.post(name+':generateDownloadUrl',{})).body;
  const response=await fetch(download.downloadUrl);assert(response.ok);
  fs.writeFileSync(stage+'/function-source.zip',Buffer.from(await response.arrayBuffer()));
  const liveDir=stage+'/live-functions';fs.mkdirSync(liveDir,{recursive:true});
  execFileSync('unzip',['-oq',stage+'/function-source.zip','-d',liveDir]);
  const live=fs.readFileSync(liveDir+'/index.js','utf8');
  const baseline=fs.readFileSync(stage+'/before/functions-index.js','utf8');
  const local=fs.readFileSync(root+'/functions/index.js','utf8');
  const old=phase(live),before=phase(baseline),next=phase(local);
  assert.equal(old.text,before.text,'Deployed read phase differs; stop and review');
  const candidate=live.slice(0,old.start)+next.text+live.slice(old.end);
  const out=stage+'/functions-release/functions';fs.cpSync(liveDir,out,{recursive:true});
  fs.writeFileSync(out+'/index.js',candidate);
  fs.writeFileSync(stage+'/functions-release/firebase.json',JSON.stringify({functions:{source:'functions'}},null,2));
  if(!fs.existsSync(out+'/node_modules'))fs.symlinkSync(root+'/functions/node_modules',out+'/node_modules','dir');
  execFileSync(process.execPath,['--check',out+'/index.js']);
  fs.writeFileSync(stage+'/function-candidate-sha256',require('node:crypto').createHash('sha256').update(candidate).digest('hex'));
  console.log(JSON.stringify({prepared:out,target:name,sourceUpdateTime:meta.updateTime,scope:'Only authorized independent read phase; all other deployed code retained'}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
