const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright-core');
(async () => {
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('http://127.0.0.1:5328/**',r=>{
      const path=new URL(r.request().url()).pathname;
      if(path==='/')return r.fulfill({contentType:'text/html',body:fs.readFileSync('public/index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')});
      if(fs.existsSync('public'+path))return r.fulfill({path:'public'+path});
      return r.fulfill({status:404,body:'Not found'});
    });
    await page.goto('http://127.0.0.1:5328/',{waitUntil:'networkidle'});
    assert.equal(await page.locator('.plaza-hero').first().evaluate(el=>getComputedStyle(el).position),'relative');
    for(const file of ['domain/event-domain.js','features/event-render.js','features/event-controller.js','features/ranking-render.js'])await page.addScriptTag({path:'public/js/'+file});
    await page.evaluate(()=>{
      document.querySelectorAll('.app-view').forEach(e=>e.hidden=e.id!=='event-view');
      window.claims=[];DJ48EventController.bindEventPlazaEvents({claimEventQuestReward:id=>claims.push(id)});
      DJ48EventRender.renderEventSections({dateKey:'2026-09-16',weekKey:'2026-09-14',quests:[
        {questId:'ready',icon:'🌱',title:'오늘도 한 걸음',current:3,target:3,reward:'10 DJ코인',status:'완료 가능',claimable:true},
        {questId:'progress',icon:'📚',title:'배움의 씨앗 모으기',current:1,target:5,reward:'20 DJ코인',status:'진행 중',claimable:false},
        {questId:'claimed',icon:'⭐',title:'이번 주의 작은 도전',scope:'weekly',claimedCount:1,repeatLimit:2,current:5,target:5,reward:'30 DJ코인',status:'수령 완료',claimed:true,claimable:false}
      ],seasonEvents:[{icon:'🍂',title:'가을 독서 산책',desc:'책 속 이야기를 퀴즈로 만나보세요.',period:'9월 시즌 · 미리보기',quizIds:['reading']},{icon:'🌿',title:'숲속 배움 축제',desc:'새로운 지식을 모으는 작은 도전입니다.',period:'이벤트 예시',quizIds:['spelling']}]});
    });
    assert.equal(await page.locator('.quest-card').count(),3);
    assert(await page.locator('[data-quest-claim-id="progress"]').isDisabled());
    assert(await page.locator('[data-quest-claim-id="claimed"]').isDisabled());
    await page.click('[data-quest-claim-id="ready"]');assert.deepEqual(await page.evaluate(()=>claims),['ready']);
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('.app-view:not([hidden]) .plaza-hero-art')).every(img=>img.complete&&img.naturalWidth>0));
    await page.screenshot({path:'/tmp/event-plaza-desktop.png',fullPage:true,animations:'disabled'});
    await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/event-plaza-mobile.png',fullPage:true,animations:'disabled'});
    await page.evaluate(()=>DJ48EventRender.renderSeasonEvents([]));assert.match(await page.locator('#season-event-grid').innerText(),/지금 표시할 시즌 이벤트/);
    await page.setViewportSize({width:1440,height:1050});
    await page.evaluate(()=>{
      document.querySelector('#event-view').hidden=true;document.querySelector('#ranking-view').hidden=false;
      const rows=['숲속토끼','초록새싹','도토리친구','별빛여우','책읽는곰'].map((nickname,i)=>({nickname,score:100-i*7,totalScore:1000-i*120,level:0}));
      DJ48RankingRender.renderRankingCards(['퀴즈왕','독서왕','수학왕','탐구왕'].map((category,i)=>({category,nickname:rows[i].nickname,icon:['👑','📚','🧮','🔎'][i],rank:'분야 1위',title:'꾸준한 도전의 기록'})));
      const root=document.querySelector('#ranking-board-root');
      DJ48RankingRender.renderRankingBoards(root,{boards:[{id:'quizKing',label:'퀴즈왕',title:'우리 마을 퀴즈왕',desc:'검증용 샘플 순위입니다.',rows},{id:'season',label:'시즌 랭킹',title:'이번 시즌의 기록',groups:[{id:'month',label:'이번 달',rows},{id:'last',label:'다른 시즌',rows:[]}]}]});
      root.addEventListener('click',e=>DJ48RankingRender.handleRankingBoardRootClick(e));
    });
    await page.locator('.ranking-hall-summary').click();assert(await page.locator('.ranking-hall-grid').isVisible());
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('.app-view:not([hidden]) .plaza-hero-art')).every(img=>img.complete&&img.naturalWidth>0));
    await page.screenshot({path:'/tmp/ranking-plaza-desktop.png',fullPage:true,animations:'disabled'});
    await page.click('[data-ranking-board-id="season"]');assert(await page.locator('[data-ranking-board-panel="season"]').isVisible());assert(!(await page.locator('[data-ranking-board-panel="quizKing"]').isVisible()));
    await page.click('[data-ranking-sub-group-id="last"]');assert(await page.locator('[data-ranking-sub-panel="last"]').isVisible());
    await page.click('[data-ranking-board-id="quizKing"]');await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/ranking-plaza-mobile.png',fullPage:true,animations:'disabled'});
    await page.locator('#ranking-view .plaza-jump').focus();
    assert.deepEqual(errors,[]);
    console.log('Plaza review passed: real ranking/event renderers, ranking tabs/subtabs, hall disclosure, quest claim routing and disabled states, empty seasons, desktop/mobile no overflow. Fixture data only.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
