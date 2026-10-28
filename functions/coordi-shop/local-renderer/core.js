/* Static first-frame compositor ported from the Windows handoff's Studio* sources.
 * Pure RGBA composition shared by Node and browser. No commerce or network fallback. */
(function(root) {
  'use strict';
  const png=typeof module==='object'&&module.exports?require('./png'):root.DJ48CoordiPng;
  const pixels=typeof module==='object'&&module.exports?require('./pixels'):root.DJ48CoordiPixels;
  const slots=['Hat','Hair','Face','Face Accessory','Eye Decoration','Earrings','Top','Overall','Bottom','Shoes','Glove','Cape','Cash'];
  const actions=['stand1','stand2','walk1','walk2','sit','jump'];
  class RenderError extends Error {constructor(message,details={}){super(message);this.code='coordi-unsupported';this.details=details;}}
  const fail=(message,details)=>{throw new RenderError(message,details);};
  const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
  function validatePrism(p){if(!p)return;for(const [key,min,max]of [['Palette',0,6],['Hue',0,359],['Saturation',-99,99],['Brightness',-99,99]])if(!integer(p[key]??0,min,max))fail('프리즘 범위를 확인하세요.');if(p.BlackInclusive!==undefined&&typeof p.BlackInclusive!=='boolean')fail('프리즘 검정 포함 값을 확인하세요.');}
  function validate(look){
    if(!look||!integer(look.Skin,2000,2999)||!Array.isArray(look.Items)||look.Items.length>20||!actions.includes(look.Action)||!integer(look.Ears,0,3))fail('코디 구성·동작·귀 종류를 확인하세요.');
    validatePrism(look.SkinPrism);if(look.SkinPrism?.BlackInclusive)fail('피부 색상에는 검은색 포함 옵션을 사용할 수 없습니다.');
    if(new Set(look.Items.map(i=>i?.Slot)).size!==look.Items.length)fail('부위가 중복되었습니다.');
    for(const i of look.Items){
      if(!i||!integer(i.Id,1,99999999)||!slots.includes(i.Slot)||typeof i.Name!=='string'||!i.Name.trim()||i.Name.length>300)fail('아이템 정보를 확인하세요.');
      for(const [key,min,max]of [['Hue',-180,180],['Saturation',0,2],['Brightness',0,2]])if(!Number.isFinite(i[key])||i[key]<min||i[key]>max)fail('색상 변환 범위를 확인하세요.',{itemId:i.Id});
      if(!integer(i.MixPercent,0,100))fail('믹스 범위를 확인하세요.');
      if(i.MixId!=null&&(!integer(i.MixId,1,99999999)||!(i.Slot==='Hair'?Math.floor(i.Id/10)===Math.floor(i.MixId/10):i.Slot==='Face'&&Math.floor(i.Id/1000)===Math.floor(i.MixId/1000)&&i.Id%100===i.MixId%100)))fail('같은 헤어·성형의 색상만 믹스할 수 있습니다.');
      validatePrism(i.Prism);validatePrism(i.EffectPrism);
      const adjusted=i.Hue!==0||i.Saturation!==1||i.Brightness!==1||i.MixId!=null;
      if(i.Prism&&(['Hair','Face'].includes(i.Slot)||adjusted))fail('프리즘과 기존 색상 조정을 함께 적용할 수 없습니다.');
      if(i.EffectPrism&&(i.Slot!=='Cash'||adjusted))fail('이펙트 프리즘은 기본 캐시 무기에만 적용하세요.');
    }
  }
  const invisible=i=>({1002186:'Hat',1022079:'Eye Decoration',1032024:'Earrings',1072153:'Shoes',1082102:'Glove'})[i.Id]===i.Slot;
  const reveals=i=>({1042483:'Top',1062323:'Bottom',1054818:'Overall'})[i.Id]===i.Slot;
  const overallOnTop=i=>i.Slot==='Top'&&Math.floor(i.Id/10000)===105;
  function displayLook(input){
    const look=structuredClone(input);look.Items=look.Items.filter(i=>!invisible(i));
    let items=look.Items;
    if(items.some(reveals)){
      const overall=items.find(i=>i.Slot==='Overall'),both=items.some(i=>i.Slot==='Top')&&items.some(i=>i.Slot==='Bottom');
      if(overall&&!both){items=items.filter(i=>!['Top','Bottom'].includes(i.Slot));if(!reveals(overall))return {...look,Items:items};}
      if(overall&&both)items=items.filter(i=>i!==overall);
      if(items.some(overallOnTop))items=items.filter(i=>i.Slot!=='Bottom');
      for(const reveal of items.filter(reveals).sort((a,b)=>(a.Slot==='Top'?0:1)-(b.Slot==='Top'?0:1))){
        if(!items.includes(reveal))continue;
        if(reveal.Prism||reveal.Hue!==0||reveal.Saturation!==1||reveal.Brightness!==1||reveal.MixId!=null)fail('반투명 장비의 색상 조정은 지원하지 않습니다.',{itemId:reveal.Id});
        const eq=look.EquipmentAppearance?.find(s=>s.Slot===reveal.Slot);
        if(!eq?.Item||!['Matched','AppearanceMatched','Selected'].includes(eq.State)||reveals(eq.Item))fail('원래 장비 정보가 없습니다. 캐릭터를 다시 불러와 주세요.',{itemId:reveal.Id,slot:reveal.Slot});
        items=items.map(i=>i===reveal?eq.Item:i);if(overallOnTop(eq.Item))items=items.filter(i=>i.Slot!=='Bottom');
      }
    }
    if(items.some(overallOnTop))items=items.filter(i=>!['Bottom','Overall'].includes(i.Slot)).map(i=>overallOnTop(i)?{...i,Slot:'Overall'}:i);
    return {...look,Items:items};
  }
  function variants(look){
    let result=[{look,weight:1}];
    for(const item of look.Items.filter(i=>i.MixId!=null&&i.MixPercent>0)){
      const next=[];for(const v of result){
        const replace=id=>({...v.look,Items:v.look.Items.map(i=>i.Slot===item.Slot?{...i,Id:id,MixId:null,MixPercent:0}:i)});
        if(item.MixPercent<100)next.push({look:replace(item.Id),weight:Math.round(v.weight*(100-item.MixPercent)*10000)/1000000});
        next.push({look:replace(item.MixId),weight:Math.round(v.weight*item.MixPercent*10000)/1000000});
      }result=next;
    }return result;
  }
  async function prepareMix(vs,assets,decode){
    for(const slot of ['Hair','Face']){
      const items=vs.map(v=>v.look.Items.find(i=>i.Slot===slot));if(items.some(i=>!i))continue;
      const ids=[...new Set(items.map(i=>i.Id))];if(ids.length!==2)continue;
      const mix=vs.reduce((s,v,i)=>s+(items[i].Id===ids[1]?v.weight:0),0);if(mix<=0||mix>=1)continue;
      const first=structuredClone(assets.get(ids[0])),second=structuredClone(assets.get(ids[1]));second.id=ids[0];let images=0;
      const mixed=new Map();
      async function merge(a,b){
        if(a&&b&&typeof a==='object'&&typeof b==='object'){
          const keys=Object.keys(a);if(keys.length!==Object.keys(b).length||keys.some(k=>!Object.hasOwn(b,k)))return false;
          if(Object.hasOwn(a,'image')){
            if(a.textureFormat!=='ARGB4444'||b.textureFormat!=='ARGB4444'||typeof a.image!=='string'||typeof b.image!=='string')return false;
            const key=a.image+'|'+b.image;
            if(!mixed.has(key)){
              const x=await decode(a.image),y=await decode(b.image);if(x.width!==y.width||x.height!==y.height)return false;
              const data=new Uint8Array(x.data.length),f=Math.fround,base=f(Math.round((1-mix)*1000000)/1000000),ratio=f(mix);
              for(let i=0;i<data.length;i++){if(x.data[i]%17||y.data[i]%17)return false;data[i]=Math.floor(f(f(f(x.data[i]/17)*base)+f(f(y.data[i]/17)*ratio)))*17;}
              mixed.set(key,png.toBase64(await png.encode({...x,data})));
            }a.image=mixed.get(key);images++;
          }
          for(const key of keys)if(key!=='image'&&!await merge(a[key],b[key]))return false;return true;
        }return a===b;
      }
      if(!await merge(first,second)||!images)continue;
      const groups=new Map();for(const v of vs){const look={...v.look,Items:v.look.Items.map(i=>i.Slot===slot?{...i,Id:ids[0]}:i)},key=JSON.stringify(look);if(groups.has(key))groups.get(key).weight+=v.weight;else groups.set(key,{look,weight:v.weight});}
      assets.set(ids[0],first);vs=[...groups.values()];
    }return vs;
  }
  function point(p){if(!p||!integer(p.x,-2048,2048)||!integer(p.y,-2048,2048))fail('지원하지 않는 부위 기준점입니다.');return p;}
  async function compose(look,assets,body,head,order,slotMap,decode){
    const smap=new Map(slotMap.ordering.map(x=>[x.item1,x.item2.replaceAll('PnSo','Pn')]));
    const data=[body,head,...[...look.Items].sort((a,b)=>a.Id-b.Id).map(i=>assets.get(i.Id))];
    let emotion=null;for(const i of look.Items.filter(i=>i.Slot==='Face Accessory')){const a=assets.get(i.Id);if(typeof a.fixedEmotion==='string')emotion=a.fixedEmotion;else if(i.Id>=1012877&&i.Id<=1012901)fail('표정 장식 데이터 갱신이 필요합니다.',{itemId:i.Id});}
    const itemSlots=(i,k)=>(i.metaInfo?.[k]||[]).filter(s=>Math.floor(i.id/10000)!==104||s!=='Pn');
    const owners=new Map();for(const i of [...data].sort((a,b)=>order.indexOf(itemSlots(a,'islots')[0]||'')-order.indexOf(itemSlots(b,'islots')[0]||'')))for(const s of itemSlots(i,'vslots'))owners.set(s,i.id);
    const all=[],sprites=[];
    for(const item of data){const id=item.id;
      if(item.itemEffects!=null&&JSON.stringify(item.itemEffects)!=='{}')fail('이펙트가 있는 아이템은 아직 지원하지 않습니다.',{itemId:id});
      if(item.spriteEffects!=null){const ss=item.spriteEffects[look.Action];if(!ss)fail('효과 동작이 없습니다.',{itemId:id});if(ss.unsupported)fail(ss.unsupported,{itemId:id});if(!Array.isArray(ss))fail('효과 프레임 형식을 확인하세요.',{itemId:id});for(const s of ss)sprites.push({id,s});if(!item.frameBooks)continue;}
      let frame;
      if(id<20000)frame=item.effects;
      else {
        if(item.unsupportedActions?.[look.Action])fail(item.unsupportedActions[look.Action],{itemId:id,action:look.Action});
        if(emotion&&look.Items.some(i=>i.Id===id&&i.Slot==='Face')){frame=item.emotionFrames?.[emotion];if(!frame)fail('이 성형의 지정 표정 파츠가 없습니다.',{itemId:id});}
        else{frame=(item.frameBooks?.[look.Action]||item.frameBooks?.default)?.frames?.[0]?.effects;if(!frame)fail('이 아이템의 동작 데이터는 아직 지원하지 않습니다.',{itemId:id,action:look.Action});}
      }
      for(const [name,p]of Object.entries(frame||{})){
        if(p.image==null)continue;if(typeof p.image!=='string')fail('부위 이미지 형식을 확인하세요.',{itemId:id});
        const position=typeof p.position==='string'?p.position:name;let rank=order.indexOf(position);
        if(p.numericZ!=null){if(!integer(p.numericZ,-4096,4096))fail('숫자 겹침 순서 범위를 확인하세요.');rank=p.numericZ>=0?order.length+p.numericZ:p.numericZ-1;}
        else if(rank<0)fail('아직 확인되지 않은 겹침 순서입니다.',{itemId:id,position});
        const map=p.mapOffset||{};if(!Object.keys(map).length)fail('지원하지 않는 부위 기준점입니다.',{itemId:id});Object.values(map).forEach(point);
        all.push({id,name,position,group:item.equipGroup||'',slots:itemSlots(item,'vslots'),p,map,rank});
      }
    }
    if(!all.length||all.length>128)fail('부위 개수를 확인하세요.');
    const pairs=s=>s.match(/.{2}/g)||[];const visible=[];
    for(const p of all){const same=p.position.toLowerCase()===p.group.toLowerCase(),cap=p.group.toLowerCase()==='cap';let required=same&&!cap&&smap.has(p.name)?pairs(smap.get(p.name)):p.slots;
      const allowed=r=>r.every(s=>!owners.has(s)||owners.get(s)===p.id);
      if(!allowed(required)&&!same){if(smap.has(p.name))required=pairs(smap.get(p.name));if(Math.floor(p.id/10000)===104)required=required.filter(s=>s!=='Pn');}
      if(!allowed(required))continue;for(const s of required)if(!owners.has(s))owners.set(s,p.id);visible.push(p);
    }
    const anchors=new Map([['navel',{x:0,y:0}]]),remaining=[...all];
    while(remaining.length){const at=remaining.findIndex(p=>Object.keys(p.map).some(k=>anchors.has(k)));if(at<0)break;const p=remaining.splice(at,1)[0],key=Object.keys(p.map).find(k=>anchors.has(k)),origin=anchors.get(key);for(const [k,v]of Object.entries(p.map))if(!anchors.has(k))anchors.set(k,{x:origin.x-p.map[key].x+v.x,y:origin.y-p.map[key].y+v.y});}
    const layers=[];let count=0;
    async function layer(encoded,x,y,id,rank,effect){const image=await decode(encoded);count+=image.width*image.height;if(image.width>1024||image.height>1024||count>4000000||Math.abs(x)>2048||Math.abs(y)>2048)fail('이미지 범위가 너무 큽니다.');layers.push({image,x,y,id,rank,effect});}
    for(const p of [...visible].sort((a,b)=>a.rank-b.rank)){const key=Object.keys(p.map).find(k=>anchors.has(k));if(!key)fail('연결되지 않은 기준점입니다.');const o=p.p.origin?point(p.p.origin):{x:0,y:0},a=anchors.get(key);await layer(p.p.image,a.x-p.map[key].x-o.x,a.y-p.map[key].y-o.y,p.id,p.rank,false);}
    for(const i of look.Items.filter(i=>i.EffectPrism))if(!sprites.some(s=>s.id===i.Id))fail('이 무기의 이펙트 파츠는 현재 데이터에서 지원하지 않습니다.',{itemId:i.Id});
    if(sprites.length>16)fail('효과 파츠가 너무 많습니다.');
    if(sprites.length){const end=order.indexOf('characterEnd'),bp=all.find(p=>p.id===look.Skin&&['body','backBody'].includes(p.position)&&p.map.navel);if(end<0||!bp)fail('효과의 신체 기준점이 없습니다.');
      for(const {id,s}of sprites){const pos=s.pos??0;if(![0,1,2].includes(pos)||!integer(s.z,-16,16))fail('지원하지 않는 효과 상대 위치입니다.',{itemId:id});const a=pos===1?anchors.get('brow'):{x:-bp.map.navel.x,y:-bp.map.navel.y};if(!a)fail('효과의 눈썹 기준점이 없습니다.');const o=point(s.origin);await layer(s.image,a.x-o.x,a.y-o.y,id,s.z*end-1,true);}
    }
    if(!layers.length)fail('보이는 파츠가 없습니다.');
    const minX=Math.min(...layers.map(l=>l.x)),minY=Math.min(...layers.map(l=>l.y)),maxX=Math.max(...layers.map(l=>l.x+l.image.width)),maxY=Math.max(...layers.map(l=>l.y+l.image.height));
    const rw=maxX-minX+4,rh=maxY-minY+4,dx=(Math.trunc(rw/2)+minX)*2,dy=(Math.trunc(rh/2)+minY)*2,width=rw+Math.abs(dx),height=rh+Math.abs(dy);
    if(width>2048||height>2048)fail('미리보기 범위가 너무 큽니다.');
    const output=new Uint8Array(width*height*4);
    for(const l of layers.sort((a,b)=>a.rank-b.rank)){
      const source=new Uint8Array(l.image.data),color=look.Items.find(i=>i.Id===l.id),prism=l.effect&&color?.Slot==='Cash'?color.EffectPrism:color?.Prism;
      if((l.id===look.Skin||l.id===look.Skin+10000)&&look.SkinPrism)pixels.prism(source,look.SkinPrism,false);
      else if(prism)pixels.prism(source,prism,l.effect);else if(color)pixels.color(source,color.Hue,color.Saturation,color.Brightness,l.image.width);
      const left=l.x-minX+2+Math.max(dx,0),top=l.y-minY+2+Math.max(dy,0),w=l.image.width,h=l.image.height;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){const si=(y*w+x)*4,di=((top+y)*width+left+x)*4,a=source[si+3]/255,back=output[di+3]/255*(1-a),combined=a+back;if(!combined)continue;for(let c=0;c<3;c++)output[di+c]=Math.round((source[si+c]*a+output[di+c]*back)/combined);output[di+3]=Math.round(combined*255);}
    }
    if(look.FlipX)for(let y=0;y<height;y++)for(let x=0;x<Math.floor(width/2);x++)for(let c=0;c<4;c++){const a=(y*width+x)*4+c,b=(y*width+width-1-x)*4+c;[output[a],output[b]]=[output[b],output[a]];}
    return {width,height,data:output};
  }
  function blend(sources){
    if(sources.length===1)return sources[0].image;
    const width=Math.max(...sources.map(s=>s.image.width)),height=Math.max(...sources.map(s=>s.image.height));
    const layers=sources.map(({image,weight})=>{if((width-image.width)%2||(height-image.height)%2)fail('두 색상의 이미지 정렬이 달라 믹스할 수 없습니다.');const data=new Uint8Array(width*height*4),dx=(width-image.width)/2,dy=(height-image.height)/2;for(let y=0;y<image.height;y++)data.set(image.data.subarray(y*image.width*4,(y+1)*image.width*4),((y+dy)*width+dx)*4);return {data,weight:Math.round(weight*1000000)};});
    const data=new Uint8Array(width*height*4);for(let i=0;i<data.length;i+=4){const alpha=layers[0].data[i+3];if(layers.some(l=>l.data[i+3]!==alpha))fail('두 색상의 윤곽이 달라 정확히 겹칠 수 없습니다.');data[i+3]=alpha;for(let c=0;c<3;c++)data[i+c]=pixels.even(layers.reduce((s,l)=>s+l.data[i+c]*l.weight,0)/1000000);}return {width,height,data};
  }
  async function render(input,reader){
    const look={Action:'stand1',Ears:0,FlipX:false,...input,Items:input.Items?.map(i=>({Hue:0,Saturation:1,Brightness:1,MixId:null,MixPercent:0,...i}))};
    validate(look);const displayed=displayLook(look);validate(displayed);let vs=variants(displayed);
    const ids=[...new Set(vs.flatMap(v=>v.look.Items.map(i=>i.Id)))],assets=new Map();
    // Bounded sequential reads avoid a burst of dozens of decompressions per request.
    for(const id of ids){const p=await reader.part(id);if(p.id!==id)fail('요청한 아이템과 부위 데이터가 다릅니다.',{itemId:id});assets.set(id,p);}
    const body=await reader.body(look.Skin,look.Action),head=await reader.head(look.Skin,look.Ears),order=await reader.order(),smap=await reader.slots();
    if(body.id!==look.Skin||head.id!==look.Skin+10000)fail('피부 기본 자료가 일치하지 않습니다.');
    const cache=new Map();const decode=encoded=>{if(!cache.has(encoded))cache.set(encoded,png.decode(encoded));return cache.get(encoded);};
    vs=await prepareMix(vs,assets,decode);const sources=[];
    for(const v of vs)sources.push({image:await compose(v.look,assets,body,head,order,smap,decode),weight:v.weight});
    return pixels.normalize(blend(sources));
  }
  const api={render,validate,displayLook,variants,RenderError,version:'windows-static-v1'};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.DJ48CoordiLocalRenderer=api;
})(typeof window==='undefined'?globalThis:window);
