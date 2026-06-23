# shopItems Firestore Seed 준비 문서

## 1. 목적

이 문서는 현재 정적 프로토타입의 `SHOP_ITEMS` 데이터를 Firestore `shopItems` 컬렉션으로 옮기기 전에 필요한 테스트 데이터를 정리한다.

목표:

- 현재 정적 `SHOP_ITEMS`를 Firestore `shopItems` 컬렉션으로 옮기기 전 준비
- 읽기 전용 카탈로그 연결을 위한 테스트 데이터 정의
- Firebase 콘솔에서 수동으로 만들 수 있는 문서 ID와 필드 구조 정리
- 실제 구매, 보유 아이템, DJ코인 차감 로직 없이 카탈로그 읽기만 먼저 검증

## 2. `shopItems` 컬렉션 구조

컬렉션 경로:

```text
shopItems
```

문서 ID 전략:

```text
shopItems/{itemId}
```

필드:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `itemId` | string | 아이템 고유 ID. 문서 ID와 동일하게 둔다. |
| `category` | string | `background`, `avatar`, `titleFrame` 중 하나 |
| `name` | string | 화면 표시 이름 |
| `desc` | string | 아이템 설명 |
| `price` | number | DJ코인 가격 |
| `priceType` | string | 현재는 `djCoin` |
| `enabled` | boolean | 상점 노출 여부 |
| `sortOrder` | number | 상점 정렬 순서 |
| `imageUrl` | string | 이미지 URL. 아직은 빈 문자열 또는 `TODO` |
| `assetId` | string | 나중에 `assetCatalog`와 연결할 값 |
| `rarity` | string | `common`, `rare` 등 |
| `createdAt` | timestamp | 생성 시각 |
| `updatedAt` | timestamp | 수정 시각 |

초기 테스트에서는 `createdAt`, `updatedAt`을 Firebase 콘솔의 Timestamp 타입으로 직접 입력하거나 임시로 현재 시각을 사용한다.

## 3. Seed 아이템 목록

현재 프로토타입 아이템을 기준으로 다음 5개 문서를 만든다.

| 문서 ID | 이름 | 카테고리 | 가격 | 희귀도 |
| --- | --- | --- | ---: | --- |
| `forest_bg` | 숲속 배경 | `background` | 150 | `common` |
| `star_bg` | 별빛 배경 | `background` | 150 | `rare` |
| `cat_avatar` | 고양이 아바타 | `avatar` | 200 | `common` |
| `explorer_avatar` | 탐험가 아바타 | `avatar` | 200 | `rare` |
| `golden_title_frame` | 금빛 칭호 프레임 | `titleFrame` | 250 | `rare` |

## 4. 아이템별 필드 예시

공통 규칙:

- `priceType`: `djCoin`
- `enabled`: `true`
- `imageUrl`: 아직 빈 문자열 또는 `TODO`
- `assetId`: 나중에 `assetCatalog`와 연결할 값
- `createdAt`, `updatedAt`: Timestamp 타입

### `forest_bg`

```js
{
  itemId: "forest_bg",
  category: "background",
  name: "숲속 배경",
  desc: "내 집 화면을 초록 숲 분위기로 꾸밀 수 있는 배경입니다.",
  price: 150,
  priceType: "djCoin",
  enabled: true,
  sortOrder: 10,
  imageUrl: "",
  assetId: "asset_forest_bg",
  rarity: "common",
  createdAt: "<Timestamp>",
  updatedAt: "<Timestamp>"
}
```

### `star_bg`

```js
{
  itemId: "star_bg",
  category: "background",
  name: "별빛 배경",
  desc: "밤하늘 별빛 느낌을 더하는 배경 아이템입니다.",
  price: 150,
  priceType: "djCoin",
  enabled: true,
  sortOrder: 20,
  imageUrl: "",
  assetId: "asset_star_bg",
  rarity: "rare",
  createdAt: "<Timestamp>",
  updatedAt: "<Timestamp>"
}
```

### `cat_avatar`

