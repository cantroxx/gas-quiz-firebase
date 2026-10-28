'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright-core');
(async()=>{
 let server;
 const origin=process.env.COORDI_LOCAL_ORIGIN||await new Promise((resolve,reject)=>{
  assert(process.env.COORDI_BUNDLE_ROOT,'Set COORDI_BUNDLE_ROOT for an isolated memory server');
  server=require('node:child_process').spawn(process.execPath,['scripts/smoke/serve-coordi-shop.js'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
  server.once('error',reject);server.once('exit',code=>reject(Error('Preview server exit '+code)));
  server.stdout.on('data',chunk=>{const match=String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);if(match)resolve(match[0]);});
 });assert.match(origin,/^http:\/\/127\.0\.0\.1:\d+$/);
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1360,height:1000}}),calls=[],outside=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin){outside.push(u.href);return route.abort();}if(u.pathname==='/preview-call')calls.push(JSON.parse(route.request().postData()));return route.continue();});
  await page.goto(origin);const f=page.frameLocator('iframe');await f.locator('#coordi-wallet').filter({hasText:'10,000'}).waitFor();
  await f.locator('[data-set-gender="female"]').click();await f.locator('#official-look-status').filter({hasText:'31000'}).waitFor();
  await f.locator('#change-gender').click();await f.locator('[data-set-gender="male"]').click();
  const ready=()=>f.locator('#official-look-status').filter({hasText:'미리보기 반영됨'}).waitFor();await ready();
  await f.locator('.coordi-tools-details summary').click();await f.locator('[data-draft="pin-A"]').click();
  await f.locator('#item-grid [data-item="hair-66940"]').click();await ready();await f.locator('[data-draft="pin-B"]').click();
  assert.equal(await f.locator('#coordi-compare img').count(),2);
  const before=calls.filter(c=>['purchase','equip','dye'].includes(c.p.action)).length;
  await f.locator('[data-draft="restore-A"]').click();await ready();
  await f.locator('[data-draft="undo"]').click();await ready();
  await f.locator('[data-draft="redo"]').click();await ready();
  await f.locator('[data-draft="restore-B"]').click();await ready();
  assert.equal(calls.filter(c=>['purchase','equip','dye'].includes(c.p.action)).length,before);
  await f.locator('[data-draft="large"]').click();assert(await f.locator('.coordi-large-preview img').isVisible());await f.locator('.coordi-large-preview button').filter({hasText:'3배'}).click();await f.locator('.coordi-large-preview button').filter({hasText:'닫기'}).click();
  await f.locator('#coordi-buy').click();await f.locator('#coordi-wallet').filter({hasText:'9,850'}).waitFor();await f.locator('#coordi-equip').click();await f.locator('#coordi-commerce-status').filter({hasText:'저장'}).waitFor();
  assert(await f.locator('#item-grid [data-item="hair-66940"]').getAttribute('class').then(x=>x.includes('is-saved')));
  await f.locator('#item-grid .is-item-icon').first().waitFor();
  await f.locator('#prism-open').click();await f.locator('#prism-target').selectOption('hair-66940');await f.locator('#hair-mix-color').selectOption('7');await f.locator('#hair-mix-percent').fill('63');
  await f.locator('#prism-status').filter({hasText:'미리보기 반영됨'}).waitFor();await f.locator('#prism-apply').click();await f.locator('#prism-status').filter({hasText:'염색을 저장했어요'}).waitFor();await f.locator('#prism-close').click();await ready();
  await f.locator('[data-draft="restore-B"]').click();await ready();assert.match(await f.locator('#coordi-saved-outfit').innerText(),/염색이 저장된 색과 달라요/);
  await f.locator('[data-draft="saved"]').click();await ready();
  const lastImage=await f.locator('#character-image').getAttribute('src');
  await f.locator('#category-tabs [data-category="cape"]').click();await f.locator('#item-search').fill('1103862');await f.locator('#item-grid [data-item="cape-1103862"]').click();await f.locator('#official-look-status').filter({hasText:'1103862'}).waitFor();
  assert.equal(await f.locator('#character-image').getAttribute('src'),lastImage,'Unsupported item retains previous actual image');
  assert(await f.locator('#slot-list').innerText().then(x=>x.includes('망토')),'Unsupported selection remains visible, never silently substituted');
  await f.locator('[data-draft="saved"]').click();await ready();
  assert(await f.locator('#character-effects').isHidden(),'Local PNG includes effects; no second overlay');
  await page.screenshot({path:'/tmp/coordi-windows-shop-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert(await f.locator('body').evaluate(b=>b.scrollWidth<=innerWidth+1));assert(await f.locator('.stage-frame').evaluate(el=>el.clientWidth>=300),'Mobile preview must not collapse into a cropped narrow column');await page.screenshot({path:'/tmp/coordi-windows-shop-mobile.png',fullPage:true});
  await f.locator('[data-coordi-mode="dressroom"]').click();assert(await f.locator('#coordi-buy').isHidden());
  assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);
  console.log('PASS local Windows shop: explicit female failure, original image retained, icons, A/B/undo zero transactions, large view, original purchase/equip/dye, effects once, mobile and free dressroom; no external requests.');
 }finally{await browser.close();server?.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
