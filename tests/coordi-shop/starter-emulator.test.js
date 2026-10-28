'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
assert.match(process.env.FIRESTORE_EMULATOR_HOST||'',/^127\.0\.0\.1:\d+$/);
assert.equal(process.env.GCLOUD_PROJECT,'demo-dj48-rules');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {createService,catalog,version}=require(process.env.COORDI_COMMERCE_MODULE || '../../functions/coordi-shop/commerce');
class AppError extends Error {constructor(code,message){super(message);this.code=code;}}
(async()=>{
 initializeApp({projectId:'demo-dj48-rules'});const db=getFirestore();
 const id='starter-'+crypto.randomUUID();
 await db.doc('authLinks/'+id).set({memberUserId:id});
 await db.doc('userEconomy/'+id).set({djCoin:1000});
 await db.doc('appSettings/featureFlags').set({shopEnabled:true});
 const service=createService({db,FieldValue,ErrorType:AppError,authorize:async()=>({role:'student'})});
 const action=p=>service.act(id,{version,requestId:crypto.randomUUID(),...p});
 const status=()=>service.act(id,{action:'status'});
 assert.equal((await status()).purchaseCoupons,0);
 assert.equal((await db.doc('coordiProfiles/'+id).get()).exists,false);
 await db.doc('coordiProfiles/'+id).set({purchaseCoupons:10,purchaseCouponGrant:'manual-10-20261018',owned:[],prisms:{},look:{gender:'female',equipped:{}}});
 assert.equal((await status()).purchaseCoupons,10);
 const hairs=Object.values(catalog).filter(i=>i.category==='hair');
 const request={action:'purchase',items:[hairs[0].id],paymentMethod:'coupon',requestId:crypto.randomUUID()};
 const results=await Promise.all([action(request),action(request)]);
 assert.equal(results.filter(r=>r.duplicate).length,1);
 assert.equal((await status()).purchaseCoupons,9);assert.equal((await status()).balance,1000);
 assert.equal((await action({action:'purchase',items:[hairs[0].id],paymentMethod:'coupon'})).couponsUsed,0);
 const paid=await action({action:'purchase',items:[hairs[1].id],paymentMethod:'coin'});
 assert.equal(paid.cost,hairs[1].price);assert.equal(paid.purchaseCoupons,9);
 await assert.rejects(action({action:'purchase',items:[hairs[2].id],useStarter:true}),{code:'invalid-argument'});
 const before=await status();
 await assert.rejects(action({action:'purchase',items:[hairs[2].id,'invalid'],paymentMethod:'coupon'}),{code:'invalid-argument'});
 assert.deepEqual((await status()).profile,before.profile);
 // All dye changes are free, regardless of legacy starter entitlement.
 await db.doc('coordiProfiles/'+id).set({starterClaims:{hair:hairs[0].id}},{merge:true});
 const color=(hairs[0].code%10+1)%8;
 assert.equal((await action({action:'dye',itemId:hairs[0].id,value:{hairColor:color}})).cost,0);
 assert.equal((await action({action:'dye',itemId:hairs[1].id,value:{hairColor:(hairs[1].code%10+1)%8}})).cost,0);
 await db.doc('coordiProfiles/'+id).update({purchaseCoupons:1});
 const concurrent=await Promise.allSettled(hairs.slice(2,4).map(i=>action({action:'purchase',items:[i.id],paymentMethod:'coupon'})));
 assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await status()).purchaseCoupons,0);
 assert.equal((await status()).profile.purchaseCouponGrant,'manual-10-20261018');
 const notOwned=hairs.find(i=>!(concurrent.find(r=>r.status==='fulfilled').value.profile.owned).includes(i.id));
 const exhausted=await status();
 await assert.rejects(action({action:'purchase',items:[notOwned.id],paymentMethod:'coupon'}),{code:'failed-precondition'});
 assert.deepEqual((await status()).profile,exhausted.profile);
 // Legacy profiles without a stored coupon balance receive no implicit grant.
 await db.doc('coordiProfiles/'+id).set({owned:[hairs[0].id],starterClaims:{hair:hairs[0].id},prisms:{},look:{gender:'male',equipped:{}}});
 assert.equal((await status()).purchaseCoupons,0);
 assert((await status()).profile.owned.includes(hairs[0].id));
 await db.doc('userEconomy/'+id).set({djCoin:0});
 for(const hairColor of [1,2,3,0]) {
  const result=await action({action:'dye',itemId:hairs[0].id,value:{hairColor}});
  assert.equal(result.cost,0);assert.equal(result.balance,0);assert.equal(result.purchaseCoupons,0);
 }
 const detailed=await action({action:'dye',itemId:hairs[0].id,value:{hairColor:hairs[0].code%10,tone:45,chroma:35,brightness:-20}});
 assert.equal(detailed.cost,0);assert.equal(detailed.purchaseCoupons,0);
 assert.equal(detailed.profile.prisms[hairs[0].id].chroma,35);
 await assert.rejects(action({action:'dye',itemId:hairs[0].id,value:{hairColor:0,chroma:100}}),{code:'invalid-argument'});
 // Native hair mixing persists exact percentages without charging or altering other dyes.
 await action({action:'dye',itemId:'skin-12000',value:{tone:20}});
 const walletBefore=(await db.doc('userEconomy/'+id).get()).data();
 const mix={baseColor:0,mixColor:7,mixRate:63};
 const mixed=await action({action:'dye',itemId:hairs[0].id,value:mix});
 assert.deepEqual(mixed.profile.prisms[hairs[0].id],mix);
 assert.equal(mixed.profile.prisms['skin-12000'].tone,20);
 assert.equal(mixed.cost,0);assert.equal(mixed.purchaseCoupons,0);
 assert.deepEqual((await status()).profile.prisms[hairs[0].id],mix);
 assert.deepEqual((await db.doc('userEconomy/'+id).get()).data(),walletBefore);
 for(const value of [{...mix,baseColor:8},{...mix,mixColor:-1},{...mix,mixRate:100},{...mix,mixRate:101},{...mix,mixRate:0.5},{...mix,mixRate:'50'},{baseColor:0,mixRate:50}]) {
  await assert.rejects(action({action:'dye',itemId:hairs[0].id,value}),{code:'invalid-argument'});
 }
 assert.deepEqual((await status()).profile.prisms[hairs[0].id],mix);
 await assert.rejects(action({action:'dye',itemId:hairs[1].id,value:mix}),{code:'failed-precondition'});
 const original=hairs[0].code%10;
 for(const value of [{baseColor:original,mixColor:7,mixRate:0},{baseColor:original,mixColor:original,mixRate:37}]) {
  assert.equal((await action({action:'dye',itemId:hairs[0].id,value})).profile.prisms[hairs[0].id],undefined);
 }
 const restored=await action({action:'dye',itemId:hairs[0].id,value:{hairColor:hairs[0].code%10}});
 assert.equal(restored.profile.prisms[hairs[0].id],undefined);
 await assert.rejects(action({action:'dye',itemId:hairs[1].id,value:{hairColor:1}}),{code:'failed-precondition'});
 await db.doc('appSettings/featureFlags').set({shopEnabled:false});
 await assert.rejects(status(),{code:'failed-precondition'});
 console.log('PASS manual coupons only: coin/coupon choice, dedup, no refill, owned item exclusion, concurrent exhaustion, rollback, legacy dye/ownership preservation.');
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
