# 교실 이미지 중심 UI/에셋 제작 기준

작성일: 2026-06-20

## 1. 목적

이 문서는 `우리 교실`을 이미지 중심 UI로 개편할 때 필요한 시각 에셋을 분류하고, 훈장/아이콘/뱃지/상점 상품/교실 화면을 어떤 AI 도구와 유틸리티로 제작할지 결정하기 위한 기준점이다.

현재 구현 기준:

- 교실 화면 주 소스: `public/index.html`
- 교실 렌더링: `public/js/features/classroom-render.js`
- 교실 스타일: `public/styles.css`
- 기존 교실 이미지: `public/images/classroom-quiz-bg.png`, `public/images/classroom-quiz-reference.png`, `public/images/school-interior-bg.png`
- 기존 인테리어 픽셀 에셋: `public/images/room-assets/interiors/`
- 기존 랭크 이미지: `public/images/level-ranks/bronze-rank.png`, `silver-rank.png`, `gold-rank.png`
- 상점/에셋 카탈로그 기준 문서: `docs/product/ASSET_CATALOG_DESIGN.md`

이 문서는 구현 계획서가 아니라 제작 기준서다. 실제 구현 전에는 이 문서에서 1차 범위를 선택한 뒤 `assetCatalog`와 UI 연결 범위를 별도 작업으로 나눈다.

## 2. 목표 UI 방향

기존 교실 UI는 탭과 카드 중심이다. 이미지 중심 개편에서는 먼저 `교실 공간`이 보이고, 칠판/게시판/책상/상점 선반/직업 게시판 같은 사물이 기능 진입점이 되는 구성이 적합하다.

권장 첫 화면:

- 교실 배경 이미지
- 주요 기능별 클릭 영역
- 학생 상태 HUD
- 교사용일 때만 보이는 관리 오브젝트
- 기능별 상세 화면은 기존 카드 UI를 유지하거나 점진적으로 이미지 카드로 치환

기능 매핑:

| 교실 오브젝트 | 연결 기능 | 현재 기능 근거 |
| --- | --- | --- |
| 칠판 | 오늘 퀘스트, 공지, 완료율 | `classroom-today-grid`, `classroom-quest-grid` |
| 게시판 | 젬스톤, 뱃지, 월간 캠페인 | `classroom-gem-grid`, `classroom-badge-campaign-form` |
| 학생 책상/자리 | 학생카드 | `classroom-student-card-grid` |
| 교사용 책상 | 승인 대기, 운영 요약 | `classroom-teacher-dashboard`, `classroom-review-grid` |
| 직업 게시판 | 직업 지원/배정/월급 | `classroom-job-grid` |
| 상점 선반 | 교실 상점, 쿠폰 | `classroom-shop-grid`, `classroom-shop-history` |
| 달력/시계 | 성장루틴 | `classroom-routine-grid` |
| 베리 지갑/상태바 | 내 베리, 사용 가능 상품 | `classroom-summary-berry-count`, wallet |

## 3. 에셋 대분류

### 3.1 교실 공간 에셋

용도:

- 교실 화면의 기본 배경
- 기능 오브젝트가 올라갈 공간
- 학생이 매일 들어오는 메인 홈 분위기 형성

필요 에셋:

| 에셋 | 권장 형식 | 비고 |
| --- | --- | --- |
| 교실 기본 배경 | PNG/WebP, 16:9 또는 4:3 | 첫 화면 메인 |
| 칠판 영역 | 배경에 포함하거나 투명 PNG | 퀘스트 진입점 |
| 게시판 영역 | 배경에 포함하거나 투명 PNG | 젬/뱃지 진입점 |
| 상점 선반 | 투명 PNG | 교실 상점 진입점 |
| 교사용 책상 | 투명 PNG | 담임 권한 UI |
| 학생 책상 묶음 | 투명 PNG | 학생카드 진입점 |
| 달력/시계 | 투명 PNG | 성장루틴 진입점 |
| HUD 프레임 | CSS 또는 PNG | 내 베리/알림 표시 |

