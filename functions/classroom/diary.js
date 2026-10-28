'use strict';

const MOODS = ['happy', 'excited', 'calm', 'tired', 'sad', 'upset'];
const todayKst = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);

// All reads/writes go through this callable. Firestore client access stays denied.
function createService({ db, ErrorType, authorize, authorFor, today = todayKst, now = Date.now }) {
  const fail = (code, message) => { throw new ErrorType(code, message); };
  const id = value => {
    if(typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(value)) fail('invalid-argument', '계정과 교실을 다시 확인해 주세요.');
    return value;
  };
  const text = (value, max) => {
    if(typeof value !== 'string' || !value.trim() || value.length > max) fail('invalid-argument', `내용을 1~${max}자로 적어 주세요.`);
    return value.trim();
  };
  const revision = (row, expected) => {
    if(!Number.isInteger(expected) || expected !== (row?.revision || 0)) fail('aborted', '다른 창에서 내용이 바뀌었어요. 다시 불러온 뒤 저장해 주세요.');
  };
  return async function act(uid, payload = {}) {
    if(!uid) fail('unauthenticated', '로그인이 필요해요.');
    const memberUserId = id(payload.memberUserId), classId = id(payload.classId);
    const actions = ['list', 'read', 'save', 'delete', 'comment', 'editComment', 'deleteComment', 'moderate', 'moderateComment'];
    if(!actions.includes(payload.action)) fail('invalid-argument', '지원하지 않는 일기 작업이에요.');
    const dateKey = payload.dateKey;
    if(typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)
      || !Number.isFinite(Date.parse(dateKey)) || new Date(dateKey).toISOString().slice(0, 10) !== dateKey
      || dateKey > today() || dateKey < '2020-01-01') fail('invalid-argument', '오늘까지의 올바른 날짜를 선택해 주세요.');
    const ownerId = id(payload.ownerId || memberUserId);
    const root = db.collection(`classrooms/${classId}/diaryEntries`);
    const entryRef = root.doc(`${ownerId}_${dateKey}`);
    return db.runTransaction(async tx => {
      const context = await authorize(tx, memberUserId, uid, classId);
      const own = ownerId === memberUserId;
      const isTeacher = context.isTeacher === true;
      const publicAuthor = async owner => authorFor(tx, owner, classId, context);
      if(payload.action === 'list') {
        // One date is bounded to a classroom-sized page. Never return private rows/counts.
        const rows = await tx.get(root.where('dateKey', '==', dateKey).limit(100));
        const entries = [];
        for(const doc of rows.docs) {
          const row = doc.data();
          if(row.deleted || row.visibility !== 'class' || (row.hidden && !isTeacher)) continue;
          const author = await publicAuthor(row.memberUserId);
          if(author) entries.push({ ownerId: row.memberUserId, dateKey, mood: row.mood, excerpt: row.text.slice(0, 100), hidden: !!row.hidden, author });
        }
        entries.sort((a,b) => Number(a.author.studentNumber || 0) - Number(b.author.studentNumber || 0) || a.ownerId.localeCompare(b.ownerId));
        return { success: true, entries, isTeacher, truncated: rows.size === 100 };
      }
      const snapshot = await tx.get(entryRef), row = snapshot.exists ? snapshot.data() : null;
      const author = await publicAuthor(ownerId);
      if(!author) fail('permission-denied', '같은 반 학생의 일기만 볼 수 있어요.');
      const exists = row && !row.deleted;
      const canRead = own || (exists && row.visibility === 'class' && (!row.hidden || isTeacher));
      if(!canRead) fail('permission-denied', '공개된 일기가 아니거나 볼 수 없는 일기예요.');
      const commentsRef = entryRef.collection('comments');
      if(payload.action === 'read') {
        const comments = [];
        if(exists && row.visibility === 'class' && (!row.hidden || isTeacher)) {
          const rows = await tx.get(commentsRef.where('generation', '==', row.generation).limit(100));
          for(const doc of rows.docs) {
            const comment = doc.data();
            if(comment.deleted || (comment.hidden && !isTeacher)) continue;
            const commentAuthor = await publicAuthor(comment.memberUserId);
            if(commentAuthor) comments.push({ id: doc.id, text: comment.text, revision: comment.revision, hidden: !!comment.hidden,
              memberUserId: comment.memberUserId, createdAt: comment.createdAt, author: commentAuthor });
          }
          comments.sort((a,b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
        }
        return { success: true, ownerId, author, isTeacher, entry: exists ? {
          dateKey, text: row.text, mood: row.mood, visibility: row.visibility, revision: row.revision, hidden: !!row.hidden
        } : { dateKey, text: '', mood: '', visibility: 'private', revision: row?.revision || 0, hidden: false }, comments };
      }
      const stamp = now();
      if(['save', 'delete'].includes(payload.action)) {
        if(!own) fail('permission-denied', '내 일기만 수정할 수 있어요.');
        revision(row, payload.revision);
        if(payload.action === 'delete') {
          if(!exists) fail('not-found', '삭제할 일기가 없어요.');
          tx.set(entryRef, { ...row, text: '', mood: '', visibility: 'private', deleted: true, updatedAt: stamp, revision: row.revision + 1 });
        } else {
          if(!MOODS.includes(payload.mood) || !['private', 'class'].includes(payload.visibility)) fail('invalid-argument', '기분과 공개 범위를 선택해 주세요.');
          const content = text(payload.text, 1000);
          tx.set(entryRef, { memberUserId, dateKey, text: content, mood: payload.mood, visibility: payload.visibility,
            revision: (row?.revision || 0) + 1, generation: exists ? row.generation : (row?.generation || 0) + 1,
            commentTotal: exists ? row.commentTotal || 0 : 0, hidden: exists ? !!row.hidden : false,
            deleted: false, createdAt: exists ? row.createdAt : stamp, updatedAt: stamp });
        }
        return { success: true };
      }
      if(!exists || row.visibility !== 'class') fail('failed-precondition', '우리반에 공개한 일기에만 댓글을 남길 수 있어요.');
      if(payload.action === 'moderate') {
        if(!isTeacher) fail('permission-denied', '선생님만 공개 글을 숨길 수 있어요.');
        revision(row, payload.revision);
        tx.update(entryRef, { hidden: !row.hidden, revision: row.revision + 1, updatedAt: stamp });
        return { success: true };
      }
      if(row.hidden) fail('failed-precondition', '선생님이 숨긴 일기에는 댓글을 남길 수 없어요.');
      const commentId = id(payload.commentId), commentRef = commentsRef.doc(commentId);
      const commentSnapshot = await tx.get(commentRef), comment = commentSnapshot.exists ? commentSnapshot.data() : null;
      if(payload.action === 'comment') {
        const content = text(payload.text, 300);
        // Client keeps this id on a network retry, preventing duplicate comments.
        if(comment) {
          if(comment.memberUserId === memberUserId && comment.generation === row.generation && !comment.deleted && comment.text === content) return { success: true };
          fail('already-exists', '댓글 번호가 이미 사용되었어요. 다시 시도해 주세요.');
        }
        if((row.commentTotal || 0) >= 100) fail('resource-exhausted', '이 일기의 댓글은 100개까지 남길 수 있어요.');
        tx.set(commentRef, { memberUserId, text: content, generation: row.generation, revision: 1, createdAt: stamp, updatedAt: stamp, deleted: false, hidden: false });
        // Touch the entry too: visibility changes and concurrent comments conflict and retry.
        tx.update(entryRef, { commentTotal: (row.commentTotal || 0) + 1 });
        return { success: true };
      }
      if(!comment || comment.deleted || comment.generation !== row.generation) fail('not-found', '댓글을 찾을 수 없어요.');
      revision(comment, payload.revision);
      const patch = { updatedAt: stamp, revision: comment.revision + 1 };
      if(payload.action === 'moderateComment') {
        if(!isTeacher) fail('permission-denied', '선생님만 댓글을 숨길 수 있어요.');
        patch.hidden = !comment.hidden;
      } else {
        if(comment.memberUserId !== memberUserId) fail('permission-denied', '내 댓글만 수정할 수 있어요.');
        if(payload.action === 'deleteComment') { patch.deleted = true; patch.text = ''; }
        else patch.text = text(payload.text, 300);
      }
      tx.update(commentRef, patch);
      return { success: true };
    });
  };
}
module.exports = { createService, MOODS, todayKst };
