'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
module.exports = async function review(page, publicDir, output) {
  if(output) fs.mkdirSync(output, {recursive: true});
  await page.evaluate(() => { uiRender(false); DJ48ClassroomForm.setActiveClassroomTab('routine'); DJ48ClassroomForm.resetClassroomRoutineForm(); });
  await page.locator('#classroom-routine-editor summary').click();
  await page.locator('#classroom-routine-title-input').fill('아침 등교 준비 완성');
  await page.locator('#classroom-routine-start-input').fill('2026-10-19');
  await page.locator('#classroom-routine-end-input').fill('2026-10-30');
  await page.locator('.classroom-routine-item-input').nth(0).fill('책상 정리하기');
  await page.locator('.classroom-routine-item-input').nth(1).fill('오늘 읽을 책 준비하기');
  assert.equal(await page.locator('#classroom-routine-item-count').innerText(), '2/10');
  for(let i = 2; i < 10; i++) {
    await page.locator('#classroom-routine-add-item-button').click();
    await page.locator('.classroom-routine-item-input').nth(i).fill(`작은 실천 ${i + 1}`);
  }
  assert.equal(await page.locator('#classroom-routine-item-count').innerText(), '10/10');
  assert.equal(await page.locator('#classroom-routine-add-item-button').isVisible(), false);
  const values = await page.evaluate(() => DJ48ClassroomForm.getClassroomRoutineFormValues());
  assert.equal(values.checkItems.length, 10);
  assert.equal(values.rewardPoint, 10);
  assert.deepEqual(values.weekdays, [1,2,3,4,5]);
  await page.evaluate(values => DJ48ClassroomForm.setClassroomRoutineFormValues({...values, checkItems: values.checkItems.slice(0,3)}), values);
  assert.equal(await page.locator('.classroom-routine-item-input:visible').count(), 3);
  assert.equal(await page.locator('#classroom-routine-item-count').innerText(), '3/10');
  for(const width of [1440,768,390,320]) {
    await page.setViewportSize({width, height: 1000});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `routine form overflow ${width}`);
    if(output) { await page.locator('#classroom-routine-editor').scrollIntoViewIfNeeded(); await page.screenshot({path: path.join(output, `routine-editor-${width}.png`), fullPage: true}); }
  }
  await page.evaluate(() => { DJ48ClassroomForm.resetClassroomRoutineForm(); uiRender(true); DJ48ClassroomForm.setActiveClassroomTab('routine'); DJ48ClassroomRender.setClassroomRoutineBoardSelection({studentId:'S1',tab:'ongoing'}); });
  assert.equal(await page.locator('.classroom-routine-teacher-cards article').count(), 1);
  assert.equal(await page.locator('#classroom-routine-form').isVisible(), false);
  for(const width of [1440,390,320]) {
    await page.setViewportSize({width,height:1000});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `teacher routine overflow ${width}`);
    if(output) await page.screenshot({path: path.join(output, `routine-teacher-${width}.png`),fullPage:true});
  }
  await page.evaluate(() => { uiRender(false); DJ48ClassroomForm.setActiveClassroomTab('today'); });
  assert.equal(await page.locator('[data-classroom-panel="today"] #classroom-activity-feed').count(), 0);
  assert.equal(await page.locator('#classroom-activity-feed').isVisible(), false);
  // Run the real inline navigation functions with local view/auth adapters; no Firebase calls.
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const navigation = html.slice(html.indexOf('    let classroomHomeReturnContext = null;'), html.indexOf('    function isCurrentSuperAdminMember()'));
  const openHome = html.match(/openHome: \(\) => \{([\s\S]*?)\n        \},/)[1];
  await page.evaluate(({navigation, openHome}) => {
    window.testMember = 'S1'; window.returnCalls = [];
    window.DJ48AccountState = {getCurrentMemberUserId: () => testMember};
    const renderHomeView = () => {};
    const enterAppView = ({viewId}) => document.querySelectorAll('.app-view').forEach(v => { v.hidden = v.id !== viewId; });
    const showClassroomView = unlocked => { returnCalls.push(unlocked); enterAppView({viewId:'classroom-view'}); };
    const initializeAuthUser = async () => {};
    const actions = new Function('renderHomeView','enterAppView','showClassroomView','initializeAuthUser', `${navigation}\nreturn {showHomeView, returnHomeToClassroom, open: () => {${openHome}}};`)(renderHomeView,enterAppView,showClassroomView,initializeAuthUser);
    window.uiOpenHome = actions.open;
    window.uiReturnToClassroom = actions.returnHomeToClassroom;
    window.testShowHome = actions.showHomeView;
  }, {navigation,openHome});
  await page.locator('[data-classroom-open-home]').click();
  assert.equal(await page.locator('#home-classroom-return').isVisible(), true);
  assert.equal(await page.locator('#home-view [data-back-to-town]').isVisible(), true);
  await page.locator('#home-classroom-return').click();
  assert.deepEqual(await page.evaluate(() => returnCalls), [true]);
  await page.evaluate(() => testShowHome());
  assert.equal(await page.locator('#home-classroom-return').isVisible(), false);
  await page.evaluate(() => { testShowHome({fromClassroom:true}); testMember = 'S2'; });
  await page.locator('#home-classroom-return').click();
  assert.deepEqual(await page.evaluate(() => returnCalls), [true], 'different account must not inherit unlocked classroom');
  console.log('PASS classroom refresh: 10-item add/edit/reset, reward/schedule preservation, 320–1440px planner, teacher cards, no home placeholder, classroom-only return and account guard.');
};
