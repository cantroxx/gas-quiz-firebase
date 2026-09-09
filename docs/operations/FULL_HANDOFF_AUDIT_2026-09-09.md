# Claude 이관·퀴즈타운 전체 후속 점검

점검일: 2026-09-09  
범위: `/Users/kdw/Projects`의 15개 Git 저장소, 퀴즈타운 내부 게임, 공개 배포본, 로컬 보존 자산  
원칙: 운영 학생·회원 데이터와 개인정보를 조회·수정·삭제하지 않는 읽기 전용 점검

## 결론

Claude에서 진행하던 작업을 Codex에서 안전하게 이어갈 수 있는 상태다. 기존 Claude 규칙과 작업 맥락은 `AGENTS.md`, 재개 메모, 1~12단계 로드맵, 보완 목록과 프로젝트 인벤토리로 이관됐고, 중단됐던 수학서바이버 작업도 복구 브랜치에 보존한 뒤 `main`에 포함됐다. 현재 `CLAUDE.md`는 `AGENTS.md`를 안내하는 호환 포인터일 뿐 작업 정본이 아니다.

코드·Git·주요 공개 배포에서 작업 유실이나 예상 밖의 미커밋 변경은 발견되지 않았다. 퀴즈타운 전체 검사와 9개 독립 npm 프로젝트 검사, 정적 게임 검사, 공개 주소 응답 및 로컬-배포본 대조를 통과했다. 따라서 지금부터 새 기능 개발을 재개해도 된다.

초기 점검에서는 Functions 운영 종속성 취약점, 배포 대기 중인 퀴즈타운 두 변경, 작은 공개 콘솔 오류, Rules 행동 테스트 부재를 확인했다. 아래 1~6 후속 실행에서 안전하게 처리 가능한 부분은 반영했고, 최신판에도 남는 Moderate 종속성 8건과 문화유산 기존 데이터 경로 위험은 보류했다. 어떤 항목도 학생 데이터를 삭제하거나 대량 변경하지 않았다.

## 2026-09-09 1~6 후속 실행 결과

사용자 일괄 승인으로 이 보고서에서 제시한 1~6을 처리했다.

1. Functions를 `firebase-functions@7.3.2`, `firebase-admin@14.3.0`으로 갱신해 전 함수를 Node 22 운영에 재배포했다. High 1건은 제거됐고 최신판에도 남는 Moderate 8건만 있다. npm이 제안하는 과거 10.x/4.x 강제 다운그레이드는 적용하지 않았다.
2. 수학서바이버 A1·B1·B2·B3과 워드배틀 사전 출처·GPL 고지를 Firebase Hosting에 반영했다. 주요 운영 파일은 로컬과 바이트 단위로 일치한다.
3. 워드배틀·하우징 favicon 404와 하우징의 예상된 비로그인 `login-required` pageerror를 제거했다. 공개 브라우저 smoke를 통과했다.
4. Firestore·Storage Rules 행동 테스트를 추가하고 `npm run check`에 포함했다. 공개·인증·본인·타인·관리자·금지 필드·프로필 이미지·잠긴 하우징 에셋의 허용/거부를 합성 데이터 Emulator에서 검증했다. 관리자 claim이 없는 일반 사용자의 Rules 평가도 명시적 false가 되도록 등가 보완해 배포했다.
5. 문화유산은 PIN 자동 재설정이나 보안 질문을 도입하지 않고, 분실 시 새 Game ID로 시작하되 기존 기록을 보존하는 정책을 화면과 문서에 반영했다. `61117c7`, favicon 보완 `6f21ea3`을 Pages에 반영했으며 기존 `users`·`rankings`·`usersV2` 데이터와 Rules는 변경하지 않았다.
6. 상위 `/Users/kdw/Projects/AGENTS.md`의 오래된 `life-diary`, `math-escape`, 문화유산 상태와 다음 작업 기준을 최신화했다.

퀴즈타운 배포 중 `saveClassroomGem` 한 함수가 Google Cloud의 분당 변경 요청 한도 429로 한 차례 재시도했으나 자동 재시도 후 성공했다. 전체 배포는 성공으로 종료됐다. 개인정보·회원·학생 데이터 삭제나 대량 수정은 없었다.

## 1. Claude 작업 이관 판정

