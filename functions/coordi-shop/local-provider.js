'use strict';
const crypto=require('node:crypto');
const {normalizeMapleOfficialCoordiPayload}=require('./render.cjs');
const {createBundleReader}=require('./local-renderer/reader');
const core=require('./local-renderer/core'),png=require('./local-renderer/png');
const defaultCatalog=require('./catalog.json');
const {withDefaultOutfit}=require('./default-outfit');
const categorySlots={hair:'Hair',face:'Face',hat:'Hat',faceAccessory:'Face Accessory',eyeAccessory:'Eye Decoration',earring:'Earrings',top:'Top',overall:'Overall',bottom:'Bottom',shoes:'Shoes',glove:'Glove',cape:'Cape',weapon:'Cash'};
const inputCategories={hair:'hair',face:'face',cap:'hat',faceDeco:'faceAccessory',eyeDeco:'eyeAccessory',earring:'earring',pants:'bottom',shoes:'shoes',glove:'glove',cape:'cape',weapon:'weapon'};
const bad=(message,details={})=>{throw new core.RenderError(message,details);};
function normalize(input){
  for(const key of ['weaponMotion','variation','variationType'])if(input[key]!=null&&input[key]!==0)bad('현재 자체 미리보기는 기본 정지 동작만 지원합니다.',{field:key});
  for(const key of ['weaponBaseEffect','weaponJumpEffect','weaponSpecialEffect','capeEffect','hideWeaponOnSkill','capEffect','floatEffect'])if(input[key]!=null&&input[key]!==1)bad('효과 표시 옵션은 현재 자체 미리보기에서 지원하지 않습니다.',{field:key});
  if(input.earType!=null&&(!Number.isInteger(input.earType)||input.earType<0||input.earType>3))bad('귀 종류를 확인하세요.');
  for(const [slot,code]of Object.entries(input.itemCode||{}))if(code!=null&&code!==0&&(!Number.isInteger(code)||code<1||(!Object.hasOwn(inputCategories,slot)&&!['skin','dress'].includes(slot))))bad('지원하지 않는 아이템 부위 또는 번호입니다.',{slot,itemId:code});
  return withDefaultOutfit(normalizeMapleOfficialCoordiPayload(input));
}
function prism(value,slot){
  if(!value||Array.isArray(value)||typeof value!=='object')bad('염색 형식을 확인하세요.',{slot});
  const keys=['palette','tone','chroma','brightness','blackInclusive'];if(Object.keys(value).some(k=>!keys.includes(k)))bad('지원하지 않는 염색 필드입니다.',{slot});
  const p={Palette:value.palette??0,Hue:value.tone??0,Saturation:value.chroma??0,Brightness:value.brightness??0,BlackInclusive:!!value.blackInclusive};
  for(const [k,min,max]of [['palette',0,6],['tone',0,359],['chroma',-99,99],['brightness',-99,99],['blackInclusive',0,1]])if(value[k]!=null&&(!Number.isInteger(value[k])||value[k]<min||value[k]>max))bad('염색 범위를 확인하세요.',{slot,field:k});
  if(slot==='skin'&&p.BlackInclusive)bad('피부 검정 포함 옵션은 지원하지 않습니다.');return p;
}
async function toWidgetLook(payload,reader,catalog=defaultCatalog){
  const manifest=await reader.manifest(),bases=await reader.baseIndex();
  const skin=manifest.skins.find(s=>s.Id+10000===payload.itemCode.skin);
  if(!skin||!bases.entries[`base:${skin.Id}:stand1:0:False`]||!bases.entries[`base:${skin.Id}:head:${payload.earType}:True`])bad('이 피부의 body/head 대응 자료가 없습니다.',{slot:'skin',itemId:payload.itemCode.skin});
  const look={Skin:skin.Id,Action:'stand1',Ears:payload.earType,FlipX:false,Items:[],SkinPrism:null,EquipmentAppearance:null};
  const occupied=new Set(['skin']);
  for(const [slot,rawCode]of Object.entries(payload.itemCode)){
    if(slot==='skin')continue;
    let category=inputCategories[slot],code=rawCode;
    if(slot==='dress'){
      const products=Object.values(catalog).filter(p=>p.code===code&&['top','overall'].includes(p.category));
      const categories=[...new Set(products.map(p=>p.category))];if(categories.length!==1)bad('상의/한벌옷 상품 대응이 확인되지 않았습니다.',{slot,itemId:code});category=categories[0];
    }
    if(!category)bad('지원하지 않는 부위입니다.',{slot,itemId:code});
    const dye=payload.itemPrism?.[slot];
    let mixId=null,mixPercent=0;
    if(category==='hair'&&dye){
      if(Object.keys(dye).some(k=>!['baseColor','mixColor','mixRate'].includes(k)))bad('기존 헤어 HSL은 공통 헤어 미리보기 경로로 처리해야 합니다.',{slot,itemId:code});
      for(const [k,max]of [['baseColor',7],['mixColor',7],['mixRate',99]])if(!Number.isInteger(dye[k])||dye[k]<0||dye[k]>max)bad('헤어 믹스 색상과 비율을 확인하세요.',{slot,itemId:code});
      const style=Math.floor(code/10)*10;code=style+dye.baseColor;mixId=style+dye.mixColor;mixPercent=dye.mixRate;
      if(mixId===code||mixPercent===0){mixId=null;mixPercent=0;}
    }
    const row=await reader.item(code);if(row.category!==category||row.slot!==categorySlots[category])bad('아이템 부위 대응이 일치하지 않습니다.',{slot,itemId:code});
    if(mixId!=null){const mix=await reader.item(mixId);if(mix.category!==category)bad('믹스 색상 파츠의 부위가 다릅니다.',{slot,itemId:mixId});}
    const item={Id:code,Name:row.name,Slot:row.slot,Hue:0,Saturation:1,Brightness:1,MixId:mixId,MixPercent:mixPercent,Prism:null,EffectPrism:null};
    if(dye&&category!=='hair'){if(category==='face')bad('성형 염색은 현재 상점에서 지원하지 않습니다.');item.Prism=prism(dye,slot);}
    look.Items.push(item);occupied.add(slot);
  }
  for(const slot of Object.keys(payload.itemPrism||{}))if(!occupied.has(slot))bad('장착되지 않은 부위의 염색입니다.',{slot});
  if(payload.itemPrism?.skin)look.SkinPrism=prism(payload.itemPrism.skin,'skin');
  if(look.Items.some(i=>i.Slot==='Overall')&&look.Items.some(i=>['Top','Bottom'].includes(i.Slot)))bad('한벌옷과 상하의를 함께 입을 수 없습니다.');
  return look;
}
async function createLocalProvider({bundleRoot,reader=createBundleReader(bundleRoot),catalog=defaultCatalog}={}){
  const manifest=await reader.manifest(),version=manifest.sourceSnapshot+':'+core.version+':default-outfit-v1';
  return {id:'quiztown-local-static',version,normalize,
    async render(payload){
      const look=await toWidgetLook(payload,reader,catalog),image=await core.render(look,reader),encoded=await png.encode(image);
      if(encoded.length>500000)bad('이미지가 너무 큽니다.');
      const renderKey=crypto.createHash('sha256').update(version+'|'+JSON.stringify(payload)).digest('hex');
      return {success:true,imageUrl:'data:image/png;base64,'+png.toBase64(encoded),renderKey,renderer:'quiztown-local-static',includesEffects:true,size:{width:image.width,height:image.height},sourceSnapshot:manifest.sourceSnapshot};
    }
  };
}
module.exports={createLocalProvider,toWidgetLook,normalize};
