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
