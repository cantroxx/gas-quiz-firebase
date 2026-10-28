// Offline image preparation; never uploads to Storage or changes source illustrations.
const fs = require('node:fs'), path = require('node:path');
const sharp = require(require.resolve('sharp', {paths: [process.env.CODEX_IMAGE_MODULES || '/Users/kdw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules']}));
const root = path.resolve(__dirname, '../..');
const generated = '/Users/kdw/.codex/generated_images/01a0fc4d-3322-73e2-a95e-a8bd81520acb';
const sources = {
  snack: 'exec-9d7cecbb-b8ea-45f6-97dc-534b2dc7b48d.png', lunch: 'exec-ca4bc3b7-f7b7-481b-9bcd-9b45d8843b36.png',
  notebook: 'exec-02a386ba-2d48-430d-bc24-20584a786062.png', empty: 'exec-2ef34525-ee17-49e5-bead-54f198fc3a22.png'
};
(async()=>{
  const output = root + '/public/images/classroom/stationery';fs.mkdirSync(output,{recursive:true});
  const records=[];
  for(const [key,file] of Object.entries(sources)) {
    const source=path.join(generated,file), meta=await sharp(source).metadata();
    for(const size of [160,320]) {
      const target=`${output}/${key}-${size}.webp`;
      await sharp(source).resize(size,size,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:82,alphaQuality:90,effort:6}).toFile(target);
      records.push({asset:key,sourceBytes:fs.statSync(source).size,sourceWidth:meta.width,sourceHeight:meta.height,alpha:meta.hasAlpha,file:path.relative(root,target),bytes:fs.statSync(target).size,width:size,height:size});
    }
  }
  for(const name of ['reading-sprout','community-tree']) {
    const source=`${root}/public/images/classroom/${name}.png`, target=`${root}/public/images/classroom/${name}-320.webp`;
    await sharp(source).resize(320,320,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:80,alphaQuality:90,effort:6}).toFile(target);
    records.push({asset:name,sourceBytes:fs.statSync(source).size,file:path.relative(root,target),bytes:fs.statSync(target).size,width:320,height:320});
  }
  fs.writeFileSync(root+'/docs/product/classroom-stationery-assets-2026-10-07.json',JSON.stringify(records,null,2));console.log(JSON.stringify(records));
})().catch(e=>{console.error(e);process.exitCode=1;});
