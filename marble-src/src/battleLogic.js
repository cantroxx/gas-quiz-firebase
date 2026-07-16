// ============================================================
// battleLogic.js — 1:1 대전 규칙 (순수 리듀서)
//
// 낱말대전의 room.js 처럼, 통신/화면과 분리된 "순수 게임 규칙"이에요.
// 연습(Local)·봇(Bot)·온라인(Online) 세 모드가 이 리듀서를 똑같이 씁니다.
//
// 규칙(사용자 확정):
//  - 두 명이 같은 게임판/시장(수요·공급 공유)에서 번갈아 15턴씩(총 30턴)
//  - 승리: 먼저 목표액(10,000) 도달 시 즉시 승 / 아니면 30턴 뒤 현금 많은 쪽 승
//  - 시장 공유: 상대가 많이 사면 재고↓·값↑ → 서로 견제
// ============================================================

import { BOARD, PRODUCTS, PRODUCTS_BY_REGION, GOLDEN_EVENTS, QUIZZES, CONFIG } from './data.js'
import {
  getBuyPrice,
  getSellPrice,
  getStock,
  planMove,
  rollDice,
  buildSources,
  initStock,
} from './gameLogic.js'

export const TURNS_PER_PLAYER = 15
const BOARD_SIZE = BOARD.length
export const RANK_WIN = 30 // 승리 시 랭크 점수
export const RANK_LOSE = 5 // 패배 시 랭크 점수

// 랜덤 도우미(리듀서 밖에서 호출) — planMove/rollDice 는 gameLogic 재사용
export { rollDice }

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// 대전용 이동 계획 (현재 플레이어 위치 기준). gameLogic.planMove 재사용
export function planBattleMove(state, steps) {
  const pos = state.players[state.current].position
  return planMove({ position: pos }, steps)
}

// ── 초기 상태 ──────────────────────────────────
// names: [내이름, 상대이름], mode: 'local' | 'bot' | 'online'
export function createBattleState(names = ['플레이어1', '플레이어2'], mode = 'bot') {
  return {
    mode,
    players: names.map((name) => ({
      name,
      cash: CONFIG.startCash,
      cargo: [],
      position: 0,
      laps: 0,
      skipNext: false,
    })),
    current: 0, // 이번 차례 (0 또는 1)
    turnNo: 1, // 1..30
    // 공유 시장/보드
    sources: buildSources(),
    stock: initStock(),
    glut: {},
    surgeProducts: {},
    harvestRegions: {},
    // 현재 차례의 진행 상태
    phase: 'ready', // ready | choose | action | ended
    dice: null,
    moveOptions: [],
    activeMarket: null,
    activeSource: null,
    activeEvent: null,
    pendingQuiz: null,
    // 종료
    winner: null, // 0 | 1 | 'draw' | null
    log: [],
  }
}

function addLog(state, message) {
  return [{ turnNo: state.turnNo, who: state.current, message }, ...state.log].slice(0, 10)
}

function setPlayer(players, idx, patch) {
  return players.map((p, i) => (i === idx ? { ...p, ...patch } : p))
}

