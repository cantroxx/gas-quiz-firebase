#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright-core');
async function main(){const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});try{
const page=await browser.newPage({viewport:{width:1180,height:900},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5478/fraction-world/');await page.click('#enter-tower');await page.click('#tower-start');
for(const difficulty of ['hard','expert'])for(const room of [1,7,13,19]){
 await page.evaluate(({difficulty,room})=>{const s=FWStore.get().tower;s.room=room;s.difficulty=difficulty;s.phase='route';s.relics=['luck'];FWTower.enter();},{difficulty,room});
 const expected=await page.evaluate(()=>{const s=FWStore.get().tower;return ['normal','elite'].map(route=>FWTowerDomain.roomSpec({...s,route}));});
 for(const [i,route] of ['normal','elite'].entries()){const text=await page.locator(`[data-route="${route}"]`).innerText();assert.ok(text.includes(`◇ ${expected[i].reward+8}개`));assert.ok(text.includes(`적 ${expected[i].count}명`));}
 assert.match(await page.locator('[data-route="elite"]').innerText(),/획득 확률은 탐험과 같아요/);
}
await page.evaluate(()=>{const s=FWStore.get().tower;s.room=2;s.difficulty='hard';s.relics=['nova','clock'];s.phase='reward';s.offers=['luck','ember','heart'];FWTower.enter();});
assert.match(await page.locator('[data-preview="luck"]').innerText(),/별 2\/3 → 3\/3 · 조합 완성/);assert.match(await page.locator('[data-preview="luck"]').innerText(),/특수 기술 위력 \+30%/);
await page.waitForFunction(()=>[...document.querySelectorAll('.relic-art img')].every(i=>i.complete&&i.naturalWidth));await page.screenshot({path:'/tmp/fraction-relics-v3.png'});
await page.locator('.relic-belt-item').first().tap();assert.ok(await page.locator('#modal').evaluate(d=>d.open));assert.match(await page.locator('.relic-detail').innerText(),/이 유물 하나의 효과/);await page.click('#close-relic');
await page.click('[data-relic="luck"]');assert.equal(await page.locator('.synergy-group.tag-star.is-active').count(),1);await page.locator('#app .synergy-group.tag-star').screenshot({path:'/tmp/fraction-synergy-v3.png'});
assert.equal(await page.evaluate(async()=>{const img=new Image();img.src='./assets/relics-v3.png';await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(0,0,1,1).data[3];}),0);
for(const width of [600,820]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
await page.setViewportSize({width:1180,height:900});await page.screenshot({path:'/tmp/fraction-routes-v3.png'});
await page.clock.install();await page.evaluate(()=>{const s=FWTowerDomain.create('wand');s.phase='combat';s.combat={p:{x:480,y:300,inv:10,dash:0,skill:0,burst:0,dx:1,dy:0},enemies:[{id:'near',type:'chaser',x:570,y:300,hp:1000,maxHp:1000,r:15,t:0,cd:99,slow:0,flash:0,tele:0,charge:0}],shots:[{x:530,y:400,vx:0,vy:0,life:5}],bullets:[],spawned:FWTowerDomain.roomSpec(s).count,spawnTimer:99,auto:999,time:0};FWStore.get().tower=s;FWTower.enter();});
await page.click('#skill-info');assert.match(await page.locator('#modal').innerText(),/75 피해/);await page.clock.runFor(1500);await page.click('#close-skill');await page.click('#skill-button');assert.match(await page.locator('#skill-feedback').innerText(),/적 1명 적중 · 탄 1개 제거/);await page.clock.runFor(100);await page.screenshot({path:'/tmp/fraction-nova-v3.png'});await page.click('#pause-game');assert.ok(await page.evaluate(()=>FWStore.get().tower.combat.enemies[0].hp<1000));assert.equal(await page.evaluate(()=>FWStore.get().tower.combat.shots.length),0);
assert.deepEqual(errors,[]);console.log('Clarity UI: dynamic route counts/rewards, equal loot odds, relic art/alpha, 2-to-3 synergy preview, tap details, tablet layout, nova help/results and actual damage/bullet clearing passed.');
}finally{await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,5000))]);}}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
