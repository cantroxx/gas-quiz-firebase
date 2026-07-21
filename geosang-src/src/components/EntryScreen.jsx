// EntryScreen.jsx — 시작 화면 (학급 입장 / 손님 / 교사용)
//  - 학생: 학급코드 + 닉네임만 입력하면 입장 (비밀번호 없음)
//  - 손님: 저장·랭킹 없이 바로 놀기 (로컬 개발에서는 이것만 가능)
//  - 교사: 학급 만들기(코드+이름+관리 비밀번호), 학급 관리(링크 스위치·기록 삭제)
import { useState } from 'react'
import {
  createClass,
  joinClass,
  getClass,
  sha256,
  setLinkEnabled,
  fetchClassRanking,
  deleteRecord,
  deleteClass,
} from '../online.js'

export default function EntryScreen({ deps, onGuest, onLogin }) {
  const [view, setView] = useState('menu') // menu | join | create | manage
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const online = !!deps

  // 입력값들
  const [code, setCode] = useState(localStorage.getItem('geosang_code') || '')
  const [nick, setNick] = useState(localStorage.getItem('geosang_nick') || '')
  const [clsName, setClsName] = useState('')
  const [pw, setPw] = useState('')

  // 교사 관리 패널 상태
  const [managed, setManaged] = useState(null) // { cls, rows }

  const run = async (fn) => {
    setBusy(true)
    setMsg('')
    try {
      await fn()
    } catch (e) {
      setMsg(e.message || '앗, 문제가 생겼어요. 다시 해 보세요.')
    }
    setBusy(false)
  }

  const doJoin = () =>
    run(async () => {
      const c = code.trim()
      const n = nick.trim()
      if (!c) throw new Error('학급코드를 입력해 주세요.')
      if (!n || n.length > 12) throw new Error('닉네임은 1~12글자로 지어 주세요.')
      const cls = await joinClass(deps, { code: c, nickname: n })
      localStorage.setItem('geosang_code', c)
      localStorage.setItem('geosang_nick', n)
      onLogin(cls, { classCode: c, nickname: n })
    })

  const doCreate = () =>
    run(async () => {
      const c = code.trim()
      if (!/^[A-Za-z0-9가-힣]{2,12}$/.test(c)) throw new Error('학급코드는 2~12글자(한글·영어·숫자)로 정해 주세요.')
      if (pw.length < 4) throw new Error('관리 비밀번호는 4글자 이상으로 해 주세요.')
      await createClass(deps, { code: c, name: clsName.trim(), pw })
      setMsg(`✅ 학급 "${c}"를 만들었어요! 학생들에게 이 코드를 알려 주세요.`)
    })

  const doManage = () =>
    run(async () => {
      const c = code.trim()
      const cls = await getClass(deps.db, c)
      if (!cls) throw new Error('그런 학급코드가 없어요.')
      const hash = await sha256(pw)
      if (hash !== cls.pwHash && !deps.admin) throw new Error('관리 비밀번호가 달라요.')
      const rows = await fetchClassRanking(deps.db, c)
      setManaged({ cls, rows })
    })

  const refreshManaged = async () => {
    const cls = await getClass(deps.db, managed.cls.code)
    const rows = await fetchClassRanking(deps.db, managed.cls.code)
    setManaged({ cls, rows })
  }

  const toggleLink = () =>
    run(async () => {
      await setLinkEnabled(deps.db, managed.cls.code, !managed.cls.linkEnabled)
      await refreshManaged()
    })

  const removeRecord = (uid) =>
    run(async () => {
      await deleteRecord(deps.db, uid)
      await refreshManaged()
    })

  const removeClass = () =>
    run(async () => {
      await deleteClass(deps.db, managed.cls.code)
      setManaged(null)
      setView('menu')
      setMsg('학급을 삭제했어요.')
    })

  // ── 교사 관리 패널 ──
  if (managed) {
    return (
      <div className="entry">
        <div className="entry-card wide">
          <p className="entry-title">🧑‍🏫 {managed.cls.name} ({managed.cls.code}) 관리</p>
          <button className="upgrade-btn" disabled={busy} onClick={toggleLink}>
            🔎 백과사전 링크: {managed.cls.linkEnabled ? '켜짐 ✅ (누르면 끄기)' : '꺼짐 ⛔ (누르면 켜기)'}
          </button>
          <p className="rm-title">🏆 우리 반 기록 ({managed.rows.length}명)</p>
          {managed.rows.length === 0 && <p className="market-empty">아직 기록이 없어요.</p>}
          <div className="rank-list">
            {managed.rows.map((r, i) => (
              <div className="rank-row" key={r.uid}>
                <span className="rank-no">{i + 1}</span>
                <span className="rank-name">{r.nickname}</span>
                <span className="rank-cash">{(r.bestCash || 0).toLocaleString()}원</span>
                <button className="mini-del" disabled={busy} onClick={() => removeRecord(r.uid)}>삭제</button>
              </div>
            ))}
          </div>
          {(deps.admin || managed.cls.ownerUid === deps.me.uid) && (
            <button className="mini-del wide-del" disabled={busy} onClick={removeClass}>
              🗑️ 학급 통째로 삭제
            </button>
          )}
          {msg && <p className="entry-msg">{msg}</p>}
          <button className="restart-btn" onClick={() => { setManaged(null); setView('menu') }}>← 돌아가기</button>
        </div>
      </div>
    )
  }

  return (
    <div className="entry">
      <div className="entry-card">
        <p className="entry-logo">🛞</p>
        <p className="entry-title">팔도 특산물 대상인</p>
        <p className="entry-sub">전국을 누비며 특산물로 돈을 벌어 보자!</p>

        {view === 'menu' && (
          <div className="entry-btns">
            <button className="deliver-btn go" disabled={!online} onClick={() => setView('join')}>
              🏫 학급코드로 입장 (랭킹 저장)
            </button>
            <button className="upgrade-btn" onClick={onGuest}>
              🙋 손님으로 놀기 (저장 없음)
            </button>
            <button className="entry-teacher" disabled={!online} onClick={() => setView('create')}>
              🧑‍🏫 교사용: 학급 만들기
            </button>
            <button className="entry-teacher" disabled={!online} onClick={() => setView('manage')}>
              🧑‍🏫 교사용: 학급 관리
            </button>
            {!online && <p className="entry-msg">지금은 오프라인(연습) 모드예요 — 손님으로만 놀 수 있어요.</p>}
          </div>
        )}

        {view === 'join' && (
          <div className="entry-btns">
            <input className="entry-input" placeholder="학급코드 (선생님이 알려줘요)" value={code} onChange={(e) => setCode(e.target.value)} />
            <input className="entry-input" placeholder="내 닉네임 (12글자까지)" maxLength={12} value={nick} onChange={(e) => setNick(e.target.value)} />
            <button className="deliver-btn go" disabled={busy} onClick={doJoin}>입장하기!</button>
            <button className="entry-teacher" onClick={() => setView('menu')}>← 뒤로</button>
          </div>
        )}

        {view === 'create' && (
          <div className="entry-btns">
            <input className="entry-input" placeholder="새 학급코드 (2~12글자, 예: 동주4반)" value={code} onChange={(e) => setCode(e.target.value)} />
            <input className="entry-input" placeholder="학급 이름 (예: 동주초 4학년 8반)" value={clsName} onChange={(e) => setClsName(e.target.value)} />
            <input className="entry-input" type="password" placeholder="관리 비밀번호 (4글자 이상)" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button className="deliver-btn go" disabled={busy} onClick={doCreate}>학급 만들기</button>
            <p className="entry-note">⚠️ 학급 관리(링크 켜기, 기록 삭제)는 학급을 만든 이 기기·브라우저에서 할 수 있어요. (퀴즈타운 관리자로 로그인하면 어디서든 가능)</p>
            <button className="entry-teacher" onClick={() => setView('menu')}>← 뒤로</button>
          </div>
        )}

        {view === 'manage' && (
          <div className="entry-btns">
            <input className="entry-input" placeholder="학급코드" value={code} onChange={(e) => setCode(e.target.value)} />
            <input className="entry-input" type="password" placeholder="관리 비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button className="deliver-btn go" disabled={busy} onClick={doManage}>관리 화면 열기</button>
            <button className="entry-teacher" onClick={() => setView('menu')}>← 뒤로</button>
          </div>
        )}

        {msg && view !== 'menu' && <p className="entry-msg">{msg}</p>}
      </div>
    </div>
  )
}
