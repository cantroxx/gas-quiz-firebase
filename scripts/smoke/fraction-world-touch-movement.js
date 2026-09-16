'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});try{
const p=await b.newPage({viewport:{width:1180,height:820},hasTouch:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/tower.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace('constructor(s){','constructor(s){window.touchArena=this;')});});await p.goto(process.env.FRACTION_WORLD_URL||'http://127.0.0.1:5478/fraction-world/');
for(const size of [{width:1180,height:820},{width:820,height:1180},{width:390,height:844},{width:844,height:390}]){
 await p.setViewportSize(size);await p.evaluate(()=>{FWTower.stop();const s=FWAdventure.apply(FWExpedition.create('wand','hard'),'advanced');s.guideEnabled=false;FWExpedition.select(s,FWExpedition.current(s)[0].id);s.phase='combat';FWStore.get().tower=s;FWTower.enter();});await p.locator('#combat-loading').waitFor({state:'hidden'});
 await p.evaluate(()=>{const a=touchArena;cancelAnimationFrame(a.frame);a.obstacles=[];a.spawned=a.spec.count;a.enemies=[{id:'touch-dummy',type:'chaser',x:700,y:300,hp:1e9,maxHp:1e9,r:15,t:0,cd:100}];a.p.inv=1000;window.touchShots=0;const fire=a.fire;a.fire=function(...args){touchShots++;return fire.apply(this,args);};});
 const point=await p.evaluate(()=>{const a=touchArena,v=a.viewTransform();return {x:v.rect.left+v.ox+530*v.scale,y:v.rect.top+v.oy+340*v.scale};});await p.touchscreen.tap(point.x,point.y);
 const target=await p.evaluate(()=>touchArena.tapTarget);assert.ok(target);assert.ok(Math.abs(target.x-530)<2&&Math.abs(target.y-340)<2,'camera coordinate conversion');
 const moved=await p.evaluate(()=>{for(let i=0;i<120;i++)touchArena.update(1/60);return {x:touchArena.p.x,y:touchArena.p.y,target:touchArena.tapTarget,shots:touchShots};});assert.ok(Math.abs(moved.x-530)<4&&Math.abs(moved.y-340)<4);assert.equal(moved.target,null);assert.equal(moved.shots,0,'floor touch must not attack');
 // WASD moves in four directions, S must not activate the skill.
 for(const [key,axis,sign] of [['w','y',-1],['a','x',-1],['s','y',1],['d','x',1]]){const before=await p.evaluate(()=>({x:touchArena.p.x,y:touchArena.p.y}));await p.keyboard.down(key);await p.evaluate(()=>{for(let i=0;i<15;i++)touchArena.update(1/60);});await p.keyboard.up(key);const after=await p.evaluate(()=>({x:touchArena.p.x,y:touchArena.p.y,skill:touchArena.p.skill}));assert.ok((after[axis]-before[axis])*sign>10);assert.equal(after.skill,0);}
 assert.equal(await p.evaluate(()=>touchShots),0);await p.keyboard.press('j');assert.equal(await p.evaluate(()=>touchShots),1);await p.keyboard.press('e');assert.ok(await p.evaluate(()=>touchArena.p.skill>0));
 // Manual movement overrides a destination; pausing clears it.
 await p.evaluate(()=>{touchArena.tapTarget={x:800,y:400};});await p.keyboard.down('a');await p.evaluate(()=>touchArena.update(.02));await p.keyboard.up('a');assert.equal(await p.evaluate(()=>touchArena.tapTarget),null);
 await p.evaluate(()=>{touchArena.tapTarget={x:800,y:400};touchArena.pause();});await p.touchscreen.tap(point.x,point.y);assert.equal(await p.evaluate(()=>touchArena.tapTarget),null);await p.click('#pause-game');
 // Real attack-button touch remains an attack, never a movement target.
 await p.evaluate(()=>{touchArena.manualCool=0;});await p.locator('#attack-button').tap();assert.equal(await p.evaluate(()=>touchShots),2);assert.equal(await p.evaluate(()=>touchArena.tapTarget),null);
 // A blocked destination stops instead of running forever into a wall.
 const stopped=await p.evaluate(()=>{const a=touchArena;a.p.x=480;a.p.y=340;a.obstacles=[{x:495,y:280,w:30,h:120}];a.tapTarget={x:600,y:340};for(let i=0;i<120;i++)a.update(1/60);return !a.tapTarget;});assert.ok(stopped);
 console.log(size.width+'x'+size.height+': touch destination, WASD/J/E, pause, controls, blocked path PASS');
}
assert.deepEqual(errors,[]);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
