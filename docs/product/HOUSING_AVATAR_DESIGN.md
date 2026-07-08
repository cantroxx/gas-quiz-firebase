# 내 집·아바타 신규 설계 — B+C 조합 (미니룸 정면 뷰 + 캐릭터)

작성일: 2026-07-08
전제: `docs/product/HOUSING_AVATAR_ASSET_SCAN.md`의 에셋 조사 결과에 따라 사용자가 B+C 조합으로 확정.
원칙: public 저장소이므로 에셋은 Recraft 자체 생성 + CC0만 사용. 기존 학생 데이터(`userRoomSettings` 등)는 무손실 확장.

---

## 1. 컨셉 한 줄 정리

'내 집' 화면 상단에 **정면에서 바라본 내 방(미니룸)** 이 생기고, 그 안에 **내가 꾸민 캐릭터**가 서 있다.
방 테마(벽지·바닥), 가구, 캐릭터 파츠를 상점에서 DJ코인으로 사서 바꿀 수 있다 — DJ코인 경제와 방 꾸미기 재미를 살리는 방향(프로젝트 핵심 가치).

## 2. 화면 설계 (`home-view` 확장)

```text
┌─ 내 집 ──────────────────────────────┐
│ [타운으로]                 [로그아웃] │
│ ┌─ 내 방 무대 (신규) ───────────────┐ │
│ │  벽지 ─ 창문 ─ 벽시계(가구 슬롯)   │ │
│ │  침대   [캐릭터]   책상·화분      │ │
│ │  바닥 ───────────────────────────  │ │
│ │  [🏠 방 바꾸기] [🪑 가구 놓기]     │ │
│ │  [🧸 캐릭터 꾸미기]                │ │
│ └───────────────────────────────────┘ │
│ (기존) 프로필 카드                     │
│ (기존) 내 랭킹 │ 칭호 │ 뱃지 │ 아이템 │
└───────────────────────────────────────┘
```

- **내 방 무대**: 배경(방 테마) 1장 + 가구 이미지 낱장들 + 캐릭터 레이어 합성. 기존 프로필 카드 위에 새 섹션으로 추가 — 기존 마크업은 건드리지 않음
- 편집 버튼 3개는 초4 기준: 큰 터치 영역, 쉬운 한국어, Jua 폰트, 주 버튼 초록(#4fa83d)
- 다른 학생 방 구경(랭킹 광장 연동)은 후순위 아이디어로 보류

## 3. 단계별 로드맵

| 단계 | 내용 | 데이터 | 에셋 |
| --- | --- | --- | --- |
| **1. 방 테마 + 캐릭터 프리셋** | 방 배경 교체 + 완성형 캐릭터 선택. 상점 구매 연동 | 기존 `selectedBackgroundItemId` / `selectedAvatarItemId` 그대로 사용 | Recraft 방 배경 2~3종, CC0 프리셋 캐릭터 4~6종 |
| **2. 캐릭터 파츠 꾸미기** | 머리·표정·옷 파츠 교체 (드레스룸 대체) | `avatarParts` 맵 필드 추가 | CC0 모듈러 파츠 (RGS_Dev) 리컬러 |
| **3. 가구 배치** | 방에 가구를 놓고 옮기기 | `placements` 배열 추가, `public/js/domain/room/` 그리드·충돌 로직 재사용 | Recraft 가구 낱장 10~15종 |

각 단계는 독립 배포 가능. 1단계만으로도 "내 방이 생겼다"는 체감을 준다.

## 4. 데이터 설계 (무손실 확장)

`userRoomSettings/{userId}` — 기존 필드 유지, 추가만:

```js
{
  // 기존 (그대로)
  selectedBackgroundItemId: 'room_theme_wood',   // 의미 확장: 방 테마
  selectedAvatarItemId: 'avatar_preset_bunny',   // 1단계: 프리셋 id
  selectedTitleFrameItemId: '...',
  // 2단계 추가
  avatarParts: { body: '...', hair: '...', face: '...', outfit: '...' },
  // 3단계 추가
  placements: [{ placementId, furnitureId, x, y }]
}
```

- `shopItems.category`: 기존 `background`/`avatar`/`titleFrame` 유지 + 3단계에서 `furniture` 신규. 파츠는 `avatar` 카테고리에 `partSlot` 필드로 구분
- itemId 슬러그 규칙 유지 (예: `room_theme_wood`, `furniture_bed_basic`)
- 비주얼 연결은 기존 `resolveShopItemVisual()` 경로(asset-manifest `assetId` → `imageUrl` → 이모지 폴백) 그대로 — 새 코드 불필요
- Firestore rules 변경 없음 (`userRoomSettings`는 이미 본인 read/write 허용)

## 5. 에셋 계획

### 5-1. Recraft 생성 (사용자 작업 — 요청 목록)

파일 위치: `public/images/room-assets-v2/` 신규 폴더, `asset-manifest.json`에 출처(`Recraft generated, user supplied`) 등록.

| 우선순위 | 에셋 | 권장 파일명 | 조건 |
| --- | --- | --- | --- |
| 1 | 방 정면 뷰 배경 2~3종 (기본 나무방 / 파스텔 핑크방 / 하늘색방) | `room-theme-wood-v1.png` 등 | 가로 3:2, 벽+바닥+창문만 있는 빈 방, 가구 없음, 텍스트 없음 |
| 2 | 가구 낱장 10~15종 (침대·책상·의자·책장·러그·화분·벽시계·포스터·스탠드 등) | `furniture-bed-basic-v1.png` 등 | 개당 1장, 투명 배경, 정면 뷰, 같은 스타일 |

프롬프트 기본형 (기존 `CLASSROOM_VISUAL_ASSET_AI_WORKFLOW.md` 스타일 계승):

```text
Create a cozy room interior asset for a Korean elementary school web game.
Style: soft hand-painted 2D casual game, pastel warm colors, thick clean outline,
front view (not isometric), no text, [transparent background for furniture].
```

### 5-2. CC0 캐릭터 (다운로드·정리)

- 주력: [Free CC0 Modular Animated Vector Characters 2D (RGS_Dev)](https://rgsdev.itch.io/free-cc0-modular-animated-vector-characters-2d) — 파츠 분리(머리3·헤어3·눈7·입8), 파스텔 리컬러 후 사용
- 보조: [Kenney Toon Characters 1](https://kenney.nl/assets/toon-characters-1) — 1단계 프리셋용
- CC0라 표기 의무 없음. 그래도 `public/images/room-assets-v2/SOURCES.md`에 출처 기록(관례)

## 6. 구현 순서 (1단계 기준)

1. 에셋 준비: 사용자 Recraft 생성 + CC0 프리셋 다운로드·정리
2. `home-view`에 '내 방 무대' 섹션 추가 (신규 JS 모듈 `public/js/features/home-room-stage.js`, 기존 파일 최소 수정)
3. 상점에 방 테마·캐릭터 프리셋 아이템 시드 (`scripts/seed/` 신규 스크립트, dry-run 먼저)
4. `npm run check` 통과 → 사용자 확인 → 배포

## 7. 안전 규칙 (이 작업 내내 유효)

- 운영 Firestore 직접 수정 금지 — 아이템 시드는 dry-run 보고 후 사용자 확인
- `userRoomSettings` 기존 필드 삭제·개명 금지, 추가만
- 에셋은 라이선스 출처를 manifest/SOURCES.md에 반드시 기록
- 요청 없는 deploy·push 금지
