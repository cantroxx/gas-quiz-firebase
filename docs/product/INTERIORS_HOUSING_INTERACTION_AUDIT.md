# Interiors Housing Interaction Audit

2026-06-19 기준 `public/images/room-assets/interiors/` 에셋을 Habbo/심즈식 하우징 관점에서 재검토한 결과다.

## 결론

Interiors/TinyHouse 에셋은 단순 정적 가구 모음이 아니라, 아래 기능을 만들 수 있는 재료를 포함한다.

- 벽에 창문, 문, 액자, TV, 게시판, 선반, 거울, 수건 등을 붙이는 벽 슬롯 배치
- A/B/C/D 또는 좌우 방향 이미지 기반 회전
- 책상/탁자/선반/싱크대 위에 작은 물건을 올리는 surface slot 배치
- 의자, 방석, 스툴을 책상/탁자 가까이에 붙이는 seat socket 배치
- 냉장고, 오븐, 서랍장, 장롱, 세면대, 세탁기, 노트북 등의 열림/닫힘 상태 전환
- TV, 모니터, 프린터, 복사기, 프로젝터, 램프, 시계, 물 디스펜서 등의 프레임 애니메이션

현재 preview MVP는 `floor.object`, `wall.object`, `seat.object` 일부만 사용한다. Habbo/심즈식 하우징으로 가려면 catalog에 `surface.object`, `stateful.object`, `animated.object`, `composite.object`, `socket` 메타를 추가해야 한다.

## 에셋 근거

### 상태 전환 파츠

동일 크기 캔버스에 base와 door/drawer 파츠가 분리되어 있다. 대표 확인 결과는 모두 같은 크기라 같은 좌표에 겹쳐 렌더링할 수 있다.

- `kitchen/fridge_red_doors/fidge_red_base.png`
- `kitchen/fridge_red_doors/fidge_red_door_1_closed.png`
- `kitchen/fridge_red_doors/fidge_red_door_1_open.png`
- `kitchen/fridge_red_doors/fidge_red_door_2_closed.png`
- `kitchen/fridge_red_doors/fidge_red_door_2_open.png`
- `kitchen/fridge/fridge_doors/fridge_base.png`
- `kitchen/fridge/fridge_doors/fridge_door_1_closed.png`
- `kitchen/fridge/fridge_doors/fridge_door_1_open.png`
- `kitchen/oven_doors/oven_base.png`
- `kitchen/oven_doors/oven_door_closed.png`
- `kitchen/oven_doors/oven_door_open.png`
- `kitchen/kitchen_a_drawers/kitchen_a_base.png`
- `kitchen/kitchen_a_drawers/kitchen_a_drawer_1_closed.png`
- `kitchen/kitchen_a_drawers/kitchen_a_drawer_1_open.png`
- `living_roon/shelving_7_drawers/shelving_7_base.png`
- `living_roon/shelving_7_drawers/shelving_7_drawer_1_closed.png`
- `living_roon/shelving_7_drawers/shelving_7_drawer_1_open.png`
- `japanese_room/japanese_closet_drawers/japanese_closet_base.png`
- `japanese_room/japanese_closet_drawers/japanese_closet_door_1_closed.png`
- `japanese_room/japanese_closet_drawers/japanese_closet_door_1_open.png`

### 애니메이션 프레임

`_ani` 폴더와 연속 번호 파일이 많다. 파일명 기준으로 애니메이션 후보는 약 318개다.

- `televisions_tv/bigtv_ani/`: TV 켜짐/화면 애니메이션
- `televisions_tv/tv_dvd_ani/`: DVD TV 애니메이션
- `computer/bendedscreen_ani/`: 모니터 화면 애니메이션
- `computer/macbook_ani/`: 노트북 닫힘/열림/화면 애니메이션
- `office/printer_ani/`: 프린터 출력 애니메이션
- `office/copy_machine_*_ani/`: 복사기 애니메이션
- `office/projector_ani/`, `office/projector_screen_ani/`: 프로젝터/스크린 애니메이션
- `office/water_dispenser_ani/`: 물 디스펜서 애니메이션
- `kitchen/toaster_ani/`: 토스터 애니메이션
- `bathroom/bath_ani/`, `bathroom/wc_ani/`: 욕실 설비 애니메이션
- `lavalamp_ani/`: 램프 애니메이션
- `cat_ani/`: 동물 캐릭터 애니메이션

### 위에 올릴 수 있는 작은 물건

책상/탁자/선반/싱크대 위에 올리기 좋은 소형 물건이 많다.

- 책/공책/파일: `books/`
- 키보드, 태블릿, 콘솔, 휴대용 게임기: `computer/`, `consoles/`
- 컵, 접시, 주전자, 냄비, 프라이팬, 식기: `kitchen/`
- 전화기, 계산기, 연필꽂이, 서류, 헤드셋: `office/`
- 베개, 쿠션, 선물: `bedroom/`, `sofa/`, `present/`
- 일본식 찻잔/접시/차/촛불: `japanese_room/`

이들은 `surface.object`로 분리하고, 책상/탁자/선반 쪽에 `surfaceSlots`를 둬야 자연스럽다.

### 표면을 제공하는 가구

다음은 위에 물건을 올릴 수 있는 host 후보:

