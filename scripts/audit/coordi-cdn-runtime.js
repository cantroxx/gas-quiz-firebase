#!/usr/bin/env node
'use strict';
// Local Node runtime + real production CDN. Synthetic authorization; no student reads/writes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createConfiguredPreviewService}=require('../../functions/coordi-shop/runtime');
const png=require('../../functions/coordi-shop/local-renderer/png');
class AppError extends Error{constructor(code,message,details){super(message);this.code=code;this.details=details;}}
(async()=>{
 const [bundle,out]=process.argv.slice(2);assert(bundle&&out,'Pass bundle and output JSON');
 const c=require('../build-coordi-local-release').configFor(bundle),origin='https://dj48-quiztown-firebase.web.app';
 const config={mode:'local',baseUrl:origin+c.baseUrl,snapshot:c.snapshot,manifestSha256:c.manifestSha256};let authChecks=0;
 const service=createConfiguredPreviewService({config,ErrorType:AppError,authorize:async uid=>{authChecks++;assert.equal(uid,'synthetic');},fetchData:(url,options)=>{assert(String(url).startsWith(config.baseUrl),'External renderer request blocked');return fetch(url,options);}});
 const call=async look=>{const start=performance.now(),data=await service('synthetic',{look});return {ms:performance.now()-start,data};};
 const female={gender:1,itemCode:{skin:12000,hair:31000,face:21000},itemPrism:{}};
 const cold=await call(female),before=service.stats(),warm=await call(female),after=service.stats();
 assert.equal(cold.data.imageUrl,warm.data.imageUrl);assert.equal(before.requests,after.requests);
 assert.equal(cold.data.renderer,'quiztown-local-static');assert.equal(cold.data.sourceSnapshot,c.snapshot);assert.equal(cold.data.includesEffects,true);
 const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
 const image=await png.decode(cold.data.imageUrl.split(',')[1]),fixtures=JSON.parse(fs.readFileSync(path.join(bundle,'reference/cases/results.json'))).cases;
 assert.equal(digest(image.data),fixtures.find(x=>x.id==='primary-female-31000').rgbaSha256);
 const primary=JSON.parse(fs.readFileSync(path.join(bundle,'tools/windows-request-cases.json'))).primary,errors=[];
 for(const row of primary){const expected=fixtures.find(x=>x.id==='primary-'+row.productId);if(expected?.status!=='expected-rejection')continue;
  await assert.rejects(call(row.request),e=>{assert.equal(e.code,'failed-precondition');assert.equal(e.message,expected.error);errors.push({productId:row.productId,code:e.code,message:e.message});return true;});
 }
 assert.equal(errors.length,5);
 const parallel=await Promise.all(Array.from({length:8},(_,i)=>call({...female,itemPrism:{skin:{tone:i*10}}})));assert(parallel.every(r=>r.data.success));
 assert.equal(service.stats().active,0);assert.equal(service.stats().queued,0);
 const report={ok:true,scope:'Local Node runtime with real production CDN; synthetic authorization, not Cloud Run latency/authentication',node:process.version,snapshot:c.snapshot,female:{width:image.width,height:image.height,rgbaSha256:digest(image.data),pngSha256:digest(Buffer.from(cold.data.imageUrl.split(',')[1],'base64')),coldMs:cold.ms,warmMs:warm.ms,firstAssetRequests:before.requests,firstAssetBytes:before.bytes},parallel8Ms:parallel.map(r=>r.ms),authorizationChecks:authChecks,errors,stats:service.stats()};
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({ok:true,coldMs:cold.ms,warmMs:warm.ms,expectedErrors:errors.length,parallel8:true}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
