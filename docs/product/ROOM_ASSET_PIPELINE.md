# Room Asset Pipeline

내 집 꾸미기 가구는 기존 내장 SVG(`renderType: "draw"`)와 이미지/SVG 파일(`renderType: "image"`)을 함께 지원한다.

## Storage

- 초기 운영 위치는 `public/images/room-assets/`를 사용한다.
- 파일 URL은 root-relative 경로로 쓴다.
  - 예: `/images/room-assets/sofa-ocean-s.svg`
- 외부 `https://` URL도 스키마는 허용하지만, 수업 중 안정성을 위해 운영 에셋은 가급적 저장소에 포함한다.

## Manifest

대량 등록 기준 파일은 `public/images/room-assets/manifest.json`이다.

필수 필드:

- `id`: `room_`으로 시작하는 고유 ID
- `name`: 관리자/학생 화면 표시명
- `cat`: `furniture` 또는 `deco`
- `renderType`: 이미지 에셋은 `image`
- `w`, `d`, `h`: 방 배치 충돌과 정렬에 쓰는 칸/높이
- `assetUrl` 또는 `rotationSprites`
- `free`: 기본 제공 여부
- 유료 아이템이면 `price`

이미지 보정 필드:

- `pixelWidth`, `pixelHeight`: SVG 캔버스에 그릴 이미지 크기
- `anchorX`, `anchorY`: 이미지에서 바닥 기준점이 되는 픽셀 좌표
- `offsetX`, `offsetY`: 실제 배치 후 미세 위치 보정
- `zIndexOffset`: 겹침 정렬 보정. 러그 같은 바닥 장식은 음수 권장

벽 장식 필드:

- `surface`: `"wall"`
- `wall`: 기본 배치 벽. `left` 또는 `right`
- `ww`, `wh`: 벽에서 차지하는 가로/세로 크기

## Rotation Sprites

회전 가능한 이미지 가구는 `rotationSprites`를 제공한다.

- `0`: 남쪽/기본 방향
- `90`: 동쪽
- `180`: 북쪽
- `270`: 서쪽

방향별 파일이 없으면 대표 `assetUrl`만 사용하며, 회전 버튼은 이미지 가구에서 비활성 처리된다.

## Visual Style

- 2:1 아이소메트릭 바닥 기준을 따른다.
- 투명 배경 SVG 또는 PNG를 사용한다.
- 외곽선은 진한 갈색/남색 계열, 그림자는 낮은 투명도 타원으로 통일한다.
- 1칸 오브젝트는 대략 `80x100`, 2칸 오브젝트는 `130x110` 전후에서 시작한다.
- 색상은 기존 방 배경과 겹치지 않도록 중간 채도 이상을 사용하되, 한 색상 계열만 반복하지 않는다.

## Seeding

Dry-run:

```sh
node scripts/seed/seed-room-assets-from-manifest.js --dry-run
```

Commit:

```sh
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed/seed-room-assets-from-manifest.js --commit
```

유료 아이템은 `assetCatalog/{itemId}`와 `shopItems/{itemId}`를 함께 만든다. 무료 아이템은 `assetCatalog`만 유지하고 같은 ID의 `shopItems`는 삭제한다.
