#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright-core');
const {createPreview}=require('./serve-securities-emulator');
(async()=>{
 const preview=await createPreview({port:0,classId:'SECURITIES-BROWSER',reset:true,assetsRoot:process.env.SECURITIES_CANDIDATE||null});
 const browser=await chromium.launch({executablePath:process.env.SMOKE_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 let page;const errors=[];
 try{
  page=await browser.newPage({viewport:{width:390,height:1000}});page.setDefaultTimeout(15000);let calls=0,drop=false,delay=null;
  const screenshotDir=process.env.SECURITIES_B_SCREENSHOT_DIR;if(screenshotDir)fs.mkdirSync(screenshotDir,{recursive:true});
  const settled=()=>page.waitForFunction(()=>document.getElementById('classroom-securities-panel').getAttribute('aria-busy')!=='true'&&!Object.keys(sessionStorage).some(k=>k.startsWith('dj48-securities-pending:')));
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.origin!==new URL(preview.url).origin)return route.abort();
   if(url.pathname==='/api/securities'){
    calls++;const body=route.request().postDataJSON();if(delay&&body.method==='query')await delay;
    if(drop&&body.method==='action'&&body.payload.action==='buy'){drop=false;await route.fetch();return route.abort();}
   }
   return route.continue();
  });
  console.log('Server UI: open preview');await page.goto(preview.url);assert.equal(calls,0,'no securities request on classroom entry');
  await page.locator('[data-classroom-tab="securities"]').click();await page.locator('[data-sec-action="open"]').waitFor();
  await page.locator('[data-sec-action="open"]').click();await settled();await page.locator('[data-company="sprout_food"]').click();
  await page.locator('[data-sec-action="buy"]').click();await page.locator('.sec-dialog textarea').fill('기업의 비용과 판매량을 함께 확인했어요');
  await page.locator('.sec-dialog [type="submit"]').click();await page.getByRole('button',{name:'이대로 살게요',exact:true}).waitFor();
  console.log('Server UI: confirm/replay');drop=true;await page.getByRole('button',{name:'이대로 살게요',exact:true}).click();await page.locator('[data-server-action="retry"]').waitFor();
  const pending=await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('dj48-securities-pending:')).map(k=>JSON.parse(sessionStorage[k])));assert.equal(pending.length,1);
  await page.reload();await page.locator('[data-classroom-tab="securities"]').click();await page.locator('[data-server-action="retry"]').click();
  await page.waitForFunction(()=>!Object.keys(sessionStorage).some(k=>k.startsWith('dj48-securities-pending:')));
  await page.locator('[data-section="account"]').click();assert.match(await page.locator('#sec-content').innerText(),/1주/);
  await page.locator('[data-section="journal"]').click();await page.locator('[data-reflection]').fill('다음에는 원재료 가격도 알아볼래요');await page.locator('[data-sec-action="reflect"]').click();
  await page.waitForFunction(()=>!Object.keys(sessionStorage).some(k=>k.startsWith('dj48-securities-pending:')));
  console.log('Server UI: teacher controls');await page.locator('#server-preview-role').selectOption('sec-teacher');await page.locator('[data-server-action="adminTab"]').first().waitFor();
  assert.equal(await page.locator('[data-sec-action=open]').count(),0,'management does not prompt teacher to open a personal account');
  await page.locator('[data-tab=records]').click();await settled();
  await page.locator('[data-server-action="inspect"][data-owner="sec-a"]').click();await settled();assert.match(await page.locator('#sec-b-inspection').innerText(),/원장 일치/);
  await page.locator('#sec-b-inspection textarea').fill('근거를 비교해 보았군요.');await page.locator('[data-server-action="feedback"]').click();await settled();
  await page.locator('[data-tab=news]').click();await settled();
  await page.locator('#sec-b-news [name="title"]').fill('함께 읽는 소식');await page.locator('#sec-b-news [name="body"]').fill('새 재료의 비용을 확인해요.');await page.locator('[data-tab=settings]').click();await settled();await page.locator('[data-tab=news]').click();await settled();assert.equal(await page.locator('#sec-b-news [name=title]').inputValue(),'함께 읽는 소식');await page.locator('#sec-b-news [name=effect]').fill('1.5');await page.locator('#sec-b-news button').click();await settled();
  await page.locator('[data-server-action="editNews"]').click();await settled();await page.locator('#sec-b-news [name="scope"]').selectOption('sector');await page.locator('#sec-b-news [name="target"]').selectOption('농업');await page.locator('#sec-b-news button').click();await settled();
  assert.equal((await preview.db.collection('classrooms/SECURITIES-BROWSER/securitiesMarkets/practice-v1/news').get()).docs.find(d=>d.data().title==='함께 읽는 소식').data().effectBps,150);
  await page.locator('[data-server-action="publish"]').click();await settled();
  await page.locator('[data-tab=settings]').click();await settled();
  await page.locator('#sec-b-settings [name="dailyTrades"]').fill('4');await page.locator('#sec-b-settings [name=fee]').fill('0.75');await page.locator('#sec-b-settings button').click();await settled();
  await page.waitForFunction(()=>document.querySelector('#sec-b-settings [name="dailyTrades"]')?.value==='4'&&!Object.keys(sessionStorage).some(k=>k.startsWith('dj48-securities-pending:')));
  assert.equal((await preview.db.doc('classrooms/SECURITIES-BROWSER/securitiesMarkets/practice-v1').get()).data().feeBps,75);
  await page.locator('[data-tab=market]').click();await settled();await page.locator('[data-server-action="pause"]').click();await settled();await page.locator('.sec-session').filter({hasText:'잠시 멈췄어요'}).waitFor();
  await page.locator('[data-server-action="pause"]').click();await settled();
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:1000});
   for(const tab of ['market','map','news','records','settings']){
    await page.locator(`[data-tab="${tab}"]`).click();await settled();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`teacher overflow ${tab} ${width}`);
    if(screenshotDir){await page.locator('.sec-heading').evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-12,behavior:'instant'}));await page.screenshot({path:path.join(screenshotDir,`teacher-${tab}-${width}.png`),animations:'disabled'});}
   }
  }
  await page.locator('#server-preview-role').selectOption('sec-a');await page.locator('[data-section="journal"]').click();assert.match(await page.locator('#sec-content').innerText(),/근거를 비교해/);
  await page.locator('[data-section="news"]').click();assert.match(await page.locator('#sec-content').innerText(),/함께 읽는 소식/);assert.doesNotMatch(await page.locator('#sec-content').innerText(),/effectBps|가격 영향/);
  await page.locator('[data-section="market"]').click();await page.locator('[data-company="sprout_food"]').click();await settled();assert.doesNotMatch(await page.locator('.sec-detail aside').innerText(),/함께 읽는 소식/);await page.locator('[data-sec-action="back"]').click();await page.locator('[data-company="sun_farm"]').click();await settled();assert.match(await page.locator('.sec-detail aside').innerText(),/함께 읽는 소식/);
  if(screenshotDir){for(const width of [390,1440]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(screenshotDir,`student-${width}.png`),fullPage:true});}}
  console.log('Server UI: stale response');let release;delay=new Promise(r=>release=r);await page.locator('[data-server-action="refresh"]').click();
  await page.locator('#server-preview-role').selectOption('sec-b');release();delay=null;
  await page.locator('[data-sec-action="open"]').waitFor();assert.doesNotMatch(await page.locator('#sec-content').innerText(),/다음에는 원재료/);
  assert.deepEqual(errors,[]);console.log('PASS securities server browser: lazy entry, persisted account, lost response/reload replay, journal, teacher feedback/settings/news/pause, 390/768/1440 layouts, switched-account stale responses.');
 }catch(e){console.error('Server UI diagnostic:',e.message,errors);if(page)console.error((await page.locator('#classroom-securities-panel').innerText().catch(()=>'' )).slice(0,2500));throw e;}finally{await browser.close();await preview.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
