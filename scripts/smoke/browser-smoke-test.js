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
  const globals = await page.evaluate(() => {
    const hasScript = src => !!document.querySelector(`script[src="${src}"]`);
    return {
      format: !!window.DJ48Format,
      firebase: !!window.DJ48Firebase,
      quizCatalog: !!window.DJ48QuizCatalog,
      quizPlay: !!window.DJ48QuizPlay,
      adminData: !!window.DJ48AdminData,
      adminState: hasScript('/js/features/admin-state.js') ? !!window.DJ48AdminState : true,
      accountData: !!window.DJ48AccountData,
      accountDomain: hasScript('/js/domain/account-domain.js') ? !!window.DJ48AccountDomain : true,
      accountState: hasScript('/js/features/account-state.js') ? !!window.DJ48AccountState : true,
      accountController: hasScript('/js/features/account-controller.js') ? !!window.DJ48AccountController : true,
      appEvents: hasScript('/js/features/app-events.js') ? !!window.DJ48AppEvents : true,
      adminController: hasScript('/js/features/admin-controller.js') ? !!window.DJ48AdminController : true,
      homeState: hasScript('/js/features/home-state.js') ? !!window.DJ48HomeState : true,
      homeUsecases: hasScript('/js/application/home-usecases.js') ? !!window.DJ48HomeUsecases : true,
      homeController: hasScript('/js/features/home-controller.js') ? !!window.DJ48HomeController : true,
      eventState: hasScript('/js/features/event-state.js') ? !!window.DJ48EventState : true,
      eventDomain: hasScript('/js/domain/event-domain.js') ? !!window.DJ48EventDomain : true,
      eventUsecases: hasScript('/js/application/event-usecases.js') ? !!window.DJ48EventUsecases : true,
      eventController: hasScript('/js/features/event-controller.js') ? !!window.DJ48EventController : true,
      classroomState: hasScript('/js/features/classroom-state.js') ? !!window.DJ48ClassroomState : true,
      classroomDomain: hasScript('/js/domain/classroom-domain.js') ? !!window.DJ48ClassroomDomain : true,
      classroomUsecases: hasScript('/js/application/classroom-usecases.js') ? !!window.DJ48ClassroomUsecases : true,
      classroomController: hasScript('/js/features/classroom-controller.js') ? !!window.DJ48ClassroomController : true,
      shopState: hasScript('/js/features/shop-state.js') ? !!window.DJ48ShopState : true,
      shopUsecases: hasScript('/js/application/shop-usecases.js') ? !!window.DJ48ShopUsecases : true,
      shopController: hasScript('/js/features/shop-controller.js') ? !!window.DJ48ShopController : true,
      rankingState: hasScript('/js/features/ranking-state.js') ? !!window.DJ48RankingState : true,
      rankingUsecases: hasScript('/js/application/ranking-usecases.js') ? !!window.DJ48RankingUsecases : true,
      schoolController: hasScript('/js/features/school-controller.js') ? !!window.DJ48SchoolController : true,
      quizSessionState: hasScript('/js/features/quiz-session-state.js') ? !!window.DJ48QuizSessionState : true,
      quizController: hasScript('/js/features/quiz-controller.js') ? !!window.DJ48QuizController : true,
      quizDomain: hasScript('/js/domain/quiz-domain.js') ? !!window.DJ48QuizDomain : true,
      quizFlow: hasScript('/js/features/quiz-flow.js') ? !!window.DJ48QuizFlow : true,
      homeRender: !!window.DJ48HomeRender,
      eventData: !!window.DJ48EventData,
      classroomData: !!window.DJ48ClassroomData,
      shopDomain: hasScript('/js/domain/shop-domain.js') ? !!window.DJ48ShopDomain : true,
      shopData: !!window.DJ48ShopData,
      rankingDomain: hasScript('/js/domain/ranking-domain.js') ? !!window.DJ48RankingDomain : true,
      rankingData: !!window.DJ48RankingData
    };
  });
  assert.deepEqual(globals, {
    format: true,
    firebase: true,
    quizCatalog: true,
    quizPlay: true,
    adminData: true,
    adminState: true,
    accountData: true,
    accountDomain: true,
    accountState: true,
    accountController: true,
    appEvents: true,
    adminController: true,
    homeState: true,
    homeUsecases: true,
    homeController: true,
    eventState: true,
    eventDomain: true,
    eventUsecases: true,
    eventController: true,
    classroomState: true,
    classroomDomain: true,
    classroomUsecases: true,
    classroomController: true,
    shopState: true,
    shopUsecases: true,
    shopController: true,
    rankingState: true,
    rankingUsecases: true,
    schoolController: true,
    quizSessionState: true,
    quizController: true,
    quizDomain: true,
    quizFlow: true,
    homeRender: true,
    eventData: true,
    classroomData: true,
    shopDomain: true,
    shopData: true,
    rankingDomain: true,
    rankingData: true
  });
}

