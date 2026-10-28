#!/usr/bin/env node
'use strict';
// Read-only anonymous production smoke: no login, callable mutation or student fixture.
const assert=require('node:assert/strict'),{chromium}=require('playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let securitiesCalls=0;page.on('request',r=>{if(/classroomSecurities(Query|Action|AdminAction)/.test(r.url()))securitiesCalls++;});
  await page.goto('https://dj48-quiztown-firebase.web.app/?securitiesReleaseCheck=20261018',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>typeof window.DJ48Securities?.configure==='function');
  assert.equal(await page.locator('#classroom-securities-panel').count(),1);
  assert.equal(await page.locator('[data-classroom-tab="securities"]').getAttribute('hidden'),'');
  assert.equal(await page.evaluate(()=>typeof window.DJ48Securities.configure),'function');
  assert.equal(await page.evaluate(()=>window.DJ48Securities.isEnabled()),false);
  assert.equal(securitiesCalls,0,'No securities reads or writes before classroom entry');assert.deepEqual(errors,[]);
  console.log('PASS anonymous live shell: securities module/DOM loaded, scoped tab hidden, zero securities requests, no JavaScript errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