기존 활용 후보:

- `public/images/classroom-quiz-bg.png`
- `public/images/school-interior-bg.png`
- `public/images/room-assets/interiors/office/board_empty.png`
- `public/images/room-assets/interiors/office/board_full.png`
- `public/images/room-assets/interiors/office/corkboard_1.png`
- `public/images/room-assets/interiors/office/corkboard_2.png`
- `public/images/room-assets/interiors/desks/desk_1_tile.png`
- `public/images/room-assets/interiors/books/books_pile.png`
- `public/images/room-assets/interiors/present/`

### 3.2 훈장/랭크 에셋

용도:

- 랭킹/퀴즈 성취/교실 명예 표시
- 기존 `level-ranks` 이미지의 확장
- 대표 칭호 프레임이나 명예의 전당 상품과 연결

권장 분류:

| 분류 | 예시 | 사용처 |
| --- | --- | --- |
| 랭크 훈장 | 브론즈, 실버, 골드, 플래티넘 | 랭킹/레벨 |
| 교실 명예 훈장 | 오늘의 도우미, 이달의 성장왕 | 교실 홈/학생카드 |
| 과목 훈장 | 독서왕, 수학도전, 사회탐험 | 퀴즈/교실 퀘스트 |
| 행동 훈장 | 정리왕, 친절왕, 꾸준함 | 교실 퀘스트/성장루틴 |

권장 파일 기준:

- `public/images/classroom-assets/medals/`
- 64x64, 96x96, 128x128 PNG/WebP
- 투명 배경
- 작은 카드에서는 48px 이하로 축소 표시해도 식별 가능해야 함

1차 제작 후보:

| ID | 이름 | 시각 방향 | 연결 기능 |
| --- | --- | --- | --- |
| `medal_daily_helper` | 오늘의 도우미 | 리본 달린 금색 메달 | 직업/담임 지급 |
| `medal_clean_desk` | 정리왕 | 책상+반짝임 | 체크형 퀘스트 |
| `medal_reading` | 독서왕 | 책+월계관 | 독서 퀴즈 |
| `medal_growth_streak` | 꾸준함 훈장 | 달력+별 | 성장루틴 |
| `medal_quiz_champion` | 퀴즈 챔피언 | 트로피+번개 | 퀴즈 달성형 |

### 3.3 아이콘 에셋

용도:

- 버튼, 핫스팟, 상태 표시, 기능 카드의 작은 시각 신호
- 이모지 fallback을 대체

권장 분류:

| 분류 | 아이콘 예시 | 연결 기능 |
| --- | --- | --- |
| 기능 아이콘 | 칠판, 게시판, 상점, 달력, 직업표 | 교실 맵 진입점 |
| 상태 아이콘 | 완료, 대기, 승인, 반려, 잠금 | 퀘스트/쿠폰 상태 |
| 재화 아이콘 | 베리, 쿠폰, 월급 봉투 | 교실 경제 |
| 액션 아이콘 | 구매, 사용 요청, 승인, 환불 | 상점/교사 관리 |
| 안내 아이콘 | 알림, 새소식, 도움말 | 활동 피드 |

권장 파일 기준:

- `public/images/classroom-assets/icons/`
- 32x32 또는 48x48 PNG/WebP
- 투명 배경
- 아이콘 세트는 한 팔레트 안에서 제작

우선 제작 후보:

| ID | 이름 | 용도 |
| --- | --- | --- |
| `icon_berry` | 베리 | 지갑/HUD/보상 |
| `icon_coupon` | 쿠폰 | 상점 구매/보유 쿠폰 |
| `icon_chalkboard` | 칠판 | 퀘스트 |
| `icon_corkboard` | 게시판 | 젬/뱃지 |
| `icon_job_board` | 직업 게시판 | 직업 |
| `icon_teacher_desk` | 교사용 책상 | 승인 대기 |
| `icon_calendar` | 달력 | 성장루틴 |
| `icon_check_stamp` | 확인 도장 | 담임 승인 |