async function runAccountEntryCheck(page) {
  await page.click('[data-member-form-mode="signup"]');
  const signupState = await page.evaluate(() => ({
    formClass: document.getElementById('member-link-form')?.className || '',
    action: document.getElementById('member-link-submit-button')?.value || ''
  }));
  assert.match(signupState.formClass, /is-signup-mode/);
  assert.equal(signupState.action, 'setup');

  await page.click('[data-member-form-mode="login"]');
  const loginState = await page.evaluate(() => ({
    formClass: document.getElementById('member-link-form')?.className || '',
    action: document.getElementById('member-link-submit-button')?.value || ''
  }));
  assert.match(loginState.formClass, /is-login-mode/);
  assert.equal(loginState.action, 'login');
}

async function runAdminShellCheck(page) {
  const adminShell = await page.evaluate(() => ({
    viewExists: !!document.getElementById('admin-view'),
    tabCount: document.querySelectorAll('[data-admin-section-target]').length,
    dashboardExists: !!document.getElementById('admin-section-dashboard'),
    membersExists: !!document.getElementById('admin-section-members')
  }));
  assert.equal(adminShell.viewExists, true);
  assert.ok(adminShell.tabCount >= 6, 'Expected admin section tabs to be present.');
  assert.equal(adminShell.dashboardExists, true);
  assert.equal(adminShell.membersExists, true);
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
  if(await page.locator('[data-profile-detail-toggle]').count()) {
    await page.locator('[data-profile-detail-toggle]').first().click();
    const expanded = await page.locator('[data-profile-detail-toggle]').first().getAttribute('aria-expanded');
    assert.equal(expanded, 'true');
  }
}

async function runSchoolSelectCheck(page) {
  await page.evaluate(() => window.showSchoolView?.());
  await waitForVisible(page, '#school-view');
  const subjectCard = page.locator('#school-quiz-grid [data-subject-id]:not([data-subject-id="popular"])').first();
  await subjectCard.waitFor({ state: 'visible', timeout: 15000 });
  await subjectCard.click();
  await waitForVisible(page, '#subject-view');
  const quizCard = page.locator('#subject-quiz-grid [data-quiz-id]').first();
  await quizCard.waitFor({ state: 'visible', timeout: 15000 });
  await quizCard.click();
  await waitForVisible(page, '#quiz-select-view');
  await page.click('[data-back-to-subject]');
  await waitForVisible(page, '#subject-view');
  await page.click('[data-back-to-school]');
  await waitForVisible(page, '#school-view');
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
    await page.locator('#shop-item-grid [data-shop-item-id]').first().waitFor({ state: 'visible', timeout: 15000 });
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
  if(await page.locator('[data-classroom-tab="jobs"]').count()) {
    await page.click('[data-classroom-tab="jobs"]');
    const isActive = await page.locator('[data-classroom-tab="jobs"]').evaluate(element => element.classList.contains('is-active'));
    assert.equal(isActive, true);
  }
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
    await runAccountEntryCheck(page);
    await runAdminShellCheck(page);
    if(!config.publicOnly) {
      await login(page, config);
      await runPracticeFlow(page, config);
      await runRankingFlow(page, config);
      await runHomeProfileCheck(page);
      await runSchoolSelectCheck(page);
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
