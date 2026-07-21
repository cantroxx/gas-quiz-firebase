// ProductCard.jsx — 특산물 학습 카드
//  - 특산물을 누르면 뜨는 창: 왜 이 지역에서 유명한지(사회 교과 연계),
//    비싸게 팔리는 곳 TOP 3(경제 힌트), 더 알아보기 검색 링크.
import { REGIONS, REGION_BY_KEY, PRODUCTS, CATEGORY_HINTS } from '../data.js'
import { sellPrice, buyPrice } from '../gameLogic.js'

export default function ProductCard({ productId, game, linkAllowed, onClose }) {
  const p = PRODUCTS[productId]
  const home = REGION_BY_KEY[p.region]

  // 지금 게임 상황(뉴스 포함) 기준으로 어디서 제일 비싸게 팔리는지 계산
  const top3 = REGIONS
    .map((r) => ({ region: r, price: sellPrice(productId, r.key, game) }))
    .sort((a, b) => b.price - a.price)
    .slice(0, 3)

  const isNews = game.news?.id === productId

  const openSearch = () => {
    const q = encodeURIComponent(`${p.origin} ${p.name}`)
    window.open(`https://terms.naver.com/search.naver?query=${q}`, '_blank', 'noopener')
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="region-modal" onClick={(e) => e.stopPropagation()}>
        <div className="here-head">
          <span className="here-emoji">{p.emoji}</span>
          <div>
            <p className="here-name">{p.name}</p>
            <p className="here-sub">
              {home.emoji} {home.name} {p.origin} · {p.category} · 기준가 {p.basePrice.toLocaleString()}원
            </p>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="닫기">✕</button>
        </div>

        <p className="rm-title">🤔 왜 여기서 유명할까?</p>
        <p className="here-desc">{p.desc}</p>

        <p className="rm-title">💡 장사 꿀팁</p>
        <p className="pc-tip">{CATEGORY_HINTS[p.category]}</p>
        {isNews && (
          <p className="rm-quest">
            📢 오늘의 뉴스! 지금 {REGION_BY_KEY[game.news.region].name}에서 {p.name}을(를) 비싸게 사줘요!
          </p>
        )}

        <p className="rm-title">💰 지금 비싸게 팔리는 곳 TOP 3</p>
        <div className="pc-top3">
          {top3.map(({ region, price }, i) => (
            <div className="pc-top3-row" key={region.key}>
              <span className="pc-rank">{['🥇', '🥈', '🥉'][i]}</span>
              <span className="pc-region">{region.emoji} {region.name}</span>
              <span className="pc-price">{price.toLocaleString()}원</span>
            </div>
          ))}
        </div>
        <p className="rm-note">
          산지({home.key})에서 사면 {buyPrice(productId, null).toLocaleString()}원 —
          멀리 갈수록, 큰 도시일수록 비싸져요!
        </p>

        {linkAllowed && (
          <button className="upgrade-btn" onClick={openSearch}>
            🔎 백과사전에서 "{p.origin} {p.name}" 더 알아보기
          </button>
        )}
      </div>
    </div>
  )
}
