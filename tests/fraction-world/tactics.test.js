'use strict';
const assert=require('node:assert/strict'),R=require('../../public/fraction-world/tactics-domain'),E=require('../../public/fraction-world/expedition-domain'),D=require('../../public/fraction-world/tower-domain');
for(const difficulty of ['hard','expert'])for(const mode of ['short','long']){
 const s=E.create('wand',difficulty,mode);assert.equal(s.balance,4);assert.ok(E.valid(s));assert.ok(R.active(s));for(let r=0;r<4;r++){s.room=r*E.depth(s)+1;const spec=D.roomSpec(s);assert.equal(R.guard(s,spec,'boss')>0,r>=2);assert.equal(R.guard(s,{...spec,elite:true},'charger')>0,r>=1);}
 assert.ok(R.timing(s).success<R.timing(s).miss);assert.ok(R.timing(s).warning>R.timing(s).window);
 for(const balance of [undefined,2,3]){s.balance=balance;assert.ok(E.valid(s));assert.equal(R.active(s),false);}
}
assert.ok(R.timing({difficulty:'hard'}).window>R.timing({difficulty:'expert'}).window);
const patterns=new Set();for(let r=0;r<4;r++)for(let t=0;t<12;t++)for(const type of ['boss','charger','shooter','orbiter','healer','splitter'])patterns.add(R.pattern(type,r,t));for(const kind of ['star','slam','fan','spiral','missiles','poison','mend','charge'])assert.ok(patterns.has(kind));
const b={x:0,y:0,vx:100,vy:0,seek:.85};R.steer(b,{x:0,y:100},.1);assert.ok(b.vy>0);assert.ok(Math.abs(Math.hypot(b.vx,b.vy)-100)<1e-8);for(let i=0;i<10;i++)R.steer(b,{x:0,y:100},.1);const v=[b.vx,b.vy];R.steer(b,{x:0,y:-100},1);assert.deepEqual([b.vx,b.vy],v);
console.log('Tactics: version-4 opt-in, legacy saves, progressive guards, eight attack roles, parry timing and limited missile tracking passed.');