// ── 리듀서 ─────────────────────────────────────
export function battleReducer(state, action) {
  switch (action.type) {
    case 'ROLL': {
      if (state.phase !== 'ready') return state
      return {
        ...state,
        dice: action.dice,
        moveOptions: Array.from({ length: action.dice }, (_, i) => i + 1),
        phase: 'choose',
      }
    }

    case 'SKIP_TURN': {
      if (state.phase !== 'ready') return state
      const players = setPlayer(state.players, state.current, { skipNext: false })
      const withLog = { ...state, players, log: addLog(state, '🌀 폭풍으로 이번 턴은 쉬어요.') }
      return advanceTurn(withLog)
    }

    case 'MOVE': {
      if (state.phase !== 'choose') return state
      return applyBattleMove(state, action.plan)
    }

    case 'BUY': {
      if (!state.activeSource) return state
      const me = state.players[state.current]
      if (me.cargo.length >= CONFIG.cargoLimit) return state
      const stock = getStock(state, action.productId)
      if (stock <= 0) return state
      const price = getBuyPrice(state, action.productId)
      if (me.cash < price) return state
      return {
        ...state,
        players: setPlayer(state.players, state.current, {
          cash: me.cash - price,
          cargo: [...me.cargo, { productId: action.productId, buyPrice: price }],
        }),
        stock: { ...state.stock, [action.productId]: stock - 1 }, // 공유 재고 감소
        log: addLog(state, `🛒 ${me.name}: ${action.productId} 매입 (-${price.toLocaleString()}원)`),
      }
    }

    case 'SELL': {
      if (!state.activeMarket) return state
      const me = state.players[state.current]
      const item = me.cargo[action.index]
      if (!item) return state
      const price = getSellPrice(state, item.productId)
      const cargo = me.cargo.filter((_, i) => i !== action.index)
      return {
        ...state,
        players: setPlayer(state.players, state.current, { cash: me.cash + price, cargo }),
        glut: { ...state.glut, [item.productId]: ((state.glut && state.glut[item.productId]) || 0) + 1 },
        log: addLog(state, `💰 ${me.name}: ${item.productId} 판매 (+${price.toLocaleString()}원)`),
      }
    }

    case 'SELL_ALL': {
      if (!state.activeMarket) return state
      const me = state.players[state.current]
      if (me.cargo.length === 0) return state
      const glut = { ...state.glut }
      let cash = me.cash
      let total = 0
      me.cargo.forEach((item) => {
        const price = getSellPrice({ ...state, glut }, item.productId)
        cash += price
        total += price
        glut[item.productId] = (glut[item.productId] || 0) + 1
      })
      return {
        ...state,
        players: setPlayer(state.players, state.current, { cash, cargo: [] }),
        glut,
        log: addLog(state, `💰 ${me.name}: 전부 판매 (+${total.toLocaleString()}원)`),
      }
    }

    case 'ANSWER_QUIZ': {
      if (!state.pendingQuiz) return state
      const me = state.players[state.current]
      const q = state.pendingQuiz
      const correct = action.choice === q.answer
      const cash = correct ? me.cash + q.reward : me.cash
      const message = correct
        ? `🎯 ${me.name} 퀴즈 정답! +${q.reward.toLocaleString()}원`
        : `❌ ${me.name} 퀴즈 오답 (정답: ${q.options[q.answer]})`
      return {
        ...state,
        players: setPlayer(state.players, state.current, { cash }),
        pendingQuiz: null,
        activeEvent: { ...state.activeEvent, resolved: true, resultText: message },
        log: addLog(state, message),
      }
    }

    case 'END_TURN': {
      if (state.phase !== 'action') return state
      return advanceTurn(state)
    }

    // 봇의 행동 단계 한 번에 처리(매입·판매·퀴즈 후 턴 종료) — 순수
    case 'BOT_ACTION': {
      if (state.phase !== 'action') return state
      let s = state
      if (s.activeSource) {
        for (const id of botBuyList(s)) s = battleReducer(s, { type: 'BUY', productId: id })
      }
      if (s.activeMarket) s = battleReducer(s, { type: 'SELL_ALL' })
      if (s.pendingQuiz) s = battleReducer(s, { type: 'ANSWER_QUIZ', choice: s.pendingQuiz.answer })
      return advanceTurn(s)
    }

    case 'RESTART': {
      return createBattleState(
        state.players.map((p) => p.name),
        state.mode,
      )
    }

    default:
      return state
  }
}

// 이동 적용
function applyBattleMove(state, plan) {
  const me = state.current
  let players = state.players
  let log = state.log
  let cash = players[me].cash
  let laps = players[me].laps

  if (plan.passedStart) {
    cash += CONFIG.salary
    laps += 1
    log = [{ turnNo: state.turnNo, who: me, message: `🚩 ${players[me].name} 출발점 통과! 봉급 +${CONFIG.salary.toLocaleString()}원` }, ...log].slice(0, 10)
  }

  players = setPlayer(players, me, { position: plan.to, cash, laps })

  let next = {
    ...state,
    players,
    log,
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
    next.activeSource = state.sources[plan.to] || { region: cell.region, productIds: PRODUCTS_BY_REGION[cell.region] || [] }
  } else if (cell.type === 'market') {
    next.activeMarket = { multiplier: plan.marketMultiplier, isBig: false }
  } else if (cell.type === 'corner') {
    next = applyCorner(next, cell, plan)
  } else if (cell.type === 'golden') {
    next = applyGolden(next, plan.event)
  }
  return next
}

function applyCorner(state, cell, plan) {
  const me = state.current
  switch (cell.subtype) {
    case 'bigmarket':
      return { ...state, activeMarket: { multiplier: plan.marketMultiplier, isBig: true } }
    case 'storm':
      return {
        ...state,
        players: setPlayer(state.players, me, { skipNext: true }),
        activeEvent: { title: '🌀 폭풍!', text: '다음 내 차례는 쉬어요.', resolved: true },
      }
    case 'festival': {
      const pid = plan.festivalProduct
      return {
        ...state,
        surgeProducts: { ...state.surgeProducts, [pid]: true },
        activeEvent: { title: '🎉 축제!', text: `${pid} 수요 폭등! 판매가 2배(공유)`, resolved: true },
        log: addLog(state, `🎉 축제: ${pid} 수요 폭등`),
      }
    }
    default:
      return { ...state, activeEvent: { title: '🚩 출발', text: '잠시 쉬어가요.', resolved: true } }
  }
}

