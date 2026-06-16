# GAS QUIZ Firebase Codex 작업 지침

## 현재 프로젝트 기준

* 현재 운영 사이트는 Firebase Hosting의 `https://dj48-quiztown-firebase.web.app`이다.
* Firebase Hosting 공개 디렉터리는 `public`이며, 운영 화면의 주 소스는 `public/index.html`이다.
* Firebase Functions 소스는 `functions/index.js`이다.
* 전역 스타일은 `public/styles.css`이다.
* Firebase 설정은 `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`를 기준으로 한다.
* 루트의 `index.html`, `Code.js`, `appsscript.json`은 현재 Firebase 운영본 기준 파일이 아니다. 사용자가 명시적으로 요청하지 않는 한 수정하지 않는다.

## 폴더 구조 기준

* `public/`은 Firebase Hosting 운영 프론트엔드 소스다.
* `functions/`는 Firebase Functions 소스와 Functions 전용 의존성이다.
* `scripts/`는 실행용 운영 보조 스크립트이며 분야별 하위 폴더를 사용한다.
  * `scripts/audit/`: 운영 점검, 백업, 미리보기, 분석 스크립트
  * `scripts/maintenance/`: 정리, 복구, 비밀번호 초기화 등 운영 유지보수 스크립트
  * `scripts/migration/`: 마이그레이션, import, backfill, normalize 스크립트
  * `scripts/seed/`: 시드, 권한 부여, 초기 데이터 생성 스크립트
  * `scripts/smoke/`: 브라우저 smoke test 등 검증 스크립트
* `docs/`는 장기 문서이며 분야별 하위 폴더를 사용한다.
  * `docs/architecture/`: 구조, 스키마, 보안 규칙, 리팩터링 상태
  * `docs/migration/`: 마이그레이션 계획과 분석
  * `docs/operations/`: 운영 runbook, checklist, smoke test 안내
  * `docs/product/`: 제품/기능 설계 문서
  * `docs/seeding/`: seed와 테스트 데이터 문서
  * `docs/snippets/`: 참고용 코드/규칙/마크업 조각
* `fixtures/`는 커밋 가능한 샘플/fixture 데이터다.
* `exports/`와 `private/`는 로컬 운영 데이터 보관용이며 `.gitignore` 보호 대상이다.
* 새 문서, fixture, 운영 스크립트는 위 구조에 맞는 위치에 추가한다. 루트에는 새 계획서나 일회성 작업 파일을 추가하지 않는다.

## 병렬 작업 기준

* 클린 아키텍처 형성의 목표는 다중 터미널에서 동시에 분야별 작업(UI, 퀴즈, 랭킹, 상점, 계정, 관리자 등)을 진행해도 충돌이 적은 구조를 만드는 것이다.
* 이를 위해 domain, application/usecase, infrastructure/repository, presentation, bootstrap 경계를 점진적으로 분리한다.
* 병렬 작업의 분야별 소유권과 순서는 `docs/architecture/PARALLEL_WORK_PLAN.md`를 기준으로 한다.
* 여러 터미널을 동시에 사용할 때는 각 터미널이 하나의 분야만 수정한다.
* `public/index.html`은 아직 공유 app shell이므로 병렬 편집 충돌 위험이 높다. 동시에 수정해야 하면 서로 다른 함수/라인 범위를 명확히 나누고 마지막에 통합 검증을 한다.
* 사용자에게 확인받기 전 코드 이동을 커밋하려면 최소 `npm run check:static`을 통과시킨다.
* 운영 화면에 영향을 주는 변경은 배포 전 `npm run check` 또는 동등한 browser smoke 검증을 통과시킨다.

## 임시 재개 메모

* 2026-06-16 기준 마지막 완료 묶음은 엄격한 클린 아키텍처 라운드 37~56 순차 진행이다.
* 완료된 마지막 리팩터링 커밋은 `9dc3be9 refactor: add app view place navigation helper`이며, 작업 트리는 최종 재개 메모 갱신 후 깨끗한 상태로 종료한다.
* 완료 범위:
  * quiz ranking timer callback 조립을 quiz-flow timer controller로 통합
  * classroom quest completion/review wrapper를 classroom-usecases로 이동
  * ranking popular filter row 계산을 ranking-domain으로 이동
  * bootstrap controller section 조립을 registry helper로 단순화
  * app-view place navigation helper와 application test 추가
  * `public/index.html`의 직접 `httpsCallable` 및 `.collection(` 접근 0건 재확인
  * `public/js/features/*-data.js`와 `public/js/features/quiz-play.js`의 직접 Firebase/Storage 접근 제거 확인
  * 병렬 작업 계획 문서를 라운드 37~56 완료 상태와 다음 실행 순서 기준으로 갱신
* 마지막 검증:
  * `node tests/domain/ranking-domain.test.js` 통과
  * `node tests/application/quiz-flow.test.js` 통과
  * `node tests/application/classroom-usecases.test.js` 통과
  * `node tests/application/app-bootstrap.test.js` 통과
  * `node tests/application/app-view.test.js` 통과
  * `npm run check` 통과
  * `SMOKE_GRADE=4 SMOKE_CLASS=8 SMOKE_NUMBER=23 SMOKE_PASSWORD='1111' npm run smoke:browser` 운영 사이트 인증 smoke 통과
