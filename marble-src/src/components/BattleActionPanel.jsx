// BattleActionPanel.jsx — 대전에서 "지금 차례인 사람"의 행동 화면
import { CONFIG, PRODUCTS } from '../data.js'
import { getBuyPrice, getSellPrice, getStock, isBuyPriceUp } from '../gameLogic.js'
import { estimateMarketRange } from '../gameLogic.js'

export default function BattleActionPanel({ state, actions }) {
  const me = state.players[state.current]

  if (state.phase === 'ready') {
    if (me.skipNext) {
      return (
        <div className="panel">
          <div className="event-box">
            <div className="event-title">🌀 폭풍!</div>
            <div className="event-text">이번 차례는 쉬어요.</div>
          </div>
          <button className="btn btn-gray" onClick={actions.skipTurn}>
            넘어가기 ▶
          </button>
        </div>
      )
    }
    return (
      <div className="panel">
        <h2>{me.name} 차례</h2>
        <button className="btn btn-primary" onClick={actions.roll}>
          🎲 주사위 굴리기
        </button>
      </div>
    )
  }

  if (state.phase === 'choose') {
    return (
      <div className="panel">
        <h2>몇 칸 이동할까요?</h2>
        <p style={{ marginTop: 0, color: '#616161' }}>
          🎲 <b>{state.dice}</b> · 1~{state.dice}칸 중 선택
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

  if (state.phase === 'action') {
    return (
      <div className="panel">
        {state.activeSource && <BuyView state={state} me={me} actions={actions} />}
        {state.activeMarket && <SellView state={state} me={me} actions={actions} />}
        {state.pendingQuiz && <QuizView state={state} actions={actions} />}
        {!state.pendingQuiz && state.activeEvent && (
          <div className="event-box">
            <div className="event-title">{state.activeEvent.title}</div>
            <div className="event-text">{state.activeEvent.text || state.activeEvent.resultText}</div>
          </div>
        )}
        {!state.pendingQuiz && (
          <button className="btn btn-gray" style={{ marginTop: 12 }} onClick={actions.endTurn}>
            턴 종료 ▶
          </button>
        )}
      </div>
    )
  }
  return null
}

function BuyView({ state, me, actions }) {
  const region = state.activeSource.region
  const ids = state.activeSource.productIds || []
  const full = me.cargo.length >= CONFIG.cargoLimit
  return (
    <>
      <h2>🌱 {region} 산지 — 매입</h2>
      <div className="compare">많이 사면 재고↓·값↑(📈). 상대와 시장을 나눠 쓰니 눈치싸움!</div>
      <div className="item-list">
        {ids.map((id) => {
          const p = PRODUCTS[id]
          const buy = getBuyPrice(state, id)
          const stock = getStock(state, id)
          const range = estimateMarketRange(id)
          return (
            <div key={id} className="item-row">
              <div className="item-info">
                <span className="item-name">
                  {p.emoji} {p.name}{' '}
                  <span className={`stock-tag${stock <= 2 ? ' low' : ''}`}>재고 {stock}</span>
                </span>
                <span className="item-price">
                  산지가 {buy.toLocaleString()}원 {isBuyPriceUp(state, id) && <b className="up">📈</b>} · 시장 약{' '}
                  {range.low.toLocaleString()}~{range.high.toLocaleString()}원
                </span>
              </div>
              <button
                className="btn btn-green"
                disabled={full || me.cash < buy || stock <= 0}
                onClick={() => actions.buy(id)}
              >
                {stock <= 0 ? '품절' : '매입'}
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}

function SellView({ state, me, actions }) {
  const mult = state.activeMarket.multiplier
  const isBig = state.activeMarket.isBig
  return (
    <>
      <h2>{isBig ? '🎪 큰장 — 판매' : '🏪 시장 — 판매'}</h2>
      <div className="compare">시장 배수 ×{mult}. 같은 걸 많이 팔면 값↓(📉)</div>
      {me.cargo.length === 0 ? (
        <p style={{ color: '#616161' }}>팔 특산물이 없어요.</p>
      ) : (
        <>
          <div className="item-list">
            {me.cargo.map((item, i) => {
              const p = PRODUCTS[item.productId]
              const sell = getSellPrice(state, item.productId)
              const profit = sell - item.buyPrice
              return (
                <div key={i} className="item-row">
                  <div className="item-info">
                    <span className="item-name">
                      {p.emoji} {p.name}
                    </span>
                    <span className="item-price">
                      산 값 {item.buyPrice.toLocaleString()} → {sell.toLocaleString()}원{' '}
                      <b className={profit >= 0 ? 'profit-plus' : 'profit-minus'}>
                        ({profit >= 0 ? '+' : ''}
                        {profit.toLocaleString()})
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
          <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={actions.sellAll}>
            💰 전부 팔기
          </button>
        </>
      )}
    </>
  )
}

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
      <p className="hint">정답 시 +{q.reward.toLocaleString()}원</p>
    </>
  )
}
