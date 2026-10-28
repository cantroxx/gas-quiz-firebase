'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright-core');
const catalog=require('../../functions/coordi-shop/catalog.json');
const candidate=require('./town-ui-candidate-fixture');
(async()=>{const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});try{
 const context=await browser.newContext({viewport:{width:1200,height:900}}),calls=[];
 let variantImages=[];
 let profile={owned:[],prisms:{},look:{gender:'female',equipped:{}}},balance=1000,failRender=false;
 const image='data:image/png;base64,'+fs.readFileSync('public/coordi-shop/verified/female-42740.png').toString('base64');
 await context.route('**/*',async route=>{const u=new URL(route.request().url());
 if(u.pathname==='/fixture/call'){const {name,p}=JSON.parse(route.request().postData());calls.push({name,p});let data;
 if(name==='renderCoordiShopPreview')data=failRender?{success:false,message:'이미지 연결 실패'}:{success:true,...(process.env.COORDI_HASHLESS_PREVIEW==='1'?{}:{hash:'FIXTURE'}),imageUrl:variantImages[Number(p.look.itemCode.hair)%8]||image};else if(p.action==='status')data={balance,profile,prices:catalog,version:'test'};else{
 if(p.action==='purchase'){for(const id of p.items){balance-=catalog[id].price;profile.owned.push(id);}}
 if(p.action==='equip')profile.look={gender:p.gender,equipped:p.equipped};
 if(p.action==='dye'){const zero=Number.isInteger(p.value.baseColor)?((p.value.mixRate===0||p.value.baseColor===p.value.mixColor)&&p.value.baseColor===catalog[p.itemId].code%10):!p.value.tone&&!p.value.chroma&&!p.value.brightness;if(zero)delete profile.prisms[p.itemId];else{profile.prisms[p.itemId]=p.value;}}
 data={success:true,profile,balance,cost:0,version:'test'};}
 return route.fulfill({contentType:'application/json',body:JSON.stringify({data})});}
 if(u.pathname==='/fixture')return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><script>window.avatarRefreshes=0;window.DJ48TownAvatar={refresh:async force=>{if(force)avatarRefreshes++;}};window.DJ48AccountState={getCurrentMemberUserId:()=> 'fixture'};window.DJ48Firebase={getFirebaseFunctions:()=>({httpsCallable:name=>async p=>await (await fetch('/fixture/call',{method:'POST',body:JSON.stringify({name,p})})).json()})};</script><iframe title="상점" src="/coordi-shop/?mode=${u.searchParams.get('mode')==='dressroom'?'dressroom':'shop'}" style="width:100%;height:860px"></iframe>`});
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
 if(u.origin!=='https://shop.test')return route.abort();
 const relative=u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname;
 if(!fs.existsSync(path.resolve('public','.'+relative)))return route.fulfill({status:404,body:''});
 const file=await candidate.file(relative);if(!fs.existsSync(file))return route.fulfill({status:404,body:''});return route.fulfill({path:file,contentType:file.endsWith('.js')?'application/javascript; charset=utf-8':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html; charset=utf-8'});
 });
 const page=await context.newPage();variantImages=await page.evaluate(()=>Array.from({length:8},(_,i)=>{const c=document.createElement('canvas');c.width=3;c.height=1;const x=c.getContext('2d');x.fillStyle=`hsl(${i*45},60%,40%)`;x.fillRect(0,0,1,1);x.fillStyle='#f0b48c';x.fillRect(1,0,1,1);x.fillStyle='#335588';x.fillRect(2,0,1,1);return c.toDataURL();}));page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.stack));page.on('dialog',d=>d.accept());await page.goto('https://shop.test/fixture');const frame=page.frameLocator('iframe[title="상점"]');await frame.locator('#coordi-wallet').filter({hasText:'1,000'}).waitFor();
 await frame.locator('[data-set-gender="female"]').click();
 for(const name of ['운명의 인도자 헤어','비캐시 테스트','미확인 캐시 테스트']) assert.equal(await frame.locator('#item-grid').getByText(name,{exact:true}).count(),0);
 const verified=require('../../public/coordi-shop/data/verified-top50.json');
 for(const gender of ['female','male']) {
   if(gender==='male'){await frame.locator('#change-gender').click();await frame.locator('[data-set-gender="male"]').click();}
   for(const [category, genders] of Object.entries(verified.itemsByCategoryGender)) {
     if(category==='shield') { assert.equal(await frame.locator('#category-tabs [data-category="shield"]').count(),0); continue; }
     await frame.locator(`[data-category="${category}"]`).first().click();
     const ids=[];
     do {
       ids.push(...await frame.locator('#item-grid button').evaluateAll(nodes=>nodes.map(n=>n.dataset.item)));
       if(await frame.locator('#coordi-page-next').isDisabled())break;
       await frame.locator('#coordi-page-next').click();
     } while(true);
     assert.deepEqual(ids,genders[gender].map(i=>`${i.category}-${i.code}`),`${category}/${gender} display order`);
     assert.equal(await frame.locator('#item-grid .item-label').count(),0);
   }
   await frame.locator('#category-tabs [data-category="transparent"]').click();
   assert.equal(await frame.locator('#item-grid button').count(),8);
   assert.equal(await frame.locator('#item-grid [data-category="shield"]').count(),0);
   await frame.locator('#item-grid [data-item="weapon-1703129"]').click();
   assert.equal(await frame.locator('#item-grid [data-item="weapon-1703129"]').getAttribute('aria-pressed'),'true');
   await frame.locator('#reset-button').click();
 }
 await page.setViewportSize({width:390,height:844});await frame.locator('[data-category="hat"]').first().click();await page.screenshot({path:'/tmp/coordi-label-mobile.png',fullPage:true});
 await page.setViewportSize({width:1200,height:900});await frame.locator('#change-gender').click();await frame.locator('[data-set-gender="female"]').click();await frame.locator('[data-category="hair"]').first().click();
 const previousOfficialImage=await frame.locator('#character-image').getAttribute('src');
 failRender=true;
 await frame.locator('#item-grid [data-item="hair-67680"]').click();
 await frame.locator('#retry-coordi-preview').waitFor({state:'visible'});
 const failedImage=await frame.locator('#character-image').getAttribute('src');
 assert(!failedImage || failedImage===previousOfficialImage, 'A failed render may retain the previous official preview, but must never substitute a GMS image');
 failRender=false;
 await frame.locator('#retry-coordi-preview').click();
 await frame.locator('#official-look-status').filter({hasText:'미리보기 반영됨'}).waitFor();
 assert(calls.filter(c=>c.name==='renderCoordiShopPreview').at(-1).p.look.itemCode.hair===67680);
 assert(await frame.locator('#character-image').evaluate(i=>!i.hidden&&i.naturalWidth>0));
 await frame.locator('#item-grid button').first().click();await frame.locator('#coordi-buy').click();await frame.locator('#coordi-wallet').filter({hasText:'850'}).waitFor();assert.match(await frame.locator('#coordi-saved-outfit').innerText(),/입어보기 중/);assert.match(await frame.locator('#coordi-commerce-status').innerText(),/내 코디로 장착/);await frame.locator('#coordi-equip').click();await frame.locator('#coordi-commerce-status').filter({hasText:'저장'}).waitFor();assert.equal(profile.owned.length,1);assert.equal(Object.keys(profile.look.equipped).length,1);assert.equal(await page.evaluate(()=>avatarRefreshes),1,'Saving outfit refreshes map immediately');assert.match(await frame.locator('#coordi-saved-outfit').innerText(),/마을에 적용된 코디/);
 await page.reload();await frame.locator('#coordi-wallet').filter({hasText:'850'}).waitFor();assert.equal(await frame.locator('#item-grid .is-equipped').count(),1);await frame.locator('#official-look-status').filter({hasText:'미리보기 반영됨'}).waitFor();assert(await frame.locator('#character-image').evaluate(i=>i.naturalWidth>0));
 await frame.locator('#coordi-owned-only').check();assert.equal(await frame.locator('#item-grid button').count(),1);
 await frame.locator('#reset-button').click();
 await frame.locator('#prism-open').click();
 const hairId=profile.owned[0];
 await frame.locator('#prism-target').selectOption(hairId);
 await frame.locator('dialog[open] #character-image').waitFor({state:'visible'});
 assert(await frame.locator('#prism-chroma').isHidden());
 assert(await frame.locator('#prism-tone').isHidden());
 assert(await frame.locator('#prism-brightness').isHidden());
 assert.equal(await frame.locator('#hair-dye-color option').count(),8);
 assert.equal(await frame.locator('#hair-mix-color option').count(),8);
 await frame.locator('#hair-dye-color').selectOption('0');
 await frame.locator('#hair-mix-color').selectOption('7');
 await frame.locator('#hair-mix-rate').fill('63');
 assert.equal(await frame.locator('#hair-mix-percent').inputValue(),'63');
 assert.equal(await frame.locator('#hair-mix-summary').innerText(),'검정 37% · 갈색 63%');
 await frame.locator('#prism-apply').click();
 await frame.locator('#prism-status').filter({hasText:'염색을 저장했어요'}).waitFor();
 assert.deepEqual(profile.prisms[hairId],{baseColor:0,mixColor:7,mixRate:63});assert.equal(balance,850);
 assert.deepEqual(calls.filter(c=>c.name==='renderCoordiShopPreview').at(-1).p.look.itemPrism.hair,{baseColor:0,mixColor:7,mixRate:63});
 await frame.locator('#hair-mix-percent').fill('27');
 await frame.locator('#prism-status').filter({hasText:'미리보기 반영됨'}).waitFor();
 assert.equal(await frame.locator('#hair-mix-rate').inputValue(),'27');
 assert.equal(profile.prisms[hairId].mixRate,63,'Preview must not save');
 await frame.locator('#prism-cancel').click();
 assert.equal(await frame.locator('#hair-mix-rate').inputValue(),'63');
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'/tmp/coordi-prism-mobile.png',fullPage:true});
 await page.setViewportSize({width:1200,height:900});
 await page.screenshot({path:'/tmp/coordi-prism-desktop.png',fullPage:true});
 await frame.locator('#prism-close').click();
 await page.reload();await frame.locator('#coordi-wallet').filter({hasText:'850'}).waitFor();
 await frame.locator('#prism-open').click();await frame.locator('#prism-target').selectOption(hairId);
 assert.equal(await frame.locator('#hair-mix-rate').inputValue(),'63');
 assert.equal(await frame.locator('#hair-mix-color').inputValue(),'7');
 await frame.locator('#prism-restore').click();await frame.locator('#prism-status').filter({hasText:'원래 색으로 복원'}).waitFor();
 assert.equal(profile.prisms[hairId],undefined);assert.equal(balance,850);
 await frame.locator('#prism-close').click();
 profile.prisms[hairId]={hairColor:0,tone:20,chroma:10,brightness:-5};
 await page.reload();await frame.locator('#coordi-wallet').filter({hasText:'850'}).waitFor();
 await frame.locator('#prism-open').click();await frame.locator('#prism-target').selectOption(hairId);
 assert(await frame.locator('#hair-legacy-note').isVisible());
 await frame.locator('#prism-status').filter({hasText:'보유 아이템 염색'}).waitFor();
 assert.deepEqual(profile.prisms[hairId],{hairColor:0,tone:20,chroma:10,brightness:-5});
 await frame.locator('#hair-mix-rate').fill('50');await frame.locator('#prism-apply').click();
 await frame.locator('#prism-status').filter({hasText:'염색을 저장했어요'}).waitFor();
 assert.deepEqual(profile.prisms[hairId],{baseColor:0,mixColor:7,mixRate:50});
 assert(await frame.locator('#hair-legacy-note').isHidden());
 await frame.locator('#prism-close').click();await frame.locator('#reset-button').click();
 await frame.locator('#slot-list').filter({hasText:'아직 착용한 아이템이 없어요'}).waitFor();
 await frame.locator('#prism-open').click();await frame.locator('#prism-target').selectOption(await frame.locator('#prism-target option[value^="skin-"]').first().getAttribute('value'));
 await frame.locator('#prism-brightness').evaluate(el=>{el.value='-20';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await frame.locator('#prism-apply').click();await frame.locator('#coordi-wallet').filter({hasText:'850'}).waitFor();assert.equal(profile.prisms['skin-12000'].brightness,-20);
 await page.reload();await frame.locator('#coordi-wallet').filter({hasText:'850'}).waitFor();await frame.locator('#prism-open').click();await frame.locator('#prism-target').selectOption(await frame.locator('#prism-target option[value^="skin-"]').first().getAttribute('value'));assert.equal(await frame.locator('#prism-brightness').inputValue(),'-20');
 assert(calls.some(c=>c.p.action==='purchase'&&typeof c.p.requestId==='string'&&!('price'in c.p)));assert.deepEqual(errors,[]);await frame.locator('#official-look-status').filter({hasText:'미리보기 반영됨'}).waitFor();assert(await frame.locator('#character-image').evaluate(i=>i.naturalWidth>0&&!i.hidden));await page.screenshot({path:'/tmp/coordi-commerce.png',fullPage:true});const beforeDressroom=JSON.stringify({profile,balance}), mutationsBefore=calls.filter(c=>['purchase','equip','dye'].includes(c.p.action)).length;
 await page.goto('https://shop.test/fixture?mode=dressroom');await frame.locator('#coordi-wallet').filter({hasText:'850'}).waitFor();
 assert(await frame.locator('#dressroom-notice').isVisible());
 for(const id of ['coordi-buy','coordi-equip','prism-apply','prism-restore'])assert(await frame.locator('#'+id).isHidden());
 await frame.locator('#random-button').click();await frame.locator('[data-category="hat"]').first().click();await frame.locator('#item-grid button').first().click();
 await frame.locator('#prism-open').click();await frame.locator('#prism-target').selectOption(await frame.locator('#prism-target option[value^="skin-"]').first().getAttribute('value'));
 await frame.locator('#prism-brightness').evaluate(el=>{el.value='30';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await frame.locator('#prism-status').filter({hasText:'코인은 사용되지 않았어요'}).waitFor();
 for(const id of ['coordi-buy','coordi-equip','prism-apply','prism-restore'])await frame.locator('#'+id).dispatchEvent('click');
 assert.equal(calls.filter(c=>['purchase','equip','dye'].includes(c.p.action)).length,mutationsBefore);assert.equal(JSON.stringify({profile,balance}),beforeDressroom);
 await frame.locator('#prism-close').click();
 const triedOn=await frame.locator('#slot-list').innerText();
 await frame.locator('[data-coordi-mode="shop"]').click();assert(await frame.locator('#coordi-buy').isVisible());assert.equal(await frame.locator('#slot-list').innerText(),triedOn);
 await frame.locator('[data-coordi-mode="dressroom"]').click();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/coordi-dressroom-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);assert.equal(JSON.stringify({profile,balance}),beforeDressroom);
 console.log('PASS free dressroom: unowned try-on, random outfit, dye preview, zero transactions, shop handoff preserves outfit, mobile.');
 console.log('PASS commerce UI: selected item purchase, wallet refresh, equip save, owned filter, free skin dye and restore, owned look restore, server-price request, no script errors');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
