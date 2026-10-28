'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../../public/space-explorer/domain');
const C=require('../../public/space-explorer/content');
function photos(s,m){(m.days||[null]).forEach(day=>s.photos.push({key:D.photoKey(m.target,day),image:'data:image/png;base64,AAAA'}));}
test('learner bundle contains neither answer keys nor explanations',()=>{
 for(const m of C.missions){assert.equal(m.answer,undefined);assert.equal(m.why,undefined);}
});
test('answers require observations, remain editable until final submission, and reveal no grade',()=>{
 const s=D.fresh('assessment'),m=C.missions[0];assert.equal(D.submit(s,m.id,[0,1]),false);photos(s,m);
 assert.equal(D.submit(s,m.id,[0,1]),true);assert.equal(D.submit(s,m.id,[2]),true);assert.equal(s.answers[m.id].correct,null);
 s.finished=true;assert.equal(D.submit(s,m.id,[1]),false);
});
test('restoration discards forged grades and malformed records',()=>{
 const s=D.fresh();photos(s,C.missions[0]);s.answers['moon-surface']={value:[2],correct:true};const restored=D.restore(JSON.stringify(s));assert.equal(restored.answers['moon-surface'].correct,null);
 s.answers['moon-surface'].value=[999];assert.equal(D.restore(JSON.stringify(s)).answers['moon-surface'],undefined);
});

test('real-image provenance survives reload and cannot be attached to another target',()=>{
 const s=D.fresh();s.photos=[{key:'moon',image:'data:image/png;base64,AAAA',captureVersion:2,mediaId:'moon'},{key:'earth',image:'data:image/png;base64,AAAA',captureVersion:2,mediaId:'galaxy'}];
 const copy=D.restore(JSON.stringify(s));assert.equal(copy.photos[0].mediaId,'moon');assert.equal(copy.photos[1].mediaId,null);
});
test('all 20 local photographs match recorded hashes and carry source/license metadata',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
 const base=path.resolve(__dirname,'../../public/space-explorer'),context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(base,'media.js'),'utf8'),context);
 const assets=Object.values(context.window.SpaceMedia);assert.equal(assets.length,20);
 for(const a of assets){const data=fs.readFileSync(path.join(base,a.src));assert.ok(['ffd8ff','89504e'].includes(data.subarray(0,3).toString('hex')));assert.equal(crypto.createHash('sha256').update(data).digest('hex'),a.sha256);assert.ok(a.credit);assert.match(a.source,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);assert.ok(['Public domain','CC BY 4.0','CC BY-SA 3.0','CC BY-SA 4.0','CC BY-SA 2.0','CC BY 3.0','CC0'].includes(a.license));assert.match(a.licenseUrl,/^https:/);}
});

test('3D observation records remain distinct from photographs after reload',()=>{
 const s=D.fresh();s.photos=[{key:'moon',image:'data:image/png;base64,AAAA',captureVersion:3,textureId:'moon',mediaId:'moon'},{key:'earth',image:'data:image/png;base64,AAAA',captureVersion:3,textureId:'saturn'}];
 const copy=D.restore(JSON.stringify(s));assert.equal(copy.photos[0].textureId,'moon');assert.equal(copy.photos[0].captureVersion,3);assert.equal(copy.photos[0].mediaId,null);assert.equal(copy.photos[1].textureId,null);
});
test('all global maps and ring texture match the downloaded source manifest',()=>{
 const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
 const base=path.resolve(__dirname,'../../public/space-explorer/textures'),manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.json'),'utf8'));assert.equal(manifest.length,11);
 for(const a of manifest){const data=fs.readFileSync(path.join(base,a.file));assert.equal(data.length,a.bytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),a.sha256);assert.match(a.url,/^https:\/\/(svs.gsfc.nasa.gov|www.solarsystemscope.com)\//);}
});

test('25 objective missions exactly match server bank without keys',()=>{const Q=require('../../functions/space-assessment/questions');assert.equal(C.missions.length,25);assert.ok(C.missions.every(q=>q.type!=='short'));assert.deepEqual(C.missions,Q.publicQuestions());assert.equal(Q.grade(Q.questions.map(q=>JSON.stringify({value:q.answer,evidence:q.days?q.days.map(d=>q.target+':'+d):[q.target]}))).correct,25);});
