'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { createService } = require('../../functions/pizza-assessment/service');
async function main() {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8181'); assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9191');
  const app = initializeApp({ projectId: 'demo-dj48-rules' }, 'pizza-admin-browser'), db = getFirestore(app), auth = getAuth(app), suffix = Date.now().toString();
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const output = path.resolve(__dirname, '../../docs/product/pizza-assessment'), errors = [];
  try {
    const uid = 'pizza-ui-admin-' + suffix, email = uid + '@example.test', password = 'local-only-test-password';
    await auth.createUser({ uid, email, password }); await db.doc('users/' + uid).set({ authUid: uid, role: 'admin', adminLevel: 'superAdmin', active: true, status: 'active' });
    const service = createService({ db, now: () => Date.now() + 2 * 86400000 }), school = '관리연습초등학교 ' + suffix.slice(-4), token = crypto.randomBytes(32).toString('hex');
    const created = await service.act({ action: 'create', school, grade: 4, classNo: 8, lastNumber: 4, token });
    const studentToken = crypto.randomBytes(32).toString('hex'); await service.act({ action: 'join', school, grade: 4, classNo: 8, number: 1, token: studentToken });
    await service.act({ action: 'save', roomId: created.room.id, number: 1, token: studentToken, questionId: 1, answer: '5/8', revision: 0 });
    const context = await browser.newContext({ viewport: { width: 1365, height: 950 }, reducedMotion: 'reduce' }), admin = await context.newPage();
    admin.on('pageerror', e => errors.push(e.message));
    const url = 'http://127.0.0.1:5324/pizza-assessment/admin.html?emulator=1';
    await admin.goto(url); await admin.locator('#login-panel').waitFor({ state: 'visible', timeout: 20000 }); assert.equal(await admin.locator('[data-room]').count(), 0);
    await admin.evaluate(async ({ email, password }) => { await firebase.auth().signInWithEmailAndPassword(email, password); }, { email, password });
    await admin.locator('#refresh').click(); await admin.locator(`[data-room="${created.room.id}"]`).waitFor();
    // A separate page restores Quiztown's DEFAULT-app login; no pizza capability token involved.
    const shared = await context.newPage(); await shared.goto(url); await shared.locator(`[data-room="${created.room.id}"]`).waitFor(); await shared.close();
    const learnerContext = await browser.newContext(), learner = await learnerContext.newPage();
    await learner.goto('http://127.0.0.1:5324/pizza-assessment/?emulator=1');
    await learner.locator('[data-action=student-form]').click();
    await learner.locator('[name=school]').fill(school); await learner.locator('[name=classNo]').fill('8'); await learner.locator('[name=number]').fill('2');
    await learner.locator('#entry-form button[type=submit]').click(); await learner.locator('#answer-form').waitFor();
    await admin.screenshot({ path: path.join(output, '08-super-admin.png'), fullPage: true });
    await admin.locator(`[data-room="${created.room.id}"]`).click(); await admin.locator('#delete-dialog[open]').waitFor();
    assert.match(await admin.locator('#delete-detail').innerText(), /입장 2명.*저장 답안 1개/); assert.equal(await admin.locator('#confirm-delete').isEnabled(), false);
    await admin.locator('#delete-input').fill('다른 학교'); assert.equal(await admin.locator('#confirm-delete').isEnabled(), false);
    await admin.locator('#delete-input').fill(`${school} 4학년 8반`); await admin.screenshot({ path: path.join(output, '09-delete-confirmation.png'), fullPage: true });
    await admin.locator('#cancel-delete').click(); assert.equal((await db.doc('pizzaAssessmentSessions/' + created.room.id).get()).exists, true);
    await admin.locator(`[data-room="${created.room.id}"]`).click(); await admin.locator('#delete-input').fill(`${school} 4학년 8반`); await admin.locator('#confirm-delete').click();
    await admin.locator('#delete-dialog').waitFor({ state: 'hidden' }); await admin.waitForFunction(() => document.querySelector('#admin-status').textContent.includes('삭제했습니다'));
    assert.equal((await db.doc('pizzaAssessmentSessions/' + created.room.id).get()).exists, false);
    assert.equal(await admin.locator(`[data-room="${created.room.id}"]`).count(), 0);
    await learner.getByRole('heading', { name: '이 평가 학급을 찾을 수 없어요.' }).waitFor({ timeout: 15000 });
    assert.equal(await learner.evaluate(() => localStorage.getItem('pizza.student')), null);
    await admin.evaluate(() => firebase.auth().signOut()); await admin.locator('#refresh').click(); await admin.locator('#login-panel').waitFor({ state: 'visible' }); assert.equal(await admin.locator('[data-room]').count(), 0);
    await db.doc('users/' + uid).update({ adminLevel: 'classAdmin' });
    await admin.evaluate(async ({ email, password }) => { await firebase.auth().signInWithEmailAndPassword(email, password); }, { email, password }); await admin.locator('#refresh').click();
    await admin.waitForFunction(() => document.querySelector('#admin-status').textContent.includes('반 관리자')); assert.equal(await admin.locator('[data-room]').count(), 0);
    assert.deepEqual(errors, []);
    console.log('Pizza admin browser: unauthenticated gate, shared DEFAULT-app login, list, exact classroom confirmation, cancel, permanent deletion of synthetic room, list refresh, logout and class-admin denial passed.');
  } finally { await browser.close(); await deleteApp(app); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
