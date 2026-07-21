// RegionPreview.jsx — 지역을 눌렀을 때 뜨는 정보 창
//  - 그 지역의 특산물·시세, 내 물건의 예상 판매가, 가는 길(며칠·여비)을 보여주고
//  - [이동하기]를 눌러야 실제로 이동합니다 (실수로 하루를 날리지 않게!)
import { REGION_BY_KEY, PRODUCTS, PRODUCTS_BY_REGION, CONFIG } from '../data.js'
import { travelPlan, buyPrice, sellPrice } from '../gameLogic.js'

export default function RegionPreview({ regionKey, game, onTravel, onClose }) {
  const region = REGION_BY_KEY[regionKey]
  const isHere = game.pos === regionKey
  const plan = isHere ? null : travelPlan(game.pos, regionKey)
  const remain = CONFIG.maxDays - game.day
  const products = PRODUCTS_BY_REGION[regionKey] || []
  const bagItems = Object.entries(game.bag)
  const questProduct = PRODUCTS[game.quest.id]
  const isQuestOrigin = questProduct.region === regionKey
  const isQuestDest = game.quest.to === regionKey

  const noDays = plan && plan.days > remain
  const noCash = plan && game.cash < plan.cost

  return (
    <div className="overlay" onClick={onClose}>
      <div className="region-modal" onClick={(e) => e.stopPropagation()}>
        <div className="here-head">
          <span className="here-emoji">{region.emoji}</span>
          <div>
            <p className="here-name">{region.name}</p>
            <p className="here-sub">{isHere ? '지금 내가 있는 곳이에요' : `내 위치에서 ${plan ? plan.days : '?'}일 거리`}</p>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <p className="here-desc">{region.desc}</p>
        {region.marketBonus > 1 && (
          <p className="rm-bonus">🏙️ 큰 도시라 물건이 {region.marketBonus}배 비싸게 팔려요!</p>
        )}
        {isQuestOrigin && (
          <p className="rm-quest">🛒 퀘스트 물품 {questProduct.emoji} {questProduct.name}을(를) 여기서 살 수 있어요!</p>
        )}
        {isQuestDest && (
          <p className="rm-quest">📦 퀘스트 배달 도착지가 바로 여기예요!</p>
        )}

        <p className="rm-title">🏪 이곳의 특산물</p>
        {products.length === 0 ? (
          <p className="market-empty">특산물이 나지 않는 소비 도시예요.</p>
        ) : (
          <div className="rm-products">
            {products.map((id) => {
              const p = PRODUCTS[id]
              return (
                <span className="rm-chip" key={id}>
                  {p.emoji} {p.name} 약 {buyPrice(id, isHere ? game : null).toLocaleString()}원
                </span>
              )
            })}
          </div>
        )}

        {!isHere && bagItems.length > 0 && (
          <>
            <p className="rm-title">🎒 내 물건, 여기서 팔면?</p>
            <div className="rm-products">
              {bagItems.map(([id, item]) => {
                const p = PRODUCTS[id]
                const price = sellPrice(id, regionKey, game) // 오늘의 뉴스까지 반영한 예상가
                const gain = price - Math.round(item.paid / item.count)
                return (
                  <span className={`rm-chip ${gain >= 0 ? 'gain' : 'loss'}`} key={id}>
                    {p.emoji} {p.name} {price.toLocaleString()}원 ({gain >= 0 ? '+' : ''}{gain.toLocaleString()})
                  </span>
                )
              })}
            </div>
            <p className="rm-note">축제 같은 이벤트는 도착해 봐야 알 수 있어요!</p>
          </>
        )}

        {!isHere && plan && (
          <>
            <p className="rm-title">🧭 가는 길</p>
            <p className="rm-path">
              {plan.path.join(' → ')}
              {plan.hasSea && ' 🚢'}
            </p>
            <button
              className="deliver-btn go"
              disabled={noDays || noCash || game.over}
              onClick={() => onTravel(regionKey)}
            >
              {noDays
                ? `남은 날(${remain}일)이 모자라요`
                : noCash
                  ? `여비 ${plan.cost.toLocaleString()}원이 모자라요`
                  : `${plan.hasSea ? '🚢' : '🛞'} 이동하기 — ${plan.days}일, 여비 ${plan.cost.toLocaleString()}원`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
