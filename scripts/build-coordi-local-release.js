'use strict';
// Prepare an isolated candidate, never write public/codi or deploy by implication.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function displayCatalog(){
 const source=require('../public/coordi-shop/data/verified-top50-display.json');
 const strip=value=>Array.isArray(value)?value.map(strip):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([k])=>!['thumbnail','iconUrl','source','url'].includes(k)).map(([k,v])=>[k,strip(v)])):value;
 const verified=strip(source),rows=new Map();for(const genders of Object.values(verified.itemsByCategoryGender))for(const items of Object.values(genders))for(const item of items)rows.set(item.category+'-'+item.code,item);
 for(const item of Object.values(require('../functions/coordi-shop/catalog.json')))if(!rows.has(item.id))rows.set(item.id,{...item,gender:item.genders.length===2?'all':item.genders[0]});
 return {...verified,items:[...rows.values()]};
}
function configFor(bundleRoot){
 const bytes=fs.readFileSync(path.join(bundleRoot,'web/manifest.json')),manifest=JSON.parse(bytes);
 if(manifest.schemaVersion!==1||manifest.bundleKind!=='complete-data'||!/^[A-F0-9]{64}$/.test(manifest.sourceSnapshot))throw Error('Invalid complete bundle');
 return {schemaVersion:1,mode:'local',snapshot:manifest.sourceSnapshot,baseUrl:'/codi/'+manifest.sourceSnapshot+'/',manifestSha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}
if(require.main===module){
 const [bundle,destination]=process.argv.slice(2);if(!bundle||!destination)throw Error('Usage: node scripts/build-coordi-local-release.js BUNDLE NEW_OUTPUT_DIRECTORY');
 const out=path.resolve(destination);if(fs.existsSync(out))throw Error('Output must be new; do not overwrite a release');
 const checked=require('node:child_process').spawnSync('python3',[path.join(bundle,'tools/verify_bundle.py'),bundle],{encoding:'utf8'});if(checked.status!==0)throw Error(checked.stdout+checked.stderr);
 const config=configFor(bundle),versionDir=path.join(out,'public',config.baseUrl);fs.mkdirSync(versionDir,{recursive:true});fs.cpSync(path.join(bundle,'web'),versionDir,{recursive:true});
 fs.writeFileSync(path.join(versionDir,'quiztown-display.json'),JSON.stringify(displayCatalog()));fs.mkdirSync(path.join(out,'public/coordi-shop'),{recursive:true});fs.writeFileSync(path.join(out,'public/coordi-shop/runtime-config.json'),JSON.stringify(config,null,2)+'\n');
 fs.writeFileSync(path.join(out,'functions.env.example'),`COORDI_RENDERER_MODE=local\nCOORDI_DATA_BASE_URL=https://dj48-quiztown-firebase.web.app${config.baseUrl}\nCOORDI_DATA_SNAPSHOT=${config.snapshot}\nCOORDI_MANIFEST_SHA256=${config.manifestSha256}\n`);
 fs.writeFileSync(path.join(out,'hosting-headers.json'),JSON.stringify([{source:config.baseUrl+'**',headers:[{key:'Cache-Control',value:'public,max-age=31536000,immutable'}]},{source:config.baseUrl+'**/*.gz',headers:[{key:'Content-Type',value:'application/octet-stream'}]}],null,2));
 fs.writeFileSync(path.join(out,'VERIFICATION.txt'),checked.stdout+'\nCandidate only. Merge headers into Hosting config; gzip must have NO Content-Encoding. Deploy only after approval.\n');console.log(JSON.stringify({out,...config}));
}
module.exports={displayCatalog,configFor};
