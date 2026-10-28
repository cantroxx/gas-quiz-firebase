'use strict';
// Public server catalog only. No Firebase, member profiles or purchase history reads.
const fs=require('node:fs/promises'),path=require('node:path');
const {createBundleReader}=require('../../functions/coordi-shop/local-renderer/reader');
const catalog=require('../../functions/coordi-shop/catalog.json');
(async()=>{
  if(!process.argv[2])throw Error('Pass Windows bundle root');
  const reader=createBundleReader(process.argv[2]),manifest=await reader.manifest(),base=await reader.baseIndex();const rows=[];
  for(const item of Object.values(catalog)){
    const row={productId:item.id,code:item.code,category:item.category,price:item.price,genders:item.genders};
    if(item.category==='skin'){
      const skin=manifest.skins.find(s=>s.Id+10000===item.code);row.widgetSkin=skin?.Id;row.state=skin&&base.entries[`base:${skin.Id}:stand1:0:False`]&&base.entries[`base:${skin.Id}:head:0:True`]?'candidate':'missing-skin';
    }else try{const mapped=await reader.item(item.code);row.widgetSlot=mapped.slot;row.icon=mapped.icon?.path||null;row.behavior=mapped.behavior;row.reasons=mapped.errors?.item?[mapped.errors.item]:mapped.capabilities?.actions?.stand1?.reasons||[];
      row.state=mapped.category!==item.category?'category-mismatch':mapped.behavior==='invisible'?'transparent':!mapped.part?'missing-part':mapped.behavior==='reveal-equipment'?'needs-equipment':mapped.capabilities?.actions?.stand1?.candidate?'candidate':'limited';
      // File-existence checks cannot certify an arbitrary stored outfit.
    }catch(e){row.state='missing-item';row.reasons=[e.message];}rows.push(row);
  }
  const defaults=[];for(const id of [30000,31000,20000,21000]){const r=await reader.item(id);defaults.push({id,capability:r.capabilities?.actions?.stand1,errors:r.errors});}
  const report={snapshot:manifest.sourceSnapshot,scope:'Local authoritative sale catalog; no production profile/receipt reads',total:rows.length,counts:rows.reduce((s,r)=>(s[r.state]=(s[r.state]||0)+1,s),{}),defaults,rows};
  const out=path.resolve(process.argv[3]||'/tmp/coordi-windows-compatibility.json');await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({total:report.total,counts:report.counts,defaults,out},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
