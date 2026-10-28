'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');const {audit}=require('../../functions/popular-quiz/source-audit');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
test('source refresh records changed images/pages as candidates and never publishes them',async()=>{
 const sources=[{id:'a',sourceImageUrl:'https://source/image-a',sourceUrl:'https://source/profile',sha256:sha('same')},{id:'b',sourceImageUrl:'https://source/image-b',sourceUrl:'https://source/profile',sha256:sha('old')}];
 const before=JSON.stringify(sources),headers=[];
 const report=await audit(sources,{pages:[{url:'https://source/profile',sha256:sha('old-page')}]},{fetchImpl:async(url,opts)=>{headers.push(opts.headers);return new Response(url.endsWith('image-a')?'same':'new',{status:200});}});
 assert.equal(report.images[0].needsReview,false);assert.equal(report.images[1].needsReview,true);assert.equal(report.pages[0].needsReview,true);assert.equal(report.reviewCount,2);assert.equal(report.automaticPublish,false);assert.equal(JSON.stringify(sources),before);assert.equal(headers[0].Referer,'https://source/profile');
 const failed=await audit(sources,{}, {fetchImpl:async()=>new Response('',{status:404})});assert.ok(failed.images.every(r=>r.needsReview));
});
