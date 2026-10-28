#!/usr/bin/env node
'use strict';
// Read-only production snapshots for the explicitly authorized plaza release.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),zlib=require('node:zlib'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2'),hosting=require(lib+'hosting/api');
const project='dj48-quiztown-firebase',stage='/tmp/plaza-deploy-20261019';
const targets=['getEventProgress','claimEventQuestReward','grantPracticeReward','grantRankingCompleteXp','ingestGrowthActivity','ingestPracticeGrowth','survivorQuestQuiz','wordBombAction','subjectQuizAction','popularQuizAction'];
const files=['index.html','styles.css','js/app.bundle.js','js/features/ranking-data.js','js/features/ranking-render.js','js/application/ranking-usecases.js','js/ranking-plaza-loader.js','js/hideout-ranking-plaza.js','js/town-spatial.js','js/features/event-render.js','js/features/home-render.js','js/town-avatar.js','js/data/popular-quiz-catalog.js','popular-quiz/style.css','popular-quiz/app.js','player-status/status.js','mathsurvivor/net.js','mathsurvivor/game.js','popular-quiz/index.html','mathsurvivor/index.html','player-status/index.html'];
const save=(f,v)=>{const p=stage+'/'+f;fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,v);};
(async()=>{
 await requireAuth({project,...auth.getGlobalDefaultAccount()});
 const api=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true});
 for(const target of targets){const name=`projects/${project}/locations/asia-northeast3/functions/${target}`,meta=(await api.get(name)).body;assert.equal(meta.state,'ACTIVE');save(target+'/before.json',JSON.stringify(meta));const signed=(await api.post(name+':generateDownloadUrl',{})).body,r=await fetch(signed.downloadUrl);assert(r.ok);save(target+'/source.zip',Buffer.from(await r.arrayBuffer()));execFileSync('unzip',['-oq',stage+'/'+target+'/source.zip','-d',stage+'/'+target+'/before']);console.log('Snapshot '+target);}
 const live=await hosting.getChannel('-',project,'live'),source=live.release.version.name,hapi=new Client({urlPrefix:'https://firebasehosting.googleapis.com',apiVersion:'v1beta1',auth:true});let token='',manifest={};
 do{const r=(await hapi.get(source+'/files',{queryParams:{pageSize:1000,...token?{pageToken:token}:{}}})).body;for(const f of r.files||[])manifest[f.path]=f.hash;token=r.nextPageToken||'';}while(token);
 await Promise.all(files.map(async file=>{const r=await fetch(`https://${project}.web.app/${file}?plazaSnapshot=${Date.now()}`);assert(r.ok);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(crypto.createHash('sha256').update(zlib.gzipSync(bytes,{level:9})).digest('hex'),manifest['/'+file],file);save('hosting-before/'+file,bytes);}));
 save('hosting-before.json',JSON.stringify({source,files:manifest,config:live.release.version.config}));save('scope.json',JSON.stringify({targets,files}));console.log('Hosting snapshot '+source+'; '+Object.keys(manifest).length+' files');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