| 확인 항목 | 판정 | 근거 |
| --- | --- | --- |
| 작업 규칙 | 완료 | `AGENTS.md`가 현재 정본이고 `CLAUDE.md`는 호환 포인터만 유지 |
| 과거 작업 맥락 | 완료 | Claude 메모 13개와 세션 20개를 현재 Git·운영본과 교차검증한 `RESUME_MEMO_2026-09-01.md` 존재 |
| 1~12단계 계획 | 완료 | `PROJECTS_WORK_ROADMAP_2026-09-01.md`에 실행·검증·승인 게이트 기록 |
| 중단 작업 | 완료 | 수학서바이버 WIP `f933809`, 완성 `44f4f8f`, 승인 기록 `9929bbf`가 `main`에 포함되고 복구 브랜치도 유지 |
| 게임·외부 링크 현황 | 완료 | `GAME_PROJECT_INVENTORY_2026-09-01.md`에 퀴즈타운 내부/외부 게임과 중복 계보 기록 |
| 민감한 과거 로그 이식 | 안전하게 제외 | 개인·학생 정보가 섞일 수 있는 원 세션을 새 문서에 복제하지 않고 필요한 기술 사실만 요약 |

이관의 의미는 모델이 과거 대화를 그대로 기억한다는 뜻이 아니라, 현재 코드와 검증 가능한 문서를 정본으로 삼아 같은 작업선을 재개할 수 있다는 뜻이다. 이 기준은 충족했다.

초기 점검에서 Git 밖 상위 `/Users/kdw/Projects/AGENTS.md`가 `life-diary`를 원격 없음으로, 문화유산을 UID 전환 전으로 설명하는 상태 지연을 발견했다. 1~6 후속 실행에서 최신 보고서 진입점과 `life-diary`, `math-escape`, 문화유산 상태를 동기화했다.

## 2. Git·원격 보존 상태

점검 시작 시 아래 15개 저장소는 모두 `main` 작업 트리가 깨끗했고, 실제 원격 `refs/heads/main`과 로컬 HEAD가 일치했다. 이후 퀴즈타운과 문화유산 후속 변경도 각각 커밋·Push했으며 최종 재확인에서 두 작업 트리와 원격 `main`이 다시 일치했다.

| 저장소 | 확인 커밋 |
| --- | --- |
| `battle-school` | `f8580b2` |
| `black-design/detect-design` | `ad5de11` |
| `climb-typing` | `4685526` |
| `dream-class` | `bb4c06c` |
| `gas-quiz-firebase` | `c09e8c6` |
| `gas-quiz` | `101e222` |
| `habboasset/housing` | `ce8e85d` |
| `kbo-owner` | `af5f413` |
| `life-diary` | `a5a1329` |
| `market-game` | `bc9e010` |
| `math-escape` | `b250878` |
| `quiztown-room-proto` | `a32b280` |
| `seoul-heritage-main` | `79eeaca` |
| `seoul-math-game` | `bcf0614` |
| `special-storage` | `832d8b2` |

비밀키·운영 내보내기 경로가 Git 추적 파일에 새로 포함된 흔적은 없었다. `exports/`, `private/`, 서비스 계정과 유료 에셋의 ignore 경계도 유지됐다.

## 3. 코드와 자동 검사

### 퀴즈타운

`npm run check` 전체 통과:

- 앱 번들 68개 파일 생성
- JavaScript 149개와 인라인 스크립트, 필수 경로 정적 검사
- 수학서바이버 DOM·캐시·학년·학기·과목·단원 필터 검사
- 도메인·애플리케이션·인프라 테스트
- 운영 공개 로그인 화면 브라우저 smoke

검사 뒤 자동 생성 파일에는 예상 밖의 차이가 생기지 않았다. 현재 차이는 이 점검 보고서와 관련 문서 갱신뿐이다.

### 독립 프로젝트

다음 9개 npm 프로젝트의 해당 검사·lint·build가 모두 통과했다.

- `battle-school`
- `climb-typing`
- `dream-class`
- `kbo-owner` — 운영 검사와 120시즌 시뮬레이션 포함
- `life-diary`
- `market-game`
- `math-escape`
- `special-storage`
- `black-design/detect-design`

빌드 과정이 없는 `gas-quiz`, `habboasset/housing`, `quiztown-room-proto`, `seoul-heritage-main`의 JavaScript 정적 파싱도 통과했다. 문화유산 UID 전환 전용 정적 안전 검사도 통과했다.

### Firebase Rules

