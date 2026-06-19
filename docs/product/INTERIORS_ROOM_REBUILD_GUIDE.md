# Interiors Room Rebuild Guide

이 문서는 내 집 꾸미기 기능을 Pixel Salvaje `Isometric Interiors - Tileset` 기준으로 전면 재구성하기 위한 핵심 지침이다. 기존 SVG 집틀, 임시 canvas 셸, Kenney 샘플, 하드코딩 보정값은 이 문서보다 우선하지 않는다.

## 결론

Interiors 에셋은 단순 가구 이미지 묶음이 아니라 방 셸, 바닥/벽 타일, 방향별 가구, 상태 변화, 애니메이션 프레임을 포함한 방꾸미기 시스템용 에셋팩이다. 따라서 앱의 방꾸미기는 SVG 시대의 집틀 위에 이미지를 얹는 방식이 아니라, Interiors 에셋의 방 구성 규칙을 먼저 모델링한 뒤 그 위에 아이템을 배치해야 한다.

## 에셋 규모

- `public/images/room-assets/interiors` 아래 파일 수는 약 1100개다.
- 실제 이미지 에셋 대부분은 `png` 또는 `gif`다.
- 현재 앱 manifest에 등록된 Interiors 아이템은 일부에 불과하며, 전체 에셋의 대부분은 아직 기능적으로 활용되지 않는다.

## 주요 폴더

### `root`

완성 예시와 기준 이미지가 들어 있다.

- `room.png`: 일반 방/작업방 기준 이미지
- `office_ani.gif`: 사무실 예시
- `kitchen.gif`: 주방 예시
- `bathroom.gif`: 욕실 예시
- `japanese_room.gif`: 일본풍 방 예시
- `pixel_salvaje.png`: 제작자/팩 이미지

이 폴더는 직접 렌더링용 부품이라기보다 방 프리셋과 완성도를 판단하는 레퍼런스로 본다.

### `floor_wall_tiles_32`, `floor_wall_tiles_64`, `floor_wall_tiles_128`

방의 바닥과 벽을 조립하는 핵심 타일셋이다.

- `floor_*`: 바닥 모듈
- `wall_l_*`: 좌측 벽 모듈
- `wall_r_*`: 우측 벽 모듈
- `wall_bath_*`: 욕실 벽 모듈

64px 타일은 단일 칸 단위, 128px 타일은 2칸 모듈에 가깝게 사용한다. 방 렌더러는 특정 픽셀 보정에 의존하지 말고, `RoomShellPreset`이 사용하는 모듈 규격을 명시해야 한다.

### `japanese_room`

가장 완결된 방 셸 자료가 들어 있다.

- `floor_japanese_128.png`
- `wall_l_japanese_128.png`
- `wall_r_japanese_128.png`
- `wall_top_l_japanese_128.png`
- `wall_top_r_japanese_128.png`
- `wall_window_l_japanese_128.png`
- `wall_window_r_japanese_128.png`

일본풍 방 프리셋을 만들 때는 이 폴더를 우선 사용한다. 일반 방 전체의 기본값으로 강제하면 다른 방 테마가 작동하지 않으므로 금지한다.

### 기능별 가구 폴더

- `office`: 보드, TV, 복사기, 프린터, 책상, 서랍, 파티션, 프로젝터, 물 디스펜서 등
- `kitchen`: 냉장고, 싱크대, 오븐, 식기세척기, 주방 가구 색상 세트, 세탁기, 토스터 등
- `bathroom`: 욕조, 변기, 세면대, 샤워, 거울, 수건 등
- `bedroom`: 침대, 협탁, 베개 등
- `chairs`, `sofa`: 방향별 회전 이미지
- `windows`, `doors`: 벽 부착/문 애니메이션용 이미지
- `cat_ani`, `lavalamp_ani`, `televisions_tv`, `computer`: 애니메이션 또는 상태 전환용 이미지

## 에셋 타입 분류

앞으로의 catalog/renderer는 최소한 아래 타입을 구분해야 한다.

