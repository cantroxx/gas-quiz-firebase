# gas-quiz-firebase — DJ48 퀴즈타운

## 프로젝트 개요
- 우리 반(초등 4학년) 학급 퀴즈 플랫폼. 퀴즈 풀이, 랭킹전, 포인트 상점, 내 방 꾸미기, 관리자(교사) 기능 포함
- 운영 사이트: https://dj48-quiztown-firebase.web.app (Firebase Hosting) — **학생 실데이터가 있는 운영 서비스**

## 비주얼 컨셉
- 초등 4학년 대상, 밝고 게임 같은 느낌
- DJ코인 경제와 방 꾸미기가 핵심 재미 — UI/기능 판단이 갈릴 때 이 두 가지를 살리는 방향을 우선한다

## 폴더 구조
- `public/` — 운영 프론트엔드 (주 소스 `public/index.html`, 전역 스타일 `public/styles.css`)
- `functions/index.js` — Firebase Functions (관리자 callable, 서버 집계)
- `scripts/` — 운영 보조 스크립트 (audit / maintenance / migration / seed / smoke 하위 분류)
- `docs/` — 장기 문서 (architecture / migration / operations / product / seeding / snippets) — 문서 위치를 모르면 `docs/README.md`부터 확인
- `fixtures/` — 커밋 가능한 샘플 데이터
- `exports/`, `private/` — 로컬 운영 데이터 보관용 (.gitignore 보호 대상, 건드리지 말 것)
- 루트의 `index.html`, `Code.js`, `appsscript.json` — **레거시 Apps Script 파일**, 요청 없이 수정·확인 금지
- 새 문서/스크립트는 위 분류에 맞는 위치에 추가하고, 루트에 일회성 파일을 만들지 않는다

## 실행 / 검증 명령어
- 정적 검사: `npm run check:static`
- 전체 검증: `npm run check` (정적 + domain/application/infrastructure 테스트 + 브라우저 smoke)
- 운영 화면에 영향을 주는 변경은 배포 전 `npm run check` 통과 필수

## 작업 방식
- 프로젝트 전체를 매번 분석하지 않는다. 요청과 직접 관련된 파일/함수만 확인하고, `rg`로 키워드·함수명·DOM id·컬렉션명을 먼저 찾아 함수 주변 100~200줄만 읽는다
- 문제 유형별 시작 위치: UI/버튼/퀴즈 진행 → `public/index.html` / CSS·레이아웃 → `public/styles.css` / Functions·관리자·집계 → `functions/index.js` / 설정 → 해당 설정 파일만
- 최소 수정 원칙: 기존 함수명·데이터 구조·Firestore 컬렉션 구조를 유지하고, 기능 단위로 나눠 작업하며, 대규모 포맷팅과 전체 파일 재작성을 하지 않는다
- 요청 범위 밖의 문제를 발견하면 직접 수정하지 말고 TODO로 보고한다
- `public/index.html`은 공유 app shell이라 동시 편집 충돌 위험이 높다 — 병렬 작업이 필요하면 `docs/architecture/PARALLEL_WORK_PLAN.md`를 따른다
- 클린 아키텍처 분리(domain / application / infrastructure / presentation)가 진행된 구조다. 2026-06-16 시점 리팩터링 기록은 `docs/architecture/RESUME_MEMO_2026-06-16.md` 참고

## 랭킹/퀴즈 수정 시 필수 확인
- 연관 함수: `getRankingModeOptionsForQuiz`, `getSupportedRankingModeForQuiz`, `getRankingTargetForQuiz`, 랭킹 광장 필터/집계 함수
- Firestore 기록을 새 모드로 연결할 때는 `rankingRecords`, `userRankingSummary`, `quizKingSummary`의 저장/조회 경로를 모두 확인

## Firebase / 안전 규칙
- 사용 서비스: Hosting, Firestore, Functions, Storage / 보안 규칙: `firestore.rules`, 인덱스: `firestore.indexes.json`
- **운영 Firestore/Storage 데이터 직접 수정 금지**
- 요청 없는 `firebase deploy`, `git commit`, `git push` 금지
- 보안 규칙·학생 데이터에 영향을 주는 변경은 Projects 공통 규칙대로 반드시 사전 설명 + 사용자 확인
- 연관 프로젝트: `../economy` 폴더는 이 프로젝트의 `public/economy/`로 연동 예정인 학급경제 모듈 설계안
