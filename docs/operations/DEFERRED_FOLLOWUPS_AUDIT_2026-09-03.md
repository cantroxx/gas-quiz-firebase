# D-01~D-12 일괄 보완 점검 결과

점검일: 2026-09-03
최종 재검증일: 2026-09-07
범위: `/Users/kdw/Projects`의 15개 Git 저장소, 로컬 보관 폴더, 공개 배포 주소

## 결론

승인 없이 가능한 Git·배포·에셋·라이선스 읽기 전용 조사와 로컬 자동 검사를 완료했다. 원격에만 있는 새 커밋이나 예상하지 못한 미커밋 파일은 발견되지 않았다. 낱말대전 사전 provenance·GPL 전문과 KBO 장기 운영 규칙은 안전한 로컬 변경으로 보완했다. 2026-09-05 퀴즈타운 전체 검사와 KBO 전체 검사를 다시 통과했다.

운영 데이터, Firebase·Kakao 콘솔, 학생·회원 정보는 조회·수정·삭제하지 않았다. 2026-09-06 사용자 승인 후 독립 게임 네 개에 한해 아래 원격 보존과 배포를 실행했으며 파일 삭제나 운영 데이터 변경은 없었다.

> 2026-09-07 최신 상태: 아래 2026-09-03 표의 “앞섬” 표시는 당시 조사 이력이다. 사용자 승인 후 연결 원격이 있는 저장소는 모두 Push해 동기화했고, 퀴즈타운도 복구 작업선을 `main`에 fast-forward하여 `9929bbf`까지 원격 보존했다. Firebase Hosting·Functions·Rules와 학생 레코드는 변경하지 않았다.

## 2026-09-07 최신 재검증

| 범위 | 최신 결과 |
| --- | --- |
| 퀴즈타운 | `main`·`origin/main`이 `9929bbf`에서 일치, `npm run check` 전체 통과. 복구 브랜치는 삭제하지 않음. Firebase 배포는 하지 않음 |
| 연결 원격 저장소 | 원격 전용 커밋이 0개임을 확인한 뒤 `dream-class`, `market-game`, `special-storage`, `climb-typing`, `seoul-math-game`, `seoul-heritage-main`, `detect-design`, `gas-quiz`, `habboasset/housing`까지 Push 완료 |
| Vercel | `dream-class` `bb4c06c`, `market-game` `bc9e010`, `special-marble` `832d8b2`, `detect-design` `ad5de11`이 Production Ready이며 공개 주소 HTTP 200 확인 |
| GitHub Pages | `seoul-math-game` 정상 응답. `climb-typing`은 공개 랭킹 일괄 삭제가 제거된 `docs/` 산출물 `4685526`을 Push하고 공개 HTML과 바이트 일치 확인 |
| 문화유산 보안 | 배포 RTDB 위험 확인 후 승인된 `users` 2,080개·`rankings` 7주차 비공개 백업과 해시 검증 완료. 익명 인증 활성화, 자동 정리 비활성. UID 호환 초안은 로컬 브랜치 `aad3acf`에만 보존했고 원본 데이터·운영 Rules·Pages는 변경하지 않음 |
| 코드 전용 비공개 원격 | `quiztown-room-proto`를 비공개 `cantroxx/quiztown-room-proto`에 Push. 추적 코드·문서 7개만 존재하며 ignore된 유료 에셋 362개는 원격에 없음 |

문화유산 게임은 규칙부터 잠그면 기존 사용자의 누적 기록 접근이 끊길 수 있다. 다음 단계는 삭제 없는 비공개 백업, UID 호환 복사, 전수 검증, 구 경로 잠금 순서이며 기존 레코드 삭제는 별도 승인 없이는 수행하지 않는다.

## Git과 원격 보존 상태

`git ls-remote`로 실제 원격 `main`을 조회했으며, 원격에만 존재하는 커밋은 모든 연결 저장소에서 0개였다.