### 3.4 뱃지/젬스톤 에셋

용도:

- `studentGemProgress`
- 대표 뱃지 설정
- 월간 뱃지 캠페인
- 학생카드 표시

뱃지와 훈장은 역할을 분리한다.

- 훈장: 높은 성취, 명예, 랭크
- 뱃지: 반복 달성, 젬 완료, 캠페인 참여
- 젬스톤: 퀘스트와 연결된 성장 게이지의 보상 상징

권장 분류:

| 분류 | 예시 | 연결 기능 |
| --- | --- | --- |
| 젬스톤 | 일기젬, 독서젬, 정리젬 | 연결 퀘스트 XP |
| 대표 뱃지 | 월간 일기왕, 도움왕 | 학생카드 |
| 캠페인 뱃지 | 6월의 독서왕 | 담임 스캔 지급 |
| 루틴 뱃지 | 7일 연속, 30일 도전 | 성장루틴 |

권장 파일 기준:

- `public/images/classroom-assets/badges/`
- 64x64 또는 96x96 PNG/WebP
- 젬스톤은 색상 변형을 쉽게 만들 수 있도록 같은 형태 유지

1차 제작 후보:

| ID | 이름 | 시각 방향 | 연결 기능 |
| --- | --- | --- | --- |
| `badge_diary_gem` | 일기젬 | 파란 보석+연필 | 글쓰기/일기 퀘스트 |
| `badge_reading_gem` | 독서젬 | 초록 보석+책 | 독서 퀘스트 |
| `badge_clean_gem` | 정리젬 | 노란 보석+반짝임 | 정리 퀘스트 |
| `badge_kindness_gem` | 친절젬 | 분홍 보석+하트 | 정서/친절 퀘스트 |
| `badge_routine_streak` | 루틴 연속 뱃지 | 달력+불빛 | 성장루틴 |

### 3.5 교실 상점 상품 에셋

용도:

- 교실 상점 상품 카드
- 구매한 쿠폰 목록
- 사용 요청/승인 흐름
- 추후 `assetCatalog` 연결

교실 상점은 기존 타운 상점과 구분한다.

- 타운 상점: 배경, 아바타, 방 장식, 칭호 프레임
- 교실 상점: 쿠폰, 권리, 역할 보상, 교실 이벤트용 상품

권장 상품 분류:

| 분류 | 상품 예시 | UI 에셋 방향 |
| --- | --- | --- |
| 학습 편의 쿠폰 | 숙제 힌트권, 문제 다시풀기권 | 종이 쿠폰, 도장 |
| 교실 권리 쿠폰 | 자리 선택권, 발표 순서 선택권 | 티켓, 이름표 |
| 재미 보상 | 칭찬 방송권, 미니게임 5분권 | 확성기, 게임패드 |
| 꾸미기 상품 | 프로필 스티커, 칠판 이름표 | 스티커, 프레임 |
| 공동 목표 상품 | 학급 보상 상자, 공동 파티권 | 선물상자 |
| 교사용 상품 | 보너스 베리 지급권, 직업 특별수당 | 봉투, 별도장 |

1차 상품 후보:

| ID | 이름 | 가격 방향 | 설명 |
| --- | --- | --- | --- |
| `coupon_homework_hint` | 숙제 힌트권 | 낮음 | 교사에게 힌트 1회 요청 |
| `coupon_seat_pick` | 자리 선택권 | 중간 | 정해진 날 자리 선택 |
| `coupon_class_helper` | 하루 도우미권 | 중간 | 교실 역할 체험 |
| `coupon_praise_board` | 칭찬 게시판권 | 낮음 | 칭찬 게시판에 이름 표시 |
| `coupon_mini_game` | 미니게임 5분권 | 높음 | 교사 승인 후 사용 |
| `coupon_bonus_sticker` | 프로필 스티커권 | 낮음 | 학생카드 꾸미기 |
| `coupon_group_reward_box` | 공동 보상 상자 | 높음 | 학급 공동구매 후 개봉 |

