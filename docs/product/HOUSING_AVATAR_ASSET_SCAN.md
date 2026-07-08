# 내 집·아바타 신규 설계 — 에셋 스캔 보고

작성일: 2026-07-08
목적: '내 집 꾸미기 + 아바타' 신규 설계(A안 마당 코티지 / B안 미니룸 정면 뷰 / C안 캐릭터 무대 / B+C 조합) 컨셉 선택을 위한 에셋 조달 조사. 코드·데이터 변경 없음.

---

## 1. 내부 에셋 인벤토리

### 1-1. 라이선스 안전 (자체 제작·AI 생성·퍼블릭 도메인)

| 경로 | 종류 | 개수·규격 | 출처·라이선스 | 동물농장풍 어울림 |
| --- | --- | --- | --- | --- |
| `public/images/town-map-bg-v2.png` 외 루트 4장 | 마을 지도·교실 배경 | 1536×1024 등 낱장 | Recraft AI 생성(사용자 제공) | ◎ 현재 아트 디렉션의 기준 이미지 그 자체 |
| `public/images/classroom-assets/` | 교실 배경 2, 패널 4, 뱃지 30, 메달 103, 아이콘 3, 상점 1 | 낱장 PNG, `asset-manifest.json`으로 관리 | Recraft/Stitch AI 생성(사용자 제공, manifest에 출처 기록) | ◎ 손그림풍 파스텔, 완전 일치 |
| `public/images/classroom-icons/` | 젬·키링·부스트·상점 아이콘 | SVG 60개 | 자체 제작 | ◎ 파스텔 톤 벡터 |
| `public/images/level-ranks/` | 랭크 메달 | PNG 3장 | openclipart(퍼블릭 도메인, 출처 목록 `OPEN_GAME_ART_AWARD_LICENSE.txt` 동봉) | ○ 무난 |

### 1-2. ⚠️ 라이선스 주의 (public 저장소에 커밋돼 있으나 재배포 금지 조건)

| 경로 | 종류 | 개수·규격 | 출처·라이선스 | 비고 |
| --- | --- | --- | --- | --- |
| `public/images/room-assets/limezu/`, `limezu-modern-interiors/` | 픽셀 방·가구·캐릭터 파츠 | git 추적 39장. 캐릭터 파츠 시트(body/eyes/hair/outfit/accessory) 1792×1312(32px 프레임), premade 캐릭터 6종, 가구 낱장 8종, Generic Home 1 레이어 | LimeZu Modern Interiors(itch.io). 상업 사용 가능하나 **재배포 금지** → public 저장소 커밋 자체가 회색지대 | 폐기된 프로토타입 전용. 16/32px 픽셀아트라 파스텔 손그림풍과 이질적 |
| `public/images/room-assets/pixel-salvaje/` | 아이소메트릭(habbo풍) 방·가구 | git 추적 33장, 64~128px 낱장 + room-shell 980×759 | Pixel Salvaje **Isometric Interiors(유료 $18)** 발췌. 상업 사용 가능하나 **재배포 금지** | 유료팩을 public 저장소에 커밋한 상태 — 정리 필요. 스타일은 habbo풍 참고용으로 가치 있음 |
| `tests/TinyHouse_0.17(@Pixel_Salvaje)/` | 위 팩 전체 사본 | **1,121파일, git 미추적** | 동일 | 커밋되지 않게 .gitignore 등록 권장 |
| `public/images/room-assets/shubibubi-free/` | 픽셀 인테리어·마을·캐릭터 무료판 | git 추적 11장 (interior-free 160×80 시트 등 소형) | shubibubi Cozy 시리즈 무료판. Cozy Interior/People은 **비상업 전용 + 재배포 금지** | 상업적 여지 요구와 충돌. 후보 제외 |
| `public/data/maple-*.json` 4개 + `public/prototypes/dressing-room/effects/` PNG 33장 | 메이플스토리 아이템 카탈로그·이펙트 스프라이트 | git 추적 | **넥슨 상용 IP** (maplestory.io API 추출물) | ⚠️ 최우선 정리 대상. Habbo와 같은 이유로 사용 불가 |
| `docs/design-reference/` | 참고 스크린샷 4장 | **git 미추적** (커밋 금지 유지 중) | 타 게임 화면 캡처 | 스타일 참고만 |

