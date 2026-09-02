# 게임 프로젝트 종합 인벤토리 (2026-09-01)

이 문서는 `/Users/kdw/Projects`에 흩어진 퀴즈타운 관련 게임과 독립 게임을 다시 찾고 개발을 재개하기 위한 기준 문서다.

## 조사 기준

- 기준일: 2026-09-01
- 2026-07-08 이후 추가·변경된 프로젝트는 Git 이력을 우선 사용했다.
- Git이 없는 폴더는 파일 수정 시각을 보조 기준으로 사용했다. 복사·압축 해제 시각일 수 있으므로 생성일로 단정하지 않는다.
- 상태 판단 우선순위는 `현재 코드와 Git > 실제 배포본 > Claude 메모 > 파일 시각`이다.
- Claude 원본 대화에는 오래된 배포 상태와 운영 계정 정보가 섞여 있어 원문을 저장소에 복사하지 않았다.

## 퀴즈타운 외부 퀴즈 등록 현황

Firestore `appSettings/externalQuizzes`와 `appSettings/featureFlags`를 읽기 전용으로 확인했다. `externalQuizzesEnabled`는 활성 상태이고, 등록된 7개 링크는 모두 응답했다.

| 표시 이름 | 운영 주소 | 로컬 원본 | 재개 상태 |
| --- | --- | --- | --- |
| 문화유산 퀴즈 | <https://cantroxx.github.io/seoul-heritage/> | `/Users/kdw/Projects/seoul-heritage-main` | 운영본 저장소. Git 깨끗함 |
| 외계인 퇴치 퀴즈 | <https://cantroxx.github.io/seoul-math-game/> | `/Users/kdw/Projects/seoul-math-game` | 2026-09-01 원격 저장소에서 복구. 배포본과 파일 해시 일치 |
| 탐정 게임 | <https://detect-design.vercel.app/> | `/Users/kdw/Projects/black-design/detect-design` | Git 깨끗함. `npm run check` 통과 |
| 올라타자 게임 | <https://cantroxx.github.io/climb-typing/> | `/Users/kdw/Projects/climb-typing` | 빌드 성공. 린트는 소스와 `docs/assets` 산출물 문제로 실패 |
| 시장에 가면 게임 | <https://market-game-roan.vercel.app/> | `/Users/kdw/Projects/market-game` | Git 깨끗함. 빌드 성공 |
| 인생 게임 | <https://dream-class-omega.vercel.app/> | `/Users/kdw/Projects/dream-class` | 소스는 깨끗함. `dist/`, `node_modules/` 미추적 |
| 수학 방탈출 | <https://math-escape-tan.vercel.app/> | `/Users/kdw/Projects/math-escape` | 문제 데이터에 미커밋 변경. 빌드 성공, 린트 오류 3개 |

외부 퀴즈는 링크 모음이다. 독립 게임을 퀴즈타운 저장소 안으로 옮길 필요는 없다.

## 2026-07-08 이후 생성·추가된 독립 게임

### 배틀 스쿨

- 위치: `/Users/kdw/Projects/battle-school`
- 최초 커밋: 2026-08-01 `1745517`
- 저장소: `cantroxx/battle-school`
- 운영: <https://battle-school.vercel.app/>
- 상태: Git 깨끗함, 빌드 성공, 린트 오류 1개
- 완성 범위: 문제풀이 전투, 장비·상점, 물약, 콤보, 강공격, 무한의 탑, 오답 복습, 업적·칭호, 도감, 저장
- 마지막 사용자 피드백: “게임이 아직 얕다.”
- Claude가 제안했지만 구현하지 않은 다음 단계: 직업 4종, 스킬 게이지, 몬스터 과목 약점·특수 패턴, 선택형 장비·펫·퀘스트
- 퀴즈타운과 독립 유지 결정. 문제 파일만 퀴즈 서바이버에서 복사한 구조다.