| 저장소 | 현재 작업선 | 실제 원격 대비 | 판단 |
| --- | --- | --- | --- |
| `gas-quiz-firebase` | `codex/mathsurvivor-recovery` | 로컬 커밋만 앞서며 원격 전용 커밋 0개 | `ede6f29` 후속 보존 완료, 복구 브랜치 병합·push 결정 필요 |
| `gas-quiz` | `main` | 1개 앞섬 | 지침 커밋 원격 보존 필요 |
| `battle-school` | `main` | 원격과 일치 (`f8580b2`) | 기능·문서 Push와 자동 배포 완료 |
| `kbo-owner` | `main` | 원격과 일치 (`af5f413`) | 선수 가명화·저장 마이그레이션 Push와 자동 배포 완료 |
| `life-diary` | `main` | 비공개 원격과 일치 (`a5a1329`) | `cantroxx/life-picture-diary` 생성·Push·자동 배포 완료 |
| `seoul-math-game` | `main` | 1개 앞섬 | README 원격 보존 필요 |
| `seoul-heritage-main` | `main` | 2개 앞섬 | 운영 보안 전환과 분리해 문서 보존 필요 |
| `market-game` | `main` | 2개 앞섬 | 기능·README 원격 보존 필요 |
| `dream-class` | `main` | 2개 앞섬 | AI 생성 이미지 확인. 중복·형식 정리는 선택 보류 |
| `special-storage` | `main` | 2개 앞섬 | 기능·README 원격 보존 필요 |
| `climb-typing` | `main` | 2개 앞섬 | 소스 수정과 Pages 산출물 관계 결정 필요 |
| `math-escape` | `main` | 원격과 일치 (`b250878`) | 검수 문제·README Push와 자동 배포 완료 |
| `black-design/detect-design` | `main` | 1개 앞섬 | README 원격 보존 필요 |
| `habboasset/housing` | `main` | 1개 앞섬 | 에셋 공개 범위를 유지한 채 문서만 보존 필요 |
| `quiztown-room-proto` | `main` | 원격 없음 | 코드 전용 비공개 원격 여부 결정 필요 |

GitHub 공개 API에서 `battle-school`, `seoul-math-game`, `seoul-heritage`, `market-game`, `dream-class`, `special-marble`, `climb-typing`, `math-escape`, `detect-design`, `gas-quiz-firebase`는 공개 저장소로 확인됐다. `gas-quiz`, `kbo-owner`, `quiztown-housing`은 공개 API에 노출되지 않았으며, 로컬 자격으로는 원격 `main` 조회가 가능했다.

Git 밖의 `/Users/kdw/Projects/AGENTS.md`는 SHA-256 `b70cf0dcada99ac2b07a411cccd8566eabaa0d32910c3dd5532b0f062f579238`로 확인하고 `PROJECTS_COMMON_AGENTS_SNAPSHOT_2026-09-03.md`에 보존했다.

## 공개 배포와 로컬 원본 대조

공개 주소 11개는 모두 HTTP 200으로 응답했다. 로컬 정식 빌드 또는 기준 HTML과 배포 HTML의 해시·번들 이름을 비교했다.

| 프로젝트 | 결과 | 의미 |
| --- | --- | --- |
| `market-game` | 현재 로컬 빌드와 일치 | 배포 게임 코드 기준 확인 |
| `dream-class` | 현재 로컬 빌드와 일치 | 기존 아바타도 현재 공개 배포에 포함됨 |
| `special-storage` | 현재 로컬 빌드와 일치 | 배포 게임 코드 기준 확인 |
| `detect-design` | 현재 로컬 기준 HTML과 일치 | `.vercel/project.json`의 프로젝트명도 `detect-design` |
| `seoul-math-game` | 현재 로컬 `index.html`과 일치 | GitHub Pages 기준 확인 |
| `seoul-heritage-main` | 현재 로컬 `index.html`과 일치 | 운영 보안 위험도 그대로 존재 |
| `climb-typing` | 저장소의 기존 `docs/index.html`과 일치 | 새 `dist/`가 아니라 기존 Pages 산출물이 운영 기준 |
| `battle-school` | 현재 로컬 빌드와 일치 | `main` `f8580b2` Production Ready |
| `kbo-owner` | 현재 가명화 빌드와 일치 | `main` `af5f413` Production Ready |
| `math-escape` | 현재 로컬 빌드와 일치 | `main` `b250878` Production Ready |
| `life-diary` | 신규 주소에서 현재 로컬 빌드와 일치 | <https://life-picture-diary.vercel.app/>, `main` `a5a1329` Production Ready |

로그인된 Vercel 대시보드에서 위 네 프로젝트를 포함한 대상 프로젝트들의 GitHub 저장소와 `main` 연결을 확인했다. 신규 `life-picture-diary`도 Push 후 자동 재배포되는 것을 확인했다.

## 에셋·유일 원본 점검

