// Board.jsx — 20칸 게임판을 6×6 격자로 그립니다.
// 가운데에는 목표 자금 / 주사위 / 남은 턴을 크게 보여줍니다.
import { useState } from 'react'
import { BOARD, CELL_COLORS, PRODUCTS, MARKET_TYPE_BY_KEY } from '../data.js'
import { CONFIG } from '../data.js'
import CellInfoModal from './CellInfo.jsx'

// 코너 칸 색은 종류별로 다르게
const CORNER_COLORS = {
  start: '#ef5350',
  bigmarket: '#ffca28',
  storm: '#42a5f5',
  festival: '#ec407a',
}

function cellColor(cell) {
  if (cell.type === 'corner') return CORNER_COLORS[cell.subtype] || CELL_COLORS.corner
  return CELL_COLORS[cell.type]
}

export default function Board({ state }) {
  const [infoIdx, setInfoIdx] = useState(null) // 클릭한 칸 설명 카드

  return (
    <div className="board">
      {BOARD.map((cell, i) => {
        const isCurrent = state.position === i
        // 산지 칸은 이 판에 배정된 지역/특산물, 시장 칸은 배정된 시장 종류를 표시
        const src = cell.type === 'source' ? (state.sources && state.sources[i]) : null
        const srcRegion = src ? src.region : cell.region
        const srcIds = src ? src.productIds : []
        const mt = cell.type === 'market' ? MARKET_TYPE_BY_KEY[(state.markets && state.markets[i]) || 'direct'] : null
        return (
          <div
            key={i}
            className={`cell clickable${isCurrent ? ' current' : ''}`}
            onClick={() => setInfoIdx(i)}
            title="눌러서 설명 보기"
            style={{
              gridRow: cell.grid[0],
              gridColumn: cell.grid[1],
              background: cellColor(cell),
            }}
          >
            {isCurrent && <span className="token">🧑‍🌾</span>}
            <span className="cell-emoji">
              {cell.type === 'source'
                ? srcIds.map((id) => PRODUCTS[id].emoji).join('')
                : mt
                  ? mt.emoji
                  : cell.emoji || ''}
            </span>
            <span className="cell-name">
              {cell.type === 'source' ? `${srcRegion} 산지` : mt ? mt.name : cell.name}
            </span>
            {cell.type === 'source' && (
              <span className="cell-sub">{srcIds.map((id) => PRODUCTS[id].name).join('·')}</span>
            )}
          </div>
        )
      })}

      {infoIdx != null && (
        <CellInfoModal index={infoIdx} state={state} onClose={() => setInfoIdx(null)} />
      )}

      {/* 가운데 안내 패널 */}
      <div className="board-center">
        <div className="goal">🎯 목표 {CONFIG.goal.toLocaleString()}원</div>
        <div className="big-dice">{state.dice ? diceFace(state.dice) : '🎲'}</div>
        <div className="turn-badge">
          {state.turn > CONFIG.maxTurns ? CONFIG.maxTurns : state.turn} / {CONFIG.maxTurns} 턴
        </div>
      </div>
    </div>
  )
}

function diceFace(n) {
  return ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][n] || '🎲'
}
