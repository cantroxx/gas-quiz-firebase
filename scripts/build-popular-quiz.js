#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=JSON.parse(fs.readFileSync(path.join(root,'docs/product/popular-image-selection-2026-10-18/selection.json')));
const check=process.argv.includes('--check'),cacheArg=process.argv.indexOf('--cache-map');
const cachePath=cacheArg>=0?path.resolve(process.argv[cacheArg+1]):null,cache=cachePath?JSON.parse(fs.readFileSync(cachePath)):{};
const out=path.join(root,'public/popular-quiz/assets');if(!check)fs.mkdirSync(out,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function ext(b){if(b.subarray(0,8).toString('hex')==='89504e470d0a1a0a')return 'png';if(b[0]===255&&b[1]===216)return 'jpg';if(b.subarray(0,3).toString()==='GIF')return 'gif';if(b.subarray(8,12).toString()==='WEBP')return 'webp';throw Error('Unsupported original image format');}
const derivativePath=path.join(root,'functions/popular-quiz/image-derivatives.json');
const derivatives=fs.existsSync(derivativePath)?JSON.parse(fs.readFileSync(derivativePath)):null;
if(derivatives&&derivatives.sourceVersion!==source.version)throw Error('Derivative source version mismatch');
const optimized=new Map((derivatives?.entries||[]).map(entry=>[entry.id,entry]));
if(optimized.size!==(derivatives?.entries||[]).length)throw Error('Duplicate derivative IDs');
const selectedIds=new Set(source.selected.map(row=>row.id));
for(const id of optimized.keys())if(!selectedIds.has(id))throw Error('Unknown derivative ID: '+id);
const questions=source.selected.map(row=>{
 if(!['idol','anime'].includes(row.category)||row.status!=='selected'||!row.imageFetchVerified)throw Error('Unreviewed image');
 if(row.category==='anime'&&!['전체관람가','7세관람가','12세관람가','15세관람가'].includes(row.rating?.label))throw Error('Unapproved age rating');
 let existing=fs.readdirSync(out).find(f=>f.startsWith(row.sha256+'.')),bytes;
 if(existing)bytes=fs.readFileSync(path.join(out,existing));
 else {if(check||!cache[row.id])throw Error(`Missing asset ${row.id}; use --cache-map with verified original image paths.`);bytes=fs.readFileSync(path.resolve(path.dirname(cachePath),cache[row.id]));}
 if(hash(bytes)!==row.sha256)throw Error(`Source image changed: ${row.id}`);
 const file=row.sha256+'.'+ext(bytes);if(!check&&!existing)fs.writeFileSync(path.join(out,file),bytes);
 const derivative=optimized.get(row.id);
 let imageUrl='/popular-quiz/assets/'+file;
 if(derivative){
  if(derivative.sourceSha256!==row.sha256||derivative.originalUrl!==imageUrl||derivative.decodedPixelsIdentical!==true)throw Error('Invalid derivative provenance: '+row.id);
  if(!/^\/popular-quiz\/optimized\/[a-f0-9]{64}\.webp$/.test(derivative.imageUrl))throw Error('Invalid derivative path');
  const display=fs.readFileSync(path.join(root,'public'+derivative.imageUrl));
  if(hash(display)!==derivative.imageSha256||display.length!==derivative.bytes||display.length>=bytes.length)throw Error('Invalid derivative bytes: '+row.id);
  imageUrl=derivative.imageUrl;
 }
 return {id:row.id,category:row.category,kind:row.questionKind,group:row.group,prompt:row.prompt,answer:row.answer,aliases:row.aliases,
  imageUrl,...(derivative?{originalImageUrl:derivative.originalUrl,imageSha256:derivative.imageSha256}:{}),sourceUrl:row.sourceUrl,sourceImageUrl:row.fetchedImageUrl||row.imageUrl,sha256:row.sha256,groupLabel:row.groupLabel,...(row.rating?{rating:row.rating.label}:{})};
});
const pack={version:optimized.size?source.version+'-'+derivatives.version:source.version,questions};const target=path.join(root,'functions/popular-quiz/catalog.json'),serialized=JSON.stringify(pack,null,2)+'\n';
if(check){if(fs.readFileSync(target,'utf8')!==serialized)throw Error('Catalog out of date');}else fs.writeFileSync(target,serialized);
console.log(`Popular quiz catalog: ${questions.filter(x=>x.kind==='person').length} people, ${questions.filter(x=>x.kind==='group').length} groups, ${questions.filter(x=>x.category==='anime').length} characters; original image hashes verified.`);
