'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright-core');
(async()=>{
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try{
    const context=await browser.newContext(),origin='https://dj48-quiztown-firebase.web.app';
    await context.route('**/*',route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.origin!==origin || !['GET','HEAD'].includes(request.method())) return route.abort();
      return route.continue();
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/?spatial-release='+Date.now(),{waitUntil:'domcontentloaded'});
    await page.locator('#member-link-submit-button').waitFor({state:'visible'});
    await page.waitForFunction(()=>document.documentElement.dataset.spatialReady==='true');
    assert.equal(await page.locator('.spatial-room-ready').count(),4);
    assert.equal(await page.locator('script[src="/js/town-spatial.js?v=20261018"]').count(),1);
    assert.equal(await page.locator('link[href="/town-spatial.css?v=20261018"]').count(),1);
    assert((await page.locator('#login-view').evaluate(el=>getComputedStyle(el).backgroundImage)).includes('entrance-v1.webp'));
    assert.equal(await page.locator('#event-season-toggle').count(),0);
    assert(await page.locator('#dj48-player-status-shortcut').isHidden());
    await page.evaluate(()=>Promise.all(['town','home','shop','event','ranking','school','entrance','guide'].map(name=>new Promise((resolve,reject)=>{
      const img=new Image();img.onload=()=>resolve();img.onerror=()=>reject(new Error(name+' image failed'));img.src='/images/town-spatial-20261018/'+name+'-v1.webp';
    }))));
    fs.mkdirSync('/tmp/town-spatial-release/live-review',{recursive:true});
    for(const width of [1440,390,320]){
      await page.setViewportSize({width,height:1000});
      await page.evaluate(()=>document.fonts.ready);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      const height=await page.evaluate(()=>Math.max(1000,document.documentElement.scrollHeight));
      await page.setViewportSize({width,height});
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      await page.screenshot({path:'/tmp/town-spatial-release/live-review/login-'+width+'.png'});
    }
    assert.deepEqual(errors,[]);
    console.log('PASS live public login at 1440/390/320, spatial module/4 rooms initialized, 8 graphics loaded, no page errors. Production backend blocked.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
