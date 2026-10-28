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
    let fixtureMode=false;
    await page.route('**/*',async route=>{
      const req=route.request(),url=new URL(req.url());
      if(url.origin===origin&&req.method()==='GET'&&!url.pathname.startsWith('/__/auth/')){
        if(fixtureMode && url.pathname==='/') {
          const html=candidate?fs.readFileSync(path.join(candidate,'index.html'),'utf8'):await (await route.fetch()).text();
          return route.fulfill({contentType:'text/html',body:html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')});
        }
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
    fixtureMode=true;
    await page.goto(origin+'/?economy-offline-fixture=1',{waitUntil:'load'});
    for(const file of ['domain/classroom-domain.js','features/classroom-state.js','data/level-medal-assets.js','features/classroom-form.js','features/classroom-portrait.js','features/classroom-card-home.js','features/classroom-diary.js','features/classroom-shop-art.js','features/classroom-workspace.js','features/classroom-render.js']) {
      await page.addScriptTag({url:origin+'/js/'+file});
    }
    for(const teacher of [false,true]) {
      const result=await page.evaluate(async teacher=>{
        const data={settings:{classId:'demo'},wallet:{point:35.5},studentCards:[],reviewItems:[],economyBoard:{myDjCoin:120,pointLogs:[{type:'classroom_level_up_reward',rewardAmount:50}],savingsProducts:[{productId:'week',title:'1주 예치',minDepositPoint:1,termDays:7,interestRatePercent:5}],savingsAccounts:[],exchangeSettings:{pointToCoinEnabled:true,coinToPointEnabled:true,pointToCoinPointCost:3,coinToPointReward:.5}}};
        document.querySelectorAll('.app-view').forEach(view=>{view.hidden=view.id!=='classroom-view';});
        DJ48ClassroomForm.setClassroomUnlocked(true);
        DJ48ClassroomRender.renderClassroomSections(data,{activeTab:'bank',isCurrentClassroomTeacher:()=>teacher,currentMemberUserId:'S1',getTodayDateKey:()=> '2026-10-17'});
        DJ48ClassroomForm.setActiveClassroomTab('bank');
        DJ48ClassroomRender.renderClassroomLoadState('ready');
        const images=[...document.querySelectorAll('#classroom-economy-navigation button')].map(button=>getComputedStyle(button,'::before').backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1]);
        for(const src of images){if(!src)throw Error('Missing economy menu artwork');const image=new Image();image.src=src;await image.decode();}
        await Promise.all([...document.querySelectorAll('#classroom-bank-grid .classroom-heading-icon')].map(image=>image.decode()));
        return {images,headings:[...document.querySelectorAll('#classroom-bank-grid .classroom-heading-icon')].map(image=>image.src),bankText:document.getElementById('classroom-bank-grid').textContent,logs:data.economyBoard.pointLogs.length,wallet:data.wallet.point};
      },teacher);
      assert.equal(result.images.length,5);assert(result.images.every(src=>src.endsWith('.webp')));
      assert.equal(result.headings.length,2);assert(result.headings.every(src=>src.endsWith('.webp')));
      assert(!result.bankText.includes('최근 포인트 기록'));assert(!result.bankText.includes('classroom_level_up_reward'));
      assert(result.bankText.includes('1주 예치'));assert.equal(result.logs,1);assert.equal(result.wallet,35.5);
      for(const width of [1440,768,390,320]) {
        await page.setViewportSize({width,height:1000});
        assert(await page.locator('#classroom-bank-grid').isVisible(),'Bank must be visible');
        assert(await page.locator('#classroom-economy-navigation [data-classroom-tab="bank"]').isVisible(),'Bank navigation must be visible');
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Economy viewport overflow');
        if(process.env.CLASSROOM_ECONOMY_REVIEW_DIR){fs.mkdirSync(process.env.CLASSROOM_ECONOMY_REVIEW_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.CLASSROOM_ECONOMY_REVIEW_DIR,`${teacher?'teacher':'student'}-${width}-bank.png`),fullPage:true,animations:'disabled'});}
      }
    }
    assert.deepEqual(errors,[]);assert.deepEqual(badStatic,[]);
    console.log('PASS classroom economy: student/teacher 320–1440px; 5 raster menu icons and 2 bank illustrations decoded; recent-point card absent with logs present; balances/log data preserved; savings product retained; login form, card/diary/portrait modules plus market artwork module, CSS and 12 selectable reserve images decoded, no page errors or failed static assets; all backend requests blocked.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
