# assetCatalog 설계 문서

## 1. 목적

`assetCatalog`는 상점 아이템, 아바타, 칭호 프레임 같은 화면용 이미지와 아이콘 정보를 관리하기 위한 읽기 전용 에셋 카탈로그다.

현재 `shopItems`는 Firestore에서 읽고 있으며 각 문서에 `assetId` 필드가 있다. 아직 Firebase Storage 이미지 연결은 하지 않았고, `imageUrl`이 비어 있거나 `TODO`이면 `public/index.html`의 기존 아이콘 fallback을 사용한다.

이 문서의 목표:

- `shopItems.assetId`와 실제 이미지/아이콘 연결 기준 정리
- Firebase Storage 파일 경로와 Firestore 메타데이터 분리
- 이미지 연결 실패 시 화면이 깨지지 않도록 fallback 정책 유지
- 초기 구현을 읽기 전용 카탈로그 연결로 제한
- 운영본 `gas-quiz` 데이터와 혼동하지 않도록 Firebase 실험본 기준만 문서화

## 2. `assetCatalog` 컬렉션 개요

권장 컬렉션 경로:

```text
assetCatalog/{assetId}
```

역할:

- 이미지, 아이콘, 스프라이트, 배경 등 화면 표시용 에셋의 메타데이터 저장
- Storage 파일 경로와 공개 표시 URL 관리
- 상점 아이템, 프로필, 뱃지, 칭호 프레임에서 공통 참조
- 클라이언트는 읽기만 하고, 생성/수정은 관리자만 수행

초기 연결 우선순위:

1. `shopItems.assetId`로 `assetCatalog` 문서 조회
2. `assetCatalog.imageUrl`이 유효하면 상점 카드 이미지 표시
3. 없거나 읽기 실패 시 기존 `fallbackIcon` 또는 로컬 아이콘 사용

## 3. `shopItems.assetId` 연결 방식

`shopItems` 문서는 구매와 가격 중심의 카탈로그이고, `assetCatalog` 문서는 이미지와 표시 에셋 중심의 카탈로그다.

연결 예시:

```text
shopItems/forest_bg
  assetId: "asset_forest_bg"

assetCatalog/asset_forest_bg
  imageUrl: "https://..."
  storagePath: "shop/backgrounds/forest_bg.png"
  fallbackIcon: "🌲"
```

권장 규칙:

- `shopItems.assetId`는 `assetCatalog`의 문서 ID와 동일하게 둔다.
- `shopItems.imageUrl`은 당분간 비워 두거나 과도기 fallback으로만 사용한다.
- 최종적으로는 이미지 관련 필드를 `assetCatalog` 기준으로 읽는다.
- `shopItems` 가격, 카테고리, 노출 여부와 `assetCatalog` 이미지 노출 여부는 분리한다.
- `assetCatalog.enabled === false`이면 이미지 대신 fallback icon을 사용한다.

## 4. 필드 구조 예시

### 필드 요약

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `assetId` | string | 필수 | 에셋 고유 ID. 문서 ID와 동일하게 둔다. |
| `type` | string | 필수 | `background`, `avatar`, `titleFrame`, `badge`, `title`, `profile` 등 |
| `name` | string | 필수 | 관리자와 화면에서 확인할 표시 이름 |
| `storagePath` | string | 선택 | Firebase Storage 내부 파일 경로 |
| `imageUrl` | string | 선택 | 클라이언트가 표시할 이미지 URL |
| `fallbackIcon` | string | 필수 | 이미지가 없거나 실패할 때 표시할 아이콘 |
| `enabled` | boolean | 필수 | 에셋 사용 가능 여부 |
| `createdAt` | timestamp | 필수 | 생성 시각 |
| `updatedAt` | timestamp | 필수 | 수정 시각 |

선택 확장 필드:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `altText` | string | 접근성용 대체 텍스트 |
| `width` | number | 원본 이미지 너비 |
| `height` | number | 원본 이미지 높이 |
| `mimeType` | string | `image/png`, `image/webp` 등 |
| `version` | number | 캐시 갱신이나 이미지 교체 추적용 |
| `source` | string | 직접 제작, 생성 이미지, 외부 라이선스 등 출처 메모 |

### 문서 예시

```js
{
  assetId: "asset_forest_bg",
  type: "background",
  name: "숲속 배경 이미지",
  storagePath: "shop/backgrounds/forest_bg.png",
  imageUrl: "",
  fallbackIcon: "🌲",
  enabled: true,
  createdAt: "<Timestamp>",
  updatedAt: "<Timestamp>"
}
```

## 5. 현재 `shopItems` 5개 연결 목록

| shopItems 문서 ID | shopItems 이름 | assetId | asset type | fallbackIcon |
| --- | --- | --- | --- | --- |
| `forest_bg` | 숲속 배경 | `asset_forest_bg` | `background` | `🌲` |
| `star_bg` | 별빛 배경 | `asset_star_bg` | `background` | `🌟` |
| `cat_avatar` | 고양이 아바타 | `asset_cat_avatar` | `avatar` | `🐱` |
| `explorer_avatar` | 탐험가 아바타 | `asset_explorer_avatar` | `avatar` | `🧭` |
| `golden_title_frame` | 금빛 칭호 프레임 | `asset_golden_title_frame` | `titleFrame` | `🟨` |

