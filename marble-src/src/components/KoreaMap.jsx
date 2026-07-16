// KoreaMap.jsx — 전국을 간단한 도형으로 그린 그림지도(SVG)
//  - 라이브러리·인터넷 없이 동작 (path 좌표는 data.js 에 있음)
//  - 지역을 누르면 onRegionClick(지역이름) 이 불립니다.
//  - selected: 강조할 지역, feedback: { region, correct } 정답/오답 색 표시
import { useState } from 'react'
import { MAP_VIEWBOX, MAP_REGIONS } from '../data.js'

export default function KoreaMap({
  onRegionClick,
  selected = null,
  feedback = null, // { region, correct: true|false }
  showLabels = true,
  clickableOnlyProducts = false, // 퀴즈에서 특산물 지역만 누르게 할지
}) {
  const [hover, setHover] = useState(null)

  function fillFor(r) {
    // 정답/오답 피드백 색이 최우선
    if (feedback && feedback.region === r.key) {
      return feedback.correct ? '#2e7d32' : '#c62828'
    }
    if (selected === r.key) return r.color
    if (hover === r.key) return r.color
    // 기본은 지역색을 옅게
    return r.hasProducts ? r.color : '#CFD8DC'
  }

  function opacityFor(r) {
    if (feedback && feedback.region === r.key) return 1
    if (selected === r.key || hover === r.key) return 1
    return 0.55
  }

  return (
    <svg className="korea-map" viewBox={MAP_VIEWBOX} role="img" aria-label="우리나라 지도">
      {/* 바다 배경 */}
      <rect x="0" y="0" width="360" height="480" fill="#E1F5FE" rx="20" />

      {MAP_REGIONS.map((r) => {
        const isClickable = !clickableOnlyProducts || r.hasProducts
        return (
          <g key={r.key}>
            <path
              d={r.path}
              fill={fillFor(r)}
              fillOpacity={opacityFor(r)}
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinejoin="round"
              style={{ cursor: isClickable ? 'pointer' : 'default', transition: 'fill-opacity 0.12s' }}
              onMouseEnter={() => isClickable && setHover(r.key)}
              onMouseLeave={() => setHover(null)}
              onClick={() => isClickable && onRegionClick && onRegionClick(r.key)}
            />
            {showLabels && (
              <text
                x={r.labelX}
                y={r.labelY}
                textAnchor="middle"
                className="map-label"
                pointerEvents="none"
              >
                {r.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