권장 파일 기준:

- `public/images/classroom-assets/shop/`
- 96x96 또는 128x128 PNG/WebP
- 상품 카드용 정사각형 썸네일
- 쿠폰은 `purchased`, `use_requested`, `used`, `refunded` 상태에 따라 배지 오버레이를 CSS로 처리

### 3.6 칭호 프레임/이름표 에셋

용도:

- 기존 `titleFrame` 상점 상품 확장
- 학생카드 대표 뱃지/대표 칭호와 함께 표시
- 랭킹 카드 꾸미기

현재 후보:

- `chalk_nameplate_frame`
- `notebook_nameplate_frame`
- `starlight_nameplate_frame`
- `honor_nameplate_frame`

권장 제작:

| ID | 이름 | 시각 방향 |
| --- | --- | --- |
| `frame_chalk_nameplate` | 칠판 이름표 | 초록 칠판+분필 라인 |
| `frame_notebook_label` | 공책 이름표 | 공책 라벨+줄무늬 |
| `frame_star_label` | 별빛 이름표 | 별 조각+짙은 남색 테두리 |
| `frame_honor_label` | 명예 이름표 | 금장+리본 |

## 4. 도구별 역할 분담

### 4.1 UI 구상/화면 생성 도구

| 도구 | 용도 | 장점 | 주의 |
| --- | --- | --- | --- |
| Google Stitch | 교실 화면 시안, 이미지 중심 UI 구상 | 자연어로 고해상도 UI 방향 잡기 | 외부 서비스, 공식 API/MCP 접근성은 확인 필요 |
| Figma Make | 피그마 기반 프로토타입/코드 시안 | 디자인 파일로 후속 편집 가능 | 프로젝트 코드에 바로 붙이기보다 시안 기준 |
| v0 | 실제 웹 UI 코드 프로토타입 | 작동하는 화면과 코드 생성에 강함 | React/Tailwind 중심이라 현재 바닐라 구조와 직접 호환 낮음 |
| screenshot-to-code | 참고 스크린샷을 코드로 실험 변환 | GitHub 오픈소스, HTML/Tailwind/React/Vue 지원 | 정확도 검증 필요, 최종 코드는 수동 정리 필요 |

추천 사용:

- 교실 전체 화면 방향: Stitch 또는 Figma Make
- 기능별 카드/패널 프로토타입: v0
- 참고 이미지에서 레이아웃 추출: screenshot-to-code

### 4.2 이미지/아이콘 생성 도구

| 도구 | 용도 | 장점 | 주의 |
| --- | --- | --- | --- |
| Recraft | 아이콘, 뱃지, 벡터풍 에셋 | 스타일 일관성, 벡터/래스터 생성에 강함 | 픽셀아트 마감은 별도 필요 |
| ComfyUI | 반복 가능한 이미지 생성 파이프라인 | 노드 기반, 스타일 고정, 대량 생성에 좋음 | 세팅 난이도 높음 |
| InvokeAI | 이미지 생성/수정/인페인팅 | 캔버스 UX와 부분 수정에 좋음 | 로컬 실행 환경 또는 서버 필요 |
| AUTOMATIC1111 | Stable Diffusion Web UI | 모델/LoRA 생태계 풍부 | UI가 복잡하고 운영 파이프라인 관리 필요 |
| Codex 이미지 생성 | 빠른 초안 이미지/아이콘 생성 | 대화 안에서 바로 초안 제작 가능 | 최종 픽셀 정리는 별도 권장 |

추천 사용:

- 훈장/뱃지/쿠폰 세트 초안: Recraft 또는 Codex 이미지 생성
- 픽셀 스타일 고정/대량 변형: ComfyUI
- 기존 이미지 일부 수정: InvokeAI
- 실험 모델/LoRA 적용: AUTOMATIC1111

### 4.3 픽셀아트 마감 도구

