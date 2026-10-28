# 퀴즈타운 UI 간소화·이미지 개편 결과

2026-10-18. **UI 개편 및 승인된 운영 배포 완료.** 학생 데이터·보안 규칙·Functions를 변경하지 않았다.

실행 정본: [단계별 계획](../product/TOWN_UI_SIMPLIFICATION_PLAN_2026-10-18.md). 오늘의 퀘스트는 사용자 확인에 따라 유지한다.

## 변경 결과

| 공간 | 결과 |
|---|---|
| 로그인 | 새 마을 입구 일러스트, 입력 폼 대비와 모바일 배치 정리, 로그인 상태에서 내 상태 버튼 숨김 |
| 타운 | 기존 지도 유지, 큰 hover 사각형을 간판 강조로 변경, 작은 간판과 축약 바로가기, 알림/안내를 화면 안에 배치 |
| 공통 이동 | 타운 앱의 내 상태를 상단 문서 흐름에 배치하여 콘텐츠 겹침 제거. 독립 게임의 기존 플로팅 동작 유지 |
| 상점 | 새 부티크 피팅룸, 진열장 상품 카드와 계산 영역, 모바일 염색 버튼 폭 정리, iframe 중복 상태 버튼 제거 |
| 이벤트 | 기존 축제 그림 재사용, 제목·안내 축약, 퀘스트 게시판 스타일. 시즌 이벤트 진입 제거. 오늘의 퀘스트/미수령 보상 유지 |
| 랭킹 | 기존 트로피 그림 재사용, 순위 게시판·시상대 스타일, 긴 이름·빈 기록 상태 확인. 실제 모드 통합은 별도 작업 |
| 내 집 | 기존 마을 그림을 수첩 헤더에 적용. 오늘의 퀴즈 카드와 오늘 퀴즈 XP 표시 제거, 0 코인 표시 확인 |
| 학교 | 기존 학교 그림 재사용, 내부 다섯 탭의 헤더/카드 통일, 필터·학습 진입 검증 |
| 내 상태 | 일일/주간 퀘스트·수령 기능 유지, 시즌 탭/시즌 카드/오늘 퀴즈 XP 표시 제외 |
| 교실 | 최근 별도 개편 유지. 전체 검사의 76개 역할/탭 반응형 사례와 로딩/다이어리 검증 통과 |
| 알림·안내 | 오늘의 퀴즈 홍보 제거, 실제 상점·퀘스트에 맞춘 장소 설명 수정. 친구/쪽지의 데이터 동작은 변경하지 않음 |

## 이미지 제작

두 이미지를 **built-in image_gen**으로 생성했다. PNG 원본을 보존하고 웹용 WebP로 인코딩했다. 배경에 글자·수치·버튼을 넣지 않았으며 UI는 HTML로 표시한다.

- [로그인 마을 WebP](../../public/images/town-ui-20261018/login-village-v1.webp) — 280,690 bytes.
- [부티크 피팅룸 WebP](../../public/images/town-ui-20261018/boutique-room-v1.webp) — 187,042 bytes.
- 원본 PNG는 동일 디렉터리의 같은 이름이다.
- [정확한 생성 프롬프트·원본 기록](../product/TOWN_UI_IMAGE_PROMPTS_2026-10-18.json).
- 타운/학교/이벤트/랭킹의 기존 그림은 재사용한다. 요청 없는 외부 이미지 수집이나 유료 API 대체 호출은 하지 않았다.

## 검증 결과

