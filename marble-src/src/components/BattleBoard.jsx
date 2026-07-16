// BattleBoard.jsx — 대전용 게임판 (두 플레이어의 말을 함께 표시)
import { BOARD, CELL_COLORS, PRODUCTS } from '../data.js'
import { TURNS_PER_PLAYER } from '../battleLogic.js'

const CORNER_COLORS = {
  start: '#ef5350',
  bigmarket: '#ffca28',
  storm: '#42a5f5',
  festival: '#ec407a',
}
const TOKENS = ['🧑‍🌾', '🤖'] // 플레이어0, 플레이어1

function cellColor(cell) {
  if (cell.type === 'corner') return CORNER_COLORS[cell.subtype] || CELL_COLORS.corner
  return CELL_COLORS[cell.type]
}

export default function BattleBoard({ state }) {
  return (
    <div className="board">
      {BOARD.map((cell, i) => {
        const src = cell.type === 'source' ? state.sources && state.sources[i] : null
        const srcIds = src ? src.productIds : []
        const here = state.players.map((p, idx) => (p.position === i ? idx : -1)).filter((x) => x >= 0)
        return (
          <div
            key={i}
            className="cell"
            style={{ gridRow: cell.grid[0], gridColumn: cell.grid[1], background: cellColor(cell) }}
          >
            {here.length > 0 && (
              <span className="token">{here.map((idx) => TOKENS[idx]).join('')}</span>
            )}
            <span className="cell-emoji">
              {cell.type === 'source' ? srcIds.map((id) => PRODUCTS[id].emoji).join('') : cell.emoji || ''}
            </span>
            <span className="cell-name">
              {cell.type === 'source' ? `${src ? src.region : cell.region} 산지` : cell.name}
            </span>
            {cell.type === 'source' && (
              <span className="cell-sub">{srcIds.map((id) => PRODUCTS[id].name).join('·')}</span>
            )}
          </div>
        )
      })}

      <div className="board-center">
        <div className="turn-badge">
          {Math.ceil(state.turnNo / 2)} / {TURNS_PER_PLAYER} 턴
        </div>
        <div className="big-dice">{state.dice ? diceFace(state.dice) : '🎲'}</div>
        <div className="goal">🎯 {(10000).toLocaleString()}원</div>
      </div>
    </div>
  )
}

function diceFace(n) {
  return ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][n] || '🎲'
}
