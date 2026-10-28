#!/usr/bin/env node
'use strict';
// Explicitly requested read-only audit. Never write profiles or print document/member IDs.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const lib='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(lib+'auth'),{requireAuth}=require(lib+'requireAuth'),{Client}=require(lib+'apiv2'),hosting=require(lib+'hosting/api');
const project='dj48-quiztown-firebase',out='/tmp/coordi-local-phase2',root=path.resolve(__dirname,'../..'),snapshot='7B05F3B49BDF2B2DBD868F0C932BE1C9D8C5A22AD47A6CB8FE09F41A3A1EC1A3';
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function decode(v){if(v.mapValue)return Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,v])=>[k,decode(v)]));if(v.arrayValue)return(v.arrayValue.values||[]).map(decode);if('integerValue'in v)return Number(v.integerValue);for(const k of ['stringValue','booleanValue','doubleValue','nullValue'])if(k in v)return v[k];return undefined;}
(async()=>{
 fs.mkdirSync(out,{recursive:true});await requireAuth({project,...auth.getGlobalDefaultAccount()});
 const live=await hosting.getChannel('-',project,'live');const report={baseCommit:execFileSync('git',['rev-parse','50968704'],{cwd:root,encoding:'utf8'}).trim(),hostingVersion:live.release.version.name,checkedAt:new Date().toISOString(),functions:[],publicFiles:[]};
 const hapi=new Client({urlPrefix:'https://firebasehosting.googleapis.com',apiVersion:'v1beta1',auth:true});let pageToken='',manifest={};do{const r=(await hapi.get(live.release.version.name+'/files',{queryParams:{pageSize:1000,...pageToken?{pageToken}:{}}})).body;for(const f of r.files||[])manifest[f.path]=f.hash;pageToken=r.nextPageToken||'';}while(pageToken);
 report.codiPublishedPaths=Object.keys(manifest).filter(p=>p.startsWith('/codi/')).length;
 for(const file of ['index.html','coordi-shop/data-provider.js','coordi-shop/preview-renderer.js','coordi-shop/dressing-room.js',`codi/${snapshot}/manifest.json`]){
  const r=await fetch(`https://${project}.web.app/${file}?audit=${Date.now()}`),bytes=Buffer.from(await r.arrayBuffer());let baseline;try{baseline=execFileSync('git',['show','50968704:public/'+file],{cwd:root,stdio:['ignore','pipe','ignore']});}catch{}
  report.publicFiles.push({file,status:r.status,matches50968704:!!baseline&&digest(bytes)===digest(baseline),publicLocalActivation:/DJ48CoordiLocalDataBase\s*=|coordi-runtime\.json/.test(bytes.toString())});
 }
 const api=new Client({urlPrefix:'https://cloudfunctions.googleapis.com',apiVersion:'v2',auth:true});let deployedCatalog;
 for(const id of ['renderCoordiShopPreview','coordiShopAction']){
  const name=`projects/${project}/locations/asia-northeast3/functions/${id}`,meta=(await api.get(name)).body,url=(await api.post(name+':generateDownloadUrl',{})).body.downloadUrl;
  const response=await fetch(url);assert(response.ok);const zip=path.join(out,id+'.zip'),dir=path.join(out,id);fs.writeFileSync(zip,Buffer.from(await response.arrayBuffer()));execFileSync('unzip',['-oq',zip,'-d',dir]);
  const files=['index.js','coordi-shop/catalog.json','coordi-shop/commerce.js','coordi-shop/service.js','coordi-shop/official-provider.js','coordi-shop/local-provider.js'];
  report.functions.push({id,state:meta.state,revision:meta.serviceConfig.revision,files:files.map(f=>{const b=fs.readFileSync(path.join(dir,f)),baseline=execFileSync('git',['show','50968704:functions/'+f],{cwd:root});return {file:f,matches50968704:digest(b)===digest(baseline),sha256:digest(b)};})});
  if(id==='coordiShopAction')deployedCatalog=JSON.parse(fs.readFileSync(path.join(dir,'coordi-shop/catalog.json')));
 }
 const db=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1',auth:true}),profiles=[];let cursor;
 do{
  const query={from:[{collectionId:'coordiProfiles'}],select:{fields:['owned','look','prisms'].map(fieldPath=>({fieldPath}))},orderBy:[{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:500,...cursor?{startAt:{values:[{referenceValue:cursor}],before:false}}:{}};
  const rows=(await db.post(`projects/${project}/databases/(default)/documents:runQuery`,{structuredQuery:query})).body.filter(r=>r.document).map(r=>r.document);
  profiles.push(...rows.map(d=>decode({mapValue:{fields:d.fields||{}}})));cursor=rows.length===500?rows.at(-1).name:null;
 }while(cursor);
 const {savedLookPayload}=require('../../public/js/town-avatar');const owned=new Set(),rawEquipped=new Set(),prismIds=new Set(),unknown=new Set(),outfits=new Map();let invalidSaved=0;
 for(const p of profiles){for(const id of p.owned||[]){owned.add(id);if(!deployedCatalog[id])unknown.add(id);}for(const id of Object.values(p.look?.equipped||{}))rawEquipped.add(id);for(const id of Object.keys(p.prisms||{}))prismIds.add(id);
  const look=savedLookPayload(p,deployedCatalog);if(!look){invalidSaved++;continue;}const key=JSON.stringify(look);outfits.set(key,(outfits.get(key)||0)+1);
 }
 // Only cosmetic input, deduplicated and owner-free; keep actual combinations out of Git.
 fs.writeFileSync(path.join(out,'saved-outfits.json'),JSON.stringify([...outfits].map(([look,count])=>({look:JSON.parse(look),count})),null,2));
 report.profiles={count:profiles.length,uniqueSavedLooks:outfits.size,invalidSaved,uniqueOwned:owned.size,ownedIds:[...owned].sort(),equippedIds:[...rawEquipped].sort(),prismProductIds:[...prismIds].sort(),unknownOwnedIds:[...unknown].sort()};
 report.saleCount=Object.keys(deployedCatalog).length;fs.writeFileSync(path.join(out,'production-audit.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({hosting:report.hostingVersion,codiPublishedPaths:report.codiPublishedPaths,manifestStatus:report.publicFiles.at(-1).status,saleCount:report.saleCount,profiles:profiles.length,uniqueSavedLooks:outfits.size,uniqueOwned:owned.size,unknownOwned:unknown.size,output:out},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
