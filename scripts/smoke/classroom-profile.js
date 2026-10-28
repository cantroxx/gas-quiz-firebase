// Shared by the offline classroom harness. Synthetic data, no production requests.
module.exports = async function profileClassroom(page, destination) {
  const fs = require('node:fs');
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const result = await page.evaluate(async () => {
    uiData.economyBoard.shopItems = Array.from({ length: 60 }, (_, i) => ({ itemId: `profile-${i}`, title: ['간식 쿠폰', '급식 순서 정하기', '자리 선택 쿠폰', '음악 DJ'][i % 4], desc: '선생님과 사용 시간을 정해요.', itemType: 'coupon', priceType: 'point', pricePoint: 5 + i }));
    uiData.settings.quests = Array.from({ length: 12 }, (_, i) => ({ ...uiData.settings.quests[0], id: `quest-${i}`, title: `독서 활동 ${i + 1}` }));
    const stats = values => { const v = values.slice().sort((a,b) => a-b); return { medianMs: +v[Math.floor(v.length/2)].toFixed(2), p95Ms: +v[Math.min(v.length-1, Math.floor(v.length*.95))].toFixed(2), samples: v.length }; };
    const render = [], tabs = [], selection = [], mutationCounts = [], scroll = [];
    for(let i=0;i<23;i++) { const t=performance.now(); uiRender(false); document.getElementById('classroom-view').getBoundingClientRect(); if(i>=3) render.push(performance.now()-t); }
    for(let i=0;i<40;i++) { const t=performance.now(); DJ48ClassroomForm.setActiveClassroomTab(i%2?'market':'quest'); document.getElementById('classroom-view').getBoundingClientRect(); tabs.push(performance.now()-t); }
    DJ48ClassroomForm.setActiveClassroomTab('market');
    const root=document.getElementById('classroom-shop-grid'), observer=new MutationObserver(()=>{}); observer.observe(root,{subtree:true,childList:true,attributes:true});
    for(let i=0;i<40;i++) { const t=performance.now(); document.querySelector(`[data-product-details="profile-${i%2}"]`).click(); root.getBoundingClientRect(); selection.push(performance.now()-t); mutationCounts.push(observer.takeRecords().length); }
    observer.disconnect();
    for(let i=0;i<20;i++) { const t=performance.now(); window.scrollTo(0,i%2?0:700); root.getBoundingClientRect(); scroll.push(performance.now()-t); await new Promise(requestAnimationFrame); }
    window.scrollTo(0,0);
    return { render:stats(render), tabSwitch:stats(tabs), productSelect:stats(selection), scrollLayout:stats(scroll), selectionMutations: { min:Math.min(...mutationCounts),max:Math.max(...mutationCounts) }, nodes:root.querySelectorAll('*').length };
  });
  const density = [];
  for(const width of [1440,768,390]) {
    await page.setViewportSize({width,height:1000});
    for(const tab of ['quest','market']) {
      await page.evaluate(tab=>{ window.scrollTo(0,0);DJ48ClassroomForm.setActiveClassroomTab(tab); },tab);
      density.push(await page.evaluate(({tab,width})=>{ const cards=[...document.querySelectorAll(tab==='quest'?'#classroom-quest-grid .classroom-card':'#classroom-shop-grid [data-classroom-shop-item-id]')].filter(e=>e.getClientRects().length);return {tab,width,firstTop:Math.round(cards[0].getBoundingClientRect().top),cardHeight:Math.round(cards[0].getBoundingClientRect().height),visibleCards:cards.filter(e=>e.getBoundingClientRect().bottom<=innerHeight).length}; },{tab,width}));
    }
  }
  const report={ conditions:'Offline Chromium, CPU 4x, 1440×1000 timing, 24 students / 12 quests / 60 products; synchronous JS + forced layout, warm samples. No server latency or paint FPS measurement.',...result,density};
  fs.writeFileSync(destination,JSON.stringify(report,null,2)); console.log(JSON.stringify(report));
};
