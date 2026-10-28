'use strict';
// Render the reviewed live-based candidate with synthetic accounts and no backend requests.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const root = process.env.QUIZ_ROLE_PUBLIC_DIR || '/tmp/quiz-role-release/candidate';
const out = process.env.QUIZ_ROLE_SCREENSHOT_DIR || '/tmp/quiz-role-release/screenshots';
const asset = file => path.join(root, file);
(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if(url.origin !== 'https://quiz-roles.invalid') return route.abort();
      const file = url.pathname === '/' ? asset('index.html') : asset(url.pathname);
      if(!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
      if(url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: fs.readFileSync(file, 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '') });
      return route.fulfill({ path: file });
    });
    await page.goto('https://quiz-roles.invalid/');
    for(const file of ['js/data/quiz-catalog.js', 'js/data/subject-quiz-catalog.js', 'js/school-rooms.js']) await page.addScriptTag({ path: asset(file) });
    await page.evaluate(() => {
      const catalog = DJ48QuizCatalog;
      window.flags = { externalQuizzesEnabled: true, rankingEnabled: true };
      window.popularAllowed = true; window.member = 'synthetic-a'; window.visits = [];
      window.config = { items: [
        { id: 'one', title: '탐험 활동 예시', description: '문제를 해결하며 탐험해요.', url: 'https://example.org/learning', active: true },
        { id: 'hidden', title: '숨긴 활동', url: 'https://example.org/hidden', active: false },
        { id: 'bad', title: '잘못된 링크', url: 'javascript:alert(1)' },
        { id: 'concept', title: '주제 활동 예시', url: 'https://example.org/theme', group: 'concept', active: true }
      ], concept: { month: 10, theme: '탐험' } };
      window.enter = ({ viewId }) => document.querySelectorAll('.app-view').forEach(view => { view.hidden = view.id !== viewId; });
      window.renderDeps = { quizCatalog: catalog.QUIZ_CATALOG, featureFlags: flags,
        firebasePlayableQuizIds: new Set(Object.keys(catalog.QUIZ_CATALOG)), normalizeFirebaseQuizId: id => id,
        isQuizEnabledByFlags: id => !(flags.disabledQuizIds || []).includes(id),
        getRankingModeOptionsForQuiz: () => [{ label: '일반', value: 'normal' }, { label: '원코', value: 'onechance' }] };
      DJ48SchoolHubs.configure({ subjectCatalog: catalog.SUBJECT_CATALOG, getRenderDeps: () => renderDeps,
        memberId: () => member, loadConfig: async () => config, loadFlags: async () => flags, isAdmin: () => false,
        enterView: enter, showSchoolView: () => enter({ viewId: 'school-view' }),
        ensurePopularSubjectAccess: async () => popularAllowed,
        showQuizSelectView: id => visits.push(['select', id]), startQuiz: async (...args) => visits.push(['start', ...args]),
        setSubject: id => { window.subject = id; }, setLastQuiz: id => { window.lastQuiz = id; },
        refreshPopularUsageNotices: () => document.querySelectorAll('[data-popular-usage-notice]').forEach(node => { node.textContent = '검증용 이용 시간 안내'; }) });
    });
    fs.mkdirSync(out, { recursive: true });
    const room = page.locator('#school-room-view');
    for(const [subject, count] of [['korean',3], ['math',2], ['social',3], ['science',2]]) {
      await page.evaluate(subject => DJ48SchoolHubs.open('subjects', { subject }), subject);
      assert.equal(await room.locator('.room-card').count(), count);
      assert.equal(await room.locator('.room-purpose').count(), 1);
      if(subject === 'social') assert.match(await room.innerText(), /한국사 · 세계사/);
      if(subject === 'math') {
        assert.equal(await room.getByRole('button', { name: '준비 중' }).count(), 0);
        assert.equal(await room.locator('a[href="/pizza-assessment/"]').count(), 0);
        assert.doesNotMatch(await room.innerText(), /분수 평가|삼각형 건축왕|우주탐사대/);
      }
      if(subject === 'science') assert.doesNotMatch(await room.innerText(), /우주탐사대/);
      await room.screenshot({ path: `${out}/${subject}-desktop.png` });
    }
    await page.evaluate(() => DJ48SchoolHubs.open('subjects', { subject: 'korean' }));
    const spelling = room.locator('.room-card').filter({ has: page.locator('h3', { hasText: '맞춤법' }) });
    assert.equal(await spelling.getByRole('link').getAttribute('href'), '/subject-quiz/?subject=korean&group=spelling');
    assert.equal(await room.locator('.room-ranking-modes').count(), 0);
    await page.evaluate(() => { flags.disabledQuizIds = ['generated-korean-spelling']; return DJ48SchoolHubs.open('subjects'); });
    assert.equal(await room.locator('.room-card').count(), 2);
    await page.evaluate(() => { flags.rankingEnabled = true; flags.disabledQuizIds = []; popularAllowed = false; return DJ48SchoolHubs.open('popular'); });
    assert.equal(await room.getAttribute('data-room'), 'subjects');
    await page.evaluate(() => { popularAllowed = true; return DJ48SchoolHubs.open('popular'); });
    assert.equal(await room.locator('.room-card').count(), 8);
    assert.match(await room.innerText(), /이용 가능한 시간/);
    await room.screenshot({ path: `${out}/popular-desktop.png` });
    await room.getByRole('button', { name: '캐릭터', exact: true }).click();
    assert.equal(await room.locator('.room-card').count(), 4);
    await page.evaluate(() => DJ48SchoolHubs.open('learning'));
    assert.equal(await room.locator('.room-card').count(), 1);
    assert.match(await room.innerText(), /직접 해 보는 학습 탐험/);
    assert.match(await room.innerText(), /기록 저장 방식이 달라요/);
    assert.match(await room.locator('a').getAttribute('rel'), /noopener/);
    assert.equal(await room.locator('a').getAttribute('target'), '_blank');
    await room.screenshot({ path: `${out}/learning-desktop.png` });
    await page.evaluate(() => { flags.externalQuizzesEnabled = false; return DJ48SchoolHubs.open('learning'); });
    assert.equal(await room.locator('a').count(), 0);
    await page.evaluate(() => { flags.externalQuizzesEnabled = true; return DJ48SchoolHubs.open('concept'); });
    assert.equal(await room.locator('.room-purpose').count(), 0);
    assert.equal(await room.locator('.room-card').count(), 1);
    await page.setViewportSize({ width: 390, height: 844 });
    for(const hub of ['subjects', 'learning', 'popular']) {
      await page.evaluate(hub => DJ48SchoolHubs.open(hub, { subject: 'social' }), hub);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await room.screenshot({ path: `${out}/${hub}-mobile.png` });
    }
    assert.deepEqual(errors, []);
    console.log('PASS candidate: all subject counts, labels, practice/ranking/hub routes, retired entries, feature/access guards, external links, concept, desktop and mobile. Synthetic data; no backend requests.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
