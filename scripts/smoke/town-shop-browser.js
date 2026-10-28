const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require('playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!=='http://localhost:5332')return route.fulfill({body:''});if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:fs.readFileSync('public/index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')});return fs.existsSync('public'+url.pathname)?route.fulfill({path:'public'+url.pathname}):route.fulfill({status:404,body:''});});
 await page.goto('http://localhost:5332/');await page.addScriptTag({path:'public/js/app.bundle.js'});
 await page.evaluate(()=>{
 document.querySelectorAll('.app-view').forEach(el=>el.hidden=el.id!=='shop-view');
 window.coins={djCoin:65};window.member='fixture-a';window.tab='all';window.purchases=[];window.applied=[];
 window.items=[{itemId:'star',name:'별 키링',category:'아바타',price:140,icon:'⭐',desc:'반짝이는 별을 프로필에 달아요.',avatarLayer:true,avatarSlot:'keyring'}, {itemId:'forest',name:'숲속 배경',category:'배경',price:100,icon:'🌲',desc:'마을 수첩에 초록빛을 더해요.'}, {itemId:'cat',name:'고양이 아바타',category:'아바타',price:50,icon:'🐱',desc:'내 프로필에 작은 친구가 찾아와요.'}];
 window.render=()=>{
 DJ48ShopRender.renderShopTabs(DJ48ShopData.getShopTabDefinitions(),tab);
 DJ48ShopRender.renderShopWallet(coins,{currentMemberUserId:member});
 DJ48ShopRender.renderAvatarPreview(items,{}, {},new Set(['forest']));
 DJ48ShopRender.renderShopItems(DJ48ShopData.filterShopItemsByTab(DJ48ShopData.withShopShowcase(items),tab),{},coins,new Set(['forest']),{currentMemberUserId:member,applyOwnedItem:async id=>applied.push(id)});
 };
 DJ48ShopController.bindShopRoomEvents({setActiveShopTab:value=>tab=value,renderShop:render,purchaseShopItem:id=>purchases.push(id)});render();
 });
 const shop=page.locator('#shop-view');const card=name=>shop.locator('.shop-item-card').filter({has:page.getByRole('heading',{name,exact:true})});
 assert.equal(await shop.locator('.shop-item-card').count(),8);
 await card('별 키링').getByText('미리보기',{exact:true}).click();assert.match(await shop.locator('#shop-avatar-preview').innerText(),/75코인 더/);
 await card('별 키링').getByRole('button',{name:'별 키링 찜하기'}).click();assert.equal(await card('별 키링').getByRole('button',{name:'별 키링 찜하기'}).getAttribute('aria-pressed'),'true');
 await card('고양이 아바타').getByRole('button',{name:'구매하기'}).click();assert.deepEqual(await page.evaluate(()=>purchases),['cat']);
 await card('숲속 배경').getByRole('button',{name:'내 집에 적용 / 해제'}).click();assert.deepEqual(await page.evaluate(()=>applied),['forest']);assert.deepEqual(await page.evaluate(()=>purchases),['cat']);
 await shop.getByRole('button',{name:'📒 수집 도감',exact:true}).click();assert.equal(await shop.locator('.shop-item-card').count(),3);
 assert.equal(await shop.getByRole('button',{name:'준비중',exact:true}).count(),3);assert.equal(await shop.getByRole('button',{name:'준비중',exact:true}).first().isDisabled(),true);
 await card('숲속 여우 스티커').getByText('미리보기',{exact:true}).click();assert.match(await shop.locator('#shop-avatar-preview').innerText(),/아직 구매하거나 적용할 수 없어요/);
 await shop.screenshot({path:'docs/product/town-shop-review/collection-desktop.png'});
 await shop.getByRole('button',{name:'🏡 내 집 테마',exact:true}).click();await card('바닷속 수첩').getByText('미리보기',{exact:true}).click();assert.equal(await shop.locator('.treasure-preview').getAttribute('data-theme'),'ocean');
 await shop.getByRole('button',{name:'모든 보물',exact:true}).click();await shop.screenshot({path:'docs/product/town-shop-review/shop-desktop.png'});
 await page.evaluate(()=>{member='fixture-b';render();});assert.equal(await card('별 키링').getByRole('button',{name:'별 키링 찜하기'}).getAttribute('aria-pressed'),'false');
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shop.screenshot({path:'docs/product/town-shop-review/shop-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS shop tabs, preview, coin gap, account-scoped wishes, purchase dispatch, owned apply, draft lock and mobile layout (synthetic data).');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
