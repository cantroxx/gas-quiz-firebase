#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const context=await browser.newContext(),page=await context.newPage(),errors=[],blocked=[];
  // Fresh, signed-out browser. Fetch the real deployed static files; never sign in or mutate data.
  await context.route('**/*',route=>{
   const request=route.request();if(!['GET','HEAD'].includes(request.method())){blocked.push(new URL(request.url()).hostname);return route.fulfill({status:401,contentType:'application/json',body:'{"error":{"status":"UNAUTHENTICATED","message":"Read-only deployment verification"}}'});}
   return route.continue();
  });page.on('pageerror',e=>errors.push(e.message));
  const origin='https://dj48-quiztown-firebase.web.app';
  for(const width of [1360,390]){
   await page.setViewportSize({width,height:900});await page.goto(origin+'/?release=20261028',{waitUntil:'domcontentloaded'});
   await page.locator('#login-view').waitFor({state:'visible'});await page.locator('#member-link-form').waitFor({state:'visible'});
   await page.waitForFunction(()=>window.DJ48Format&&window.DJ48AccountState&&window.DJ48ClassroomController);
   assert(await page.evaluate(()=>document.querySelector('script[src*="app.bundle.js"]').src.includes('workspace-20261028')));
   await page.screenshot({path:'/tmp/quiztown-release-live-'+width+'.png',fullPage:true});
  }
  await page.goto(origin+'/coordi-shop/?release=20261028',{waitUntil:'domcontentloaded'});await page.getByText('퀴즈타운에 로그인한 뒤 상점에서 열어주세요.').waitFor();
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,liveStatic:true,viewportWidths:[1360,390],loginGuard:true,pageErrors:0,backendRequestsSent:0,blockedBackends:[...new Set(blocked)]}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
