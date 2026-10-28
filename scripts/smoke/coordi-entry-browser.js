'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright-core');
(async()=>{const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});try{
 const page=await browser.newPage();
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>fixture</title>'}));
 await page.goto('https://shop.test/entry');await page.setContent('<section id="shop-view"><div id="shop-category-list"></div><div id="shop-wallet"></div><div id="shop-avatar-market"></div><div class="shop-avatar-layout"><div id="shop-avatar-preview"></div><div id="shop-item-grid"></div></div></section>');
 await page.addScriptTag({content:fs.readFileSync(process.env.COORDI_ENTRY_SCRIPT||'public/js/features/shop-render.js','utf8')});
 const render=async(open,admin)=>page.evaluate(({open,admin})=>window.DJ48ShopRender.renderAvatarMarket({shopEnabled:open},{isAdminMember:()=>admin}),{open,admin});
 await render(false,false);assert(await page.locator('#shop-avatar-market').isHidden());
 assert.equal(await page.locator('#shop-category-list, #shop-wallet, .shop-avatar-layout, #shop-avatar-preview, #shop-item-grid').count(),0);
 await page.evaluate(()=>{window.DJ48ShopRender.renderShopWallet();window.DJ48ShopRender.renderShopItems();window.DJ48ShopRender.renderAvatarPreview();window.DJ48ShopRender.renderShopTabs();});
 await render(true,false);assert.equal(await page.locator('iframe').getAttribute('src'),'/coordi-shop/?mode=shop&v=hair-pixels-20261002');
 await render(true,false);assert.equal(await page.locator('iframe').count(),1);
 await render(false,false);assert.equal(await page.locator('iframe').count(),0);
 await render(false,true);assert.equal(await page.locator('iframe').getAttribute('src'),'/coordi-shop/?mode=shop&v=hair-pixels-20261002');
 console.log('PASS entry: open shop directly opens Maple cosmetics; closed shop removes iframe; admin preview retained.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
