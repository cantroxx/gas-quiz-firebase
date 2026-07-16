// online.js — 온라인 대전(Firestore) 어댑터
//  낱말대전(net.js)과 동일한 방식: 퀴즈타운 익명 로그인 재사용 + runTransaction/onSnapshot.
//  특산물마블은 숨김 정보가 없어, 방 문서 1개(marbleRooms/{code})에 대전 상태 전체를 담습니다.
//
//  문서 구조:
//    marbleRooms/{code} = { code, title, status:'waiting'|'playing'|'ended',
//                           createdAt, seats:[{uid,name}, {uid,name}|null], battle:<상태>|null }
//    marbleRanking/{uid} = { name, total, games, wins, updatedAt }  (본인만 write)
//
//  Firebase compat SDK(window.firebase)는 퀴즈타운 Hosting에서 자동 주입(/__/firebase/*).
//  Vercel 단독 배포에선 그 스크립트가 없어 firebaseReady()=false → 온라인 숨김, 봇/연습만.
import { battleReducer, createBattleState, RANK_WIN, RANK_LOSE } from './battleLogic.js'

function fb() {
  return typeof window !== 'undefined' ? window.firebase : null
}
export function firebaseReady() {
  const f = fb()
  return !!(f && f.apps && f.apps.length && f.firestore && f.auth)
}

// 로그인 보장 (기존 퀴즈타운 로그인 재사용, 없으면 익명)
let _user = null
export function ensureAuth() {
  if (_user) return Promise.resolve(_user)
  const auth = fb().auth()
  return new Promise((resolve) => {
    const off = auth.onAuthStateChanged((user) => {
      off()
      if (user) {
        _user = user
        resolve(user)
      } else {
        auth
          .signInAnonymously()
          .catch(() => {})
          .then(() => {
            _user = auth.currentUser
            resolve(_user)
          })
      }
    })
  })
}

// 퀴즈타운 users 문서에서 진짜 이름 찾기 (낱말대전과 동일)
export function lookupNickname(db, user) {
  return db
    .collection('users')
    .where('authUid', '==', user.uid)
    .limit(1)
    .get()
    .then((snap) => {
      if (!snap.empty) {
        const d = snap.docs[0].data() || {}
        const nick = d.nickname || d.name || d.displayNickname
        if (nick) return String(nick)
      }
      return fallbackName(user)
    })
    .catch(() => fallbackName(user))
}
function fallbackName(user) {
  return user.displayName || '친구' + String(user.uid).slice(-4)
}

function genCode() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

// deps 준비: { db, FieldValue, me:{uid,name} }
export function prepare() {
  return ensureAuth().then((user) => {
    const db = fb().firestore()
    return lookupNickname(db, user).then((name) => ({
      db,
      FieldValue: fb().firestore.FieldValue,
      me: { uid: user.uid, name },
    }))
  })
}

// 방 만들기 → code 반환
export function createRoom(deps, title) {
  const code = genCode()
  const room = {
    code,
    title: title || `${deps.me.name}의 방`,
    status: 'waiting',
    createdAt: Date.now(),
    seats: [{ uid: deps.me.uid, name: deps.me.name }, null],
    battle: null,
  }
  return deps.db.collection('marbleRooms').doc(code).set(room).then(() => code)
}

// 대기방 목록 (최근 40분, 자리 남은 방)
export function listRooms(deps) {
  return deps.db
    .collection('marbleRooms')
    .where('status', '==', 'waiting')
    .get()
    .then((snap) => {
      const cutoff = Date.now() - 40 * 60 * 1000
      const rooms = []
      snap.forEach((d) => {
        const r = d.data()
        const seated = (r.seats || []).filter(Boolean).length
        if ((r.createdAt || 0) >= cutoff && seated < 2) {
          rooms.push({ code: r.code, title: r.title, count: seated, createdAt: r.createdAt || 0 })
        }
      })
      rooms.sort((a, b) => b.createdAt - a.createdAt)
      return rooms
    })
}

