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
    rankingMode: process.env.SMOKE_RANKING_MODE || 'normal',
    profileWrite: process.env.SMOKE_PROFILE_WRITE === '1',
    adminRead: process.env.SMOKE_ADMIN_READ === '1'
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
      adminRepository: hasScript('/js/infrastructure/admin-repository.js') ? !!window.DJ48AdminRepository : true,
      adminState: hasScript('/js/features/admin-state.js') ? !!window.DJ48AdminState : true,
      adminUsecases: hasScript('/js/application/admin-usecases.js') ? !!window.DJ48AdminUsecases : true,
      accountData: !!window.DJ48AccountData,
      accountDomain: hasScript('/js/domain/account-domain.js') ? !!window.DJ48AccountDomain : true,
      accountState: hasScript('/js/features/account-state.js') ? !!window.DJ48AccountState : true,
      accountRepository: hasScript('/js/infrastructure/account-repository.js') ? !!window.DJ48AccountRepository : true,
      accountUsecases: hasScript('/js/application/account-usecases.js') ? !!window.DJ48AccountUsecases : true,
      accountController: hasScript('/js/features/account-controller.js') ? !!window.DJ48AccountController : true,
      appEvents: hasScript('/js/features/app-events.js') ? !!window.DJ48AppEvents : true,
      appBootstrap: hasScript('/js/app/bootstrap.js') ? !!window.DJ48AppBootstrap : true,
      adminController: hasScript('/js/features/admin-controller.js') ? !!window.DJ48AdminController : true,
      homeState: hasScript('/js/features/home-state.js') ? !!window.DJ48HomeState : true,
      homeRepository: hasScript('/js/infrastructure/home-repository.js') ? !!window.DJ48HomeRepository : true,
      profileRepository: hasScript('/js/infrastructure/profile-repository.js') ? !!window.DJ48ProfileRepository : true,
      homeUsecases: hasScript('/js/application/home-usecases.js') ? !!window.DJ48HomeUsecases : true,
      profileUsecases: hasScript('/js/application/profile-usecases.js') ? !!window.DJ48ProfileUsecases : true,
      homeController: hasScript('/js/features/home-controller.js') ? !!window.DJ48HomeController : true,
      eventState: hasScript('/js/features/event-state.js') ? !!window.DJ48EventState : true,
      eventDomain: hasScript('/js/domain/event-domain.js') ? !!window.DJ48EventDomain : true,
      eventRepository: hasScript('/js/infrastructure/event-repository.js') ? !!window.DJ48EventRepository : true,
      eventUsecases: hasScript('/js/application/event-usecases.js') ? !!window.DJ48EventUsecases : true,
      eventController: hasScript('/js/features/event-controller.js') ? !!window.DJ48EventController : true,
      classroomState: hasScript('/js/features/classroom-state.js') ? !!window.DJ48ClassroomState : true,
      classroomDomain: hasScript('/js/domain/classroom-domain.js') ? !!window.DJ48ClassroomDomain : true,
      classroomRepository: hasScript('/js/infrastructure/classroom-repository.js') ? !!window.DJ48ClassroomRepository : true,
      classroomUsecases: hasScript('/js/application/classroom-usecases.js') ? !!window.DJ48ClassroomUsecases : true,
      classroomController: hasScript('/js/features/classroom-controller.js') ? !!window.DJ48ClassroomController : true,
      shopState: hasScript('/js/features/shop-state.js') ? !!window.DJ48ShopState : true,
      shopUsecases: hasScript('/js/application/shop-usecases.js') ? !!window.DJ48ShopUsecases : true,
      shopRepository: hasScript('/js/infrastructure/shop-repository.js') ? !!window.DJ48ShopRepository : true,
      shopController: hasScript('/js/features/shop-controller.js') ? !!window.DJ48ShopController : true,
      rankingState: hasScript('/js/features/ranking-state.js') ? !!window.DJ48RankingState : true,
      rankingRepository: hasScript('/js/infrastructure/ranking-repository.js') ? !!window.DJ48RankingRepository : true,
      rankingUsecases: hasScript('/js/application/ranking-usecases.js') ? !!window.DJ48RankingUsecases : true,
      schoolController: hasScript('/js/features/school-controller.js') ? !!window.DJ48SchoolController : true,
      quizSessionState: hasScript('/js/features/quiz-session-state.js') ? !!window.DJ48QuizSessionState : true,
      quizController: hasScript('/js/features/quiz-controller.js') ? !!window.DJ48QuizController : true,
      quizDomain: hasScript('/js/domain/quiz-domain.js') ? !!window.DJ48QuizDomain : true,
      quizRepository: hasScript('/js/infrastructure/quiz-repository.js') ? !!window.DJ48QuizRepository : true,
      quizRender: hasScript('/js/features/quiz-render.js') ? !!window.DJ48QuizRender : true,
      quizPopularSession: hasScript('/js/features/quiz-popular-session.js') ? !!window.DJ48QuizPopularSession : true,
      quizFlow: hasScript('/js/features/quiz-flow.js') ? !!window.DJ48QuizFlow : true,
      quizUsecases: hasScript('/js/application/quiz-usecases.js') ? !!window.DJ48QuizUsecases : true,
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
    adminRepository: true,
    adminState: true,
    adminUsecases: true,
    accountData: true,
    accountDomain: true,
    accountState: true,
    accountRepository: true,
    accountUsecases: true,
    accountController: true,
    appEvents: true,
    appBootstrap: true,
    adminController: true,
    homeState: true,
    homeRepository: true,
    profileRepository: true,
    homeUsecases: true,
    profileUsecases: true,
    homeController: true,
    eventState: true,
    eventDomain: true,
    eventRepository: true,
    eventUsecases: true,
    eventController: true,
    classroomState: true,
    classroomDomain: true,
    classroomRepository: true,
    classroomUsecases: true,
    classroomController: true,
    shopState: true,
    shopUsecases: true,
    shopRepository: true,
    shopController: true,
    rankingState: true,
    rankingRepository: true,
    rankingUsecases: true,
    schoolController: true,
    quizSessionState: true,
    quizController: true,
    quizDomain: true,
    quizRepository: true,
    quizRender: true,
    quizPopularSession: true,
    quizFlow: true,
    quizUsecases: true,
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