- `habboasset/housing`: 추적 가구 폴더 198개와 ignore된 신규 폴더 66개가 그대로 분리돼 있다. 원격은 공개 API에 노출되지 않지만 기존 추적 에셋의 권리 범위는 확인되지 않았다.
- `quiztown-room-proto`: 유료 에셋 362개, 약 1.6MB가 모두 Git 미추적·ignore 상태다. 코드 저장소에는 에셋이 없다.
- `asset-archive`: 약 34MB, 124개 파일과 `gas-quiz-firebase-pre-rewrite-20260708.bundle`이 로컬에 있다. 같은 디스크 밖의 2차 백업은 확인되지 않았다.
- `dream-class`: 아바타 파일 24개는 실제 JPEG 형식의 1024×1024 이미지이며 13개 고유 파일로 구성된다. 사용자가 AI 생성 데이터임을 확인했으므로 출처·권리 문제로 교체할 필요는 없다. 중복과 확장자/실제 형식 불일치는 선택적 기술 정리 항목이다.
- `life-diary`: 이벤트 23개와 엔딩 8개는 외부 파일 없는 코드 기반 장면, 효과음은 Web Audio 합성이다. 전용 이미지 28개는 아직 만들지 않았다.

## 낱말대전 사전 provenance 복구

Claude 세션에서 다음을 복구했다.

- 국립국어원 2003년 한국어 학습용 어휘 XLS의 정확한 다운로드 URL
- `hunspell-dict-ko` 릴리스 `0.7.94`와 다운로드 URL
- 당시 `build_words.py`, `build_dict.js`의 전체 생성 로직
- NFD→NFC 정규화, 한글 1~4글자, 1글자 제한, 활용 파편과 아동 유해어 필터

입력 파일을 다시 내려받아 `DICTIONARY_NOTICE.md`에 SHA-256을 기록했다. 복구한 로직을 일반화한 두 스크립트로 80,774개 사전을 재생성했으며 기존 데이터 본문과 바이트 단위로 일치했다. 릴리스의 `LICENSE.md`에 따라 완성 `ko.dic`의 GPL-3.0 안내도 로컬에서 바로잡았다. 사전 본문은 바꾸지 않았다.

상류 릴리스의 `LICENSE.GPL-3` 원문을 게임 경로에 보존하고 시작 화면에서 전문과 상세 고지를 연결했다. 다음 운영 배포에서는 이 파일과 변경된 크레딧이 함께 포함되는지만 확인하면 된다.

관련 변경은 2026-09-05 `gas-quiz-firebase`의 로컬 커밋 `ede6f29`에 보존했다.

## KBO 장기 규칙 보완

- 계약이 0년으로 남는 대신, 미리 3년 재계약하지 않은 선수는 다음 시즌 1년 보류 계약과 20% 높은 연봉을 적용한다.
- 새 시즌 시작 시 캠프와 현재 선수단 전력으로 구단 기대치를 다시 계산한다.
- 관련 자동 검사를 추가했다.
- 운영 시스템 검사, Oxlint, Vite 빌드, 120시즌 시뮬레이션을 통과했다.
- 10개 구단은 유지하고 기본 선수 180명은 공개 가명으로 전환했으며 `noindex, nofollow`는 유지했다.
- 구버전 저장의 선수명·기록·명예의 전당·이벤트 문구도 안정적인 ID 기준으로 이전한다.
- 관련 변경은 2026-09-06 `kbo-owner`의 `af5f413`에 보존하고 원격·운영에 반영했다.

## 학생 플레이테스트 준비

`PLAYTEST_PROTOCOL_BATTLE_KBO_2026-09-03.md`에 이름·학교·학년·반·번호·계정·기기 정보 없이 선택형 결과만 받는 절차를 작성했다. 실제 학생 대상 실행이나 결과 수집은 하지 않았다.

## 2026-09-05까지 승인 전 실행하지 않은 작업

1. 어떤 저장소도 push·merge·deploy하지 않음
2. `life-diary`, `quiztown-room-proto` 원격을 만들지 않음
3. Vercel 프로젝트·도메인·Git 연결을 바꾸지 않음
4. Firebase·Kakao 콘솔과 학생 데이터를 조회하지 않음
5. Firebase Rules·데이터 구조를 변경하거나 배포하지 않음
6. 기존 에셋을 삭제·이동·교체하거나 공개 범위를 바꾸지 않음
7. 학생 플레이테스트를 실행하거나 개인 정보를 수집하지 않음

위 작업은 `DEFERRED_FOLLOWUPS_AFTER_STEP_12.md`의 승인 게이트와 사용자 결정을 따른다.

## 2026-09-06 승인 후 실행 결과

1. `battle-school`과 `math-escape`를 개별 Push하고 Vercel 자동 배포를 확인했다.
2. `kbo-owner`를 가명화한 뒤 검사·Push·자동 배포했다.
3. `life-diary` 비공개 GitHub 원격과 신규 Vercel 프로젝트를 만들고 배포했다.
4. 네 공개 주소의 Production 커밋과 HTML·번들을 로컬 빌드와 대조했다.
5. 개인정보·회원·학생 데이터와 Firebase·Kakao 운영 데이터는 조회·변경·삭제하지 않았다.