// 방 참가 (빈 2번 자리에 앉기)
export function joinRoom(deps, code) {
  const ref = deps.db.collection('marbleRooms').doc(code)
  return deps.db
    .runTransaction((tx) =>
      tx.get(ref).then((snap) => {
        if (!snap.exists) throw new Error('그런 방 번호가 없어요.')
        const room = snap.data()
        if (room.seats[1]) throw new Error('방이 꽉 찼어요.')
        if (room.seats[0] && room.seats[0].uid === deps.me.uid) return // 내가 만든 방
        room.seats[1] = { uid: deps.me.uid, name: deps.me.name }
        tx.set(ref, room)
      }),
    )
    .then(() => code)
}

// 온라인 세션: 방을 실시간 구독하고 액션을 트랜잭션으로 적용
export function OnlineSession(deps, code) {
  const ref = deps.db.collection('marbleRooms').doc(code)
  let room = null
  const listeners = []
  const notify = () => listeners.forEach((cb) => cb())

  const unsub = ref.onSnapshot((snap) => {
    room = snap.exists ? snap.data() : null
    notify()
  })

  // 내 좌석 번호 (0/1), 없으면 -1
  function mySeat() {
    if (!room) return -1
    return (room.seats || []).findIndex((s) => s && s.uid === deps.me.uid)
  }

  // 액션 적용 (내 차례일 때만). action 은 battleReducer 액션(랜덤 payload 포함)
  function act(action) {
    return deps.db
      .runTransaction((tx) =>
        tx.get(ref).then((snap) => {
          if (!snap.exists) throw new Error('방이 없어졌어요.')
          const r = snap.data()
          if (r.status !== 'playing' || !r.battle) return
          const seat = (r.seats || []).findIndex((s) => s && s.uid === deps.me.uid)
          if (r.battle.current !== seat) return // 내 차례 아님
          const nextBattle = battleReducer(r.battle, action)
          r.battle = nextBattle
          if (nextBattle.phase === 'ended') r.status = 'ended'
          tx.set(ref, r)
        }),
      )
      .catch((e) => ({ ok: false, error: e.message }))
  }

  // 방장이 대전 시작 (두 자리 다 찼을 때)
  function start() {
    return deps.db
      .runTransaction((tx) =>
        tx.get(ref).then((snap) => {
          const r = snap.data()
          if (!r.seats[0] || !r.seats[1]) throw new Error('상대가 아직 안 들어왔어요.')
          if (r.seats[0].uid !== deps.me.uid) throw new Error('방장만 시작할 수 있어요.')
          r.battle = createBattleState([r.seats[0].name, r.seats[1].name], 'online')
          r.status = 'playing'
          tx.set(ref, r)
        }),
      )
      .catch((e) => ({ ok: false, error: e.message }))
  }

  // 게임 끝: 내 승패 랭크 점수를 marbleRanking 에 누적 (본인 것만)
  function recordRank() {
    if (!room || room.status !== 'ended' || !room.battle) return Promise.resolve({ ok: false })
    const seat = mySeat()
    if (seat < 0) return Promise.resolve({ ok: false })
    const b = room.battle
    const won = b.winner === seat
    const draw = b.winner === 'draw'
    const pts = draw ? Math.round((RANK_WIN + RANK_LOSE) / 2) : won ? RANK_WIN : RANK_LOSE
    const inc = deps.FieldValue.increment
    return deps.db
      .collection('marbleRanking')
      .doc(deps.me.uid)
      .set(
        {
          name: deps.me.name,
          total: inc(pts),
          games: inc(1),
          wins: inc(won ? 1 : 0),
          updatedAt: Date.now(),
        },
        { merge: true },
      )
      .then(() => ({ ok: true, points: pts }))
      .catch((e) => ({ ok: false, error: e.message }))
  }

  return {
    code,
    getRoom: () => room,
    mySeat,
    onChange: (cb) => listeners.push(cb),
    act,
    start,
    recordRank,
    leave: () => {
      unsub && unsub()
    },
  }
}
