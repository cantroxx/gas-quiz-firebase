'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{spawnSync}=require('child_process');
const stage='/tmp/town-game-vercel-release',before=JSON.parse(fs.readFileSync(stage+'/before.json')),candidate=stage+'/candidate';
const auth=JSON.parse(fs.readFileSync('/Users/kdw/Library/Application Support/com.vercel.cli/auth.json'));
const sha=b=>crypto.createHash('sha1').update(b).digest('hex');
async function api(p){const r=await fetch('https://api.vercel.com'+p+'?teamId='+before.orgId,{headers:{Authorization:'Bearer '+auth.token}});assert(r.ok,'Vercel API '+r.status);return r.json()}
(async()=>{
 const index='public/fraction-world/index.html',expected={};
 for(const f of before.files){const bytes=fs.readFileSync(path.join(candidate,f.path));expected[f.path]=sha(bytes);if(f.path!==index)assert.equal(expected[f.path],f.hash,'Unrelated Vercel source changed: '+f.path);}
 const old=fs.readFileSync(stage+'/before/'+index,'utf8'),next=old.split('\n').filter(line=>!line.includes('<script')||!line.includes('player-status-shortcut.js')).join('\n');assert.equal(fs.readFileSync(candidate+'/'+index,'utf8'),next);
 if(process.argv.includes('--release')){
  assert.equal(JSON.parse(fs.readFileSync('/tmp/town-game-cleanup-release/checks.json')).passed,true);
  const live=await api('/v9/projects/'+before.projectName);assert.equal(live.targets.production.id,before.deployment,'Vercel production changed; rebuild candidate');
  const p=spawnSync(process.execPath,['/Users/kdw/.npm/_npx/67eb4586ca667318/node_modules/vercel/dist/index.js','deploy','--prod','--yes','--cwd',candidate],{stdio:'inherit'});assert.equal(p.status,0,'Vercel deployment failed');
 }else assert(process.argv.includes('--verify'));
 const live=await api('/v9/projects/'+before.projectName),id=live.targets.production.id;assert.notEqual(id,before.deployment);assert.equal(live.targets.production.readyState,'READY');
 const tree=await api('/v6/deployments/'+id+'/files'),files={};function walk(rows,dir=''){for(const f of rows){const rel=dir+f.name;if(f.children)walk(f.children,rel+'/');else files[rel.replace(/^src\//,'')]=f.uid;}}walk(tree);assert.deepEqual(files,expected,'Production source manifest mismatch');
 const response=await fetch('https://dj48-fraction-world.vercel.app/?verify='+Date.now());assert(response.ok);assert.equal(await response.text(),next);
 const receipt={deployment:id,previous:before.deployment,files:Object.keys(files).length,preservedFiles:before.files.length-1,changed:[index],sourceHashesVerified:true,sharedStatusRemoved:true};fs.writeFileSync(stage+'/receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
})().catch(e=>{console.error(e.message);process.exitCode=1});
