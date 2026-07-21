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
  buildMarkets,
  initStock,
} from './gameLogic.js'

export const TURNS_PER_PLAYER = 15
const BOARD_SIZE = BOARD.length
export const RANK_WIN = 30 // 온라인 승리 랭크 점수
export const RANK_LOSE = 5 // 온라인 패배 랭크 점수
export const BOT_RANK_WIN = 15 // 봇전은 온라인의 절반
export const BOT_RANK_LOSE = 3
export const TURN_LIMIT_MS = 120 * 1000 // 온라인 한 턴 제한(120초 — 교실 와이파이 로딩 밀림 + 초4 결정 시간 감안)
export const MAX_PLAYERS = 4
// 순서 보너스: 공유 시장을 먼저 쓰는 앞 순서가 유리해서, 뒤 순서일수록 시작 현금을 보정.
// 값은 봇 시뮬 3000판(scripts/simulate-balance.mjs)으로 좌석별 승률 ±2%p 이내로 맞춘 결과.
// (시작 현금은 장사 밑천이라 복리로 불어나서, 명목 격차의 절반쯤만 보정해야 균형이 맞는다)
export const ORDER_BONUS = {
  2: [0, 225],
  3: [0, 220, 420],
  4: [0, 240, 440, 660],
}
export const SECOND_PLAYER_BONUS = 225 // (구) 2인 전용 상수 — 호환용

// 랜덤 도우미(리듀서 밖에서 호출) — planMove/rollDice 는 gameLogic 재사용
export { rollDice }

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// 대전용 이동 계획 (현재 플레이어 위치 기준). gameLogic.planMove 재사용
export function planBattleMove(state, steps) {
  const pos = state.players[state.current].position
  return planMove({ position: pos, markets: state.markets }, steps)
}

// ── 초기 상태 ──────────────────────────────────
// names: 참가자 이름 배열(2~4명), mode: 'local' | 'bot' | 'online'
export function createBattleState(names = ['플레이어1', '플레이어2'], mode = 'bot') {
  const bonus = ORDER_BONUS[names.length] || ORDER_BONUS[2]
  return {
    mode,
    players: names.map((name, i) => ({
      name,
      cash: CONFIG.startCash + (bonus[i] || 0),
      cargo: [],
      position: 0,
      laps: 0,
      skipNext: false,
      out: false, // 중도 이탈(항복) 여부
      turnsTaken: 0, // 마친 턴 수 (모두 같은 턴 수를 마쳐야 공정한 판정)
    })),
    current: 0, // 이번 차례 (좌석 번호)
    turnNo: 1, // 1..30
    // 공유 시장/보드
    sources: buildSources(),
    markets: buildMarkets(),
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

    // 시간 초과: 어느 단계에 있든 이번 차례를 끝내고 다음 사람에게 (온라인 120초 제한)
    case 'TIMEOUT': {
      if (state.phase === 'ended') return state
      return advanceTurn({ ...state, log: addLog(state, `⏰ ${state.players[state.current].name} 시간 초과 — 차례를 넘겨요.`) })
    }

    // 항복/중도 이탈: 그 사람은 탈락 처리, 남은 사람이 1명이면 그 사람 승리
    case 'SURRENDER': {
      const seat = action.seat
      if (state.phase === 'ended') return state
      if (!state.players[seat] || state.players[seat].out) return state
      const players = setPlayer(state.players, seat, { out: true })
      const s = { ...state, players, log: addLog(state, `🏳️ ${state.players[seat].name} 항복!`) }
      const active = activeSeats(players)
      if (active.length === 1) {
        return finish(s, active[0], `🏆 ${players[active[0]].name} 승리!`)
      }
      if (state.current === seat) {
        // 항복한 사람 차례였으면 그 차례를 정리하고 다음 사람에게
        return {
          ...s,
          phase: 'ready',
          dice: null,
          moveOptions: [],
          activeMarket: null,
          activeSource: null,
          activeEvent: null,
          pendingQuiz: null,
          current: nextActiveSeat(players, seat),
        }
      }
      return s
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
    next.activeMarket = { ...plan.market, isBig: false }
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
      return { ...state, activeMarket: { ...plan.market, isBig: true } }
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

// 탈락하지 않은 좌석 번호 목록
export function activeSeats(players) {
  return players.map((p, i) => (p.out ? -1 : i)).filter((i) => i >= 0)
}

// 다음 차례(탈락자 건너뛰기)
export function nextActiveSeat(players, from) {
  const n = players.length
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n
    if (!players[i].out) return i
  }
  return from
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

  const players = setPlayer(state.players, me, { turnsTaken: (state.players[me].turnsTaken || 0) + 1 })
  const base = {
    ...state,
    players,
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

  // 공정한 판정: "남은 사람 모두가 같은 횟수의 턴"을 마친 순간에만 결과를 낸다.
  //  (누가 먼저 목표를 달성해도 나머지에게 같은 차례가 보장돼 순서 유리가 없어요)
  const active = activeSeats(players)
  const counts = active.map((i) => players[i].turnsTaken || 0)
  const roundDone = counts.every((c) => c === counts[0])
  const anyReached = active.some((i) => players[i].cash >= CONFIG.goal)

  if (roundDone && (anyReached || counts[0] >= TURNS_PER_PLAYER)) {
    return finishByCash(base) // 목표 달성 or 정해진 턴 모두 소진 → 현금 비교
  }
  if (anyReached) {
    base.log = addLog(
      { ...base, current: me },
      '🎯 목표 달성! 남은 친구들이 같은 차례를 마치면 결과가 나와요.',
    )
  }

  return {
    ...base,
    turnNo: state.turnNo + 1,
    current: nextActiveSeat(players, me),
  }
}

function finish(state, winner, message) {
  return { ...state, phase: 'ended', winner, log: addLog({ ...state, current: state.current }, message) }
}

// 현금이 가장 많은 사람 승리 (공동 1등이면 무승부)
function finishByCash(state) {
  const active = activeSeats(state.players)
  const top = Math.max(...active.map((i) => state.players[i].cash))
  const winners = active.filter((i) => state.players[i].cash === top)
  const winner = winners.length === 1 ? winners[0] : 'draw'
  return finish(state, winner, winner === 'draw' ? '🤝 무승부!' : `🏆 ${state.players[winner].name} 승리!`)
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
