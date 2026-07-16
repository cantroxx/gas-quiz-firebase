// PlayerInfo.jsx — 내 정보 카드: 현금 / 짐칸 / 남은 턴 + 활성 효과
import { CONFIG, PRODUCTS } from '../data.js'

export default function PlayerInfo({ state }) {
  const cargoCount = state.cargo.length
  const surge = Object.keys(state.surgeProducts)
  const harvest = Object.keys(state.harvestRegions)

  return (
    <div className="panel">
      <h2>내 정보</h2>
      <div className="stats">
        <div className="stat cash">
          <div className="label">현금</div>
          <div className="value">{state.cash.toLocaleString()}원</div>
        </div>
        <div className="stat">
          <div className="label">목표까지</div>
          <div className="value">
            {Math.max(0, CONFIG.goal - state.cash).toLocaleString()}원
          </div>
        </div>
        <div className="stat">
          <div className="label">남은 턴</div>
          <div className="value">{Math.max(0, CONFIG.maxTurns - state.turn + 1)}</div>
        </div>
        <div className="stat">
          <div className="label">짐칸</div>
          <div className="value">
            {cargoCount} / {CONFIG.cargoLimit}
          </div>
        </div>
      </div>

      {/* 짐칸 슬롯 시각화 */}
      <div className="cargo-bar">
        <div className="label" style={{ color: '#8d6e63' }}>
          🎒 짐칸에 실은 특산물
        </div>
        <div className="cargo-slots">
          {Array.from({ length: CONFIG.cargoLimit }).map((_, i) => {
            const item = state.cargo[i]
            return (
              <div key={i} className={`slot${item ? ' filled' : ''}`}>
                {item ? PRODUCTS[item.productId].emoji : ''}
              </div>
            )
          })}
        </div>
      </div>

      {/* 활성 효과 뱃지 */}
      {(surge.length > 0 || harvest.length > 0) && (
        <div className="badges">
          {surge.map((pid) => (
            <span key={pid} className="badge surge">
              🔥 {pid} 판매가 2배
            </span>
          ))}
          {harvest.map((region) => (
            <span key={region} className="badge harvest">
              🌧️ {region} 매입가↑
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
