#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright-core');
const {file} = require('./town-ui-candidate-fixture');
async function main() {
  const browser = await chromium.launch({executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true});
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if(url.origin !== 'https://reset.invalid') return route.fulfill({body: ''});
      const target = await file(url.pathname === '/' ? '/index.html' : url.pathname);
      if(url.pathname === '/') return route.fulfill({contentType: 'text/html', body: fs.readFileSync(target, 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')});
      return route.fulfill({path: target});
    });
    await page.goto('https://reset.invalid/');
    for(const name of ['js/domain/event-domain.js', 'js/features/event-render.js']) await page.addScriptTag({path: await file(name)});
    assert.equal(await page.locator('#admin-section-season-events, [data-admin-section-target="season-events"], #admin-feature-today-quiz-mode, #admin-today-quiz-shuffle-now, #season-event-grid, #season-draft-load').count(), 0);
    assert.equal(await page.locator('#admin-feature-practice-xp').count(), 1);
    assert.match(await page.locator('#admin-feature-practice-xp').locator('..').innerText(), /모든 연습전/);
    await page.evaluate(() => {
      document.querySelectorAll('.app-view').forEach(el => {el.hidden = el.id !== 'event-view';});
      DJ48EventRender.renderEventSections({quests: [
        {questId: 'v2_daily_practice', title: '연습전 새 정답', scope: 'daily', current: 1, target: 10, reward: 'XP +15 · DJ코인 +10', status: '진행 중'},
        {questId: 'v2_daily_today', title: '오늘의 퀴즈 새 정답', scope: 'daily'},
        {questId: 'season3_old', title: '옛 시즌', scope: 'season'}
      ], legacyQuests: [{questId: 'v2_season_old', title: '이전 시즌', claimable: true}], seasonEvents: [{title: '종료된 시즌'}]});
      DJ48EventRender.renderEventStatus('', false, () => {});
    });
    assert.equal(await page.locator('#quest-card-grid .quest-card').count(), 1);
    assert(await page.locator('#event-unclaimed-button').isHidden());
    assert.equal(await page.locator('#event-view').getByText(/시즌|오늘의 퀴즈/).count(), 0);
    const output = '/tmp/quiztown-hard-reset-20261018/screenshots'; fs.mkdirSync(output, {recursive: true});
    for(const width of [1440, 390, 320]) {
      await page.setViewportSize({width, height: 1000});
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({path: path.join(output, `events-${width}.png`), fullPage: true});
    }
    assert.deepEqual(errors, []);
    const context = await browser.newContext();
    const fixture = require('./public-shell-fixture'); await fixture.install(context);
    const shell = await context.newPage(); const shellErrors = [];
    shell.on('pageerror', error => shellErrors.push(error.message));
    await shell.goto(fixture.ORIGIN); await shell.locator('#member-link-form').waitFor();
    const runtime = await shell.evaluate(() => {
      setAdminFeatureFlagsForm({practiceRewardEnabled: true, practiceXpEnabled: true});
      const retired = {todayQuizMode: 'dailyRandom', todayQuizIds: ['spelling'], activeTodayQuizIds: ['spelling'], todayQuizRandomPoolIds: ['spelling']};
      const clean = normalizeFeatureFlags({...retired, practiceXpEnabled: false});
      const notice = getNoticeBoardForDailyDrop({quest: '교사 안내 유지', recommendedQuizId: 'math'}, retired);
      return {clean, notice, boards: getRankingBoardModels([], []).map(board => board.id), flags: getAdminFeatureFlagsFormValues(), today: typeof buildTodayQuizSummary};
    });
    assert(!Object.keys(runtime.clean).some(key => /todayQuiz/i.test(key)));
    assert.equal(runtime.clean.practiceXpEnabled, false);
    assert.equal(runtime.notice.quest, '교사 안내 유지');
    assert(!Object.keys(runtime.flags).some(key => /todayQuiz/i.test(key)));
    assert(!runtime.boards.includes('season')); assert(runtime.boards.includes('quizKing'));
    assert.equal(runtime.flags.practiceRewardEnabled, true); assert.equal(runtime.flags.practiceXpEnabled, true);
    assert.equal(runtime.today, 'undefined'); assert.deepEqual(shellErrors, []);
    await context.close();
    console.log('PASS hard reset UI: removed daily-featured and season admin controls, no stale season rewards, retained daily practice quest, 1440/390/320px, no JS errors.');
  } finally {await browser.close();}
}
main().catch(error => {console.error(error); process.exitCode = 1;});
