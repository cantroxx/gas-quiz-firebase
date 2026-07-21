// ============================================================
// gameLogic.js — 게임 규칙 (순수 리듀서)
// 화면(React)과 분리해 두어서, 규칙을 바꿔도 화면 코드는 안 건드립니다.
// (marble-src/gameLogic.js 와 같은 방식)
// ============================================================
import {
  REGIONS,
  REGION_BY_KEY,
  PRODUCTS,
  PRODUCTS_BY_REGION,
  CARTS,
  EVENTS,
  CONFIG,
  travelType,
} from './data.js'

// ── 지역 사이 길 찾기 ──────────────────────────────
// BFS(너비 우선 탐색)로 모든 지역에서 모든 지역까지의
// 가장 짧은 경로(어느 지역들을 거치는지)를 미리 계산해 둡니다.
const ROUTES = (() => {
  const routes = {}
  REGIONS.forEach((start) => {
    const prev = { [start.key]: null } // 어느 지역에서 왔는지 기록
    const queue = [start.key]
    while (queue.length) {
      const cur = queue.shift()
      const r = REGION_BY_KEY[cur]
      ;[...r.neighbors, ...r.ferries].forEach((next) => {
        if (!(next in prev)) {
          prev[next] = cur
          queue.push(next)
        }
      })
    }
    routes[start.key] = prev
  })
  return routes
})()

// 이동 계획: 거쳐 가는 경로·걸리는 날·여비를 한 번에 계산
// (예: 서울→전남 = 서울→경기→충남→전북→전남, 4일, 12,000원)
export function travelPlan(fromKey, toKey) {
  if (fromKey === toKey) return null
  const prev = ROUTES[fromKey]
  if (!prev || !(toKey in prev)) return null
  const path = []
  let k = toKey
  while (k !== null && k !== undefined) {
    path.unshift(k)
    k = prev[k]
  }
  let cost = 0
  let hasSea = false
  for (let i = 1; i < path.length; i++) {
    const type = travelType(path[i - 1], path[i])
    if (type === 'sea') {
      cost += CONFIG.seaCost
      hasSea = true
    } else {
      cost += CONFIG.landCost
    }
  }
  return { path, days: path.length - 1, cost, hasSea }
}

// 두 지역이 몇 번 이동 거리인지 (판매가 계산에 사용)
export function hops(fromKey, toKey) {
  if (fromKey === toKey) return 0
  const plan = travelPlan(fromKey, toKey)
  return plan ? plan.days : 99
}

// ── 가격 계산 (100원 단위로 반올림) ────────────────
const round100 = (x) => Math.round(x / 100) * 100

// 살 때: 산지에서만 살 수 있고, 기준가 × 0.8 (풍년이면 × 0.7 추가)
export function buyPrice(productId, state) {
  const p = PRODUCTS[productId]
  let price = p.basePrice * CONFIG.buyFactor
  if (state?.localEvent?.kind === 'harvest') price *= CONFIG.harvestDiscount
  return round100(price)
}

// 팔 때: 산지에서 멀수록 비싸고, 대도시(marketBonus)면 더 비싸고, 축제·뉴스면 더!
export function sellPrice(productId, regionKey, state) {
  const p = PRODUCTS[productId]
  const region = REGION_BY_KEY[regionKey]
  let price =
    p.basePrice *
    (CONFIG.homeSellFactor + CONFIG.hopStep * hops(p.region, regionKey)) *
    region.marketBonus
  // 축제 이벤트는 "지금 내가 있는 지역"에서만 적용
  if (state?.localEvent?.kind === 'festival' && regionKey === state.pos) {
    price *= CONFIG.festivalBonus
  }
  // 오늘의 뉴스: 그 지역이 그 특산물을 비싸게 사줘요
  if (state?.news && state.news.id === productId && state.news.region === regionKey) {
    price *= CONFIG.newsBonus
  }
  return round100(price)
}

// 짐칸에 실린 개수 합계
export function bagCount(bag) {
  return Object.values(bag).reduce((sum, item) => sum + item.count, 0)
}

// ── 배달 퀘스트 만들기 ─────────────────────────────
// "OO를 N개 △△(으)로!" — 산지에서 2번 이상 이동해야 하는 곳으로 보냅니다.
export function makeQuest(excludeId) {
  const ids = Object.keys(PRODUCTS).filter((id) => id !== excludeId)
  const id = ids[Math.floor(Math.random() * ids.length)]
  const p = PRODUCTS[id]
  const destinations = REGIONS.filter((r) => hops(p.region, r.key) >= 2)
  const dest = destinations[Math.floor(Math.random() * destinations.length)]
  const qty =
    CONFIG.questQtyMin +
    Math.floor(Math.random() * (CONFIG.questQtyMax - CONFIG.questQtyMin + 1))
  const reward =
    Math.round((qty * p.basePrice * CONFIG.questRewardFactor) / 1000) * 1000
  return { id, qty, to: dest.key, reward }
}

