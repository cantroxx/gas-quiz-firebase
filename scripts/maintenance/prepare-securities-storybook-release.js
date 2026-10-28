#!/usr/bin/env node
'use strict';
// Snapshot live Hosting and replace only the two student-facing securities chunks.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2'),hosting=require(lib+'hosting/api');
const root=path.resolve(__dirname,'../..'),project='dj48-quiztown-firebase',stage='/tmp/securities-storybook-20261018',candidate=stage+'/candidate';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 fs.mkdirSync(stage,{recursive:true});await requireAuth({project,...auth.getGlobalDefaultAccount()});
 const api=new Client({urlPrefix:'https://firebasehosting.googleapis.com',apiVersion:'v1beta1',auth:true}),live=await hosting.getChannel('-',project,'live');let token='',files={};
 do{const r=(await api.get(live.release.version.name+'/files',{queryParams:{pageSize:1000,...(token?{pageToken:token}:{})}})).body;for(const f of r.files||[])files[f.path]=f.hash;token=r.nextPageToken||'';}while(token);
 fs.writeFileSync(stage+'/hosting-before.json',JSON.stringify({version:live.release.version.name,config:live.release.version.config,files},null,2));
 const before={};for(const file of ['index.html','js/app.bundle.js']){
  const r=await fetch(`https://${project}.web.app/${file}?securitiesUiAudit=${Date.now()}`);assert(r.ok);const bytes=Buffer.from(await r.arrayBuffer());
  assert.equal(hash(zlib.gzipSync(bytes,{level:9})),files['/'+file],'Live HTTP content must match manifest: '+file);
  before[file]=bytes.toString();fs.mkdirSync(path.dirname(stage+'/before/'+file),{recursive:true});fs.writeFileSync(stage+'/before/'+file,bytes);
 }
 const write=(file,bytes)=>{fs.mkdirSync(path.dirname(candidate+'/'+file),{recursive:true});fs.writeFileSync(candidate+'/'+file,bytes);};
 let bundle=before['js/app.bundle.js'];
 // Extract deployed source chunks for the isolated browser fixture, never from the dirty app bundle.
 for(const m of bundle.matchAll(/\/\* \/(js\/[^ ]+) \*\/\n([\s\S]*?)\n\/\/# sourceURL=\/\1/g))write(m[1],m[2]+'\n');
 const changed=['js/features/securities-render.js','js/features/securities-server-controller.js'];
 for(const file of changed){const start=`/* /${file} */\n`,end=`\n//# sourceURL=/${file}`;assert.equal(bundle.split(start).length,2);const a=bundle.indexOf(start)+start.length,b=bundle.indexOf(end,a);assert(b>a);const source=fs.readFileSync(root+'/public/'+file,'utf8').trimEnd();bundle=bundle.slice(0,a)+source+bundle.slice(b);write(file,source+'\n');}
 // Assert every unselected source chunk is byte-for-byte preserved.
 const chunks=s=>new Map([...s.matchAll(/\/\* \/(js\/[^ ]+) \*\/\n([\s\S]*?)\n\/\/# sourceURL=\/\1/g)].map(m=>[m[1],m[2]]));
 const original=chunks(before['js/app.bundle.js']),updated=chunks(bundle);assert.equal(updated.size,original.size);for(const [file,source] of original)if(!changed.includes(file))assert.equal(updated.get(file),source,file);
 write('js/app.bundle.js',bundle);
 let html=before['index.html'];for(const asset of ['/js/app.bundle.js','/classroom-securities.css']){const marker=asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),re=new RegExp(marker+'\\?[^"\']*','g');assert.equal([...html.matchAll(re)].length,1);html=html.replace(re,asset+'?v=securities-storybook-20261018');}write('index.html',html);
 const assets=['classroom-securities.css',...fs.readdirSync(root+'/public/images/classroom/securities-v2').filter(p=>p.endsWith('.webp')).map(p=>'images/classroom/securities-v2/'+p)];assert.equal(assets.length,14);
 for(const file of assets)write(file,fs.readFileSync(root+'/public/'+file));
 const selected=['index.html','js/app.bundle.js',...changed,...assets];
 fs.writeFileSync(stage+'/hosting-candidate.json',JSON.stringify({source:live.release.version.name,rawHashes:Object.fromEntries(selected.map(file=>[file,hash(fs.readFileSync(candidate+'/'+file))])),preservedChunks:original.size-changed.length},null,2));
 assert.equal((await hosting.getChannel('-',project,'live')).release.version.name,live.release.version.name,'Live changed during snapshot');
 console.log(JSON.stringify({source:live.release.version.name,files:Object.keys(files).length,changed:selected,preservedChunks:original.size-changed.length}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
