# gas-quiz-firebase — DJ48 퀴즈타운 작업 규칙

## 프로젝트 개요

- 초등 4학년 학급 퀴즈 플랫폼. 퀴즈, 랭킹전, 포인트 상점, 내 방 꾸미기, 관리자 기능 포함
- 운영: <https://dj48-quiztown-firebase.web.app>
- 학생 실데이터가 있는 Firebase 운영 서비스
- DJ코인 경제와 방 꾸미기가 핵심 재미다.

## 현재 작업 재개 기준

- `docs/operations/PROJECTS_WORK_ROADMAP_2026-09-01.md`: Projects 전체 작업 1~12단계의 실행 순서와 완료 상태 정본
- `docs/operations/DEFERRED_FOLLOWUPS_AFTER_STEP_12.md`: 9~12단계 완료 뒤 일괄 처리할 안전·보존·출처 보류 목록
- `docs/operations/WORKSPACE_STATUS_2026-09-01.md`: 작업 가능 여부와 게임별 상태를 이해하기 위한 첫 문서
- `docs/architecture/RESUME_MEMO_2026-09-01.md`: 현재 Git·운영본과 교차검증한 작업 재개 기준
- `docs/product/GAME_PROJECT_INVENTORY_2026-09-01.md`: Projects 전체 게임, 외부 퀴즈, 중복 계보
- `public/mathsurvivor/game.js`의 2026-07-31 미완료 변경은 복구 작업선에 보존했고, A1·B1·B2·B3 로컬 기능은 로드맵 4단계에서 완성·검증했다. A2·A3·B4·B5는 학생 데이터·랭킹 영향을 별도 승인받기 전 배포하지 않는다.
- 로드맵 1~12단계는 2026-09-02에 완료했다. 별도 우선 지시가 없으면 `DEFERRED_FOLLOWUPS_AFTER_STEP_12.md`의 `D-01`부터 진행하고 결과를 해당 문서에 기록한다.
- 보완 목록의 데이터·공개 범위·운영 설정 금지선과 승인 게이트를 유지한다. 읽기 전용 확인과 안전한 로컬 문서 보완을 먼저 하고 삭제·마이그레이션·규칙 배포·원격 공개는 사용자 승인 후 진행한다.

## 폴더 구조

- `public/`: 운영 프론트엔드. 주 소스는 `public/index.html`, 전역 스타일은 `public/styles.css`
- `marble-src/`: 특산물 마블 React 소스. 빌드 출력은 `public/marble/`; 산출물 직접 수정 금지
- `geosang-src/`: 팔도 특산물 대상인 React 소스. 빌드 출력은 `public/geosang/`; 산출물 직접 수정 금지
- `public/mathsurvivor/`, `public/wordbattle/`, `public/housing/`: 독립 운영 게임·기능
- `functions/index.js`: Firebase Functions와 관리자 callable
- `scripts/`: audit, maintenance, migration, seed, smoke로 분류
- `docs/`: architecture, migration, operations, product, seeding, snippets로 분류. 위치를 모르면 `docs/README.md`부터 확인
- `fixtures/`: 커밋 가능한 샘플 데이터
- `exports/`, `private/`: 로컬 운영 데이터. Git ignore 보호 대상이며 임의로 건드리지 않는다.
- 루트 `index.html`, `Code.js`, `appsscript.json`: 레거시 Apps Script 파일. 요청 없이 확인·수정하지 않는다.
- 새 문서와 스크립트는 위 분류에 맞춰 추가하고 루트에 일회성 파일을 만들지 않는다.

## 실행과 검증

- 정적 검사: `npm run check:static`
- 전체 검증: `npm run check`
- 운영 화면 변경은 배포 전 `npm run check` 통과 필수
- React 하위 앱은 각 소스 디렉터리에서 빌드하고 산출물을 직접 고치지 않는다.

## 작업 방식

- 요청과 직접 관련된 파일·함수만 먼저 확인한다.
- `rg`로 키워드, 함수명, DOM id, 컬렉션명을 찾고 주변 100~200줄부터 읽는다.
- UI·버튼·퀴즈 흐름은 `public/index.html`, CSS·레이아웃은 `public/styles.css`, Functions·관리자·집계는 `functions/index.js`, 설정 문제는 해당 설정 파일에서 시작한다.
- 기존 함수명·데이터 구조·Firestore 컬렉션을 유지하고 기능 단위로 최소 수정한다.
- 요청 범위 밖 문제는 직접 고치지 않고 보고한다.
- `public/index.html`은 공유 app shell이라 병렬 편집 충돌 위험이 높다. 병렬 작업은 `docs/architecture/PARALLEL_WORK_PLAN.md`를 따른다.
- 클린 아키텍처 상태는 `docs/architecture/RESUME_MEMO_2026-06-16.md`와 관련 architecture 문서를 따른다.

## 랭킹·퀴즈 변경 시 확인

- `getRankingModeOptionsForQuiz`
- `getSupportedRankingModeForQuiz`
- `getRankingTargetForQuiz`
- `rankingRecords`, `userRankingSummary`, `quizKingSummary` 저장·조회 경로

## Firebase와 운영 안전

- 사용 서비스: Hosting, Firestore, Functions, Storage
- 보안 규칙: `firestore.rules`; 인덱스: `firestore.indexes.json`
- 운영 Firestore·Storage 데이터를 직접 수정하지 않는다.
- 보안 규칙이나 학생 데이터에 영향을 주는 변경은 영향과 검증 방법을 먼저 설명하고 사용자 확인 후 진행한다.
- 요청 없는 `firebase deploy`, `git commit`, `git push`를 하지 않는다.
- 배포본과 로컬이 다르면 배포부터 하지 말고 차이의 출처를 설명한다.
- `../economy`는 학급경제 모듈의 독립 설계·프로토타입이며, 현재 퀴즈타운 구현과 혼동하지 않는다.
