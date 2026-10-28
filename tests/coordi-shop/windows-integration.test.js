'use strict';
// Optional integration corpus: pass an independently verified Windows bundle.
const assert=require('node:assert/strict');
const {createLocalProvider}=require('../../functions/coordi-shop/local-provider');
const {createCoordiPreviewService}=require('../../functions/coordi-shop/service');
const {savedLookPayload}=require('../../public/js/town-avatar');
const portrait=require('../../functions/classroom/portrait');
const catalog=require('../../functions/coordi-shop/catalog.json');
const {createRenderer}=require('../../public/coordi-shop/preview-renderer');
const hair=require('../../public/coordi-shop/hair-prism'),png=require('../../functions/coordi-shop/local-renderer/png');
class AppError extends Error{constructor(code,message){super(message);this.code=code;}}
(async()=>{
 assert(process.argv[2],'Pass bundle root');const provider=await createLocalProvider({bundleRoot:process.argv[2]});let calls=0;
 const counted={...provider,render:async p=>{calls++;return provider.render(p);}};
 const service=createCoordiPreviewService({provider:counted,ErrorType:AppError,authorize:async uid=>{if(uid!=='synthetic')throw new AppError('permission-denied','closed');}});
 const render=createRenderer({render:look=>service('synthetic',{look}),loadHair:async()=>({...hair,decode:u=>png.decode(u.split(',')[1]),encode:async im=>'data:image/png;base64,'+png.toBase64(await png.encode(im))})});
 const profile={owned:['hair-66940'],look:{gender:'male',equipped:{hair:'hair-66940'}},prisms:{'hair-66940':{baseColor:0,mixColor:7,mixRate:63}}};
 const original=JSON.stringify(profile),town=savedLookPayload(profile,catalog),classroom=portrait.savedLookPayload(profile);assert.deepEqual(town,classroom);
 const shop={...town,itemCode:{...town.itemCode,cap:null,pants:null},itemPrism:{...town.itemPrism}};
 const results=await Promise.all([render(shop),render(town),render(classroom)]);
 assert.equal(new Set(results.map(r=>r.imageUrl)).size,1);assert.equal(calls,1);assert.equal(results[0].includesEffects,true);
 assert.equal(JSON.stringify(profile),original);
 await assert.rejects(service('wrong',{look:town}),{code:'permission-denied'});
 await assert.rejects(render({...town,itemCode:{skin:12000,face:21000,hair:31000},itemPrism:{}}),/그림자/);
 const legacy=await render({...town,itemPrism:{hair:{tone:20,chroma:10,brightness:-5}}});assert(legacy.imageUrl.startsWith('data:image/png;base64,'));assert.equal(legacy.renderer,'quiztown-hair-prism');assert(legacy.includesEffects);
 console.log('PASS Windows integration: shop/town/classroom identical native mix PNG, shared cache, original saved profile unchanged, failed default not substituted, legacy HSL compatibility.');
})().catch(e=>{console.error(e);process.exitCode=1;});
