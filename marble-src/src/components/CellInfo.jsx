// CellInfo.jsx — 게임판 칸을 클릭하면 그 칸의 특성을 설명하는 카드
// (게임 진행과 무관하게 언제든 눌러서 배울 수 있어요. 1인·대전 공용)
import { BOARD, PRODUCTS, MARKET_TYPE_BY_KEY, CONFIG } from '../data.js'

// 칸 index + 게임 상태(sources/markets) → 설명 내용
export function buildCellInfo(index, state) {
  const cell = BOARD[index]

  if (cell.type === 'source') {
    const src = (state.sources && state.sources[index]) || { region: cell.region, productIds: [] }
    return {
      title: `🌱 ${src.region} 산지`,
      lines: [
        '여기 도착하면 특산물을 산지 가격으로 살 수 있어요.',
        ...src.productIds.map((id) => {
          const p = PRODUCTS[id]
          return `${p.emoji} ${p.name} — ${src.region} ${p.origin}의 특산물 (${categoryLabel(p.category)})`
        }),
        '많이 사면 재고가 줄어 값이 올라가요. 📈',
      ],
    }
  }

  if (cell.type === 'market') {
    const typeKey = (state.markets && state.markets[index]) || 'direct'
    const mt = MARKET_TYPE_BY_KEY[typeKey]
    if (mt.specialty) {
      return {
        title: `${mt.emoji} ${mt.name}`,
        lines: [
          mt.desc,
          `${categoryLabel(mt.specialty)}은(는) ×${CONFIG.matchMin}~${CONFIG.matchMax}로 비싸게!`,
          `다른 물건은 ×${CONFIG.otherMin}~${CONFIG.otherMax}로 싸게 사줘요.`,
          '내 짐칸에 맞는 시장을 찾아가는 게 이득이에요! 🧠',
        ],
      }
    }
    return {
      title: `${mt.emoji} ${mt.name}`,
      lines: [mt.desc, `모든 물건을 ×${CONFIG.directMin}~${CONFIG.directMax}로 사줘요.`],
    }
  }

  if (cell.type === 'golden') {
    return {
      title: '🔑 황금열쇠',
      lines: [
        '도착하면 랜덤 카드를 한 장 뽑아요. 무엇이 나올까요?',
        '📈 수요 폭등 — 어떤 특산물 판매가가 2배로!',
        '🌧️ 흉년 — 어떤 산지의 매입가가 올라가요',
        '🪙 보너스 코인 / 💸 통행료',
        '❓ 특산물 퀴즈 — 맞히면 보너스!',
      ],
    }
  }

  // 코너 4칸
  switch (cell.subtype) {
    case 'start':
      return {
        title: '🚩 출발',
        lines: [`한 바퀴를 돌아 출발점을 지날 때마다 봉급 ${CONFIG.salary.toLocaleString()}원을 받아요.`],
      }
    case 'bigmarket':
      return {
        title: '🎪 큰장',
        lines: [
          '가장 큰 장이 서는 곳!',
          `모든 물건을 ×${CONFIG.bigMarketMin}~${CONFIG.bigMarketMax}로 최고가에 사줘요.`,
        ],
      }
    case 'storm':
      return {
        title: '🌀 폭풍',
        lines: ['비바람이 몰아쳐요! 도착하면 다음 내 차례는 한 턴 쉬어야 해요.'],
      }
    case 'festival':
      return {
        title: '🎉 축제',
        lines: ['축제가 열려 어떤 특산물의 수요가 폭등해요!', '그 특산물은 게임 끝까지 판매가 2배!'],
      }
    default:
      return { title: cell.name, lines: [] }
  }
}

function categoryLabel(cat) {
  return { 수산물: '🐟 수산물', 농산물: '🌾 농산물', 과일: '🍎 과일', 축산가공: '🥩 축산·가공품' }[cat] || cat
}

export default function CellInfoModal({ index, state, onClose }) {
  if (index == null) return null
  const info = buildCellInfo(index, state)
  return (
    <div className="result-overlay" onClick={onClose}>
      <div className="result-card cell-info-card" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{info.title}</h2>
        <ul className="cell-info-lines">
          {info.lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
        <button className="btn btn-primary" onClick={onClose}>
          알겠어요!
        </button>
      </div>
    </div>
  )
}
