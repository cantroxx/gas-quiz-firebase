// RankingModal.jsx — 랭킹 창 (우리 반 / 전국 탭)
import { useEffect, useState } from 'react'
import { fetchClassRanking, fetchGlobalRanking } from '../online.js'

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
          <span className="here-emoji">🏆</span>
          <div>
            <p className="here-name">최고 부자 랭킹</p>
            <p className="here-sub">한 판이 끝나면 최고 소지금이 기록돼요</p>
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

        {rows === null && <p className="market-empty">랭킹을 불러오는 중…</p>}
        {rows && rows.length === 0 && <p className="market-empty">아직 기록이 없어요. 첫 기록의 주인공이 되어 보세요!</p>}
        {rows && rows.length > 0 && (
          <div className="rank-list">
            {rows.map((r, i) => (
              <div className={`rank-row ${profile && r.nickname === profile.nickname && r.classCode === profile.classCode ? 'me' : ''}`} key={r.uid}>
                <span className="rank-no">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
                <span className="rank-name">
                  {r.nickname}
                  {tab === 'global' && <small> · {r.classCode}</small>}
                </span>
                <span className="rank-title">{r.bestTitle || ''}</span>
                <span className="rank-cash">{(r.bestCash || 0).toLocaleString()}원</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
