'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright-core');
(async()=>{
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try{
    const context=await browser.newContext();
    const origin='https://dj48-quiztown-firebase.web.app',errors=[];
    // Only fetch public Hosting files. No production Auth/Firestore/Functions calls.
    await context.route('**/*',r=>{
      const url=new URL(r.request().url());
      if(url.origin!==origin||!['GET','HEAD'].includes(r.request().method()))return r.abort();
      return r.continue();
    });
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/?town-ui-release='+Date.now(),{waitUntil:'domcontentloaded'});
    await page.locator('#member-link-submit-button').waitFor({state:'visible'});
    assert.equal(await page.locator('link[href="/town-ui-refresh.css?v=20261018"]').count(),1);
    assert.equal(await page.locator('#event-season-toggle').count(),0);
    assert(await page.locator('#dj48-player-status-shortcut').isHidden());
    assert((await page.locator('#login-view').evaluate(el=>getComputedStyle(el).backgroundImage)).includes('login-village-v1.webp'));
    await page.evaluate(()=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=reject;img.src='/images/town-ui-20261018/login-village-v1.webp';}));
    fs.mkdirSync('/tmp/town-ui-release/live-review',{recursive:true});
    for(const width of [1440,390,320]){
      await page.setViewportSize({width,height:1000});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:`/tmp/town-ui-release/live-review/login-${width}.png`,fullPage:true});
    }
    assert.deepEqual(errors,[]);
    console.log('PASS deployed public login: live CSS/image, retired season entry absent, hidden status at login, 1440/390/320, no page errors. Production backend requests blocked.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