```js
{
  itemId: "cat_avatar",
  category: "avatar",
  name: "고양이 아바타",
  desc: "프로필에 귀여운 고양이 캐릭터를 표시할 수 있는 아바타입니다.",
  price: 200,
  priceType: "djCoin",
  enabled: true,
  sortOrder: 30,
  imageUrl: "",
  assetId: "asset_cat_avatar",
  rarity: "common",
  createdAt: "<Timestamp>",
  updatedAt: "<Timestamp>"
}
```

### `explorer_avatar`

```js
{
  itemId: "explorer_avatar",
  category: "avatar",
  name: "탐험가 아바타",
  desc: "퀴즈타운을 탐험하는 느낌의 캐릭터 아바타입니다.",
  price: 200,
  priceType: "djCoin",
  enabled: true,
  sortOrder: 40,
  imageUrl: "",
  assetId: "asset_explorer_avatar",
  rarity: "rare",
  createdAt: "<Timestamp>",
  updatedAt: "<Timestamp>"
}
```

### `golden_title_frame`

```js
{
  itemId: "golden_title_frame",
  category: "titleFrame",
  name: "금빛 칭호 프레임",
  desc: "대표 칭호를 더 돋보이게 보여주는 칭호 프레임입니다.",
  price: 250,
  priceType: "djCoin",
  enabled: true,
  sortOrder: 70,
  imageUrl: "",
  assetId: "asset_golden_title_frame",
  rarity: "rare",
  createdAt: "<Timestamp>",
  updatedAt: "<Timestamp>"
}
```

## 5. Firebase 콘솔에서 수동 생성 순서

1. Firebase Console에서 프로젝트 `dj48-quiztown-firebase`를 연다.
2. Firestore Database 메뉴로 이동한다.
3. Firestore Database가 아직 없다면 생성한다.
4. 테스트 모드 사용 시 주의한다.
   - 테스트 모드는 임시 검증용이다.
   - 실제 학생 데이터나 구매 처리를 넣기 전에 보안 규칙을 반드시 별도로 설계한다.
5. `shopItems` 컬렉션을 생성한다.
6. 위 Seed 아이템 목록의 문서 ID를 하나씩 입력한다.
7. 각 문서에 필드를 추가한다.
   - string: `itemId`, `category`, `name`, `desc`, `priceType`, `imageUrl`, `assetId`, `rarity`
   - number: `price`, `sortOrder`
   - boolean: `enabled`
   - timestamp: `createdAt`, `updatedAt`
8. 모든 문서의 `enabled`가 `true`인지 확인한다.
9. `sortOrder` 기준으로 화면 정렬이 가능하도록 10 단위 값을 유지한다.

## 6. 주의사항

- 아직 구매 처리 없음
- 아직 `userEconomy` 연결 없음
- 가격은 클라이언트가 아니라 Firestore 값을 기준으로 읽게 할 예정
- 실제 쓰기 권한은 관리자만 가능해야 함
- 학생 클라이언트가 `shopItems`를 수정할 수 있으면 안 됨
- 초기 연결은 읽기 전용으로만 검증
- `imageUrl`은 아직 실제 Storage URL이 아니므로 화면에서는 기존 아이콘 또는 fallback을 유지

## 7. 다음 단계

1. `public/index.html`의 `SHOP_ITEMS` fallback 유지
2. Firestore에서 `shopItems`를 읽어오고 실패하면 fallback 사용
3. Firestore 읽기 결과를 기존 상점 카드 구조로 변환
4. 가격과 카테고리가 정책과 일치하는지 화면에서 확인
5. 그 다음 `assetCatalog` 이미지 연결

## 8. 콘솔 생성 대상 요약

컬렉션:

```text
shopItems
```

문서:

```text
shopItems/forest_bg
shopItems/star_bg
shopItems/cat_avatar
shopItems/explorer_avatar
shopItems/bookshelf
shopItems/flowerpot
shopItems/golden_title_frame
```

첫 연결 목표:

- Firestore `shopItems` 읽기 성공
- 실패 시 정적 `SHOP_ITEMS` fallback 사용
- 구매 처리 없이 상점 카탈로그만 Firestore 기반으로 표시
