#!/usr/bin/env node

const assert = require('node:assert/strict');

const DEFAULT_BASE_URL = 'https://dj48-quiztown-firebase.web.app';
const DEFAULT_CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function getConfig() {
  return {
    baseUrl: process.env.SMOKE_BASE_URL || DEFAULT_BASE_URL,
    chromePath: process.env.SMOKE_CHROME_PATH || DEFAULT_CHROME_PATH,
    publicOnly: process.env.SMOKE_PUBLIC_ONLY === '1',
    headless: process.env.SMOKE_HEADLESS !== '0',
    school: process.env.SMOKE_SCHOOL || '동자',
    grade: process.env.SMOKE_GRADE || '',
    classNo: process.env.SMOKE_CLASS || '',
    number: process.env.SMOKE_NUMBER || '',
    password: process.env.SMOKE_PASSWORD || '',
    quizId: process.env.SMOKE_QUIZ_ID || 'spelling',
    rankingMode: process.env.SMOKE_RANKING_MODE || 'normal'
  };
}

function requirePlaywright() {
  try {
    return require('playwright-core');
  } catch (error) {
    console.error('playwright-core is not installed. Run `npm install` first.');
    process.exitCode = 1;
    throw error;
  }
}

function requireAuthConfig(config) {
  const missing = [];
  if(!config.grade) missing.push('SMOKE_GRADE');
  if(!config.classNo) missing.push('SMOKE_CLASS');
  if(!config.number) missing.push('SMOKE_NUMBER');
  if(!config.password) missing.push('SMOKE_PASSWORD');
  if(missing.length) {
    throw new Error(`Missing authenticated smoke-test env vars: ${missing.join(', ')}. Use SMOKE_PUBLIC_ONLY=1 for public shell checks only.`);
  }
}

async function waitForVisible(page, selector, timeout = 15000) {
  await page.locator(selector).waitFor({ state: 'visible', timeout });
}

async function expectNoPageErrors(pageErrors) {
  assert.equal(pageErrors.length, 0, `Unexpected browser page errors:\n${pageErrors.map(error => error.stack || error.message || String(error)).join('\n')}`);
}

async function runPublicShellCheck(page, config) {
  await page.goto(config.baseUrl, { waitUntil: 'domcontentloaded' });
  await waitForVisible(page, '#login-view');
  await page.locator('#member-link-form').waitFor({ state: 'visible' });
  await page.locator('#member-link-school').waitFor({ state: 'visible' });
  await page.locator('#member-link-grade').waitFor({ state: 'visible' });
  await page.locator('#member-link-class').waitFor({ state: 'visible' });
  await page.locator('#member-link-number').waitFor({ state: 'visible' });
  await page.locator('#member-link-password').waitFor({ state: 'visible' });
  const globals = await page.evaluate(() => ({
    format: !!window.DJ48Format,
    firebase: !!window.DJ48Firebase,
    quizCatalog: !!window.DJ48QuizCatalog,
    quizPlay: !!window.DJ48QuizPlay,
    adminData: !!window.DJ48AdminData,
    accountData: !!window.DJ48AccountData,
    homeRender: !!window.DJ48HomeRender,
    eventData: !!window.DJ48EventData,
    classroomData: !!window.DJ48ClassroomData,
    shopData: !!window.DJ48ShopData,
    rankingData: !!window.DJ48RankingData
  }));
  assert.deepEqual(globals, {
    format: true,
    firebase: true,
    quizCatalog: true,
    quizPlay: true,
    adminData: true,
    accountData: true,
    homeRender: true,
    eventData: true,
    classroomData: true,
    shopData: true,
    rankingData: true
  });
}

async function login(page, config) {
  requireAuthConfig(config);
  await page.fill('#member-link-school', config.school);
  await page.fill('#member-link-grade', config.grade);
  await page.fill('#member-link-class', config.classNo);
  await page.fill('#member-link-number', config.number);
  await page.fill('#member-link-password', config.password);
  await page.click('#member-link-submit-button');
  await page.waitForFunction(() => {
    const town = document.getElementById('town-view');
    const home = document.getElementById('home-view');
    const admin = document.getElementById('admin-view');
    return town?.hidden === false || home?.hidden === false || admin?.hidden === false;
  }, null, { timeout: 30000 });
}

async function openQuiz(page, config, modeId) {
  await page.evaluate(quizId => {
    window.showQuizSelectView?.(quizId);
  }, config.quizId);
  await waitForVisible(page, '#quiz-select-view');
  if(modeId === 'ranking') {
    const rankingModeSelector = `.quiz-ranking-mode-button[data-ranking-mode="${config.rankingMode}"]`;
    if(await page.locator(rankingModeSelector).count()) {
      await page.click(rankingModeSelector);
      return;
    }
  }
  await page.click(`button[data-mode-id="${modeId}"]`);
}

