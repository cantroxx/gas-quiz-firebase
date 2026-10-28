#!/usr/bin/env node
'use strict';
// Offline only. Keep reports, including private original text, outside public and Git.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {preview}=require('../../functions/classroom/migration-preview');
function verifyFiles(source,sourceFile){
 const root=fs.realpathSync(path.dirname(sourceFile)),verified={};
 for(const file of source.files||[]){
   if(!file||typeof file.relativePath!=='string'||path.isAbsolute(file.relativePath))throw Error('첨부 파일은 원본 JSON 폴더 아래의 상대 경로여야 합니다.');
   const candidate=path.resolve(root,file.relativePath),real=fs.realpathSync(candidate);
   if(!real.startsWith(root+path.sep))throw Error('첨부 파일이 원본 폴더 밖을 가리킵니다.');
   const stat=fs.statSync(real);if(!stat.isFile()||stat.size!==file.bytes||stat.size>25*1024*1024)throw Error('첨부 파일 크기 불일치 또는 25MB 초과');
   const bytes=fs.readFileSync(real),magic=bytes.subarray(0,12);
   const type=magic.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':magic[0]===255&&magic[1]===216&&magic[2]===255?'image/jpeg':magic.toString('ascii',0,4)==='RIFF'&&magic.toString('ascii',8,12)==='WEBP'?'image/webp':'';
   if(type!==file.mimeType)throw Error('첨부 원본 형식과 MIME이 다릅니다.');
   const sha=crypto.createHash('sha256').update(bytes).digest('hex');if(sha!==file.sha256)throw Error('첨부 원본 해시 불일치');
   if(verified[file.sourceId])throw Error('첨부 원본 ID 중복');verified[file.sourceId]=sha;
 }
 return verified;
}
if(require.main===module){const [sourceFile,catalogFile]=process.argv.slice(2);if(!sourceFile||!catalogFile){console.error('Usage: node scripts/migration/preview-grownd-followups.js <source.json> <target-snapshot.json>');process.exitCode=2;}
 else try{const source=JSON.parse(fs.readFileSync(sourceFile,'utf8')),report=preview(source,JSON.parse(fs.readFileSync(catalogFile,'utf8')),verifyFiles(source,sourceFile));console.log(JSON.stringify(report,null,2));process.exitCode=report.ready?0:1;}catch(e){console.error(e.message);process.exitCode=2;}}
module.exports={verifyFiles};
