# Projects 공통 AGENTS.md 보존본

원본 위치: `/Users/kdw/Projects/AGENTS.md`
최초 보존일: 2026-09-03
최근 동기화: 2026-09-05
원본 SHA-256: `794326adb00ca93ac4cc344f441ffc72354ccd26eb7520295e758b30d8803182`

이 파일은 Git 저장소 밖에 있는 공통 지침이 유실될 경우를 대비한 읽기 전용 스냅샷이다. 실제 작업에서는 상위 경로의 현재 `AGENTS.md`를 먼저 읽고, 이 보존본은 해시 대조와 복구에만 사용한다.

---

# Projects 공통 개발 규칙

이 폴더의 모든 프로젝트에 적용되는 Codex 작업 규칙이다. 프로젝트 폴더 안에 별도 `AGENTS.md`가 있으면 이 공통 규칙과 함께 적용한다.

## 기본 스택과 워크플로우

- 기본 스택: React + Vite. 일부 프로젝트는 순수 HTML/CSS/JS다.
- 배포: Vercel 또는 GitHub Pages. 퀴즈타운은 Firebase Hosting을 사용한다.
- 백엔드가 필요하면 Firebase Hosting, Firestore, Functions, Auth를 사용한다.
- 기본 흐름: 로컬 검증 → Git 상태 확인 → 사용자 요청이 있을 때만 commit·push·deploy

## 학생용 앱 원칙

- 주요 사용자는 초등 4학년이다.
- 쉬운 한국어, 큰 글씨, 터치 친화적 버튼을 유지한다.
- 점수·보상·캐릭터 같은 게임 요소를 학습 동기와 연결한다.

## 영구 안전 규칙

1. Firebase 보안 규칙이나 학생 데이터에 영향을 주는 변경은 변경 내용과 검증 방법을 먼저 설명하고 사용자 확인 후 진행한다.
2. 파일·폴더 삭제는 항상 사용자에게 먼저 확인받는다.
3. 요청 없는 commit, push, deploy를 하지 않는다.
4. 운영 데이터, 비밀값, 미추적 라이선스 에셋을 공개 저장소에 추가하지 않는다.

## 프로젝트 목록과 작업 인수인계

전체 게임·외부 퀴즈·Git 상태·중복 계보는 다음 문서를 기준으로 한다.

- 전체 실행 로드맵: `gas-quiz-firebase/docs/operations/PROJECTS_WORK_ROADMAP_2026-09-01.md`
- 현재 상태 종합 보고서: `gas-quiz-firebase/docs/operations/WORKSPACE_STATUS_2026-09-01.md`
- 자산·저작권·운영 안전 점검: `gas-quiz-firebase/docs/operations/PROJECT_SAFETY_AUDIT_2026-09-02.md`
- D-01~D-12 최신 점검: `gas-quiz-firebase/docs/operations/DEFERRED_FOLLOWUPS_AUDIT_2026-09-03.md`
- 종합 인벤토리: `gas-quiz-firebase/docs/product/GAME_PROJECT_INVENTORY_2026-09-01.md`
- 퀴즈타운 작업 재개 메모: `gas-quiz-firebase/docs/architecture/RESUME_MEMO_2026-09-01.md`

프로젝트를 수정하기 전 위 문서에서 해당 게임의 기준 원본과 미커밋 상태를 확인한다. 문서 기준일 이후 Git·코드가 바뀌었으면 현재 상태를 우선하고 차이를 보고한다.

별도 우선 지시가 없으면 전체 실행 로드맵에서 가장 앞에 있는 미완료 단계를 다음 작업으로 삼는다. 단계 완료 후 로드맵의 상태와 완료 기록을 갱신한다.

### 현재 기준 원본

- `gas-quiz-firebase`: 퀴즈타운 운영본. 내부 게임은 `public/mathsurvivor`, `public/wordbattle`, `marble-src`, `geosang-src`, `public/housing`
- `seoul-heritage-main`: 문화유산 게임 운영본. 삭제된 테스트 폴더를 다시 기준으로 삼지 않는다.
- `seoul-math-game`: 외계인 수학 침공. 2026-09-01 원격 저장소에서 로컬 복구했으며 GitHub Pages 배포본과 일치
- `black-design/detect-design`, `climb-typing`, `dream-class`, `market-game`, `math-escape`: 퀴즈타운 외부 퀴즈에 연결된 독립 게임
- `battle-school`, `kbo-owner`, `life-diary`, `special-storage`: 퀴즈타운과 분리된 독립 게임
- `habboasset/housing`, `quiztown-room-proto`: 현재 퀴즈타운 하우징의 선조·실험판. 에셋 라이선스와 미추적 파일 주의
- `gas-quiz`: Firebase 이전 GAS 레거시. 신규 기능 대상이 아님
- `asset-archive`: 저작권 분리 에셋과 이력 재작성 전 Git bundle. 삭제 금지

### 현재 특별 주의

- 수학서바이벌의 중단 변경은 `codex/mathsurvivor-recovery` 작업선에 보존되었고 A1·B1·B2·B3은 로컬 기능·검증까지 완료했다. 운영 배포는 별도 승인 전 금지다.
- `math-escape` 문제 교체와 린트 오류는 검수·고정 검사 후 `fe5bfff`에 보존되었다.
- `life-diary`는 로컬 Git 기준점과 build smoke를 확보했지만 원격이 없다. `life-diary.vercel.app`은 그림일기 게임이 아닌 다른 앱이므로 새 고유 Vercel 프로젝트·주소를 사용자 승인 후 정한다.
- `habboasset/housing/furni`의 미추적 66개 에셋은 ignore로 보존되어 있다. 강제 추가·재배포하지 않는다.
- `seoul-heritage-main`은 학생 식별정보 권한 구조를 UID 기반으로 전환하기 전 운영 규칙·데이터 변경을 보류한다.
- `wordbattle` 사전은 국립국어원 XLS와 `hunspell-dict-ko` 0.7.94, 입력 해시·생성 절차를 복구하고 GPL-3.0 전문·화면 링크를 로컬에 포함했다. 사전만 별도 복사·재배포하지 않으며 운영 반영은 별도 승인 전 금지다.
