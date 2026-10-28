'use strict';
// Test the actual Hosting candidate, resolving unchanged dependencies against live hashes.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const stage=process.env.TOWN_UI_STAGE;
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const compressed=b=>digest(zlib.gzipSync(b,{level:9}));
async function file(relative) {
  relative=relative.replace(/^\//,'');
  assert(!relative.split('/').includes('..'));
  const local=path.resolve('public',relative);
  if(!stage)return local;
  const live=JSON.parse(fs.readFileSync(path.join(stage,'live-manifest.json')));
  const plan=JSON.parse(fs.readFileSync(path.join(stage,'candidate-manifest.json')));
  const target=path.join(stage,'candidate',relative);
  if(fs.existsSync(target)) {
    const bytes=fs.readFileSync(target);
    if(plan.rawHashes[relative])assert.equal(digest(bytes),plan.rawHashes[relative],relative);
    else assert.equal(compressed(bytes),live.files['/'+relative],relative);
    return target;
  }
  assert(live.files['/'+relative],'File absent in live/candidate: '+relative);
  let bytes=fs.existsSync(local)?fs.readFileSync(local):null;
  if(!bytes || compressed(bytes)!==live.files['/'+relative]) {
    const response=await fetch('https://dj48-quiztown-firebase.web.app/'+relative+'?town-ui-fixture='+Date.now());
    assert(response.ok,relative);bytes=Buffer.from(await response.arrayBuffer());
    assert.equal(compressed(bytes),live.files['/'+relative],relative);
  }
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
  return target;
}
module.exports={file};
