// ============================================================
// gameLogic.js — 게임 규칙(상태 + 리듀서 + 도우미 함수)
//
// 핵심 개념
//  - state(상태): 지금 게임이 어떤 모습인지 담은 하나의 객체
//  - action(액션): "무슨 일이 일어났는지" 설명하는 객체 (예: 주사위 굴림)
//  - reducer(리듀서): (현재상태, 액션) → 다음상태 를 계산하는 순수 함수
//
// 랜덤(주사위/시장배수/이벤트)은 리듀서 밖의 도우미 함수에서 뽑아
// 액션에 실어 보냅니다. 그래야 리듀서가 "순수"하게 유지돼 버그가 적어요.
// ============================================================

import {
  BOARD,
  PRODUCTS,
  PRODUCTS_BY_REGION,
  GOLDEN_EVENTS,
  QUIZZES,
  CONFIG,
} from './data.js'

const STORAGE_KEY = 'specialty-marble-save-v2'
const BOARD_SIZE = BOARD.length // 20

// ── 도우미: 랜덤 (리듀서 밖에서만 호출) ──────────────
export function rollDice() {
  return Math.floor(Math.random() * 6) + 1 // 1~6
}

function randBetween(min, max) {
  return min + Math.random() * (max - min)
}

// 소수 첫째 자리까지 반올림한 시장 배수
function roundMult(n) {
  return Math.round(n * 10) / 10
}

// 한 칸 정보 얻기
export function getCell(position) {
  return BOARD[position]
}

// 특산물의 현재 재고(산지에 남은 수량)
export function getStock(state, productId) {
  const s = state.stock ? state.stock[productId] : undefined
  return s == null ? CONFIG.baseStock : s
}

// 특산물의 현재 매입가(산지가).
//  - 흉년이면 오르고, 재고가 적을수록(희소할수록) 더 비싸집니다. (수요·공급)
export function getBuyPrice(state, productId) {
  const p = PRODUCTS[productId]
  const harvest = state.harvestRegions[p.region] ? CONFIG.harvestMultiplier : 1
  const stock = getStock(state, productId)
  const scarcity = 1 + Math.max(0, CONFIG.baseStock - stock) * CONFIG.scarcityStep
  return Math.round(p.basePrice * harvest * scarcity)
}

// 매입가가 기본가보다 올랐는지(재고 부족/흉년) 판단 — UI 표시용
export function isBuyPriceUp(state, productId) {
  return getBuyPrice(state, productId) > PRODUCTS[productId].basePrice
}

// 특산물의 현재 판매가.
//  - 시장배수 × 수요폭등 배수 × 공급과잉 하락분
//  - 같은 특산물을 많이 팔면(glut↑) 값이 내려갑니다. (수요·공급)
export function getSellPrice(state, productId) {
  const p = PRODUCTS[productId]
  const marketMult = state.activeMarket ? state.activeMarket.multiplier : 0
  const surge = state.surgeProducts[productId] ? CONFIG.surgeMultiplier : 1
  const glut = (state.glut && state.glut[productId]) || 0
  const glutFactor = Math.max(CONFIG.glutMinFactor, 1 - glut * CONFIG.glutStep)
  return Math.round(p.basePrice * marketMult * surge * glutFactor)
}

// 산지 칸에서 안내용으로 보여줄 "예상 시장가" 범위
export function estimateMarketRange(productId) {
  const base = PRODUCTS[productId].basePrice
  return {
    low: Math.round(base * CONFIG.marketMin),
    high: Math.round(base * CONFIG.marketMax),
  }
}

// ── 이동 계획 만들기 (핸들러에서 호출 → 액션 payload 로 전달) ──
// steps 칸 이동했을 때 필요한 "랜덤 결과"를 미리 뽑아 둡니다.
export function planMove(state, steps) {
  const from = state.position
  const to = (from + steps) % BOARD_SIZE
  const passedStart = from + steps >= BOARD_SIZE // 출발점 통과(=한 바퀴 완주)
  const cell = BOARD[to]

  const plan = { steps, to, passedStart, cellType: cell.type }

  if (cell.type === 'market') {
    plan.marketMultiplier = roundMult(randBetween(CONFIG.marketMin, CONFIG.marketMax))
  } else if (cell.type === 'corner' && cell.subtype === 'bigmarket') {
    plan.marketMultiplier = roundMult(randBetween(CONFIG.bigMarketMin, CONFIG.bigMarketMax))
  } else if (cell.type === 'corner' && cell.subtype === 'festival') {
    // 축제: 랜덤 특산물 수요 폭등
    plan.festivalProduct = pickRandom(Object.keys(PRODUCTS))
  } else if (cell.type === 'golden') {
    plan.event = rollGoldenEvent()
  }
  return plan
}