| 도구 | 용도 | 장점 | 주의 |
| --- | --- | --- | --- |
| Aseprite | 픽셀아트 최종 편집 | 픽셀 그리드, 팔레트, 애니메이션 마감에 적합 | AI 생성은 아님 |
| Piskel | 간단한 웹 픽셀 편집 | 가볍게 수정 가능 | 대량 작업/전문 마감은 제한 |
| ImageMagick/sharp | 리사이즈, WebP 변환, 스프라이트 시트 | 자동화에 좋음 | 직접 그림 수정은 불가 |

추천 사용:

- 최종 파일은 Aseprite에서 32/48/64/96/128px 기준으로 정리
- 대량 변환은 스크립트로 처리
- `image-rendering: pixelated` 사용 여부는 실제 화면 검증 후 결정

## 5. GitHub/오픈소스 후보

조사한 주요 후보:

| 후보 | 링크 | 용도 |
| --- | --- | --- |
| ComfyUI | https://github.com/Comfy-Org/ComfyUI | 노드 기반 이미지 생성 파이프라인 |
| InvokeAI | https://github.com/invoke-ai/InvokeAI | Web UI, 캔버스, 인페인팅, 워크플로 |
| AUTOMATIC1111 | https://github.com/AUTOMATIC1111/stable-diffusion-webui | Stable Diffusion Web UI |
| screenshot-to-code | https://github.com/abi/screenshot-to-code | 스크린샷을 HTML/Tailwind/React/Vue 코드로 변환 |
| Aseprite | https://github.com/aseprite/aseprite | 픽셀아트 편집기 |

현재 프로젝트에 바로 설치하기보다, 별도 작업 환경에서 에셋을 생성한 뒤 결과물만 `public/images/classroom-assets/`로 가져오는 방식을 권장한다. 이미지 생성 도구 자체를 이 저장소 의존성으로 넣지는 않는다.

## 6. 권장 파일/카탈로그 구조

로컬 파일:

```text
public/images/classroom-assets/
  backgrounds/
  icons/
  medals/
  badges/
  gems/
  shop/
  frames/
  ui/
```

Storage/카탈로그 확장 시:

```text
assetCatalog/{assetId}
```

권장 `assetId` prefix:

| prefix | 용도 |
| --- | --- |
| `classroom_bg_` | 교실 배경 |
| `classroom_icon_` | 기능/상태 아이콘 |
| `classroom_medal_` | 훈장 |
| `classroom_badge_` | 뱃지 |
| `classroom_gem_` | 젬스톤 |
| `classroom_shop_` | 교실 상점 상품 |
| `classroom_frame_` | 이름표/칭호 프레임 |

필수 메타데이터:

| 필드 | 설명 |
| --- | --- |
| `assetId` | 문서 ID와 동일 |
| `type` | `classroomIcon`, `classroomMedal`, `classroomBadge`, `classroomGem`, `classroomShopItem`, `classroomFrame`, `classroomBackground` |
| `name` | 관리자 표시명 |
| `imageUrl` | 실제 표시 이미지 |
| `storagePath` | Storage 사용 시 경로 |
| `fallbackIcon` | 이미지 실패 시 대체 |
| `source` | 제작 도구/출처/프롬프트 메모 |
| `licenseNote` | 라이선스/사용권 메모 |
| `enabled` | 사용 가능 여부 |

## 7. 제작 품질 기준

공통 기준:

- 기능을 작은 크기에서도 식별할 수 있어야 한다.
- 한 세트 안에서 광원, 외곽선 두께, 채도, 그림자 강도를 통일한다.
- 학생 대상 화면이므로 지나치게 어둡거나 금속성 강한 스타일은 피한다.
- 기능 아이콘은 장식보다 의미 전달이 우선이다.
- 생성형 이미지 사용 시 프롬프트, 생성 도구, 수정 여부를 기록한다.

픽셀아트 기준:

- 아이콘: 32x32 또는 48x48 기준
- 뱃지/훈장/상품 썸네일: 64x64 또는 96x96 기준
- 카드 대표 이미지: 128x128 기준
- 투명 배경 PNG 우선
- 가장자리 안티앨리어싱이 픽셀 느낌을 흐리면 Aseprite에서 정리

UI 배경 기준:

- 16:9 데스크톱과 세로형 모바일에서 주요 핫스팟이 잘리지 않아야 한다.
- 기능 진입점은 배경 이미지 안에만 묻히지 말고 HTML 버튼으로 올린다.
- 텍스트는 이미지에 직접 굽지 않는다. 기능명/수치/상태는 DOM 텍스트로 유지한다.
- 교실 오브젝트는 시각 배경이고, 실제 접근성 이름은 버튼/링크에 둔다.

## 8. 샘플 에셋 검수 체크리스트

샘플 에셋은 운영 화면에 바로 연결하지 않고 로컬 전용 검수 페이지나 별도 브랜치에서 먼저 확인한다. 검수용 정적 페이지는 운영 Hosting에 남겨두지 않는다.

파일 기준:

- 파일이 `public/images/classroom-assets/` 하위의 올바른 분류 폴더에 있어야 한다.
- 파일명은 영문 kebab-case 또는 snake_case를 사용한다.
- `asset-manifest.json`의 `path`와 실제 파일 경로가 일치해야 한다.
- `assetId`는 `classroom_icon_`, `classroom_medal_`, `classroom_badge_`, `classroom_gem_`, `classroom_shop_`, `classroom_frame_` 중 하나의 prefix를 따른다.
- 첫 샘플은 SVG도 허용한다. 최종 운영 에셋은 필요에 따라 PNG/WebP로 교체할 수 있다.

시각 기준:

- 48px 이하로 줄여도 주제를 알아볼 수 있어야 한다.
- 같은 세트 안에서 외곽선 두께와 채도 차이가 과하지 않아야 한다.
- 투명 배경 또는 UI에 얹기 쉬운 비어 있는 배경이어야 한다.
- 이미지 안에 읽어야 하는 텍스트를 넣지 않는다.
- 교실 배경 위에 올렸을 때 클릭 가능한 오브젝트처럼 보이는지 확인한다.

문서/출처 기준:

- `source`에는 생성 도구나 제작 방식을 기록한다.
- 외부 AI/상용 툴로 만든 경우 프롬프트와 라이선스 메모를 `_sources/` 또는 별도 문서에 남긴다.
- 운영 UI 연결 전에는 `status`를 `sample`, `planned`, `approved`, `retired` 중 하나로 둔다.

## 9. 권장 작업 방안

### 1단계: 기준 팔레트와 샘플 세트 확정

목표:

- 교실 배경 1개
- 기능 아이콘 8개
- 훈장 3개
- 젬/뱃지 5개
- 상점 상품 6개

권장 도구:

- UI 시안: Stitch 또는 Figma Make
- 아이콘/뱃지 초안: Recraft 또는 Codex 이미지 생성
- 픽셀 마감: Aseprite

산출물:

```text
public/images/classroom-assets/icons/
public/images/classroom-assets/badges/
public/images/classroom-assets/shop/
```

### 2단계: 교실 맵형 홈 시안

목표:

- 현재 `classroom-today-grid`를 대체하거나 보완하는 교실 맵형 홈 설계
- 칠판/게시판/상점/직업/루틴/교사용 책상 핫스팟 지정

권장 도구:

- Stitch/Figma Make로 1차 구상
- Codex로 현재 `public/index.html` 구조에 맞게 구현
- Playwright 또는 in-app browser로 데스크톱/모바일 검증

주의:

- 기존 탭 기능은 바로 삭제하지 않는다.
- 첫 구현은 `오늘` 탭 안에 이미지 홈을 추가하는 방식이 안전하다.

### 3단계: `assetCatalog` 연결 기준 확장

목표:

- 교실 전용 에셋도 `assetCatalog`에 연결할 수 있도록 필드 기준 확정
- 로컬 이미지 fallback과 Storage 이미지 표시 정책 정리

