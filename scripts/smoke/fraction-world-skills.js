#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright-core');
async function main(){const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1180,height:820},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5478/fraction-world/');await page.clock.install();
 const fixture=async weapon=>page.evaluate(weapon=>{FWTower.suspend();const s=FWTowerDomain.create(weapon,'hard');s.phase='combat';s.combat={p:{x:480,y:300,dx:1,dy:0,inv:99,dash:0,skill:0,burst:0},enemies:[{id:'near',x:580,y:300},{id:'rear',x:370,y:300},{id:'far',x:880,y:100}].map(e=>({...e,type:'chaser',hp:1000,maxHp:1000,r:15,t:0,cd:99,slow:0,flash:0,tele:0,charge:0})),bullets:[],shots:[],pending:[],spawned:FWTowerDomain.roomSpec(s).count,spawnTimer:99,auto:999,time:0};FWStore.get().tower=s;FWStore.get().quiz=null;FWStore.save();FWTower.enter();},weapon);
 const snapshot=async()=>{await page.click('#pause-game');return page.evaluate(()=>FWStore.get().tower.combat);};
 for(const weapon of ['wand','bow','fan','orb','needle','comet']){
  await fixture(weapon);await page.click('#skill-button');await page.click('#skill-button');await page.clock.runFor(100);let b=await snapshot();
  assert.ok(b.p.skill>8,'skill cooldown '+weapon);
  if(weapon==='bow'){assert.ok(b.enemies[0].hp<1000);assert.equal(b.enemies[1].hp,1000,'beam cannot hit behind');}
  if(weapon==='wand'||weapon==='orb'){assert.ok(b.enemies[0].hp<1000);assert.equal(b.enemies[2].hp,1000);}
  if(weapon==='orb')assert.ok(b.enemies[0].chill>2.8);
  if(weapon==='needle'){assert.ok(b.enemies[0].hp<1000);assert.equal(b.enemies[2].hp,1000);}
  if(weapon==='fan')assert.equal(b.bullets.filter(x=>x.orbit!==undefined).length,8);
  if(weapon==='comet'){
   assert.equal(b.pending.length,1,'repeated click cannot create a second meteor');assert.equal(b.enemies[0].hp,1000);
   await page.reload();await page.click('#enter-tower');await page.clock.runFor(700);b=await snapshot();assert.equal(b.pending.length,0);assert.ok(b.enemies[0].hp<1000);const hp=b.enemies[0].hp;await page.click('#pause-game');await page.clock.runFor(800);b=await snapshot();assert.equal(b.enemies[0].hp,hp,'meteor applies only once after reload');
  }
 }
 for(const name of ['weapons','hero-motion','boss-combat','studio-wardrobe'])assert.equal(await page.evaluate(async name=>{const img=new Image();img.src='./assets/'+name+'-v2.png';await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(0,0,1,1).data[3];},name),0);
 await page.click('#home-button');await page.click('#enter-studio');await page.click('#studio-start');assert.equal(await page.locator('.wardrobe-portrait').count(),3);await page.click('[data-activity="dance"]');assert.equal(await page.locator('.stage').getAttribute('data-practice'),'dance');
 const outfit=async id=>{await page.evaluate(id=>{const s=FWStore.get().studio;s.outfit=id;if(!s.owned.includes(id))s.owned.push(id);FWStudio.enter();},id);await page.waitForFunction(()=>[...document.querySelectorAll('.wardrobe-portrait img')].every(i=>i.complete&&i.naturalWidth));return page.locator('.wardrobe-portrait img').first().getAttribute('style');};
 assert.match(await outfit('mint'),/top:-100%/);assert.match(await outfit('lilac'),/top:-200%/);await page.screenshot({path:'/tmp/fraction-studio-v2.png'});
 for(const width of [600,820]){await page.setViewportSize({width,height:960});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 assert.deepEqual(errors,[]);console.log('Six actual skills, cooldown spam, meteor save/resume, four transparent atlases, three-member wardrobe and tablet layout passed.');
 }finally{await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,5000))]);}}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
