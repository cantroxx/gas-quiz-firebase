(function(root){
  'use strict';
  const C=typeof module!=='undefined'&&module.exports?require('./content.js'):root.FWContent;
  function create(weapon,difficulty='hard'){
    if(!C.weapons.some(w=>w.id===weapon))throw new Error('무기를 골라 주세요.');
    return {version:1,weapon,difficulty,room:1,hp:110,relics:[],crystals:0,kills:0,phase:'route',route:'normal',best:0,cleared:false,offers:[],history:[]};
  }
  function stats(s){
    const w=C.weapons.find(w=>w.id===s.weapon);const has=id=>s.relics.includes(id);
    const tags={};s.relics.forEach(id=>{const r=C.relics.find(x=>x.id===id);if(r)tags[r.tag]=(tags[r.tag]||0)+1;});
    const maxHp=110+(has('heart')?25:0)+(has('icewall')?15:0)+(tags.earth>=3?20:0);
    return {damage:w.damage*(1+(has('ember')?.22:0)+(has('meteor')?.35:0)+(has('crown')?.45:0)+(has('fury')&&s.hp<maxHp/2?.4:0)+(tags.fire>=3?.2:0))*(has('twin')?.88:1),
      interval:w.interval/(has('storm')?1.18:1)*(has('echo')?1.12:1),count:w.count+(has('twin')?1:0)+(has('echo')?1:0),
      speed:205*(has('boots')?1.15:1)*(has('meteor')?.92:1),bulletSpeed:w.speed*(has('reach')?1.25:1),pierce:(w.pierce||0)+(has('pierce')?1:0),
      maxHp,
      armor:(has('shield')?.85:1)*(has('icewall')?.9:1)*(has('crown')?1.2:1),dashCooldown:1.8*(has('dash')?.75:1)*(tags.storm>=3?.8:1),
      skillCooldown:9*(has('clock')?.8:1),skillDamage:75*(has('nova')?1.6:1)*(tags.star>=3?1.3:1),freeze:has('frost')?.65:1,crit:has('crit')?.2:0,tags};
  }
  function roomSpec(s){const biome=Math.min(3,Math.floor((s.room-1)/6));const boss=s.room%6===0;const elite=s.route==='elite';
    return {biome,boss,elite,count:boss?1:10+biome*3+(s.room%6)+(elite?3:0),hpScale:1+biome*.38+s.room*.045+(elite?.3:0),damageScale:(s.difficulty==='expert'?1.35:1)*(1+biome*.13),reward:boss?45:elite?30:18};}
  function offers(s,rng=Math.random){let pool=C.relics.filter(r=>!s.relics.includes(r.id)).map(r=>r.id);const out=[];while(pool.length&&out.length<3)out.push(pool.splice(Math.floor(rng()*pool.length),1)[0]);return out;}
  function completeRoom(s,rng=Math.random){if(s.phase!=='combat')return false;s.best=Math.max(s.best,s.room);s.crystals+=roomSpec(s).reward+(s.relics.includes('luck')?8:0);s.hp=Math.min(stats(s).maxHp,s.hp+(s.relics.includes('heal')?10:0));s.offers=offers(s,rng);s.phase='reward';return true;}
  function equip(s,id,replace){
    if(s.phase!=='reward'||!s.offers.includes(id)||s.relics.includes(id))return false;
    if(s.relics.length>=8){const index=s.relics.indexOf(replace);if(index<0)return false;s.relics.splice(index,1);}
    s.relics.push(id);s.hp=Math.min(stats(s).maxHp,s.hp+(id==='heart'?25:id==='icewall'?15:0));finishReward(s);return true;
  }
  function finishReward(s){s.offers=[];if(s.room>=24){s.phase='ended';s.cleared=true;}else{s.room++;s.phase='route';}}
  const api={create,stats,roomSpec,offers,completeRoom,equip,finishReward};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FWTowerDomain=api;
})(typeof window!=='undefined'?window:globalThis);