- `desks/desk_1_tile.png`, `desks/desk_1_b_tile.png`
- `desks/office_main_table_desk/office_main_table_base.png`
- `desks/office_normal_table_ani/office_normal_table_base.png`
- `kitchen/kitchen_table.png`
- `kitchen/kitchen_a_tile.png`
- `kitchen/sink.png`
- `living_roon/smalltable_5.png`
- `living_roon/table_10.png`
- `living_roon/shelving_6.png`
- `living_roon/shelving_7.png`
- `japanese_room/japanese_table.png`
- `japanese_room/japanese_shelf.png`
- `bedroom/night_table_tile.png`

### 좌석/근접 결합 후보

의자를 책상에 끼우는 완성 합성 이미지는 별도 파일로 보이지 않는다. 대신 방향별 의자/좌석 에셋이 있으므로, 엔진에서 `seatSocket` 규칙으로 처리해야 한다.

- `chairs/chair_2_a_tile.png` ... `chair_2_d_tile.png`
- `chairs/gaming_chair/gchair_9_a.png` ... `gchair_9_d.png`
- `chairs/basic_office_chair_a.png`, `basic_office_chair_b.png`
- `kitchen/kitchen_stool.png`
- `japanese_room/japanese_seat.png`
- `sofa/sofa_3_a_tile.png` ... `sofa_3_d_tile.png`

## 필요한 신규 모델

### Placement

```js
{
  id,
  itemId,
  anchor: 'floor' | 'wall' | 'surface',
  x,
  y,
  wall,
  segment,
  height,
  hostId,
  slotId,
  direction,
  state,
  frame
}
```

### Item Definition

```js
{
  id,
  type: 'floor.object' | 'wall.object' | 'surface.object' | 'seat.object' | 'stateful.object' | 'animated.object' | 'composite.object',
  footprint,
  directions,
  sprites,
  surfaceSlots,
  seatSockets,
  states,
  parts,
  animations
}
```

### Composite Object

냉장고, 오븐, 장롱, 서랍장처럼 base와 파츠가 분리된 물건은 한 placement가 여러 이미지를 렌더링해야 한다.

```js
{
  id: 'fridgeRedInteractive',
  type: 'composite.object',
  anchor: 'floor',
  size: 128,
  parts: [
    { id: 'base', src: '.../fidge_red_base.png' },
    { id: 'door1', stateSprites: { closed: '...', open: '...' } },
    { id: 'door2', stateSprites: { closed: '...', open: '...' } }
  ],
  states: {
    door1: 'closed',
    door2: 'closed'
  }
}
```

### Surface Slot

책상 위 물건은 바닥 칸을 차지하지 않고 host 물건의 slot에 붙어야 한다.

```js
{
  id: 'desk1',
  surfaceSlots: [
    { id: 'top-left', x: 44, y: 42, accepts: ['book', 'computer', 'desk.small'] },
    { id: 'top-right', x: 76, y: 46, accepts: ['book', 'cup', 'desk.small'] }
  ]
}
```

### Seat Socket

의자 끼우기는 자동 겹침이 아니라, 선택 후 `책상에 붙이기` 명령으로 처리하는 것이 예측 가능하다.

```js
{
  id: 'desk1',
  seatSockets: [
    { id: 'front', x: 2, y: 3, preferredDirection: 'c' },
    { id: 'back', x: 2, y: 1, preferredDirection: 'a' }
  ]
}
```

## 구현 제안 순서

1. `surface.object`와 `surfaceSlots` 도입
   - 책상/탁자/선반 위에 책, 컵, 키보드, 게임기, 선물 올리기
   - 드래그 없이 선택 후 `위에 올리기` 명령

2. `composite.object`와 `stateSprites` 도입
   - 냉장고 문 열기/닫기
   - 오븐 문 열기/닫기
   - 세탁기 열기/닫기
   - 장롱/서랍 열기/닫기

3. `animated.object` 도입
   - TV 켜기
   - 노트북 열고 화면 켜기
   - 램프 켜기
   - 토스터 작동
   - 프린터/복사기/프로젝터 작동

4. `seatSockets` 도입
   - 책상에 의자 붙이기
   - 좌식 탁자에 방석 붙이기
   - 소파/침대는 이후 캐릭터 앉기/눕기 확장용으로 남김

5. 벽 슬롯 고도화
   - 벽 아이템의 `wallOffset` 수동 보정에서 `wallSlots`/`wallHeightSlots`로 전환
   - 창문/문/액자/TV/거울/수건/선반을 벽 높이별로 분류

## 주의점

- 에셋이 상호작용 상태를 제공하더라도, 현재 renderer는 한 placement당 이미지 하나만 그린다. 따라서 바로 “문 열기”를 붙이기보다 composite renderer가 먼저 필요하다.
- 책상 위 올리기는 에셋만으로 자동 해결되지 않는다. host slot 좌표를 우리가 catalog에 정의해야 한다.
- 의자-책상 결합은 합성 이미지가 아니라 좌표/레이어 규칙이다. 충돌 금지가 아니라 허용 겹침 규칙이 필요하다.
- 애니메이션 파일 수가 많으므로 모든 프레임을 한꺼번에 로딩하지 말고, 선택/상호작용 시 lazy load하는 방식이 좋다.
