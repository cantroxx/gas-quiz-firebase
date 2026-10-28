#!/usr/bin/env node
// Offline UI regression checks: all requests are fulfilled from public/ or blocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const ROOT = path.resolve(__dirname, '../..');
const PUBLIC = path.resolve(process.env.CLASSROOM_PUBLIC_DIR || path.join(ROOT, 'public'));
const ORIGIN = 'http://classroom.test';
const output = process.env.CLASSROOM_SCREENSHOT_DIR;

async function run() {
  const browser = await chromium.launch({
    executablePath: process.env.SMOKE_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if(url.origin !== ORIGIN) return route.abort();
      const file = path.resolve(PUBLIC, `.${url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)}`);
      if(!file.startsWith(PUBLIC + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
      let body = fs.readFileSync(file);
      if(url.pathname === '/') body = body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      const types = { '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.js': 'application/javascript' };
      return route.fulfill({ body, contentType: types[path.extname(file)] || 'application/octet-stream' });
    });
    await page.goto(ORIGIN);
    for(const file of ['domain/classroom-domain.js', 'application/classroom-usecases.js', 'features/classroom-state.js',
      'data/level-medal-assets.js', 'features/classroom-form.js', 'features/classroom-portrait.js', 'features/classroom-card-home.js', 'features/classroom-diary.js', 'features/classroom-shop-art.js', 'features/classroom-workspace.js', 'features/classroom-render.js', 'features/classroom-controller.js']) {
      await page.addScriptTag({ path: path.join(PUBLIC, 'js', file) });
    }
    await page.evaluate(() => {
      document.querySelectorAll('.app-view').forEach(view => { view.hidden = view.id !== 'classroom-view'; });
      DJ48ClassroomForm.setClassroomUnlocked(true);
      window.uiData = {
        settings: { classId: 'demo-class', quests: [
          { id: 'read', title: '책 10분 읽기', desc: '읽은 내용을 한 문장으로 적어요.', rewardCoin: 5, linkedGemNames: ['독서젬'], rewardMode: 'auto', repeatRule: 'daily', active: true, saveEnabled: true, studentAction: '완료 체크' },
          { id: 'help', title: '친구 도와주기', desc: '친구를 돕고 선생님께 확인받아요.', rewardCoin: 3, rewardMode: 'teacherReview', active: true, saveEnabled: true, studentAction: '검토 요청' },
          { id: 'future', title: '다음 달 활동', startDate: '2099-01-01', active: true, saveEnabled: true },
          { id: 'targeted', title: '다른 학생 활동', targetStudentIds: ['S2'], active: true, saveEnabled: true }
        ] },
        progressMap: {}, wallet: { point: 35.5 },
        gemProgress: [{ gemId: 'reading', gemName: '독서젬', icon: 'gemReading', currentXp: 3, targetXp: 10, rewardPoint: 10 }],
        reviewItems: [{ itemType: 'quest', recordId: 'rev1', questId: 'help', memberNickname: '샘플학생 2', rewardPoint: 3 }],
        studentCards: Array.from({ length: 24 }, (_, i) => ({ memberUserId: `S${i + 1}`, studentNumber: i + 1, nickname: `샘플학생 ${i + 1}`, point: 35.5 + i, djCoin: 120, level: 4, selectedKeyring: { label: '독서 새싹' } })),
        economyBoard: {
          myDjCoin: 120, classNotices: { slots: [] }, billboardMessages: [],
          jobs: [{ jobId: 'library', title: '도서 도우미', weeklyPayPoint: 5, maxAssignees: 2 }],
          assignments: [], applications: [{ applicationId: 'app1', jobId: 'library', jobTitle: '도서 도우미', memberUserId: 'S2', memberNickname: '샘플학생 2', status: 'pending' }],
          routines: [{ routineId: 'routine1', title: '매일 독서', status: 'active', canCheckToday: true, currentCount: 3, targetCount: 10, rewardPoint: 5, checkItems: [{ itemId: 'read', label: '책 10분 읽기' }] }],
          shopItems: [
            { itemId: 'coupon', title: '자리 선택 쿠폰', desc: '원하는 자리를 선생님과 정해 하루 동안 사용할 수 있어요.', priceType: 'point', pricePoint: 10, itemType: 'coupon', icon: 'ticket' },
            { itemId: 'music', title: '우리반 음악 DJ', desc: '쉬는 시간에 우리반이 들을 노래를 골라요.', priceType: 'point', pricePoint: 20, itemType: 'coupon', icon: 'music' },
            { itemId: 'game', title: '함께 보드게임', desc: '친구들과 함께 보드게임을 즐겨요.', priceType: 'point', pricePoint: 50, itemType: 'coupon' },
            { itemId: 'snack', title: '간식 쿠폰', desc: '선생님과 정한 간식을 받을 수 있어요.', priceType: 'point', pricePoint: 5, itemType: 'coupon' },
            { itemId: 'lunch', title: '급식 순서 정하기', desc: '선생님과 순서를 정해요.', priceType: 'point', pricePoint: 15, itemType: 'coupon' },
            { itemId: 'coinCoupon', title: '칭찬 스티커', priceType: 'djCoin', priceCoin: 30, itemType: 'coupon' }
          ],
          purchases: [{ purchaseId: 'purchase1', itemId: 'coupon', itemTitle: '자리 선택 쿠폰', memberUserId: 'S2', memberNickname: '샘플학생 2', status: 'use_requested' }],
          savingsProducts: [], savingsAccounts: [], groupPurchases: [], taxPresets: [], pointLogs: [],
          classroomGems: [{ gemId: 'reading', gemName: '독서젬', icon: 'gemReading', targetXp: 10 }],
          exchangeSettings: { pointToCoinEnabled: true, coinToPointEnabled: true, pointToCoinPointCost: 3, coinToPointReward: .5 },
          classMission: { title: '우리반 함께 읽기', totalPoint: 45, remainingPoint: 55, thresholds: [{ label: '첫 목표', targetPoint: 100, rewardText: '함께 보드게임', achieved: false }] }
        }
      };
      uiData.reviewItems.routineBoard = {
        ongoing: [{ memberUserId: 'S1', memberNickname: '샘플학생 1', routineTitle: '매일 독서', currentCount: 3, targetCount: 10, achievementPercent: 30, startDate: '2026-10-01', endDate: '2026-10-31', baseRewardPoint: 5 }],
        reviewPending: [], processed: []
      };
      uiData.settings = DJ48ClassroomDomain.normalizeClassroomSettings(uiData.settings);
      window.uiTeacher = false;
      window.uiCalls = [];
      window.uiRender = teacher => {
        window.uiTeacher = teacher;
        DJ48ClassroomRender.renderClassroomSections(uiData, {
          isCurrentClassroomTeacher: () => teacher, currentMemberUserId: teacher ? 'T1' : 'S1', getTodayDateKey: () => '2026-10-02',
          normalizeDisplayImageUrl: value => value, getLevelMedalAsset: DJ48LevelMedalAssets.getLevelMedalAsset
        });
        DJ48ClassroomRender.renderClassroomLoadState('ready');
      };
      DJ48ClassroomController.bindClassroomEvents({
        openHome: () => window.uiOpenHome?.(),
        returnToClassroom: () => window.uiReturnToClassroom?.(),
        setActiveClassroomTab: DJ48ClassroomForm.setActiveClassroomTab,
        retryClassroom: () => { uiCalls.push('retry'); uiRender(uiTeacher); },
        completeClassroomCheckQuest: (questId, button) => DJ48ClassroomUsecases.completeCurrentMemberClassroomQuestFlow({ questId }, {
          loadClassroomSettings: async () => uiData.settings,
          findClassroomQuest: (settings, id) => settings.quests.find(quest => quest.id === id),
          getCurrentMemberUserId: () => 'S1', getTodayDateKey: () => '2026-10-02', getQuestActionButton: () => button,
          completeAutoQuest: async () => { uiCalls.push(`complete:${questId}`); uiData.progressMap[questId] = { rewardStatus: 'paid' }; },
          saveManualQuestProgress: async () => { uiCalls.push(`review:${questId}`); uiData.progressMap[questId] = { rewardStatus: 'pending_teacher_review' }; },
          renderClassroom: async () => uiRender(uiTeacher)
        }),
        setClassroomRoutineBoardSelection: DJ48ClassroomRender.setClassroomRoutineBoardSelection,
        purchaseClassroomShopItem: id => uiCalls.push(`buy:${id}`),
        exchangeClassroomCurrency: direction => uiCalls.push(`exchange:${direction}`),
        reviewClassroomQuestProgress: (id, action) => uiCalls.push(`approve:${id}:${action}`),
        editClassroomRoutine: () => { document.getElementById('classroom-routine-editor').open = true; }
      });
      uiRender(false);
    });
    if(process.env.CLASSROOM_PICKER_REVIEW_DIR) { await require('./classroom-icon-picker-review')(page, process.env.CLASSROOM_PICKER_REVIEW_DIR); return; }
    if(process.env.CLASSROOM_MARKET_ART_DIR) { await require('./classroom-market-art-review')(page, process.env.CLASSROOM_MARKET_ART_DIR); return; }
    if(process.env.CLASSROOM_PROFILE) { await require('./classroom-profile')(page, process.env.CLASSROOM_PROFILE); return; }
    if(process.env.CLASSROOM_RETAIN_PROFILE) { await require('../audit/classroom-retained-render-profile')(page, process.env.CLASSROOM_RETAIN_PROFILE); return; }
    if(process.env.CLASSROOM_DIAGNOSTICS) { await require('../audit/classroom-render-diagnostics')(page, process.env.CLASSROOM_DIAGNOSTICS); return; }
    if(process.env.CLASSROOM_RENDER_PROFILE) { await require('../audit/classroom-render-profile')(page, process.env.CLASSROOM_RENDER_PROFILE); return; }
    if(process.env.CLASSROOM_REVIEW_DIR) { await require('../audit/classroom-final-review')(page, process.env.CLASSROOM_REVIEW_DIR); return; }
    const metrics = [];
    for(const teacher of [false, true]) {
      await page.evaluate(value => { uiRender(value); DJ48ClassroomForm.setActiveClassroomTab('today'); }, teacher);
      for(const width of [1440, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        for(const tab of ['today', 'quest', 'routine', 'gems', 'classroom', 'jobs', 'market', 'bank', 'mission', ...(teacher ? ['teacher'] : [])]) {
          await page.evaluate(value => DJ48ClassroomForm.setActiveClassroomTab(value), tab);
          const actual = await page.evaluate(() => ({
            scroll: document.documentElement.scrollWidth, viewport: innerWidth,
            taskTop: document.querySelector('.classroom-checklist-section').getBoundingClientRect().top,
            cardTop: document.querySelector('.classroom-personal-card')?.getBoundingClientRect().top,
            active: document.querySelector('.classroom-panel.is-active')?.dataset.classroomPanel
          }));
          assert.equal(actual.active, tab);
          assert.ok(actual.scroll <= actual.viewport + 1, `${teacher ? 'teacher' : 'student'} ${width}/${tab} overflows: ${actual.scroll}`);
          if(tab === 'today') {
            assert.ok((teacher ? actual.taskTop : actual.cardTop) < 600, `today primary content should appear early: ${JSON.stringify(actual)}`);
            metrics.push({ role: teacher ? 'teacher' : 'student', width, taskTop: Math.round(actual.taskTop) });
          }
          if(output && [1440, 768, 390].includes(width)) {
            fs.mkdirSync(output, { recursive: true });
            // Let the compositor finish the resized/tab-switched frame before full-page capture.
            await page.evaluate(async () => {
              window.scrollTo({ top: 0, behavior: 'instant' });
              await new Promise(requestAnimationFrame);
              await new Promise(requestAnimationFrame);
            });
            await page.screenshot({ path: path.join(output, `${teacher ? 'teacher' : 'student'}-${width}-${tab}.png`), fullPage: true, animations: 'disabled' });
          }
        }
      }
    }
    if(process.env.CLASSROOM_BEFORE_SNAPSHOT) return;
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.evaluate(() => { uiRender(false); DJ48ClassroomForm.setActiveClassroomTab('today'); });
    // Exercise the new workspaces with delegated actions mocked: never contact production.
    await page.evaluate(() => DJ48ClassroomForm.setActiveClassroomTab('classroom'));
    await page.locator('#classroom-student-explorer input').fill('샘플학생 24');
    assert.equal(await page.locator('#classroom-student-card-grid>[data-classroom-student-id]:visible').count(), 1);
    await page.locator('#classroom-student-explorer input').fill('없는이름');
    assert.equal(await page.locator('[data-explorer-empty="classroom-student-explorer"]').isVisible(), true);
    await page.locator('#classroom-student-explorer input').fill('');
    assert.equal(await page.locator('#classroom-student-card-grid>[data-classroom-student-id]:visible').count(), 24);
    await page.evaluate(() => DJ48ClassroomForm.setActiveClassroomTab('quest'));
    await page.locator('[data-classroom-student-quest-filter="done"]').click();
    assert.equal(await page.locator('#classroom-quest-grid [data-classroom-quest-id]').count(), 0);
    await page.locator('[data-classroom-student-quest-filter="all"]').click();
    assert.equal(await page.locator('#classroom-quest-grid [data-classroom-quest-id]').count(), 2);
    await page.evaluate(() => DJ48ClassroomForm.setActiveClassroomTab('jobs'));
    await page.locator('#classroom-job-explorer [data-explorer-filter="mine"]').click();
    assert.equal(await page.locator('#classroom-job-grid>[data-classroom-job-id]:visible').count(), 0, 'another student application is not mine');
    await page.locator('#classroom-job-explorer [data-explorer-filter="all"]').click();
    await page.evaluate(() => DJ48ClassroomForm.setActiveClassroomTab('market'));
    await page.locator('[data-classroom-market-tab="point"]').click();
    await page.locator('[data-product-details="music"]').click();
    assert.match(await page.locator('.classroom-market-section.is-active .classroom-product-detail').innerText(), /15.5 P/);
    assert.equal(await page.locator('[data-classroom-shop-buy-id="music"]').count(), 1);
    assert.equal(await page.evaluate(() => uiCalls.some(x => x.startsWith('buy:'))), false, 'selection cannot purchase');
    await page.locator('[data-classroom-shop-buy-id="music"]').click();
    assert.equal(await page.evaluate(() => uiCalls.filter(x => x === 'buy:music').length), 1, 'moved purchase action remains delegated once');
    await page.locator('[data-product-details="game"]').click();
    assert.equal(await page.locator('[data-classroom-shop-buy-id="game"]').isDisabled(), true);
    await page.evaluate(() => DJ48ClassroomForm.setActiveClassroomTab('bank'));
    const exchange = page.locator('[data-classroom-exchange-amount="pointToCoin"]');
    const exchangeAction = page.locator('[data-classroom-exchange-direction="pointToCoin"]');
    for(const invalid of ['', '0', '-1', '1.5', '1000001', '12']) {
      await exchange.fill(invalid); assert.equal(await exchangeAction.isDisabled(), true, `invalid or insufficient: ${invalid}`);
    }
    await exchange.fill('10');
    assert.match(await page.locator('.classroom-exchange-row:visible .classroom-exchange-preview').innerText(), /5.5 P/);
    await exchangeAction.click();
    assert.equal(await page.evaluate(() => uiCalls.filter(x => x === 'exchange:pointToCoin').length), 1);
    await page.locator('.classroom-exchange-tabs button').nth(1).click();
    await page.locator('[data-classroom-exchange-amount="coinToPoint"]').fill('3');
    assert.match(await page.locator('.classroom-exchange-row:visible .classroom-exchange-preview').innerText(), /1.5 P/);
    await page.evaluate(() => { uiRender(true); DJ48ClassroomForm.setActiveClassroomTab('routine'); });
    assert.equal(await page.locator('#classroom-routine-body').isVisible(), false);
    await page.locator('[data-routine-board-student="S1"]').click();
    assert.match(await page.locator('.classroom-routine-board-detail').innerText(), /매일 독서/);
    await page.locator('[data-routine-board-student="S2"]').click();
    assert.match(await page.locator('.classroom-routine-board-detail').innerText(), /진행 중인 성장루틴이 없습니다/);
    await page.locator('[data-routine-board-student=""]').click();
    await page.evaluate(() => DJ48ClassroomForm.setActiveClassroomTab('teacher'));
    await page.locator('#classroom-review-explorer input').fill('없는학생');
    assert.equal(await page.locator('#classroom-review-grid tbody tr:visible').count(), 0);
    await page.locator('#classroom-review-explorer input').fill('샘플학생');
    assert.equal(await page.locator('#classroom-review-grid tbody tr:visible').count(), 1);
    await page.evaluate(() => { uiRender(false); DJ48ClassroomForm.setActiveClassroomTab('today'); });
    await page.addScriptTag({ path: path.join(PUBLIC, 'coordi-shop/hair-prism.js') });
    await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 40; canvas.height = 60;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#45835c'; ctx.fillRect(8, 8, 24, 44);
      window.portraitPng = canvas.toDataURL('image/png');
      window.portraitMember = 'S1'; window.portraitFailLoad = false; window.portraitFailSave = false;
      window.portraitUploads = []; window.portraitCalls = []; window.portraitSaved = 0;
      window.portraitState = { success: true, portraitSource: 'photo', photoUrl: portraitPng, avatarUrl: '', savedLook: { itemCode: { skin: 12000, hair: 31000, face: 21000 }, itemPrism: {} } };
      window.openPortraitTest = () => DJ48ClassroomPortrait.open({ classId: 'demo-class', getMemberUserId: () => portraitMember, getAuthUid: () => 'auth-1',
        getFunctions: () => ({ httpsCallable: name => async payload => {
          portraitCalls.push({ name, payload });
          if(name === 'renderCoordiShopPreview') return { data: { success: true, imageUrl: portraitPng } };
          if(payload.action === 'status') { if(portraitFailLoad) throw Error('불러오기 실패'); return { data: structuredClone(portraitState) }; }
          if(portraitFailSave) throw Error('저장 실패');
          portraitState.portraitSource = payload.source;
          if(payload.storagePath) portraitState[payload.source === 'photo' ? 'photoUrl' : 'avatarUrl'] = portraitPng;
          return { data: { success: true } };
        } }),
        getStorage: () => ({ ref: path => ({ put: async (file, metadata) => portraitUploads.push({ path, type: file.type, metadata }), getDownloadURL: async () => 'https://example.test/upload.png' }) }),
        onSaved: () => { portraitSaved++; }
      });
      document.getElementById('classroom-view').addEventListener('click', event => {
        if(event.target.closest('[data-classroom-edit-portrait]')) openPortraitTest();
      });
    });
    await page.locator('.classroom-portrait-edit').click();
    const dialog = page.locator('.classroom-portrait-dialog');
    await page.waitForFunction(() => !document.querySelector('[data-portrait-save]').disabled);
    for(const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      assert.equal(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth + 1), true, 'portrait dialog must not overflow');
      if(output) await page.screenshot({ path: path.join(output, `portrait-${width}.png`) });
    }
    await dialog.locator('input[value="avatar"]').check();
    assert.equal(await dialog.locator('[data-portrait-save]').isDisabled(), true);
    await dialog.locator('[data-avatar-load]').click();
    await page.waitForFunction(() => !document.querySelector('[data-portrait-save]').disabled);
    assert.equal(await dialog.locator('[data-preview="avatar"] img').count(), 1);
    await dialog.locator('[data-portrait-save]').click();
    await page.waitForFunction(() => portraitSaved === 1);
    assert.equal(await page.evaluate(() => portraitUploads[0].metadata.customMetadata.source), 'classroom-avatar');
    assert.deepEqual(await page.evaluate(() => portraitCalls.find(x => x.name === 'renderCoordiShopPreview').payload.look), await page.evaluate(() => portraitState.savedLook));
    await page.locator('.classroom-portrait-edit').click();
    await page.waitForFunction(() => !document.querySelector('[data-portrait-save]').disabled);
    await dialog.locator('input[value="photo"]').check();
    await dialog.locator('input[type="file"]').setInputFiles({ name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
    assert.match(await dialog.locator('[role="status"]').innerText(), /2MB 이하/);
    const png = Buffer.from(await page.evaluate(() => portraitPng.split(',')[1]), 'base64');
    await dialog.locator('input[type="file"]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png });
    await page.waitForFunction(() => document.querySelector('.classroom-portrait-status').textContent.includes('사진을 확인'));
    await page.evaluate(() => { portraitFailSave = true; });
    await dialog.locator('[data-portrait-save]').click();
    await page.waitForFunction(() => document.querySelector('.classroom-portrait-status').textContent.includes('저장 실패'));
    assert.equal(await dialog.isVisible(), true);
    await page.evaluate(() => { portraitFailSave = false; });
    await dialog.locator('[data-portrait-save]').click();
    await page.waitForFunction(() => portraitSaved === 2);
    assert.equal(await page.evaluate(() => portraitUploads.at(-1).metadata.customMetadata.source), 'classroom-photo');
    await page.locator('.classroom-portrait-edit').click();
    await page.waitForFunction(() => !document.querySelector('[data-portrait-save]').disabled);
    await dialog.locator('input[value="avatar"]').check();
    const uploadsBefore = await page.evaluate(() => portraitUploads.length);
    await dialog.locator('[data-portrait-save]').click();
    await page.waitForFunction(() => portraitSaved === 3);
    assert.equal(await page.evaluate(() => portraitUploads.length), uploadsBefore, 'source switching reuses existing images');
    await page.evaluate(() => { portraitFailLoad = true; });
    await page.locator('.classroom-portrait-edit').click();
    await dialog.getByRole('button', { name: '다시 시도' }).waitFor();
    await page.evaluate(() => { portraitFailLoad = false; });
    await dialog.getByRole('button', { name: '다시 시도' }).click();
    await page.waitForFunction(() => !document.querySelector('[data-portrait-save]').disabled);
    await page.evaluate(() => { portraitMember = 'S2'; });
    const callsBefore = await page.evaluate(() => portraitCalls.length);
    await dialog.locator('[data-portrait-save]').click();
    await page.waitForFunction(() => document.querySelector('.classroom-portrait-status').textContent.includes('로그인 계정이 바뀌'));
    assert.equal(await page.evaluate(() => portraitCalls.length), callsBefore, 'stale member cannot save');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await page.locator('.classroom-portrait-edit').evaluate(e => document.activeElement === e), true);
    await page.setViewportSize({ width: 390, height: 1000 });
    assert.equal(await page.locator('[data-classroom-group="manage"]').isVisible(), false);
    assert.equal(await page.locator('#classroom-today-grid').innerText().then(text => text.includes('현장체험학습')), false);
    await page.locator('[data-classroom-group="activity"]').click();
    assert.equal(await page.locator('#classroom-alert-quest').innerText(), '퀘스트 2');
    assert.equal(await page.locator('#classroom-quest-grid [data-classroom-quest-id]').count(), 2);
    assert.match(await page.locator('#classroom-quest-grid').innerText(), /\+5 P · 독서젬 \+1/);
    await page.locator('[data-classroom-tab="quest"]').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[data-classroom-tab="routine"]').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#classroom-routine-form').isVisible(), false);
    await page.locator('#classroom-routine-editor summary').click();
    assert.equal(await page.locator('#classroom-routine-form').isVisible(), true);
    await page.locator('[data-classroom-group="economy"]').click();
    await page.locator('[data-classroom-tab="bank"]').click();
    await page.locator('[data-classroom-group="home"]').click();
    await page.locator('[data-classroom-group="economy"]').click();
    assert.equal(await page.locator('[data-classroom-tab="bank"]').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#classroom-economy-navigation button:visible').count(), 5);
    assert.equal(await page.locator('.classroom-tabs').isVisible(), false, 'economy has one local navigation row');
    await page.locator('[data-classroom-tab="bank"]').focus();
    await page.keyboard.press('Home');
    assert.equal(await page.locator('[data-classroom-market-tab="point"]').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[data-classroom-market-tab="coin"]').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('[data-classroom-panel="market"]').getAttribute('class').then(c=>c.includes('is-active')), true);
    await page.keyboard.press('End');
    assert.equal(await page.locator('[data-classroom-tab="bank"]').getAttribute('aria-selected'), 'true');
    await page.locator('[data-classroom-group="home"]').click();
    await page.locator('#classroom-today-grid [data-classroom-quest-action="read"]').click();
    await page.waitForFunction(() => uiCalls.includes('complete:read'));
    assert.equal(await page.locator('#classroom-today-grid [data-classroom-quest-action="read"]').count(), 0);
    await page.locator('#classroom-today-grid [data-classroom-quest-action="help"]').click();
    await page.waitForFunction(() => uiCalls.includes('review:help'));
    await page.evaluate(() => DJ48ClassroomRender.renderClassroomLoadState('loading'));
    assert.equal(await page.locator('#classroom-view').getAttribute('aria-busy'), 'true');
    assert.equal(await page.locator('[data-classroom-panel="today"]').evaluate(e => e.inert), true);
    await page.evaluate(() => DJ48ClassroomRender.renderClassroomLoadState('error'));
    assert.equal(await page.locator('[data-classroom-panel="today"]').isVisible(), false);
    await page.locator('[data-classroom-retry]').click();
    assert.equal(await page.locator('#classroom-load-status').isVisible(), false);
    assert.equal(await page.locator('[data-classroom-panel="today"]').evaluate(e => e.inert), false);
    await page.evaluate(() => { uiRender(true); DJ48ClassroomForm.setActiveClassroomTab('today'); });
    await page.locator('[data-classroom-student-target="S1"]').click();
    assert.equal(await page.locator('.classroom-student-detail[data-classroom-student-id="S1"]').evaluate(e => e.open), true);
    await page.evaluate(() => uiRender(true));
    assert.equal(await page.locator('.classroom-student-detail[data-classroom-student-id="S1"]').evaluate(e => e.open), true);
    assert.equal(await page.locator('[data-classroom-point-adjust-member-id="S1"]').isVisible(), true);
    await page.locator('[data-classroom-group="home"]').click();
    await page.locator('[data-classroom-market-target="inventory"]').click();
    assert.equal(await page.locator('[data-classroom-market-tab="inventory"]').getAttribute('aria-selected'), 'true');
    await page.locator('[data-classroom-group="activity"]').click();
    await page.locator('[data-classroom-tab="quest"]').click();
    await page.setViewportSize({ width: 390, height: 1000 });
    assert.equal(await page.locator('[data-classroom-quest-filter="status"]').isVisible(), false);
    await page.locator('[data-classroom-quest-filter-toggle]').focus();
    await page.keyboard.press('Enter');
    await page.locator('[data-classroom-quest-filter="status"]').selectOption('review');
    assert.equal(await page.locator('[data-classroom-quest-filter-toggle]').getAttribute('aria-expanded'), 'true');
    assert.match(await page.locator('[data-classroom-quest-filter-toggle]').innerText(), /1개 적용 중/);
    assert.equal(await page.locator('[data-classroom-quest-filter="status"]').evaluate(e => e === document.activeElement), true);
    assert.equal(await page.locator('#classroom-quest-grid [data-classroom-quest-id]').count(), 1);
    assert.equal(await page.locator('#classroom-quest-grid [data-classroom-quest-id]').getAttribute('data-classroom-quest-id'), 'help');
    await page.locator('[data-classroom-quest-filter-toggle]').click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(await page.locator('[data-classroom-quest-filter="status"]').isVisible(), true, 'desktop keeps filters visible');
    await page.setViewportSize({ width: 390, height: 1000 });
    // Price semantics, image fallbacks, detail keyboard return, and safe teacher review.
    await page.evaluate(() => {
      uiData.economyBoard.shopItems.push(
        { itemId: 'zero', title: '0원 등록 상품', pricePoint: 0 },
        { itemId: 'missing', title: '가격 없는 상품' },
        { itemId: 'broken', title: '간식 이미지 오류', pricePoint: 8, imageUrl: '/missing-product.png' },
        { itemId: 'unknown', title: '새 상품', pricePoint: 8 });
      uiRender(false); DJ48ClassroomForm.setActiveClassroomTab('market');
    });
    await page.locator('[data-classroom-market-tab="point"]').click();
    const card = id => page.locator(`[data-classroom-shop-item-id="${id}"]`);
    assert.equal(await card('snack').locator('.classroom-shop-card-visual').evaluate(e => Math.round(e.getBoundingClientRect().height)), 144);
    await card('snack').scrollIntoViewIfNeeded();
    assert.equal(await card('snack').locator('img').evaluate(e => Math.round(e.getBoundingClientRect().height)), 132, 'image must fit the shelf without clipping');
    assert.match(await card('zero').textContent(), /0 P/);
    assert.match(await card('missing').textContent(), /가격 미등록/);
    assert.equal(await page.locator('[data-classroom-shop-buy-id="zero"]').isDisabled(), true);
    assert.equal(await page.locator('[data-classroom-shop-buy-id="missing"]').isDisabled(), true);
    await card('broken').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-classroom-shop-item-id="broken"] img').getAttribute('src').includes('snack-320.webp'));
    for(const [id, asset] of [['snack','snack-320.webp'], ['lunch','lunch-320.webp'], ['unknown','gift-320.webp']]) {
      assert.match(await card(id).locator('img').getAttribute('src'), new RegExp(asset));
      await card(id).scrollIntoViewIfNeeded();
      await page.waitForFunction(id => {const i=document.querySelector(`[data-classroom-shop-item-id="${id}"] img`);return i.complete && i.naturalWidth > 0;}, id);
      assert.equal(await card(id).locator('img').getAttribute('width'), '320');
    }
    await page.locator('[data-product-details="lunch"]').click();
    assert.equal(await page.locator('.classroom-product-detail:visible').evaluate(e => e.parentElement.classList.contains('classroom-market-card-grid')), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-product-details="lunch"]').evaluate(e=>e===document.activeElement), true);
    assert.equal(await page.locator('.classroom-product-detail:visible').count(), 0);
    await page.locator('[data-product-details="snack"]').focus();
    await page.keyboard.press('Enter');
    await page.locator('[data-classroom-shop-buy-id="snack"]').click();
    assert.equal(await page.evaluate(()=>uiCalls.filter(x=>x==='buy:snack').length),1);
    await page.evaluate(() => { uiRender(true); uiRender(true); DJ48ClassroomForm.setActiveClassroomTab('teacher'); });
    await page.locator('#classroom-review-grid [data-classroom-review-action="approved"]').first().click();
    assert.equal(await page.evaluate(()=>uiCalls.filter(x=>x==='approve:rev1:approved').length),1);
    const retainedCatalog = await page.evaluate(() => {
      const original = structuredClone({wallet:uiData.wallet, items:uiData.economyBoard.shopItems, purchases:uiData.economyBoard.purchases, coins:uiData.economyBoard.myDjCoin, classId:uiData.settings.classId});
      const checks = {};
      const item = () => document.querySelector('[data-classroom-shop-item-id="coupon"]');
      const buy = () => document.querySelector('[data-classroom-shop-buy-id="coupon"]');
      try {
        uiRender(false); DJ48ClassroomForm.setActiveClassroomTab('market');
        document.querySelector('[data-classroom-market-tab="point"]').click();
        const before = item(), peek = before.querySelector('[data-product-details]'); peek.focus();
        uiRender(false);
        checks.unchangedNode = before === item(); checks.focusRetained = document.activeElement === peek;
        uiData.economyBoard.shopItems.find(i=>i.itemId==='coupon').pricePoint=7; uiRender(false);
        checks.inPlacePrice = before !== item() && item().textContent.includes('7 P');
        uiData.wallet.point=1; uiRender(false); checks.balanceLocksPurchase=buy().disabled;
        uiData.wallet.point=40; uiRender(false); checks.balanceUnlocksPurchase=!buy().disabled;
        uiData.economyBoard.myDjCoin=0;uiRender(false);
        checks.coinBalance=document.querySelector('[data-classroom-shop-buy-id="coinCoupon"]').disabled;
        uiData.economyBoard.shopItems.find(i=>i.itemId==='coupon').itemType='pointBoost';
        uiData.economyBoard.purchases.push({itemId:'coupon',status:'purchased'});uiRender(false);
        checks.ownership=buy().disabled && item().textContent.includes('학생카드에 배치됨');
        const previous=item();uiData.settings.classId='another-demo';uiRender(false);
        checks.classScope=previous!==item();
        uiRender(true);checks.roleScope=!buy() && !!document.querySelector('[data-classroom-shop-edit-id="coupon"]');
      } finally {
        uiData.wallet=original.wallet;uiData.economyBoard.shopItems=original.items;uiData.economyBoard.purchases=original.purchases;
        uiData.economyBoard.myDjCoin=original.coins;uiData.settings.classId=original.classId;uiRender(false);
      }
      return checks;
    });
    for(const [name,passed] of Object.entries(retainedCatalog)) assert.equal(passed,true,`retained catalog: ${name}`);
    await page.evaluate(() => {
      uiData.economyBoard.classMission = null;
      uiData.settings.quests = [];
      uiData.economyBoard.routines = [];
      uiRender(false);
      DJ48ClassroomForm.setActiveClassroomTab('today');
    });
    assert.equal(await page.locator('#classroom-today-grid').innerText().then(text => text.includes('목표를 모두 달성')), false);
    assert.match(await page.locator('#classroom-today-grid').innerText(), /오늘 등록된 퀘스트가 없습니다/);
    await require('./classroom-routine-refresh-review')(page, PUBLIC, process.env.CLASSROOM_REFRESH_SCREENSHOT_DIR);
    assert.deepEqual(errors, []);
    console.log('Classroom UI passed: 76 responsive role/tab cases, actions, navigation, errors, keyboard, counters, rewards, student/quest/job/review filters, product selection/purchase delegation, exchange validation/previews, portrait upload/avatar/source switching, retry and stale-account rejection.');
    console.log(JSON.stringify(metrics));
  } finally {
    await browser.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