async function expectPracticePersistenceStatus(page) {
  const status = page.locator('#practice-save-status');
  await status.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    const text = document.getElementById('practice-save-status')?.textContent?.trim() || '';
    return /기록 저장 완료|이미 맞힌 문제|기록 저장을 확인하지 못했어요/.test(text) && !/저장 중/.test(text);
  }, null, { timeout: 20000 });
  const text = (await status.innerText()).trim();
  assert.match(
    text,
    /기록 저장 완료|이미 맞힌 문제|기록 저장을 확인하지 못했어요/,
    `Unexpected practice persistence status: ${text}`
  );
  assert.doesNotMatch(text, /저장 중/, 'Practice persistence status did not settle.');
}

async function expectQuizCompleteCard(page, options = {}) {
  await waitForVisible(page, '.quiz-complete-card');
  const cardState = await page.locator('.quiz-complete-card').evaluate(card => ({
    title: card.querySelector('h3')?.textContent?.trim() || '',
    score: card.querySelector('.quiz-complete-score')?.textContent?.trim() || '',
    rewardCount: card.querySelectorAll('.quiz-reward-card').length,
    hasBackButton: !!card.querySelector('[data-back-to-quiz-select]')
  }));
  assert.equal(cardState.title, options.expectedTitle);
  assert.match(cardState.score, /\d+문제 중 \d+개/);
  assert.ok(cardState.rewardCount >= 2, 'Expected quiz completion reward/status cards.');
  assert.equal(cardState.hasBackButton, true);
}

async function expectRankingPersistenceStatus(page) {
  const status = page.locator('#ranking-save-status');
  await status.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    const text = document.getElementById('ranking-save-status')?.textContent?.trim() || '';
    return /랭킹 기록 저장 완료|점수가 0점|랭킹 기록 저장을 확인하지 못했어요|20분이 초과되어/.test(text) && !/저장 중/.test(text);
  }, null, { timeout: 20000 });
  const text = (await status.innerText()).trim();
  assert.match(
    text,
    /랭킹 기록 저장 완료|점수가 0점|랭킹 기록 저장을 확인하지 못했어요|20분이 초과되어/,
    `Unexpected ranking persistence status: ${text}`
  );
  assert.doesNotMatch(text, /저장 중/, 'Ranking persistence status did not settle.');
}

async function runPracticeFlow(page, config) {
  await openQuiz(page, config, 'practice');
  await waitForVisible(page, '#quiz-play-view');
  await answerCurrentQuestion(page);
  await expectPracticePersistenceStatus(page);
  await page.click('[data-next-question]');
  await waitForVisible(page, '.quiz-question-card');
  await page.evaluate(() => window.showQuizComplete?.());
  await expectQuizCompleteCard(page, { expectedTitle: '연습 완료' });
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
  await expectQuizCompleteCard(page, { expectedTitle: '랭킹전 종료' });
  await expectRankingPersistenceStatus(page);
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
    const toggle = page.locator('[data-profile-detail-toggle]').first();
    await ensureProfileDetailPanelOpen(page, toggle);
    const expanded = await toggle.getAttribute('aria-expanded');
    assert.equal(expanded, 'true');
  }
}

async function ensureProfileDetailPanelOpen(page, toggle) {
  await toggle.waitFor({ state: 'visible', timeout: 15000 });
  const detailKey = await toggle.getAttribute('data-profile-detail-toggle');
  const expanded = await toggle.getAttribute('aria-expanded');
  if(expanded !== 'true') await toggle.click();
  if(detailKey) {
    await page.locator(`[data-profile-detail-panel="${detailKey}"]`).waitFor({ state: 'visible', timeout: 15000 });
  }
}

