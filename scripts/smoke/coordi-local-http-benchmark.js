'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{spawn}=require('node:child_process');
(async()=>{
 assert(process.env.COORDI_BUNDLE_ROOT,'Set COORDI_BUNDLE_ROOT');let child;
 const origin=await new Promise((resolve,reject)=>{child=spawn(process.execPath,['scripts/smoke/serve-coordi-shop.js'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});child.on('error',reject);child.on('exit',c=>reject(Error('server exit '+c)));child.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m)resolve(m[0]);});});
 try{
  const look={gender:0,itemCode:{skin:12000,hair:30000,face:20000},itemPrism:{}};
  const call=async look=>{const t=performance.now(),res=await fetch(origin+'/preview-call',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:'renderCoordiShopPreview',p:{look}})});const result=await res.json();assert(res.ok,JSON.stringify(result));return {ms:performance.now()-t,data:result.data};};
  const cold=await call(look),before=await(await fetch(origin+'/preview-stats')).json(),warm=await call(look),after=await(await fetch(origin+'/preview-stats')).json();assert.equal(cold.data.imageUrl,warm.data.imageUrl);assert.equal(after.requests,before.requests);
  const parallel=await Promise.all(Array.from({length:8},(_,i)=>call({...look,itemPrism:{skin:{tone:i*10}}})));assert(parallel.every(r=>r.data.success));
  const stats=await(await fetch(origin+'/preview-stats')).json();assert.equal(stats.active,0);assert.equal(stats.queued,0);assert.equal(stats.requests,after.requests,'Warm variants reuse assets');
  const result={scope:'Loopback HTTP Node; not Cloud Run cold start or production latency',coldMs:cold.ms,warmMs:warm.ms,coldAssetRequests:before.requests,coldAssetBytes:before.bytes,warmAdditionalRequests:after.requests-before.requests,parallel8Ms:parallel.map(r=>r.ms),stats};
  fs.writeFileSync('/tmp/coordi-local-phase2/http-benchmark.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{child.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
