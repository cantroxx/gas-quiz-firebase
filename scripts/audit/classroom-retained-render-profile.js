// Compare unchanged and changed model renders. All data and requests are offline fixtures.
module.exports=async function(page,file){
  const fs=require('node:fs'),client=await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.setViewportSize({width:1440,height:1000});
  const result=await page.evaluate(()=>{
    uiData.economyBoard.shopItems=Array.from({length:60},(_,i)=>({itemId:`profile-${i}`,title:['간식 쿠폰','급식 순서 정하기','자리 선택 쿠폰','음악 DJ'][i%4],desc:'선생님과 사용 시간을 정해요.',itemType:'coupon',priceType:'point',pricePoint:5+i}));
    uiData.settings.quests=Array.from({length:12},(_,i)=>({...uiData.settings.quests[0],id:`quest-${i}`,title:`독서 활동 ${i+1}`}));
    const stats=values=>{const v=values.slice().sort((a,b)=>a-b);return{medianMs:+v[Math.floor(v.length/2)].toFixed(2),p95Ms:+v[Math.min(v.length-1,Math.floor(v.length*.95))].toFixed(2),minMs:+v[0].toFixed(2),maxMs:+v.at(-1).toFixed(2),samples:values.length}};
    const render=()=>{const start=performance.now();uiRender(false);const jsEnd=performance.now();document.getElementById('classroom-view').getBoundingClientRect();return{js:jsEnd-start,total:performance.now()-start}};
    const grid=document.getElementById('classroom-shop-grid');
    const observer=new MutationObserver(()=>{});observer.observe(grid,{subtree:true,childList:true});
    const firstModel=render();observer.takeRecords();
    const initialCard=grid.querySelector('[data-classroom-shop-item-id]');
    render();
    const unchangedMutationRecords=observer.takeRecords().length;
    const retainedCard=initialCard===grid.querySelector('[data-classroom-shop-item-id]');
    const results={firstModel,unchangedMutationRecords,retainedCard};
    for(const mode of ['unchangedHome','changedWallet','unchangedMarket']){
      if(mode==='unchangedMarket')DJ48ClassroomForm.setActiveClassroomTab('market');
      const values=[];
      for(let i=0;i<23;i++){if(mode==='changedWallet')uiData.wallet.point+=1;const value=render();if(i>=3)values.push(value);observer.takeRecords()}
      results[mode]={js:stats(values.map(v=>v.js)),total:stats(values.map(v=>v.total))};
    }
    observer.disconnect();return results;
  });
  fs.writeFileSync(file,JSON.stringify({conditions:'Chromium offline / CPU 4x / 1440×1000 / 24 students, 12 quests, 60 products. Synchronous JS+layout, not server or decode/paint completion.',...result},null,2));console.log(JSON.stringify(result));
};
