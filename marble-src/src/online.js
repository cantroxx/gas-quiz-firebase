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
import { battleReducer, createBattleState, RANK_WIN, RANK_LOSE, TURN_LIMIT_MS, MAX_PLAYERS } from './battleLogic.js'

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

// 퀴즈타운 users 문서에서 진짜 이름 + 학번(users 문서 id) 찾기 (낱말대전과 동일)
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
        return { name: nick ? String(nick) : fallbackName(user), memberUserId: snap.docs[0].id }
      }
      return { name: fallbackName(user), memberUserId: '' }
    })
    .catch(() => ({ name: fallbackName(user), memberUserId: '' }))
}
function fallbackName(user) {
  return user.displayName || '친구' + String(user.uid).slice(-4)
}

function genCode() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

// 랭크 점수 기록 (marbleRanking/{내uid} 에 누적, 본인만) — 온라인/봇전 공용
export function recordRankPoints(deps, points, won) {
  const inc = deps.FieldValue.increment
  return deps.db
    .collection('marbleRanking')
    .doc(deps.me.uid)
    .set(
      {
        name: deps.me.name,
        total: inc(points),
        games: inc(1),
        wins: inc(won ? 1 : 0),
        updatedAt: Date.now(),
      },
      { merge: true },
    )
    .then(() => ({ ok: true, points }))
    .catch((e) => ({ ok: false, error: e.message }))
}

// deps 준비: { db, FieldValue, me:{uid,name,memberUserId} }
export function prepare() {
  return ensureAuth().then((user) => {
    const db = fb().firestore()
    return lookupNickname(db, user).then((info) => ({
      db,
      FieldValue: fb().firestore.FieldValue,
      me: { uid: user.uid, name: info.name, memberUserId: info.memberUserId },
    }))
  })
}

// ── 접속 도장 (홈타운 '우리 반 친구' 목록과 공유) ──────────────
// 마블을 여는 동안에도 타운 접속자 목록에 '특산물 마블 하는 중'으로 보이게
// 1분마다 presence/{내uid} 에 도장을 찍는다. 퀴즈타운 로그인이 없으면 찍지 않는다.
let _presenceTimer = null
export function startPresenceHeartbeat() {
  if (_presenceTimer || !firebaseReady()) return
  prepare()
    .then((deps) => {
      if (!deps.me.memberUserId) return // 퀴즈타운 회원이 아니면 명단에 올리지 않음
      const beat = () =>
        deps.db
          .collection('presence')
          .doc(deps.me.uid)
          .set(
            { name: deps.me.name, memberUserId: deps.me.memberUserId, where: 'marble', lastSeen: Date.now() },
            { merge: true },
          )
          .catch(() => {})
      beat()
      _presenceTimer = setInterval(beat, 60 * 1000)
    })
    .catch(() => {})
}

// 방 만들기 → code 반환
export function createRoom(deps, title) {
  const code = genCode()
  const room = {
    code,
    title: title || `${deps.me.name}의 방`,
    status: 'waiting',
    createdAt: Date.now(),
    seats: [{ uid: deps.me.uid, name: deps.me.name }, null, null, null], // 최대 4명
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
        if ((r.createdAt || 0) >= cutoff && seated < MAX_PLAYERS) {
          rooms.push({ code: r.code, title: r.title, count: seated, createdAt: r.createdAt || 0 })
        }
      })
      rooms.sort((a, b) => b.createdAt - a.createdAt)
      return rooms
    })
}

