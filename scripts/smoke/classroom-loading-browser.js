#!/usr/bin/env node
// Offline integration checks for the actual app-shell loading coordinator.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const ROOT = path.resolve(__dirname, '../..'), PUBLIC = path.resolve(process.env.CLASSROOM_PUBLIC_DIR || path.join(ROOT, 'public'));
const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
const coordinator = html.slice(html.indexOf('    let classroomRenderRequest ='), html.indexOf('    function setClassroomQuestEditorStatus'));

(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if(process.env.ENTRY_DEBUG) page.on('console', msg=>console.log(msg.type(),msg.text()));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if(url.origin !== 'https://classroom-loading.test') return route.abort();
      if(url.pathname === '/') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '') });
      const file = path.resolve(PUBLIC, '.' + url.pathname);
      if(!file.startsWith(PUBLIC + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ path: file });
    });
    await page.goto('https://classroom-loading.test/');
    for(const file of ['domain/classroom-domain.js', 'application/classroom-usecases.js', 'features/classroom-state.js',
      'data/level-medal-assets.js', 'features/classroom-form.js', 'features/classroom-portrait.js', 'features/classroom-card-home.js', 'features/classroom-diary.js', 'features/classroom-shop-art.js', 'features/classroom-workspace.js', 'features/classroom-render.js']) {
      await page.addScriptTag({ path: path.join(PUBLIC, 'js', file) });
    }
    await page.addScriptTag({ content: `
      let member = 'S1', homeReads = 0, settingsReads = 0, releaseHome;
      let homeGate = new Promise(resolve => releaseHome = resolve);
      const fixture = {
        settings: DJ48ClassroomDomain.normalizeClassroomSettings({classId:'demo',quests:[{id:'q1',title:'샘플 독서 활동',active:true,rewardMode:'auto',rewardCoin:5}]}),
        economy: {myDjCoin:123, classroomGems:[],routines:[],classNotices:{slots:[]}}
      };
      window.DJ48AccountState = {getCurrentMemberUserId:()=>member};
      let teacher = false; const isCurrentClassroomTeacher = () => teacher;
      const getClassroomRenderDeps = () => ({isCurrentClassroomTeacher,currentMemberUserId:member,getTodayDateKey:()=> '2026-10-04',normalizeDisplayImageUrl:x=>x,getLevelMedalAsset:DJ48LevelMedalAssets.getLevelMedalAsset});
      const loadClassroomSettings = async () => {settingsReads++;return fixture.settings;};
      const loadClassroomQuestProgress = async () => ({});
      const loadClassroomReviewItems = async () => [];
      const loadClassroomWallet = async () => ({point:member==='S1'?17:82});
      const loadClassroomGemProgress = async () => [];
      const loadClassroomStudentCards = async () => [{memberUserId:member,nickname:'샘플학생',point:17}];
      let economyReads = 0, economyGate = Promise.resolve();
      const loadClassroomHomeData = async () => {homeReads++;await homeGate;return [{memberUserId:member,nickname:'샘플학생',djCoin:123}];};
      const loadClassroomEconomyBoard = async () => {economyReads++;await economyGate;return fixture.economy;};
      document.querySelectorAll('.app-view').forEach(view=>view.hidden=view.id!=='classroom-view');
      DJ48ClassroomForm.setClassroomUnlocked(true);DJ48ClassroomForm.setActiveClassroomTab('today');
      ${coordinator}
      window.loadingRun = renderClassroomPrototype();
    ` });
    if(process.env.ENTRY_DEBUG) { await page.waitForTimeout(100); console.log(await page.evaluate(()=>({status:document.querySelector('#classroom-load-status').textContent,point:document.querySelector('[data-classroom-home-region="point"]')?.textContent})),errors); }
    await page.locator('[data-classroom-home-region="point"]').filter({ hasText: '17 P' }).waitFor();
    assert(await page.locator('[data-classroom-home-region="quests"]').textContent().then(text => text.includes('샘플 독서 활동')));
    assert.match(await page.locator('[data-classroom-home-region="coin"]').textContent(), /불러오는 중/);
    if(process.env.CLASSROOM_LOADING_SCREENSHOT) await page.screenshot({ path: process.env.CLASSROOM_LOADING_SCREENSHOT, fullPage: true });
    assert(await page.locator('[data-classroom-panel="today"]').evaluate(node => node.inert));
    const noReady = await page.evaluate(() => document.getElementById('classroom-view').getAttribute('aria-busy'));
    assert.equal(noReady, 'true');
    await page.evaluate(() => releaseHome());
    await page.evaluate(() => loadingRun);
    assert.equal(await page.locator('#classroom-view').getAttribute('aria-busy'), 'false');
    assert.match(await page.locator('[data-classroom-home-region="coin"]').textContent(), /123 DJ코인/);
    assert.equal(await page.locator('[data-classroom-home-region="growth"][aria-busy]').count(), 0);
    assert.equal(await page.evaluate(() => economyReads), 0, 'Today must not load the economy board');
    const quickSwitch = await page.evaluate(async () => {
      let release; economyGate = new Promise(r=>release=r);
      DJ48ClassroomForm.setActiveClassroomTab('market'); const pending=renderClassroomPrototype();
      await new Promise(r=>setTimeout(r,20));
      const locked=document.querySelector('[data-classroom-panel="market"]').inert;
      DJ48ClassroomForm.setActiveClassroomTab('today'); await renderClassroomPrototype();
      const ready=document.getElementById('classroom-view').getAttribute('aria-busy')==='false';
      release();await pending;
      return {locked,ready,active:document.getElementById('classroom-view').dataset.activeTab};
    });
    assert.deepEqual(quickSwitch,{locked:true,ready:true,active:'today'});




    const refresh = await page.evaluate(async () => {
      const before = homeReads;
      homeGate = new Promise(resolve => releaseHome = resolve);
      const pointNode = document.querySelector('[data-classroom-home-region="point"]');
      const first = renderClassroomPrototype(true);
      const second = renderClassroomPrototype(true), third = renderClassroomPrototype(true);
      await new Promise(resolve => setTimeout(resolve, 40));
      const nodePreserved = pointNode === document.querySelector('[data-classroom-home-region="point"]');
      releaseHome(); await Promise.all([first, second, third]);
      return { reads: homeReads - before, nodePreserved };
    });
    assert.deepEqual(refresh, { reads: 2, nodePreserved: true });

    await page.evaluate(() => {
      homeGate = new Promise(resolve => releaseHome = resolve);
      window.oldRun = renderClassroomPrototype(true);
    });
    await page.waitForTimeout(40);
    await page.evaluate(() => {
      window.releaseOld = releaseHome;
      member = 'S2'; DJ48ClassroomState.resetClassroomRuntimeData();
      homeGate = Promise.resolve();
      window.newRun = renderClassroomPrototype();
    });
    await page.evaluate(() => newRun);
    await page.evaluate(() => { releaseOld(); return oldRun; });
    assert.match(await page.locator('[data-classroom-home-region="point"]').textContent(), /82 P/);
    assert.equal(await page.locator('#classroom-view').getAttribute('aria-busy'), 'false');
    await page.evaluate(() => {
      member = 'S3'; DJ48ClassroomState.resetClassroomRuntimeData();
      DJ48ClassroomState.reportLoadStatus('wallet', new Error('synthetic failure'));
      homeGate = new Promise(resolve => releaseHome = resolve);
      window.errorRun = renderClassroomPrototype();
    });
    await page.locator('[data-classroom-home-region="point"]').filter({ hasText: '불러오는 중' }).waitFor();
    await page.evaluate(() => { releaseHome(); return errorRun; });
    assert(await page.locator('[data-classroom-retry]').isVisible());
    assert(await page.locator('[data-classroom-panel="today"]').isHidden());
    const compact = await page.evaluate(async () => {
      DJ48ClassroomState.resetClassroomRuntimeData();
      delete document.getElementById('classroom-view').dataset.homeDetails;
      const before = economyReads;
      await renderClassroomPrototype();
      return {economyReads:economyReads-before, ready:document.getElementById('classroom-view').getAttribute('aria-busy')};
    });
    assert.deepEqual(compact, {economyReads:0,ready:'false'});
    assert.match(await page.locator('[data-classroom-home-region="coin"]').textContent(), /123 DJ코인/);
    await page.evaluate(() => DJ48ClassroomForm.setActiveClassroomTab('market'));
    await page.waitForFunction(() => document.getElementById('classroom-view').getAttribute('aria-busy') === 'false');
    assert(await page.locator('#classroom-economy-navigation').isVisible());
    assert.equal(await page.locator('#classroom-economy-navigation button:visible').count(), 5);
    assert(await page.locator('[data-classroom-tab="securities"]').isHidden(), 'local preview must stay hidden on normal classroom entry');
    assert(await page.locator('.classroom-tabs').isHidden());
    await page.evaluate(async () => {
      DJ48ClassroomState.resetClassroomRuntimeData();
      homeGate = Promise.resolve();
      for(const role of [false,true]) {
        teacher = role;
        for(const tab of ['today','quest','classroom','market','bank','routine','gems','jobs','mission',...(role?['teacher']:[])]) {
          DJ48ClassroomForm.setActiveClassroomTab(tab);
          await renderClassroomPrototype();
          if(document.getElementById('classroom-view').getAttribute('aria-busy') !== 'false' || document.querySelector('[data-classroom-panel="'+tab+'"]').inert) throw Error('Tab did not become usable: '+tab);
        }
      }
    });
    assert.deepEqual(errors, []);
    console.log('PASS classroom loading: partial compact home, market navigation, all role/tab loading, no false zero, locked pending actions, merged refresh, retained home, stale account response ignored.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
