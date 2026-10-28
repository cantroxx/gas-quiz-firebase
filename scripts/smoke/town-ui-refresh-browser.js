'use strict';
// Isolated real markup/renderers, synthetic values, no production network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const candidate = require('./town-ui-candidate-fixture');
const OUT = path.resolve(process.env.TOWN_UI_REVIEW_DIR || 'docs/product/town-ui-review-2026-10-18');
const ORIGIN = 'https://town-ui.test';
const entryOnly = process.argv.includes('--entry');
(async () => {
  fs.mkdirSync(OUT, { recursive:true });
  const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try {
    const context = await browser.newContext();
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if(url.origin !== ORIGIN) return route.abort();
      const file = await candidate.file(url.pathname.endsWith('/') ? url.pathname+'index.html' : url.pathname);
      if(!fs.existsSync(file)) return route.fulfill({status:404,body:''});
      if(file.endsWith('.html')) return route.fulfill({contentType:'text/html; charset=utf-8',body:fs.readFileSync(file,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')});
      return route.fulfill({path:file});
    });
    const page = await context.newPage();
    await page.emulateMedia({reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(ORIGIN);
    await page.addScriptTag({url:ORIGIN+'/js/player-status-shortcut.js'});
    const show = id => page.evaluate(id=>document.querySelectorAll('.app-view').forEach(el=>el.hidden=el.id!==id),id);
    const capture = async (name,width) => {
      await page.setViewportSize({width,height:900});
      await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,0);});
      await page.evaluate(()=>document.fonts.ready);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name}: overflow at ${width}`);
      // One viewport avoids tiled full-page capture glitches on macOS Chrome.
      const height=await page.evaluate(()=>Math.max(900,document.documentElement.scrollHeight));
      await page.setViewportSize({width,height});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.screenshot({path:path.join(OUT,`${name}-${width}.png`),animations:'disabled'});
    };
    for(const width of [1440,390,320]) {
      await show('login-view');await capture('login',width);
      assert(await page.locator('#dj48-player-status-shortcut').isHidden());
      assert(await page.locator('#member-link-submit-button').isVisible());
      await page.locator('#member-login-mode-button').focus();
      assert(await page.locator('#member-login-mode-button').evaluate(el=>el===document.activeElement));
      await show('town-view');await capture('town',width);
      assert.equal(await page.locator('main.shell > #dj48-player-status-shortcut[data-shell]').count(),1);
      assert(await page.locator('#town-view .town-info-shortcuts').isVisible());
      assert.equal(await page.locator('#dj48-player-status-shortcut .town-info-shortcuts').count(),0);
      for(const place of ['my-home','school','shop','ranking','event']) {
        const button=page.locator(`#town-view .town-map .${place}`);
        await button.focus();assert(await button.evaluate(el=>el===document.activeElement));
      }
      const info=await page.locator('.town-info-shortcuts').boundingBox();
      const map=await page.locator('.storybook-map-scroll').boundingBox();
      assert(info.y+info.height<=map.y,'Information controls are above the map');
    }
    if(entryOnly) { assert.deepEqual(errors,[]);console.log('PASS entry: login controls, five destinations, keyboard focus, no whole-page overflow, information menu in layout at 1440/390/320.');return; }
    for(const file of ['domain/event-domain.js','features/event-render.js','features/event-controller.js','features/ranking-render.js','features/home-render.js']) await page.addScriptTag({path:await candidate.file('js/'+file)});
    await page.evaluate(()=>{
      window.claims=[];
      DJ48EventController.bindEventPlazaEvents({claimEventQuestReward:id=>claims.push(id)});
      DJ48EventRender.renderEventSections({quests:[
        {questId:'ready',title:'새로운 배움에 도전하기',icon:'🌱',current:3,target:3,reward:'10 DJ코인',status:'완료 가능',claimable:true},
        {questId:'progress',title:'차곡차곡 실력 쌓기',icon:'📚',current:0,target:5,reward:'20 DJ코인',status:'진행 중',claimable:false},
        {questId:'claimed',title:'친구와 함께 한 걸음',icon:'⭐',current:5,target:5,reward:'10 DJ코인',status:'수령 완료',claimed:true}
      ],seasonEvents:[]});
      DJ48EventRender.renderEventStatus('',false,()=>{});
    });
    await show('event-view');
    await page.locator('[data-quest-claim-id="ready"]').click();
    assert.deepEqual(await page.evaluate(()=>claims),['ready']);
    assert(await page.locator('[data-quest-claim-id="progress"]').isDisabled());
    assert(await page.locator('[data-quest-claim-id="claimed"]').isDisabled());
    assert.equal(await page.locator('#event-season-toggle').count(),0);
    assert(await page.locator('#season-event-grid').isHidden());
    await page.locator('#event-quest-toggle').focus();await page.keyboard.press('Enter');assert(await page.locator('#quest-card-grid').isHidden());
    await page.locator('a[href="#quest-heading"]').click();assert(await page.locator('#quest-card-grid').isVisible());
    for(const width of [1440,390,320]) await capture('event',width);
    await page.evaluate(()=>{
      DJ48RankingRender.renderRankingCards([{category:'랭킹전',nickname:'새싹친구',icon:'🏆',rank:'1위',title:'도전의 기록'}]);
      DJ48RankingRender.renderRankingBoards(document.getElementById('ranking-board-root'),{boards:[{id:'quizKing',label:'랭킹전',title:'랭킹전 기록',rows:['새싹친구','이름이아주긴마을친구입니다','도토리'].map((nickname,i)=>({nickname,score:100-i*10}))}]});
    });
    await show('ranking-view');
    for(const width of [1440,390,320]) await capture('ranking',width);
    await page.evaluate(()=>{
      DJ48RankingRender.renderRankingCards([]);
      DJ48RankingRender.renderRankingBoards(document.getElementById('ranking-board-root'),{boards:[{id:'quizKing',label:'랭킹전',title:'랭킹전 기록',rows:[]}]});
    });
    await capture('ranking-empty',390);
    await page.evaluate(()=>DJ48HomeRender.renderProfileCard('profile-card-root',{nickname:'새로운마을친구',avatar:'🌱',coinText:'0 DJ코인',titleName:'아직 없어요',badgeCountText:'0개',dailyRewardStatus:{coin:{remaining:0,limit:0},weeklyXp:{remaining:0,limit:0}},levelSummary:{level:1,xp:0,nextLevelXp:50,totalXp:0}}));
    await show('home-view');
    assert.equal(await page.locator('#home-view .profile-today-quiz-panel').count(),0);
    assert(await page.getByText('0 DJ코인',{exact:true}).isVisible());
    for(const width of [1440,390,320]) await capture('home-zero',width);
    await show('school-view');
    for(const width of [1440,390,320]) await capture('school',width);
    await show('event-view');
    await page.evaluate(()=>DJ48EventRender.renderEventSections({quests:[],seasonEvents:[]}));
    await capture('event-empty',390);
    assert(await page.getByText('지금 표시할 퀘스트가 없어요. 다음 도전을 기다려 주세요.').isVisible());
    assert.deepEqual(errors,[]);
    console.log('PASS refreshed shell: 1440/390/320, keyboard/quest claim/disabled states, seasonal entry absent, zero profile, long names and empty ranking/quests. Screenshots:',OUT);
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
