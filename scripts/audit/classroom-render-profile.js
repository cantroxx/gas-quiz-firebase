// Factorial CSS/JS comparison, with the exact same synthetic board as classroom-profile.
module.exports = async function profileRender(page, file) {
  const fs=require('node:fs');
  const client=await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.setViewportSize({width:1440,height:1000});
  const result=await page.evaluate(async()=>{
    uiData.economyBoard.shopItems=Array.from({length:60},(_,i)=>({itemId:`profile-${i}`,title:['간식 쿠폰','급식 순서 정하기','자리 선택 쿠폰','음악 DJ'][i%4],desc:'선생님과 사용 시간을 정해요.',itemType:'coupon',priceType:'point',pricePoint:5+i}));
    uiData.settings.quests=Array.from({length:12},(_,i)=>({...uiData.settings.quests[0],id:`quest-${i}`,title:`독서 활동 ${i+1}`}));
    const stats=values=>{const v=values.slice().sort((a,b)=>a-b);return {medianMs:+v[Math.floor(v.length/2)].toFixed(2),p95Ms:+v[Math.min(v.length-1,Math.floor(v.length*.95))].toFixed(2)};};
    const output={};
    for(const mode of ['tight','frame']) {
      const samples=[];
      for(let i=0;i<28;i++) {
        if(mode==='frame')await new Promise(requestAnimationFrame);
        const start=performance.now();uiRender(false);const jsDone=performance.now();
        document.getElementById('classroom-view').getBoundingClientRect();const end=performance.now();
        if(i>=8)samples.push({js:jsDone-start,layout:end-jsDone,total:end-start});
      }
      output[mode]={js:stats(samples.map(x=>x.js)),layout:stats(samples.map(x=>x.layout)),total:stats(samples.map(x=>x.total)),samples};
    }
    if(window.__classroomPhases) output.phases=Object.fromEntries(Object.entries(window.__classroomPhases).map(([name,values])=>[name,stats(values.slice(8))]));
    return output;
  });
  fs.writeFileSync(file,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
};
