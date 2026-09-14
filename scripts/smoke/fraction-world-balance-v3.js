#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright-core');
async function main(){const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1180,height:820},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Only exposes the existing engine to this test page. No combat implementation is replaced.
 await page.route('**/tower.js*',async route=>{const response=await route.fetch(),source=await response.text();await route.fulfill({response,body:source.replace('constructor(s){','constructor(s){window.balanceArena=this;')});});
 await page.goto(process.env.FRACTION_WORLD_URL||'http://127.0.0.1:5478/fraction-world/');await page.clock.install();await page.click('#enter-tower');await page.click('#tower-start');
 assert.equal(await page.evaluate(()=>FWStore.get().tower.balance),3);
 await page.evaluate(()=>{const s=FWStore.get().tower;s.room=5;s.crystals=200;s.relics=['ember','heart'];FWExpedition.select(s,FWExpedition.current(s).find(n=>n.type==='forge').id);FWTower.enter();});
 await page.click('[data-weapon-up="a"]');await page.click('[data-upgrade="heart"]');assert.equal(await page.evaluate(()=>FWStore.get().tower.crystals),125);assert.ok(await page.locator('[data-weapon-up="a"]').isDisabled());assert.ok(await page.locator('[data-upgrade="ember"]').isDisabled());await page.reload();await page.click('#enter-tower');assert.equal(await page.evaluate(()=>FWTowerDomain.forgeRemaining(FWStore.get().tower)),0);
 await page.click('#room-leave');await page.evaluate(()=>{const s=FWStore.get().tower;s.relics=['ember','meteor','frost','pierce','storm','boots','heart','leech'];FWTower.enter();});await page.click('#exp-guide');assert.equal(await page.locator('[data-toggle-mix]').count(),6);assert.equal(await page.locator('[data-toggle-mix].selected').count(),2);await page.locator('[data-toggle-mix].selected').first().click();await page.locator('[data-toggle-mix]:not(.selected):not(:disabled)').last().click();assert.equal(await page.locator('[data-toggle-mix].selected').count(),2);const selected=await page.evaluate(()=>FWExpedition.mixes(FWStore.get().tower).map(m=>m.id));await page.click('#close-guide');await page.reload();await page.click('#enter-tower');assert.deepEqual(await page.evaluate(()=>FWExpedition.mixes(FWStore.get().tower).map(m=>m.id)),selected);
 for(const width of [390,600,820,1180]){await page.setViewportSize({width,height:900});await page.click('#exp-guide');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#modal').screenshot({path:`/tmp/fraction-balance-mixes-${width}.png`});await page.click('#close-guide');}
 await page.setViewportSize({width:1180,height:820});
 // Build legal spending/offer histories. Combat outcomes are assumed only while preparing
 // these fixtures; each sampled encounter below runs the actual engine at full enemy HP.
 await page.evaluate(()=>{
  window.balancePlans=[];const C=FWContent,D=FWTowerDomain,E=FWExpedition;
  for(const w of C.weapons)for(const mode of ['short','long'])for(const difficulty of ['hard','expert'])for(const profile of ['attack','survival']){
   const s=E.create(w.id,difficulty,mode,'dawn',429),snapshots=[];let earned=0,spent=0;
   const priority=profile==='attack'?['twin','ember','storm','meteor','crown','echo','pierce','crit','luck','torch','coil','nova']:['heart','leech','heal','shield','frost','icewall','root','bark','snow','acorn','clock','shell'];
   const score=id=>{const i=priority.indexOf(id);return i<0?100:i;};let randomSeed=23;const random=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};
   while(s.phase!=='ended'){
    if(E.step(s)===0)snapshots.push({region:E.region(s),state:JSON.parse(JSON.stringify(s)),earned,spent});
    if(E.step(s)===E.depth(s)-1)snapshots[E.region(s)].bossState={state:JSON.parse(JSON.stringify(s)),earned,spent};
    const options=E.current(s),n=options.find(n=>n.type==='elite')||options.find(n=>n.type==='forge')||options.find(n=>n.type==='treasure')||options[0];E.select(s,n.id);
    if(s.phase==='charge')s.phase='combat';
    if(s.phase==='combat'){const before=s.crystals;D.completeRoom(s,random);earned+=s.crystals-before;}
    if(s.phase==='reward'){
     const offer=[...s.offers].sort((a,b)=>score(a)-score(b))[0],worst=[...s.relics].sort((a,b)=>score(b)-score(a))[0];
     if(s.relics.length<8||score(offer)<score(worst))D.equip(s,offer,worst);else{s.crystals+=D.skipReward(s);earned+=D.skipReward(s);D.finishReward(s);}
    }else if(s.phase==='room'){
     if(n.type==='forge'){while(E.upgradeWeapon(s,w.reach?'b':'a'))spent+=D.modern(s)?[30,60,110,170,250][s.weaponLevel-1]:0;
      if(profile==='survival')for(const id of s.relics){const cost=D.upgradeCost(s,id);if(D.upgrade(s,id))spent+=cost;}}
     E.finish(s);
    }
    while(s.phase==='route'&&s.weaponLevel<2){const cost=E.weaponCost(s);if(!E.upgradeWeapon(s))break;spent+=cost;}
   }
   for(const snapshot of snapshots)window.balancePlans.push({weapon:w.id,mode,difficulty,profile,...snapshot});
  }
 });
 const plans=await page.evaluate(()=>window.balancePlans.map((p,i)=>({i,weapon:p.weapon,mode:p.mode,difficulty:p.difficulty,profile:p.profile,region:p.region}))),results=[];
 for(let offset=0;offset<plans.length;offset+=16){const batch=await page.evaluate(({offset})=>{
  const out=[];for(let index=offset;index<Math.min(offset+16,window.balancePlans.length);index++)for(const {boss,stationary} of [{boss:false,stationary:false},{boss:true,stationary:false},...(window.balancePlans[index].region===3&&window.balancePlans[index].profile==='attack'?[{boss:false,stationary:true},{boss:true,stationary:true}]:[])]){
   FWTower.stop();const plan=window.balancePlans[index],fixture=boss||stationary?plan.bossState:plan,s=JSON.parse(JSON.stringify(fixture.state)),D=FWTowerDomain,E=FWExpedition;
   s.room=plan.region*E.depth(s)+(boss?E.depth(s):1);s.node=null;s.phase='route';s.combat=null;s.hp=D.stats(s).maxHp;E.select(s,E.current(s).find(n=>n.type===(boss?'boss':'normal'))?.id||E.current(s)[0].id);s.phase='combat';s.runes=0;
   FWStore.get().tower=s;FWStore.get().quiz=null;FWTower.enter();const a=window.balanceArena;cancelAnimationFrame(a.frame);a.frame=0;
   let encounterSeed=1009+index*71+(boss?1:0);Math.random=()=>{encounterSeed=(Math.imul(encounterSeed,1664525)+1013904223)>>>0;return encounterSeed/4294967296;};const initial=s.hp;let hurt=0,attacks=0,peak=0,minHp=s.hp,frames=0;const seen=new Map();
   while(!a.dead&&s.phase==='combat'&&frames<60*90){
    const live=a.enemies.filter(e=>e.hp>0&&!(e.spawnWait>0)),p=a.p,st=D.stats(s),target=live.reduce((best,e)=>!best||Math.hypot(e.x-p.x,e.y-p.y)<Math.hypot(best.x-p.x,best.y-p.y)?e:best,null);
    let x=0,y=0;if(target){const dx=target.x-p.x,dy=target.y-p.y,dist=Math.hypot(dx,dy)||1,desired=st.reach?st.reach*.65:190,approach=dist>desired?1:dist<desired*.6?-1:0;x=dx/dist*approach-dy/dist*.6;y=dy/dist*approach+dx/dist*.6;}
    for(const e of live){const d=Math.hypot(p.x-e.x,p.y-e.y)||1;if(d<70){x+=(p.x-e.x)/d*2;y+=(p.y-e.y)/d*2;}}
    x+=p.x<75?2:p.x>885?-2:0;y+=p.y<75?2:p.y>525?-2:0;a.axis=stationary?{x:0,y:0}:{x,y};
    if(!stationary&&(live.some(e=>e.tele>0&&Math.hypot(e.x-p.x,e.y-p.y)<220)||a.shots.some(b=>Math.hypot(b.x-p.x,b.y-p.y)<65)))a.dash();
    if(target&&Math.hypot(target.x-p.x,target.y-p.y)<(st.reach?230:350))a.skill();
    const hp=s.hp;a.update(1/60);hurt+=Math.max(0,hp-s.hp);minHp=Math.min(minHp,s.hp);peak=Math.max(peak,live.length);for(const e of a.enemies){const prev=seen.get(e.id)||0;attacks+=Math.max(0,(e.attacks||0)-prev);seen.set(e.id,e.attacks||0);}frames++;
   }
   out.push({weapon:plan.weapon,mode:plan.mode,difficulty:plan.difficulty,profile:plan.profile,region:plan.region+1,boss,stationary,level:s.weaponLevel,relics:s.relics,earned:fixture.earned,spent:fixture.spent,seconds:+(frames/60).toFixed(1),result:s.phase==='reward'?'clear':s.hp<=0?'dead':'timeout',hurt:+hurt.toFixed(1),initialHp:initial,minHp:+minHp.toFixed(1),attacks,peak});FWTower.stop();
  }return out;
 },{offset});results.push(...batch);console.log(`Actual engine: ${Math.min(offset+16,plans.length)}/${plans.length} legal build snapshots, ${results.length} encounters`);}
 fs.writeFileSync('/tmp/fraction-balance-v3-results.json',JSON.stringify(results,null,2));
 assert.equal(results.filter(r=>!r.stationary).length,768);assert.equal(results.filter(r=>r.stationary).length,96);console.log('Stationary strongest legal builds:',results.filter(r=>r.stationary&&r.result==='clear').length,'/96 clears');assert.ok(results.filter(r=>r.stationary&&r.boss).every(r=>r.result!=='clear'));assert.ok(results.every(r=>Number.isFinite(r.hurt)&&Number.isFinite(r.seconds)&&r.spent<=r.earned));assert.ok(results.filter(r=>r.region===4).some(r=>r.attacks>=3));
 const summary=[];for(let region=1;region<=4;region++){const rows=results.filter(r=>r.region===region&&!r.stationary);summary.push({region,clear:rows.filter(r=>r.result==='clear').length,total:rows.length,meanSeconds:Math.round(rows.reduce((n,r)=>n+r.seconds,0)/rows.length),meanAttacks:Math.round(rows.reduce((n,r)=>n+r.attacks,0)/rows.length),meanHurt:Math.round(rows.reduce((n,r)=>n+r.hurt,0)/rows.length)});}console.log(JSON.stringify(summary));const clearMean=region=>{const rows=results.filter(r=>!r.stationary&&!r.boss&&r.region===region&&r.result==='clear');return rows.reduce((n,r)=>n+r.seconds,0)/rows.length;};assert.ok(clearMean(4)>=clearMean(2)*.9,'late normal combat must not collapse in duration');fs.writeFileSync('/tmp/fraction-balance-v3-summary.json',JSON.stringify(summary,null,2));assert.deepEqual(errors,[]);
 console.log('Balance browser: forge cap, reload, 2-of-6 mix controls, four touch widths and 768 moving / 96 stationary full-health actual-engine encounters passed. Bot outcomes are diagnostics, not student clear rates.');
 }finally{await browser.close();}}
main().catch(e=>{console.error(e);process.exitCode=1;});
