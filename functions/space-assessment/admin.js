'use strict';
const crypto = require('node:crypto');

function createAdminService({ db, authorize, now = Date.now, ErrorType = class extends Error { constructor(code, message) { super(message); this.code = code; } } }) {
  const fail = (code, message) => { throw new ErrorType(code, message); };
  const view = r => ({ id: r.id, school: r.school, grade: r.grade, classNo: r.classNo, lastNumber: r.lastNumber, createdAt: r.createdAt, questionCount:r.questionCount||r.questionSet?.length||10, status: r.status, expired: now() > r.expiresAt });
  const stamp = time => [time.seconds, time.nanoseconds];
  function preview(room, students) {
    const rows = students.docs.map(d => d.data());
    return { room: view(room.data()), studentCount: rows.length, submittedCount: rows.filter(s => s.submitted).length,
      answerCount: rows.reduce((count, s) => count + s.answers.filter(Boolean).length, 0), hasReport: !!room.data().report,
      confirmationVersion: crypto.createHash('sha256').update(JSON.stringify([stamp(room.updateTime), students.docs.map(d => [d.id, stamp(d.updateTime)])])).digest('hex') };
  }
  async function act(uid, p) {
    if (!uid) fail('unauthenticated', '퀴즈타운 총관리자 계정으로 먼저 로그인해 주세요.');
    const admin = await authorize(uid); // Existing Quiztown server-side role resolution, never a client flag.
    if (!admin?.isSuperAdmin) fail('permission-denied', '퀴즈타운 총관리자만 사용할 수 있어요.');
    if (p.action === 'adminList') {
      let query = db.collection('spaceAssessmentSessions').orderBy('createdAt', 'desc').orderBy('__name__', 'desc');
      if (p.cursor) {
        if (!Number.isSafeInteger(p.cursor.createdAt) || typeof p.cursor.id !== 'string' || !/^[a-f0-9]{24}$/.test(p.cursor.id)) fail('invalid-argument', '목록 페이지를 다시 열어 주세요.');
        query = query.startAfter(p.cursor.createdAt, p.cursor.id);
      }
      const snaps = await query.select('id', 'school', 'grade', 'classNo', 'lastNumber', 'createdAt', 'status', 'expiresAt', 'questionCount').limit(26).get();
      const rows = snaps.docs.slice(0, 25).map(d => view(d.data())), last = rows.at(-1);
      return { rooms: rows, nextCursor: snaps.size > 25 ? { id: last.id, createdAt: last.createdAt } : null, admin: { memberUserId: admin.memberUserId } };
    }
    if (!['adminInspect', 'adminDelete'].includes(p.action) || typeof p.roomId !== 'string' || !/^[a-f0-9]{24}$/.test(p.roomId)) fail('invalid-argument', '삭제할 평가 회차를 확인해 주세요.');
    if (p.action === 'adminDelete' && p.confirmation !== p.roomId) fail('failed-precondition', '삭제 대상 확인이 필요해요.');
    const ref = db.doc(`spaceAssessmentSessions/${p.roomId}`), auditRef = db.doc(`spaceAssessmentDeletions/${p.roomId}`);
    return db.runTransaction(async tx => {
      const [room, audit] = await Promise.all([tx.get(ref), tx.get(auditRef)]);
      if (!room.exists) {
        if (p.action === 'adminDelete' && audit.exists) return { deleted: true, alreadyDeleted: true };
        fail('not-found', '이미 삭제되었거나 존재하지 않는 평가예요.');
      }
      const students = await tx.get(ref.collection('students').orderBy('__name__'));
      const summary = preview(room, students);
      if (p.action === 'adminInspect') return {...summary, questionCount:(room.data().questionSet||[]).length, students: students.docs.map(d=>{const s=d.data();return {number:s.number,answered:s.answers.filter(Boolean).length,submitted:s.submitted};}), report: room.data().report || null};
      if (p.confirmationVersion !== summary.confirmationVersion) fail('failed-precondition', '확인하는 동안 학생 답안이나 학급 상태가 바뀌었어요. 최신 내용을 확인하고 다시 삭제해 주세요.');
      const directory = db.doc(`spaceAssessmentDirectory/${room.data().key}`), ds = await tx.get(directory);
      for (const s of students.docs) tx.delete(s.ref);
      tx.delete(ref);
      // An older assessment must never remove a newer session's class entry.
      if (ds.exists && ds.data().roomId === p.roomId) tx.delete(directory);
      tx.create(auditRef, { room: summary.room, actorMemberId: admin.memberUserId, deletedAt: now(), studentCount: summary.studentCount,
        submittedCount: summary.submittedCount, answerCount: summary.answerCount, hadReport: summary.hasReport });
      return { deleted: true, alreadyDeleted: false };
    });
  }
  return { act };
}
module.exports = { createAdminService };