권장 도구:

- 문서/데이터 설계: 수동
- 시드 스크립트: `scripts/seed/` 하위에 별도 작성

주의:

- 운영 Firestore/Storage 직접 수정은 별도 승인 전 금지
- 처음에는 로컬 이미지로 UI 검증 후 카탈로그 연결

### 4단계: 상품/뱃지 운영 정책 연결

목표:

- 상품 카테고리, 가격대, 사용 요청 상태, 환불 여부를 UI와 맞춘다.
- 뱃지/훈장/젬의 역할을 중복 없이 분리한다.

권장 기준:

- 훈장은 높은 명예/랭크
- 뱃지는 캠페인/반복 성취
- 젬은 퀘스트 XP 보상
- 쿠폰은 교실 상점 구매물
- 프레임은 프로필/칭호 꾸미기

## 10. 프롬프트 기준 예시

### 훈장

```text
pixel art game medal icon, transparent background, 64x64, gold ribbon medal,
elementary classroom reward, cute but clean, thick outline, limited color palette,
front view, no text
```

### 젬스톤 뱃지

```text
pixel art gemstone badge icon, transparent background, 64x64, blue diary gem with small pencil,
school reward system, cute educational game UI, consistent outline, no text
```

### 교실 상점 쿠폰

```text
pixel art classroom coupon item, transparent background, 96x96, paper ticket with stamp,
student reward shop item, warm bright colors, game UI asset, no readable text
```

### 교실 배경

```text
bright elementary classroom game UI background, front-facing 2D pixel-inspired illustration,
chalkboard area, corkboard area, shop shelf corner, teacher desk, student desks,
clear clickable zones, warm educational atmosphere, no text
```

프롬프트 주의:

- 이미지 안에 한글/영문 텍스트를 직접 생성하지 않는다.
- 기능명은 HTML 텍스트로 올린다.
- `transparent background`, `no text`, `consistent outline`, `limited color palette`를 반복해서 스타일을 고정한다.

## 11. 우선순위 제안

1차로 만들 것:

1. `icon_berry`
2. `icon_coupon`
3. `icon_chalkboard`
4. `icon_corkboard`
5. `icon_job_board`
6. `icon_calendar`
7. `medal_clean_desk`
8. `medal_growth_streak`
9. `badge_reading_gem`
10. `badge_diary_gem`
11. `coupon_homework_hint`
12. `coupon_seat_pick`
13. `coupon_praise_board`
14. 교실 배경 1종

후순위:

- 애니메이션 아이콘
- 공동구매 전용 상품
- 교실 배치도 커스터마이징
- 학생별 책상 꾸미기
- Storage 업로드 자동화
- Figma/Stitch MCP 자동 연동

## 12. 최종 권장 조합

가장 현실적인 제작 조합:

1. Stitch 또는 Figma Make로 교실 맵형 UI 방향 시안 작성
2. Recraft 또는 Codex 이미지 생성으로 아이콘/뱃지/쿠폰 초안 생성
3. Aseprite로 픽셀아트 크기와 외곽선 정리
4. 로컬 경로 `public/images/classroom-assets/`에 저장
5. 기존 교실 UI에는 먼저 로컬 이미지와 fallback icon으로 연결
6. 안정화 후 `assetCatalog`와 Storage 연결

오픈소스 중심 조합:

1. ComfyUI로 스타일 고정 워크플로 작성
2. 같은 프롬프트 구조로 훈장/뱃지/쿠폰을 배치 생성
3. InvokeAI로 필요한 일부 에셋 인페인팅
4. Aseprite로 최종 픽셀 마감
5. Codex로 UI 연결 및 브라우저 검증

이 프로젝트에서는 첫 라운드에 외부 생성 도구를 코드 의존성으로 추가하지 않는 것이 좋다. 생성 도구는 제작 환경으로만 사용하고, 저장소에는 최종 PNG/WebP와 메타데이터만 넣는 방식이 안전하다.
