# GAS QUIZ Firebase Codex 작업 지침

## 현재 프로젝트 기준

* 현재 운영 사이트는 Firebase Hosting의 `https://dj48-quiztown-firebase.web.app`이다.
* Firebase Hosting 공개 디렉터리는 `public`이며, 운영 화면의 주 소스는 `public/index.html`이다.
* Firebase Functions 소스는 `functions/index.js`이다.
* 전역 스타일은 `public/styles.css`이다.
* Firebase 설정은 `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`를 기준으로 한다.
* 루트의 `index.html`, `Code.js`, `appsscript.json`은 현재 Firebase 운영본 기준 파일이 아니다. 사용자가 명시적으로 요청하지 않는 한 수정하지 않는다.

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
