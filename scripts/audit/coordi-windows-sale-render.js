'use strict';
const fs=require('node:fs/promises');
const {createBundleReader}=require('../../functions/coordi-shop/local-renderer/reader');
const {toWidgetLook,normalize}=require('../../functions/coordi-shop/local-provider');
const core=require('../../functions/coordi-shop/local-renderer/core'),catalog=require('../../functions/coordi-shop/catalog.json');
const slots={skin:'skin',hair:'hair',face:'face',hat:'cap',faceAccessory:'faceDeco',eyeAccessory:'eyeDeco',earring:'earring',top:'dress',overall:'dress',bottom:'pants',shoes:'shoes',glove:'glove',cape:'cape',weapon:'weapon'};
(async()=>{if(!process.argv[2])throw Error('Pass bundle root');const r=createBundleReader(process.argv[2]),results=[];let count=0;
  for(const item of Object.values(catalog)){
    // Explicit synthetic fixture hair, NOT a replacement for production female 31000.
    const male=item.genders.includes('male');const look=normalize({gender:male?0:1,itemCode:{skin:12000,face:male?20000:21000,hair:male?30000:61050,[slots[item.category]]:item.code},itemPrism:{}});
    try{const image=await core.render(await toWidgetLook(look,r),r);results.push({productId:item.id,ok:true,width:image.width,height:image.height});}
    catch(e){results.push({productId:item.id,ok:false,error:e.message,details:e.details,request:look});}
    if(++count%200===0)console.log('checked '+count);
  }
  const report={snapshot:(await r.manifest()).sourceSnapshot,scope:'Single sale item, stand1, cream skin, no dye; male hair30000 / explicitly chosen female test hair61050. Not all saved outfits.',total:results.length,passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok),results};
  await fs.writeFile(process.argv[3]||'/tmp/coordi-windows-sale-render.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({total:report.total,passed:report.passed,failed:report.failed},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