// ── 오늘의 뉴스 만들기 ─────────────────────────────
// 특산물 하나 + 산지가 아닌 지역 하나를 뽑아 "그 지역이 비싸게 사줘요!" 뉴스를 냅니다.
export function makeNews() {
  const ids = Object.keys(PRODUCTS)
  const id = ids[Math.floor(Math.random() * ids.length)]
  const p = PRODUCTS[id]
  const candidates = REGIONS.filter((r) => r.key !== p.region)
  const region = candidates[Math.floor(Math.random() * candidates.length)]
  return { id, region: region.key }
}

// ── 도착 이벤트 뽑기 ───────────────────────────────
function rollEvent(regionKey) {
  if (Math.random() > CONFIG.eventChance) return null
  const hasProducts = (PRODUCTS_BY_REGION[regionKey] || []).length > 0
  const pool = EVENTS.filter((e) => e.kind !== 'harvest' || hasProducts)
  return pool[Math.floor(Math.random() * pool.length)]
}

// ── 게임 상태 ──────────────────────────────────────
export function initGame() {
  return {
    day: 1,
    cash: CONFIG.startCash,
    pos: CONFIG.startRegion,
    visited: { [CONFIG.startRegion]: true },
    bag: {}, // { 특산물id: { count, paid } } — paid 는 산 값 합계(이익 계산용)
    cartLevel: 0, // CARTS 의 몇 번째 수레인지
    codex: {}, // 도감: 한 번이라도 사 본 특산물
    quest: makeQuest(),
    news: makeNews(), // 오늘의 뉴스 (이동할 때마다 새로 나와요)
    localEvent: null, // 지금 지역에서 일어난 이벤트 (이동하면 사라짐)
    log: [{ day: 1, text: `${CONFIG.startRegion}에서 장사를 시작했어요! 🚩` }],
    over: false,
  }
}

function addLog(state, text) {
  return [{ day: state.day, text }, ...state.log].slice(0, 40)
}

// ── 이어하기: 기기에 저장된 판 불러오기 ────────────
// 데이터가 옛 버전이거나 깨졌으면 조용히 버리고 새 판을 시작합니다.
export function loadSavedGame() {
  try {
    const raw = localStorage.getItem('geosang_save')
    if (!raw) return null
    const s = JSON.parse(raw)
    if (!s || s.over) return null
    if (typeof s.day !== 'number' || typeof s.cash !== 'number') return null
    if (!REGION_BY_KEY[s.pos]) return null
    if (!s.quest || !PRODUCTS[s.quest.id] || !REGION_BY_KEY[s.quest.to]) return null
    if (!s.news || !PRODUCTS[s.news.id] || !REGION_BY_KEY[s.news.region]) return null
    if (!CARTS[s.cartLevel]) return null
    for (const id of Object.keys(s.bag || {})) {
      if (!PRODUCTS[id]) return null
    }
    s.bag = s.bag || {}
    s.visited = s.visited || { [s.pos]: true }
    s.codex = s.codex || {}
    s.log = Array.isArray(s.log) ? s.log : []
    if (s.localEvent === undefined) s.localEvent = null
    return s
  } catch (e) {
    return null
  }
}

