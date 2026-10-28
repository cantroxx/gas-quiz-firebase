#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../public');
async function main(){
  const server=http.createServer((req,res)=>{
    let name=decodeURIComponent(req.url.split('?')[0]);if(name.endsWith('/'))name+='index.html';
    const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.SMOKE_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
    const context=await browser.newContext({viewport:{width:1360,height:1100}}),page=await context.newPage(),errors=[],external=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:'))external.push(r.url());});
    await page.clock.install();await page.goto(`http://127.0.0.1:${server.address().port}/cloud-tower/`);
    await page.waitForSelector('body[data-art-ready="true"]');
    await page.screenshot({path:'/tmp/cloud-tower-lobby.png',fullPage:true});
    const begin=async()=>{await page.click('#start');await page.clock.runFor(3100);await page.waitForFunction(()=>!document.getElementById('typing').disabled);};
    const solve=async(wait=1600)=>{const prompt=await page.locator('#prompt').innerText();await page.fill('#typing',prompt);await page.press('#typing','Enter');await page.clock.runFor(wait);};
    await page.fill('#nickname','첫 탐험가');await begin();
    // Browser IME composition: Enter during composition must not submit.
    await page.locator('#typing').dispatchEvent('compositionstart');
    await page.locator('#typing').evaluate(el=>{el.value='구름';el.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,data:'름'}));el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true}));});
    assert.equal(await page.locator('#floor').innerText(),'0');
    await page.locator('#typing').dispatchEvent('compositionend');await page.press('#typing','Enter');assert.equal(await page.locator('#floor').innerText(),'1');await page.clock.runFor(1400);
    await page.fill('#typing','무지게');await page.press('#typing','Enter');assert.equal(await page.locator('#floor').innerText(),'1');assert.match(await page.locator('#feedback').innerText(),/다시/);
    await solve();await solve();await solve();await solve(800);assert.equal(await page.locator('#floor').innerText(),'6');assert.equal(await page.locator('#sky').getAttribute('data-motion'),'air');
    await page.screenshot({path:'/tmp/cloud-tower-playing.png',fullPage:true});
    await page.clock.runFor(900);
    // Finish a full challenge, exercising a real timer expiry after enough climbs.
    for(let i=0;i<20;i++)await solve();
    await page.clock.fastForward(121000);await page.clock.runFor(1400);assert.equal(await page.locator('#result').evaluate(el=>el.open),true);assert.match(await page.locator('#result-title').innerText(),/120초/);
    assert.match(await page.locator('#save-message').innerText(),/저장/);assert.equal(await page.locator('#leaderboard li').count(),1);
    await page.screenshot({path:'/tmp/cloud-tower-result.png',fullPage:true});
    await page.click('#close-result');await page.reload();assert.equal(await page.locator('#leaderboard li').count(),1);
    await page.fill('#nickname','구름 친구');await begin();await solve();await page.clock.fastForward(125000);await page.clock.runFor(1400);assert.match(await page.locator('#result-title').innerText(),/먹구름/);assert.equal(await page.locator('#leaderboard li').count(),2);
    await page.click('#retry');await page.clock.runFor(3100);await solve();await page.click('#stop');await page.clock.runFor(1400);assert.match(await page.locator('#save-message').innerText(),/저장하지/);assert.equal(await page.locator('#leaderboard li').count(),2);
    await page.click('#close-result');await page.click('[data-mode="practice"]');await begin();await solve();await page.clock.fastForward(200000);assert.equal(await page.locator('#result').evaluate(el=>el.open),false);await page.click('#stop');await page.clock.runFor(1400);assert.match(await page.locator('#save-message').innerText(),/연습 완료/);assert.equal(await page.locator('#leaderboard li').count(),2);
    await page.click('#close-result');
    for(const width of [390,768,1024]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${width}`);}
    await page.setViewportSize({width:390,height:844});await page.click('[data-mode="challenge"]');await page.screenshot({path:'/tmp/cloud-tower-mobile.png',fullPage:true});
    await page.click('#motion-toggle');await begin();await solve(300);assert.equal(await page.locator('#sky').getAttribute('data-motion'),'idle');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/cloud-tower-mobile-playing.png',fullPage:true});await page.click('#stop');await page.clock.runFor(100);
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    const menu=await context.newPage();await menu.route(/fonts\.(googleapis|gstatic)\.com/,route=>route.abort());
    await menu.goto(`http://127.0.0.1:${server.address().port}/battle/`);
    assert.equal(await menu.locator('a.entry').count(),4);assert.match(await menu.locator('.entry-cloud').innerText(),/공용 랭킹 · 2~4인 실시간 레이스/);
    for(const destination of ['/wordbattle/','/mathsurvivor/','https://dj48-fraction-world.vercel.app/'])assert.equal(await menu.locator(`a[href="${destination}"]`).count(),1);
    for(const destination of ['/marble/','/geosang/'])assert.equal(await menu.locator(`a[href="${destination}"]`).count(),0);
    await menu.click('a.entry-cloud');await menu.waitForSelector('body[data-art-ready="true"]');await menu.click('.hub-back');assert.ok(menu.url().endsWith('/battle/'));
    await menu.setViewportSize({width:390,height:844});assert.ok(await menu.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await menu.screenshot({path:'/tmp/cloud-tower-battle-menu.png',fullPage:true});
    console.log('Cloud Tower browser: generated art loading, IME, typo/retry, animated super jump, 120-second completion, storm, ranking persistence, second nickname, replay, abandon, unlimited practice, responsive lobby/game, reduced motion and no external requests passed.');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
