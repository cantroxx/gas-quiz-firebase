'use strict';
// Read-only Windows bundle; writes only requested local verification artifacts.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {createBundleReader}=require('../../functions/coordi-shop/local-renderer/reader');
const core=require('../../functions/coordi-shop/local-renderer/core'),png=require('../../functions/coordi-shop/local-renderer/png');
let preview;
(async()=>{
  const root=path.resolve(process.argv[2]||''),out=path.resolve(process.argv[3]||'/tmp/coordi-windows-render-results');
  if(!process.argv[2]||out.startsWith(root+path.sep))throw Error('Pass bundle root and separate output directory');
  const productionCdn=process.argv.includes('--production-cdn');
  const useHttp=process.argv.includes('--http')||productionCdn;
  if(useHttp&&!productionCdn)preview=await require('../smoke/coordi-preview-process').startPreview(root);
  const config=useHttp?require('../build-coordi-local-release').configFor(root):null;
  const origin=productionCdn?'https://dj48-quiztown-firebase.web.app':preview?.origin;
  const httpRequests=[];
  const fetchData=async(url,options)=>{if(!String(url).startsWith(origin+config.baseUrl))throw Error('External request blocked');const r=await fetch(url,options);const body=await r.arrayBuffer();httpRequests.push({path:new URL(url).pathname,status:r.status,contentType:r.headers.get('content-type'),contentEncoding:r.headers.get('content-encoding'),cacheControl:r.headers.get('cache-control'),bytes:body.byteLength});if(String(url).endsWith('.gz')&&(new Uint8Array(body)[0]!==0x1f||new Uint8Array(body)[1]!==0x8b))throw Error('Gzip payload must remain compressed');return new Response(body,{status:r.status,headers:r.headers});};
  const reader=useHttp?require('../../functions/coordi-shop/local-renderer/browser-reader').createReader(origin+config.baseUrl,{origin,manifestSha256:config.manifestSha256,fetch:fetchData}):createBundleReader(root),cases=JSON.parse(await fs.readFile(path.join(root,'reference/cases/results.json'),'utf8')).cases,results=[];
  if(!cases.length||new Set(cases.map(c=>c.id)).size!==cases.length||cases.some(c=>!/^[a-zA-Z0-9_-]+$/.test(c.id)||!['rendered','expected-rejection'].includes(c.status)))throw Error('Invalid reference case index');
  await fs.mkdir(out,{recursive:true});
  for(const c of cases){const look=JSON.parse(await fs.readFile(path.join(root,'reference/cases',c.id,'look.json'),'utf8'));const start=Date.now();
    try{const image=await core.render(look,reader),sha=crypto.createHash('sha256').update(image.data).digest('hex');await fs.writeFile(path.join(out,c.id+'.png'),await png.encode(image));
      const row={id:c.id,ok:c.status==='rendered'&&sha===c.rgbaSha256&&image.width===c.width&&image.height===c.height,width:image.width,height:image.height,rgbaSha256:sha,ms:Date.now()-start};
      if(c.status==='rendered'){const expected=await png.decode(await fs.readFile(path.join(root,'reference/cases',c.id,'expected.png')));row.expectedDecodeMatches=crypto.createHash('sha256').update(expected.data).digest('hex')===c.rgbaSha256;if(expected.width===image.width&&expected.height===image.height){row.changedPixels=0;row.maxChannelError=0;for(let i=0;i<image.data.length;i+=4){if(image.data.subarray(i,i+4).some((v,k)=>v!==expected.data[i+k]))row.changedPixels++;for(let k=0;k<4;k++)row.maxChannelError=Math.max(row.maxChannelError,Math.abs(image.data[i+k]-expected.data[i+k]));}}row.ok=row.ok&&row.expectedDecodeMatches&&expected.width===image.width&&expected.height===image.height&&row.changedPixels===0;}results.push(row);
    }catch(e){results.push({id:c.id,ok:c.status!=='rendered'&&e.message===c.error,error:e.message,expectedError:c.error,details:e.details,ms:Date.now()-start});}
    console.log(JSON.stringify(results.at(-1)));
  }
  const report={ok:results.every(r=>r.ok),snapshot:(await reader.manifest()).sourceSnapshot,renderer:core.version,node:process.version,transport:productionCdn?'production-cdn':useHttp?'actual-loopback-http':'file',readerStats:reader.stats?.(),httpRequests:useHttp?httpRequests:undefined,results};await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');if(!report.ok)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>preview?.stop());
