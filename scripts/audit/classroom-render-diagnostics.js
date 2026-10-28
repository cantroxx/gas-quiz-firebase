// Diagnostic tracing is deliberately separate from headline timing samples.
module.exports = async function(page, destination) {
  const fs = require('node:fs');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', {rate:4});
  await cdp.send('Performance.enable');
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(async () => {
    uiData.economyBoard.shopItems=Array.from({length:60},(_,i)=>({itemId:`profile-${i}`,title:['간식 쿠폰','급식 순서 정하기','자리 선택 쿠폰','음악 DJ'][i%4],desc:'선생님과 사용 시간을 정해요.',itemType:'coupon',priceType:'point',pricePoint:5+i}));
    uiData.settings.quests=Array.from({length:12},(_,i)=>({...uiData.settings.quests[0],id:`quest-${i}`,title:`독서 활동 ${i+1}`}));
    uiRender(false);
    await document.fonts.ready;
    // Preload diagnostic assets only; normal UI keeps its lazy-loading policy.
    const images=[...document.querySelectorAll('#classroom-view img')];
    images.forEach(img=>img.loading='eager');
    await Promise.race([Promise.all(images.map(img=>img.decode().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,5000))]);
    await new Promise(requestAnimationFrame);
  });
  await cdp.send('HeapProfiler.collectGarbage');
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  const before=await metrics(), events=[];
  cdp.on('Tracing.dataCollected', ({value})=>events.push(...value));
  await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline,blink.user_timing',transferMode:'ReportEvents'});
  const measurements=await page.evaluate(async()=>{
    const overhead=[], render=[];
    for(let i=0;i<20;i++) {
      await new Promise(requestAnimationFrame);
      const t=performance.now(); performance.now();document.getElementById('classroom-view').getBoundingClientRect();overhead.push(performance.now()-t);
      const start=performance.now();uiRender(false);const js=performance.now()-start;document.getElementById('classroom-view').getBoundingClientRect();render.push({js,total:performance.now()-start});
    }
    return {overhead,render};
  });
  const ended=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));
  await cdp.send('Tracing.end');await ended;
  await cdp.send('HeapProfiler.collectGarbage');
  const after=await metrics();
  const sums={};
  for(const event of events) if(event.ph==='X' && /Layout|UpdateLayoutTree|RecalculateStyles|Decode|Paint|FunctionCall/.test(event.name)) {
    const sum=sums[event.name] ||= {count:0,durationMs:0};sum.count++;sum.durationMs+=(event.dur||0)/1000;
  }
  for(const sum of Object.values(sums)) sum.durationMs=+sum.durationMs.toFixed(2);
  fs.writeFileSync(destination,JSON.stringify({conditions:'Offline CPU4x 1440x1000. Warm decoded images. 20 frame-separated renders. Trace overhead present; diagnostic only, not headline performance.',measurements,traceEvents:sums,metricsBefore:before,metricsAfter:after},null,2));
  console.log('Diagnostic trace saved',destination);
};
