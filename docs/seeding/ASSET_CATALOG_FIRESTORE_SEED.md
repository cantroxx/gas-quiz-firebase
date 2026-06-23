# assetCatalog Firestore Seed 준비 문서

## 1. 목적

이 문서는 Firestore `assetCatalog` 컬렉션에 넣을 초기 seed 데이터를 정리한다.

현재 상태:

- `shopItems` 5개 문서는 Firestore에 등록되어 있다.
- 각 `shopItems` 문서는 `assetId` 필드를 가지고 있다.
- 상점 화면은 `shopItems`를 Firestore에서 읽고, 이미지가 없으면 기존 아이콘 fallback을 사용한다.
- 아직 Firebase Storage 이미지 연결 코드는 작성하지 않는다.

목표:

- `shopItems.assetId`와 연결되는 `assetCatalog` 문서 5개 정의
- Storage 경로, fallback icon, 표시 타입을 먼저 정리
- 나중에 Storage 이미지 URL을 넣을 수 있도록 `imageUrl` 필드 유지
- 첫 구현은 읽기 전용 에셋 카탈로그 준비로 제한

## 2. 컬렉션 구조

컬렉션 경로:

```text
assetCatalog
```

문서 ID 전략:

```text
assetCatalog/{assetId}
```

예시:

```text
assetCatalog/asset_forest_bg
```

## 3. Seed assetId 목록

`shopItems.assetId`와 연결되는 초기 문서 5개:

| assetId | 연결 shopItems 문서 | 이름 | 타입 |
| --- | --- | --- | --- |
| `asset_forest_bg` | `forest_bg` | 숲속 배경 이미지 | `background` |
| `asset_star_bg` | `star_bg` | 별빛 배경 이미지 | `background` |
| `asset_cat_avatar` | `cat_avatar` | 고양이 아바타 이미지 | `avatar` |
| `asset_explorer_avatar` | `explorer_avatar` | 탐험가 아바타 이미지 | `avatar` |
| `asset_golden_title_frame` | `golden_title_frame` | 금빛 칭호 프레임 이미지 | `titleFrame` |

## 4. 필드 구조와 타입

| 필드 | Firestore 타입 | 값 예시 | 설명 |
| --- | --- | --- | --- |
| `assetId` | string | `asset_forest_bg` | 에셋 고유 ID. 문서 ID와 동일하게 둔다. |
| `type` | string | `background` | 에셋 종류 |
| `name` | string | `숲속 배경 이미지` | 관리자와 화면에서 확인할 이름 |
| `storagePath` | string | `shop-items/backgrounds/forest_bg.png` | Firebase Storage에 둘 예정인 파일 경로 |
| `imageUrl` | string | `` | 아직은 빈 문자열 또는 `TODO` |
| `fallbackIcon` | string | `🌲` | 이미지가 없거나 실패할 때 표시할 아이콘 |
| `enabled` | boolean | `true` | 에셋 사용 가능 여부 |
| `createdAt` | timestamp | server timestamp | 생성 시각 |
| `updatedAt` | timestamp | server timestamp | 수정 시각 |

선택 확장 후보:

- `altText`: 접근성용 대체 텍스트
- `width`: 이미지 원본 너비
- `height`: 이미지 원본 높이
- `mimeType`: `image/png`, `image/webp` 등
- `version`: 이미지 교체 추적용 버전
- `source`: 직접 제작, 생성 이미지, 외부 라이선스 등 출처 메모

## 5. 공통 규칙

- `enabled`: `true`
- `imageUrl`: 아직 빈 문자열
- `createdAt`, `updatedAt`: Timestamp
- `fallbackIcon`: 현재 상점 fallback 아이콘과 동일하게 둔다.
- `storagePath`: 실제 파일 업로드 전이라도 예정 경로를 먼저 입력한다.
- 학생 클라이언트는 읽기만 허용하고, 쓰기는 관리자만 허용해야 한다.

## 6. 문서별 예시

### `asset_forest_bg`

```js
{
  assetId: "asset_forest_bg",
  type: "background",
  name: "숲속 배경 이미지",
  storagePath: "shop-items/backgrounds/forest_bg.png",
  imageUrl: "",
  fallbackIcon: "🌲",
  enabled: true,
  createdAt: "<Timestamp>",
  updatedAt: "<Timestamp>"
}
```

### `asset_star_bg`

```js
{
  assetId: "asset_star_bg",
  type: "background",
  name: "별빛 배경 이미지",
  storagePath: "shop-items/backgrounds/star_bg.png",
  imageUrl: "",
  fallbackIcon: "🌟",
  enabled: true,
  createdAt: "<Timestamp>",
  updatedAt: "<Timestamp>"
}
```

### `asset_cat_avatar`

```js
{
  assetId: "asset_cat_avatar",
  type: "avatar",
  name: "고양이 아바타 이미지",
  storagePath: "shop-items/avatars/cat_avatar.png",
  imageUrl: "",
  fallbackIcon: "🐱",
  enabled: true,
  createdAt: "<Timestamp>",
  updatedAt: "<Timestamp>"
}
```

### `asset_explorer_avatar`

```js
{
  assetId: "asset_explorer_avatar",
  type: "avatar",
  name: "탐험가 아바타 이미지",
  storagePath: "shop-items/avatars/explorer_avatar.png",
  imageUrl: "",
  fallbackIcon: "🧭",
  enabled: true,
  createdAt: "<Timestamp>",
  updatedAt: "<Timestamp>"
}
```

### `asset_golden_title_frame`

```js
{
  assetId: "asset_golden_title_frame",
  type: "titleFrame",
  name: "금빛 칭호 프레임 이미지",
  storagePath: "shop-items/title-frames/golden_title_frame.png",
  imageUrl: "",
  fallbackIcon: "🟨",
  enabled: true,
  createdAt: "<Timestamp>",
  updatedAt: "<Timestamp>"
}
```

## 7. Storage 경로 예시

권장 경로:

```text
shop-items/backgrounds/forest_bg.png
shop-items/backgrounds/star_bg.png
shop-items/avatars/cat_avatar.png
shop-items/avatars/explorer_avatar.png
shop-items/title-frames/golden_title_frame.png
```

파일명 규칙:

- `shopItems.itemId`와 최대한 맞춘다.
- 영문 snake_case를 사용한다.
- 이미지 교체가 잦아지면 `assetCatalog.version` 또는 파일명 suffix를 검토한다.

## 8. 아직 하지 않을 것

- Firebase Storage 실제 연결 코드 작성
- 이미지 파일 업로드 자동화
- `public/index.html` 수정
- `public/styles.css` 수정
- 상점 구매 처리
- 보유 아이템 처리
- DJ코인 차감
- 학생별 업로드
- 운영본 `gas-quiz` 이미지 연결

## 9. 다음 구현 순서

1. 이 seed 문서 기준으로 `assetCatalog` Firestore 문서 생성
2. Firebase Storage에 테스트 이미지 수동 업로드
3. `assetCatalog.imageUrl` 또는 Storage download URL 입력
4. 상점 화면에서 `shopItems.assetId`로 `assetCatalog`를 읽는 코드 연결
5. 이미지 성공 표시와 fallback icon 동작을 함께 검증
6. 읽기 전용 보안 규칙과 관리자 쓰기 정책 정리
