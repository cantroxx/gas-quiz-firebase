'use strict';
const crypto = require('node:crypto');
const Q = require('./questions');
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const validToken = t => typeof t === 'string' && /^[a-f0-9]{64}$/.test(t);
const matches = (token, digest) => validToken(token) && typeof digest === 'string' && crypto.timingSafeEqual(Buffer.from(hash(token)), Buffer.from(digest));
const SESSION_MS = 12 * 60 * 60 * 1000;
function createService({ db, authorize, now = Date.now, ErrorType = class extends Error { constructor(code, message) { super(message); this.code = code; } } }) {
  const fail = (code, message) => { throw new ErrorType(code, message); };
  const integer = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;
  function classroom(p) {
    if (typeof p.school !== 'string') fail('invalid-argument', '학교 이름을 입력해 주세요.');
    const school = p.school.normalize('NFKC').trim().replace(/\s+/g, ' ');
    if (school.length < 2 || school.length > 60 || /[<>\x00-\x1f]/.test(school) || !integer(p.grade, 1, 6) || !integer(p.classNo, 1, 99)) fail('invalid-argument', '학교·학년·반을 확인해 주세요.');
    return { school, grade: p.grade, classNo: p.classNo, key: hash(`${school.replace(/\s/g, '')}|${p.grade}|${p.classNo}`) };
  }
  const roomView = r => ({ id: r.id, school: r.school, grade: r.grade, classNo: r.classNo, lastNumber: r.lastNumber, createdAt: r.createdAt, expiresAt: r.expiresAt, expired: now() > r.expiresAt, status: r.status, gradedAt: r.gradedAt || null, version: r.version, questionCount:(r.questionSet||Q.questions).length });
  function studentView(r, s) {
    
    return { room: roomView(r), student: { number: s.number, answers: s.answers, submitted: s.submitted, revision: s.revision }, questions: Q.publicQuestions(r.questionSet) };
  }
  function makeReport(r, students) {
    const rows=students.map(s=>({number:s.number,submitted:s.submitted,...Q.grade(s.answers,r.questionSet)})).sort((a,b)=>a.number-b.number);
    return {generatedAt:now(),total:rows.length,students:rows,absent:Array.from({length:r.lastNumber},(_,i)=>i+1).filter(n=>!rows.some(s=>s.number===n)),automaticTotal:(r.questionSet||Q.questions).filter(q=>q.type!=='short').length,manualTotal:(r.questionSet||Q.questions).filter(q=>q.type==='short').length};
  }
  async function act(p, uid) {
    if (!p || typeof p !== 'object') fail('invalid-argument', '요청을 확인해 주세요.');
    if (p.action === 'create') {
      if(!uid) fail('unauthenticated','관리자 계정으로 로그인해 주세요.');
      const admin=await authorize(uid);if(!admin?.isSuperAdmin)fail('permission-denied','퀴즈타운 총관리자만 반을 개설할 수 있어요.');
      const c = classroom(p);
      if (!integer(p.lastNumber, 1, 60) || !validToken(p.token)) fail('invalid-argument', '마지막 번호(1~60)를 확인해 주세요.');
      // Token-derived id makes a retried create safe after a lost response.
      const id = hash(p.token).slice(0, 24), ref = db.doc(`spaceAssessmentSessions/${id}`), dir = db.doc(`spaceAssessmentDirectory/${c.key}`);
      return db.runTransaction(async tx => {
        const [existing, active, deleted] = await Promise.all([tx.get(ref), tx.get(dir), tx.get(db.doc(`spaceAssessmentDeletions/${id}`))]);
        if (deleted.exists) return { deleted: true };
        if (existing.exists) { if (!matches(p.token, existing.data().ownerHash)) fail('permission-denied', '교사 권한이 없어요.'); return { room: roomView(existing.data()) }; }
        if (active.exists && active.data().expiresAt > now()) fail('already-exists', '이 학급의 평가가 이미 열려 있어요. 기존 교사 화면에서 학급을 종료한 뒤 새로 열어 주세요.');
        const r = { ...c, id, lastNumber: p.lastNumber, ownerHash: hash(p.token), status: 'open', createdAt: now(), expiresAt: now() + SESSION_MS, version: Q.version, questionCount:Q.questions.length, questionSet: Q.questions };
        tx.create(ref, r); tx.set(dir, { roomId: id, expiresAt: r.expiresAt });
        return { room: roomView(r) };
      });
    }
    if (p.action === 'join') {
      const c = classroom(p);
      if (!integer(p.number, 1, 60) || !validToken(p.token)) fail('invalid-argument', '학생 번호를 확인해 주세요.');
      return db.runTransaction(async tx => {
        const directory = await tx.get(db.doc(`spaceAssessmentDirectory/${c.key}`));
        if (!directory.exists) fail('not-found', '아직 열린 학급이 없어요. 학교·학년·반을 확인해 주세요.');
        const ref = db.doc(`spaceAssessmentSessions/${directory.data().roomId}`), snap = await tx.get(ref);
        if (!snap.exists) fail('not-found', '학급을 찾을 수 없어요.');
        const r = snap.data(), sr = ref.collection('students').doc(String(p.number)), student = await tx.get(sr);
        if (p.number > r.lastNumber) fail('invalid-argument', `이 학급은 ${r.lastNumber}번까지 입장할 수 있어요.`);
        if (student.exists) {
          const s = student.data();
          if (s.needsRejoin && r.status === 'open' && now() < r.expiresAt) { s.tokenHash = hash(p.token); s.needsRejoin = false; tx.set(sr, s); }
          else if (!matches(p.token, s.tokenHash)) fail('already-exists', '이미 입장한 번호예요. 이전 기기에서 이어 하거나 선생님께 입장 초기화를 요청하세요.');
          return studentView(r, s);
        }
        if (r.status !== 'open' || now() > r.expiresAt) fail('failed-precondition', '입장이 마감된 학급이에요.');
        const s = { number: p.number, tokenHash: hash(p.token), answers: Array((r.questionSet||Q.questions).length).fill(''), submitted: false, revision: 0, joinedAt: now(), updatedAt: now() };
        tx.create(sr, s); return studentView(r, s);
      });
    }
    if (typeof p.roomId !== 'string' || !/^[a-f0-9]{24}$/.test(p.roomId) || !validToken(p.token)) fail('permission-denied', '입장 정보가 없어요. 다시 입장해 주세요.');
    const ref = db.doc(`spaceAssessmentSessions/${p.roomId}`);
    return db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) fail('not-found', '학급을 찾을 수 없어요.');
      const r = snap.data();
      if (['teacher', 'grade', 'report', 'close', 'resetStudent'].includes(p.action)) {
        if (!matches(p.token, r.ownerHash)) fail('permission-denied', '이 학급을 개설한 선생님만 사용할 수 있어요.');
        if (p.action === 'report') { if (!r.report) fail('failed-precondition', '먼저 채점하기를 눌러 주세요.'); return { room: roomView(r), report: r.report }; }
        if (p.action === 'resetStudent') {
          if (r.status !== 'open' || !integer(p.number, 1, r.lastNumber)) fail('failed-precondition', '평가 진행 중인 번호만 초기화할 수 있어요.');
          const studentRef = ref.collection('students').doc(String(p.number)), student = await tx.get(studentRef);
          if (!student.exists) fail('not-found', '입장하지 않은 번호예요.');
          // Keep answers. The next legitimate join receives a new capability.
          tx.update(studentRef, { tokenHash: hash(crypto.randomBytes(32).toString('hex')), needsRejoin: true });
          return { ok: true };
        }
        if (p.action === 'close') {
          const dir = db.doc(`spaceAssessmentDirectory/${r.key}`), ds = await tx.get(dir);
          if (!r.report) fail('failed-precondition', '먼저 채점한 뒤 학급을 종료해 주세요.');
          if (ds.exists && ds.data().roomId === r.id) tx.delete(dir);
          tx.update(ref, { status: 'closed' }); return { room: roomView({ ...r, status: 'closed' }) };
        }
        const ss = await tx.get(ref.collection('students')); const students = ss.docs.map(d => d.data());
        if (p.action === 'grade' && !r.report) {
          if (!students.length) fail('failed-precondition', '입장한 학생이 아직 없어요.');
          if (students.some(s => !s.submitted) && p.confirmIncomplete !== true) fail('failed-precondition', '미제출 학생이 있어요. 제출을 기다리거나 마감 채점을 선택해 주세요.');
          r.status = 'graded'; r.gradedAt = now(); r.report = makeReport(r, students);
          tx.update(ref, { status: r.status, gradedAt: r.gradedAt, report: r.report });
        }
        return { room: roomView(r), students: students.map(s => ({ number: s.number, answered: s.answers.filter(Boolean).length, submitted: s.submitted, updatedAt: s.updatedAt, needsRejoin: !!s.needsRejoin })), ...(r.report ? { report: r.report } : {}) };
      }
      if (!integer(p.number, 1, r.lastNumber)) fail('permission-denied', '학생 번호를 확인해 주세요.');
      const sr = ref.collection('students').doc(String(p.number)), ss = await tx.get(sr);
      if (!ss.exists || !matches(p.token, ss.data().tokenHash)) fail('permission-denied', '학생 입장 정보가 바뀌었어요. 다시 입장해 주세요.');
      const s = ss.data();
      if (p.action === 'student') return studentView(r, s);
      if (!['save', 'submit'].includes(p.action)) fail('invalid-argument', '지원하지 않는 요청이에요.');
      if (r.status !== 'open' || now() > r.expiresAt) fail('failed-precondition', '평가가 마감되어 답을 바꿀 수 없어요.');
      if (s.submitted) { if (p.action === 'submit') return studentView(r, s); fail('failed-precondition', '최종 제출한 답안은 바꿀 수 없어요.'); }
      if (p.action === 'save') {
        if (!integer(p.questionId, 1, (r.questionSet||Q.questions).length) || typeof p.answer !== 'string' || p.answer.length > 2000) fail('invalid-argument', '답안을 확인해 주세요.');
        const q = (r.questionSet || Q.questions)[p.questionId - 1];
        if (p.answer !== '' && !Q.valid(q,p.answer)) fail('invalid-argument', '관측 사진과 답안을 확인해 주세요.');
        if (p.revision !== s.revision) {
          if (p.revision === s.revision - 1 && s.answers[p.questionId - 1] === p.answer) return studentView(r, s);
          fail('aborted', '다른 창에서 답안이 바뀌었어요. 새로고침한 뒤 확인해 주세요.');
        }
        s.answers[p.questionId - 1] = p.answer; s.revision++;
      } else {
        if (s.answers.some(a => !a)) fail('failed-precondition', `${(r.questionSet||Q.questions).length}개 임무의 답을 모두 저장해 주세요.`);
        s.submitted = true;
      }
      s.updatedAt = now(); tx.set(sr, s); return studentView(r, s);
    });
  }
  return { act };
}
module.exports = { createService };