// 방 참가 (앞에서부터 빈 자리에 앉기, 최대 4명)
export function joinRoom(deps, code) {
  const ref = deps.db.collection('marbleRooms').doc(code)
  return deps.db
    .runTransaction((tx) =>
      tx.get(ref).then((snap) => {
        if (!snap.exists) throw new Error('그런 방 번호가 없어요.')
        const room = snap.data()
        if (room.status !== 'waiting') throw new Error('이미 시작한 방이에요.')
        const seats = room.seats || []
        while (seats.length < MAX_PLAYERS) seats.push(null) // 옛 2인 방 호환
        if (seats.some((s) => s && s.uid === deps.me.uid)) return // 이미 앉아 있음
        const empty = seats.findIndex((s) => !s)
        if (empty < 0) throw new Error('방이 꽉 찼어요. (최대 4명)')
        seats[empty] = { uid: deps.me.uid, name: deps.me.name }
        room.seats = seats
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
          const prevTurnNo = r.battle.turnNo
          const nextBattle = battleReducer(r.battle, action)
          r.battle = nextBattle
          if (nextBattle.turnNo !== prevTurnNo) r.turnStartedAt = Date.now() // 다음 사람 시계 시작
          if (nextBattle.phase === 'ended') r.status = 'ended'
          tx.set(ref, r)
        }),
      )
      .catch((e) => ({ ok: false, error: e.message }))
  }

  // 방장이 대전 시작 (2명 이상 모이면 가능, 최대 4명)
  function start() {
    return deps.db
      .runTransaction((tx) =>
        tx.get(ref).then((snap) => {
          const r = snap.data()
          const filled = (r.seats || []).filter(Boolean)
          if (filled.length < 2) throw new Error('친구가 아직 안 들어왔어요. (2명부터 시작)')
          if (filled[0].uid !== deps.me.uid) throw new Error('방장만 시작할 수 있어요.')
          r.seats = filled // 빈 자리를 정리해 좌석 번호 = 플레이어 번호로 맞춘다
          r.battle = createBattleState(filled.map((s) => s.name), 'online')
          r.status = 'playing'
          r.turnStartedAt = Date.now()
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
    return recordRankPoints(deps, pts, won)
  }

  // 대전 중 나가기 = 항복(탈락) — 내 차례가 아니어도 가능.
  // 남은 사람이 1명이면 그 사람 승리로 끝나고, 2명 이상이면 게임은 계속된다.
  function surrender() {
    return deps.db
      .runTransaction((tx) =>
        tx.get(ref).then((snap) => {
          if (!snap.exists) return
          const r = snap.data()
          if (r.status !== 'playing' || !r.battle) return
          const seat = (r.seats || []).findIndex((s) => s && s.uid === deps.me.uid)
          if (seat < 0) return
          const wasCurrent = r.battle.current === seat
          r.battle = battleReducer(r.battle, { type: 'SURRENDER', seat })
          if (wasCurrent) r.turnStartedAt = Date.now() // 차례가 넘어갔으면 시계 재시작
          if (r.battle.phase === 'ended') r.status = 'ended'
          tx.set(ref, r)
        }),
      )
      .catch((e) => ({ ok: false, error: e.message }))
  }

  // 상대가 90초 넘게 아무것도 안 하면 누구든 차례를 강제로 넘길 수 있음
  function forceTimeout() {
    return deps.db
      .runTransaction((tx) =>
        tx.get(ref).then((snap) => {
          if (!snap.exists) return
          const r = snap.data()
          if (r.status !== 'playing' || !r.battle) return
          if (Date.now() - (r.turnStartedAt || 0) < TURN_LIMIT_MS) return // 아직 시간 안 지남
          const prevTurnNo = r.battle.turnNo
          r.battle = battleReducer(r.battle, { type: 'TIMEOUT' })
          if (r.battle.turnNo !== prevTurnNo) r.turnStartedAt = Date.now()
          if (r.battle.phase === 'ended') r.status = 'ended'
          tx.set(ref, r)
        }),
      )
      .catch((e) => ({ ok: false, error: e.message }))
  }

  // 대기실에서 나가기: 방장이면 방을 닫고, 참가자면 자리를 비움
  function leaveWaiting() {
    return deps.db
      .runTransaction((tx) =>
        tx.get(ref).then((snap) => {
          if (!snap.exists) return
          const r = snap.data()
          if (r.status !== 'waiting') return
          if (r.seats[0] && r.seats[0].uid === deps.me.uid) {
            r.status = 'closed' // 방장이 나가면 방을 닫는다
          } else {
            r.seats = (r.seats || []).map((s) => (s && s.uid === deps.me.uid ? null : s))
          }
          tx.set(ref, r)
        }),
      )
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
    surrender,
    forceTimeout,
    leaveWaiting,
    getTurnStartedAt: () => (room ? room.turnStartedAt || 0 : 0),
    leave: () => {
      unsub && unsub()
    },
  }
}