async function runProfileWriteFlow(page) {
  await page.evaluate(() => window.showHomeView?.());
  await waitForVisible(page, '#home-view');
  await page.locator('#profile-card-root').waitFor({ state: 'visible' });
  const messageToggle = page.locator('[data-profile-detail-toggle="message"]');
  await ensureProfileDetailPanelOpen(page, messageToggle);
  const input = page.locator('#profile-ranking-message-input');
  const status = page.locator('#profile-ranking-message-status');
  await input.waitFor({ state: 'visible', timeout: 15000 });
  const originalMessage = await input.inputValue();
  const smokeMessage = `smoke-${Date.now().toString(36).slice(-6)}`;

  async function saveMessage(message, expectedPattern, options = {}) {
    const nextInput = page.locator('#profile-ranking-message-input');
    await ensureProfileDetailPanelOpen(page, messageToggle);
    await nextInput.waitFor({ state: 'visible', timeout: 15000 });
    await nextInput.fill(message);
    const clicked = await page.evaluate(() => {
      const button = document.getElementById('profile-ranking-message-save-button');
      if(!button) return false;
      button.click();
      return true;
    });
    assert.equal(clicked, true);
    try {
      await page.waitForFunction(({ pattern, expectedValue, allowPanelReset }) => {
        const text = document.getElementById('profile-ranking-message-status')?.textContent?.trim() || '';
        const value = document.getElementById('profile-ranking-message-input')?.value || '';
        if(new RegExp(pattern).test(text)) return true;
        return allowPanelReset
          && value === expectedValue
          && /최대 24자/.test(text)
          && !/문제가|불러오지|실패|오류/.test(text);
      }, {
        pattern: expectedPattern,
        expectedValue: message,
        allowPanelReset: !!options.allowPanelReset
      }, { timeout: 20000 });
    } catch(error) {
      const statusText = await status.innerText().catch(() => '');
      throw new Error(`Profile write status did not match /${expectedPattern}/. Current status: ${statusText}`);
    }
    const statusText = (await status.innerText()).trim();
    if(!options.allowPanelReset || !/최대 24자/.test(statusText)) {
      assert.match(statusText, new RegExp(expectedPattern));
    }
  }

  try {
    await saveMessage(smokeMessage, '한마디를 저장했습니다');
    assert.equal(await input.inputValue(), smokeMessage);
  } finally {
    await saveMessage(originalMessage, originalMessage ? '한마디를 저장했습니다' : '한마디를 비웠습니다', {
      allowPanelReset: true
    });
    assert.equal(await input.inputValue(), originalMessage);
  }
}

async function runAdminReadFlow(page) {
  const isAdminViewVisible = await page.evaluate(() => document.getElementById('admin-view')?.hidden === false);
  if(!isAdminViewVisible) return { skipped: true, reason: 'not-admin-session' };

  await page.locator('#admin-dashboard-grid').waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForFunction(() => {
    const status = document.getElementById('admin-dashboard-status')?.textContent?.trim() || '';
    return status && !/불러오는 중|로드 중|점검하는 중/.test(status);
  }, null, { timeout: 20000 });
  await page.locator('#admin-member-list').waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForFunction(() => {
    const status = document.getElementById('admin-status')?.textContent?.trim() || '';
    const list = document.getElementById('admin-member-list');
    return (status && !/불러오는 중|조회 중/.test(status)) || !!list?.children?.length;
  }, null, { timeout: 20000 });
  return { skipped: false };
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
  await page.locator('#classroom-today-grid').waitFor({ state: 'visible', timeout: 15000 });
  assert.ok(await page.locator('#classroom-today-grid .classroom-today-card').count() >= 6, 'classroom today cards should render');
  assert.ok(await page.locator('#classroom-today-grid [data-classroom-today-tab]').count() >= 3, 'classroom today shortcuts should render');
  await page.locator('#classroom-quest-grid').waitFor({ state: 'visible', timeout: 15000 });
  await page.click('[data-classroom-tab="gems"]');
  await page.locator('#classroom-gem-summary').waitFor({ state: 'visible', timeout: 15000 });
  if(await page.locator('[data-classroom-tab="jobs"]').count()) {
    await page.click('[data-classroom-tab="jobs"]');
    const isActive = await page.locator('[data-classroom-tab="jobs"]').evaluate(element => element.classList.contains('is-active'));
    assert.equal(isActive, true);
    await page.locator('#classroom-job-summary').waitFor({ state: 'visible', timeout: 15000 });
  }
  if(await page.locator('[data-classroom-tab="shop"]').count()) {
    await page.click('[data-classroom-tab="shop"]');
    await page.locator('#classroom-shop-history').waitFor({ state: 'visible', timeout: 15000 });
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
      if(config.adminRead) await runAdminReadFlow(page);
      await runPracticeFlow(page, config);
      await runRankingFlow(page, config);
      await runHomeProfileCheck(page);
      if(config.profileWrite) await runProfileWriteFlow(page);
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
