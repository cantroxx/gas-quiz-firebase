const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true });
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1040}});
    const page=await context.newPage();
    const errors=[], backend=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(/firestore|identitytoolkit|cloudfunctions|firebaseio/.test(request.url()))backend.push(request.url());});
    await page.goto('http://127.0.0.1:5328/town-preview/',{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('#map-art').evaluate(img=>img.complete&&img.naturalWidth>0),true);
    await page.screenshot({path:'/tmp/town-preview-desktop.png',fullPage:true});
    await page.click('[data-style="b"]');await page.waitForFunction(()=>document.querySelector('#map-art').src.endsWith('village-b.png')&&document.querySelector('#map-art').complete);
    await page.screenshot({path:'/tmp/town-preview-style-b.png',fullPage:true});
    await page.click('[data-style="a"]');
    await page.click('.hotspot.school');await page.waitForSelector('#destination-view:not([hidden])');
    await page.click('[data-answer="wrong"]');assert.match(await page.locator('.feedback').innerText(),/한 번 더/);
    await page.click('[data-answer="correct"]');assert.equal(await page.locator('#coins').innerText(),'140');
    await page.screenshot({path:'/tmp/town-preview-school.png',fullPage:true});
    await page.click('.quick-nav [data-destination="shop"]');await page.waitForSelector('[data-buy="plant"]');
    await page.click('[data-buy="plant"]');assert.equal(await page.locator('#coins').innerText(),'110');assert.equal(await page.locator('#bag-count').innerText(),'1');
    assert.equal(await page.locator('[data-buy="plant"]').isDisabled(),true);
    await page.click('.quick-nav [data-destination="home"]');await page.waitForSelector('[data-place-item="plant"]');await page.click('[data-place-item="plant"]');
    assert.equal(await page.locator('.room-shelf span').count(),1);assert.match(await page.locator('#visit-summary').innerText(),/3 \/ 3/);
    await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.room-shelf span').count(),1);assert.equal(await page.locator('#coins').innerText(),'110');
    await page.click('#back-button');await page.waitForSelector('#village-view:not([hidden])');
    await page.click('.hotspot.school');await page.waitForSelector('[data-answer="correct"]');assert.equal(await page.locator('#coins').innerText(),'110');assert.equal(await page.locator('[data-answer="correct"]').isDisabled(),true);
    await page.click('#back-button');
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.querySelector('#map-viewport').scrollLeft=180);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.equal(await page.locator('#map-viewport').isVisible(),true);
    assert.equal(await page.locator('#map-viewport').evaluate(el=>el.scrollWidth>el.clientWidth),true);
    await page.screenshot({path:'/tmp/town-preview-mobile.png',fullPage:true});
    await page.emulateMedia({reducedMotion:'reduce'});await page.click('.quick-nav [data-destination="shop"]');await page.waitForSelector('[data-buy="books"]');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:'/tmp/town-preview-mobile-shop.png',fullPage:true});
    assert.deepEqual(errors,[]);assert.deepEqual(backend,[]);
    console.log('Village preview passed: both generated maps, 3 destinations, quiz reward once, purchase, placement, persistence, mobile pan/no overflow, reduced motion, no page errors or Firebase requests.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
