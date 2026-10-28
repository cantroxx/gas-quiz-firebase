'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),zlib=require('node:zlib'),crypto=require('node:crypto');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),hosting=require(lib+'hosting/api'),{Client}=require(lib+'apiv2');
const project='dj48-quiztown-firebase',stage='/tmp/achievements-deploy-20261019',hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 assert.equal(JSON.parse(fs.readFileSync(stage+'/checks.json')).fullCheckPassed,true);
 await requireAuth({project,...auth.getGlobalDefaultAccount()});const api=new Client({urlPrefix:'https://firebasehosting.googleapis.com',apiVersion:'v1beta1',auth:true});
 async function manifest(v){let token='',out={};do{const r=(await api.get(v+'/files',{queryParams:{pageSize:1000,...token?{pageToken:token}:{}}})).body;for(const f of r.files||[])out[f.path]=f.hash;token=r.nextPageToken||'';}while(token);return out;}
 const live=await hosting.getChannel('-',project,'live'),source=live.release.version.name,prior=JSON.parse(fs.readFileSync(stage+'/hosting-plan.json'));assert.equal(source.split('/versions/')[1],prior.version.split('/versions/')[1]);const before=await manifest(source);assert.deepEqual(before,prior.files);
 const changes={},uploads={},raw={};
 for(const [file,asset]of [['popular-quiz/index.html','app.js'],['mathsurvivor/index.html','net.js']]){
  const r=await fetch(`https://${project}.web.app/${file}?achievementCache=${Date.now()}`);assert(r.ok);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(hash(zlib.gzipSync(bytes,{level:9})),before['/'+file]);
  const text=bytes.toString(),from=asset+'?v=plaza-20261019',to=asset+'?v=achievements-20261019';assert.equal(text.split(from).length,2);const out=Buffer.from(text.replace(from,to)),packed=zlib.gzipSync(out,{level:9}),h=hash(packed);changes['/'+file]=h;uploads[h]=packed;raw[file]=hash(out);
 }
 assert.equal((await hosting.getChannel('-',project,'live')).release.version.name,source);
 const clone=await hosting.cloneVersion(project,source,false),version=clone.name||clone.response?.name;const pop=(await api.post(version+':populateFiles',{files:changes})).body,uploader=new Client({urlPrefix:pop.uploadUrl,auth:true});
 for(const h of pop.uploadRequiredHashes||[]){const r=await uploader.request({method:'POST',path:'/'+h,body:require('node:stream').Readable.from(uploads[h]),responseType:'stream',resolveOnHTTPError:true});assert(r.status<400);}
 await hosting.updateVersion(project,version.split('/').pop(),{status:'FINALIZED'});assert.deepEqual(await manifest(version),{...before,...changes});assert.deepEqual((await api.get(version)).body.config,live.release.version.config);assert.equal((await hosting.getChannel('-',project,'live')).release.version.name,source);
 const release=await hosting.createRelease(project,'live',version,{message:'Refresh popular quiz and survivor entry asset versions for achievement release'});
 for(const [file,h]of Object.entries(raw)){const r=await fetch(`https://${project}.web.app/${file}?verify=${Date.now()}`);assert(r.ok);assert.equal(hash(Buffer.from(await r.arrayBuffer())),h);}
 fs.writeFileSync(stage+'/entry-cache-receipt.json',JSON.stringify({release:release.name,version,previous:source,rawHashes:raw,preservedFiles:Object.keys(before).length-2},null,2));console.log('PASS two entry cache versions published and verified; all other files preserved');
})().catch(e=>{console.error(e.message);process.exitCode=1});
