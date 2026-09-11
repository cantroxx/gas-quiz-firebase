'use strict';
const assert=require('node:assert/strict');
const C=require('../../public/fraction-world/content.js');
const M=require('../../public/fraction-world/math.js');
const T=require('../../public/fraction-world/tower-domain.js');
const S=require('../../public/fraction-world/studio-domain.js');
let seed=183487;const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
for(let k=0;k<6;k++)for(let i=0;i<3000;i++){
  const q=M.generate(k,rng);assert.ok(q.d>=3&&q.d<=12);assert.ok(q.a>=0&&q.b>=0&&q.n>=0);assert.equal(q.n,q.op==='+'?q.a+q.b:q.a-q.b);
  const p=M.parts(q.n,q.d);assert.ok(M.matches(q,p.whole,p.num));assert.ok(M.matches(q,0,q.n));assert.ok(!M.matches(q,0,q.n+1));assert.ok(!M.matches(q,'-1',q.n));assert.ok(!M.matches(q,0,''));
  if(k===0)assert.ok(q.n<q.d);if(k===2)assert.ok(q.n>=q.d);if(k===5)assert.ok(q.a%q.d<q.b%q.d);
}
assert.ok(M.matches({n:2,d:4},0,1,2));assert.ok(!M.matches({n:2,d:4},0,1,0));
for(const weapon of C.weapons){const t=T.create(weapon.id);for(let r=1;r<=24;r++){assert.equal(t.room,r);assert.equal(T.roomSpec(t).biome,Math.floor((r-1)/6));t.phase='combat';assert.ok(T.completeRoom(t,rng));assert.ok(!T.completeRoom(t,rng));assert.equal(new Set(t.offers).size,t.offers.length);assert.ok(t.offers.every(id=>!t.relics.includes(id)));if(t.relics.length<8)assert.ok(T.equip(t,t.offers[0]));else assert.ok(T.equip(t,t.offers[0],t.relics[0]));assert.ok(t.hp<=T.stats(t).maxHp);}assert.equal(t.phase,'ended');assert.equal(t.cleared,true);}
const s=S.create(['lumi','rio','sora']);assert.throws(()=>S.create(['lumi','lumi','sora']));assert.ok(S.validatePlan(s,['vocal']));
s.cash=0;assert.ok(S.validatePlan(s,['vocal','rest','rest']));assert.equal(S.validatePlan(s,['busk','vocal','rest']),'');
s.cash=200;assert.ok(S.buy(s,'facility','vocal'));assert.equal(s.facilities.vocal,1);assert.ok(S.buy(s,'outfit','mint'));const cash=s.cash;assert.ok(S.buy(s,'outfit','mint'));assert.equal(s.cash,cash);assert.ok(!S.selectSong(s,'super'));
for(let day=1;day<=28;day++){
  assert.equal(s.day,day);S.applyDay(s,['busk','rest','team']);assert.throws(()=>S.applyDay(s,['rest','rest','rest']));
  if(s.phase==='event')S.chooseEvent(s,0);if(s.phase==='concert'){const before=s.cash;const result=S.perform(s);assert.ok(s.cash>before);assert.equal(result.checks.length,4);assert.throws(()=>S.perform(s));}S.advance(s);assert.ok(s.members.every(m=>m.energy>=0&&m.energy<=100));
}
assert.equal(s.phase,'ended');assert.equal(s.history.length,4);assert.ok(!s.cleared,'Resting and busking alone must not clear the season');
const a=S.create(['lumi','rio','sora']),b=JSON.parse(JSON.stringify(a));a.members.forEach(m=>m.energy=10);S.applyDay(a,['vocal','vocal','vocal']);S.applyDay(b,['vocal','vocal','vocal']);assert.ok(S.average(a,'vocal')<S.average(b,'vocal'));
console.log('Fraction World domain: 18,000 generated problems, 6 full tower equipment runs, season transitions, economy, fatigue and failure gates passed.');
