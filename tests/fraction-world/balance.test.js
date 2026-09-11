'use strict';
const assert=require('node:assert/strict');
const S=require('../../public/fraction-world/studio-domain.js');
const C=require('../../public/fraction-world/content.js');
const witness=require('./season-witness.json');
for(const difficulty of ['hard','expert']){
 const s=S.create(witness.members,difficulty);
 for(let day=1;day<=28;day++){
  if(day===8)S.selectSong(s,'moon');if(day===15)S.selectSong(s,'run');if(day===22)S.selectSong(s,'first');
  const outfit=day<8?'mint':day<15?'lilac':day<22?'neon':'sun';
  if(day%7===0&&s.cash>=C.outfits.find(o=>o.id===outfit).cost+35)assert.ok(S.buy(s,'outfit',outfit));
  S.applyDay(s,witness.sequence.slice((day-1)*3,day*3));
  if(s.phase==='event')S.chooseEvent(s,1);if(s.phase==='concert')S.perform(s);S.advance(s);
 }
 assert.ok(s.cleared,`${difficulty} must be legally completable`);assert.equal(s.history.filter(h=>h.passed).length,4);
 console.log(`${difficulty}: legal 28-day plan passes all 4 concerts; final score ${s.history[3].score}, fans ${s.fans}`);
}
