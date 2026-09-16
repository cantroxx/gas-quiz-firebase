'use strict';
const assert=require('node:assert/strict'),C=require('../../public/fraction-world/content'),D=require('../../public/fraction-world/tower-domain'),E=require('../../public/fraction-world/expedition-domain');
assert.equal(C.weapons.length,12);assert.equal(C.relics.length,40);for(const tag of ['fire','ice','storm','earth','star'])assert.equal(C.relics.filter(r=>r.tag===tag).length,8);
for(const mode of ['short','long'])for(const difficulty of ['hard','expert'])for(let seed=0;seed<50;seed++){
 const s=E.create('wand',difficulty,mode,'dawn',seed);assert.ok(E.valid(s));let combats=0,questions=0;
 while(s.phase!=='ended'){
  const options=E.current(s);assert.equal(options.length,E.step(s)===E.depth(s)-1?1:3);assert.ok(!E.select(s,'invalid'));const n=options.find(n=>n.type==='normal')||options.find(n=>n.type==='forge')||options.find(n=>n.type==='event')||options[0];assert.ok(E.select(s,n.id));assert.equal(E.select(s,n.id),false);
  if(s.phase==='charge'){questions+=3;s.phase='combat';}
  if(s.phase==='combat'){combats++;if(D.roomSpec(s).boss)questions+=2;D.completeRoom(s);assert.equal(D.completeRoom(s),false);D.equip(s,s.offers[0],s.relics[0]);}
  else if(s.phase==='reward')D.equip(s,s.offers[0],s.relics[0]);else E.finish(s);
  assert.ok(E.valid(JSON.parse(JSON.stringify(s))));
 }
 assert.equal(s.visited.length,E.total(s));assert.equal(s.bosses.length,4);assert.equal(questions,32);assert.equal(combats,mode==='short'?16:24);assert.ok(s.crystals>=396);
}
const s=E.create('wand','hard');s.balance=2;s.crystals=300;assert.ok(E.upgradeWeapon(s));assert.ok(E.upgradeWeapon(s));assert.equal(E.upgradeWeapon(s,'a'),false);s.room=5;E.select(s,E.current(s).find(n=>n.type==='forge').id);assert.equal(E.upgradeWeapon(s,'x'),false);assert.equal(E.upgradeWeapon(s,'a'),false);assert.equal(s.crystals,260);s.room=11;assert.equal(E.weaponCap(s),3);assert.ok(E.upgradeWeapon(s,'a'));assert.equal(E.upgradeWeapon(s),false);s.room=17;assert.equal(E.weaponCap(s),5);assert.ok(E.upgradeWeapon(s));assert.ok(E.upgradeWeapon(s));assert.equal(s.crystals,75);assert.equal(E.upgradeWeapon(s),false);const p={unlocks:[]};E.sync(p,s);assert.ok(p.unlocks.includes('awaken'));const fresh=E.create('wand','hard');assert.equal(fresh.crystals,0);assert.equal(fresh.weaponLevel,0);
E.finish(s);s.keys=1;assert.ok(E.openHidden(s));const cash=s.crystals;assert.ok(E.buy(s,2));assert.equal(s.crystals,cash-35);assert.equal(E.buy(s,2),false);s.hiddenOpen=false;s.purchase=false;assert.equal(E.openHidden(s),false);
for(const m of C.mixes){const a=E.create('wand','hard');a.relics=[...C.relics.filter(r=>r.tag===m.a).slice(0,2),...C.relics.filter(r=>r.tag===m.b).slice(0,2)].map(r=>r.id);assert.ok(E.mixes(a).some(x=>x.id===m.id));}
const bad=JSON.parse(JSON.stringify(fresh));bad.maps[0][0][0].id='wrong';assert.equal(E.valid(bad),false);
console.log('Expedition: 200 seeded full runs, two lengths/difficulties, 32 questions, map gates, minimum economy, weapon growth, hidden purchase idempotency, unlock persistence, 10 mixed sets passed.');

// Existing expeditions retain purchased progression; money cannot skip new region caps.
const legacy=E.create('wand','hard');delete legacy.balance;legacy.crystals=9999;legacy.room=5;E.select(legacy,E.current(legacy).find(n=>n.type==='forge').id);for(let i=0;i<5;i++)assert.ok(E.upgradeWeapon(legacy,'a'));assert.ok(E.valid(legacy));
for(const mode of ['short','long'])for(const weapon of C.weapons){const x=E.create(weapon.id,'hard',mode);x.balance=2;x.crystals=99999;x.node={type:'forge'};x.phase='room';for(const [region,cap] of [2,3,5,5].entries()){x.room=region*E.depth(x)+1;while(x.weaponLevel<cap)assert.ok(E.upgradeWeapon(x,'a'));const coins=x.crystals;assert.equal(E.upgradeWeapon(x,'a'),false);assert.equal(x.crystals,coins);assert.equal(E.weaponCap(JSON.parse(JSON.stringify(x))),cap);}}
assert.equal(C.looks.filter(l=>!l.unlock).length,2);assert.ok(C.looks.find(l=>l.id==='ranger'&&!l.unlock));
console.log('Regional upgrade caps resist unlimited currency for all 12 weapons and both modes; legacy upgrades and two starter looks preserved.');

for(const mode of ['short','long']){const x=E.create('wand','hard',mode);x.balance=2;x.crystals=99999;x.relics=['ember','heart'];x.node={type:'forge'};x.phase='room';for(const [region,cap] of [1,2,3,3].entries()){x.room=region*E.depth(x)+1;for(const id of x.relics){while(D.level(x,id)<cap)assert.ok(D.upgrade(x,id));const coins=x.crystals;assert.equal(D.upgrade(x,id),false);assert.equal(x.crystals,coins);}}}

require('./tower-balance-v3.test.js');
require('./tactics.test.js');

require('./adventure-v2.test.js');

require('./study.test.js');

require("../study-town/domain.test.js");
