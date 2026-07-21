// simulate-balance.mjs — 봇끼리 N인전을 여러 판 돌려 좌석(순서)별 승률을 확인하는 스크립트.
// ORDER_BONUS(순서 보너스) 값을 조정할 때 근거로 쓴다.
// 실행: node scripts/simulate-balance.mjs [인원수] [판수] [보너스목록]
//   예: node scripts/simulate-balance.mjs 4 1000 0,250,450,650   (기본: 소스의 ORDER_BONUS)
import {
  battleReducer,
  createBattleState,
  planBattleMove,
  botChooseSteps,
  rollDice,
} from '../src/battleLogic.js'
import { CONFIG } from '../src/data.js'

const bonusOverride = process.argv[4]
  ? process.argv[4].split(',').map((v) => Number(v) || 0)
  : null

function playGame(n) {
  let s = createBattleState(
    Array.from({ length: n }, (_, i) => `봇${i + 1}`),
    'local',
  )
  if (bonusOverride) {
    s = {
      ...s,
      players: s.players.map((p, i) => ({ ...p, cash: CONFIG.startCash + (bonusOverride[i] || 0) })),
    }
  }
  let guard = 0
  while (s.phase !== 'ended' && guard++ < 2000) {
    if (s.phase === 'ready') {
      s = s.players[s.current].skipNext
        ? battleReducer(s, { type: 'SKIP_TURN' })
        : battleReducer(s, { type: 'ROLL', dice: rollDice() })
    } else if (s.phase === 'choose') {
      s = battleReducer(s, { type: 'MOVE', plan: planBattleMove(s, botChooseSteps(s)) })
    } else if (s.phase === 'action') {
      s = battleReducer(s, { type: 'BOT_ACTION' })
    } else {
      break // 예상 못 한 상태면 중단 (무한 루프 방지)
    }
  }
  return s
}

const n = Number(process.argv[2] || 4)
const games = Number(process.argv[3] || 300)
const wins = Array(n).fill(0)
const cashSum = Array(n).fill(0)
let draws = 0

for (let g = 0; g < games; g++) {
  const s = playGame(n)
  if (s.winner === 'draw' || s.winner == null) draws++
  else wins[s.winner]++
  s.players.forEach((p, i) => {
    cashSum[i] += p.cash
  })
}

console.log(`\n${n}인전 ${games}판 결과`)
wins.forEach((w, i) => {
  console.log(
    `  ${i}번 자리: 승 ${w} (${((100 * w) / games).toFixed(1)}%) · 평균 현금 ${Math.round(cashSum[i] / games).toLocaleString()}원`,
  )
})
console.log(`  무승부: ${draws}판`)
