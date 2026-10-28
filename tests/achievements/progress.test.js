'use strict';
const assert=require('node:assert/strict'),C=require('../../functions/achievements/catalog'),P=require('../../functions/achievements/progress');
(async()=>{
 assert.equal(C.titles.length,63);assert.equal(new Set(C.titles.map(t=>t.titleId)).size,63);
 const data=new Map(),db={collection:name=>({doc:id=>({path:name+'/'+id})})};
 async function answer(memberId,area,mode,correct,run){let wrote=false;const tx={get:async ref=>{assert(!wrote);return {data:()=>structuredClone(data.get(ref.path))};},set:(ref,value)=>{wrote=true;data.set(ref.path,structuredClone(value));}};const save=await P.prepare(tx,db,{memberId,area,mode,correct,run,time:1});save();}
 let run={};for(let i=0;i<99;i++)await answer('a','math','practice',false,run);
 assert.equal(C.eligible(data.get('achievementProgress/a')).length,0);
 await answer('a','math','practice',false,run);assert.equal(C.eligible(data.get('achievementProgress/a'))[0].titleName,'수학 초보');
 for(let i=100;i<500;i++)await answer('a','math','practice',i%2===0,run);
 assert.deepEqual(C.eligible(data.get('achievementProgress/a')).map(t=>t.titleName),['수학 초보','수학 중수','수학 고수']);
 for(let n=0;n<30;n++){
  const r={};for(let i=0;i<19;i++)await answer('a','science','ranking',true,r);
  await answer('a','science','ranking',false,r);for(let i=0;i<19;i++)await answer('a','science','ranking',true,r);
  assert.equal(data.get('achievementProgress/a').areas.science?.perfectRuns||0,n);
  for(let i=0;i<45;i++)await answer('a','science','ranking',true,r);
  assert.equal(data.get('achievementProgress/a').areas.science.perfectRuns,n+1);
 }
 assert.deepEqual(C.eligible(data.get('achievementProgress/a')).filter(t=>t.kind==='ranking').map(t=>t.titleName),['과학 달인','과학 마스터','과학 신']);
 for(let i=0;i<300;i++)await answer('b','pokemon-gen1','practice',false,{});
 assert.equal(C.eligible(data.get('achievementProgress/b')).length,3);
 assert(!data.get('achievementProgress/b').areas['pokemon-gen2']);
 await answer('a','pokemon','ranking',true,{});
 console.log('PASS new achievement boundaries, wrong answers, 20 streak resets, once per run, member/generation isolation, 63 titles');
})().catch(e=>{console.error(e);process.exitCode=1;});
