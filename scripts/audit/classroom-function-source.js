#!/usr/bin/env node
const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2');
const project='dj48-quiztown-firebase',stage='/tmp/classroom-consolidated-20261017/functions';
(async()=>{
 await requireAuth({project,...auth.getGlobalDefaultAccount()});
 const api=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true});
 for(const key of ['getClassroomStudentCards','getClassroomEconomyBoard']){
  const name=`projects/${project}/locations/asia-northeast3/functions/${key}`,meta=(await api.get(name)).body;assert.equal(meta.state,'ACTIVE');
  const dir=stage+'/'+key;fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/metadata.json',JSON.stringify(meta,null,2));
  const signed=(await api.post(name+':generateDownloadUrl',{})).body;const r=await fetch(signed.downloadUrl);assert(r.ok);fs.writeFileSync(dir+'/source.zip',Buffer.from(await r.arrayBuffer()));
  execFileSync('unzip',['-oq',dir+'/source.zip','-d',dir+'/source']);console.log(JSON.stringify({key,updateTime:meta.updateTime,source:dir+'/source'}));
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
