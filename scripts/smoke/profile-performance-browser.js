const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1100}});
    const errors = [], requests = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('http://127.0.0.1:5328/**', route => {
      const path = new URL(route.request().url()).pathname;
      requests.push(path);
      if (path === '/') return route.fulfill({contentType:'text/html', body:fs.readFileSync('public/index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')});
      return fs.existsSync('public'+path) ? route.fulfill({path:'public'+path}) : route.fulfill({status:404,body:''});
    });
    await page.goto('http://127.0.0.1:5328/',{waitUntil:'networkidle'});
    assert(!requests.some(p => /(?:ranking|event)-plaza-storybook/.test(p)), 'Hidden plaza art must not load at login');
    assert(requests.includes('/images/town-storybook-plazas-v2.webp'));
    for (const file of ['features/home-render.js','features/home-controller.js','features/ranking-render.js','features/ranking-data.js','infrastructure/ranking-repository.js']) await page.addScriptTag({path:'public/js/'+file});
    await page.evaluate(() => {
      document.querySelectorAll('.app-view').forEach(el => el.hidden = el.id !== 'home-view');
      DJ48HomeRender.renderProfileCard('profile-card-root', {nickname:'도토리친구',school:'퀴즈타운 · 4학년',avatar:'🐰',titleName:'배움의 탐험가',badgeName:'꾸준한 도전',coinText:'1,250 DJ코인',levelSummary:{level:12,xp:35,nextLevelXp:100,totalXp:1235},todayQuizSummary:{quizzes:[{quizId:'math',title:'수학 퀴즈'}]}});
      window.profileActions=[];
      DJ48HomeController.bindProfileHomeEvents({saveProfileNicknameFromHome:()=>profileActions.push('nickname')});
    });
    await page.click('[data-profile-detail-toggle="nickname"]');
    assert(await page.locator('#profile-nickname-input').isVisible());
    await page.click('#profile-nickname-save-button');
    assert.deepEqual(await page.evaluate(()=>profileActions),['nickname']);
    await page.click('[data-profile-detail-toggle="nickname"]');
    assert(!(await page.locator('#profile-nickname-input').isVisible()));
    await page.screenshot({path:'/tmp/profile-desktop.png',fullPage:true,animations:'disabled'});
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
    await page.click('[data-profile-detail-toggle="password"]');
    assert(await page.locator('#profile-current-password-input').isVisible());
    assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
    await page.click('[data-profile-detail-toggle="password"]');
    await page.screenshot({path:'/tmp/profile-mobile.png',fullPage:true,animations:'disabled'});
    await page.evaluate(() => {
      window.reads=[];
      const query = name => ({doc:()=>query(name),collection:()=>query(name),orderBy:()=>query(name),limit:()=>query(name),get:async()=>{reads.push(name);await new Promise(r=>setTimeout(r,30));return {docs:[],forEach:()=>{}};}});
      window.firebase={auth:()=>({currentUser:{uid:'fixture'},onAuthStateChanged:cb=>queueMicrotask(()=>cb({uid:'fixture'}))}),firestore:()=>({collection:query}),functions:()=>({httpsCallable:()=>async()=>{reads.push('studyTownAction');return {data:{rows:[]}};}})};
      const root=document.getElementById('ranking-board-root');
      DJ48RankingRender.renderRankingBoards(root,{boards:[{id:'quizKing',label:'퀴즈왕',rows:[]}]});
      root.addEventListener('click',e=>DJ48RankingRender.handleRankingBoardRootClick(e));
    });
    for (const file of ['ranking-visibility','hideout-ranking-plaza']) await page.addScriptTag({path:'public/js/'+file+'.js'});
    await page.waitForTimeout(120);
    assert.deepEqual(await page.evaluate(()=>reads),[], 'No game ranking requests before opening its tab');
    await page.evaluate(()=>{document.getElementById('home-view').hidden=true;document.getElementById('ranking-view').hidden=false;});
    await page.waitForTimeout(80);
    assert.deepEqual(await page.evaluate(()=>reads),[], 'Quiz ranking should not fetch game boards');
    await page.click('[data-ranking-board-id="hideout"]');
    await page.waitForTimeout(120);
    assert.deepEqual(await page.evaluate(()=>reads),['studyTownAction']);
    await page.click('[data-ranking-sub-group-id="cloud-tower-rank"]');
    await page.waitForTimeout(120);
    assert.deepEqual(await page.evaluate(()=>reads),['studyTownAction','cloudTowerRanking']);
    await page.click('[data-ranking-sub-group-id="town-marble-rank"]');
    await page.waitForTimeout(120);
    assert.deepEqual(await page.evaluate(()=>reads),['studyTownAction','cloudTowerRanking','townMarbleRanking']);
    await page.getByRole('button',{name:'새로고침',exact:true}).filter({visible:true}).click();
    await page.waitForTimeout(120);
    assert.equal(await page.evaluate(()=>reads.filter(x=>x==='townMarbleRanking').length),2);
    assert.deepEqual(errors,[]);
    console.log('PASS: hidden plaza images deferred; 0 optional leaderboard reads on login; only selected game fetched; explicit refresh works; profile controls and mobile layout checked. Fixture only.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
