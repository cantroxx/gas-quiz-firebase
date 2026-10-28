'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../../public/fraction-world/content'),D=require('../../public/fraction-world/tower-domain'),E=require('../../public/fraction-world/expedition-domain'),Combat=require('../../public/fraction-world/combat-domain');
const context={window:{},FWTowerDomain:D,FWContent:C,FWCombat:Combat,FWExpedition:E,FWUI:{$:()=>({open:false}),sound:()=>{},toast:()=>{}}};vm.runInNewContext(fs.readFileSync(require.resolve('../../public/fraction-world/combat-expansion.js'),'utf8'),context);
class Arena{
 constructor(m){this.s=E.create('wand','hard');this.s.relics=[...C.relics.filter(r=>r.tag===m.a).slice(0,2),...C.relics.filter(r=>r.tag===m.b).slice(0,2)].map(r=>r.id);this.p={x:480,y:300,inv:0,skill:0,dash:0};this.enemies=[{id:'a',hp:1000,x:550,y:300,r:15},{id:'b',hp:1000,x:570,y:300,r:15}];this.bullets=[];this.shots=[];this.pending=[];this.fx=[];this.time=0;this.moving=false;context.window.FWCombatExpansion.init(this);}
 hitEnemy(e,d){e.hp-=d;}hurt(d){this.s.hp-=d;}dash(){this.p.dash=1.8;}skill(){this.p.skill=9;this.hitEnemy(this.enemies[0],75);}draw(){}effect(...args){this.fx.push(args);}moveBody(e,x,y){e.x+=x;e.y+=y;}
}
context.window.FWCombatExpansion.install(Arena);
for(const m of C.mixes){const a=new Arena(m);switch(m.id){
 case 'fire-ice':a.enemies[0].chill=1;a.hitEnemy(a.enemies[0],20);assert.ok(a.enemies[1].hp<1000);break;
 case 'fire-storm':a.dash();assert.equal(a.features.zones.length,1);break;
 case 'fire-earth':a.hurt(10);assert.ok(a.enemies[0].hp<1000);break;
 case 'fire-star':a.skill();assert.equal(a.pending.length,1);break;
 case 'ice-storm':a.dash();assert.equal(a.enemies[0].chill,2);break;
 case 'ice-earth':a.featureUpdate(.1);assert.equal(a.features.shield,15);break;
 case 'ice-star':a.skill();assert.equal(a.enemies[0].frozen,.8);assert.equal(a.enemies[1].frozen,undefined);break;
 case 'storm-earth':a.moving=true;a.featureUpdate(2.1);assert.equal(a.features.shield,12);break;
 case 'storm-star':for(let i=0;i<8;i++)a.fire(D.stats(a.s),a.p,a.enemies);assert.ok(a.fx.some(f=>f[0]==='chain'));break;
 case 'earth-star':a.featureUpdate(.1);assert.equal(a.bullets.length,0);a.manualActive=.6;a.featureUpdate(.1);assert.equal(a.features.spirits,1);assert.ok(a.bullets.length);break;
 }}
const a=new Arena(C.mixes[0]);a.s.rescue=true;a.s.hp=1;a.hurt(100);assert.equal(a.s.rescue,false);assert.equal(a.p.inv,2);assert.equal(a.s.hp,D.stats(a.s).maxHp*.3);
console.log('Expedition combat: all 10 mixed effects, skill hit-only freeze and one-use rescue passed.');

// Poison must bypass shields, but never bypass the one-use rescue item.
for(const tier of ['beginner','intermediate','advanced']){
 const a=new Arena(C.mixes[0]);
 require('../../public/fraction-world/adventure-rules').apply(a.s,tier);
 a.s.phase='route';a.s.hiddenOpen=true;a.s.hiddenStock=[{id:'relic',tag:'fire',price:40},{id:'mod',price:55},{id:'rescue',price:45}];a.s.crystals=45;
 assert.equal(E.buy(a.s,2),true);assert.equal(a.s.crystals,0);
 a.s=JSON.parse(JSON.stringify(a.s));assert.equal(a.s.rescue,true);assert.ok(E.valid(a.s));
 a.s.phase='combat';a.s.hp=1;a.features.shield=30;a.p.inv=1;
 a.tactics={poison:4,poisonClock:0};a.poisonTick=true;
 a.hurt(3,'poison');
 assert.equal(a.s.hp,D.stats(a.s).maxHp*.3,`${tier}: poison triggers rescue`);
 assert.equal(a.s.rescue,false);assert.equal(a.p.inv,2);assert.equal(a.features.shield,30);
 assert.equal(a.tactics.poison,0);assert.equal(a.tactics.poisonClock,1);
 assert.equal(a.s.phase,'combat');assert.equal(a.s.revivesUsed,0);assert.equal(a.s.retryPending,false);
 a.poisonTick=false;const restoredHp=a.s.hp;a.hurt(100);assert.equal(a.s.hp,restoredHp);
 a.p.inv=0;a.features.shield=0;a.hurt(1000);assert.ok(a.s.hp<=0,'item only saves once');
}
{
 const a=new Arena(C.mixes[0]);a.s.rescue=true;a.features.shield=30;a.s.hp=10;
 a.hurt(20);assert.equal(a.s.hp,10);assert.equal(a.s.rescue,true,'shield prevents unnecessary consumption');
 a.poisonTick=true;const hp=a.s.hp,shield=a.features.shield;a.hurt(2);
 assert.ok(a.s.hp<hp);assert.equal(a.s.rescue,true);assert.equal(a.features.shield,shield);
}
console.log('Rescue: purchase/restore, poison in all tiers, shield priority, protection and single consumption passed.');