### 프로야구 구단주

- 위치: `/Users/kdw/Projects/kbo-owner`
- 최초 작업: 2026-07-31~08-01
- 저장소: `cantroxx/kbo-owner`
- 운영: <https://kbo-owner.vercel.app/>
- 상태: Git 깨끗함, 빌드·린트·`npm run sim` 통과
- 검증 수치: 타율 .275, 팀 득점 4.22, 홈런 .85, 무승부 2.2%, 최강팀 승률 약 .571, 23세 잠재력 5 성장 +10
- 완성 범위: 10구단 180명, 주간 훈련, 3연전, 정규시즌·포스트시즌·캠프·다음 시즌, 로컬 저장
- 다음 단계: 실제 선수 데이터 검수, FM식 깊이 보강. 로고·사진 사용 금지와 `noindex` 방침 유지

### 인생 그림일기

- 위치: `/Users/kdw/Projects/life-diary`
- 파일 작업일: 2026-07-23
- 운영: <https://life-diary.vercel.app/>
- 상태: 2026-09-02 빌드 성공, 로컬 Git 첫 기준점 `b628d7e` 생성
- 완성 범위: 초등 6년+중학교 입학, 이벤트 21+1개, 선택 결과 문장, 조건 플래그, 스탯 5종, 저장 슬롯 4개, 엔딩 5종
- Claude 메모의 “미배포” 상태는 오래된 정보이며 현재는 배포되어 있다.
- 다음 단계: Vercel이 참조하는 원격 저장소·브랜치를 배포 전에 확인하고, `IMAGE_GUIDE.md`에 따른 장면 이미지 투입·압축·라이선스 기록

### 특산물 부루마블 독립판

- 위치: `/Users/kdw/Projects/special-storage`
- 최초 커밋: 2026-07-16 `628da6b`
- 저장소: `cantroxx/special-marble`
- 운영: <https://special-marble.vercel.app/>
- 상태: Git 깨끗함, 빌드 성공
- 계보: 퀴즈타운의 `marble-src/`보다 오래된 독립 선조다. 공통 파일 일부만 동일하고 온라인·전투·4인 로직은 퀴즈타운 쪽이 더 최신이다.
- 독립 배포를 유지할 때만 이 저장소를 수정한다. 퀴즈타운 마블 수정의 기준 원본으로 사용하지 않는다.

### 하우징 독립 체험판

- 위치: `/Users/kdw/Projects/habboasset/housing`
- 최초 커밋: 2026-07-09
- 저장소: `cantroxx/quiztown-housing`
- 상태: 추적 소스는 깨끗하지만 `furni/` 아래 에셋 디렉터리 66개가 미추적
- 계보: 퀴즈타운 `public/housing/`으로 이식하기 전의 엔진·에셋 실험판이다.
- Habbo/Sulake 에셋의 교육·비상업 제한과 재배포 위험이 있다. 미추적 에셋을 공개 저장소에 올리지 않는다.

### 퀴즈타운 방 프로토타입

- 위치: `/Users/kdw/Projects/quiztown-room-proto`
- 파일 시각: 2026-07-08 경계
- 상태: Git 없음. Pixel Salvaje 유료 에셋 기반 초기 프로토타입
- 계보: 현재 기준 구현은 `gas-quiz-firebase/public/housing/`이다.
- 에셋은 재배포 금지이므로 공개 저장소에 포함하지 않는다.

## 기존 독립 게임

