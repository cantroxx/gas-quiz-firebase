// App.jsx — 팔도 특산물 대상인
// 흐름: 시작 화면(학급 입장/손님/교사용) → 게임 화면
// 게임 화면: 위 상태 막대 / 왼쪽 지도(지역 클릭→정보 창→이동) / 오른쪽 (지역·뉴스·퀘스트·시장·수레·기록)
import { useEffect, useReducer, useRef, useState } from 'react'
import TravelMap from './components/TravelMap.jsx'
import RegionPreview from './components/RegionPreview.jsx'
import ProductCard from './components/ProductCard.jsx'
import EntryScreen from './components/EntryScreen.jsx'
import RankingModal from './components/RankingModal.jsx'
import { firebaseReady, prepare, saveRecord, fetchMyRecord } from './online.js'
import {
  REGIONS,
  REGION_BY_KEY,
  PRODUCTS,
  PRODUCTS_BY_REGION,
  CARTS,
  TITLES,
  CONFIG,
} from './data.js'
import { initGame, reducer, buyPrice, sellPrice, bagCount, loadSavedGame } from './gameLogic.js'

export default function App() {
  // 저장된 판이 있으면 이어서, 없으면 새로 시작
  const [game, dispatch] = useReducer(reducer, undefined, () => loadSavedGame() || initGame())
  const [showCodex, setShowCodex] = useState(false)
  const [showRanking, setShowRanking] = useState(false)
  const [selected, setSelected] = useState(null) // 지도에서 누른 지역
  const [infoProduct, setInfoProduct] = useState(null) // 학습 카드를 볼 특산물

  // ── 온라인(학급) 상태 ──
  const [stage, setStage] = useState('entry') // 'entry' | 'game'
  const [deps, setDeps] = useState(null) // { db, me, admin } — 오프라인이면 null
  const [session, setSession] = useState(null) // { cls, profile } — 손님이면 null
  const [saved, setSaved] = useState(false) // 이번 판 기록을 저장했는지
  const savedRef = useRef(false)

  useEffect(() => {
    if (firebaseReady()) {
      prepare().then(setDeps).catch(() => setDeps(null))
    }
  }, [])

  // 이어하기: 판이 바뀔 때마다 기기에 저장 (끝나면 지움)
  useEffect(() => {
    try {
      if (game.over) localStorage.removeItem('geosang_save')
      else localStorage.setItem('geosang_save', JSON.stringify(game))
    } catch (e) {
      /* 저장 공간이 없어도 게임은 계속 */
    }
  }, [game])

  // 누적 도감 (학급으로 들어왔을 때만, 랭킹 문서에서)
  const [cumCodex, setCumCodex] = useState(null)
  useEffect(() => {
    if (deps && session) {
      fetchMyRecord(deps.db, deps.me.uid)
        .then((rec) => setCumCodex(rec?.codex || {}))
        .catch(() => setCumCodex(null))
    } else {
      setCumCodex(null)
    }
  }, [deps, session, saved])

  const here = REGION_BY_KEY[game.pos]
  const visitedCount = Object.keys(game.visited).length
  const cart = CARTS[game.cartLevel]
  const nextCart = CARTS[game.cartLevel + 1]
  const inBag = bagCount(game.bag)
  const codexCount = Object.keys(game.codex).length
  const totalProducts = Object.keys(PRODUCTS).length

  const hereProducts = PRODUCTS_BY_REGION[game.pos] || []
  const bagItems = Object.entries(game.bag)
  const quest = game.quest
  const questProduct = PRODUCTS[quest.id]
  const questOrigin = REGION_BY_KEY[questProduct.region]
  const canDeliver =
    game.pos === quest.to && (game.bag[quest.id]?.count || 0) >= quest.qty

  // 여비도 없고 팔 물건도 없으면 더 진행할 수 없어요 (파산)
  const bankrupt = !game.over && inBag === 0 && game.cash < CONFIG.landCost

  // 백과사전 링크: 학급으로 들어왔으면 학급 설정, 손님이면 data.js 스위치
  const linkAllowed = session ? !!session.cls.linkEnabled : CONFIG.searchLinkEnabled

  const profit = game.cash - CONFIG.startCash
  const title = TITLES.find((t) => game.cash >= t.min) || TITLES[TITLES.length - 1]

  // 게임이 끝나면 랭킹에 기록 (학급으로 들어온 경우, 판마다 한 번만)
  useEffect(() => {
    const ended = game.over || bankrupt
    if (!ended) {
      savedRef.current = false
      setSaved(false)
      return
    }
    if (savedRef.current || !deps || !session) return
    savedRef.current = true
    saveRecord(deps, session.profile, {
      cash: game.cash,
      titleName: `${title.emoji} ${title.name}`,
      codex: game.codex,
    })
      .then(() => setSaved(true))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.over, bankrupt])

  const travel = (key) => {
    dispatch({ type: 'TRAVEL', to: key })
    setSelected(null)
  }

  // ── 시작 화면 ──
  if (stage === 'entry') {
    return (
      <EntryScreen
        deps={deps}
        onGuest={() => {
          setSession(null)
          setStage('game')
        }}
        onLogin={(cls, profile) => {
          setSession({ cls, profile })
          setStage('game')
        }}
      />
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>🛞 팔도 특산물 대상인</h1>
        <div className="stats">
          <span className="stat cash">💰 {game.cash.toLocaleString()}원</span>
          <span className="stat day">📅 {game.day}일째 / {CONFIG.maxDays}일</span>
          <span className="stat">{cart.emoji} {inBag}/{cart.cap}칸</span>
          <button className="stat codex-btn" onClick={() => setShowCodex(true)}>
            📖 도감 {codexCount}/{totalProducts}
          </button>
          {deps && (
            <button className="stat codex-btn" onClick={() => setShowRanking(true)}>
              🏆 랭킹
            </button>
          )}
          <button
            className="stat codex-btn"
            title="처음부터 다시 시작"
            onClick={() => {
              if (window.confirm('처음부터 다시 시작할까요? 지금 하던 판은 사라져요!')) {
                dispatch({ type: 'RESET' })
              }
            }}
          >
            🆕
          </button>
          <button className="stat user-chip" onClick={() => setStage('entry')} title="시작 화면으로">
            {session ? `🏫 ${session.profile.nickname}` : '🙋 손님'} ⏏
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="map-area">
          <TravelMap
            pos={game.pos}
            visited={game.visited}
            questRegion={questProduct.region}
            onSelect={setSelected}
          />
          <p className="map-hint">
            지역을 누르면 정보를 보고 이동할 수 있어요 · 🟧 내 위치 🟩 가 본 곳(
            {visitedCount}/{REGIONS.length}) 🛒 퀘스트 물품 산지
          </p>
        </section>

        <aside className="panel">
          <div className="card here">
            <div className="here-head">
              <span className="here-emoji">{here.emoji}</span>
              <div>
                <p className="here-name">{here.name}</p>
                <p className="here-sub">지금 내가 있는 곳</p>
              </div>
            </div>
            <p className="here-desc">{here.desc}</p>
            {game.localEvent && (
              <p className={`event-banner ${game.localEvent.kind}`}>
                {game.localEvent.emoji} <b>{game.localEvent.title}</b> {game.localEvent.desc}
              </p>
            )}
          </div>

          <div className="news-bar">
            📢 <b>오늘의 뉴스</b> — {REGION_BY_KEY[game.news.region].name}에서{' '}
            {PRODUCTS[game.news.id].emoji} {PRODUCTS[game.news.id].name}을(를) 평소보다 비싸게 사줘요!
          </div>

          <div className="card quest">
            <p className="card-title">📦 배달 퀘스트</p>
            <p className="quest-text">
              {questProduct.emoji} <b>{questProduct.name} {quest.qty}개</b>를{' '}
              <b>{REGION_BY_KEY[quest.to].emoji} {quest.to}</b>(으)로 가져다주세요!
              <span className="quest-reward">보상 {quest.reward.toLocaleString()}원</span>
            </p>
            <p className="quest-hint">
              🛒 구하는 곳: {questOrigin.emoji} {questOrigin.name} ({questProduct.origin}) — 지도에서 🛒 표시!
            </p>
            <button
              className="deliver-btn"
              disabled={!canDeliver || game.over}
              onClick={() => dispatch({ type: 'DELIVER' })}
            >
              {canDeliver ? '🚚 배달 완료하기!' : `${quest.to}에서 ${questProduct.name} ${quest.qty}개를 갖고 눌러요`}
            </button>
          </div>

          <div className="card">
            <p className="card-title">🏪 {here.key} 시장 — 사기</p>
            {hereProducts.length === 0 ? (
              <p className="market-empty">
                여기는 특산물이 나지 않는 도시예요.
                {here.marketBonus > 1 && ' 대신 사람이 많아서 물건이 비싸게 팔려요! 💰'}
              </p>
            ) : (
              <div className="trade-list">
                {hereProducts.map((id) => {
                  const p = PRODUCTS[id]
                  const price = buyPrice(id, game)
                  const soldOut = game.cash < price || inBag >= cart.cap
                  return (
                    <div className="trade-row" key={id}>
                      <button className="tr-info" onClick={() => setInfoProduct(id)} title="특산물 알아보기">
                        <span className="tr-emoji">{p.emoji}</span>
                        <span className="tr-name">
                          {p.name} <span className="tr-more">ⓘ</span>
                          <small>{p.origin} · {p.category}</small>
                        </span>
                      </button>
                      <span className="tr-price">{price.toLocaleString()}원</span>
                      <button
                        className="buy-btn"
                        disabled={soldOut || game.over}
                        onClick={() => dispatch({ type: 'BUY', id })}
                      >
                        사기
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card">
            <p className="card-title">{cart.emoji} 내 수레 — 팔기 ({inBag}/{cart.cap}칸)</p>
            {bagItems.length === 0 ? (
              <p className="market-empty">아직 짐칸이 비어 있어요. 산지에서 특산물을 사 보세요!</p>
            ) : (
              <div className="trade-list">
                {bagItems.map(([id, item]) => {
                  const p = PRODUCTS[id]
                  const price = sellPrice(id, game.pos, game)
                  const avgPaid = Math.round(item.paid / item.count)
                  const gain = price - avgPaid
                  return (
                    <div className="trade-row" key={id}>
                      <button className="tr-info" onClick={() => setInfoProduct(id)} title="특산물 알아보기">
                        <span className="tr-emoji">{p.emoji}</span>
                        <span className="tr-name">
                          {p.name} ×{item.count} <span className="tr-more">ⓘ</span>
                          <small>산 값 평균 {avgPaid.toLocaleString()}원</small>
                        </span>
                      </button>
                      <span className={`tr-price ${gain >= 0 ? 'gain' : 'loss'}`}>
                        {price.toLocaleString()}원
                        <small>{gain >= 0 ? `+${gain.toLocaleString()}` : gain.toLocaleString()}</small>
                      </span>
                      <button className="sell-btn" disabled={game.over} onClick={() => dispatch({ type: 'SELL', id })}>
                        팔기
                      </button>
                      {item.count > 1 && (
                        <button className="sell-btn all" disabled={game.over} onClick={() => dispatch({ type: 'SELL', id, all: true })}>
                          전부
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {nextCart && (
              <button
                className="upgrade-btn"
                disabled={game.cash < nextCart.price || game.over}
                onClick={() => dispatch({ type: 'UPGRADE' })}
              >
                {nextCart.emoji} {nextCart.name}로 바꾸기 ({nextCart.cap}칸) — {nextCart.price.toLocaleString()}원
              </button>
            )}
          </div>

          <div className="card log-card">
            <p className="card-title">📜 장사 기록</p>
            <ul className="log">
              {game.log.map((l, i) => (
                <li key={i}>
                  <b>{l.day}일</b> {l.text}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </main>

      {selected && !game.over && (
        <RegionPreview
          regionKey={selected}
          game={game}
          onTravel={travel}
          onClose={() => setSelected(null)}
        />
      )}

      {showCodex && (
        <div className="overlay" onClick={() => setShowCodex(false)}>
          <div className="codex-card" onClick={(e) => e.stopPropagation()}>
            <p className="end-title">📖 특산물 도감 ({codexCount}/{totalProducts})</p>
            <p className="codex-hint">
              특산물을 한 번이라도 사면 도감에 실려요!
              {cumCodex && (
                <>
                  <br />🏫 여러 판 누적 진도: <b>{Object.keys(cumCodex).length}/{totalProducts}</b> — 연둣빛은 지난 판에 모은 것!
                </>
              )}
            </p>
            <div className="codex-grid">
              {Object.values(PRODUCTS).map((p) => {
                const now = !!game.codex[p.id]
                const known = !now && cumCodex && cumCodex[p.id] // 지난 판들에서 모은 것
                const show = now || known
                return (
                  <div
                    className={`codex-item ${now ? 'found' : ''} ${known ? 'known' : ''}`}
                    key={p.id}
                    onClick={show ? () => setInfoProduct(p.id) : undefined}
                  >
                    <span className="ci-emoji">{show ? p.emoji : '❓'}</span>
                    <span className="ci-name">{show ? p.name : '???'}</span>
                    <small>{show ? `${p.origin} (${p.region})` : ''}</small>
                  </div>
                )
              })}
            </div>
            <button className="restart-btn" onClick={() => setShowCodex(false)}>닫기</button>
          </div>
        </div>
      )}

      {showRanking && deps && (
        <RankingModal deps={deps} profile={session?.profile} onClose={() => setShowRanking(false)} />
      )}

      {infoProduct && (
        <ProductCard
          productId={infoProduct}
          game={game}
          linkAllowed={linkAllowed}
          onClose={() => setInfoProduct(null)}
        />
      )}

      {(game.over || bankrupt) && (
        <div className="overlay">
          <div className="end-card">
            <p className="end-title">{bankrupt ? '😢 파산…' : '🏁 장사 끝!'}</p>
            <p className="end-badge">{title.emoji} {title.name}</p>
            <p className="end-cash">최종 소지금 {game.cash.toLocaleString()}원</p>
            <p className="end-visit">
              {profit >= 0 ? `번 돈 +${profit.toLocaleString()}원` : `잃은 돈 ${profit.toLocaleString()}원`} ·
              가 본 지역 {visitedCount}/{REGIONS.length}곳 · 도감 {codexCount}/{totalProducts}
            </p>
            {saved && <p className="end-saved">🏆 랭킹에 기록했어요!</p>}
            <button className="restart-btn" onClick={() => dispatch({ type: 'RESET' })}>
              🔄 다시 도전!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