- `shell.floor`: 바닥 모듈
- `shell.wall.left`: 좌측 벽 모듈
- `shell.wall.right`: 우측 벽 모듈
- `shell.wall.top`: 벽 상단/몰딩/코너 보정 모듈
- `wall.object`: 창문, 포스터, TV, 보드, 문처럼 벽에 붙는 물건
- `floor.object`: 침대, 소파, 책상, 식물처럼 바닥에 놓는 물건
- `surface.object`: 책상/테이블 위에 놓을 수 있는 물건
- `seat.object`: 의자처럼 책상과 겹쳐야 자연스러운 물건
- `stateful.object`: 열림/닫힘/켜짐/꺼짐 상태가 있는 물건
- `animated.object`: 여러 프레임을 순환하는 물건
- `rotatable.object`: `a/b/c/d` 또는 `0/90/180/270` 방향 이미지가 있는 물건
- `spritesheet.object`: 문처럼 하나의 긴 이미지에 여러 프레임이 들어 있는 물건

## 폐기 대상

아래 개념은 신규 집꾸미기 렌더러의 기준이 될 수 없다.

- SVG 집틀을 기본 방 구조로 사용하는 방식
- `drawKey` 기반 내장 가구 그림
- Kenney 샘플을 기본 렌더링 기준으로 삼는 방식
- 방 셸을 `DETAILED_SHELL` 같은 단일 하드코딩 객체로 고정하는 방식
- 바닥/벽/외곽선을 canvas 도형으로 임의 합성해서 Interiors 에셋 위에 덧씌우는 방식
- 벽 슬롯을 기존 1칸 SVG 좌표계 기준으로 계산하는 방식

## 목표 렌더러 구조

### `RoomShellPreset`

방 하나의 구조를 정의한다.

필수 정보:

- `id`, `name`
- `tileWidth`, `tileHeight`
- `moduleCells`
- `wallHeight`
- `floorAsset`
- `leftWallAsset`
- `rightWallAsset`
- `leftTopAsset`, `rightTopAsset` 선택
- `leftWindowAsset`, `rightWindowAsset` 선택
- `rimColor` 또는 asset 기반 외곽선
- `defaultPlaced`

### 방 프리셋

첫 단계에서는 아래 프리셋을 지원한다.

- `interiors_room`: 일반 방 기준
- `interiors_japanese`: 일본풍 방 기준
- `interiors_bath`: 욕실 기준
- `interiors_office`: 사무실 기준

단, 아직 완성형 방 부품이 부족한 프리셋은 `root` 이미지를 레퍼런스로 삼고 `floor_wall_tiles_128` 조합으로 만든다.

### 좌표계

- 바닥 배치는 2:1 아이소메트릭 그리드다.
- 벽 배치는 바닥 좌표와 별도의 wall segment 좌표로 처리한다.
- 벽 부착물은 floor tile 충돌과 분리한다.
- 의자와 책상, 러그와 가구처럼 자연스러운 겹침은 `layer` 규칙으로 허용한다.

## 배치/상호작용 원칙

- 아이템 클릭은 즉시 들고 움직이는 것이 아니라 선택 상태로 둔다.
- 이동, 회전, 상호작용, 삭제는 명령 버튼으로 수행한다.
- 회전은 이미지 자체를 canvas rotate하지 않고, 에셋팩에 포함된 방향별 sprite를 선택한다.
- 상태 전환은 `stateSprites`를 통해 처리한다.
- 애니메이션은 이후 `animationSprites` 또는 `spritesheet` 모델로 확장한다.

## 검증 기준

완성으로 판단하려면 최소한 아래를 만족해야 한다.

- 방 바닥과 좌/우 벽의 끝점이 일치한다.
- 벽이 한 칸씩 뜯긴 것처럼 보이지 않고 연속된 방 셸처럼 보인다.
- 벽 높이가 창문/보드/TV 배치를 수용한다.
- 소파, 의자, 책상, 침대가 방향별 sprite로 자연스럽게 회전한다.
- 벽 부착물은 바닥 배치와 다른 규칙으로 붙는다.
- 기본 예시방은 `root` 예시 이미지의 밀도와 레이어링에 가까워야 한다.