function applyGolden(state, event) {
  const me = state.current
  const meP = state.players[me]
  switch (event.kind) {
    case 'surge': {
      return {
        ...state,
        surgeProducts: { ...state.surgeProducts, [event.productId]: true },
        activeEvent: { title: event.title, text: `${event.productId} 수요 폭등! 판매가 2배(공유)`, resolved: true },
        log: addLog(state, `🔑 ${event.productId} 수요 폭등`),
      }
    }
    case 'harvest': {
      return {
        ...state,
        harvestRegions: { ...state.harvestRegions, [event.region]: true },
        activeEvent: { title: event.title, text: `${event.region} 흉년! 매입가 상승(공유)`, resolved: true },
        log: addLog(state, `🔑 ${event.region} 흉년`),
      }
    }
    case 'bonus': {
      return {
        ...state,
        players: setPlayer(state.players, me, { cash: meP.cash + event.amount }),
        activeEvent: { title: event.title, text: `${event.desc} +${event.amount.toLocaleString()}원`, resolved: true },
        log: addLog(state, `🔑 ${meP.name} 보너스 +${event.amount.toLocaleString()}원`),
      }
    }
    case 'toll': {
      const amount = Math.min(event.amount, meP.cash)
      return {
        ...state,
        players: setPlayer(state.players, me, { cash: meP.cash - amount }),
        activeEvent: { title: event.title, text: `${event.desc} -${amount.toLocaleString()}원`, resolved: true },
        log: addLog(state, `🔑 ${meP.name} 통행료 -${amount.toLocaleString()}원`),
      }
    }
    case 'quiz': {
      return {
        ...state,
        pendingQuiz: event.quiz,
        activeEvent: { title: event.title, text: event.desc, resolved: false, kind: 'quiz' },
      }
    }
    default:
      return state
  }
}

// 턴 마무리 → 승패/턴 판정 후 다음 사람에게
function advanceTurn(state) {
  const me = state.current

  // 공유 시장 회복(매 턴)
  const stock = {}
  Object.keys(PRODUCTS).forEach((id) => {
    stock[id] = Math.min(CONFIG.baseStock, getStock(state, id) + CONFIG.stockRecoverPerTurn)
  })
  const glut = {}
  Object.keys(state.glut || {}).forEach((id) => {
    const g = Math.max(0, state.glut[id] - CONFIG.glutDecayPerTurn)
    if (g > 0) glut[id] = g
  })

  const base = {
    ...state,
    stock,
    glut,
    phase: 'ready',
    dice: null,
    moveOptions: [],
    activeMarket: null,
    activeSource: null,
    activeEvent: null,
    pendingQuiz: null,
  }

  // 즉시 승리: 목표액 도달
  if (state.players[me].cash >= CONFIG.goal) {
    return finish(base, me, `🏆 ${state.players[me].name} 목표 달성! 승리!`)
  }

  // 다음 차례로
  const nextTurnNo = state.turnNo + 1
  if (nextTurnNo > TURNS_PER_PLAYER * 2) {
    // 30턴 종료 → 현금 비교
    const [a, b] = state.players
    let winner
    if (a.cash > b.cash) winner = 0
    else if (b.cash > a.cash) winner = 1
    else winner = 'draw'
    return finish(base, winner, winner === 'draw' ? '무승부!' : `🏆 ${state.players[winner].name} 승리!`)
  }

  return {
    ...base,
    turnNo: nextTurnNo,
    current: (nextTurnNo - 1) % 2,
  }
}

function finish(state, winner, message) {
  return { ...state, phase: 'ended', winner, log: addLog({ ...state, current: state.current }, message) }
}

// ── 봇(AI) 의사결정 (순수 힌트 함수) ─────────────
// 이동 칸 선택: 짐 있으면 시장, 비었으면 산지, 출발점 통과 선호
export function botChooseSteps(state) {
  const p = state.players[state.current]
  let best = state.moveOptions[0]
  let bestScore = -Infinity
  for (const n of state.moveOptions) {
    const to = (p.position + n) % BOARD_SIZE
    const cell = BOARD[to]
    let score = 0
    if (cell.type === 'market') score = p.cargo.length * 3 + 1
    else if (cell.type === 'corner' && cell.subtype === 'bigmarket') score = p.cargo.length * 3 + 3
    else if (cell.type === 'source') score = p.cargo.length < CONFIG.cargoLimit ? 3 : -2
    else if (cell.type === 'golden') score = 1
    else if (cell.type === 'corner' && cell.subtype === 'storm') score = -3
    if (p.position + n >= BOARD_SIZE) score += 2 // 봉급
    if (score > bestScore) {
      bestScore = score
      best = n
    }
  }
  return best
}

// 산지에서 봇이 살 특산물 id 목록 (싼 것 위주로 짐칸 여유만큼)
export function botBuyList(state) {
  const p = state.players[state.current]
  const ids = (state.activeSource.productIds || [])
    .filter((id) => getStock(state, id) > 0)
    .sort((a, b) => getBuyPrice(state, a) - getBuyPrice(state, b))
  const list = []
  let cash = p.cash
  let room = CONFIG.cargoLimit - p.cargo.length
  for (const id of ids) {
    // 현금의 40%까지만, 짐칸 여유만큼, 종류당 최대 2개
    let n = 0
    while (room > 0 && n < 2) {
      const price = getBuyPrice({ ...state, stock: { ...state.stock } }, id)
      if (cash - price < CONFIG.startCash * 0.15) break
      list.push(id)
      cash -= price
      room -= 1
      n += 1
    }
  }
  return list
}