정리하면: **신규 설계에 그대로 재활용할 수 있는 내부 에셋은 Recraft 계열(classroom-assets·배경)과 자체 SVG 아이콘뿐**이다. room-assets 3종(LimeZu·Pixel Salvaje·shubibubi)은 스타일도 픽셀아트라 새 방향과 맞지 않고, 라이선스상 public 저장소 유지도 부적절하므로 재활용 후보에서 제외한다.

### 1-3. 현재 '내 방 꾸미기' 코드·데이터 (신규 설계 호환 기준)

`homeRoom`이라는 이름의 컬렉션·필드는 코드에 없다. 실제 운영 구조는 다음과 같다.

**운영 중인 시스템 (상점 연동 선택형)**
- 카탈로그: Firestore `shopItems/{itemId}` — itemId는 슬러그(예: `chalk_nameplate_frame`), `category`는 `background` / `avatar` / `titleFrame` 3종
- 보유: `userInventory/{userId}/items/{itemId}`
- 선택 상태: `userRoomSettings/{userId}` = `{ selectedBackgroundItemId, selectedAvatarItemId, selectedTitleFrameItemId, userId, updatedAt }` (`public/js/features/shop-data.js`, `public/js/infrastructure/shop-repository.js`)
- 비주얼 해석: `resolveShopItemVisual()`(`public/js/domain/shop-domain.js`) — `item.assetId` → asset-manifest 이미지 → `item.imageUrl` → 이모지 `icon` 폴백 순. 즉 **아이템 이미지는 대부분 이모지 폴백**으로 표시 중이라, 신규 에셋을 assetId/imageUrl로 붙이기만 하면 되는 열린 구조다.

**운영 미연결 프로토타입 모듈 (LimeZu 실험분)**
- `public/js/domain/room/`(그리드·배치 검증·아바타), `application/room/room-usecases.js`, `features/room/`(렌더러·입력·패널), 총 900여 줄
- 데이터 모델: placement `{ placementId, furnitureId, x, y }` + furniture 카탈로그 `{ furnitureId, imagePath, tileWidth, tileHeight, blockWidth… }`
- 로드하는 곳은 `public/prototypes/room-limezu/`뿐. **그리드 배치·충돌 도메인 로직은 에셋과 무관하므로, 가구 배치형으로 갈 경우 이 모듈은 재사용 가능**

---

## 2. 외부 에셋 후보 (자유 라이선스만)

> 판단 기준: public 저장소 커밋 = 사실상 재배포이므로, **CC0(퍼블릭 도메인 동등) 또는 CC-BY(표기 시 재배포·상업 모두 허용)만 안전**. "상업 OK지만 재배포 금지"인 무료팩(CraftPix 무료, Sprout Lands, Cute Fantasy, LimeZu 등)은 전부 채택 불가 — 스타일 참고로만 병기.

### B안 — 미니룸 (정면 뷰 / 아이소메트릭 스타일 참고)

