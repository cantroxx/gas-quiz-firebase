'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const base='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(base+'auth'),{requireAuth}=require(base+'requireAuth'),{Client}=require(base+'apiv2');
const project='dj48-quiztown-firebase',stage='/tmp/achievements-deploy-20261019';
(async()=>{
 await requireAuth({project,...auth.getGlobalDefaultAccount()});const api=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true});
 const name=`projects/${project}/locations/asia-northeast3/functions/getMemberAchievements`,meta=(await api.get(name)).body;assert.equal(meta.state,'ACTIVE');
 const signed=(await api.post(name+':generateDownloadUrl',{})).body,r=await fetch(signed.downloadUrl);assert(r.ok);fs.writeFileSync(stage+'/new-function-verified.zip',Buffer.from(await r.arrayBuffer()));
 execFileSync('python3',['-c',`import zipfile,hashlib,json,sys\nz=zipfile.ZipFile(sys.argv[1]);m=json.load(open(sys.argv[2]))['syncMemberTitles']\nfor f in ['index.js','achievements/catalog.js','achievements/progress.js','achievements/games.js']:\n assert hashlib.sha256(z.read(f)).hexdigest()==m[f],f`,stage+'/new-function-verified.zip',stage+'/function-manifests.json']);
 const reply=await fetch(`https://asia-northeast3-${project}.cloudfunctions.net/getMemberAchievements`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{memberUserId:'unauthenticated-check'}})});assert.equal(reply.status,401);assert.equal((await reply.json()).error.status,'UNAUTHENTICATED');
 fs.writeFileSync(stage+'/new-function-receipt.json',JSON.stringify({name,state:meta.state,updateTime:meta.updateTime,sourceVerified:true,unauthenticatedStatus:401},null,2));
 // Archive the retired function before the explicitly authorized removal.
 const old=`projects/${project}/locations/asia-northeast3/functions/grantPracticeBadgeCycleReward`,oldMeta=(await api.get(old)).body;fs.writeFileSync(stage+'/retired-function-before.json',JSON.stringify(oldMeta));const download=(await api.post(old+':generateDownloadUrl',{})).body,archive=await fetch(download.downloadUrl);assert(archive.ok);fs.writeFileSync(stage+'/retired-function-source.zip',Buffer.from(await archive.arrayBuffer()));
 console.log('PASS new callable ACTIVE, deployed source matches, unauthenticated access denied; retired callable archived');
})().catch(e=>{console.error(e.message);process.exitCode=1});
