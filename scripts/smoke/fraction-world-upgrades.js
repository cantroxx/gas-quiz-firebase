#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');const {chromium}=require('playwright-core');
async function main(){const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1024,height:768},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5478/fraction-world/');await page.click('#enter-tower');assert.match(await page.locator('[data-diff="hard"]').innerText(),/기본 난이도/);assert.match(await page.locator('[data-diff="expert"]').innerText(),/심화 난이도/);await page.click('#tower-start');
 await page.evaluate(()=>{const s=FWStore.get().tower;s.relics=['ember','crit','heart'];s.crystals=100;FWStore.save();FWTower.enter();});
 await page.locator('[data-upgrade="ember"]').tap();assert.equal(await page.evaluate(()=>FWStore.get().tower.crystals),80);assert.equal(await page.evaluate(()=>FWTowerDomain.level(FWStore.get().tower,'ember')),1);
 await page.locator('[data-upgrade="heart"]').tap();assert.equal(await page.evaluate(()=>FWStore.get().tower.hp),118);await page.reload();await page.click('#enter-tower');assert.equal(await page.evaluate(()=>FWTowerDomain.level(FWStore.get().tower,'heart')),1);
 await page.locator('[data-upgrade="ember"]').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/fraction-world-upgrades.png'});
 await page.evaluate(()=>{const s=FWStore.get().tower;s.phase='reward';s.offers=['fury'];FWStore.save();FWTower.enter();});assert.match(await page.locator('[data-preview="fury"]').innerText(),/불꽃 조합 활성/);assert.match(await page.locator('[data-preview="fury"]').innerText(),/한 발 위력/);
 await page.evaluate(()=>{const s=FWStore.get().tower;s.relics=['ember','crit','fury','heart','frost','storm','nova','clock'];s.offers=['boots'];FWTower.enter();});await page.locator('[data-replace="ember"]').tap();assert.match(await page.locator('[data-preview="boots"]').innerText(),/불꽃 조합 해제/);
 await page.locator('[data-relic="boots"]').tap();assert.equal(await page.evaluate(()=>FWStore.get().tower.room),2);await page.click('[data-route="normal"]');assert.ok(await page.locator('#arena').count());await page.click('#home-button');
 for(const size of [{width:600,height:960},{width:820,height:1180}]){await page.setViewportSize(size);await page.evaluate(()=>{const s=FWStore.get().tower;s.phase='route';s.combat=null;FWTower.enter();});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 assert.deepEqual(errors,[]);console.log('Upgrade UI: difficulty labels, touch purchase, crystal deduction, HP gain, reload, synergy activation/removal, direct combat and tablet layouts passed.');
 }finally{await browser.close();}}
main().catch(e=>{console.error(e);process.exitCode=1;});
