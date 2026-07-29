/* 수학 서바이버 — 퀴즈타운 연동 (낱말대전 main.js 와 같은 방식)
 * - Firebase 는 퀴즈타운 Hosting 의 /__/firebase/ 스크립트를 재사용한다.
 *   로컬 시험 서버(python http.server)에는 그 스크립트가 없어 자동으로 오프라인 모드가 된다.
 * - 로그인: 퀴즈타운에 이미 로그인한 계정을 그대로 사용, 없을 때만 익명 로그인.
 * - 랭킹: mathsurvivorRanking/{uid} 문서에 자기 최고 기록만 기록 (firestore.rules 추가 필요).
 */
(function (global) {
  'use strict';

  function firebaseReady() {
    return !!(global.firebase && global.firebase.apps && global.firebase.apps.length &&
              global.firebase.firestore && global.firebase.auth);
  }

  // 로컬 에뮬레이터 연결 (낱말대전과 동일 — 운영 사이트에선 hostname이 달라 절대 실행되지 않음)
  (function wireEmulator() {
    const isLocal = /^(localhost|127\.0\.0\.1)$/.test(global.location.hostname);
    try {
      if (isLocal && firebaseReady()) {
        global.firebase.firestore().useEmulator('localhost', 8181);
        global.firebase.auth().useEmulator('http://localhost:9191', { disableWarnings: true });
        try { global.firebase.auth().setPersistence(global.firebase.auth.Auth.Persistence.NONE); } catch (e) {}
      }
    } catch (e) { /* 이미 연결됐거나 에뮬레이터 없음 — 무시 */ }
  })();

  // 퀴즈타운에 이미 로그인한 학생/교사가 있으면 그 계정을 그대로 쓴다.
  // (낱말대전에서 검증된 방식: 로그인 복원을 기다린 뒤, 정말 없을 때만 익명 로그인)
  let _authUser = null;
  function ensureAuth() {
    if (_authUser) return Promise.resolve(_authUser);
    const auth = global.firebase.auth();
    return new Promise(function (resolve) {
      const off = auth.onAuthStateChanged(function (user) {
        off();
        if (user) { _authUser = user; resolve(user); return; }
        auth.signInAnonymously().catch(function () {}).then(function () {
          _authUser = auth.currentUser; resolve(_authUser);
        });
      });
    });
  }

  // 퀴즈타운은 users 문서에 nickname 을 두고 authUid 로 연결해 둔다.
  function lookupNickname(db, user) {
    return db.collection('users').where('authUid', '==', user.uid).limit(1).get()
      .then(function (snap) {
        if (!snap.empty) {
          const d = snap.docs[0].data();
          const nick = d.nickname || d.name || d.displayNickname;
          if (nick) return String(nick);
        }
        return '친구' + user.uid.slice(0, 4);
      })
      .catch(function () { return '친구' + user.uid.slice(0, 4); });
  }

  const MS_Net = {
    online: function () { return firebaseReady(); },

    /* 게임 종료 시 자기 문서에 기록. 최고 점수만 갱신, 문제 풀이 수는 누적.
     * 성공하면 결과 화면에 보여줄 안내 문구를 돌려준다. */
    recordScore: function (r) {
      if (!firebaseReady()) {
        return Promise.resolve('💡 퀴즈타운 사이트에서 하면 우리 반 랭킹에 기록돼요!');
      }
      return ensureAuth().then(function (user) {
        if (!user) throw new Error('no auth');
        const db = global.firebase.firestore();
        const ref = db.collection('mathsurvivorRanking').doc(user.uid);
        return lookupNickname(db, user).then(function (name) {
          return ref.get().then(function (snap) {
            const prev = snap.exists ? snap.data() : {};
            const isBest = !prev.bestScore || r.score > prev.bestScore;
            // 과목별 정답 수 누적 (교사가 반 전체 데이터를 볼 수 있게)
            const subjects = prev.subjects || {};
            if (r.bySubject) {
              for (const s in r.bySubject) {
                const cur = subjects[s] || { correct: 0, total: 0 };
                subjects[s] = {
                  correct: cur.correct + r.bySubject[s].correct,
                  total: cur.total + r.bySubject[s].total,
                };
              }
            }
            const data = {
              subjects: subjects,
              name: name,
              plays: (prev.plays || 0) + 1,
              quizCorrect: (prev.quizCorrect || 0) + r.correct,
              quizTotal: (prev.quizTotal || 0) + r.total,
              bestScore: isBest ? r.score : prev.bestScore,
              bestGrade: isBest ? r.grade : (prev.bestGrade || r.grade),
              bestSurvived: isBest ? r.survived : (prev.bestSurvived || 0),
              bestLevel: isBest ? r.level : (prev.bestLevel || 1),
              bestVictory: !!(prev.bestVictory || r.victory),
              updatedAt: global.firebase.firestore.FieldValue.serverTimestamp(),
            };
            return ref.set(data, { merge: true }).then(function () {
              return isBest
                ? '🏫 새 최고 기록! 우리 반 명예의 전당에 올라갔어요!'
                : '🏫 반 랭킹에 기록했어요! (최고 ' + prev.bestScore.toLocaleString('ko-KR') + '점)';
            });
          });
        });
      });
    },

    // 명예의 전당: 최고 점수 순 상위 n명
    topList: function (n) {
      if (!firebaseReady()) return Promise.reject(new Error('offline'));
      return ensureAuth().then(function () {
        const db = global.firebase.firestore();
        return db.collection('mathsurvivorRanking')
          .orderBy('bestScore', 'desc').limit(n || 20).get()
          .then(function (snap) {
            return snap.docs.map(function (d) {
              const v = d.data();
              return { name: v.name || '???', bestScore: v.bestScore || 0, bestVictory: !!v.bestVictory, bestGrade: v.bestGrade };
            });
          });
      });
    },
  };

  global.MS_Net = MS_Net;
})(window);
