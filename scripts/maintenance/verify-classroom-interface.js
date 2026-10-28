#!/usr/bin/env node
'use strict';
// Load the published public shell in a fresh browser; block all backend traffic.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const candidate=process.env.CLASSROOM_PUBLIC_DIR;
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
      if(url.origin===origin&&req.method()==='GET'&&!url.pathname.startsWith('/__/auth/')){
        if(candidate){const file=path.resolve(candidate,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(file.startsWith(path.resolve(candidate)+path.sep)&&fs.existsSync(file))return route.fulfill({path:file});}
        return route.continue();
      }
      return route.abort();
    });
    await page.goto(origin+'/?classroom-market-art-verify='+Date.now(),{waitUntil:'domcontentloaded'});
    await page.locator('#member-link-form').waitFor({state:'visible'});
    await page.waitForFunction(()=>window.DJ48ClassroomDiary&&window.DJ48ClassroomCardHome&&window.DJ48QuizCatalog);
    assert.deepEqual(await page.evaluate(()=>({diary:typeof DJ48ClassroomDiary.open,card:typeof DJ48ClassroomCardHome.render,portrait:typeof DJ48ClassroomPortrait.setAvatarImageSource})),{diary:'function',card:'function',portrait:'function'});
    assert.equal(await page.locator('link[href*="classroom-diary.css"]').count(),1);
    assert.equal(await page.locator('[data-classroom-diary="friends"].classroom-diary-nav').count(),1);
    assert.equal(await page.locator('link[href*="classroom-market-art.css"]').count(),1);
    const artwork=await page.evaluate(async()=>{const image=DJ48ClassroomShopArt.createImage({itemId:'boost-mini-tractor'},'',true);document.body.append(image);await image.decode();const result={src:image.getAttribute('src'),width:image.naturalWidth};image.remove();return result;});
    assert(artwork.src.endsWith('tractor-320.webp')&&artwork.width>0);
    assert.equal(await page.locator('#classroom-shop-icon-input option[value^=shopReserve]').count(),12);
    const selected=await page.evaluate(async()=>{
      const select=document.getElementById('classroom-shop-icon-input');DJ48ClassroomShopArt.bindPicker();const checked=[];
      for(const option of [...select.options].filter(o=>o.value.startsWith('shopReserve'))){
        select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));
        const image=document.querySelector('#classroom-shop-art-preview img');await image.decode();
        checked.push({key:option.value,src:image.getAttribute('src'),width:image.naturalWidth});
      }return checked;
    });
    assert.equal(selected.length,12);assert(selected.every(x=>x.width>0&&x.src.includes('/market-reserve-v1/')));
    assert.equal(await page.locator('#home-classroom-return').count(),1);
    assert.equal(await page.locator('#home-classroom-return').evaluate(e=>e.hidden),true);
    assert.equal(await page.locator('[data-classroom-panel="today"] #classroom-activity-feed').count(),0);
    assert.equal(await page.locator('#classroom-teacher-dashboard #classroom-activity-feed').count(),1);
    assert.equal(await page.locator('#classroom-routine-item-count').textContent(),'0/10');
    assert.equal(await page.locator('.classroom-routine-item-input').count(),10);
    const icons=await page.evaluate(async()=>{
      const files=['student-card','bank','exchange','point-token','dj-coin','inventory','point-shop','coin-shop','group-purchase','home',...['star','heart','book','pencil','crown','medal','trophy','sprout','lightning','ribbon','shield'].map(x=>'keyring-'+x)];
      return Promise.all(files.map(async name=>{const i=new Image();i.src='/images/classroom-icons/'+name+'.svg';await i.decode();return i.naturalWidth>0;}));
    });assert(icons.every(Boolean));
    assert.deepEqual(errors,[]);assert.deepEqual(badStatic,[]);
    console.log('PASS classroom interface: return action initially hidden, no home placeholder, 10 routine inputs, 21 SVG icons decoded; login form, card/diary/portrait modules plus market artwork module, CSS and 12 selectable reserve images decoded, no page errors or failed static assets; all backend requests blocked.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
