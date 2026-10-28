'use strict';
const assert=require('node:assert/strict');
const {maskFor,recolor,createRenderer}=require('../../public/coordi-shop/hair-prism');
(async()=>{
 const base=new Uint8ClampedArray([90,50,30,255,240,180,140,255,50,90,140,255,0,0,0,0]);
 const alternate=new Uint8ClampedArray(base);alternate.set([30,80,170,255]);
 const mask=maskFor(base,[alternate]);assert.deepEqual([...mask],[1,0,0,0]);
 for(const value of [{tone:180},{chroma:70},{brightness:40},{brightness:-50}]){
  const image=recolor(base,mask,value);assert.notDeepEqual(image.slice(0,3),base.slice(0,3));assert.deepEqual(image.slice(4),base.slice(4));assert.equal(image[3],255);
 }
 assert.deepEqual(recolor(base,mask,{}),base);
 assert.deepEqual(recolor(base,mask,{palette:5,tone:90}),base);
 let calls=0;const render=createRenderer(async p=>{calls++;return {success:true,hash:'X',imageUrl:String(p.itemCode.hair)};},async url=>({width:4,height:1,data:url==='31000'?base:alternate}),async image=>JSON.stringify([...image.data]));
 const p={itemCode:{hair:31000},itemPrism:{hair:{chroma:40}}};
 const first=await render(p);const second=await render({...p,itemPrism:{hair:{brightness:40}}});assert.notEqual(first.imageUrl,second.imageUrl);assert.equal(calls,3,'slider changes reuse color mask');
 await render({...p,itemCode:{hair:31010}}).then(()=>assert.fail(),e=>assert.match(e.message,/색상 영역/));
 const restored=await render({...p,itemPrism:{}});assert.equal(restored.imageUrl,'31000');
 console.log('PASS hair pixels: tone/chroma/brightness, face/clothes/alpha unchanged, palette, cache, missing mask and original restore');
})().catch(e=>{console.error(e);process.exitCode=1;});

// Native mixing bypasses the old HSL mask, retaining its exact upstream schema.
(async()=>{
 const {savedLookPayload}=require('../../public/js/town-avatar');
 const portrait=require('../../functions/classroom/portrait');
 const catalog=require('../../functions/coordi-shop/catalog.json');
 const {normalizeMapleOfficialCoordiPayload}=require('../../functions/coordi-shop/render.cjs');
 const item=Object.values(catalog).find(i=>i.category==='hair'&&i.genders.includes('female'));
 const mix={baseColor:4,mixColor:7,mixRate:63};
 const profile={owned:[item.id],look:{gender:'female',equipped:{hair:item.id}},prisms:{[item.id]:mix}};
 const payload=savedLookPayload(profile,catalog);
 assert.deepEqual(payload,portrait.savedLookPayload(profile));
 assert.deepEqual(payload.itemPrism.hair,mix);
 assert.deepEqual(normalizeMapleOfficialCoordiPayload(payload).itemPrism.hair,mix);
 let sent;
 const render=createRenderer(async p=>{sent=p;return {success:true,imageUrl:'native'};},()=>assert.fail('Native mix must not decode/recolor pixels'),()=>assert.fail());
 assert.equal((await render(payload)).imageUrl,'native');assert.deepEqual(sent.itemPrism.hair,mix);
 console.log('PASS native mix: town/classroom saved outfit parity, exact schema forwarded, no HSL approximation');
})().catch(e=>{console.error(e);process.exitCode=1;});
