'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { createService } = require('../../functions/pizza-assessment/service');
const token = () => crypto.randomBytes(32).toString('hex');
async function main() {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8181');
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9191');
  const app = initializeApp({ projectId: 'demo-dj48-rules' }, 'pizza-admin-test'), db = getFirestore(app), auth = getAuth(app), suffix = Date.now().toString();
  let time = Date.now(); const game = createService({ db, now: () => time }), identities = {};
  async function invoke(action, data = {}, idToken) {
    const res = await fetch('http://127.0.0.1:5001/demo-dj48-rules/asia-northeast3/pizzaAssessmentAction', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) }, body: JSON.stringify({ data: { action, ...data } }) });
    const body = await res.json(); if (body.error) { const error = Error(body.error.message); error.code = body.error.status; throw error; } return body.result;
  }
  const reject = (promise, code) => assert.rejects(promise, e => e.code === code);
  try {
    for (const [role, level, active] of [['student', '', true], ['class', 'classAdmin', true], ['super', 'superAdmin', true], ['full', 'fullAdmin', true], ['legacy', '', true], ['inactive', 'superAdmin', false], ['teacher', '', true]]) {
      const uid = `pizza-${role}-${suffix}`, email = `${uid}@example.test`, password = 'synthetic-emulator-only';
      await auth.createUser({ uid, email, password });
      if (role !== 'teacher') await db.doc(`users/${role === 'legacy' ? 'G9-C9-N99' : uid}`).set({ authUid: uid, role: role === 'student' ? 'student' : 'admin', adminLevel: level, active, status: active ? 'active' : 'inactive' });
      const res = await fetch('http://127.0.0.1:9191/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
      identities[role] = { uid, token: (await res.json()).idToken }; assert.ok(identities[role].token);
    }
    const call = (action, data = {}, role = 'super') => invoke(action, data, identities[role]?.token);
    await reject(invoke('adminList'), 'UNAUTHENTICATED');
    for (const role of ['student', 'class', 'inactive', 'teacher']) for (const action of ['adminList', 'adminInspect', 'adminDelete']) await reject(call(action, { isSuperAdmin: true, token: token(), roomId: 'a'.repeat(24) }, role), 'PERMISSION_DENIED');
    await call('adminList', {}, 'full');
    await call('adminList', {}, 'legacy');
    const c = { school: '삭제검증초등학교' + suffix, grade: 4, classNo: 8 }, owner = token();
    const room = (await game.act({ action: 'create', ...c, lastNumber: 3, token: owner })).room;
    const st = { roomId: room.id, number: 1, token: token() };
    await game.act({ action: 'join', ...c, number: 1, token: st.token });
    let preview = await call('adminInspect', { roomId: room.id }); assert.equal(preview.studentCount, 1); assert.equal(preview.answerCount, 0);
    await reject(call('adminDelete', { roomId: room.id, confirmationVersion: preview.confirmationVersion }), 'FAILED_PRECONDITION');
    await game.act({ action: 'save', ...st, questionId: 1, answer: '5/8', revision: 0 });
    await reject(call('adminDelete', { roomId: room.id, confirmation: room.id, confirmationVersion: preview.confirmationVersion }), 'FAILED_PRECONDITION');
    // Revoke privileges after login: the same cached ID token must immediately lose access.
    await db.doc(`users/${identities.super.uid}`).update({ active: false }); await reject(call('adminList'), 'PERMISSION_DENIED'); await db.doc(`users/${identities.super.uid}`).update({ active: true });
    await game.act({ action: 'grade', roomId: room.id, token: owner, confirmIncomplete: true });
    preview = await call('adminInspect', { roomId: room.id }); assert.equal(preview.hasReport, true); assert.equal(preview.answerCount, 1);
    const remove = { roomId: room.id, confirmation: room.id, confirmationVersion: preview.confirmationVersion };
    await call('adminDelete', remove); assert.equal((await db.doc(`pizzaAssessmentSessions/${room.id}`).get()).exists, false);
    assert.equal((await db.collection(`pizzaAssessmentSessions/${room.id}/students`).get()).size, 0);
    assert.equal((await call('adminDelete', remove)).alreadyDeleted, true);
    const audit = (await db.doc(`pizzaAssessmentDeletions/${room.id}`).get()).data(); assert.equal(audit.actorMemberId, identities.super.uid); assert.equal(audit.answerCount, 1); assert.ok(!JSON.stringify(audit).includes('5/8'));
    await assert.rejects(game.act({ action: 'student', ...st }), e => e.code === 'not-found');
    assert.deepEqual(await game.act({ action: 'create', ...c, lastNumber: 3, token: owner }), { deleted: true }, 'old token must not recreate deleted assessment');
    const next = (await game.act({ action: 'create', ...c, lastNumber: 3, token: token() })).room;
    time += 13 * 60 * 60 * 1000;
    const newer = (await game.act({ action: 'create', ...c, lastNumber: 3, token: token() })).room;
    const before = await call('adminInspect', { roomId: next.id }); await call('adminDelete', { roomId: next.id, confirmation: next.id, confirmationVersion: before.confirmationVersion });
    const joined = await game.act({ action: 'join', ...c, number: 2, token: token() }); assert.equal(joined.room.id, newer.id, 'deleting an older session preserves the newer directory');
    for (let n = 1; n <= 27; n++) await game.act({ action: 'create', school: c.school, grade: 4, classNo: n + 10, lastNumber: 1, token: token() });
    const ids = new Set(); let cursor = null, pages = 0;
    do { const result = await call('adminList', { cursor }); assert.ok(result.rooms.length <= 25); for (const r of result.rooms) { assert.ok(!ids.has(r.id)); ids.add(r.id); assert.ok(!('ownerHash' in r)); assert.ok(!('questionSet' in r)); } cursor = result.nextCursor; pages++; } while (cursor);
    assert.ok(pages >= 2); assert.ok(ids.has(newer.id)); assert.ok(!ids.has(room.id));
    assert.equal((await db.doc(`users/${identities.student.uid}`).get()).data().active, true);
    console.log('Pizza admin: real callable Auth, active super/full admin, student/class/teacher/disabled denial, revoked access, paginated listing, deletion confirmation/stale guard, atomic answer/report removal, idempotency, audit, old-token rejection and newer-session preservation passed.');
  } finally { await deleteApp(app); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
