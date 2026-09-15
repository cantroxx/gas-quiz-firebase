#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright-core');
async function main(){const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1180,height:820}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/tower.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('constructor(s){','constructor(s){window.balanceArena=this;')});});await page.goto('http://127.0.0.1:5478/fraction-world/');await page.clock.install();await page.click('#enter-tower');await page.click('#tower-start');
 await page.evaluate(seed=>{
  window.balancePlans=[];const C=FWContent,D=FWTowerDomain,E=FWExpedition;
  for(const w of C.weapons)for(const mode of ['short','long'])for(const difficulty of ['hard','expert'])for(const profile of ['attack','survival'])for(const branch of ['a','b']){
   const s=E.create(w.id,difficulty,mode,'dawn',seed),snapshots=[];let earned=0,spent=0;
   const priority=profile==='attack'?['twin','ember','storm','meteor','crown','echo','pierce','crit','luck','torch','coil','nova']:['heart','leech','heal','shield','frost','icewall','root','bark','snow','acorn','clock','shell'];
   const score=id=>{const i=priority.indexOf(id);return i<0?100:i;};let randomSeed=23+seed;const random=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};
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
     if(n.type==='forge'){while(E.upgradeWeapon(s,branch))spent+=D.modern(s)?[30,60,110,170,250][s.weaponLevel-1]:0;
      if(profile==='survival')for(const id of s.relics){const cost=D.upgradeCost(s,id);if(D.upgrade(s,id))spent+=cost;}}
     E.finish(s);
    }
    while(s.phase==='route'&&s.weaponLevel<2){const cost=E.weaponCost(s);if(!E.upgradeWeapon(s))break;spent+=cost;}
   }
   for(const snapshot of snapshots)window.balancePlans.push({weapon:w.id,mode,difficulty,profile,branch,...snapshot});
  }
 },Number(process.env.FW_TACTICS_SEED||429));
 if(process.env.FW_TACTICS_LATE_ONLY)await page.evaluate(()=>{window.balancePlans=window.balancePlans.filter(p=>p.region===3);});
 const plans=await page.evaluate(()=>window.balancePlans.map((p,i)=>({i,weapon:p.weapon,mode:p.mode,difficulty:p.difficulty,profile:p.profile,region:p.region}))),results=[];
 for(let offset=0;offset<plans.length;offset+=16){const batch=await page.evaluate(({offset})=>{
  const out=[];for(let index=offset;index<Math.min(offset+16,window.balancePlans.length);index++)for(const {boss,parry} of [{boss:false,parry:true},{boss:true,parry:true},...(window.balancePlans[index].region===3?[{boss:true,parry:false}]:[])]){
   FWTower.stop();const plan=window.balancePlans[index],fixture=boss?plan.bossState:plan,s=JSON.parse(JSON.stringify(fixture.state)),D=FWTowerDomain,E=FWExpedition;
   s.room=plan.region*E.depth(s)+(boss?E.depth(s):1);s.node=null;s.phase='route';s.combat=null;s.hp=D.stats(s).maxHp;E.select(s,E.current(s).find(n=>n.type===(boss?'boss':'normal'))?.id||E.current(s)[0].id);s.phase='combat';s.runes=0;
   FWStore.get().tower=s;FWStore.get().quiz=null;FWTower.enter();const a=window.balanceArena;cancelAnimationFrame(a.frame);a.frame=0;
   let encounterSeed=1009+index*71+(boss?1:0);Math.random=()=>{encounterSeed=(Math.imul(encounterSeed,1664525)+1013904223)>>>0;return encounterSeed/4294967296;};const initial=s.hp;let hurt=0,attacks=0,peak=0,minHp=s.hp,frames=0;const seen=new Map();
   while(!a.dead&&s.phase==='combat'&&frames<60*90){
    const live=a.enemies.filter(e=>e.hp>0&&!(e.spawnWait>0)),p=a.p,st=D.stats(s),target=live.reduce((best,e)=>!best||Math.hypot(e.x-p.x,e.y-p.y)<Math.hypot(best.x-p.x,best.y-p.y)?e:best,null);
    let x=0,y=0;if(target){const dx=target.x-p.x,dy=target.y-p.y,dist=Math.hypot(dx,dy)||1,desired=st.reach?st.reach*.65:190,approach=dist>desired?1:dist<desired*.6?-1:0;x=dx/dist*approach-dy/dist*.6;y=dy/dist*approach+dx/dist*.6;}
    for(const e of live){const d=Math.hypot(p.x-e.x,p.y-e.y)||1;if(d<70){x+=(p.x-e.x)/d*2;y+=(p.y-e.y)/d*2;}}

    if(parry){const star=a.shots.filter(b=>b.critical&&b.life>0).sort((u,v)=>Math.hypot(u.x-p.x,u.y-p.y)-Math.hypot(v.x-p.x,v.y-p.y))[0];if(star){const time=Math.max(0,Math.min(1,((p.x-star.x)*star.vx+(p.y-star.y)*star.vy)/(star.vx*star.vx+star.vy*star.vy))),tx=star.x+star.vx*time,ty=star.y+star.vy*time,dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy);x=d>8?dx/d:0;y=d>8?dy/d:0;if(Math.hypot(star.x-p.x,star.y-p.y)<72)a.parry();}for(const enemy of live)if(enemy.intent?.critical&&enemy.intent.kind!=='star'&&enemy.intent.left<.16&&Math.hypot(enemy.x-p.x,enemy.y-p.y)<150)a.parry();}
    for(const h of a.tactics.hazards){const dx=p.x-h.x,dy=p.y-h.y,d=Math.hypot(dx,dy)||1;if(d<h.r+35){x+=dx/d*3||2;y+=dy/d*3||1;}}
    x+=p.x<75?2:p.x>885?-2:0;y+=p.y<75?2:p.y>525?-2:0;a.axis={x,y};
    if(a.tactics.window<=0&&(live.some(e=>e.tele>0&&Math.hypot(e.x-p.x,e.y-p.y)<220)||a.shots.some(b=>(!parry||!b.critical)&&Math.hypot(b.x-p.x,b.y-p.y)<65)))a.dash();
    if(target&&Math.hypot(target.x-p.x,target.y-p.y)<(st.reach?230:350))a.skill();
    const hp=s.hp;a.update(1/60);hurt+=Math.max(0,hp-s.hp);minHp=Math.min(minHp,s.hp);peak=Math.max(peak,live.length);for(const e of a.enemies){const prev=seen.get(e.id)||0;attacks+=Math.max(0,(e.attacks||0)-prev);seen.set(e.id,e.attacks||0);}frames++;
   }
   out.push({weapon:plan.weapon,mode:plan.mode,difficulty:plan.difficulty,profile:plan.profile,region:plan.region+1,boss,parry,branch:plan.branch,parries:a.tactics.successes,level:s.weaponLevel,relics:s.relics,earned:fixture.earned,spent:fixture.spent,seconds:+(frames/60).toFixed(1),result:s.phase==='reward'?'clear':s.hp<=0?'dead':'timeout',hurt:+hurt.toFixed(1),initialHp:initial,minHp:+minHp.toFixed(1),attacks,peak});FWTower.stop();
  }return out;
 },{offset});results.push(...batch);console.log(`Actual engine: ${Math.min(offset+16,plans.length)}/${plans.length} legal build snapshots, ${results.length} encounters`);}

 fs.writeFileSync('/tmp/fraction-tactics-balance-results.json',JSON.stringify(results,null,2));
 const summary=[];for(const difficulty of ['hard','expert'])for(const parry of [true,false]){const rows=results.filter(r=>r.region===4&&r.boss&&r.difficulty===difficulty&&r.parry===parry);summary.push({difficulty,parry,total:rows.length,clear:rows.filter(r=>r.result==='clear').length,dead:rows.filter(r=>r.result==='dead').length,timeout:rows.filter(r=>r.result==='timeout').length,meanParries:+(rows.reduce((n,r)=>n+r.parries,0)/rows.length).toFixed(1)});}console.log(JSON.stringify(summary));fs.writeFileSync('/tmp/fraction-tactics-balance-summary.json',JSON.stringify(summary,null,2));assert.ok(results.every(r=>Number.isFinite(r.hurt)&&r.spent<=r.earned));assert.ok(!results.some(r=>r.region===4&&r.boss&&r.difficulty==='expert'&&!r.parry&&r.result==='clear'));assert.deepEqual(errors,[]);console.log('Actual v4 combat diagnostics complete; synthetic controllers are not student success rates.');
 }finally{await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,5000))]);}}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
