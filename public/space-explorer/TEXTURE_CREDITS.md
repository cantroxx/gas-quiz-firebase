# 3D 천체 지도 출처

화면과 저장된 3D 촬영 기록은 아래 지도를 구체에 입혀 조명·시점을 계산한 **3D 재현**입니다. 원본 관측 사진과 구분합니다. 실제 사진 20장의 출처는 [IMAGE_CREDITS.md](IMAGE_CREDITS.md)에 있습니다.

## 달

- 제작: NASA's Scientific Visualization Studio / Ernie Wright. 원자료: Lunar Reconnaissance Orbiter, LROC / Arizona State University, LOLA.
- 출처: [NASA CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/), 2025 color map, 2048×1024.
- 이용: [NASA 이미지·미디어 이용 지침](https://www.nasa.gov/nasa-brand-center/images-and-media/). NASA의 보증·추천을 의미하지 않습니다.
- LRO 관측으로 구성된 전구 지도로 앞면과 뒷면을 모두 표현합니다. 색·노출 보정 및 극지방의 저해상도 대체 자료가 포함됩니다. 과학 분석용 원자료가 아닌 시각화용 지도입니다.
- 로컬 파일: `textures/moon.jpg`. 파일 변경 없음. 구체 투영, 조명 및 카메라 시점 적용.

## 태양·8행성·토성 고리

- 제작: Solar System Scope / INOVE.
- 출처: [Solar System Scope Textures](https://www.solarsystemscope.com/textures/).
- 라이선스: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
- NASA 관측·고도 자료에 기초한 가공 지도. 색을 조정했고 미관측 부분을 가상으로 보완했으므로 모든 픽셀이 실제 촬영 자료인 것은 아닙니다. 지구는 NASA Blue Marble 기반. 금성에는 대기 지도를 사용합니다.
- `textures/sun.jpg`, `mercury.jpg`, `venus.jpg`, `earth.jpg`, `mars.jpg`, `jupiter.jpg`, `saturn.jpg`, `uranus.jpg`, `neptune.jpg`, `ring.png`.
- 원본 파일 변경 없음. 구체/고리 투영, 조명, 카메라 시점 적용. 자전·축 기울기·속도·천체 간 거리의 정밀 시뮬레이션은 아닙니다.

다운로드 URL·SHA-256·크기는 [textures/manifest.json](textures/manifest.json)에 기록했습니다. 취득일: 2026-09-18.

## 화면의 나머지 요소

- 비행 화면의 별은 깊이와 시차를 체험하기 위한 생성 모형입니다. 실제 별 이름·위치·거리와 대응하지 않습니다.
- 태양·행성·달을 하나의 체험 공간에 배치했습니다. 목적지를 향해 자유 비행하거나 자동 접근할 수 있습니다. 천체의 크기와 배치는 크게 축약했으며 행성은 태양 주위를, 달은 지구 주위를 단순 원궤도로 계속 공전합니다. 공전 속도와 거리는 체험용이며 실제 천체력에 대응하지 않습니다.
- 달 날짜 관측은 실제 관측 사진을 위상 순서에 맞춰 배열한 학습 기록입니다. 날짜는 실제 촬영일이 아닙니다. 별자리 탐사는 Wikimedia Commons의 실제 사진 3장을 사용합니다. 은하수는 지구에서 찍은 실제 사진이며 은하 외부 비행 모형이 아닙니다.
- 3D 엔진: Three.js 0.180.0, MIT. [동봉 라이선스](vendor/THREE-LICENSE.txt). `three.module.js`, `three.core.js` 원본 배포 파일을 로컬에서 제공합니다.

- 우주선은 자체 생성한 가상 탐사선 이미지(`images/explorer-craft-v2.png`)를 시점에 맞춰 표시합니다. 실제 우주선 촬영 사진이 아닙니다.
