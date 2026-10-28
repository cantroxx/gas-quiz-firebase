'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright-core');
const catalog=require('../../functions/coordi-shop/catalog.json');
const candidate=require('./town-ui-candidate-fixture');
(async()=>{const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});try{
 const context=await browser.newContext({viewport:{width:1200,height:900}}),calls=[];
 let profile={owned:[],prisms:{},look:{gender:'female',equipped:{}}},balance=1000,coupons=20,failRender=false;
 const image='data:image/png;base64,'+fs.readFileSync('public/coordi-shop/verified/female-42740.png').toString('base64');
 await context.route('**/*',async route=>{const u=new URL(route.request().url());
 if(u.pathname==='/fixture/call'){const {name,p}=JSON.parse(route.request().postData());calls.push({name,p});let data;
 if(name==='renderCoordiShopPreview')data=failRender?{success:false,message:'이미지 연결 실패'}:{success:true,hash:'FIXTURE',imageUrl:image};else if(p.action==='status')data={balance,profile,prices:catalog,version:'test',purchaseCoupons:coupons};else{
 if(p.action==='purchase'){for(const id of p.items){if(p.paymentMethod==='coupon')coupons--;else balance-=catalog[id].price;profile.owned.push(id);}}
 if(p.action==='equip')profile.look={gender:p.gender,equipped:p.equipped};
 if(p.action==='dye'){const zero=!p.value.tone&&!p.value.chroma&&!p.value.brightness;if(zero)delete profile.prisms[p.itemId];else{balance-=50;profile.prisms[p.itemId]=p.value;}}
 data={success:true,profile,balance,purchaseCoupons:coupons,couponsUsed:p.paymentMethod==='coupon'?p.items.length:0,cost:p.action==='dye'?50:0,version:'test'};}
 return route.fulfill({contentType:'application/json',body:JSON.stringify({data})});}
 if(u.pathname==='/fixture')return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><script>window.DJ48AccountState={getCurrentMemberUserId:()=> 'fixture'};window.DJ48Firebase={getFirebaseFunctions:()=>({httpsCallable:name=>async p=>await (await fetch('/fixture/call',{method:'POST',body:JSON.stringify({name,p})})).json()})};</script><iframe title="상점" src="/coordi-shop/?mode=${u.searchParams.get('mode')==='dressroom'?'dressroom':'shop'}" style="width:100%;height:860px"></iframe>`});
 if(['/coordi-shop/data/verified-top50.json','/coordi-shop/data/verified-top50-display.json'].includes(u.pathname)) {
   const stale=JSON.parse(fs.readFileSync('public/coordi-shop/data/verified-top50.json','utf8'));
   // Simulate an old cached catalog so reviewed rewards/low-usage items cannot reappear in the UI.
   for(const item of stale.selectionExcluded) stale.itemsByCategoryGender[item.category]?.[item.listGender]?.push(item);
   for(const gender of ['male','female']) stale.itemsByCategoryGender.hair[gender].unshift(
     {code:42740,name:'운명의 인도자 헤어',category:'hair',cash:true},
     {code:30030,name:'비캐시 테스트',category:'hair',cash:false},
     {code:999,name:'미확인 캐시 테스트',category:'hair',cash:'false'}
   );
   return route.fulfill({contentType:'application/json',body:JSON.stringify(stale)});
 }
 const file=await candidate.file(u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname);if(!fs.existsSync(file))return route.fulfill({status:404,body:''});return route.fulfill({path:file,contentType:file.endsWith('.js')?'application/javascript; charset=utf-8':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'text/html; charset=utf-8'});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto('https://shop.test/fixture');const frame=page.frameLocator('iframe[title="상점"]');
 await frame.locator('#starter-coupons').filter({hasText:'20장'}).waitFor();
 await frame.locator('[data-set-gender="female"]').click();
 await frame.locator('#item-grid button').first().click();
 assert.equal(await frame.locator('#outfit-total').innerText(),'150 DJ코인');
 await frame.locator('#coordi-buy-coupon').click();await frame.locator('#starter-coupons').filter({hasText:'19장'}).waitFor();
 assert.equal(balance,1000);assert.equal(profile.owned.length,1);
 if(process.env.COORDI_UI_REVIEW_DIR){fs.mkdirSync(process.env.COORDI_UI_REVIEW_DIR,{recursive:true});await page.frames().find(f=>f.url().includes('/coordi-shop/')).waitForFunction(()=>{const img=document.getElementById('character-image');return img.complete&&img.naturalWidth>0;});await page.screenshot({path:path.join(process.env.COORDI_UI_REVIEW_DIR,'shop-1200.png'),fullPage:true});}
 await frame.locator('#item-grid button').nth(1).click();await frame.locator('#coordi-buy').click();
 await frame.locator('#coordi-wallet').filter({hasText:'850'}).waitFor();assert.equal(coupons,19);
 assert(calls.some(c=>c.p.paymentMethod==='coin'));assert(calls.some(c=>c.p.paymentMethod==='coupon'));
 await frame.locator('[data-coordi-mode="dressroom"]').click();assert(await frame.locator('#coordi-buy-coupon').isHidden());
 await frame.locator('[data-coordi-mode="shop"]').click();
 coupons=0;balance=0;await page.reload();await frame.locator('#starter-coupons').filter({hasText:'0장'}).waitFor();
 await frame.locator('#item-grid button').nth(2).click();const before=calls.filter(c=>c.p.action==='purchase').length;
 await frame.locator('#coordi-buy-coupon').click();await frame.locator('#coordi-commerce-status').filter({hasText:'부족'}).waitFor();
 assert.equal(calls.filter(c=>c.p.action==='purchase').length,before);
 await frame.locator('#coordi-wallet').filter({hasText:'보유 0 DJ코인'}).waitFor();
 // Coin insufficiency is enforced by the server, outside this presentation fixture.
 await page.setViewportSize({width:390,height:844});assert(await frame.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if(process.env.COORDI_UI_REVIEW_DIR){await page.frames().find(f=>f.url().includes('/coordi-shop/')).waitForFunction(()=>{const img=document.getElementById('character-image');return img.complete&&img.naturalWidth>0;});await page.screenshot({path:path.join(process.env.COORDI_UI_REVIEW_DIR,'shop-zero-390.png')});}
 await page.setViewportSize({width:320,height:844});assert(await frame.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log('PASS 20 coupon UI: coin/coupon choices, exact quote, remaining count, free preview mode, insufficient coupon protection, mobile.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
