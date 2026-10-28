'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { initializeTestEnvironment, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc } = require('firebase/firestore');
const { createService } = require('../../functions/pizza-assessment/service');
const Q = require('../../functions/pizza-assessment/questions');
const token = () => crypto.randomBytes(32).toString('hex');
async function main() {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8181');
  const app = initializeApp({ projectId: 'demo-dj48-rules' }, 'pizza-service-test'), db = getFirestore(app);
  const env = await initializeTestEnvironment({ projectId: 'demo-dj48-rules', firestore: { host: '127.0.0.1', port: 8181, rules: fs.readFileSync('firestore.rules', 'utf8') } });
  let time = Date.now(); const service = createService({ db, now: () => time }), call = (action, data) => service.act({ action, ...data }), reject = (p, code) => assert.rejects(p, e => e.code === code);
  const c = { school: `테스트초등학교${time}`, grade: 4, classNo: 2 }, owner = token(), t1 = token(), t2 = token();
  try {
    const created = await call('create', { ...c, lastNumber: 4, token: owner }), roomId = created.room.id, teacher = { roomId, token: owner };
    assert.equal((await call('create', { ...c, lastNumber: 4, token: owner })).room.id, roomId, 'create retry idempotency');
    await reject(call('create', { ...c, lastNumber: 4, token: token() }), 'already-exists');
    await reject(call('join', { ...c, number: 5, token: token() }), 'invalid-argument');
    const joined = await Promise.allSettled([t1, t2].map(t => call('join', { ...c, number: 1, token: t })));
    assert.equal(joined.filter(s => s.status === 'fulfilled').length, 1, 'one student owns each number under concurrency');
    const winningToken = joined[0].status === 'fulfilled' ? t1 : t2, student = { roomId, number: 1, token: winningToken };
    const joinedState = await call('student', student);
    assert.ok(!joinedState.result); assert.ok(joinedState.questions.every(q => !q.answer && !q.feedback));
    assert.ok(!JSON.stringify(joinedState).includes(owner));
    for (const action of ['teacher', 'grade', 'report', 'close', 'resetStudent']) await reject(call(action, student), 'permission-denied');
    await reject(call('student', { ...student, number: 2 }), 'permission-denied');
    await reject(call('submit', student), 'failed-precondition');
    await reject(call('report', teacher), 'failed-precondition');
    await reject(call('save', { ...student, questionId: 1, answer: '5/8', revision: 99 }), 'aborted');
    for (let i = 0; i < 25; i++) await call('save', { ...student, questionId: i + 1, answer: Q.questions[i].answer, revision: i, score: 999999 });
    await call('submit', student); await call('submit', student);
    await reject(call('save', { ...student, questionId: 1, answer: '0', revision: 25 }), 'failed-precondition');
    const partialToken = token(), partial = { roomId, number: 2, token: partialToken }; await call('join', { ...c, number: 2, token: partialToken });
    await call('save', { ...partial, questionId: 1, answer: '5/8', revision: 0 });
    await call('resetStudent', { ...teacher, number: 2 }); await reject(call('student', partial), 'permission-denied');
    const newToken = token(); const rejoined = await call('join', { ...c, number: 2, token: newToken }); assert.equal(rejoined.student.answers[0], '5/8'); partial.token = newToken;
    await reject(call('grade', teacher), 'failed-precondition');
    // Later question-bank edits must not change an already opened assessment.
    const originalAnswer = Q.questions[0].answer; let graded;
    Q.questions[0].answer = '999';
    try { graded = await call('grade', { ...teacher, confirmIncomplete: true }); }
    finally { Q.questions[0].answer = originalAnswer; }
    assert.equal(graded.report.average, 52); assert.deepEqual(graded.report.students.map(s => s.score), [100, 4]); assert.deepEqual(graded.report.absent, [3, 4]);
    assert.equal(graded.report.questions[0].wrong, 0); assert.equal(graded.report.questions[1].wrong, 1); assert.equal(graded.report.questions[1].blank, 1);
    assert.equal((await call('student', student)).result.score, 100); assert.equal((await call('student', partial)).result.items.length, 25);
    await reject(call('save', { ...partial, questionId: 2, answer: '3/9', revision: 1 }), 'failed-precondition');
    await reject(call('join', { ...c, number: 3, token: token() }), 'failed-precondition');
    assert.deepEqual((await call('grade', teacher)).report, graded.report, 'grading is idempotent');
    // All client SDK access stays denied by the existing fallback rule, including anonymous/authenticated clients.
    for (const context of [env.unauthenticatedContext(), env.authenticatedContext('outsider')]) {
      const client = context.firestore();
      for (const path of [`pizzaAssessmentSessions/${roomId}`, `pizzaAssessmentSessions/${roomId}/students/1`, 'pizzaAssessmentDirectory/arbitrary']) {
        await assertFails(getDoc(doc(client, path))); await assertFails(setDoc(doc(client, path), { score: 100 }));
      }
    }
    await call('close', teacher); const next = await call('create', { ...c, lastNumber: 4, token: token() }); assert.notEqual(next.room.id, roomId);
    assert.equal((await call('report', teacher)).report.average, 52, 'closed assessment report preserved');
    time += 13 * 60 * 60 * 1000; await reject(call('join', { ...c, number: 1, token: token() }), 'failed-precondition');
    console.log('Pizza online: room isolation, transactional duplicate joins, teacher capabilities, student privacy, reset/resume, score forgery protection, answer-key secrecy, partial/absent scoring, grade freeze/idempotency, closed report preservation, expiry and SDK denial passed.');
  } finally { await env.cleanup(); await deleteApp(app); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
