'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {verifyFiles}=require('../../scripts/migration/preview-grownd-followups');
const {preview}=require('../../functions/classroom/migration-preview');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dj48-original-test-'));
try{
 const root=path.join(dir,'source');fs.mkdirSync(root);const inputPath=path.join(root,'source.json');fs.writeFileSync(inputPath,'{}');
 const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+y/6sAAAAASUVORK5CYII=','base64');
 fs.writeFileSync(path.join(root,'photo.png'),bytes);fs.writeFileSync(path.join(dir,'outside.png'),bytes);
 const sha256=crypto.createHash('sha256').update(bytes).digest('hex'),file={sourceId:'file1',studentId:'source-student-a',relativePath:'photo.png',bytes:bytes.length,mimeType:'image/png',sha256,visibility:'owner'};
 const source=JSON.parse(fs.readFileSync('fixtures/classroom-board/grownd-followups-example.json','utf8')),catalog=JSON.parse(fs.readFileSync('fixtures/classroom-board/target-followups-example.json','utf8'));source.files=[file];source.scope.files=1;
 assert.equal(preview(source,catalog).ready,false,'Unverified attachment blocks migration preview');
 const hashes=verifyFiles(source,inputPath),report=preview(source,catalog,hashes);assert.equal(report.ready,true);assert.equal(report.files[0].originalPreserved,true);
 assert.equal(report.archives.find(a=>a.section==='questHistory').original.submission.text,'합성 원본 독서록 본문');
 assert.equal(report.archives.find(a=>a.section==='securities').original.quantity,3.125678,'Source stock quantities are not currency-rounded');const unpaid=structuredClone(source);unpaid.jobs[0].paid=false;assert(preview(unpaid,catalog,hashes).issues.some(i=>i.kind==='open-contract'));const pending=structuredClone(source);pending.requests[0].paid=false;assert(preview(pending,catalog,hashes).issues.some(i=>i.kind==='open-contract'));
 // Contradictory source records must never certify readiness, even if their balances reconcile.
 for(const [name,change] of [
   ['open lottery marked paid',s=>Object.assign(s.lottery[0],{status:'open',paid:true})],
   ['lost lottery marked paid',s=>Object.assign(s.lottery[0],{status:'lost',winningNumber:21,paid:true})],
   ['winning ticket with another number',s=>s.lottery[0].winningNumber=21],
   ['losing ticket matches winning number',s=>Object.assign(s.lottery[0],{status:'lost',paid:false})],
   ['invalid salary month',s=>s.jobs[0].month='2026-99'],
   ['future salary marked paid',s=>s.jobs[0].month='2026-11'],
   ['paid rejected request',s=>s.requests[0].status='rejected'],
   ['paid pending request',s=>s.requests[0].status='pending']
 ]){const invalid=structuredClone(source);change(invalid);const checked=preview(invalid,catalog,hashes);assert.equal(checked.ready,false,name);assert(checked.issues.some(i=>i.kind==='archive'),name);assert.equal(checked.executionEnabled,false);}
 const open=structuredClone(source);Object.assign(open.lottery[0],{status:'open',paid:false});assert(preview(open,catalog,hashes).issues.some(i=>i.kind==='open-contract'));
 const lost=structuredClone(source);Object.assign(lost.lottery[0],{status:'lost',winningNumber:21,paid:false,prize:0});assert.equal(preview(lost,catalog,hashes).ready,true,'Consistent losing ticket needs no prize payment');
 assert.throws(()=>verifyFiles({files:[{...file,sha256:'0'.repeat(64)}]},inputPath),/해시/);
 assert.throws(()=>verifyFiles({files:[{...file,relativePath:'../outside.png'}]},inputPath),/폴더 밖/);
 fs.symlinkSync(path.join(dir,'outside.png'),path.join(root,'link.png'));assert.throws(()=>verifyFiles({files:[{...file,relativePath:'link.png'}]},inputPath),/폴더 밖/);
 assert.throws(()=>verifyFiles({files:[{...file,mimeType:'image/jpeg'}]},inputPath),/MIME/);
 assert.throws(()=>verifyFiles({files:[file,file]},inputPath),/중복/);
 console.log('PASS original files: full quest text, original image hash/size/MIME, no silent compression, missing verification blocks ready, traversal/symlink/duplicate rejection, contradictory payment/lottery states and invalid salary month rejected.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
