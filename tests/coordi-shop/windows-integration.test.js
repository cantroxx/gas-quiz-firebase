'use strict';
// Optional integration corpus: pass an independently verified Windows bundle.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
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
 const cases=JSON.parse(fs.readFileSync(path.join(process.argv[2],'reference/cases/results.json'))).cases;
 const femaleCase=cases.find(c=>c.id==='unsupported-current-female-hair');assert(femaleCase,'Female baseline fixture required');
 const female={...town,gender:1,itemCode:{skin:12000,face:21000,hair:31000},itemPrism:{}};
 if(femaleCase.status==='rendered'){
   const primary=JSON.parse(fs.readFileSync(path.join(process.argv[2],'tools/windows-request-cases.json'))).primary;
   for(const row of primary.filter(r=>r.productId!=='hair-31000')){
     const expected=cases.find(c=>c.id==='primary-'+row.productId);assert(expected);
     if(expected.status==='expected-rejection')await assert.rejects(render(row.request),e=>e.message===expected.error);
     else {const result=await render(row.request),im=await png.decode(result.imageUrl.split(',')[1]);assert.equal(crypto.createHash('sha256').update(im.data).digest('hex'),expected.rgbaSha256,row.productId);}
   }
   for(const [id,prism] of [['primary-female-31000',{}],['primary-female-31000-skin-prism',{skin:{palette:0,tone:359,chroma:20,brightness:58}}]]){
     const expected=cases.find(c=>c.id===id);assert.equal(expected?.status,'rendered');
     const result=await render({...female,itemPrism:prism}),im=await png.decode(result.imageUrl.split(',')[1]);
     assert.equal(crypto.createHash('sha256').update(im.data).digest('hex'),expected.rgbaSha256,id);
     assert.equal(im.width,expected.width);assert.equal(im.height,expected.height);
     assert.equal(result.sourceSnapshot,(await require('../../functions/coordi-shop/local-renderer/reader').createBundleReader(process.argv[2]).manifest()).sourceSnapshot);
   }
 }else await assert.rejects(render(female),e=>e.message===femaleCase.error);

 const legacy=await render({...town,itemPrism:{hair:{tone:20,chroma:10,brightness:-5}}});assert(legacy.imageUrl.startsWith('data:image/png;base64,'));assert.equal(legacy.renderer,'quiztown-hair-prism');assert(legacy.includesEffects);
 console.log('PASS Windows integration: shop/town/classroom identical native mix PNG, shared cache, original saved profile unchanged, female baseline follows its versioned fixture without substitution, legacy HSL compatibility.');
})().catch(e=>{console.error(e);process.exitCode=1;});
