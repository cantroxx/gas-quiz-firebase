#!/usr/bin/env node
'use strict';
// Load the published public shell in a fresh browser; block all backend traffic.
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
(async()=>{
  const origin='https://dj48-quiztown-firebase.web.app';
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],badStatic=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{if(response.url().startsWith(origin)&&response.status()>=400)badStatic.push({url:response.url(),status:response.status()});});
    await page.route('**/*',route=>{
      const req=route.request(),url=new URL(req.url());
      if(url.origin===origin&&req.method()==='GET'&&!url.pathname.startsWith('/__/auth/'))return route.continue();
      return route.abort();
    });
    await page.goto(origin+'/?classroom-diary-verify='+Date.now(),{waitUntil:'domcontentloaded'});
    await page.locator('#member-link-form').waitFor({state:'visible'});
    await page.waitForFunction(()=>window.DJ48ClassroomDiary&&window.DJ48ClassroomCardHome&&window.DJ48QuizCatalog);
    assert.deepEqual(await page.evaluate(()=>({diary:typeof DJ48ClassroomDiary.open,card:typeof DJ48ClassroomCardHome.render,portrait:typeof DJ48ClassroomPortrait.setAvatarImageSource})),{diary:'function',card:'function',portrait:'function'});
    assert.equal(await page.locator('link[href*="classroom-diary.css"]').count(),1);
    assert.equal(await page.locator('[data-classroom-diary="friends"].classroom-diary-nav').count(),1);
    assert.deepEqual(errors,[]);assert.deepEqual(badStatic,[]);
    console.log('PASS published public shell: login form, new card/diary/portrait modules, diary CSS/navigation, no page errors or failed static assets; all backend requests blocked.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
