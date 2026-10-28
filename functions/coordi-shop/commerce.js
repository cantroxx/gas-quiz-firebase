'use strict';
const crypto=require('node:crypto'),catalog=require('./catalog.json');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const version=hash('hair-mix-v5|'+JSON.stringify(catalog)).slice(0,16);
function purchaseCoupons(profile={}) {
 const value=profile.purchaseCoupons;
 return Number.isInteger(value)&&value>=0 ? value : 0;
}
function starterCoupons(profile={}) {
 return {items:[],dyeItems:Object.values(profile.starterClaims||{}).filter(id=>catalog[id]?.category!=='face'&&!profile.starterDyes?.[id])};
}
function normalizeHairDye(value) {
 // Keep old clients/saved HSL dyes readable; new saves use the native mix schema.
 if(value && ['baseColor','mixColor','mixRate'].some(key=>key in value)) {
  for(const [key,max] of [['baseColor',7],['mixColor',7],['mixRate',99]]) {
   if(!Number.isInteger(value[key])||value[key]<0||value[key]>max) throw Error('헤어 믹스 색상과 비율을 확인해 주세요.');
  }
  return {baseColor:value.baseColor,mixColor:value.mixColor,mixRate:value.mixRate};
 }
 if(!Number.isInteger(value?.hairColor)||value.hairColor<0||value.hairColor>7) throw Error('헤어 색상을 확인해 주세요.');
 return {...normalizePrism(value),hairColor:value.hairColor};
}
function normalizePrism(v){if(!v||typeof v!=='object')throw Error('염색 값을 확인해 주세요.');const result={};for(const [key,min,max] of [['palette',0,6],['tone',0,359],['chroma',-99,99],['brightness',-99,99],['blackInclusive',0,1]]){const n=v[key]??0;if(!Number.isInteger(n)||n<min||n>max)throw Error('염색 범위를 확인해 주세요.');result[key]=n;}return result;}
function createService({db,FieldValue,ErrorType,authorize}){
 const fail=(code,message)=>{throw new ErrorType(code,message);};
 async function authorizePreview(uid){
 if(!uid)fail('unauthenticated','로그인이 필요해요.');
 return db.runTransaction(async tx=>{
 const link=(await tx.get(db.collection('authLinks').doc(uid))).data();
 if(!link?.memberUserId)fail('permission-denied','회원 연결을 확인해 주세요.');
 const [member,flags]=await Promise.all([authorize(tx,link.memberUserId,uid),tx.get(db.doc('appSettings/featureFlags'))]);
 if(flags.data()?.shopEnabled===false&&member.role!=='admin')fail('failed-precondition','상점은 지금 쉬고 있어요.');
 });
 }
 async function act(uid,p={}){
 if(!uid)fail('unauthenticated','로그인이 필요해요.');if(JSON.stringify(p).length>10000)fail('invalid-argument','요청이 너무 커요.');
 return db.runTransaction(async tx=>{
 const link=(await tx.get(db.collection('authLinks').doc(uid))).data();if(!link?.memberUserId)fail('permission-denied','회원 연결을 확인해 주세요.');const id=link.memberUserId,member=await authorize(tx,id,uid);
 const wallet=db.collection('userEconomy').doc(id),profileRef=db.collection('coordiProfiles').doc(id);
 const [flags,ws,ps]=await Promise.all([tx.get(db.doc('appSettings/featureFlags')),tx.get(wallet),tx.get(profileRef)]);
 if(flags.data()?.shopEnabled===false&&member.role!=='admin')fail('failed-precondition','상점은 지금 쉬고 있어요.');
 const balance=Number(ws.data()?.djCoin??ws.data()?.coin??0),profile=ps.data()||{owned:[],prisms:{},look:{gender:'female',equipped:{}}};
 if(p.action==='status')return {balance,profile,prices:catalog,version,purchaseCoupons:purchaseCoupons(profile),starterCoupons:starterCoupons(profile)};
 if(!['purchase','equip','dye'].includes(p.action))fail('invalid-argument','지원하지 않는 요청이에요.');
 if(typeof p.requestId!=='string'||!/^[-a-f0-9]{36}$/.test(p.requestId))fail('invalid-argument','요청 번호가 필요해요.');
 const receipt=db.collection('coordiReceipts').doc(hash(id+'|'+p.requestId)),rs=await tx.get(receipt),fingerprint=hash(JSON.stringify(p));
 if(rs.exists){if(rs.data().fingerprint!==fingerprint)fail('invalid-argument','이미 사용한 요청 번호예요.');return {...rs.data().result,duplicate:true};}
 if(p.version!==version)fail('failed-precondition','상품 가격이 바뀌었어요. 새로고침해 주세요.');
 let cost=0,couponsUsed=0;const owned=new Set(profile.owned||[]),next=JSON.parse(JSON.stringify(profile));
 next.purchaseCoupons=purchaseCoupons(profile);
 if(p.action==='purchase'){
 if(!['coin','coupon'].includes(p.paymentMethod))fail('invalid-argument','코인 또는 쿠폰 결제를 선택해 주세요.');
 if(!Array.isArray(p.items)||!p.items.length||p.items.length>15||new Set(p.items).size!==p.items.length)fail('invalid-argument','상품을 확인해 주세요.');
 for(const itemId of p.items){const item=catalog[itemId];if(!item)fail('invalid-argument','판매하지 않는 상품이에요.');if(!owned.has(itemId)){
 if(p.paymentMethod==='coupon') couponsUsed++; else cost+=item.price;
 owned.add(itemId);}}
 if(couponsUsed>next.purchaseCoupons)fail('failed-precondition','구매 쿠폰이 부족해요. 코인 결제를 선택하거나 상품 수를 줄여 주세요.');
 next.purchaseCoupons-=couponsUsed;
 next.owned=[...owned];
 }else if(p.action==='equip'){
 if(!['male','female'].includes(p.gender)||!p.equipped||typeof p.equipped!=='object'||Array.isArray(p.equipped))fail('invalid-argument','코디를 확인해 주세요.');
 const equipped={};for(const [slot,itemId]of Object.entries(p.equipped)){const item=catalog[itemId];if(!item||item.category!==slot||!owned.has(itemId)||!item.genders.includes(p.gender))fail('failed-precondition','구매한 아이템만 장착할 수 있어요.');equipped[slot]=itemId;}
 if(equipped.overall&&(equipped.top||equipped.bottom))fail('invalid-argument','한벌옷과 상하의는 함께 입을 수 없어요.');
 next.look={gender:p.gender,equipped};
 }else{
 const item=catalog[p.itemId];if(p.itemId!=='skin-12000'&&(!item||!owned.has(p.itemId)||item.category==='face'))fail('failed-precondition','구매한 의상이나 기본 피부를 선택해 주세요.');
 let value;try{value=item?.category==='hair'?normalizeHairDye(p.value):normalizePrism(p.value);}catch(e){fail('invalid-argument',e.message);}
 if(p.itemId==='skin-12000'||item?.category==='skin')value.blackInclusive=0;
 const originalColor=Number(item?.code)%10;
 const zero=Number.isInteger(value.baseColor)
  ? (value.mixRate===0||value.baseColor===value.mixColor)&&value.baseColor===originalColor
  : (!value.tone&&!value.chroma&&!value.brightness)&&(item?.category!=='hair'||value.hairColor===originalColor);
 // All owned-item dye changes and restoration are free.
 next.prisms=next.prisms||{};if(zero)delete next.prisms[p.itemId];else next.prisms[p.itemId]=value;
 }
 if(!Number.isFinite(balance)||balance<cost)fail('failed-precondition','DJ코인이 부족해요.');
 const result={success:true,duplicate:false,cost,couponsUsed,purchaseCoupons:next.purchaseCoupons,balance:balance-cost,profile:next,version,starterCoupons:starterCoupons(next)};
 if(cost)tx.set(wallet,{userId:id,djCoin:balance-cost,totalSpent:FieldValue.increment(cost),updatedAt:FieldValue.serverTimestamp()},{merge:true});
 tx.set(profileRef,{...next,memberUserId:id,updatedAt:FieldValue.serverTimestamp()});
 tx.create(receipt,{memberUserId:id,action:p.action,fingerprint,result,createdAt:FieldValue.serverTimestamp()});
 return result;
 });}
 return {act,authorizePreview};
}
module.exports={createService,normalizePrism,catalog,version};