Firestore와 Storage Rules는 Firebase Emulator의 demo 프로젝트에서 구문을 정상 로드했다. 출력된 `sun.misc.Unsafe` 경고는 Java emulator 런타임의 deprecation 경고이며 Rules 오류가 아니다.

다만 현재 저장소에는 허용/거부 사례를 실제로 단언하는 Firestore·Storage Rules 행동 테스트가 없다. 구문 정상과 권한 정책의 완전한 검증은 다르므로 테스트 보완이 필요하다.

## 4. 공개 배포 점검

퀴즈타운과 외부 게임 11개, 총 12개 공개 주소가 모두 HTTP 200으로 응답했다. 외부 게임 11개는 현재 로컬 기준 HTML 또는 정식 빌드와 바이트 단위로 일치했다.

최초 점검에서는 다음 두 항목이 로컬 변경을 보존했지만 Firebase Hosting에는 아직 반영되지 않은 상태였다.

| 항목 | 현재 차이 | 영향 |
| --- | --- | --- |
| 수학서바이버 | `index.html`, `style.css`, `game.js`가 운영본보다 새 버전 | A1·B1·B2·B3 학습 기능은 로컬·Git에만 있고 학생 운영 화면에는 아직 없음 |
| 워드배틀 | 화면의 사전 출처 링크와 `DICTIONARY_NOTICE.md`, `LICENSE.GPL-3`가 운영에 없음 | 게임 동작은 유지되지만 최신 provenance·GPL 고지가 아직 공개되지 않음 |

2026-09-09 사용자 승인 후 두 항목을 Hosting에 반영했고, 메인·하우징·특산물 마블·팔도 특산물 대상인과 함께 로컬 기준 파일과 운영본 일치를 확인했다.

## 5. 공개 화면 런타임 신호

최초 점검에서 주요 공개 화면은 치명적 JavaScript 오류 없이 열렸지만 두 가지 작은 품질 이슈를 재현했다.

1. 워드배틀과 하우징 직접 진입 시 `/favicon.ico`가 404다. 게임 리소스가 아니라 사이트 아이콘 누락이며 기능 영향은 없다.
2. 하우징 비로그인 직접 진입 시 잠금 안내는 정상 표시되지만 `assets-loader.js`가 처리 후 `login-required`를 다시 throw해 `pageerror`를 남긴다. 에셋 보호와 로그인 게이트는 동작하며 데이터 손상은 없다. 오류 모니터링의 잡음을 줄이려면 예상된 게이트 상태는 정상 결과로 종료하도록 보완할 수 있다.

두 항목은 2026-09-09 수정·배포했다. 같은 회귀를 잡도록 운영 smoke에 워드배틀과 하우징 독립 컨텍스트 검사를 추가했고, 문화유산에서 별도로 발견된 favicon 404도 제거했다.

로그인된 학생 흐름의 쓰기 동작과 운영 Functions 로그는 이번 읽기 전용 범위에서 검사하지 않았다. 로그에는 학생 식별정보나 요청 payload가 포함될 가능성이 있어 별도 최소수집 방식 없이 열람하지 않았다.

## 6. 새로 확인된 운영 종속성 위험

프론트엔드 9개 루트의 production dependency audit는 모두 취약점 0건이었다. 최초 `functions/` 감사에서는 총 13건이 확인됐다.

- High 1건: `form-data <2.5.6`의 multipart 필드명·파일명 CRLF injection
- Moderate 12건: `firebase-admin`이 사용하는 Firestore·Storage·Google client 전이 종속성, `protobufjs`, `qs`, `uuid` 등
- Critical 0건

기존 운영 문서의 “`firebase-functions@7.2.5`가 Admin 14를 허용하지 않는다”는 제약은 이제 오래된 정보다. 2026-09-09 기준 최신 `firebase-functions@7.3.2`는 `firebase-admin ^14`를 허용하고, 최신 `firebase-admin@14.3.0`은 현재 Functions 런타임인 Node 22를 지원한다.

후속 실행에서 두 직접 종속성을 함께 올리고 Functions 정적 검사·전체 정의 Emulator 로드·운영 워드배틀 callable ping을 통과한 뒤 재배포했다. 재감사 결과 High·Critical은 0, Moderate는 8건이다. 남은 항목은 최신 Admin SDK의 Storage/Google client 전이 경로이며, 해결책으로 표시되는 구버전 강제 다운그레이드는 적용하지 않는다.

## 7. 문화유산 다학교 이용 상태

