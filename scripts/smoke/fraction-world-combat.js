#!/usr/bin/env node
'use strict';
// Synthetic, local-only combat fixtures; no production backend is accessed.
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const base=process.env.FRACTION_BASE_URL||'http://127.0.0.1:5478';
async function main(){
 const browser=await chromium.launch({executablePath:process.env.SMOKE_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1180,height:820},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/fraction-world/');
 const fixture=async(room,kind='boss',hp=1000,auto=999)=>{
  await page.evaluate(({room,kind,hp,auto})=>{
   FWTower.suspend();const s=FWTowerDomain.create('wand','expert');s.room=room;s.phase='combat';s.combat={p:{x:100,y:490,inv:30,dash:0,skill:0,burst:0,dx:0,dy:1},enemies:[{id:'fixture',type:kind,x:480,y:160,hp,maxHp:hp,r:kind==='boss'?34:15,t:0,cd:.05,slow:0,flash:0,tele:0,aim:0,charge:0,dx:0,dy:0}],shots:[],bullets:[],spawned:FWTowerDomain.roomSpec(s).count,spawnTimer:1,time:0,auto};FWStore.get().tower=s;FWStore.get().quiz=null;FWStore.save();FWTower.enter();
  },{room,kind,hp,auto});
 };
 // All four bosses must keep attacking, not stop after one warning timer expires.
 for(const room of [6,12,18,24]){
  await fixture(room);await page.waitForTimeout(6200);await page.click('#pause-game');
  const state=await page.evaluate(()=>FWStore.get().tower.combat);
  assert.ok(state.enemies.find(e=>e.id==='fixture').attacks>=3,'boss '+room+' repeats attacks');
  if(room===24)assert.ok(state.enemies.length>1,'final boss summons adds');
  await page.click('#pause-game');await page.screenshot({path:`/tmp/fraction-world-boss-${room}.png`});await page.click('#home-button');
 }
 await fixture(3,'charger');await page.waitForTimeout(6500);await page.click('#pause-game');assert.ok(await page.evaluate(()=>FWStore.get().tower.combat.enemies[0].attacks>=3));await page.click('#home-button');
 // Actual auto-projectiles kill a controlled low-HP enemy and lead to a reward.
 await fixture(1,'chaser',1,0);await page.waitForSelector('[data-relic]',{timeout:10000});assert.equal(await page.evaluate(()=>FWStore.get().tower.best),1);
 const solve=async()=>{while(await page.locator('#quiz-dialog').evaluate(d=>d.open)){const q=await page.evaluate(()=>FWStore.get().quiz?.question);if(q){await page.click('#answer-num');await page.keyboard.type(String(q.n));await page.keyboard.press('Enter');}await page.click('#answer-submit');}};
 await page.locator('[data-relic]').first().click();await solve();assert.equal(await page.evaluate(()=>FWStore.get().tower.room),2);assert.equal(await page.evaluate(()=>FWStore.get().collection.length),1);
 // The final reward commits completion once, including after a reload.
 await fixture(24,'boss',1,0);await page.waitForSelector('[data-relic]',{timeout:10000});await page.click('#skip-reward');await solve();assert.equal(await page.evaluate(()=>FWStore.get().tower.cleared),true);assert.equal(await page.evaluate(()=>FWStore.get().records.filter(r=>r.mode==='tower').length),1);
 await page.reload();await page.click('#enter-tower');assert.equal(await page.evaluate(()=>FWStore.get().records.filter(r=>r.mode==='tower').length),1);
 // Death is an actual collision, not a direct call to the result screen.
 await fixture(1,'chaser',1000,999);await page.click('#home-button');await page.evaluate(()=>{const s=FWStore.get().tower;s.hp=1;s.combat.p.inv=0;s.combat.enemies[0].x=s.combat.p.x;s.combat.enemies[0].y=s.combat.p.y;FWStore.save();});await page.click('#enter-tower');await page.waitForSelector('#tower-again');assert.equal(await page.evaluate(()=>FWStore.get().tower.cleared),false);
 assert.deepEqual(errors,[]);console.log('Combat browser: 4 repeating bosses, charger repeat, final boss adds, projectile victory/reward, final completion idempotency and collision death passed.');
 }finally{await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,5000))]);}
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