- `npm run check` 종료 코드 0: 정적 검사, 도메인/서비스/애플리케이션/저장소, Firestore·Storage 에뮬레이터, 공개 shell, 교실, 교과 퀴즈 검사 통과.
- 교실 UI 76개 역할/탭 배치 사례, 교과 퀴즈 49개 단원·355개 과제 × 3개 화면 너비(1065 화면) 포함.
- 마지막 문구·배치 수정 뒤 `npm run check:static` 재실행 통과. 449 JS 파일·인라인 스크립트 검사와 번들 재생성.
- `town-ui-refresh-browser.js`: 실제 shell 마크업과 렌더러, 1440/390/320px 가로 넘침, 로그인 컨트롤/포커스, 다섯 목적지, 퀘스트 수령 콜백/진행/수령 완료, 시즌 진입 제거, 0 코인/빈 순위/빈 퀘스트/긴 이름 검증.
- `coordi-starter-browser.js`: 코인/쿠폰 구매, 보유 상태, 무료 드레스룸, 쿠폰 부족 클라이언트 차단, 0 코인 표시, 390/320px 배치 통과. 코인 부족에 대한 서버 정책은 기존 계약을 유지한다.
- `player-status-browser.js`: 일일/주간 필터, 수령 후 새로고침, 부분 실패, 로그아웃·계정 전환, 팝업 닫기/iframe 해제 통과.
- `season-quest-browser.js`: 제거된 시즌 탭 기대를 새 UI 계약으로 갱신. 퀘스트 접기/키보드/바로가기, 미수령 팝업, 수령/건수 갱신, 초점 복귀, 계정 전환 통과.
- `event-loading-browser.js`: 실제 진입 함수, 병렬 로딩, 캐시 DOM, 중복 새로고침 병합, 오류/재시도, 계정 경합 통과.
- `school-hubs-browser.js`: 다섯 공간의 진입/탭/필터, 권한 조건, 캐시/오류/재시도, 모바일/키보드 통과.
- 대표 캡처를 직접 열어 로그인/타운/상점/내 집/학교 내부/이벤트/랭킹·빈 상태의 가독성과 겹침을 검수했다.
- Chrome은 제한된 실행 환경에서 시작하지 못해 허용된 환경에서 실행했다. UI smoke는 합성 데이터와 차단/대체된 요청만 사용했으며 실제 학생 로그인·구매·보상 수령은 하지 않았다.

[전체 검사 로그](../product/town-ui-review-2026-10-18/full-check.log) · [최종 정적 검사 로그](../product/town-ui-review-2026-10-18/final-static.log)

## 화면

아래 이미지는 합성 데이터로 만든 로컬 캡처다. 단일 랭킹 샘플은 외형 검증이며 운영 모드 단일화 완료를 의미하지 않는다. 폰트 외부 요청은 UI fixture에서 차단하므로 폴백 글꼴이 보일 수 있다.

- [로그인 PC](../product/town-ui-review-2026-10-18/login-1440.png) · [모바일](../product/town-ui-review-2026-10-18/login-390.png)
- [타운 PC](../product/town-ui-review-2026-10-18/town-1440.png) · [모바일](../product/town-ui-review-2026-10-18/town-390.png)
- [상점 PC](../product/town-ui-review-2026-10-18/shop-1200.png) · [0 잔액 모바일](../product/town-ui-review-2026-10-18/shop-zero-390.png)
- [이벤트 PC](../product/town-ui-review-2026-10-18/event-1440.png) · [모바일](../product/town-ui-review-2026-10-18/event-390.png)
- [랭킹 PC](../product/town-ui-review-2026-10-18/ranking-1440.png) · [빈 순위](../product/town-ui-review-2026-10-18/ranking-empty-390.png)
- [내 집 0 잔액](../product/town-ui-review-2026-10-18/home-zero-390.png) · [내 상태](../product/town-ui-review-2026-10-18/player-status-390.png)
- [학교 내부](../product/town-ui-review-2026-10-18/school-subjects-desktop.png) · [게임 아지트 탭](../product/town-ui-review-2026-10-18/school-games-mobile.png)

## 수정 파일과 기존 작업 보호

- 기존 소스: `public/index.html`, `public/js/player-status-shortcut.js`, `public/js/features/home-render.js`, `public/js/data/place-details.js`, `public/coordi-shop/index.html`, `public/player-status/index.html`, `status.js`, `style.css`.
- 새 스타일: `public/town-ui-refresh.css`, `public/coordi-shop/storybook.css`.
- 생성 산출물: `public/js/app.bundle.js`는 기존 빌드 스크립트로 재생성. 직접 수정하지 않았다.
- 검사: 새 `scripts/smoke/town-ui-refresh-browser.js`, 기존 `coordi-starter-browser.js`, `player-status-browser.js`, `season-quest-browser.js` 보완.
- 문서/이미지: 실행 계획, 프롬프트 JSON, 본 보고서, docs 진입 링크, 이미지 2종 PNG/WebP, 검증 자료.
- 시작부터 Git 작업 트리에 다수의 변경이 있었다. 전체 git diff를 이번 결과로 간주하면 안 된다. [시작 파일 대비 패치](../product/town-ui-review-2026-10-18/scoped-source-changes.patch)와 [해시 기록](../product/town-ui-review-2026-10-18/source-manifest.json)은 이번에 보관한 8개 기존 소스에 대한 비교다. 새 CSS/자산/테스트/번들은 별도 목록이다.

