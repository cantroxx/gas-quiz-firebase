#!/usr/bin/env node
'use strict';
// Local fixture with a controlled clock verifies actual lane input and exact hit grading.
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
async function main(){
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{const page=await browser.newPage({viewport:{width:1024,height:768},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5478/fraction-world/');
 await page.evaluate(()=>{const s=FWStudioDomain.create(['lumi','rio','sora']);s.day=7;s.phase='concert';s.last={day:7,notes:[]};FWStore.get().studio=s;FWStore.save();FWStudio.enter();});
 await page.click('#perform');while(await page.locator('#quiz-dialog').evaluate(d=>d.open)){const q=await page.evaluate(()=>FWStore.get().quiz?.question);if(q){await page.click('#answer-num');await page.keyboard.type(String(q.n));await page.keyboard.press('Enter');}await page.click('#answer-submit');}
 await page.clock.install();await page.clock.pauseAt(new Date());await page.click('#live-start');await page.clock.runFor(1500);
 for(let i=0;i<16;i++){if(i)await page.clock.runFor(650);await page.locator(`[data-lane="${(i*7+Math.floor(i/3))%3}"]`).tap();if(i===4)await page.screenshot({path:'/tmp/fraction-world-live.png'});}
 await page.clock.runFor(600);assert.equal(await page.evaluate(()=>FWStore.get().studio.last.concert.accuracy),100);assert.equal(await page.evaluate(()=>FWStore.get().studio.last.concert.liveBonus),5);await page.clock.resume();await page.reload();await page.click('#enter-studio');assert.equal(await page.evaluate(()=>FWStore.get().studio.history.length),1);
 await page.evaluate(()=>{const s=FWStore.get().studio;s.fans=345;s.members.forEach((m,i)=>m.xp=450-i*45);FWStudio.enter();});await page.screenshot({path:'/tmp/fraction-world-growth.png'});assert.deepEqual(errors,[]);console.log('Live stage: 16 actual touch hits, perfect accuracy, capped bonus, reload idempotency passed.');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
