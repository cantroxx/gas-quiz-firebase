'use strict';
const assert=require('node:assert/strict'),C=require('../../public/fraction-world/content'),D=require('../../public/fraction-world/tower-domain'),E=require('../../public/fraction-world/expedition-domain');
function forge(s,r){s.node=null;s.phase='route';s.room=r*E.depth(s)+E.depth(s)-1;assert.ok(E.select(s,E.current(s).find(n=>n.type==='forge').id));}
for(const mode of ['short','long'])for(const difficulty of ['hard','expert'])for(const w of C.weapons){
 const s=E.create(w.id,difficulty,mode);s.crystals=1000;s.relics=['ember'];
 assert.equal(E.weaponCost(s),30);assert.ok(E.upgradeWeapon(s));assert.equal(E.weaponCost(s),60);assert.ok(E.upgradeWeapon(s));assert.equal(E.upgradeWeapon(s,'a'),false);
 forge(s,0);assert.ok(D.upgrade(s,'ember'));assert.equal(D.upgrade(s,'ember'),false);assert.equal(D.forgeRemaining(s),1);
 forge(s,1);assert.ok(E.upgradeWeapon(s,'a'));assert.equal(E.upgradeWeapon(s),false);assert.equal(D.upgrade(s,'ember'),false);
 forge(s,2);assert.ok(E.upgradeWeapon(s));assert.ok(D.upgrade(s,'ember'));assert.equal(D.forgeRemaining(s),0);assert.equal(E.upgradeWeapon(s),false);
 const restore=JSON.parse(JSON.stringify(s));assert.ok(E.valid(restore));assert.equal(D.forgeRemaining(restore),0);assert.equal(D.upgrade(restore,'ember'),false);
 forge(s,3);assert.equal(E.upgradeWeapon(s),false);s.bosses=[0,1,2];assert.ok(E.upgradeWeapon(s));assert.ok(D.upgrade(s,'ember'));assert.equal(s.crystals,95);assert.equal(E.upgradeWeapon(s),false);assert.equal(D.upgrade(s,'ember'),false);
 assert.ok(E.valid(s));assert.equal(s.weaponLevel,5);assert.equal(D.level(s,'ember'),3);
 // A forge has a shared two-action budget, including purchases of the first weapon levels.
 const t=E.create(w.id,difficulty,mode);t.crystals=1000;t.relics=['ember','heart','frost'];forge(t,0);assert.ok(E.upgradeWeapon(t));assert.ok(D.upgrade(t,'heart'));const cash=t.crystals;assert.equal(E.upgradeWeapon(t),false);assert.equal(D.upgrade(t,'ember'),false);assert.equal(t.crystals,cash);
}
for(const mode of ['short','long'])for(const difficulty of ['hard','expert']){
 const s=E.create('wand',difficulty,mode);let lastHp=0,lastDamage=0,lastPack=0;
 for(let r=0;r<4;r++){s.room=r*E.depth(s)+1;const a=D.roomSpec(s);assert.ok(a.hpScale>lastHp);assert.ok(a.damageScale>=lastDamage);assert.ok(a.packSize>=lastPack);lastHp=a.hpScale;lastDamage=a.damageScale;lastPack=a.packSize;}
 s.relics=['heal','root'];s.hp=10;s.phase='combat';D.completeRoom(s);assert.equal(s.hp,22);
}
const m=E.create('wand','hard');m.relics=['ember','meteor','frost','pierce','storm','boots','heart','leech'];assert.equal(E.availableMixes(m).length,6);assert.equal(E.mixes(m).length,2);assert.equal(E.toggleMix(m,E.availableMixes(m)[2].id),false);const first=E.mixes(m)[0].id;assert.ok(E.toggleMix(m,first));assert.ok(E.toggleMix(m,E.availableMixes(m)[2].id));assert.equal(E.mixes(m).length,2);m.phase='combat';assert.equal(E.toggleMix(m,E.mixes(m)[0].id),false);m.phase='route';const p={unlocks:[]};E.sync(p,m);assert.ok(p.unlocks.includes('mix3'));assert.equal(m.discoveredMixes.length,6);assert.ok(E.valid(JSON.parse(JSON.stringify(m))));
const corrupt=JSON.parse(JSON.stringify(m));corrupt.activeMixes=['fire-ice','fire-earth','ice-earth'];assert.equal(E.valid(corrupt),false);corrupt.activeMixes=[];corrupt.forgeUses={'invalid':2};assert.equal(E.valid(corrupt),false);
const sum=mode=>{const s=E.create('wand','hard',mode);return 4*((E.depth(s)-3)*D.roomSpec(s).reward+45);};assert.ok(Math.abs(sum('short')-sum('long'))<=4);
const built=E.create('wand','hard');built.weaponLevel=5;built.branch='b';built.relics=['ember','storm','twin','heart','frost','clock','heal','boots'];const st=D.stats(built),base=D.stats(E.create('wand','hard'));assert.ok((st.damage*st.effectiveCount/st.interval)/(base.damage/base.interval)<5);assert.equal(D.projectilePower(built,0),1);assert.equal(D.projectilePower(built,1),.45);
console.log('Balance v3: 48 weapon/mode/difficulty growth paths, exact 620+285 cost, shared forge limit/reload, boss gate, 2 of 6 mixes, discovery unlock, recovery limit, regional pressure and equal route economy passed.');
