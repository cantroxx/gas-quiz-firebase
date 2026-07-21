// TravelMap.jsx — 전국 시·도 경계 지도 (Leaflet + GeoJSON, 지도 타일 없음)
//  - 문화유산 게임(seoul-heritage)과 같은 방식: 우리나라만 교과서 톤으로 깔끔하게.
//  - 지역을 누르면 바로 이동하지 않고, 지역 정보 창(onSelect)을 엽니다.
//  - 색: 주황 = 내 위치 / 연두 = 가 본 곳 / 베이지 = 아직 안 가 본 곳
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import provinces from '../geo/provinces.json'
import { REGIONS, REGION_BY_KEY, FERRY_ROUTES } from '../data.js'

// GeoJSON 파일의 지역 이름(2013년 기준) → 게임에서 쓰는 짧은 이름
const GEO_NAME_TO_KEY = {
  서울특별시: '서울', 인천광역시: '인천', 경기도: '경기', 강원도: '강원',
  충청북도: '충북', 충청남도: '충남', 세종특별자치시: '세종', 대전광역시: '대전',
  전라북도: '전북', 전라남도: '전남', 광주광역시: '광주', 경상북도: '경북',
  대구광역시: '대구', 경상남도: '경남', 울산광역시: '울산', 부산광역시: '부산',
  제주특별자치도: '제주',
}

// 상태별 지역 색
const STYLE = {
  current: { color: '#BF360C', weight: 2.5, fillColor: '#FF8A65', fillOpacity: 0.9 },
  visited: { color: '#558B2F', weight: 1.5, fillColor: '#C5E1A5', fillOpacity: 0.85 },
  normal: { color: '#A1887F', weight: 1.5, fillColor: '#FFECB3', fillOpacity: 0.85 },
}

export default function TravelMap({ pos, visited, questRegion, onSelect }) {
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const layersRef = useRef({}) // 지역 key → 폴리곤 레이어
  const labelsRef = useRef([])
  const cbRef = useRef(onSelect)
  cbRef.current = onSelect
  // 마우스를 올렸다 뗄 때 원래 색으로 되돌리기 위한 최신 상태 기억
  const stateRef = useRef({ pos, visited })
  stateRef.current = { pos, visited }

  const [ready, setReady] = useState(false)

  const styleFor = (key) => {
    const s = stateRef.current
    if (key === s.pos) return STYLE.current
    if (s.visited[key]) return STYLE.visited
    return STYLE.normal
  }

  // 지도 초기화 (최초 1회)
  useEffect(() => {
    if (!boxRef.current) return
    const map = L.map(boxRef.current, {
      minZoom: 6,
      maxZoom: 9,
      zoomSnap: 0.5,
      scrollWheelZoom: true,
      attributionControl: false,
    })
    L.control
      .attribution({ prefix: false })
      .addAttribution('지도: 통계청 시·도 경계(2013) · southkorea-maps')
      .addTo(map)
    map.setView([36.1, 127.7], 6.5)

    // 시·도 경계 그리기
    L.geoJSON(provinces, {
      style: () => STYLE.normal,
      onEachFeature: (feature, layer) => {
        const key = GEO_NAME_TO_KEY[feature.properties.name]
        if (!key) return
        layersRef.current[key] = layer
        layer.on('click', () => cbRef.current && cbRef.current(key))
        layer.on('mouseover', () => layer.setStyle({ weight: 3.5, fillOpacity: 1 }))
        layer.on('mouseout', () => layer.setStyle(styleFor(key)))
      },
    }).addTo(map)

    // 제주 뱃길을 점선으로 표시
    FERRY_ROUTES.forEach(([a, b]) => {
      const ra = REGION_BY_KEY[a]
      const rb = REGION_BY_KEY[b]
      L.polyline(
        [
          [ra.lat, ra.lng],
          [rb.lat, rb.lng],
        ],
        { color: '#0288D1', weight: 2, dashArray: '6 8', opacity: 0.7, interactive: false },
      ).addTo(map)
    })

    mapRef.current = map
    setReady(true)
    // 화면이 다 그려진 뒤 크기를 다시 재고 전국 보기로 맞춤
    setTimeout(() => {
      map.invalidateSize()
      map.setView([36.1, 127.7], 6.5)
    }, 150)

    return () => {
      map.remove()
      mapRef.current = null
      layersRef.current = {}
      labelsRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 지역 색 + 이름표 갱신 (위치/방문/퀘스트가 바뀔 때마다)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    Object.entries(layersRef.current).forEach(([key, layer]) => {
      layer.setStyle(styleFor(key))
      if (key === pos) layer.bringToFront()
    })

    labelsRef.current.forEach((m) => m.remove())
    labelsRef.current = []
    REGIONS.forEach((r) => {
      const isMe = r.key === pos
      const badge = questRegion === r.key ? ' 🛒' : ''
      const html = `<div class="region-label${isMe ? ' me' : ''}">${isMe ? '🧑‍🌾' : r.emoji} ${r.key}${badge}</div>`
      const icon = L.divIcon({ className: 'region-label-wrap', html, iconSize: [86, 26], iconAnchor: [43, 13] })
      const marker = L.marker([r.lat, r.lng], { icon, zIndexOffset: isMe ? 1000 : 0 }).addTo(map)
      marker.on('click', () => cbRef.current && cbRef.current(r.key))
      labelsRef.current.push(marker)
    })
  }, [ready, pos, visited, questRegion])

  return <div ref={boxRef} className="leaflet-box" />
}
