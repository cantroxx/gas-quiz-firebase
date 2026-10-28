#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright-core');
const {createPreview}=require('./serve-securities-emulator');
(async()=>{
 const preview=await createPreview({port:0,classId:process.env.SECURITIES_CANDIDATE?'G4-C8':'SECURITIES-COIN-BROWSER',reset:true,mode:'coin',assetsRoot:process.env.SECURITIES_CANDIDATE||null,production:!!process.env.SECURITIES_CANDIDATE}),browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:1000}}),errors=[];let calls=0,drop=false,beforeFirstTrade=false;
  const settled=()=>page.waitForFunction(()=>document.getElementById('classroom-securities-panel').getAttribute('aria-busy')!=='true');
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==new URL(preview.url).origin)return route.abort();if(u.pathname==='/api/securities'){calls++;const p=route.request().postDataJSON();if(beforeFirstTrade&&p.payload.action==='market'){const response=await route.fetch(),body=await response.json();body.result.market.priceVersion=null;body.result.market.session='preopen';body.result.market.changes={};return route.fulfill({response,json:body});}if(drop&&p.payload.action==='deposit'){drop=false;await route.fetch();return route.abort();}}return route.continue();});
  const marketPath=`classrooms/${process.env.SECURITIES_CANDIDATE?'G4-C8':'SECURITIES-COIN-BROWSER'}/securitiesMarkets/coin-v1`;
  await preview.db.doc(marketPath).update({studentAccess:false});
  await page.goto(preview.url);assert.equal(calls,0);await page.locator('[data-classroom-tab="securities"]').click();await page.getByRole('alert').filter({hasText:'시범 수업'}).waitFor();assert.equal(await page.locator('[data-sec-action="open"]').count(),0);
  await page.locator('#server-preview-role').selectOption('sec-teacher');await page.locator('[data-server-action="adminTab"]').first().waitFor();await settled();await page.locator('[data-server-action="openStudents"]').waitFor();
  if(process.env.SECURITIES_C_SCREENSHOT_DIR){fs.mkdirSync(process.env.SECURITIES_C_SCREENSHOT_DIR,{recursive:true});await page.setViewportSize({width:1440,height:1000});await page.locator('[data-admin-pane="market"]').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`${process.env.SECURITIES_C_SCREENSHOT_DIR}/teacher-1440.png`});}
  await page.locator('#sec-b-reason').fill('합성 수업 1회 점검과 입출금 검증 완료');await page.locator('[data-server-action="openStudents"]').click();await settled();assert.equal((await preview.db.doc(marketPath).get()).data().studentAccess,true);
  await page.locator('#server-preview-role').selectOption('sec-a');await page.locator('[data-sec-action="open"]').waitFor();assert.equal(await page.locator('.sec-summary').count(),0,'unopened account has no fake zero summary');await page.locator('[data-sec-action="open"]').click();await settled();await page.locator('[data-section="account"]').click();await settled();
  assert.match(await page.locator('#sec-content').innerText(),/내 지갑\s+200코인/);
  await page.locator('[data-server-action="deposit"]').click();await page.locator('dialog input').fill('100');await page.locator('dialog [type="submit"]').click();assert.match(await page.locator('dialog').innerText(),/지갑에서 100코인을 빼서/);
  drop=true;await page.locator('dialog [type="submit"]').click();await page.locator('[data-server-action="retry"]').waitFor();await page.reload();await page.locator('[data-classroom-tab="securities"]').click();await page.locator('[data-server-action="retry"]').click();await settled();await page.waitForFunction(()=>!Object.keys(sessionStorage).some(k=>k.startsWith('dj48-securities-pending:')));await page.locator('[data-section="account"]').click();await settled();assert.match(await page.locator('#sec-content').innerText(),/내 지갑\s+100코인/);
  assert.equal((await preview.db.doc('userEconomy/sec-a').get()).data().djCoin,100);
  await page.locator('[data-server-action="withdraw"]').click();await page.locator('dialog input').fill('12');await page.locator('dialog [type="submit"]').click();await page.locator('dialog [type="submit"]').click();await page.waitForFunction(()=>!document.querySelector('dialog'));await page.waitForFunction(()=>document.querySelector('#sec-content').textContent.includes('내 지갑 112코인'));
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(process.env.SECURITIES_C_SCREENSHOT_DIR){fs.mkdirSync(process.env.SECURITIES_C_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:`${process.env.SECURITIES_C_SCREENSHOT_DIR}/account-${width}.png`,fullPage:true});}}
  await page.locator('[data-section="market"]').click();await settled();
  for(const img of await page.locator('.sec-company-art').all())await img.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>[...document.querySelectorAll('.sec-company-art')].length===12&&[...document.querySelectorAll('.sec-company-art')].every(img=>img.complete&&img.naturalWidth>0));
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(process.env.SECURITIES_C_SCREENSHOT_DIR)(await page.locator('.sec-heading').evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-12,behavior:'instant'})),await page.screenshot({path:`${process.env.SECURITIES_C_SCREENSHOT_DIR}/companies-${width}.png`,animations:'disabled'}));}
  await page.locator('[data-section=map]').click();await settled();assert.equal(await page.locator('.sec-treemap button').count(),12);assert.equal(await page.locator('.sec-treemap button').evaluateAll(bs=>Math.round(bs.reduce((sum,b)=>sum+parseFloat(b.style.width)*parseFloat(b.style.height),0))),10000);if(process.env.SECURITIES_C_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.SECURITIES_C_SCREENSHOT_DIR}/map-1440.png`,fullPage:true});await page.locator('[data-section=market]').click();await settled();
  await page.addScriptTag({url:new URL('/js/player-status-shortcut.js',preview.url).href});
  assert.equal(await page.locator('#dj48-player-status-shortcut').evaluate(el=>getComputedStyle(el).position),'static');
  await page.locator('[data-company="cloud_robot"]').click();await settled();
  assert.equal(await page.locator('.sec-detail').count(),1);assert.equal(await page.locator('.sec-quote-grid').count(),0);
  const chartBox=await page.locator('.sec-chart').boundingBox(),buyBox=await page.locator('[data-sec-action=buy]').boundingBox();assert(buyBox.x>chartBox.x+chartBox.width,'chart and trade actions are side by side');
  if(process.env.SECURITIES_C_SCREENSHOT_DIR){await page.locator('.sec-detail').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-24));await page.screenshot({path:`${process.env.SECURITIES_C_SCREENSHOT_DIR}/selected-1440.png`});}
  await page.locator('[data-sec-action="back"]').click();await page.setViewportSize({width:390,height:1000});await page.locator('[data-company="sprout_food"]').click();await settled();
  assert.equal(await page.locator('.sec-quote-grid').count(),0);assert.equal(await page.locator('.sec-detail').isVisible(),true);
  if(process.env.SECURITIES_C_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.SECURITIES_C_SCREENSHOT_DIR}/company-390.png`,fullPage:true});
  await page.locator('[data-sec-action="buy"]').click();await page.locator('dialog [name="reason"]').fill('건강한 간식을 만드는 회사라서 골랐어요.');await page.locator('dialog [type="submit"]').click();await page.getByRole('button',{name:'이대로 살게요',exact:true}).waitFor();
  if(process.env.SECURITIES_C_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.SECURITIES_C_SCREENSHOT_DIR}/buy-confirm-390.png`});
  await page.locator('dialog [data-close]').click();
  await page.locator('[data-sec-action="back"]').click();
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.company),'sprout_food');
  beforeFirstTrade=true;await page.locator('[data-server-action="refresh"]').click();await settled();
  assert.equal(await page.locator('.sec-quote-numbers').filter({hasText:'거래 전'}).count(),12);assert.doesNotMatch(await page.locator('#sec-company-grid').innerText(),/그대로예요|지난.*거래/);
  await page.locator('[data-company="cloud_robot"]').click();await settled();assert.match(await page.locator('.sec-detail').innerText(),/아직 거래 전/);assert.equal(await page.locator('[data-sec-action="buy"]').isDisabled(),true);assert.equal(await page.locator('.sec-chart').count(),0);
  const account=(await preview.db.doc(`classrooms/${process.env.SECURITIES_CANDIDATE?'G4-C8':'SECURITIES-COIN-BROWSER'}/securitiesMarkets/coin-v1/accounts/sec-a`).get()).data();assert.equal(account.cashMinor,8800);assert.equal(account.depositsMinor,10000);assert.equal(account.withdrawalsMinor,1200);
  assert.deepEqual(errors,[]);console.log('PASS coin browser: 0-entry requests, zero grant, transfer double-confirmation, lost response/reload replay, wallet sync, 390/768/1440 layouts');
 }finally{await browser.close();await preview.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
