'use strict';
// Independently cross-check the transferred version claims against actual bytes.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createBundleReader}=require('../../functions/coordi-shop/local-renderer/reader');
const png=require('../../functions/coordi-shop/local-renderer/png');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const [base,next,delta,out]=process.argv.slice(2);assert(out,'Pass base bundle, assembled bundle, delta directory, output JSON');
 const read=async(root,file)=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
 const version=await read(next,'version.json'),manifest=await read(next,'web/manifest.json'),parent=await read(base,'web/manifest.json');
 assert.equal(parent.sourceSnapshot,version.parentSnapshot);assert.equal(manifest.sourceSnapshot,version.sourceSnapshot);assert.notEqual(version.sourceSnapshot,version.parentSnapshot);
 assert.equal(hash(await fs.readFile(path.join(next,'web/manifest.json'))),version.webManifestSha256);
 assert.equal(hash(await fs.readFile(path.join(base,'web/manifest.json'))),version.parentWebManifestSha256);
 assert.equal(manifest.sourceManifestSha256,version.sourceManifestSha256);
 const sums=async file=>new Map((await fs.readFile(path.join(delta,file),'utf8')).trim().split(/\r?\n/).map(line=>{const at=line.indexOf('  ');return [line.slice(at+2),line.slice(0,at)];}));
 const old=await sums('BASE-WEB-SHA256SUMS'),current=await sums('NEW-WEB-SHA256SUMS');assert.deepEqual([...old.keys()].sort(),[...current.keys()].sort());
 const changed=[...current].filter(([f,sha])=>old.get(f)!==sha).map(([f])=>f).sort();assert.deepEqual(changed,[...version.changedWebFiles].sort());
 const changedItems=[];
 for(const file of changed.filter(f=>f.startsWith('web/index/items/'))){const a=(await read(base,file)).items,b=(await read(next,file)).items;assert.deepEqual(Object.keys(a),Object.keys(b));for(const id of Object.keys(a)){try{assert.deepEqual(a[id],b[id]);}catch{changedItems.push(Number(id));}assert.deepEqual(a[id].icon,b[id].icon,'Icons must stay unchanged');}}
 assert.deepEqual(changedItems.sort((a,b)=>a-b),[...version.changedItemIds].sort((a,b)=>a-b));
 const original=(await read(base,'reference/cases/results.json')).cases,latest=(await read(next,'reference/cases/results.json')).cases,unchanged=[];
 for(const c of original.filter(c=>c.status==='rendered')){
  const n=latest.find(n=>n.id===c.id);assert.equal(n?.status,'rendered');assert.equal(n.rgbaSha256,c.rgbaSha256);
  const oldPng=await png.decode(await fs.readFile(path.join(base,'reference/cases',c.id,'expected.png'))),newPng=await png.decode(await fs.readFile(path.join(next,'reference/cases',c.id,'expected.png')));
  assert.equal(oldPng.width,newPng.width);assert.equal(oldPng.height,newPng.height);assert.deepEqual(oldPng.data,newPng.data);unchanged.push(c.id);
 }
 const reader=createBundleReader(next),cape=await reader.part(1103400),markers=[];
 for(const action of manifest.actions){const sprites=cape.spriteEffects[action];assert(sprites.length>=2,'Marker plus actual effect required');const marker=await png.decode(sprites[0].image);assert.equal(marker.width,1);assert.equal(marker.height,1);assert.equal(marker.data[3],17);assert.equal(sprites[0].z,0);assert.equal(sprites[0].pos,0);markers.push({action,alpha:marker.data[3],spriteCount:sprites.length});}
 const evidence=await read(next,'reference/raw-evidence/png-evidence.json'),decodedEvidence=[];
 for(const row of evidence){assert.match(row.name,/^[0-9a-z-]+\.png$/i);const im=await png.decode(await fs.readFile(path.join(next,'reference/raw-evidence',row.name)));assert.equal(im.width,row.width);assert.equal(im.height,row.height);decodedEvidence.push({file:row.name,path:row.path,width:im.width,height:im.height,rgbaSha256:hash(im.data)});}
 const order=await reader.order();assert(!order.includes('weaponBelowHand'));
 const raw=(await reader.part(1703421)).frameBooks.stand1.frames[0].effects;assert(Object.values(raw).some(e=>e.position==='weaponBelowHand'));
 const report={ok:true,version,changedWebFiles:changed,changedItems,originalRgbaExact:unchanged,capeMarkerPreserved:markers,rawPngEvidence:decodedEvidence,unknownWeaponLayerConfirmed:true,referenceCounts:{rendered:latest.filter(c=>c.status==='rendered').length,rejected:latest.filter(c=>c.status==='expected-rejection').length},scope:'Actual transferred bytes; no original WZ or Windows extractor guard rerun'};
 await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({ok:true,changedItems,unchangedOriginalPngs:unchanged.length,rawPngs:decodedEvidence.length,referenceCounts:report.referenceCounts}));
})().catch(e=>{console.error(e);process.exitCode=1;});
