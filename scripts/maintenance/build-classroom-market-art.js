#!/usr/bin/env node
// Reproducible WebP export from imagegen originals; never alters source artwork.
const fs=require('node:fs'),path=require('node:path');
const sharp=require(require.resolve('sharp',{paths:['/Users/kdw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules']}));
const root=path.resolve(__dirname,'../..'),docs=root+'/docs/product/classroom-market-art-2026-10-17',out=root+'/public/images/classroom/market-v2';
(async()=>{
  const entries=JSON.parse(fs.readFileSync(docs+'/prompts.json'));fs.mkdirSync(docs+'/originals',{recursive:true});fs.mkdirSync(out,{recursive:true});
  let bytes=0;
  for(const entry of entries){
    const original=docs+'/originals/'+entry.key+'.png';if(!fs.existsSync(original))fs.copyFileSync(entry.source,original);
    const metadata=await sharp(original).metadata();if(!metadata.hasAlpha)throw new Error('Missing alpha: '+entry.key);
    for(const size of [320,640]){const target=out+'/'+entry.key+'-'+size+'.webp';await sharp(original).resize(size,size,{fit:'contain',background:'#00000000'}).webp({quality:84,alphaQuality:100,effort:6}).toFile(target);bytes+=fs.statSync(target).size;}
  }
  const cells=await Promise.all(entries.map(async(e,i)=>({input:await sharp(out+'/'+e.key+'-320.webp').resize(180,180).extend({top:10,bottom:10,left:10,right:10,background:'#faf6ed'}).flatten({background:'#faf6ed'}).png().toBuffer(),left:(i%6)*200,top:Math.floor(i/6)*200})));
  await sharp({create:{width:1200,height:Math.ceil(entries.length/6)*200,channels:3,background:'#faf6ed'}}).composite(cells).png().toFile(docs+'/collection.png');
  fs.writeFileSync(docs+'/index.html','<!doctype html><meta charset="utf-8"><title>우리 교실 마켓 이미지</title><style>body{font:16px system-ui;background:#faf6ed;padding:32px;color:#253c35}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px}figure{margin:0;background:white;border-radius:18px;padding:15px;text-align:center}img{width:100%}</style><h1>우리 교실 마켓 · 상품 이미지 27종</h1><p>기본 상품 21종 + 맞춤 상품용 6종. 원본은 imagegen으로 제작하고, 화면용 WebP는 320/640px로 최적화했습니다.</p><main>'+entries.map(e=>'<figure><img src="../../../public/images/classroom/market-v2/'+e.key+'-640.webp"><figcaption>'+e.key+'</figcaption></figure>').join('')+'</main>');
  console.log(JSON.stringify({artworks:entries.length,exports:entries.length*2,totalBytes:bytes}));
})().catch(e=>{console.error(e);process.exitCode=1;});