// Exercise the real Arena damage method with both installed combat extensions.
context.FWTacticsRules=require('../../public/fraction-world/tactics-domain');
context.FWTowerUI={};context.FWAdventure=require('../../public/fraction-world/adventure-rules');
vm.runInNewContext(fs.readFileSync(require.resolve('../../public/fraction-world/combat-tactics.js'),'utf8'),context);
context.FWTactics=context.window.FWTactics;
let RealArena;
context.FWCombatExpansion={install(Type){RealArena=Type;context.window.FWCombatExpansion.install(Type);}};
vm.runInNewContext(fs.readFileSync(require.resolve('../../public/fraction-world/tower.js'),'utf8'),context);
for(const kind of ['poison-tick','poison-shot','contact']){
 const a=Object.assign(Object.create(RealArena.prototype),new Arena(C.mixes[0]));
 context.FWAdventure.apply(a.s,'intermediate');a.s.phase='combat';a.s.rescue=true;a.s.hp=1;
 a.spec={damageScale:1};a.texts=[];a.tactics={poison:4,poisonClock:0};a.effect=()=>{};
 if(kind==='poison-tick'){a.p.inv=1;a.poisonTick=true;a.hurt(3);a.poisonTick=false;}
 else if(kind==='poison-shot'){const shot={life:1,poison:true};a.resolveShotHit(shot);assert.equal(shot.life,0);}
 else a.hurt(100);
 assert.equal(a.s.hp,D.stats(a.s).maxHp*.3,kind);assert.equal(a.s.rescue,false);
 assert.equal(a.tactics.poison,0,`${kind}: no poison remains during rescue protection`);
 assert.equal(a.s.phase,'combat');assert.equal(a.s.revivesUsed,0);assert.equal(a.p.inv,2);
 const hp=a.s.hp;a.hurt(100);assert.equal(a.s.hp,hp);
}
console.log('Real Arena: contact, lethal poison tick and poison shot preserve rescue protection and difficulty retries.');

// Version 3 combat limits: control resistance, shared shield timing and proc budgets.
{
 const ice=new Arena(C.mixes.find(m=>m.id==='ice-star'));ice.enemies[0].type='boss';ice.skill();assert.equal(ice.enemies[0].frozen,.25);assert.equal(ice.enemies[0].freezeGuard,5);ice.enemies[0].frozen=0;ice.p.skill=0;ice.skill();assert.equal(ice.enemies[0].frozen,0);ice.featureUpdate(5.1);ice.p.skill=0;ice.skill();assert.equal(ice.enemies[0].frozen,.25);
 const shield=new Arena(C.mixes.find(m=>m.id==='ice-earth'));shield.featureUpdate(.1);assert.equal(shield.features.shield,15);shield.features.shield=4;shield.featureUpdate(10);assert.equal(shield.features.shield,4);shield.features.shield=0;shield.featureUpdate(10);assert.equal(shield.features.shield,15);
 const orb=new Arena(C.mixes[0]);orb.s.relics=[];orb.s.weapon='orb';orb.s.weaponLevel=3;orb.s.branch='a';orb.features.mixes=[];orb.hitEnemy(orb.enemies[0],10);const health=orb.enemies[1].hp;orb.hitEnemy(orb.enemies[0],10);assert.equal(orb.enemies[1].hp,health);orb.featureUpdate(.5);orb.hitEnemy(orb.enemies[0],10);assert.ok(orb.enemies[1].hp<health);
 const shots=new Arena(C.mixes[0]);shots.s.relics=['twin'];shots.s.weapon='bow';shots.s.weaponLevel=3;shots.s.branch='b';shots.fire(D.stats(shots.s),shots.p,shots.enemies);assert.equal(shots.bullets.length,3);assert.equal(shots.bullets[1].damage,shots.bullets[0].damage*.45);
 const wait=new Arena(C.mixes[0]);wait.enemies[0].spawnWait=.8;wait.hitEnemy(wait.enemies[0],100);assert.equal(wait.enemies[0].hp,1000);
 const saved=new Arena(C.mixes[0]);context.window.FWCombatExpansion.init(saved,{features:{leechHeal:8,shield:4,cool:{iceShield:6}}});assert.equal(saved.features.leechHeal,8);assert.equal(saved.features.cool.iceShield,6);
}
console.log('Balance v3 combat: boss freeze resistance, shield refill gap, orb explosion cooldown, weaker extra arrows, spawn invulnerability and heal-budget restore passed.');
