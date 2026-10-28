'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {createReader}=require('../../functions/coordi-shop/local-renderer/browser-reader');
const {createConfiguredPreviewService,environmentConfig}=require('../../functions/coordi-shop/runtime');
const snapshot='A'.repeat(64),base='https://dj48-quiztown-firebase.web.app/codi/'+snapshot+'/';
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const decoded=Buffer.from(JSON.stringify({fixture:true})),raw=zlib.gzipSync(decoded),part={path:'parts/test.json.gz',encoding:'gzip-json',sha256:digest(raw),bytes:raw.length,decodedBytes:decoded.length};
const manifest=Buffer.from(JSON.stringify({schemaVersion:1,bundleKind:'complete-data',sourceSnapshot:snapshot,catalogs:[{category:'hair',pages:['catalog/hair/0000.json']}]}));
class AppError extends Error{constructor(code,message,details){super(message);this.code=code;this.details=details;}}
(async()=>{
 let hits=[],fail=false,badEncoding=false,badHash=false,badPath=false;
 const fetchData=async(url,options)=>{
  assert.equal(options.redirect,'error');assert.equal(url.origin,new URL(base).origin);hits.push(url.pathname);
  if(fail){fail=false;return new Response('',{status:503});}
  if(url.pathname.endsWith('manifest.json'))return new Response(manifest);
  if(url.pathname.endsWith('index/items/30.json'))return Response.json({items:{30000:{id:30000,part:badPath?{...part,path:'../escape.gz'}:part}}});
  if(url.pathname.endsWith('0000.json'))return Response.json({items:[{id:30000}]});
  if(url.pathname.endsWith('.gz'))return new Response(badHash?Buffer.alloc(raw.length):raw,{headers:badEncoding?{'Content-Encoding':'gzip'}:{}});
  throw Error('Unexpected asset '+url);
 };
 const make=()=>createReader(base,{origin:new URL(base).origin,manifestSha256:digest(manifest),fetch:fetchData});
 const reader=make();await Promise.all([reader.manifest(),reader.manifest()]);assert.equal(hits.length,1);
 assert.deepEqual(await reader.catalogPage('hair',0),{items:[{id:30000}]});assert.equal(hits.length,2);
 assert.deepEqual(await reader.part(30000),{fixture:true});assert.equal(hits.length,4);await reader.part(30000);assert.equal(hits.length,4);
 await assert.rejects(reader.catalogPage('hair',1),/Invalid catalog page/);
 fail=true;const retry=make();await assert.rejects(retry.manifest());await retry.manifest();assert.equal(retry.stats().pending,0);
 badEncoding=true;await assert.rejects(make().part(30000),/Content-Encoding/);badEncoding=false;
 badHash=true;await assert.rejects(make().part(30000),/hash mismatch/);badHash=false;
 badPath=true;await assert.rejects(make().part(30000),/Invalid asset path/);badPath=false;
 await assert.rejects(createReader(base,{origin:new URL(base).origin,manifestSha256:'0'.repeat(64),fetch:fetchData}).manifest(),/Manifest hash/);
 assert.throws(()=>createReader(base.replace('/codi/','/other/'),{origin:new URL(base).origin}),/version directory/);
 assert.throws(()=>createReader(base,{origin:'https://external.test'}),/same-origin/);
 const config={mode:'local',baseUrl:base,snapshot,manifestSha256:digest(manifest)};
 assert.throws(()=>createConfiguredPreviewService({config:{...config,baseUrl:'https://external.test/codi/'+snapshot+'/'}}),/Unapproved/);
 assert.throws(()=>createConfiguredPreviewService({config:{...config,manifestSha256:null}}),/Pinned/);
 const before=hits.length,service=createConfiguredPreviewService({config,ErrorType:AppError,fetchData,authorize:async()=>{throw new AppError('permission-denied','closed');}});
 await assert.rejects(service('blocked',{look:{}}),{code:'permission-denied'});assert.equal(hits.length,before,'No manifest before authorization');
 assert.equal(environmentConfig({}).mode,'official');
 const authorized=createConfiguredPreviewService({config,ErrorType:AppError,fetchData,authorize:async()=>{}});
 await assert.rejects(authorized('member',{look:{earType:99}}),{code:'failed-precondition'});
 console.log('PASS HTTP reader: pinned manifest/origin, lazy pages, dedup/cache, retry, raw gzip, hash/size/path checks, authorization before data and explicit local config.');
})().catch(e=>{console.error(e);process.exitCode=1;});
