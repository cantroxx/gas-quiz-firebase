#!/usr/bin/env node
// Export optional inventory artwork without changing the live product catalog.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require(require.resolve('sharp',{paths:['/Users/kdw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules']}));
const root=path.resolve(__dirname,'../..'),docs=root+'/docs/product/classroom-market-reserve-2026-10-17',out=root+'/public/images/classroom/market-reserve-v1';
(async()=>{
 const entries=JSON.parse(fs.readFileSync(docs+'/prompts.json'));assert.equal(entries.length,12);
 fs.mkdirSync(docs+'/originals',{recursive:true});fs.mkdirSync(out,{recursive:true});
 const files=[];
 for(const entry of entries){
  const original=docs+'/originals/'+entry.key+'.png';if(!fs.existsSync(original))fs.copyFileSync(entry.source,original);
  assert((await sharp(original).metadata()).hasAlpha,entry.key+' alpha');
  for(const size of [320,640]){
   const name=entry.key+'-'+size+'.webp',target=out+'/'+name;
   await sharp(original).resize(size,size,{fit:'contain',background:'#00000000'}).webp({quality:84,alphaQuality:100,effort:4}).toFile(target);
   const meta=await sharp(target).metadata();assert(meta.hasAlpha&&meta.width===size&&meta.height===size);
   files.push({name,bytes:fs.statSync(target).size});
  }
 }
 const cells=await Promise.all(entries.map(async(e,i)=>({input:await sharp(out+'/'+e.key+'-320.webp').resize(220,220).extend({top:10,bottom:10,left:10,right:10,background:'#faf6ed'}).flatten({background:'#faf6ed'}).png().toBuffer(),left:(i%4)*240,top:Math.floor(i/4)*240})));
 await sharp({create:{width:960,height:720,channels:3,background:'#faf6ed'}}).composite(cells).png().toFile(docs+'/collection.png');
 fs.writeFileSync(docs+'/index.html','<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>우리 교실 여분 아이콘 12종</title><style>body{font:16px system-ui;background:#faf6ed;padding:24px;color:#253c35;max-width:1200px;margin:auto}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px}figure{margin:0;background:white;border-radius:18px;padding:16px;text-align:center}img{width:100%;aspect-ratio:1;object-fit:contain}figcaption{font-weight:bold}small{display:block;color:#60736b;margin:8px}a{color:#28634f}</style><h1>우리 교실 · 여분 아이콘 12종</h1><p>활동용 6종 · 꾸미기용 6종. 투명 배경 PNG 원본과 WebP 320/640px를 보관했습니다. 현재 운영 상품 선택 목록에는 연결하지 않은 예비 이미지입니다.</p><p>제작: 내장 image_gen · <a href="prompts.json">전체 생성 프롬프트</a> · <a href="web-assets.zip">웹용 이미지 ZIP</a></p><main>'+entries.map(e=>'<figure><img src="../../../public/images/classroom/market-reserve-v1/'+e.key+'-640.webp" alt="'+e.label+'"><figcaption>'+e.label+'</figcaption><small>'+e.category+'</small><a href="originals/'+e.key+'.png">PNG 원본</a> · <a href="../../../public/images/classroom/market-reserve-v1/'+e.key+'-640.webp">WebP</a></figure>').join('')+'</main></html>');
 const report={tool:'built-in image_gen',artworks:entries.length,files,totalBytes:files.reduce((n,f)=>n+f.bytes,0),status:'reserve assets saved locally; not deployed or connected to selector'};
 fs.writeFileSync(docs+'/manifest.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;});
