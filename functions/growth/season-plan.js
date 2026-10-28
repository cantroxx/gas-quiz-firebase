'use strict';
const {createHash}=require('node:crypto');
const AUTO_FROM_MONTH='2026-10'; // Keep the already-running September season unchanged.
const bases={practice:100,today:50,ranking:10,study:100,survivor:100,marble:5,tower:200,bomb:100};
function nextMonth(month){const d=new Date(month+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);return d.toISOString().slice(0,7);}
function generate(month,revision=0){
 const targets=Object.fromEntries(Object.entries(bases).map(([id,base])=>{
  const choice=(createHash('sha256').update(month+'|'+id).digest()[0]+revision)%3;
  return [id,month<AUTO_FROM_MONTH?base:Math.round(base*[.8,1,1.2][choice])];
 }));
 return {month,revision,targets};
}
function resolve(month,stored){return generate(month,Number.isSafeInteger(stored?.revision)&&stored.revision>=0?stored.revision:0);}
module.exports={bases,nextMonth,generate,resolve};