// 황금열쇠 이벤트 하나를 랜덤으로 뽑고, 필요한 대상까지 정해서 반환
export function rollGoldenEvent() {
  const base = pickRandom(GOLDEN_EVENTS)
  const event = { ...base }
  if (event.kind === 'surge') {
    event.productId = pickRandom(Object.keys(PRODUCTS))
  } else if (event.kind === 'harvest') {
    event.region = pickRandom(Object.keys(PRODUCTS_BY_REGION))
  } else if (event.kind === 'quiz') {
    event.quiz = pickRandom(QUIZZES)
  }
  return event
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── 초기 상태 ──────────────────────────────────────
// 모든 특산물의 재고를 기본값으로 초기화
export function initStock() {
  return Object.keys(PRODUCTS).reduce((acc, id) => {
    acc[id] = CONFIG.baseStock
    return acc
  }, {})
}

// 배열 섞기 (게임 시작 시 산지 배정용)
function shuffleArr(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 게임 시작마다 산지 칸에 "랜덤 지역 + 그 지역 특산물 2~3개"를 배정
// → 판마다 놓이는 특산물이 달라집니다. (모든 지역이 최소 1칸씩 등장)
export function buildSources() {
  const sourceIdx = BOARD.map((c, i) => (c.type === 'source' ? i : -1)).filter((i) => i >= 0)
  const regions = shuffleArr(Object.keys(PRODUCTS_BY_REGION)) // 6개 지역 섞기
  const assign = {}
  sourceIdx.forEach((idx, k) => {
    const region = regions[k % regions.length] // 칸이 지역보다 많으면 앞에서부터 반복
    const pool = PRODUCTS_BY_REGION[region] || []
    const count = Math.min(pool.length, 2 + Math.floor(Math.random() * 2)) // 2~3개
    assign[idx] = { region, productIds: shuffleArr(pool).slice(0, count) }
  })
  return assign
}

export function createInitialState() {
  return {
    cash: CONFIG.startCash,
    turn: 1,
    position: 0,
    laps: 0,
    cargo: [], // [{ productId, buyPrice }]
    sources: buildSources(), // { 보드칸index: { region, productIds } }  매판 랜덤
    stock: initStock(), // { productId: 남은 재고 }  매입하면 줄고 값이 오름
    glut: {}, // { productId: 공급 과잉도 }  많이 팔면 늘고 값이 내림
    surgeProducts: {}, // { productId: true }  수요 폭등(판매가 2배)
    harvestRegions: {}, // { region: true }     흉년(매입가 상승)
    skipNext: false, // 폭풍으로 다음 턴 쉬기
    phase: 'ready', // ready | choose | action | ended
    dice: null,
    moveOptions: [], // [1..dice]
    activeMarket: null, // { multiplier, isBig } 시장/큰장에 있을 때
    activeSource: null, // region 산지에 있을 때
    activeEvent: null, // 황금열쇠/코너 결과 메시지 표시용
    pendingQuiz: null, // 퀴즈 진행 중이면 { question, options, answer, reward }
    result: null, // 게임 종료 결과
    log: [], // 최근 활동 기록(최신이 앞)
  }
}

function addLog(state, message) {
  return [{ turn: state.turn, message }, ...state.log].slice(0, 8)
}

// 목표/턴 판정 → 종료 여부 결정
function checkEnd(state) {
  if (state.cash >= CONFIG.goal) {
    return { ...state, phase: 'ended', result: makeResult(state, true) }
  }
  if (state.turn > CONFIG.maxTurns) {
    return { ...state, phase: 'ended', result: makeResult(state, false) }
  }
  return state
}

function makeResult(state, success) {
  const cash = state.cash
  let grade
  if (cash >= 20000) grade = 'S'
  else if (cash >= 15000) grade = 'A'
  else if (cash >= 10000) grade = 'B'
  else if (cash >= 6000) grade = 'C'
  else grade = 'D'
  return { success, cash, grade, turnsUsed: state.turn - 1 }
}

// ── 리듀서 (순수 함수) ─────────────────────────────
export function reducer(state, action) {
  switch (action.type) {
    // 주사위 굴리기 (dice 값은 핸들러에서 뽑아 전달)
    case 'ROLL': {
      if (state.phase !== 'ready') return state
      return {
        ...state,
        dice: action.dice,
        moveOptions: Array.from({ length: action.dice }, (_, i) => i + 1),
        phase: 'choose',
      }
    }

    // 폭풍으로 이번 턴 쉬기 → 바로 턴 종료
    case 'SKIP_TURN': {
      const next = { ...state, skipNext: false }
      return endTurn(next, '🌀 폭풍으로 이번 턴은 쉬었어요.')
    }

    // 이동 (plan 은 planMove 로 만든 결과)
    case 'MOVE': {
      if (state.phase !== 'choose') return state
      return applyMove(state, action.plan)
    }

    // 산지에서 매입
    case 'BUY': {
      if (state.activeSource == null) return state
      if (state.cargo.length >= CONFIG.cargoLimit) return state
      const stock = getStock(state, action.productId)
      if (stock <= 0) return state // 재고 소진(품절)
      const price = getBuyPrice(state, action.productId)
      if (state.cash < price) return state
      return {
        ...state,
        cash: state.cash - price,
        cargo: [...state.cargo, { productId: action.productId, buyPrice: price }],
        // 매입 → 재고 1 감소 (다음 매입가는 더 비싸짐)
        stock: { ...state.stock, [action.productId]: stock - 1 },
        log: addLog(state, `🛒 ${action.productId} 매입 (-${price.toLocaleString()}원)`),
      }
    }

    // 판매: 짐칸에서 index 하나 판매
    case 'SELL': {
      if (state.activeMarket == null) return state
      const item = state.cargo[action.index]
      if (!item) return state
      const price = getSellPrice(state, item.productId)
      const profit = price - item.buyPrice
      const cargo = state.cargo.filter((_, i) => i !== action.index)
      const sign = profit >= 0 ? '+' : ''
      return {
        ...state,
        cash: state.cash + price,
        cargo,
        // 판매 → 그 특산물 공급 과잉 1 증가 (다음 판매가는 더 쌈)
        glut: { ...state.glut, [item.productId]: ((state.glut && state.glut[item.productId]) || 0) + 1 },
        log: addLog(
          state,
          `💰 ${item.productId} 판매 (+${price.toLocaleString()}원, 이윤 ${sign}${profit.toLocaleString()}원)`,
        ),
      }
    }

    // 전부 판매
    case 'SELL_ALL': {
      if (state.activeMarket == null) return state
      if (state.cargo.length === 0) return state
      // 같은 특산물을 연달아 팔면 값이 점점 내려가도록 누적 반영
      const glut = { ...state.glut }
      let cash = state.cash
      let totalProfit = 0
      state.cargo.forEach((item) => {
        const price = getSellPrice({ ...state, glut }, item.productId)
        cash += price
        totalProfit += price - item.buyPrice
        glut[item.productId] = (glut[item.productId] || 0) + 1
      })
      const sign = totalProfit >= 0 ? '+' : ''
      return {
        ...state,
        cash,
        cargo: [],
        glut,
        log: addLog(
          state,
          `💰 전부 판매 (총 이윤 ${sign}${totalProfit.toLocaleString()}원)`,
        ),
      }
    }

    // 퀴즈 답 선택 (choice = 고른 index)
    case 'ANSWER_QUIZ': {
      if (!state.pendingQuiz) return state
      const q = state.pendingQuiz
      const correct = action.choice === q.answer
      const cash = correct ? state.cash + q.reward : state.cash
      const message = correct
        ? `🎯 정답! 보너스 +${q.reward.toLocaleString()}원`
        : `❌ 아쉬워요. 정답은 "${q.options[q.answer]}" 였어요.`
      return {
        ...state,
        cash,
        pendingQuiz: null,
        activeEvent: { ...state.activeEvent, resolved: true, resultText: message },
        log: addLog(state, message),
      }
    }

    // 현재 턴 마무리 → 다음 턴 준비 (또는 종료)
    case 'END_TURN': {
      return endTurn(state, null)
    }

    // 다시 시작
    case 'RESTART': {
      return createInitialState()
    }

    default:
      return state
  }
}

// 이동 결과를 상태에 반영하고, 도착 칸의 액션 화면을 준비
function applyMove(state, plan) {
  let cash = state.cash
  let laps = state.laps
  let log = state.log

  // 출발점 통과 → 봉급 지급 (도착 시점 기준으로 처리)
  if (plan.passedStart) {
    cash += CONFIG.salary
    laps += 1
    log = addLog({ ...state, log }, `🚩 출발점 통과! 봉급 +${CONFIG.salary.toLocaleString()}원`)
  }

  let next = {
    ...state,
    cash,
    laps,
    log,
    position: plan.to,
    dice: null,
    moveOptions: [],
    activeMarket: null,
    activeSource: null,
    activeEvent: null,
    pendingQuiz: null,
    phase: 'action',
  }

  const cell = BOARD[plan.to]

  if (cell.type === 'source') {
    // 이 판에 이 칸에 배정된 지역/특산물 (없으면 안전하게 대체)
    next.activeSource =
      (state.sources && state.sources[plan.to]) ||
      { region: cell.region, productIds: PRODUCTS_BY_REGION[cell.region] || [] }
  } else if (cell.type === 'market') {
    next.activeMarket = { multiplier: plan.marketMultiplier, isBig: false }
  } else if (cell.type === 'corner') {
    switch (cell.subtype) {
      case 'bigmarket':
        next.activeMarket = { multiplier: plan.marketMultiplier, isBig: true }
        break
      case 'storm':
        // 폭풍: 다음 턴 쉼. 이번 턴은 별다른 행동 없이 종료 버튼만.
        next.skipNext = true
        next.activeEvent = {
          title: '🌀 폭풍!',
          text: '다음 턴은 쉬어야 해요.',
          resolved: true,
        }
        break
      case 'festival': {
        // 축제: 랜덤 특산물 수요 폭등
        const pid = plan.festivalProduct
        next.surgeProducts = { ...state.surgeProducts, [pid]: true }
        next.activeEvent = {
          title: '🎉 축제!',
          text: `${pid} 수요가 폭등했어요! 판매가 2배 (게임 끝까지)`,
          resolved: true,
        }
        next.log = addLog(next, `🎉 축제: ${pid} 수요 폭등!`)
        break
      }
      case 'start':
      default:
        next.activeEvent = { title: '🚩 출발', text: '여기서 잠시 쉬어가요.', resolved: true }
        break
    }
  } else if (cell.type === 'golden') {
    next = applyGoldenEvent(next, plan.event)
  }

  return next
}

// 황금열쇠 이벤트 적용
function applyGoldenEvent(state, event) {
  const base = {
    ...state,
    activeEvent: { title: event.title, text: event.desc, resolved: false, kind: event.kind },
  }
  switch (event.kind) {
    case 'surge': {
      const pid = event.productId
      return {
        ...base,
        surgeProducts: { ...state.surgeProducts, [pid]: true },
        activeEvent: {
          title: event.title,
          text: `${pid} 수요 폭등! 판매가 2배 (게임 끝까지)`,
          resolved: true,
        },
        log: addLog(state, `🔑 ${pid} 수요 폭등!`),
      }
    }
    case 'harvest': {
      const region = event.region
      return {
        ...base,
        harvestRegions: { ...state.harvestRegions, [region]: true },
        activeEvent: {
          title: event.title,
          text: `${region} 산지에 흉년! 매입가가 1.5배로 올랐어요.`,
          resolved: true,
        },
        log: addLog(state, `🔑 ${region} 흉년(매입가 상승)`),
      }
    }
    case 'bonus': {
      return {
        ...base,
        cash: state.cash + event.amount,
        activeEvent: {
          title: event.title,
          text: `${event.desc} +${event.amount.toLocaleString()}원`,
          resolved: true,
        },
        log: addLog(state, `🔑 보너스 +${event.amount.toLocaleString()}원`),
      }
    }
    case 'toll': {
      const amount = Math.min(event.amount, state.cash)
      return {
        ...base,
        cash: state.cash - amount,
        activeEvent: {
          title: event.title,
          text: `${event.desc} -${amount.toLocaleString()}원`,
          resolved: true,
        },
        log: addLog(state, `🔑 통행료 -${amount.toLocaleString()}원`),
      }
    }
    case 'quiz': {
      return {
        ...base,
        pendingQuiz: event.quiz,
        activeEvent: { title: event.title, text: event.desc, resolved: false, kind: 'quiz' },
      }
    }
    default:
      return base
  }
}

// 턴 종료 처리 (message 가 있으면 로그에 추가)
function endTurn(state, message) {
  let log = state.log
  if (message) log = addLog(state, message)

  // 매 턴: 산지 재고 회복(기본값까지), 시장 공급과잉 서서히 해소
  const stock = {}
  Object.keys(PRODUCTS).forEach((id) => {
    const cur = getStock(state, id)
    stock[id] = Math.min(CONFIG.baseStock, cur + CONFIG.stockRecoverPerTurn)
  })
  const glut = {}
  Object.keys(state.glut || {}).forEach((id) => {
    const g = Math.max(0, state.glut[id] - CONFIG.glutDecayPerTurn)
    if (g > 0) glut[id] = g
  })

  let next = {
    ...state,
    log,
    stock,
    glut,
    turn: state.turn + 1,
    phase: 'ready',
    dice: null,
    moveOptions: [],
    activeMarket: null,
    activeSource: null,
    activeEvent: null,
    pendingQuiz: null,
  }

  // 먼저 종료 조건(목표 달성/턴 소진) 확인
  const ended = checkEnd(next)
  if (ended.phase === 'ended') return ended

  return next
}

// ── localStorage 저장/불러오기 ────────────────────
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    // 저장 실패는 조용히 무시 (게임 진행에는 영향 없음)
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    // 무시
  }
}
