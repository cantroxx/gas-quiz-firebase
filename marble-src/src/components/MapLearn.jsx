// MapLearn.jsx — "지도로 배우기" 화면
//  - 도감(explore): 지역을 눌러 그 지역 특산물을 카드로 배웁니다.
//  - 퀴즈(quiz): 특산물이 어느 지역인지 지도에서 찾아 누릅니다.
//  - 지도는 카카오맵을 우선 사용하고, 안 되면 SVG 그림지도로 자동 대체합니다.
// 이 화면은 무역 게임과 분리돼 있어(useState만 사용) 서로 영향이 없어요.
import { useState } from 'react'
import KoreaMap from './KoreaMap.jsx'
import LeafletMap from './LeafletMap.jsx'
import {
  MAP_REGIONS,
  MAP_REGION_BY_KEY,
  PRODUCTS,
  PRODUCTS_BY_REGION,
} from '../data.js'
import { estimateMarketRange } from '../gameLogic.js'

// 배열을 섞어서 새 배열로 반환 (퀴즈 문제 순서)
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const ALL_PRODUCT_IDS = Object.keys(PRODUCTS)

export default function MapLearn() {
  const [mode, setMode] = useState('explore') // explore | quiz
  // 지도(Leaflet)가 실패하면 true → 이후에는 SVG 지도 사용(모드 바꿔도 유지)
  const [mapFailed, setMapFailed] = useState(false)

  const mapProps = { mapFailed, onMapFail: () => setMapFailed(true) }

  return (
    <div>
      {/* 도감 / 퀴즈 전환 */}
      <div className="submode-tabs">
        <button
          className={`submode ${mode === 'explore' ? 'active' : ''}`}
          onClick={() => setMode('explore')}
        >
          📖 도감 (배우기)
        </button>
        <button
          className={`submode ${mode === 'quiz' ? 'active' : ''}`}
          onClick={() => setMode('quiz')}
        >
          ❓ 퀴즈 (찾기)
        </button>
      </div>

      {mode === 'explore' ? (
        <ExploreMode {...mapProps} />
      ) : (
        <QuizMode {...mapProps} />
      )}
    </div>
  )
}

// 무료 지도(Leaflet) 우선, 안 되면(오프라인 등) SVG 지도로 대체.
// 두 지도는 같은 props 를 받습니다.
function RegionMap({ mapFailed, onMapFail, ...rest }) {
  if (mapFailed) return <KoreaMap {...rest} />
  return <LeafletMap {...rest} onFail={onMapFail} />
}