| 후보 | 라이선스 | 스타일·구성 | 어울림 / 적합 컨셉 |
| --- | --- | --- | --- |
| ★ [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit) | **CC0** — public 저장소·상업 모두 완전 안전, 표기 불요 | 가구 140종. 3D 원본 + **2D 아이소메트릭 4방향 렌더 + 탑다운 렌더** 제공. 플랫 카툰, 부드러운 색 | 침대·소파·책상·주방·욕실까지 갖춰 habbo식 아이소 미니룸을 자유 라이선스로 구현할 수 있는 사실상 유일한 완성 세트. 색이 다소 채도 낮음 → 파스텔 보정 필요. **B안 주력** |
| [OpenGameArt "CC0 Furniture" 컬렉션](https://opengameart.org/content/cc0-furniture), [cottage core bedroom set](https://opengameart.org/content/cottage-core-bedroom-furniture-set) | CC0 (개별 항목 라이선스 재확인 필요) | 낱장 가구 스프라이트 모음, 코티지풍 침실 세트 | 정면 뷰 보충용. 품질 편차 있음. B안 보조 |
| (참고만) CraftPix 무료 인테리어 | 상업 사용 OK지만 **에셋 재배포 금지** → public 저장소 불가 | 탑다운 픽셀 인테리어 | 채택 불가, 구도 참고 |

정면 뷰(도토리집·미니룸 정면) 완성 세트는 자유 라이선스 시장에 사실상 없다. **B안을 정면 뷰로 가려면 Recraft 자체 생성이 주 경로**(아래 공통 대안), 아이소메트릭으로 기울이면 Kenney Furniture Kit이 주 경로다.

### C안 — 커스터마이즈 캐릭터

| 후보 | 라이선스 | 스타일·구성 | 어울림 / 적합 컨셉 |
| --- | --- | --- | --- |
| ★ [Free CC0 Modular Animated Vector Characters 2D (RGS_Dev)](https://rgsdev.itch.io/free-cc0-modular-animated-vector-characters-2d) ([OGA 미러](https://opengameart.org/content/free-cc0-modular-animated-vector-characters-2d)) | **CC0** | 벡터 카툰, 2048×2048 캔버스. **파츠 분리형: 머리 3·헤어 3·눈 7·뿔 5·입 8** + 몸 파츠, 프리메이드 8종, idle/walk/jump 애니메이션 | 파츠 분리 + 벡터 카툰이라 파스텔 톤 리컬러 쉬움. 표정(눈·입) 교체 가능 → "캐릭터 키우기 무대"에 딱. **C안 주력** |
| [Kenney Toon Characters 1](https://kenney.nl/assets/toon-characters-1) | **CC0** | 카툰 벡터 캐릭터 270 에셋, 포즈·표정 변형 | 밝고 친근하나 파츠 커스터마이즈 폭은 좁음. C안 보조(프리셋 캐릭터용) |
| (차선) [LPC Universal Character Generator](https://github.com/liberatedpixelcup/Universal-LPC-Spritesheet-Character-Generator) | CC-BY-SA/GPL/CC0 혼합 — 사용 파츠별 **CREDITS.csv 동봉 + 파생물 동일 라이선스** 의무 | 픽셀 32px, 파츠 수백 종(의상·헤어·피부) | 파츠 수는 최다지만 표기·동일라이선스 관리 부담 크고 픽셀풍이라 톤 불일치. 권장하지 않음 |

### A안 — 마당 코티지 (정원·집 외관)

| 후보 | 라이선스 | 스타일·구성 | 어울림 / 적합 컨셉 |
| --- | --- | --- | --- |
| ★ [Kenney Isometric Miniature Farm](https://opengameart.org/content/isometric-miniature-farm) + [Nature Kit](https://opengameart.org/content/nature-kit) + Tiny Town | **CC0** | 농장·자연 60타일+, 아이소·탑다운 렌더 | 마당·밭·울타리·나무 소품 조달 가능. A안 주력(소품층) |
| (참고만) [Sprout Lands (Cup Nooble)](https://cupnooble.itch.io/sprout-lands-asset-pack) | 무료판 **비상업 전용 + 재배포 금지**, 프리미엄도 재배포 금지 | 파스텔 픽셀 팜 | **스타일은 동물농장풍에 가장 근접**하지만 채택 불가. 색감·구도 레퍼런스로만 |
| (참고만) [Kenmi Cute Fantasy RPG](https://kenmi-art.itch.io/cute-fantasy-rpg) | 무료판 포함 **재배포 금지** | 귀여운 16px 탑다운 | 채택 불가, 레퍼런스로만 |

### 공통 대안 ★ — Recraft AI 자체 생성 (내부 검증된 파이프라인)

`docs/product/CLASSROOM_VISUAL_ASSET_AI_WORKFLOW.md`에 이미 프롬프트 기본형·파일명 규칙·manifest 등록 절차가 있고, 교실 개편에서 배경·패널 품질이 검증됐다. 방 배경(정면 뷰), 마당 코티지 장면, 가구·소품 낱장(투명 배경) 모두 이 경로로 만들면 **동물농장풍 톤 일치가 보장되고 라이선스 문제가 없다.** 약점은 캐릭터 파츠 분리(같은 캐릭터의 표정·의상 변형 일관성)라서, 캐릭터만 CC0 모듈러 팩으로 보완하는 조합이 현실적이다.

---

## 3. 종합 — 컨셉별 에셋 조달 난이도와 추천

| 컨셉 | 조달 경로 | 난이도 | 평가 |
| --- | --- | --- | --- |
| A안 마당 코티지 | Recraft 장면 배경 + Kenney 자연 소품 | **하** | 배경 1장 + 데코 슬롯 구조라 가장 쉬움. 다만 '방 꾸미기' 깊이(가구 배치)는 얕아짐 |
| B안 미니룸 정면 뷰 | Recraft 방 배경 + Recraft/OGA 가구 낱장 (아이소로 기울면 Kenney Furniture Kit) | **중** | 정면 뷰 기성 세트가 없어 생성 의존. 대신 가구 낱장은 소량(10~20개)부터 시작 가능 |
| C안 캐릭터 무대 | RGS_Dev CC0 모듈러(주력) + Kenney Toon(보조) | **중** | 파츠 조달은 해결됨. 파스텔 리컬러·톤 통일 작업 필요 |
| **B+C 조합** | 위 둘의 합 | **중** | 에셋 종류는 늘지만 각자 최선 경로가 명확하고, 아래 데이터 호환상 가장 자연스러움 |

**추천: B+C 조합** — 방(정면 뷰, Recraft 생성 배경 + 가구 낱장)과 캐릭터(CC0 모듈러 파츠)를 함께.

이유:
1. 운영 데이터가 이미 `background`(방) / `avatar`(캐릭터) 카테고리로 나뉘어 있어 **B+C가 기존 구조와 1:1로 맞는다** — 마이그레이션 없이 확장 가능.
2. 두 축 모두 라이선스 완전 안전 경로(Recraft 자체 생성 + CC0)가 확보된다.
3. 방은 소량 가구로 시작해도 되고, 캐릭터는 파츠 교체만으로도 재미를 줄 수 있어 단계적 출시가 쉽다.
4. A안(마당)은 이후 "방 밖 화면"으로 얹기 좋아 확장 예비로 남겨둔다. habbo식 아이소메트릭은 Kenney Furniture Kit으로 가능은 하나, 톤이 동물농장풍과 덜 맞고 좌표계 구현 비용이 커서 차선.

---

## 4. 기존 데이터 호환 메모 (신규 설계 시 매핑할 것)

- **유지**: `shopItems.itemId` 슬러그 체계, `userInventory` 보유 구조, `userRoomSettings` 문서 위치. 신규 아이템도 같은 슬러그 규칙으로 추가.
- **매핑**: `selectedBackgroundItemId` → 방 테마(벽지·바닥 세트)로 의미 확장 / `selectedAvatarItemId` → 캐릭터 프리셋 id 또는 파츠 세트 id / `selectedTitleFrameItemId` → 그대로 유지.
- **추가(가구 배치 도입 시)**: `userRoomSettings`에 `placements: [{ placementId, furnitureId, x, y }]` 배열 필드를 **추가**하는 방식이 안전 — 기존 필드를 건드리지 않으므로 학생 실데이터에 무손실. 도메인 로직은 `public/js/domain/room/`(그리드·충돌·배치 검증) 재사용.
- **비주얼 연결**: 신규 에셋은 asset-manifest 방식(assetId → manifest 이미지, 이모지 폴백)이 이미 `resolveShopItemVisual()`에 구현돼 있으므로 그 경로를 따른다.
- `homeRoom`이라는 이름은 코드 어디에도 없음 — 문서·대화에서 가리키던 실체는 `userRoomSettings`.

---

## 5. ⚠️ 라이선스 주의 항목 (별도 조치 필요 — 이번 커밋에서는 미조치)

1. **메이플스토리 데이터·이미지 (최우선)**: `public/data/maple-*.json` 4개, `public/prototypes/dressing-room/effects/` PNG 33장 — 넥슨 상용 IP가 public 저장소에 커밋된 상태. dressing-room 프로토타입 폐기와 함께 제거 권장 (git 이력에도 남으므로 필요 시 이력 정리 검토).
2. **Pixel Salvaje 33장** (`public/images/room-assets/pixel-salvaje/`): 유료 $18 팩 발췌, 재배포 금지 조건 — 제거 권장.
3. **LimeZu 39장** (`public/images/room-assets/limezu*`): 재배포 금지 조건 — 프로토타입 폐기와 함께 제거 권장.
4. **shubibubi 무료판 11장**: 비상업 전용 + 재배포 금지 — 제거 권장.
5. **`tests/TinyHouse_0.17(@Pixel_Salvaje)/` 1,121파일**: 현재 미추적. 실수 커밋 방지를 위해 .gitignore 등록 권장.
6. **Sprout Lands / Cute Fantasy / CraftPix 무료**: 신규 설계에 채택 금지(재배포 금지 조건). 색감·구도 레퍼런스로만.
7. **Habbo**: 기존 규칙대로 스타일 개념 참고만, 에셋·팬리소스 절대 금지.

(파일 삭제는 안전 규칙에 따라 사용자 확인 후 별도 작업으로 진행)
