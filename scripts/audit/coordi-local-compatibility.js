'use strict';
// Saved inputs must be a local owner-free projection, never committed or exported.
const fs=require('node:fs/promises'),path=require('node:path');
const {createBundleReader}=require('../../functions/coordi-shop/local-renderer/reader');
const {createLocalProvider,normalize,toWidgetLook}=require('../../functions/coordi-shop/local-provider');
const core=require('../../functions/coordi-shop/local-renderer/core'),png=require('../../functions/coordi-shop/local-renderer/png');
const {createRenderer}=require('../../public/coordi-shop/preview-renderer'),hair=require('../../public/coordi-shop/hair-prism');
const slots={hair:'Hair',face:'Face',hat:'Hat',faceAccessory:'Face Accessory',eyeAccessory:'Eye Decoration',earring:'Earrings',top:'Top',overall:'Overall',bottom:'Bottom',shoes:'Shoes',glove:'Glove',cape:'Cape',weapon:'Cash'};
(async()=>{
 const [bundle,savedFile,out]=process.argv.slice(2);if(!out)throw Error('Pass bundle, private saved-input JSON, output JSON');
 const reader=createBundleReader(bundle),catalog=require('../../functions/coordi-shop/catalog.json');
 const issues=JSON.parse(await fs.readFile(path.join(bundle,'reports/public-catalog-compatibility.json'))).catalogs[0].issues.filter(i=>i.status!=='skin-code-candidate');
 const baseline=await toWidgetLook(normalize({gender:0,itemCode:{skin:12000,hair:30000,face:20000}}),reader),results=[];
 for(const row of issues){
  const look=structuredClone(baseline),slot=slots[row.category];look.Items=look.Items.filter(i=>i.Slot!==slot&&!(slot==='Overall'&&['Top','Bottom'].includes(i.Slot)));
  look.Items.push({Id:row.code,Name:row.name,Slot:slot,Hue:0,Saturation:1,Brightness:1,MixId:null,MixPercent:0,Prism:null,EffectPrism:null});
  const entry={...row,productId:row.category+'-'+row.code,onSale:!!catalog[row.category+'-'+row.code],look};
  try{const im=await core.render(look,reader);entry.ok=true;entry.size=[im.width,im.height];}catch(e){entry.ok=false;entry.error=e.message;entry.details=e.details;}
  results.push(entry);
 }
 const provider=await createLocalProvider({reader});
 const render=createRenderer({render:p=>provider.render(normalize(p)),loadHair:async()=>({...hair,decode:u=>png.decode(u.split(',')[1]),encode:async im=>'data:image/png;base64,'+png.toBase64(await png.encode(im))})});
 const saved=JSON.parse(await fs.readFile(savedFile)),savedResults=[];
 for(const row of saved){try{const r=await render(row.look);savedResults.push({ok:true,count:row.count,size:r.size,renderer:r.renderer});}catch(e){savedResults.push({ok:false,count:row.count,error:e.message,details:e.details});}}
 const report={snapshot:(await reader.manifest()).sourceSnapshot,publicScope:'132 public issues, single item stand1 skin2000 ears0, no dyes; not sale inventory',public:{total:results.length,passed:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,onSale:results.filter(r=>r.onSale).length,results},saved:{combinations:saved.length,passed:savedResults.filter(r=>r.ok).length,results:savedResults}};
 await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({public:{total:report.public.total,passed:report.public.passed,failed:report.public.failed,onSale:report.public.onSale},saved:report.saved},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
