'use strict';
const assert=require('node:assert/strict'),A=require('../../public/fraction-world/adventure-rules'),E=require('../../public/fraction-world/expedition-domain'),D=require('../../public/fraction-world/tower-domain');
for(const tier of Object.keys(A.tiers)){
 const s=A.apply(E.create('wand','hard'),tier);assert.ok(E.valid(s));assert.equal(E.total(s),24);
 let prior=0;for(let region=0;region<4;region++){s.room=region*6+6;const spec=D.roomSpec(s);assert.ok(spec.hpScale>prior);prior=spec.hpScale;assert.equal(spec.maxAlive,A.tiers[tier].cap[region]);}
 s.roomStartKills=5;s.kills=10;const count=tier==='beginner'?5:tier==='intermediate'?2:0;
 for(let n=0;n<count;n++){assert.equal(A.fail(s),true);assert.equal(s.kills,5);assert.equal(s.revivesUsed,n+1);}
 if(tier!=='beginner')assert.equal(A.fail(s),false);assert.ok(E.valid(s));
 s.phase='combat';D.completeRoom(s);assert.equal(s.coinFailures,0);assert.equal(s.revivesUsed,count);
}
for(let room=1;room<=32;room++){
 const s=E.create('bow','expert','long','dawn',123);s.room=room;s.best=room-1;s.weaponLevel=2;s.relics=['ember'];s.crystals=67;s.correct=7;s.quizAnswered=8;
 assert.equal(E.migrate(s),true);assert.equal(s.tier,'advanced');assert.equal(E.total(s),24);assert.equal(s.crystals,67);assert.equal(s.correct,7);assert.deepEqual(s.relics,['ember']);assert.equal(s.weaponLevel,2);assert.ok(E.valid(s),'migration room '+room);assert.equal(E.migrate(s),false);
}
const base=D.roomSpec(E.create('wand','hard'));for(const [tier,t] of Object.entries(A.tiers)){const spec=D.roomSpec(A.apply(E.create('wand','hard'),tier));assert.ok(Math.abs(spec.hpScale/base.hpScale-t.hp)<1e-10);}
console.log('Adventure v2: difficulty bundles, finite revivals, monotonic regional scaling, all 32 legacy map positions PASS');

const old=E.create('wand','hard');delete old.balance;delete old.forgeUses;delete old.activeMixes;delete old.discoveredMixes;E.migrate(old);assert.ok(E.valid(old));
