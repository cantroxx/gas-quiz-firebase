// online.js — 학급코드 로그인 · 랭킹 · 학급 관리 (Firestore 어댑터)
//  marble-src/online.js 와 같은 방식:
//  - Firebase compat SDK(window.firebase)는 퀴즈타운 Hosting이 자동 주입(/__/firebase/*)
//  - 로컬 vite 개발에서는 window.firebase 가 없어 firebaseReady()=false → 손님 모드만 보임
//
//  문서 구조:
//    geosangClasses/{학급코드}  = { name, linkEnabled, pwHash, ownerUid, createdAt }
//    geosangProfiles/{uid}      = { classCode, nickname, updatedAt }
//    geosangRanking/{uid}       = { classCode, nickname, bestCash, bestTitle, games, updatedAt }
//  총관리자 = 퀴즈타운 관리자 계정 (custom claim admin=true, firestore.rules isAdmin())

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

// 관리 비밀번호는 절대 그대로 저장하지 않고, 해시(지문)만 저장해요.
export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// 준비: 로그인 + db + 총관리자 여부
export async function prepare() {
  const user = await ensureAuth()
  const db = fb().firestore()
  let admin = false
  try {
    const token = await user.getIdTokenResult()
    admin = token.claims.admin === true
  } catch (e) {
    admin = false
  }
  return { db, me: { uid: user.uid }, admin }
}

export async function getClass(db, code) {
  const snap = await db.collection('geosangClasses').doc(code).get()
  return snap.exists ? { code, ...snap.data() } : null
}

// 학급 만들기 (교사) — 이미 있는 코드는 거절 (보안 규칙에서도 한 번 더 막음)
export async function createClass(deps, { code, name, pw }) {
  const exist = await getClass(deps.db, code)
  if (exist) throw new Error('이미 사용 중인 학급코드예요. 다른 코드를 정해 주세요.')
  const pwHash = await sha256(pw)
  await deps.db.collection('geosangClasses').doc(code).set({
    name: name || `${code} 학급`,
    linkEnabled: false, // 기본은 꺼짐 (수업 안전 우선)
    pwHash,
    ownerUid: deps.me.uid,
    createdAt: Date.now(),
  })
  return getClass(deps.db, code)
}

// 학급 입장 (학생) — 코드 확인 후 내 프로필 저장
export async function joinClass(deps, { code, nickname }) {
  const cls = await getClass(deps.db, code)
  if (!cls) throw new Error('그런 학급코드가 없어요. 선생님께 확인해 보세요!')
  await deps.db.collection('geosangProfiles').doc(deps.me.uid).set({
    classCode: code,
    nickname,
    updatedAt: Date.now(),
  })
  return cls
}

// 게임이 끝나면 기록 저장:
//  - 최고 소지금은 더 잘했을 때만 갱신
//  - 도감은 여러 판에 걸쳐 "누적"으로 합쳐요 (진도 랭킹의 기준!)
export function saveRecord(deps, profile, { cash, titleName, codex }) {
  const ref = deps.db.collection('geosangRanking').doc(deps.me.uid)
  return deps.db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const prev = snap.exists ? snap.data() : {}
    const best = Math.max(prev.bestCash || 0, cash)
    const mergedCodex = { ...(prev.codex || {}), ...(codex || {}) }
    tx.set(ref, {
      classCode: profile.classCode,
      nickname: profile.nickname,
      bestCash: best,
      bestTitle: cash >= (prev.bestCash || 0) ? titleName : prev.bestTitle || titleName,
      games: (prev.games || 0) + 1,
      codex: mergedCodex,
      codexCount: Object.keys(mergedCodex).length,
      updatedAt: Date.now(),
    })
  })
}

// 우리 반 랭킹 — 도감(진도) 많이 모은 순 (문서 수가 적어 화면에서 정렬)
export async function fetchClassRanking(db, code) {
  const snap = await db.collection('geosangRanking').where('classCode', '==', code).get()
  const rows = []
  snap.forEach((d) => rows.push({ uid: d.id, ...d.data() }))
  rows.sort(
    (a, b) =>
      (b.codexCount || 0) - (a.codexCount || 0) ||
      (b.games || 0) - (a.games || 0) ||
      (b.bestCash || 0) - (a.bestCash || 0),
  )
  return rows.slice(0, 50)
}

// 전국 랭킹 — 도감(진도) 많이 모은 순 상위 50명
export async function fetchGlobalRanking(db) {
  const snap = await db.collection('geosangRanking').orderBy('codexCount', 'desc').limit(50).get()
  const rows = []
  snap.forEach((d) => rows.push({ uid: d.id, ...d.data() }))
  return rows
}

// ── 교사 관리 기능 (학급 주인 또는 총관리자만 성공) ──
export function setLinkEnabled(db, code, value) {
  return db.collection('geosangClasses').doc(code).update({ linkEnabled: !!value })
}
export function deleteRecord(db, uid) {
  return db.collection('geosangRanking').doc(uid).delete()
}
export function deleteClass(db, code) {
  return db.collection('geosangClasses').doc(code).delete()
}