// ── 도감 모드 (드릴다운: 전국 권역 → 권역 상세) ──────
function ExploreMode({ mapFailed, onMapFail }) {
  const [drill, setDrill] = useState(null) // null=전국 보기 / 권역명=상세 보기

  // 2단계: 권역 상세 (실제 지도 확대 + 그 권역 특산물)
  if (drill) {
    return (
      <RegionDrilldown
        key={drill}
        region={drill}
        onBack={() => setDrill(null)}
        mapFailed={mapFailed}
        onMapFail={onMapFail}
      />
    )
  }

  // 1단계: 전국 색칠 지도에서 권역 선택
  const pickRegion = (key) => {
    if ((MAP_REGION_BY_KEY[key] || {}).hasProducts) setDrill(key)
  }
  return (
    <div className="map-layout">
      <div className="panel map-panel">
        <p className="map-hint">권역(도)을 눌러 그 지역 특산물을 배워요! 👆</p>
        <KoreaMap onRegionClick={pickRegion} clickableOnlyProducts />
      </div>

      <div className="panel">
        <h2>🗺️ 우리나라 특산물 지도</h2>
        <div className="compare">
          지도에서 <b>권역(도)</b>을 누르면 그 지역으로 <b>확대</b>돼서, 어떤 특산물이
          어디서 나는지 자세히 볼 수 있어요.
        </div>
        <div className="region-picker">
          {MAP_REGIONS.filter((r) => r.hasProducts).map((r) => (
            <button
              key={r.key}
              className="region-btn"
              style={{ background: r.color }}
              onClick={() => setDrill(r.key)}
            >
              {r.emoji} {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// 권역 상세: 실제 지도를 그 도로 확대하고 특산물 핀을 눌러 배웁니다.
function RegionDrilldown({ region, onBack, mapFailed, onMapFail }) {
  const productIds = PRODUCTS_BY_REGION[region] || []
  const [selected, setSelected] = useState(productIds[0])
  const product = PRODUCTS[selected]
  const regionInfo = MAP_REGION_BY_KEY[region]

  return (
    <div>
      <button className="btn btn-gray back-btn" onClick={onBack}>
        ← 전국 지도로
      </button>
      <div className="map-layout" style={{ marginTop: 12 }}>
        <div className="panel map-panel">
          <p className="map-hint">
            {regionInfo.emoji} {regionInfo.label} · 특산물(핀)을 눌러 보세요! 👆
          </p>
          <RegionMap
            mapFailed={mapFailed}
            onMapFail={onMapFail}
            markerMode="product"
            focusRegion={region}
            onRegionClick={setSelected}
            selected={selected}
          />
        </div>
        <div className="panel">
          {product && <ProductDetail product={product} onPick={setSelected} />}
        </div>
      </div>
    </div>
  )
}

// 특산물 하나의 상세 (산지 위치·기준가·예상 시장가)
function ProductDetail({ product, onPick }) {
  const range = estimateMarketRange(product.id)
  const region = MAP_REGION_BY_KEY[product.region]
  const siblings = (PRODUCTS_BY_REGION[product.region] || []).filter((id) => id !== product.id)

  return (
    <>
      <h2>
        {product.emoji} {product.name}
      </h2>
      <div className="compare">
        <b>{product.region}</b>의 <b>{product.origin}</b>에서 나는 특산물이에요.
        <br />
        {region && region.desc}
      </div>
      <div className="item-list">
        <div className="item-row">
          <div className="item-info">
            <span className="item-name">📍 산지: {product.origin}</span>
            <span className="item-price">
              산지가(기준) {product.basePrice.toLocaleString()}원 · 시장에서 팔면 약{' '}
              {range.low.toLocaleString()}~{range.high.toLocaleString()}원
            </span>
          </div>
        </div>
      </div>
      <p className="hint">
        산지에서 <b>싸게 사서</b> 시장에서 <b>비싸게 팔면</b> 이윤이 남아요!
      </p>
      {siblings.length > 0 && (
        <div className="sibling-chips">
          <span style={{ color: '#8d6e63', fontSize: 14 }}>같은 {product.region} 특산물: </span>
          {siblings.map((id) => (
            <button key={id} className="chip" onClick={() => onPick(id)}>
              {PRODUCTS[id].emoji} {PRODUCTS[id].name}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

// ── 퀴즈 모드 ──────────────────────────────────
function QuizMode({ mapFailed, onMapFail }) {
  const [questions, setQuestions] = useState(() => shuffle(ALL_PRODUCT_IDS).slice(0, 10))
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState(null) // { region, correct }
  const [locked, setLocked] = useState(false) // 정답 맞힌 뒤 잠깐 잠금
  const [showLabels, setShowLabels] = useState(true)

  const finished = index >= questions.length
  const currentId = questions[index]
  const product = currentId ? PRODUCTS[currentId] : null

  function handleClick(regionKey) {
    if (locked || finished) return
    const correct = product.region === regionKey
    setFeedback({ region: regionKey, correct })
    if (correct) {
      setScore((s) => s + 1)
      setLocked(true)
      setTimeout(() => {
        setFeedback(null)
        setLocked(false)
        setIndex((i) => i + 1)
      }, 1000)
    }
  }

  function restart() {
    setQuestions(shuffle(ALL_PRODUCT_IDS).slice(0, 10))
    setIndex(0)
    setScore(0)
    setFeedback(null)
    setLocked(false)
  }

  if (finished) {
    const total = questions.length
    return (
      <div className="panel" style={{ textAlign: 'center' }}>
        <h2>🎉 퀴즈 끝!</h2>
        <div className="grade" style={{ fontSize: 72 }}>
          {score} / {total}
        </div>
        <p style={{ fontSize: 20 }}>
          {score === total
            ? '완벽해요! 특산물 박사님 👑'
            : score >= total * 0.7
              ? '잘했어요! 조금만 더 💪'
              : '다시 도전해 볼까요? 🙂'}
        </p>
        <button className="btn btn-primary" onClick={restart}>
          🔄 다시 풀기
        </button>
      </div>
    )
  }

  return (
    <div className="map-layout">
      <div className="panel map-panel">
        <RegionMap
          mapFailed={mapFailed}
          onMapFail={onMapFail}
          onRegionClick={handleClick}
          feedback={feedback}
          showLabels={showLabels}
          clickableOnlyProducts
        />
        {/* '지역 이름 보기'는 SVG 지도일 때만 의미가 있어요(지도 핀은 항상 이름 표시) */}
        {mapFailed && (
          <label className="label-toggle">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
            />
            지역 이름 보기
          </label>
        )}
      </div>

      <div className="panel">
        <div className="quiz-progress">
          문제 {index + 1} / {questions.length} · 점수 {score}
        </div>
        <div className="event-box">
          <div className="event-title" style={{ fontSize: 48 }}>
            {product.emoji}
          </div>
          <div className="event-text" style={{ fontSize: 20 }}>
            <b>{product.name}</b> 은(는) 어느 지역의 특산물일까요?
            <br />
            지도에서 찾아 눌러 보세요!
          </div>
        </div>

        {feedback && !feedback.correct && (
          <p className="quiz-feedback wrong">❌ 아쉬워요. 다시 한 번 눌러 보세요!</p>
        )}
        {feedback && feedback.correct && (
          <p className="quiz-feedback right">🎯 정답! {product.region} 특산물이에요.</p>
        )}
      </div>
    </div>
  )
}
