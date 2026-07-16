// ActionPanel.jsx — 현재 상황(phase)과 도착한 칸에 따라
// 알맞은 행동 버튼/화면을 보여줍니다.
import { CONFIG, PRODUCTS, PRODUCTS_BY_REGION } from '../data.js'
import {
  getBuyPrice,
  getSellPrice,
  estimateMarketRange,
  getStock,
  isBuyPriceUp,
} from '../gameLogic.js'

export default function ActionPanel({ state, actions }) {
  // 1) 준비 단계: 주사위 굴리기 (폭풍이면 쉬기)
  if (state.phase === 'ready') {
    if (state.skipNext) {
      return (
        <div className="panel">
          <h2>이번 턴</h2>
          <div className="event-box">
            <div className="event-title">🌀 폭풍!</div>
            <div className="event-text">폭풍 때문에 이번 턴은 쉬어요.</div>
          </div>
          <button className="btn btn-gray" onClick={actions.skipTurn}>
            다음 턴으로 넘어가기 ▶
          </button>
        </div>
      )
    }
    return (
      <div className="panel">
        <h2>내 차례</h2>
        <p style={{ marginTop: 0, color: '#616161' }}>
          주사위를 굴린 뒤, <b>나온 숫자 이하</b>에서 원하는 칸만큼 이동할 수 있어요.
        </p>
        <button className="btn btn-primary" onClick={actions.roll}>
          🎲 주사위 굴리기
        </button>
      </div>
    )
  }

  // 2) 이동 칸 선택
  if (state.phase === 'choose') {
    return (
      <div className="panel">
        <h2>몇 칸 이동할까요?</h2>
        <p style={{ marginTop: 0, color: '#616161' }}>
          🎲 <b>{state.dice}</b> 이 나왔어요. 1 ~ {state.dice} 칸 중에서 골라요.
        </p>
        <div className="move-options">
          {state.moveOptions.map((n) => (
            <button key={n} className="btn btn-green" onClick={() => actions.move(n)}>
              {n}칸
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 3) 도착 후 행동
  if (state.phase === 'action') {
    return (
      <div className="panel">
        {state.activeSource && <SourceView state={state} actions={actions} />}
        {state.activeMarket && <MarketView state={state} actions={actions} />}
        {state.pendingQuiz && <QuizView state={state} actions={actions} />}
        {!state.pendingQuiz && state.activeEvent && (
          <EventView event={state.activeEvent} />
        )}

        {/* 퀴즈 진행 중이 아니면 턴 종료 버튼 */}
        {!state.pendingQuiz && (
          <button className="btn btn-gray" onClick={actions.endTurn} style={{ marginTop: 12 }}>
            턴 종료 ▶
          </button>
        )}
      </div>
    )
  }

  return null
}

// ── 산지: 매입 화면 ─────────────────────────────
function SourceView({ state, actions }) {
  const region = state.activeSource.region
  const ids = state.activeSource.productIds || []
  const full = state.cargo.length >= CONFIG.cargoLimit

  return (
    <>
      <h2>
        🌱 {region} 산지 — 매입
      </h2>
      <div className="compare">
        여기서 <b>산지가</b>로 싸게 사서, <b>시장</b>에서 비싸게 팔면 이윤이 남아요!
        <div style={{ marginTop: 4, fontSize: 13 }}>
          🔎 많이 사면 <b>재고가 줄어</b> 값이 올라가요(📈). 재고는 매 턴 다시 채워져요.
        </div>
        {full && <div style={{ color: '#c62828', marginTop: 6 }}>🎒 짐칸이 가득 찼어요.</div>}
      </div>
      <div className="item-list">
        {ids.map((id) => {
          const p = PRODUCTS[id]
          const buy = getBuyPrice(state, id)
          const range = estimateMarketRange(id)
          const stock = getStock(state, id)
          const soldOut = stock <= 0
          const priceUp = isBuyPriceUp(state, id)
          const cannotAfford = state.cash < buy
          return (
            <div key={id} className="item-row">
              <div className="item-info">
                <span className="item-name">
                  {p.emoji} {p.name}{' '}
                  <span className={`stock-tag${stock <= 2 ? ' low' : ''}`}>
                    재고 {stock}/{CONFIG.baseStock}
                  </span>
                </span>
                <span className="item-price">
                  산지가 {buy.toLocaleString()}원 {priceUp && <b className="up">📈</b>} · 예상 시장가{' '}
                  {range.low.toLocaleString()}~{range.high.toLocaleString()}원
                </span>
              </div>
              <button
                className="btn btn-green"
                disabled={full || cannotAfford || soldOut}
                onClick={() => actions.buy(id)}
              >
                {soldOut ? '품절' : '매입'}
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── 시장/큰장: 판매 화면 ────────────────────────
function MarketView({ state, actions }) {
  const isBig = state.activeMarket.isBig
  const mult = state.activeMarket.multiplier

  return (
    <>
      <h2>
        {isBig ? '🎪 큰장 — 판매' : '🏪 시장 — 판매'}
      </h2>
      <div className="compare">
        오늘 시장 배수는 <b>×{mult}</b> {isBig && '(큰장은 더 비싸게 팔려요!)'} · 산 가격보다
        비싸면 이윤이 남아요.
        <div style={{ marginTop: 4, fontSize: 13 }}>
          🔎 같은 특산물을 <b>많이 팔면</b> 값이 내려가요(📉). 종류를 나눠 파는 게 유리해요!
        </div>
      </div>

      {state.cargo.length === 0 ? (
        <p style={{ color: '#616161' }}>팔 특산물이 없어요. 산지에서 먼저 매입해 보세요.</p>
      ) : (
        <>
          <div className="item-list">
            {state.cargo.map((item, i) => {
              const p = PRODUCTS[item.productId]
              const sell = getSellPrice(state, item.productId)
              const profit = sell - item.buyPrice
              const plus = profit >= 0
              const glutted = ((state.glut && state.glut[item.productId]) || 0) > 0
              return (
                <div key={i} className="item-row">
                  <div className="item-info">
                    <span className="item-name">
                      {p.emoji} {p.name}
                    </span>
                    <span className="item-price">
                      산 값 {item.buyPrice.toLocaleString()}원 → 판매가{' '}
                      {sell.toLocaleString()}원 {glutted && <b className="down">📉</b>}{' '}
                      <b className={plus ? 'profit-plus' : 'profit-minus'}>
                        (이윤 {plus ? '+' : ''}
                        {profit.toLocaleString()}원)
                      </b>
                    </span>
                  </div>
                  <button className="btn btn-primary" onClick={() => actions.sell(i)}>
                    판매
                  </button>
                </div>
              )
            })}
          </div>
          <button
            className="btn btn-primary"
            onClick={actions.sellAll}
            style={{ marginTop: 10 }}
          >
            💰 전부 팔기
          </button>
        </>
      )}
    </>
  )
}

// ── 황금열쇠/코너 이벤트 안내 ───────────────────
function EventView({ event }) {
  return (
    <div className="event-box">
      <div className="event-title">{event.title}</div>
      <div className="event-text">{event.text || event.resultText}</div>
    </div>
  )
}

// ── 퀴즈 화면 ──────────────────────────────────
function QuizView({ state, actions }) {
  const q = state.pendingQuiz
  return (
    <>
      <h2>🔑 특산물 퀴즈!</h2>
      <div className="event-box">
        <div className="event-text" style={{ fontSize: 18 }}>
          {q.question}
        </div>
      </div>
      <div className="quiz-options">
        {q.options.map((opt, i) => (
          <button key={i} className="btn btn-purple" onClick={() => actions.answerQuiz(i)}>
            {opt}
          </button>
        ))}
      </div>
      <p className="hint">정답을 맞히면 보너스 +{q.reward.toLocaleString()}원!</p>
    </>
  )
}
