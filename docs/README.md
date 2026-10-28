# Project Documentation Map

This directory groups project documents by ownership so parallel work can stay scoped.

## Folders

- `architecture/`: Firebase schema, rules, integration notes, and refactor status.
- `migration/`: member, title, badge, quiz, ranking, and login migration plans.
- `operations/`: runbooks, opening checklist, known constraints, and browser smoke-test instructions.
- `product/`: economy, asset catalog, classroom prototype, and user-facing design notes.
- `seeding/`: Firestore seed and test-seed documents.
- `snippets/`: reference-only code, rules, and markup snippets.

Start with `architecture/PARALLEL_WORK_PLAN.md` when planning multiple terminals or the next clean-architecture phase.

## Current Handoff

- `operations/WORKSPACE_RELEASE_2026-10-28.md`: 기본 흰 티·청반바지, 미커밋 작업 통합 커밋·배포·운영 검증 기록.
- `operations/COORDI_WINDOWS_INTEGRATION_2026-10-28.md`: Windows 묶음 검증·자체 렌더러/상점 연결·26개 픽셀 일치·판매 단품 검사·Windows 보완 요청.

- `architecture/COORDI_RENDERER_WINDOWS_HANDOFF_2026-10-28.md`: 메이플 코디 Windows 인계 요구사항·기존 거래/저장/ID 계약·공통 렌더 교체 경계·검증 상태.

- `operations/CLASSROOM_FOLLOWUP_EXECUTION_2026-10-21.md`: 교실 F-01~F-16 후작업의 구현·이전 정책·릴리스 범위.
- `operations/CLASSROOM_POST_FOLLOWUP_VERIFICATION_2026-10-21.md`: 후작업 및 최종 총점검 결과, 원본 미처리 계약과 실제 이전 보류 조건.

- `product/CLASSROOM_BOARD_PHASES_1_3_2026-10-21.md`: 전자칠판 수업 보드 1~3차 목표·구현·검증과 그라운드 이전 준비 기준.
- `operations/CLASSROOM_BOARD_FOLLOWUPS_2026-10-21.md`: 수업 보드 전체 점검 후 후작업·현장 확인·실제 이전 준비.

- `operations/ADMIN_REFRESH_DEPLOYMENT_2026-10-21.md`: 관리자 최신화 운영 배포 완료·후보 검증·소스 및 설정 보존 결과.

- `operations/ADMIN_REFRESH_PLAN_2026-10-19.md`: 관리자 최신화 단계·목표·검증 정본. 증권은 교실 안에서만 관리.

- `product/TOWN_SPATIAL_UX_PLAN_2026-10-18.md`: 새 원화 8개를 사용하는 공간형 UI의 단계별 정본. 마을 산책·건물 입장·실내 사물 선택·실제 기능 패널·모바일 전체/확대 보기. 앞선 배너 개편 이후의 별도 작업.
- `product/TOWN_UI_SIMPLIFICATION_PLAN_2026-10-18.md`: 로그인·타운·내부 공간 그림책 UI 개편의 단계별 정본. 오늘의 퀘스트 유지, 시즌 이벤트·오늘의 퀴즈 학생 노출 제거, 별도 랭킹 단일화·재화 초기화와의 경계.
- `operations/FRACTION_WORLD_IMPLEMENTATION_2026-09-11.md`: 분수 월드 두 게임의 구현·실행·검증·로컬 저장 및 배포 범위
- `product/FRACTION_WORLD_DESIGN_2026-09-11.md`: 균열의 탑 24방과 스타라이트 스튜디오 28일 시즌의 콘텐츠·학습 설계
- `operations/FULL_HANDOFF_AUDIT_2026-09-09.md`: Claude 이관 완결성, 15개 저장소·자동 검사·공개 배포 대조, 최신 오류와 후속 우선순위의 현재 정본
- `operations/PROJECTS_WORK_ROADMAP_2026-09-01.md`: 완료된 Projects 전체 작업 1~12단계의 실행 결과·검증·승인 게이트 정본
- `operations/WORKSPACE_STATUS_2026-09-01.md`: 작업 가능 여부, 게임별 상태, 현재 변경과 안전한 재개 순서를 한 문서로 정리한 시작점
- `operations/PROJECT_SAFETY_AUDIT_2026-09-02.md`: 유료 에셋·실명·학생 데이터·사전 라이선스의 공개 금지선과 승인 게이트
- `operations/DEFERRED_FOLLOWUPS_AFTER_STEP_12.md`: 현재 다음 작업인 `D-01`~`D-12` 보존·저작권·운영 보류 항목과 승인 순서
- `operations/DEFERRED_FOLLOWUPS_AUDIT_2026-09-03.md`: `D-01`~`D-12` 읽기 전용 조사, 배포본 대조, 자동 검사와 승인 대기 항목의 최신 결과
- `operations/PLAYTEST_PROTOCOL_BATTLE_KBO_2026-09-03.md`: 개인정보를 받지 않는 배틀 스쿨·KBO 학생 플레이테스트 절차
- `operations/PROJECTS_COMMON_AGENTS_SNAPSHOT_2026-09-03.md`: Git 밖 상위 공통 지침의 복구용 보존본
- `operations/COMMIT_CANDIDATES_AFTER_STEP_12_2026-09-03.md`: C-01~C-12 저장소별 로컬 커밋의 검수·실행 기록
- `architecture/RESUME_MEMO_2026-09-01.md`: Claude 작업 기록을 현재 Git·운영본과 교차검증한 퀴즈타운 재개 기준
- `product/GAME_PROJECT_INVENTORY_2026-09-01.md`: `/Users/kdw/Projects`의 독립 게임, 외부 퀴즈 링크, 중복 계보, 재개 상태

## Script Folders

- `../scripts/audit/`: operational inspection, backup, preview, and analysis scripts.
- `../scripts/maintenance/`: cleanup, restore, reset, and other maintenance scripts.
- `../scripts/migration/`: import, backfill, normalize, and migration scripts.
- `../scripts/seed/`: seed, grant, and initial data creation scripts.
- `../scripts/smoke/`: browser smoke tests and verification scripts.

## Data Folders

- `../fixtures/`: committed sample data used by scripts or docs.
- `../exports/`: ignored local export data.
- `../private/`: ignored private operational data.

## Root Files Kept Intentionally

- `AGENTS.md`: Codex working rules.
- `Code.js`, `index.html`, `appsscript.json`: legacy Apps Script reference files.
- Firebase config files and `public/`, `functions/`: active runtime sources/configuration.
