(function(root){
  'use strict';
  const C=typeof module!=='undefined'&&module.exports?require('./content.js'):root.FWContent;
  function create(weapon,difficulty='hard'){
    if(!C.weapons.some(w=>w.id===weapon))throw new Error('무기를 골라 주세요.');
    return {version:1,weapon,difficulty,room:1,hp:110,relics:[],upgrades:{},crystals:0,kills:0,phase:'route',route:'normal',best:0,cleared:false,offers:[],history:[]};
  }
  function level(s,id){const n=s.upgrades?.[id];return Number.isInteger(n)&&n>=0&&n<=3?n:0;}
  const upgradeCap=s=>s.balance===2?[1,2,3,3][Math.min(3,Math.floor((s.room-1)/(s.expedition==='long'?8:6)))]:3;
  function upgradeCost(s,id){return 20+level(s,id)*15;}
  function upgrade(s,id){
    if(!['route','room'].includes(s.phase)||s.expedition&&s.node?.type!=='forge'||!s.relics.includes(id)||level(s,id)>=upgradeCap(s)||s.crystals<upgradeCost(s,id))return false;
    const before=stats(s).maxHp,cost=upgradeCost(s,id),next=level(s,id)+1;
    s.upgrades=s.upgrades||{};s.upgrades[id]=next;s.crystals-=cost;s.hp=Math.min(stats(s).maxHp,s.hp+stats(s).maxHp-before);return true;
  }
  function stats(s){
    const w=C.weapons.find(w=>w.id===s.weapon);const has=id=>s.relics.includes(id);
    const tags={};s.relics.forEach(id=>{const r=C.relics.find(x=>x.id===id);if(r)tags[r.tag]=(tags[r.tag]||0)+1;});
    const power={fire:0,ice:0,storm:0,earth:0,star:0};s.relics.forEach(id=>{power[C.relics.find(r=>r.id===id).tag]+=level(s,id);});
    const maxHp=110+(has('snow')?12:0)+(has('acorn')?18:0)+power.earth*8+(has('heart')?25:0)+(has('icewall')?15:0)+(tags.earth>=3?20:0);
    const result={damage:w.damage*(1+power.fire*.06)*(1+(has('ember')?.22:0)+(has('meteor')?.35:0)+(has('crown')?.45:0)+(has('fury')&&s.hp<maxHp/2?.4:0)+(tags.fire>=3?.2:0))*(has('twin')?.88:1),
      interval:w.interval/(1+power.storm*.04)/(has('storm')?1.18:1)*(has('echo')?1.12:1),count:w.count+(has('twin')?1:0)+(has('echo')?1:0),
      speed:205*(has('boots')?1.15:1)*(has('meteor')?.92:1),bulletSpeed:w.speed*(has('reach')?1.25:1),pierce:(w.pierce||0)+(has('pierce')?1:0),
      maxHp,
      armor:Math.pow(.97,power.ice)*(has('shield')?.85:1)*(has('icewall')?.9:1)*(has('crown')?1.2:1),dashCooldown:1.8*(has('dash')?.75:1)*(tags.storm>=3?.8:1),
      skillCooldown:9*(has('clock')?.8:1),skillDamage:75*(1+power.star*.08)*(has('nova')?1.6:1)*(tags.star>=3?1.3:1),freeze:has('frost')?.65:1,crit:has('crit')?.2:0,tags};
    result.damage*=1+(has('coal')?.12:0);result.interval/=(has('wing')?1.1:1);result.speed*=has('gust')?1.08:1;result.bulletSpeed*=has('prism')?1.15:1;result.armor*=(has('shell')?.92:1)*(has('bark')?.92:1)*(w.id==='shield'?.85:1);result.skillCooldown*=has('tempo')?.9:1;result.skillDamage*=has('pearl')?1.2:1;
    const lv=s.weaponLevel||0;result.damage*=1+lv*.12;result.interval/=1+lv*.04;result.skillDamage*=1+lv*.1;result.reach=(w.reach||0)*(1+lv*.07);if(s.branch==='b'&&!w.reach&&w.id!=='book')result.count++;if(s.branch==='a')result.damage*=1.15;if(lv===5){result.skillCooldown*=.85;result.pierce++;}if(s.mod==='focus'){result.damage*=1.2;result.reach*=1.2;}return result;
  }
  function roomSpec(s){const depth=s.expedition==='long'?8:6,biome=Math.min(3,Math.floor((s.room-1)/depth));const boss=s.room%depth===0;const elite=s.route==='elite';
    const basic=s.difficulty!=='expert';return {biome,boss,elite,speedScale:basic?.85:1,spawnInterval:basic?.75:.55,count:boss?1:Math.ceil((10+biome*3+((s.room-1)%depth+1)+(elite?3:0))*(basic?.8:1)),hpScale:(basic?.9:1)*(1+biome*.38+(biome*6+Math.min(6,(s.room-1)%depth+1))*.045+(elite?.3:0)),damageScale:(basic?.85:1)*(s.difficulty==='expert'?1.35:1)*(1+biome*.13),reward:boss?45:elite?30:18};}
  function offers(s,rng=Math.random,tag){let pool=C.relics.filter(r=>!s.relics.includes(r.id)&&(!tag||r.tag===tag)).map(r=>r.id);const out=[];while(pool.length&&out.length<3)out.push(pool.splice(Math.floor(rng()*pool.length),1)[0]);return out;}
  function completeRoom(s,rng=Math.random){if(s.phase!=='combat')return false;s.best=Math.max(s.best,s.room);s.crystals+=roomSpec(s).reward+(s.relics.includes('luck')?8:0);s.hp=Math.min(stats(s).maxHp,s.hp+(s.relics.includes('heal')?10:0)+(s.relics.includes('root')?6:0));s.offers=offers(s,rng);if(s.expedition&&roomSpec(s).boss&&!s.bosses.includes(roomSpec(s).biome))s.bosses.push(roomSpec(s).biome);s.phase='reward';return true;}
  function equip(s,id,replace){
    if(s.phase!=='reward'||!s.offers.includes(id)||s.relics.includes(id))return false;
    if(s.relics.length>=8){const index=s.relics.indexOf(replace);if(index<0)return false;s.relics.splice(index,1);}
    s.relics.push(id);s.hp=Math.min(stats(s).maxHp,s.hp+(id==='heart'?25:id==='icewall'?15:0));finishReward(s);return true;
  }
  function finishReward(s){s.offers=[];if(s.expedition){s.best=Math.max(s.best,s.room);if(s.node&&!s.visited.includes(s.node.id))s.visited.push(s.node.id);s.node=null;s.purchase=false;s.combat=null;}if(s.room>=(s.expedition==='long'?32:24)){s.phase='ended';s.cleared=true;}else{s.room++;s.phase='route';}}
  const api={upgradeCap,level,upgradeCost,upgrade,create,stats,roomSpec,offers,completeRoom,equip,finishReward};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FWTowerDomain=api;
})(typeof window!=='undefined'?window:globalThis);