* 다음 작업 기준 문서는 `docs/architecture/PARALLEL_WORK_PLAN.md`이다.
* 다음 추천 방향은 `public/index.html`에 남은 얇은 wrapper와 view orchestration을 최종 감사하고, 기능별 ownership 문서와 실제 파일 구조를 맞추는 것이다.
* 선택형 profile write smoke는 ranking-message 저장/복원 기준으로 안정화했지만 생산 프로필 데이터를 쓰므로 전용 smoke 계정에서만 실행한다. admin write smoke는 emulator/test-project/dry-run 또는 exact-restore 조건이 없으면 금지한다.
* 이 메모는 재개용 임시 기록이다. 다음 목표가 확정되면 유지/삭제/갱신 여부를 보고한다.

## 기본 원칙

* 프로젝트 전체를 매번 분석하지 않는다.
* 요청된 기능과 직접 관련된 파일/함수만 먼저 확인한다.
* 전체 분석은 사용자가 명시적으로 요청했거나, 영향 범위를 특정할 수 없을 때만 한다.
* 수정 전에는 반드시 수정할 파일과 이유를 먼저 요약한다.
* 기존 구조를 최대한 유지하고, 큰 리팩터링은 하지 않는다.
* 한 번에 많은 기능을 고치지 말고 기능 단위로 나눠 작업한다.
* AGENTS.md에는 장기 작업 원칙만 둔다.
* 특정 단계의 현재 목표는 Codex 프롬프트에서 별도로 지정한다.
* 특정 목표가 완료되면 Codex는 해당 목표를 완료 처리하고, 다음 목표로 넘어가기 전에 사용자에게 새 목표 설정을 요청한다.
* 임시 목표성 지침을 AGENTS.md에 추가했다면, 목표 완료 시 제거 또는 갱신이 필요한지 반드시 보고한다.
* 힌트, 기록, 랭킹, 보상, 상점, 내 방 등은 단계별 목표에 포함될 때만 수정한다.
* 현재 요청 범위 밖의 문제를 발견하면 직접 수정하지 말고 TODO로 보고한다.

## 파일 확인 범위

* UI/화면/버튼/퀴즈 진행 문제는 우선 `public/index.html`에서 관련 함수만 확인한다.
* CSS/레이아웃/반응형 문제는 우선 `public/styles.css`에서 관련 선택자만 확인한다.
* Firebase Functions/관리자 callable/서버 집계/운영 점검 문제는 우선 `functions/index.js`에서 관련 함수만 확인한다.
* Firebase Hosting/Functions/Firestore/Storage 설정 문제는 해당 설정 파일만 확인한다.
* 문서 작업은 관련 `.md` 파일만 확인한다.
* 문서 위치를 모를 때는 먼저 `docs/README.md`를 확인한다.
* 병렬 작업/소유권/다음 리팩터링 순서는 `docs/architecture/PARALLEL_WORK_PLAN.md`를 확인한다.
* 레거시 Apps Script 파일인 루트 `Code.js`, 루트 `index.html`, `appsscript.json`은 사용자가 명시적으로 요청한 경우에만 확인한다.

## 검색 방식

* 처음부터 파일 전체를 읽지 않는다.
* `rg`로 관련 키워드, 함수명, DOM id, 컬렉션명, quizId를 먼저 찾는다.
* 필요한 함수 주변 100~200줄만 읽고 판단한다.
* 관련성이 확인된 경우에만 추가 범위를 넓힌다.
* 배포본 확인이 필요하면 `https://dj48-quiztown-firebase.web.app`의 현재 응답과 `public/index.html`을 비교한다.

## 수정 방식

* 최소 수정 원칙을 따른다.
* 기존 함수명, 데이터 구조, Firestore 컬렉션 구조를 가능하면 유지한다.
* 새 helper는 꼭 필요할 때만 추가한다.
* 기존 동작을 바꿀 수 있는 전역 리팩터링은 하지 않는다.
* 퀴즈 모드/힌트/랭킹 수정 시 `getRankingModeOptionsForQuiz`, `getSupportedRankingModeForQuiz`, `getRankingTargetForQuiz`, 랭킹 광장 필터/집계 함수를 함께 확인한다.
* Firestore 기록을 새 모드로 연결할 때는 기존 `rankingRecords`, `userRankingSummary`, `quizKingSummary`의 저장/조회 경로를 모두 확인한다.

## 작업 금지

* 사용자가 요청하지 않은 `firebase deploy` 금지
* 사용자가 요청하지 않은 `git commit` 금지
* 사용자가 요청하지 않은 `git push` 금지
* 운영 Firestore/Storage 데이터 직접 수정 금지
* 대규모 포맷팅 금지
* 불필요한 전체 파일 재작성 금지
* 사용자가 요청하지 않은 레거시 Apps Script 파일 수정 금지

## 응답 형식

1. 수정한 파일
2. 수정한 함수
3. 수정 이유
4. 영향 범위
5. 실행하지 않은 작업