async function answerCurrentQuestion(page, options = {}) {
  const answerInfo = await page.evaluate(({ forceWrong }) => {
    const deps = window.getQuizPlayDeps?.();
    const questionSet = deps?.getCurrentQuestionSet?.() || [];
    const question = questionSet[deps?.getCurrentQuestionIndex?.()];
    if(!question) return null;
    if(question.type === 'textInput' || question.type === 'imageInput') {
      const answer = forceWrong ? '__wrong_smoke_answer__' : String(question.answerText || question.answer || '');
      return { type: 'input', answer };
    }
    const correctIndex = Number(question.answer);
    const choices = Array.isArray(question.choices) ? question.choices : [];
    const wrongIndex = choices.findIndex((_, index) => index !== correctIndex);
    return {
      type: 'choice',
      index: forceWrong && wrongIndex >= 0 ? wrongIndex : correctIndex
    };
  }, { forceWrong: !!options.forceWrong });
  assert.ok(answerInfo, 'Could not read current quiz question.');

  if(answerInfo.type === 'input') {
    await page.fill('.quiz-answer-input', answerInfo.answer);
    await page.click('.quiz-submit-button:not([data-next-question])');
  } else {
    await page.click(`.quiz-choice[data-choice-index="${answerInfo.index}"]`);
    await page.click('.quiz-submit-button:not([data-next-question])');
  }
  await waitForVisible(page, '.quiz-result-card');
}

async function runPracticeFlow(page, config) {
  await openQuiz(page, config, 'practice');
  await waitForVisible(page, '#quiz-play-view');
  await answerCurrentQuestion(page);
  await page.locator('#practice-save-status').waitFor({ state: 'visible', timeout: 15000 });
  await page.click('[data-next-question]');
  await waitForVisible(page, '.quiz-question-card');
  await page.evaluate(() => window.showQuizComplete?.());
  await waitForVisible(page, '.quiz-complete-card');
  await page.click('[data-back-to-quiz-select]');
  await waitForVisible(page, '#quiz-select-view');
}

async function runRankingFlow(page, config) {
  await openQuiz(page, config, 'ranking');
  await waitForVisible(page, '#quiz-play-view');
  await answerCurrentQuestion(page, { forceWrong: true });
  const resultText = await page.locator('.quiz-result-card').innerText();
  assert.match(resultText, /오답|시간 초과|결과 보기|다음 문제/);
  await page.evaluate(() => window.showQuizComplete?.());
  await waitForVisible(page, '.quiz-complete-card');
  await page.locator('#ranking-save-status').waitFor({ state: 'visible', timeout: 15000 });
  await page.click('[data-back-to-quiz-select]');
  await waitForVisible(page, '#quiz-select-view');
}

async function runHomeProfileCheck(page) {
  await page.evaluate(() => window.showTownView?.());
  await waitForVisible(page, '#town-view');
  await page.evaluate(() => window.showHomeView?.());
  await waitForVisible(page, '#home-view');
  await page.locator('#profile-card-root').waitFor({ state: 'visible' });
  await page.locator('[data-home-detail-toggle="ranking"]').click();
  await page.locator('[data-home-detail-toggle="titles"]').click();
  await page.locator('[data-home-detail-toggle="badges"]').click();
}

async function runFeatureEntryChecks(page) {
  await page.evaluate(() => window.showTownView?.());
  await waitForVisible(page, '#town-view');
  const featureFlags = await page.evaluate(async () => {
    if(typeof window.loadFeatureFlags !== 'function') return {};
    return await window.loadFeatureFlags();
  });

  if(featureFlags.rankingEnabled !== false) {
    await page.evaluate(async () => {
      await window.showRankingView?.();
    });
    await waitForVisible(page, '#ranking-view');
    await page.locator('#ranking-board-root').waitFor({ state: 'visible', timeout: 15000 });
  }

  if(featureFlags.shopEnabled !== false) {
    await page.evaluate(async () => {
      await window.showShopView?.();
    });
    await waitForVisible(page, '#shop-view');
    await page.locator('#shop-item-grid').waitFor({ state: 'visible', timeout: 15000 });
  }

  if(featureFlags.eventPlazaEnabled !== false) {
    await page.evaluate(async () => {
      await window.showEventView?.();
    });
    await waitForVisible(page, '#event-view');
    await page.locator('#quest-card-grid').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('#season-event-grid').waitFor({ state: 'visible', timeout: 15000 });
  }

  await page.evaluate(() => window.showClassroomView?.(true));
  await waitForVisible(page, '#classroom-view');
  await page.locator('#classroom-main-panel').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#classroom-quest-grid').waitFor({ state: 'visible', timeout: 15000 });
}

async function main() {
  const config = getConfig();
  const { chromium } = requirePlaywright();
  const browser = await chromium.launch({
    executablePath: config.chromePath,
    headless: config.headless
  });
  const pageErrors = [];
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 }
  });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error));
  page.on('console', message => {
    if(message.type() === 'error') {
      pageErrors.push(new Error(message.text()));
    }
  });

  try {
    await runPublicShellCheck(page, config);
    if(!config.publicOnly) {
      await login(page, config);
      await runPracticeFlow(page, config);
      await runRankingFlow(page, config);
      await runHomeProfileCheck(page);
      await runFeatureEntryChecks(page);
    }
    await expectNoPageErrors(pageErrors);
    console.log(`Browser smoke test passed: ${config.publicOnly ? 'public shell' : 'authenticated practice/ranking/home/features'} @ ${config.baseUrl}`);
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