## 6. Firebase Storage 폴더 구조 제안

권장 Storage 경로:

```text
shop/
  backgrounds/
    forest_bg.png
    star_bg.png
  avatars/
    cat_avatar.png
    explorer_avatar.png
  title-frames/
    golden_title_frame.png

badges/
titles/
profiles/
events/
```

경로 원칙:

- 화면 도메인과 아이템 종류를 기준으로 폴더를 나눈다.
- 파일명은 `shopItems.itemId`와 최대한 맞춘다.
- 한글 파일명보다 영문 snake_case를 사용한다.
- 교체 가능성이 큰 이미지는 `version` 필드나 파일명 suffix를 검토한다.
- 학생별 업로드 파일과 관리자 정의 카탈로그 파일은 폴더를 분리한다.

## 7. 이미지 업로드 정책

초기 정책:

- 관리자만 Storage에 업로드한다.
- 학생 클라이언트에서 직접 업로드하지 않는다.
- 이미지 업로드 후 `assetCatalog` 문서를 관리자만 생성/수정한다.
- 첫 구현은 `assetCatalog` 읽기만 허용한다.
- 상점 카드 이미지는 작은 썸네일 기준으로 최적화한다.

권장 이미지 기준:

- 배경: 16:9 또는 4:3 비율, WebP 또는 PNG
- 아바타: 정사각형 PNG/WebP, 투명 배경 권장
- 칭호 프레임: 투명 배경 PNG/WebP 권장
- 파일 용량은 카드용 이미지 기준으로 작게 유지한다.

라이선스/출처:

- 직접 제작 이미지 또는 사용 권한이 명확한 이미지만 사용한다.
- 생성형 이미지 사용 시 원본 프롬프트나 제작 출처를 `source` 필드 또는 별도 문서에 남긴다.
- 학생 개인정보가 포함된 이미지는 카탈로그 에셋으로 넣지 않는다.

## 8. fallback 아이콘 유지 정책

현재 상점 화면은 `imageUrl`이 비어 있거나 `TODO`이면 기존 아이콘 fallback을 사용한다. 이 정책은 Storage 연결 후에도 유지한다.

fallback 사용 조건:

- `assetCatalog` 문서를 찾을 수 없음
- `assetCatalog.enabled !== true`
- `imageUrl`이 비어 있음
- `imageUrl` 값이 `TODO`
- 이미지 로딩 실패
- Firestore 또는 Storage 권한 오류

fallback 우선순위:

1. `assetCatalog.fallbackIcon`
2. `shopItems` 문서 ID 기반 로컬 fallback
3. `shopItems.category` 기반 로컬 fallback
4. 기본 아이콘 `🛍️`

이 정책을 유지하면 Firestore/Storage 연결 중에도 상점 카드 레이아웃이 깨지지 않는다.

## 9. Firestore 읽기 실패 시 처리

`assetCatalog` 읽기 실패는 상점 자체 실패로 처리하지 않는다.

권장 처리:

- `shopItems` 읽기는 성공했지만 `assetCatalog` 읽기가 실패하면 상점 아이템은 그대로 표시한다.
- 이미지 영역만 fallback 아이콘으로 표시한다.
- 콘솔에는 개발용 warning만 남긴다.
- 사용자 화면에는 오류 메시지를 노출하지 않는다.
- `shopItems` 읽기까지 실패하면 기존 정적 `SHOP_ITEMS` fallback을 사용한다.

이 구조는 `shopItems` 가격/카테고리 검증과 이미지 연결 검증을 분리한다.

## 10. 아직 하지 않을 것

- Firebase Storage 실제 연결 코드 작성
- 이미지 업로드 자동화
- 학생별 이미지 업로드
- 구매 처리
- 보유 아이템 처리
- DJ코인 차감
- `assetCatalog` 쓰기 기능
- 운영본 `gas-quiz` 이미지나 데이터를 직접 연결

## 11. 다음 구현 순서

1. `assetCatalog` seed 문서 작성
   - 현재 5개 `shopItems.assetId`에 맞춘 Firestore 문서 정의
   - `fallbackIcon`, `type`, `storagePath` 먼저 확정

2. Firebase Storage 폴더와 파일명 확정
   - `shop/backgrounds`
   - `shop/avatars`
   - `shop/title-frames`

3. 테스트 이미지 업로드
   - 관리자 수동 업로드로 시작
   - 각 파일의 Storage 경로와 표시 URL 확인

4. `assetCatalog` 읽기 연결
   - `shopItems.assetId` 목록을 기준으로 `assetCatalog` 조회
   - 성공 시 이미지 표시
   - 실패 시 기존 fallback 아이콘 유지

5. 화면 검증
   - 상점 카드 레이아웃
   - 모바일 이미지 크기
   - 이미지 로딩 실패 fallback
   - 권한 오류 fallback

6. 보안 규칙 설계
   - 학생 클라이언트는 `assetCatalog`와 Storage 카탈로그 파일 읽기만 허용
   - 쓰기는 관리자만 허용
   - 학생 업로드 기능은 별도 설계 전까지 제외