## 오늘 별도 작업과 연결할 사항

1. **랭킹 단일화**: 기존 `getRankingModeOptionsForQuiz`, `getSupportedRankingModeForQuiz`, `getRankingTargetForQuiz`, `rankingRecords`/`userRankingSummary`/`quizKingSummary` 조회·집계 계약을 그대로 뒀다. 별도 단일화 완료 뒤 실제 데이터로 탭·필터와 점수 표기를 다시 확인해야 한다. 이번 샘플 보드로 데이터를 합치지 않았다.
2. **재화·랭킹 하드리셋**: 이 작업에서 수행하지 않았다. 0 잔액·빈 기록 화면만 합성 데이터로 검증했다. 초기화 대상 컬렉션·사용자 범위·예외·보존/복구는 별도 실행 계획의 책임이다.
3. **시즌 이벤트·오늘의 퀴즈 서버 제거**: 학생 진입/홍보는 제거했지만 관리자 설정, 기존 함수/조회/지급 정책과 과거 기록은 보존했다. 시즌 렌더러 호환 루트는 hidden/inert 상태다. 데이터 제거 작업과 함께 불필요한 서버 호출·죽은 표시 함수도 최종 정리할 수 있다.
4. **미수령 과거 보상**: 이벤트 광장의 기존 미수령 팝업은 유지했다. 하드리셋 뒤 과거 보상을 계속 허용할지는 별도 초기화 정책에 따라 결정한다. UI에서 임의로 지급 정책을 바꾸지 않았다.
5. **배포**: 현재 로컬 전체는 운영본과 다르다. 운영 반영 시 최신 운영 자산과 변경 범위를 대조하고 이 UI와 당일 기능 개편을 함께 재검증해야 한다. 이번에는 deploy/commit/push를 실행하지 않았다.

## 후속 운영 배포 완료 — 2026-10-18

사용자 `배포 진행` 요청에 따라 계획에 7단계를 추가하고 실행했다. 위의 미배포 표현은 최초 로컬 완료 당시 기록이며, 현재는 아래 운영 반영 상태가 최신이다.

- 이전 `8e5f97f63c67c665` → 현재 `170a9325bad778b2`. Release `1792291199796000`.
- UI 파일 13개만 반영. 신규 WebP 2개·CSS 2개 포함. PNG 원본은 배포하지 않음. 기존 파일 3,970개와 Hosting 설정 보존.
- 운영 교실 증권 스타일 연결·배치를 보존. 운영 번들에서 home-render/place-details 모듈만 교체하고 나머지 동일성 확인.
- `npm run check` 재실행 종료 코드 0. 실제 배포 후보 기반 로그인 shell/UI/상점 합성 검사 통과. 의존 파일은 live 압축 해시와 일치하는 파일만 사용.
- 배포 후 live 버전·전체 manifest·변경 13개 공개 응답 해시 검증 통과. 운영 로그인 1440/390/320px 검사와 모바일 캡처 직접 확인.
- 실제 학생 인증·구매·보상 수령은 실행하지 않았다. Functions/Rules 배포, 데이터 초기화, commit/push 없음.
- [배포 JSON](TOWN_UI_DEPLOY_2026-10-18.json) · [운영 기준 변경 패치](town-ui-deploy-2026-10-18/candidate.patch) · [전체 검사 로그](town-ui-deploy-2026-10-18/check.log) · [운영 모바일 캡처](town-ui-deploy-2026-10-18/login-390.png).
- 실행: `publish-town-ui.js` 읽기 → `build-town-ui-candidate.py` 후보 구성 → 후보 검증 → `--prepare` → `--release` → `--verify`. 스크립트는 이번 시작점에 한정되므로 다음 배포 시 운영본과 범위를 다시 검토해야 한다.