| 프로젝트 | 위치 | 상태와 재개 포인트 |
| --- | --- | --- |
| 탐정 게임 | `/Users/kdw/Projects/black-design/detect-design` | 5개 사건·5개 엔딩. 순수 HTML/CSS/JS. 구조 검사 통과 |
| 올라타자 | `/Users/kdw/Projects/climb-typing` | 빌드 성공. 린트 설정이 배포 산출물까지 검사하며 소스에도 React 규칙 위반이 남음 |
| 꿈의 교실 | `/Users/kdw/Projects/dream-class` | 빌드 성공. 생성물 정리와 테스트·문서 보강 필요 |
| 시장에 가면 | `/Users/kdw/Projects/market-game` | 빌드 성공. 테스트·README 없음 |
| 수학 마법학교 탈출 | `/Users/kdw/Projects/math-escape` | `src/data/gameData.js`에 +46/-43 미커밋 문제 교체. 유지 여부와 정답 검수 필요 |
| 서울 문화유산 | `/Users/kdw/Projects/seoul-heritage-main` | 운영본. 랭킹전과 학습모드 분리. 학생 운영 DB 변경 전 승인 필수 |
| 외계인 수학 침공 | `/Users/kdw/Projects/seoul-math-game` | 단일 `index.html`, 4학년 곱셈·나눗셈 기반 서울 지도 탈환. 배포본과 로컬 원본 일치 |

## 퀴즈타운 내부 게임

다음은 외부 링크 게임이 아니라 `gas-quiz-firebase` 안에서 운영되는 기능이다.

| 게임·기능 | 기준 소스 | 현재 역할 |
| --- | --- | --- |
| 퀴즈 서바이버 | `public/mathsurvivor/` | 3~6학년·양학기·5과목, 역사모드, 각성·도감, 오답노트, 랭킹 |
| 낱말 대전 | `public/wordbattle/` | 공용 낱말판, 봇·온라인 대전, 80,774단어, 랭크·재입장 |
| 특산물 마블 | `marble-src/` → `public/marble/` | 2~4인 온라인 무역 대전. `public/marble/` 직접 수정 금지 |
| 팔도 특산물 대상인 | `geosang-src/` → `public/geosang/` | 17개 시·도 이동·무역·도감·랭킹 |
| 하우징·명예의 전당 | `public/housing/` | 방 꾸미기, 상점·쿠폰·방명록·방문, 랭킹 왕 전시 |

세부 재개 상태와 중단된 Claude 변경은 `docs/architecture/RESUME_MEMO_2026-09-01.md`를 따른다.

## 게임이 아닌 보관·참고 폴더

- `/Users/kdw/Projects/asset-archive`: 저작권 문제로 공개 저장소에서 분리한 에셋과 2026-07-08 이력 재작성 전 Git bundle. 삭제 금지
- `/Users/kdw/Projects/economy`: 학급 경제 독립 프로토타입. 현재 퀴즈타운 연동 설계 참고용
- `/Users/kdw/Projects/vibe-samples`: 수업용 단일 HTML 샘플 4종. 제품 게임으로 취급하지 않음
- `/Users/kdw/Projects/gas-quiz`: Firebase 이전의 GAS 레거시. 신규 기능 작업 대상 아님
- `/Users/kdw/Projects/black-design`: `detect-design` 저장소와 참고자료를 담은 상위 폴더. `.env.local`을 커밋하지 않음

## 다른 프로젝트를 Codex에서 재개하는 방법

현재 작업의 쓰기 루트는 `gas-quiz-firebase`다. 다른 게임을 수정할 때는 해당 폴더를 Codex의 별도 프로젝트로 열고 다음 순서를 지킨다.

1. 상위 `/Users/kdw/Projects/CLAUDE.md`와 프로젝트별 `CLAUDE.md`·`AGENTS.md`를 읽는다.
2. 이 인벤토리에서 해당 프로젝트의 계보와 미커밋 상태를 확인한다.
3. `git status`, 최근 커밋, 배포 주소를 다시 확인한다.
4. 미커밋 변경은 의도를 설명한 뒤 유지·수정·폐기 중 하나를 사용자와 결정한다.
5. 빌드와 가능한 검사부터 통과시킨 뒤 브라우저 실플레이를 한다.
6. 요청 없는 배포·커밋·푸시는 하지 않는다.
