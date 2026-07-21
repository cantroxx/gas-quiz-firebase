// RankingModal.jsx — 진도(도감) 랭킹 창 (우리 반 / 전국 탭)
//  경쟁보다 학습 진도! 도감을 많이 모은 순서로 보여줍니다.
import { useEffect, useState } from 'react'
import { PRODUCTS } from '../data.js'
import { fetchClassRanking, fetchGlobalRanking } from '../online.js'

const TOTAL = Object.keys(PRODUCTS).length

export default function RankingModal({ deps, profile, onClose }) {
  const [tab, setTab] = useState(profile ? 'class' : 'global')
  const [rows, setRows] = useState(null) // null = 불러오는 중

  useEffect(() => {
    let alive = true
    setRows(null)
    const load =
      tab === 'class' && profile
        ? fetchClassRanking(deps.db, profile.classCode)
        : fetchGlobalRanking(deps.db)
    load
      .then((r) => alive && setRows(r))
      .catch(() => alive && setRows([]))
    return () => {
      alive = false
    }
  }, [tab, deps, profile])

  return (
    <div className="overlay" onClick={onClose}>
      <div className="region-modal" onClick={(e) => e.stopPropagation()}>
        <div className="here-head">
          <span className="here-emoji">📖</span>
          <div>
            <p className="here-name">특산물 도감 진도</p>
            <p className="here-sub">여러 판을 하면서 모은 도감이 쌓여요 (전체 {TOTAL}종)</p>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="닫기">✕</button>
        </div>

        <div className="rank-tabs">
          {profile && (
            <button className={`rank-tab ${tab === 'class' ? 'on' : ''}`} onClick={() => setTab('class')}>
              🏫 우리 반
            </button>
          )}
          <button className={`rank-tab ${tab === 'global' ? 'on' : ''}`} onClick={() => setTab('global')}>
            🌏 전국
          </button>
        </div>

        {rows === null && <p className="market-empty">진도를 불러오는 중…</p>}
        {rows && rows.length === 0 && <p className="market-empty">아직 기록이 없어요. 한 판 끝까지 해보면 도감이 기록돼요!</p>}
        {rows && rows.length > 0 && (
          <div className="rank-list">
            {rows.map((r, i) => {
              const n = r.codexCount || 0
              const pct = Math.min(100, Math.round((n / TOTAL) * 100))
              const isMe =
                profile && r.nickname === profile.nickname && r.classCode === profile.classCode
              return (
                <div className={`rank-row ${isMe ? 'me' : ''}`} key={r.uid}>
                  <span className="rank-no">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
                  <span className="rank-name">
                    {r.nickname}
                    {tab === 'global' && <small> · {r.classCode}</small>}
                    <span className="rank-bar">
                      <span className="rank-bar-fill" style={{ width: `${pct}%` }} />
                    </span>
                  </span>
                  <span className="rank-progress">📖 {n}/{TOTAL}</span>
                  <span className="rank-title">{r.bestTitle || ''}</span>
                  <span className="rank-games">{r.games || 0}판</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
