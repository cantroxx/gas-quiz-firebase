'use strict';
// Read-only Windows bundle; writes only requested local verification artifacts.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {createBundleReader}=require('../../functions/coordi-shop/local-renderer/reader');
const core=require('../../functions/coordi-shop/local-renderer/core'),png=require('../../functions/coordi-shop/local-renderer/png');
(async()=>{
  const root=path.resolve(process.argv[2]||''),out=path.resolve(process.argv[3]||'/tmp/coordi-windows-render-results');
  if(!process.argv[2]||out.startsWith(root+path.sep))throw Error('Pass bundle root and separate output directory');
  const reader=createBundleReader(root),cases=JSON.parse(await fs.readFile(path.join(root,'reference/cases/results.json'),'utf8')).cases,results=[];
  await fs.mkdir(out,{recursive:true});
  for(const c of cases){const look=JSON.parse(await fs.readFile(path.join(root,'reference/cases',c.id,'look.json'),'utf8'));const start=Date.now();
    try{const image=await core.render(look,reader),sha=crypto.createHash('sha256').update(image.data).digest('hex');await fs.writeFile(path.join(out,c.id+'.png'),await png.encode(image));
      const row={id:c.id,ok:c.status==='rendered'&&sha===c.rgbaSha256&&image.width===c.width&&image.height===c.height,width:image.width,height:image.height,rgbaSha256:sha,ms:Date.now()-start};
      if(c.status==='rendered'){const expected=await png.decode(await fs.readFile(path.join(root,'reference/cases',c.id,'expected.png')));row.expectedDecodeMatches=crypto.createHash('sha256').update(expected.data).digest('hex')===c.rgbaSha256;if(expected.width===image.width&&expected.height===image.height){row.changedPixels=0;row.maxChannelError=0;for(let i=0;i<image.data.length;i+=4){if(image.data.subarray(i,i+4).some((v,k)=>v!==expected.data[i+k]))row.changedPixels++;for(let k=0;k<4;k++)row.maxChannelError=Math.max(row.maxChannelError,Math.abs(image.data[i+k]-expected.data[i+k]));}}}results.push(row);
    }catch(e){results.push({id:c.id,ok:c.status!=='rendered'&&e.message===c.error,error:e.message,expectedError:c.error,details:e.details,ms:Date.now()-start});}
    console.log(JSON.stringify(results.at(-1)));
  }
  const report={ok:results.every(r=>r.ok),snapshot:(await reader.manifest()).sourceSnapshot,renderer:core.version,results};await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');if(!report.ok)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
