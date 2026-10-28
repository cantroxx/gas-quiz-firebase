'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {createBundleReader}=require('../../functions/coordi-shop/local-renderer/reader');
(async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'coordi-reader-boundary-'));
 try{
  const bundle=path.join(dir,'bundle'),web=path.join(bundle,'web'),alias=path.join(dir,'alias');await fs.mkdir(web,{recursive:true});await fs.symlink(bundle,alias,'dir');
  const manifest={schemaVersion:1,bundleKind:'complete-data',sourceSnapshot:'A'.repeat(64),baseIndex:'escape.json'};
  await fs.writeFile(path.join(web,'manifest.json'),JSON.stringify(manifest));
  assert.deepEqual(await createBundleReader(alias).manifest(),manifest,'Caller-selected alias resolves to its canonical root');
  await fs.writeFile(path.join(dir,'outside.json'),'{}');await fs.symlink(path.join(dir,'outside.json'),path.join(web,'escape.json'));
  await assert.rejects(createBundleReader(alias).baseIndex(),/symlink outside root/,'Child symlink cannot escape');
  await fs.writeFile(path.join(web,'manifest.json'),JSON.stringify({...manifest,baseIndex:'../../outside.json'}));
  await assert.rejects(createBundleReader(alias).baseIndex(),/Path outside bundle/,'Relative traversal cannot escape');
  const {configFor}=require('../../scripts/build-coordi-local-release');
  const config=configFor(alias);await fs.writeFile(path.join(bundle,'version.json'),JSON.stringify({sourceSnapshot:config.snapshot,webManifestSha256:config.manifestSha256}));assert.deepEqual(configFor(alias),config);
  await fs.writeFile(path.join(bundle,'version.json'),JSON.stringify({sourceSnapshot:config.snapshot,webManifestSha256:'0'.repeat(64)}));assert.throws(()=>configFor(alias),/pin mismatch/);
  await fs.writeFile(path.join(bundle,'BUILD-INCOMPLETE.json'),'{}');assert.throws(()=>configFor(alias),/assembly is incomplete/);
  console.log('PASS bundle paths and metadata: pinned version verified, incomplete assembly rejected; root alias accepted, child symlink and relative traversal rejected.');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
