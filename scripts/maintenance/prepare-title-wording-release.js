'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{files,transform}=require(process.env.UI_RELEASE_TRANSFORM||'./title-wording-transform');
const stage=process.env.UI_RELEASE_STAGE||'/tmp/title-wording-deploy-20261019',hash=b=>crypto.createHash('sha256').update(b).digest('hex');
let bundle=fs.readFileSync(stage+'/hosting-before/js/app.bundle.js','utf8');const rawHashes={};
function save(file,s){const p=stage+'/candidate/'+file;fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);rawHashes[file]=hash(s);}
for(const f of files){const prior=fs.readFileSync(stage+'/hosting-before/'+f,'utf8'),s=transform(f,prior);save(f,s);
 const marker='/* /'+f+' */\n',end='\n//# sourceURL=/'+f;
 if(bundle.includes(marker)){const a=bundle.indexOf(marker)+marker.length;let b=bundle.indexOf(end,a);if(b<0)b=bundle.indexOf('\n/* /js/',a);assert(b>a);assert.equal(bundle.slice(a,b).trimEnd(),prior.trimEnd(),f);bundle=bundle.slice(0,a)+s.trimEnd()+bundle.slice(b);}
}
save('js/app.bundle.js',bundle);fs.writeFileSync(stage+'/hosting-candidate.json',JSON.stringify({source:JSON.parse(fs.readFileSync(stage+'/hosting-before.json')).source,rawHashes},null,2));
console.log('Prepared wording-only candidate from live sources: '+Object.keys(rawHashes).length+' files');
