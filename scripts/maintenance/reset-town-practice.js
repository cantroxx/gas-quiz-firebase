#!/usr/bin/env node
'use strict';
// Explicitly authorized reset: preserve owned titles as legacy, clear only home practice/badge aggregates.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const PROJECT='dj48-quiztown-firebase',PREFIX=`projects/${PROJECT}/databases/(default)/documents/`;
const ROOT=path.resolve(__dirname,'../..'),STAGE='/tmp/town-place-status-release';
const allowedDelete=name=>/^practiceRecords\/[^/]+$|^userPracticeSummary\/[^/]+$|^userBadges\/[^/]+\/badges\/[^/]+$/.test(name.replace(PREFIX,''));
const allowedTitle=name=>/^userTitles\/[^/]+\/titles\/[^/]+$/.test(name.replace(PREFIX,''));
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function writesFor(snapshot,current) {
 const before=new Map(snapshot.documents.map(d=>[d.name,d])),now=new Map(current.map(d=>[d.name,d]));
 for(const d of current)assert(before.has(d.name),'New records appeared after backup; take a fresh snapshot before reset.');
 const writes=[];
 for(const old of snapshot.documents) {
  const doc=now.get(old.name);
  if(allowedDelete(old.name)) {if(!doc)continue;assert.equal(doc.updateTime,old.updateTime,'Record changed since backup; reset stopped.');writes.push({delete:doc.name,currentDocument:{updateTime:doc.updateTime}});}
  else {
   assert(allowedTitle(old.name),'Out-of-scope path');assert(doc,'Owned title must never disappear.');
   const fields={...doc.fields};delete fields.legacyGroup;delete fields.legacyMigratedAt;
   const original={...old.fields};delete original.legacyGroup;delete original.legacyMigratedAt;
   assert.deepEqual(fields,original,'Title fields changed; reset stopped.');
   if(doc.fields?.legacyGroup?.stringValue==='pre-20261018')continue;
   assert.equal(doc.updateTime,old.updateTime,'Title changed since backup; reset stopped.');
   writes.push({update:{name:doc.name,fields:{legacyGroup:{stringValue:'pre-20261018'},legacyMigratedAt:{timestampValue:snapshot.createdAt}}},updateMask:{fieldPaths:['legacyGroup','legacyMigratedAt']},currentDocument:{updateTime:doc.updateTime}});
  }
 }
 return writes;
}
async function main(){
 const base='/opt/homebrew/lib/node_modules/firebase-tools/lib/',auth=require(base+'auth'),{requireAuth}=require(base+'requireAuth'),{Client}=require(base+'apiv2');
 await requireAuth({project:PROJECT,...auth.getGlobalDefaultAccount()});const client=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1',auth:true});
 const query=async(id,group=false)=>{const r=await client.post(PREFIX.slice(0,-1)+':runQuery',{structuredQuery:{from:[{collectionId:id,allDescendants:group}]}});return r.body.filter(r=>r.document).map(r=>r.document);};
 const read=async()=>{const rows=await Promise.all([query('practiceRecords'),query('userPracticeSummary'),query('badges',true),query('titles',true)]);const documents=rows.flat();for(const d of documents)assert(allowedDelete(d.name)||allowedTitle(d.name),'Unexpected collection-group owner');return documents;};
 const planPath=STAGE+'/reset-plan.json';
 if(process.argv.includes('--snapshot')) {
  const documents=await read(),snapshot={createdAt:new Date().toISOString(),documents};
  const folder=ROOT+'/private/backups/town-practice-reset-20261018';fs.mkdirSync(folder,{recursive:true,mode:0o700});
  const backupPath=folder+'/backup-'+Date.now()+'.json';fs.writeFileSync(backupPath,JSON.stringify(snapshot),{mode:0o600,flag:'wx'});
  const counts={practiceRecords:0,userPracticeSummary:0,badges:0,titles:0};for(const d of documents){const p=d.name.replace(PREFIX,'').split('/');counts[p[0]==='userBadges'?'badges':p[0]==='userTitles'?'titles':p[0]]++;}
  const plan={backupPath,backupDigest:digest(snapshot),counts,deleteCount:documents.filter(d=>allowedDelete(d.name)).length,legacyTitleCount:documents.filter(d=>allowedTitle(d.name)).length};
  fs.writeFileSync(planPath,JSON.stringify(plan,null,2));console.log(JSON.stringify(plan));return;
 }
 assert(process.argv.includes('--apply')||process.argv.includes('--verify'),'Use --snapshot, --apply or --verify');
 const plan=JSON.parse(fs.readFileSync(planPath)),snapshot=JSON.parse(fs.readFileSync(plan.backupPath));assert.equal(digest(snapshot),plan.backupDigest);
 const current=await read(),writes=writesFor(snapshot,current);
 if(process.argv.includes('--apply')) {
  // Preconditions protect concurrent edits. Title migration happens before aggregate deletion.
  writes.sort((a,b)=>Number(!!a.delete)-Number(!!b.delete));
  for(let i=0;i<writes.length;i+=200)await client.post(PREFIX.slice(0,-1)+':commit',{writes:writes.slice(i,i+200)});
 }
 const after=await read();assert.equal(writesFor(snapshot,after).length,0,'Reset/migration incomplete');
 const titles=after.filter(d=>allowedTitle(d.name));assert.equal(titles.length,plan.legacyTitleCount);assert(after.every(d=>allowedTitle(d.name)),'Practice aggregates remain');
 const receipt={completedAt:new Date().toISOString(),backupPath:plan.backupPath,backupDigest:plan.backupDigest,deleted:{practiceRecords:plan.counts.practiceRecords,userPracticeSummary:plan.counts.userPracticeSummary,badges:plan.counts.badges},migratedTitles:titles.length,remainingPractice:0,remainingBadges:0,preserved:['owned title ids and fields','selected titles','coins','XP','rankings','reward logs'],writeCollections:['practiceRecords','userPracticeSummary','userBadges/*/badges','userTitles/*/titles (legacy metadata only)']};
 fs.writeFileSync(STAGE+'/reset-receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}
module.exports={writesFor,allowedDelete,allowedTitle,PREFIX};
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
