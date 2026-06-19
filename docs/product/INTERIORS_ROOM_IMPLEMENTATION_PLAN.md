# Interiors Room Implementation Plan

이 문서는 폐기된 구형 집 꾸미기 기능을 되살리지 않고, Pixel Salvaje `Isometric Interiors - Tileset` 에셋을 기준으로 새 방 꾸미기 MVP를 만드는 실행 계획이다.

## 현재 삭제 상태 확인

2026-06-19 기준 아래 검색을 먼저 실행했다.

```sh
rg "RoomDecor|room-view|room\\.js|roomDecorEnabled|purchaseRoomLayout|adminListRoomCatalog"
```

확인 결과:

- Firebase 운영 소스인 `public/index.html`, `public/js/**`, `functions/index.js`에는 구형 room catalog, `room.js`, `roomDecorEnabled`, `purchaseRoomLayout`, `adminListRoomCatalog` 흐름이 남아 있지 않다.
- 검색 결과의 `Code.js`, 루트 `index.html` 항목은 레거시 Apps Script 파일이며, 이번 구현 대상이 아니다.
- `classroom-view` 문자열은 교실 기능 이름에서 나온 결과이며 집 꾸미기 잔여물이 아니다.

## 보존 자료

- `public/images/room-assets/interiors/`
- `docs/product/INTERIORS_ROOM_REBUILD_GUIDE.md`

## 에셋 분석 요약

### 셸 타일

핵심 방 셸은 아래 폴더에 있다.

- `floor_wall_tiles_128/`
- `floor_wall_tiles_64/`
- `floor_wall_tiles_32/`
- `japanese_room/`

첫 MVP는 128px 모듈을 기준으로 한다. 실제 확인한 대표 파일 크기는 모두 128x128이다.

- `floor_wall_tiles_128/floor_128_woodbright.png`
- `floor_wall_tiles_128/wall_l_128_woodbright.png`
- `floor_wall_tiles_128/wall_r_128_woodbright.png`
- `japanese_room/floor_japanese_128.png`
- `japanese_room/wall_l_japanese_128.png`
- `japanese_room/wall_r_japanese_128.png`
- `japanese_room/wall_top_l_japanese_128.png`
- `japanese_room/wall_top_r_japanese_128.png`

`floor_128` 이미지는 128x128 투명 캔버스 안에 아이소메트릭 바닥 마름모가 들어 있다. `wall_l_128`, `wall_r_128`도 같은 128x128 투명 캔버스를 사용한다. 따라서 렌더러는 이미지의 보이는 픽셀만 임의로 잘라 쓰지 않고, 128px 모듈 자체를 배치 단위로 사용한다.

### 완성 예시

`root/`는 완성도 판단용 레퍼런스다.

- `room.png`: 1920x1080 일반 방 예시
- `japanese_room.gif`: 491x339 일본풍 방 예시
- `office_ani.gif`, `kitchen.gif`, `bathroom.gif`

이 파일들은 직접 조립 부품이 아니라 방 밀도, 벽 높이, 가구 레이어링을 판단하는 기준으로 둔다.

### 가구와 방향 이미지

MVP에 바로 쓸 수 있는 대표 가구:

- `sofa/sofa_3_a_tile.png` ... `sofa_3_d_tile.png`: 128x128, A/B/C/D 회전
- `chairs/chair_2_a_tile.png` ... `chair_2_d_tile.png`: 64x64, A/B/C/D 회전
- `desks/desk_1_tile.png`, `desks/desk_1_b_tile.png`: 128x128, 2방향
- `bedroom/bed_a_4.png` ... `bed_d_4.png`: 침대 방향 이미지
- `windows/window_7_a_tile.png`, `window_7_b_tile.png`, `window_7_c_tile.png`: 벽 부착 창문 계열
- `poster/poster_1.png`: 벽 부착 포스터
- `office/board_empty.png`, `office/tv_off.png`: 벽 부착 사무실 아이템
- `plants/plant_1.png`, `lamp/lamp_8_a_tile.png`: 바닥 또는 표면 소형 오브젝트

방향 회전은 CSS/canvas 회전이 아니라 에셋 파일 매핑으로 처리한다.

