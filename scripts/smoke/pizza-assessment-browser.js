'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const Q = require('../../functions/pizza-assessment/questions');
const base = 'http://127.0.0.1:5324/pizza-assessment/?emulator=1';
const output = path.resolve(__dirname, '../../docs/product/pizza-assessment');
async function main() {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const errors = [], contexts = []; fs.mkdirSync(output, { recursive: true });
  const context = async (options = {}) => { const c = await browser.newContext({ viewport: { width: 1440, height: 1080 }, reducedMotion: 'reduce', acceptDownloads: true, ...options }); contexts.push(c); const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message)); return p; };
  const click = async (p, action) => p.locator(`[data-action="${action}"]`).click();
  const school = `봄빛초등학교 ${Date.now().toString().slice(-6)}`;
  async function enter(p, kind, number) { await p.goto(base); await click(p, kind + '-form'); await p.locator('[name=school]').fill(school); await p.locator('[name=classNo]').fill('8'); await p.locator('[name=number]').fill(String(number)); await p.locator('#entry-form button[type=submit]').click(); }
  async function dialog(p) { await p.locator('#confirm-dialog[open]').waitFor(); await p.locator('#dialog-confirm').click(); }
  try {
    const teacher = await context(); await teacher.goto(base); await teacher.screenshot({ path: path.join(output, '01-welcome.png'), fullPage: true });
    await enter(teacher, 'teacher', 6); await teacher.locator('.dashboard').waitFor({ timeout: 30000 });
    const student = await context(); await enter(student, 'student', 1); await student.locator('#answer-form').waitFor({ timeout: 30000 });
    // No answer key is loaded into the student before grading.
    const before = await student.evaluate(async () => { const s = JSON.parse(localStorage.getItem('pizza.student')); return PizzaNet.request('student', s); });
    assert.ok(before.questions.every(q => !q.answer && !q.feedback)); assert.ok(!before.result);
    await student.locator('[data-slice="0"][role=button]').click(); await student.locator('[data-slice="1"][role=button]').press('Enter');
    assert.match(await student.locator('#slice-count').innerText(), /^2/);
    await student.locator('[name=numerator]').fill('5'); await student.locator('[name=denominator]').fill('8');
    await student.screenshot({ path: path.join(output, '02-game.png'), fullPage: true });
    // Draft recovery before remote delivery.
    await student.reload(); await click(student, 'student-form'); await click(student, 'resume'); await student.locator('#answer-form').waitFor();
    assert.equal(await student.locator('[name=numerator]').inputValue(), '5');
    for (let i = 0; i < 25; i++) {
      const q = Q.questions[i], answer = i === 17 || i === 20 ? '0' : q.answer;
      await student.locator('.receipt-top strong').filter({ hasText: `No. ${String(i + 1).padStart(2, '0')}` }).waitFor();
      if (q.choices) await student.locator(`.choice input[value="${answer}"]`).check({ force: true });
      else {
        const m = answer.match(/^(?:(\d+) )?(\d+)\/(\d+)$/);
        await student.locator('[name=whole]').fill(m ? m[1] || '' : answer);
        await student.locator('[name=numerator]').fill(m ? m[2] : '');
        await student.locator('[name=denominator]').fill(m ? m[3] : '');
      }
      if (i === 0) await student.emulateMedia({ reducedMotion: 'no-preference' });
      await student.locator('#answer-form button[type=submit]').click();
      if (i === 0) {
        await student.locator('.kitchen.baking').waitFor();
        await student.locator('.kitchen.packing').waitFor();
        await student.locator('.kitchen.delivering').waitFor();
      }
      await student.waitForFunction(() => document.querySelector('#app').getAttribute('aria-busy') !== 'true');
      if (i === 0) await student.emulateMedia({ reducedMotion: 'reduce' });
    }
    // A revised but undelivered answer cannot silently submit its previous saved value.
    await student.locator('[data-action=goto][data-index="0"]').click();
    await student.locator('[name=numerator]').fill('5');
    await click(student, 'submit'); await student.locator('#toast.visible').waitFor();
    assert.match(await student.locator('#toast').innerText(), /아직 배달하지 않은/);
    await student.locator('#answer-form button[type=submit]').click();
    await student.waitForFunction(() => document.querySelector('#app').getAttribute('aria-busy') !== 'true');
    await click(student, 'submit'); await dialog(student); await student.locator('.waiting').waitFor();
    await student.reload(); await click(student, 'student-form'); await click(student, 'resume'); await student.locator('.waiting').waitFor();
    // Second real browser, same class, partial answer saved.
    const partial = await context(); await enter(partial, 'student', 2); await partial.locator('#answer-form').waitFor();
    await partial.setViewportSize({ width: 390, height: 844 });
    assert.ok(await partial.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await partial.screenshot({ path: path.join(output, '07-mobile-game.png'), fullPage: true });
    await partial.setViewportSize({ width: 1440, height: 1080 });
    await partial.locator('[name=numerator]').fill('5'); await partial.locator('[name=denominator]').fill('8'); await partial.locator('#answer-form button[type=submit]').click();
    await partial.waitForFunction(() => document.querySelector('#app').getAttribute('aria-busy') !== 'true');
    const outsider = await context(); await enter(outsider, 'student', 1); await outsider.locator('#toast.visible').waitFor(); assert.match(await outsider.locator('#toast').innerText(), /이미 입장/);
    await teacher.waitForFunction(() => document.querySelectorAll('.student-tile.joined,.student-tile.submitted').length >= 2);
    await teacher.screenshot({ path: path.join(output, '03-teacher.png'), fullPage: true });
    await click(teacher, 'grade'); await dialog(teacher); await teacher.locator('[data-action=pdf]:not([disabled])').waitFor({ timeout: 20000 });
    await student.locator('.reveal').waitFor({ timeout: 15000 }); await partial.locator('.reveal').waitFor({ timeout: 15000 });
    await click(student, 'pause-reveal'); await student.screenshot({ path: path.join(output, '04-grading.png'), fullPage: true });
    await click(student, 'result'); assert.equal(await student.locator('.score-circle strong').innerText(), '92점'); assert.equal(await student.locator('.feedback-card').count(), 2);
    assert.match(await student.locator('.feedback-list').innerText(), /1 3\/6/); await student.screenshot({ path: path.join(output, '05-feedback.png'), fullPage: true });
    await click(partial, 'result'); assert.equal(await partial.locator('.score-circle strong').innerText(), '4점');
    const downloadPromise = teacher.waitForEvent('download'); await click(teacher, 'pdf'); const download = await downloadPromise; await download.saveAs(path.join(output, 'sample-report.pdf'));
    const pdf = fs.readFileSync(path.join(output, 'sample-report.pdf')); assert.equal(pdf.subarray(0, 8).toString(), '%PDF-1.4'); assert.ok(pdf.length > 20000);
    const room = await teacher.evaluate(async () => { const s = JSON.parse(localStorage.getItem('pizza.teacher')); return PizzaNet.request('report', s); });
    assert.equal(room.report.average, 48); assert.equal(room.report.students.length, 2); assert.deepEqual(room.report.absent, [3, 4, 5, 6]);
    const mobile = await context({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 }); await mobile.goto(base); assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await mobile.screenshot({ path: path.join(output, '06-mobile.png'), fullPage: true });
    // Student result survives reload, and all 25-item reveal scenes can finish naturally.
    await student.reload(); await click(student, 'student-form'); await click(student, 'resume'); await student.locator('.reveal').waitFor();
    for (let i = 0; i < 25; i++) await click(student, 'next-reveal'); await student.locator('.score-circle').waitFor();
    await teacher.reload(); await click(teacher, 'teacher-form'); await click(teacher, 'resume'); await teacher.locator('.dashboard').waitFor(); assert.match(await teacher.locator('.metrics').innerText(), /48/);
    await click(teacher, 'close'); await dialog(teacher); await teacher.waitForFunction(() => document.querySelector('.metric-label')?.textContent === '종료');
    assert.deepEqual(errors, []);
    console.log('Pizza browser: real Functions + Firestore, teacher setup, two separate student browsers, 25 real UI answers, draft/reload recovery, duplicate number, partial grading broadcast, 25-scene reveal, 92/4 scores, feedback, PDF download, closed-room report and mobile landing passed.');
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
