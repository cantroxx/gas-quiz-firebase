#!/usr/bin/env node
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright-core');
const {response}=require('./serve-securities-preview');
const ORIGIN='http://127.0.0.1:4177';
async function run(){
 const browser=await chromium.launch({executablePath:process.env.SMOKE_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];let fixtures=0,failFixture=false,fixtureGate=null;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin!==ORIGIN)return route.abort();
  if(url.pathname==='/js/data/securities-fixture.js'){fixtures++;if(failFixture)return route.abort();if(fixtureGate)await fixtureGate;}
  const r=response(url.href);return route.fulfill({status:r.status||200,body:r.body,contentType:r.type||'text/plain'});
 });
 await page.goto(`${ORIGIN}/securities-preview.html?securitiesPreview=1`);
 assert.equal(fixtures,0,'no fixture request on classroom entry');
 await page.locator('[data-classroom-tab="securities"]').click();
 await page.locator('[data-sec-action="open"]').waitFor();assert.equal(fixtures,1);
 assert.equal(await page.evaluate(()=>DJ48SecuritiesState.get().account),null,'query cannot create account');
 assert.equal(await page.locator('#sec-company-grid article').count(),12);
 await page.locator('#sec-search').fill('로봇');assert.equal(await page.locator('#sec-company-grid article').count(),1);
 await page.locator('#sec-search').fill('없는기업');assert.match(await page.locator('#sec-company-grid').innerText(),/찾는 회사가 없어요/);
 await page.locator('#sec-search').fill('');
 await page.locator('[data-sec-action="open"]').click();
 await page.locator('[data-company="sprout_food"]').click();
 await page.locator('[data-sec-action="buy"]').click();await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.secAction),'buy');
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-sec-action="buy"]').click();
 assert.equal(await page.evaluate(()=>document.querySelector('.sec-dialog').scrollWidth > document.querySelector('.sec-dialog').clientWidth),false,'mobile order has no overflow');
 await page.locator('.sec-dialog [name="reason"]').fill('짧음');await page.locator('.sec-dialog [type="submit"]').click();
 assert.match(await page.locator('#sec-order-error').innerText(),/10~200/);
 await page.locator('.sec-dialog [name="reason"]').fill('곡물 가격과 판매량을 함께 생각해서 골랐어요');
 await page.locator('.sec-dialog [type="submit"]').click();assert.equal(await page.evaluate(()=>DJ48SecuritiesState.get().account.cashMinor),100000);
 await page.locator('.sec-dialog [type="submit"]').click();assert.equal(await page.evaluate(()=>DJ48SecuritiesState.get().account.cashMinor),98995);
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('[data-section="journal"]').click();await page.locator('[data-reflection]').fill('다음에는 판매량도 확인할래요');await page.locator('[data-sec-action="reflect"]').click();
 assert.equal(await page.evaluate(()=>DJ48SecuritiesState.get().journal[0].reflection),'다음에는 판매량도 확인할래요');
 await page.locator('[data-classroom-tab="bank"]').click();await page.locator('[data-classroom-tab="securities"]').click();assert.equal(fixtures,1,'return uses memory');
 await page.locator('[data-section="market"]').click();
 const output=process.env.SECURITIES_SCREENSHOT_DIR;
 if(output)fs.mkdirSync(output,{recursive:true});
 for(const teacher of [false,true]){
  await page.locator('#preview-role').selectOption(teacher?'teacher':'student');
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:1000});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${teacher} ${width}`);
   assert.equal(await page.locator('[data-classroom-tab="securities"]:visible').count(),1);
   if(output)await page.screenshot({path:path.join(output,`${teacher?'teacher':'student'}-${width}.png`),fullPage:true});
  }
 }
 await page.locator('#classroom-securities-panel > details').first().locator('summary').click();
 await page.locator('#sec-admin-reason').fill('함께 뉴스 읽기');await page.locator('[data-sec-action="pause"]').click();
 assert.match(await page.locator('.sec-session').innerText(),/잠시 멈췄어요/);
 await page.locator('#classroom-securities-panel > details').first().locator('summary').click();
 await page.locator('#sec-admin-reason').fill('토론 마무리');await page.locator('[data-sec-action="pause"]').click();
 await page.locator('#classroom-securities-panel > details').first().locator('summary').click();
 await page.locator('#sec-news-form [name="title"]').fill('<img src=x onerror=alert(1)>');await page.locator('#sec-news-form [name="body"]').fill('뉴스를 함께 검토해요');await page.locator('#sec-news-form [type="submit"]').click();
 assert.equal(await page.locator('#sec-content img').count(),0,'teacher content escaped');
 for(const session of ['holiday','error','closed','preopen']){
  await page.locator('#preview-session').selectOption(session);await page.locator('[data-section="market"]').click();await page.locator('[data-company="sprout_food"]').click();assert.equal(await page.locator('[data-sec-action="buy"]').isDisabled(),true);
 }
 await page.locator('#preview-role').selectOption('student');await page.locator('#preview-reset').click();
 assert.equal(await page.evaluate(()=>DJ48SecuritiesState.get().account),null);assert.equal(await page.evaluate(()=>DJ48SecuritiesState.get().journal.length),0);
 await page.reload();assert.equal(await page.locator('[data-sec-action="open"]').count(),0,'reload clears state and stays on market');
 failFixture=true;await page.locator('[data-classroom-tab="securities"]').click();await page.locator('[data-sec-action="retry"]').waitFor();
 failFixture=false;await page.locator('[data-sec-action="retry"]').click();await page.locator('[data-sec-action="open"]').waitFor();
 let releaseFixture;fixtureGate=new Promise(resolve=>{releaseFixture=resolve;});
 await page.reload();await page.locator('[data-classroom-tab="securities"]').click();
 await page.locator('#classroom-securities-panel [role="status"]').filter({hasText:'준비하고'}).waitFor();
 await page.locator('#preview-reset').click();releaseFixture();fixtureGate=null;
 await page.locator('[data-sec-action="open"]').waitFor();
 assert.notEqual(await page.evaluate(()=>DJ48SecuritiesState.get().identity),'demo-securities:synthetic-1','late load belongs only to new identity');
 assert.equal(await page.evaluate(()=>DJ48SecuritiesState.get().account),null);
 await page.goto(`${ORIGIN}/securities-preview.html`);
 assert.equal(await page.locator('[data-classroom-tab="securities"]').isVisible(),false,'flag off hides menu');
 await page.evaluate(()=>DJ48ClassroomForm.setActiveClassroomTab('securities'));
 assert.equal(await page.locator('#classroom-view').getAttribute('data-active-tab'),'market');
 assert.deepEqual(errors,[]);
 console.log('Securities browser: navigation, lazy load, order confirmation, reflection, reset, failure retry, teacher, 390/768/1440 layouts passed.');
 }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