export function reducer(state, action) {
  switch (action.type) {
    case 'TRAVEL': {
      if (state.over) return state
      const plan = travelPlan(state.pos, action.to)
      if (!plan) return state
      const remain = CONFIG.maxDays - state.day
      if (plan.days > remain) {
        return { ...state, log: addLog(state, `남은 날(${remain}일)이 모자라서 거기까지 못 가요… ⏳`) }
      }
      if (state.cash < plan.cost) {
        return { ...state, log: addLog(state, `여비 ${plan.cost.toLocaleString()}원이 모자라서 못 떠났어요… 😢`) }
      }
      const region = REGION_BY_KEY[action.to]
      const newDay = state.day + plan.days
      const over = newDay >= CONFIG.maxDays
      const visited = { ...state.visited }
      plan.path.forEach((k) => {
        visited[k] = true
      })
      const next = {
        ...state,
        day: newDay,
        cash: state.cash - plan.cost,
        pos: action.to,
        visited,
        localEvent: null,
        over,
      }
      const how = plan.hasSea ? '🚢 배와 수레로' : '🛞 수레를 끌고'
      const dayTxt = plan.days > 1 ? `${plan.days}일 동안 달려 ` : ''
      next.log = addLog(next, `${how} ${dayTxt}${region.name}에 도착! (여비 -${plan.cost.toLocaleString()}원)`)

      if (!over) {
        // 새 날 = 새 뉴스
        next.news = makeNews()
        const np = PRODUCTS[next.news.id]
        next.log = addLog(next, `📢 뉴스: ${REGION_BY_KEY[next.news.region].name}에서 ${np.emoji} ${np.name} 값이 올랐대요!`)
        // 도착 이벤트 (가끔!)
        const ev = rollEvent(action.to)
        if (ev) {
          next.localEvent = ev
          if (ev.kind === 'toll') next.cash = Math.max(0, next.cash - ev.amount)
          if (ev.kind === 'lucky') next.cash += ev.amount
          next.log = addLog(next, `${ev.emoji} ${ev.title} ${ev.desc}`)
        }
      } else {
        // 마지막 날: 남은 물건은 이곳 시세로 모두 팔아 정산
        let income = 0
        Object.entries(next.bag).forEach(([id, item]) => {
          income += sellPrice(id, action.to, next) * item.count
        })
        if (income > 0) {
          next.cash += income
          next.bag = {}
          next.log = addLog(next, `마지막 날! 남은 물건을 모두 팔았어요 (+${income.toLocaleString()}원) 🧺`)
        }
        next.log = addLog(next, `장사가 끝났어요! 최종 ${next.cash.toLocaleString()}원 🏁`)
      }
      return next
    }

    case 'BUY': {
      if (state.over) return state
      const id = action.id
      const here = PRODUCTS_BY_REGION[state.pos] || []
      if (!here.includes(id)) return state
      const cap = CARTS[state.cartLevel].cap
      if (bagCount(state.bag) >= cap) {
        return { ...state, log: addLog(state, `짐칸이 가득 찼어요! 수레를 키우거나 물건을 팔아요. 🎒`) }
      }
      const price = buyPrice(id, state)
      if (state.cash < price) return state
      const item = state.bag[id] || { count: 0, paid: 0 }
      return {
        ...state,
        cash: state.cash - price,
        bag: { ...state.bag, [id]: { count: item.count + 1, paid: item.paid + price } },
        codex: { ...state.codex, [id]: true },
      }
    }

    case 'SELL': {
      if (state.over) return state
      const id = action.id
      const item = state.bag[id]
      if (!item || item.count === 0) return state
      const price = sellPrice(id, state.pos, state)
      const qty = action.all ? item.count : 1
      const income = price * qty
      const paidUsed = Math.round((item.paid / item.count) * qty) // 판 만큼의 산 값
      const bag = { ...state.bag }
      if (item.count - qty <= 0) delete bag[id]
      else bag[id] = { count: item.count - qty, paid: item.paid - paidUsed }
      const profit = income - paidUsed
      const next = { ...state, cash: state.cash + income, bag }
      next.log = addLog(
        next,
        `${PRODUCTS[id].emoji} ${PRODUCTS[id].name} ${qty}개를 ${income.toLocaleString()}원에 팔았어요! (${profit >= 0 ? '이익 +' : '손해 '}${profit.toLocaleString()}원)`,
      )
      return next
    }

    case 'UPGRADE': {
      if (state.over) return state
      const nextCart = CARTS[state.cartLevel + 1]
      if (!nextCart || state.cash < nextCart.price) return state
      const next = { ...state, cash: state.cash - nextCart.price, cartLevel: state.cartLevel + 1 }
      next.log = addLog(next, `${nextCart.emoji} ${nextCart.name}(으)로 바꿨어요! 짐칸 ${nextCart.cap}칸!`)
      return next
    }

    case 'DELIVER': {
      if (state.over) return state
      const q = state.quest
      const item = state.bag[q.id]
      if (state.pos !== q.to || !item || item.count < q.qty) return state
      const paidUsed = Math.round((item.paid / item.count) * q.qty)
      const bag = { ...state.bag }
      if (item.count - q.qty <= 0) delete bag[q.id]
      else bag[q.id] = { count: item.count - q.qty, paid: item.paid - paidUsed }
      const next = {
        ...state,
        cash: state.cash + q.reward,
        bag,
        quest: makeQuest(q.id),
      }
      next.log = addLog(
        next,
        `📦 배달 완료! ${PRODUCTS[q.id].emoji} ${PRODUCTS[q.id].name} ${q.qty}개를 전하고 ${q.reward.toLocaleString()}원을 받았어요!`,
      )
      return next
    }

    case 'RESET':
      return initGame()

    default:
      return state
  }
}
