#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const path=require('node:path');
const fs=require('node:fs');
const http=require('node:http');
const witness=require('../../tests/fraction-world/season-witness.json');
const C=require('../../public/fraction-world/content.js');
const root=path.resolve(__dirname,'../../public');
async function main(){
 const server=http.createServer((req,res)=>{let name=decodeURIComponent(req.url.split('?')[0]);if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
 browser=await chromium.launch({executablePath:process.env.SMOKE_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/fraction-world/');await page.screenshot({path:'/tmp/fraction-world-hub.png'});
 const solve=async()=>{while(await page.locator('#quiz-dialog').evaluate(d=>d.open)){
  const q=await page.evaluate(()=>FWStore.get().quiz?.question);
  if(!q){await page.click('#answer-submit');continue;}
  await page.click('#answer-num');await page.keyboard.type(String(q.n));await page.keyboard.press('Enter');
  assert.match(await page.locator('#quiz-feedback').innerText(),/정답/);await page.click('#answer-submit');
 }};
 await page.click('#enter-tower');await page.click('#tower-start');await page.click('[data-route="normal"]');
 // Wrong answer, retry and visual hint; attempt statistics must count a problem once.
 await page.click('[data-key="9"]');await page.click('[data-key="9"]');await page.click('#answer-submit');await page.click('#hint-button');assert.ok(await page.locator('.bar-unit').count());await solve();await page.waitForTimeout(2200);
 await page.keyboard.down('KeyD');await page.waitForTimeout(220);await page.keyboard.up('KeyD');await page.click('#dash-button');await page.click('#skill-button');
 await page.click('#pause-game');await page.screenshot({path:'/tmp/fraction-world-tower.png'});const snapshot=await page.evaluate(()=>FWStore.get().tower.combat);assert.ok(snapshot.time>1);assert.ok(snapshot.p.x>480);assert.ok(snapshot.p.skill>0);
 await page.click('#home-button');await page.reload();await page.click('#enter-tower');await page.click('#pause-game');const restored=await page.evaluate(()=>FWStore.get().tower.combat);assert.ok(restored.time>=snapshot.time);
 await page.click('#home-button');await page.selectOption('#save-slot','1');assert.equal(await page.evaluate(()=>FWStore.get().tower),null);
 await page.click('#enter-studio');await page.click('[data-diff="expert"]');await page.click('#studio-start');
 await page.click('[data-tab="facilities"]');assert.ok(await page.locator('[data-facility]').count()===6);await page.click('[data-tab="schedule"]');
 await page.click('[data-focus="lumi"]');
 // Complete a full season through actual controls and all 100 math questions.
 for(let day=1;day<=28;day++){
  assert.equal(await page.evaluate(()=>FWStore.get().studio.day),day);
  if([8,15,22].includes(day)){await page.click('[data-tab="music"]');await page.click(`[data-song="${day===8?'moon':day===15?'run':'first'}"]`);await page.click('[data-tab="schedule"]');}
  if(day%7===0){const outfit=day<8?'mint':day<15?'lilac':day<22?'neon':'sun';const cash=await page.evaluate(()=>FWStore.get().studio.cash);if(cash>=C.outfits.find(o=>o.id===outfit).cost+35){await page.click('[data-tab="music"]');await page.click(`[data-outfit="${outfit}"]`);await page.click('[data-tab="schedule"]');}}
  const choices=witness.sequence.slice((day-1)*3,day*3);for(let i=0;i<3;i++){await page.click(`[data-slot="${i}"]`);await page.click(`[data-activity="${choices[i]}"]`);}
  await page.click('#execute-day');if(day===1){await page.click('#quiz-exit');await page.reload();await page.click('#enter-studio');await page.click('#resume-day');}
  await solve();if(await page.locator('[data-event="1"]').count())await page.click('[data-event="1"]');
  if(day%7===0){await page.click('#perform');await solve();await page.click('#live-start');await page.waitForSelector('#next-day',{timeout:20000});assert.equal(await page.evaluate(()=>FWStore.get().studio.last.concert.accuracy),0);}
  if(day===27)await page.screenshot({path:'/tmp/fraction-world-studio.png'});
  await page.click('#next-day');
 }
 assert.equal(await page.evaluate(()=>FWStore.get().studio.cleared),true);assert.equal(await page.evaluate(()=>FWStore.get().total),100);assert.equal(await page.evaluate(()=>FWStore.get().studio.history.length),4);
 await page.screenshot({path:'/tmp/fraction-world-studio-result.png'});
 await page.click('#home-button');await page.click('#journal-button');assert.equal(await page.locator('.journal-row').count(),6);await page.click('#home-button');
 for(const size of [{width:820,height:1180},{width:1024,height:768},{width:600,height:960}]){await page.setViewportSize(size);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`horizontal overflow at ${size.width}`);await page.click('#enter-studio');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.click('#home-button');}
 await page.selectOption('#save-slot','0');await page.click('#enter-tower');await page.waitForTimeout(150);await page.click('#pause-game');
 // Real browser touch input exercises pointer capture and release on the joystick.
 await page.click('#pause-game');const stick=page.locator('#move-stick');const box=await stick.boundingBox();const cdp=await context.newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.8,y:box.y+box.height/2,id:1}]});await page.waitForTimeout(150);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await stick.locator('i').evaluate(e=>e.style.transform),'');await cdp.detach();
 await page.click('#home-button');
 assert.deepEqual(errors,[]);console.log('Fraction World browser: full expert season / 100 answers, wrong-answer retry, tower controls and checkpoint, independent slots, reload, journal, 3 tablet sizes passed.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