중앙 문서에 남아 있던 `8786b01`과 “교사가 전환 코드를 배부”하는 설명은 최신이 아니었다. 자율 가입은 `79eeaca`, PIN 분실 정책은 `61117c7`, favicon 보완은 `6f21ea3`이며 GitHub Pages 배포본과 일치한다.

- 신규 이용자는 학교와 관계없이 10자리 Game ID와 6자리 PIN을 스스로 생성
- 기존 2,081명 기록과 기존 랭킹은 삭제하지 않고 유지
- 전환 코드는 예전 기록을 가져오려는 기존 사용자에게만 선택적으로 사용
- 신규 기록은 UID 기반 `usersV2`에 저장
- 운영 Rules는 호환 규칙과 일치하지만, 호환 기간의 기존 `users`·`rankings` 공개 위험은 아직 남음
- PIN 분실 시 자동 재설정 없이 새 ID로 시작하고 기존 기록을 보존하는 정책 적용. Kakao 허용 도메인은 계속 확인 필요

기존 사용자 수와 코드 수의 정확한 운영 재집계는 민감한 키 목록을 로컬 파일로 내보내야 해 이번 점검에서 실행하지 않았다. 2026-09-08에 확인한 2,081 대 2,081 기록은 보존하되, 최신 시점의 재집계로 간주하지 않는다.

## 8. 에셋·백업·선택 보류

- `habboasset/housing`: 추적 가구 594파일/198폴더와 ignore된 198파일/66폴더 분리 유지
- `quiztown-room-proto`: 유료 에셋 362개, 약 1.6MB 모두 Git 제외 유지
- `asset-archive`: 124파일, 약 34MB와 2026-07-08 Git bundle 보존
- 같은 디스크 밖 2차 백업 위치는 아직 미확인
- `dream-class`: AI 생성 아바타 권리 문제는 닫힘. 중복과 확장자/실제 형식 불일치는 선택 정리
- `life-diary`: 코드 장면은 정상. 별도 장면 이미지 제작은 선택 사항
- `battle-school`, `kbo-owner`: 개인정보를 받지 않는 학생 플레이테스트는 절차만 준비되고 실제 실행은 안 함

## 9. 후속 우선순위와 승인선

| 상태 | 작업 | 처리 결과 | 다음 승인 지점 |
| --- | --- | --- | --- |
| 완료·잔여 8건 관찰 | Functions 종속성 | 최신 호환판 배포, High 제거 | 다음 종속성 변경·Functions 배포 전 승인 |
| 완료 | 수학서바이버·워드배틀 Hosting 반영 | 운영 파일 일치·smoke 통과 | 다음 Hosting 배포 전 승인 |
| 완료 | 상위 `AGENTS.md` 동기화 | 최신 상태로 갱신 | 없음 |
| 완료 | 하우징 콘솔 예외·favicon | 운영 smoke 통과 | 다음 Hosting 배포 전 승인 |
| 완료 | Firestore·Storage Rules 행동 테스트 | `npm run check`에 편입·운영 Rules 반영 | Rules 정책 변경·배포 전 승인 |
| 정책 완료·기존 경로 보류 | 문화유산 PIN 분실과 기존 경로 | 무삭제 신규 시작 정책 배포 | 기존 경로 잠금, 데이터 이전·삭제 전 별도 승인 |
| 유지 보류 | 외부 2차 백업, 선택적 이미지 정리, 학생 플레이테스트 | 기존 계획 유지 | 파일 이동·클라우드 업로드·학생 수집 전 승인 |

개인정보·회원·학생 데이터의 삭제나 대량 변경은 위 어느 작업에도 자동으로 포함하지 않는다. 필요성이 생기면 백업·dry-run·복구 방법·정확한 대상 건수를 먼저 제시한 뒤 별도 승인을 요청한다.

## 10. 지금 개발을 시작해도 되는가

가능하다. 새 작업은 이 문서를 최신 진입점으로 삼고, 기능별로 다음 원칙을 유지한다.

1. `AGENTS.md`와 현재 Git 코드를 정본으로 사용한다.
2. 수학서바이버·워드배틀은 최신 코드가 Hosting에도 반영된 상태다.
3. Functions를 건드리는 작업은 최신판에도 남은 Moderate 8건과 함께 검증 계획을 세운다.
4. 학생 데이터·Rules·배포는 로컬 개발과 분리하고 승인 게이트를 유지한다.
5. 문화유산 신규 사용자는 개별 코드 배부가 아니라 자율 Game ID 방식이다.
