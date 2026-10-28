'use strict';
// Public-source checks only: changed bytes/pages become review candidates.
// This module never replaces published images, answers, ratings or player data.
const crypto=require('node:crypto');
async function inspect(url,{fetchImpl=fetch,referer='',maxBytes=20*1024*1024}={}){
 try{
  const response=await fetchImpl(url,{headers:{'User-Agent':'DJ48-Quiz-Source-Review/1.0',...(referer?{Referer:referer}:{})},signal:AbortSignal.timeout(6000)});
  if(!response.ok){await response.body?.cancel();return {status:'unavailable',httpStatus:response.status};}
  const hash=crypto.createHash('sha256');let bytes=0;
  for await(const chunk of response.body){bytes+=chunk.length;if(bytes>maxBytes)return {status:'oversized'};hash.update(chunk);}
  return {status:'ok',sha256:hash.digest('hex'),bytes};
 }catch(error){return {status:'unavailable',reason:String(error.name||'fetch-failed').slice(0,60)};}
}
async function audit(sources,previous={},options={}){
 const entries=[...new Map(sources.map(s=>[s.id,s])).values()],pages=[...new Set(entries.map(s=>s.sourceUrl))],report={checkedAt:options.checkedAt||new Date().toISOString(),images:[],pages:[],automaticPublish:false};
 const tasks=[...entries.map(s=>async()=>{const result=await inspect(s.sourceImageUrl,{...options,referer:s.sourceUrl});report.images.push({id:s.id,...result,needsReview:result.status!=='ok'||result.sha256!==s.sha256});}),
  ...pages.map(url=>async()=>{const result=await inspect(url,{...options,maxBytes:4*1024*1024}),old=previous.pages?.find(p=>p.url===url);report.pages.push({url,...result,baseline:!old?.sha256,needsReview:result.status!=='ok'||Boolean(old?.sha256&&old.sha256!==result.sha256)});})];
 let cursor=0;await Promise.all(Array.from({length:8},async()=>{while(cursor<tasks.length){const task=tasks[cursor++];await task();}}));
 report.images.sort((a,b)=>a.id.localeCompare(b.id));report.pages.sort((a,b)=>a.url.localeCompare(b.url));
 report.reviewCount=report.images.filter(r=>r.needsReview).length+report.pages.filter(r=>r.needsReview).length;return report;
}
module.exports={inspect,audit};
