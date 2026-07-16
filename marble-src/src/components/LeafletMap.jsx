// LeafletMap.jsx — 무료 지도(Leaflet + OpenStreetMap/CARTO 타일)
//  - API 키·비즈앱 등록 필요 없음! 인터넷만 있으면 진짜 지도가 떠요.
//  - KoreaMap(SVG)/KakaoMap 과 같은 props 를 받아 서로 바꿔 쓸 수 있어요.
//  - 각 지역 좌표에 특산물 핀(클릭 가능)을 얹습니다.
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MAP_REGIONS, MAP_REGION_BY_KEY, MAP_CENTER, PRODUCTS } from '../data.js'

export default function LeafletMap({
  onRegionClick, // 지역/특산물을 눌렀을 때 그 key(지역명 또는 특산물 id)를 전달
  selected = null,
  feedback = null,
  clickableOnlyProducts = false,
  markerMode = 'region', // 'region' = 지역 핀 6개 / 'product' = 특산물 핀(실제 산지 위치)
  focusRegion = null, // 이 권역으로 확대 + 그 권역 특산물만 표시(드릴다운 2단계)
  onFail,
}) {
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const cbRef = useRef(onRegionClick)
  cbRef.current = onRegionClick // 항상 최신 콜백 사용

  const [ready, setReady] = useState(false)

  // 지도 초기화 (최초 1회)
  useEffect(() => {
    if (!boxRef.current) return
    let map
    try {
      map = L.map(boxRef.current, {
        center: [MAP_CENTER.lat, MAP_CENTER.lng],
        zoom: 7,
        minZoom: 6,
        maxZoom: 12,
        scrollWheelZoom: true,
        attributionControl: true,
      })
      // 무료 지도 타일 (CARTO Voyager — 파스텔·부드러운 톤, 키 불필요)
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          subdomains: 'abcd',
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        },
      ).addTo(map)

      // 특정 권역으로 확대(드릴다운) 또는 우리나라 전체 보기
      const focusPts = focusRegion
        ? Object.values(PRODUCTS)
            .filter((p) => p.region === focusRegion && p.lat != null)
            .map((p) => [p.lat, p.lng])
        : null
      if (focusPts && focusPts.length) {
        map.fitBounds(focusPts, { padding: [70, 70], maxZoom: 10 })
      } else {
        map.fitBounds([
          [33.1, 125.5],
          [38.7, 129.8],
        ])
      }
      mapRef.current = map
      setReady(true)
      // 컨테이너 크기 반영(탭 전환 등으로 늦게 그려질 때 대비)
      setTimeout(() => map.invalidateSize(), 100)
    } catch (e) {
      onFail && onFail()
    }

    return () => {
      if (map) map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 핀(마커) 그리기/갱신
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    if (markerMode === 'product') {
      drawProductMarkers(map)
    } else {
      drawRegionMarkers(map)
    }

    function drawRegionMarkers(map) {
      MAP_REGIONS.forEach((r) => {
        if (r.lat == null) return
        const clickable = !clickableOnlyProducts || r.hasProducts

        let bg = r.hasProducts ? r.color : '#90A4AE'
        if (selected === r.key) bg = r.color
        if (feedback && feedback.region === r.key) {
          bg = feedback.correct ? '#2e7d32' : '#c62828'
        }

        const html =
          `<div class="region-pin${clickable ? '' : ' disabled'}" style="background:${bg}">` +
          `<span class="rp-emoji">${r.emoji || '📍'}</span>` +
          `<span class="rp-label">${r.label}</span>` +
          `</div>`

        const icon = L.divIcon({
          className: 'region-pin-wrap',
          html,
          iconSize: [66, 46],
          iconAnchor: [33, 46],
        })

        const marker = L.marker([r.lat, r.lng], {
          icon,
          interactive: clickable,
          zIndexOffset: selected === r.key ? 1000 : 0,
        }).addTo(map)

        if (clickable) marker.on('click', () => cbRef.current && cbRef.current(r.key))
        markersRef.current.push(marker)
      })
    }

    function drawProductMarkers(map) {
      Object.values(PRODUCTS).forEach((p) => {
        if (p.lat == null) return
        if (focusRegion && p.region !== focusRegion) return // 드릴다운: 그 권역만
        const regionColor = (MAP_REGION_BY_KEY[p.region] || {}).color || '#4CAF50'
        const on = selected === p.id

        const html =
          `<div class="product-pin${on ? ' on' : ''}" style="background:${regionColor}">` +
          `<span class="pp-emoji">${p.emoji}</span>` +
          `<span class="pp-label">${p.name}</span>` +
          `</div>`

        const icon = L.divIcon({
          className: 'region-pin-wrap',
          html,
          iconSize: [58, 42],
          iconAnchor: [29, 42],
        })

        const marker = L.marker([p.lat, p.lng], {
          icon,
          zIndexOffset: on ? 1000 : 0,
        }).addTo(map)

        marker.bindPopup(
          `<div class="pin-popup"><b>${p.emoji} ${p.name}</b>` +
            `<br/>${p.region} · <b>${p.origin}</b>` +
            `<br/>기준가 ${p.basePrice.toLocaleString()}원</div>`,
        )
        marker.on('click', () => cbRef.current && cbRef.current(p.id))
        markersRef.current.push(marker)
      })
    }
  }, [ready, selected, feedback, clickableOnlyProducts, markerMode, focusRegion])

  return <div ref={boxRef} className="leaflet-box" />
}