## 새 MVP 구조

구형 `public/room.js`, `public/room.css`, 구형 `room-view`, seed-room 흐름은 사용하지 않는다. 첫 단계는 운영 앱에 섞지 않는 독립 preview/test 화면이다.

```text
public/interiors-room-preview.html
public/interiors-room-preview.css
public/js/interiors-room/
  asset-manifest.js
  shell-presets.js
  renderer.js
  interaction-controller.js
  preview.js
```

역할:

- `asset-manifest.js`: MVP에서 노출할 셸/가구 에셋과 앵커 타입 정의
- `shell-presets.js`: 128px 모듈 기반 방 셸 프리셋 정의
- `renderer.js`: DOM 이미지 레이어를 생성하고 셸/오브젝트를 렌더링
- `interaction-controller.js`: 선택, 명령 기반 이동/회전/삭제, 아이템 추가를 처리
- `preview.js`: 독립 preview 화면 부트스트랩

## 좌표와 앵커 모델

### 바닥 좌표

바닥 아이템은 2:1 아이소메트릭 그리드를 사용한다.

- `x`: 오른쪽 아래 방향
- `y`: 왼쪽 아래 방향
- `z`: 레이어 보정

128px 모듈의 기본 스텝:

- `stepX = 64`
- `stepY = 32`
- `module = 128`

### 벽 좌표

벽 부착 아이템은 바닥 충돌 좌표와 분리한다.

- `wall`: `left` 또는 `right`
- `segment`: 벽을 따라 이동하는 칸
- `height`: 벽 아래 기준에서 위로 올리는 높이

벽 부착물은 바닥 아이템 이동 명령이 아니라 벽 이동 명령으로 움직인다.

## MVP 완료 기준

- 128px Interiors 셸 타일로 바닥, 좌측 벽, 우측 벽을 조립한다.
- 벽과 바닥은 같은 모듈 좌표계에서 이어져 끝단 이격이 없어야 한다.
- 클릭은 선택만 수행하고, 드래그로 즉시 따라오지 않는다.
- 선택 후 버튼 명령으로 이동, 회전, 삭제한다.
- 회전 가능한 가구는 A/B/C/D 또는 제공된 방향 이미지로 전환한다.
- 벽 부착물과 바닥 오브젝트는 다른 앵커 모델로 배치한다.
- 데이터 저장, 구매 상태, 학생 공개, 관리자 운영 UI 연결은 이후 단계로 남긴다.

## 이후 단계

- preview에서 셸 품질을 확정한 뒤 관리자 전용 테스트 진입점으로 연결한다.
- 구매/보유/저장 모델은 별도 usecase/repository 경계로 추가한다.
- 공개 학생 화면은 저장 모델과 권한 정책이 안정화된 뒤 연결한다.

## 2026-06-19 방향성 보완

학생 공개 전 새 집 꾸미기의 조작 목표는 단순 버튼형 편집기가 아니라, 심즈에 가까운 하우징 경험으로 둔다.

우선 반영한 방향:

- 보관함에서 물건을 누르면 즉시 생성하지 않고, 방 위에서 커서를 따라다니다가 클릭한 위치에 놓는다.
- 기존 선택 물건도 `옮기기`로 다시 놓기 모드에 들어갈 수 있다.
- 벽 높이는 프리셋 고정값만 쓰지 않고 preview에서 조절해 방 셸 밀도를 검토한다.
- 책상 위 물건은 slot에 붙인 뒤 미세 이동으로 위치를 다듬을 수 있다.
- 의자는 책상/탁자 `seatSockets`에 붙여 시각적으로 안쪽에 들어가도록 좌표와 레이어를 함께 보정한다.

아직 남은 방향:

- 벽 높이 조절값은 저장 모델에 포함되지 않았다.
- surface/seat socket 좌표는 대표 가구만 수동 보정되어 있다.
- 냉장고, 오븐, 장롱, 서랍장 같은 상태 전환형 물건은 아직 `composite.object` 렌더러가 필요하다.
- 학생 공개 전에는 저장/구매/보유/권한 모델을 별도로 완성해야 한다.
