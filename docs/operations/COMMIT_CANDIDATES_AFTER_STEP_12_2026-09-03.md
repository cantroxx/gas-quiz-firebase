# 1~12단계 변경 커밋 후보 검수표

검수일: 2026-09-03
범위: `/Users/kdw/Projects`의 로드맵 9~12단계 미커밋 변경과 관련 문서

## 결론

기능 변경 3개 저장소와 README 변경 저장소를 서로 섞지 않고 개별 로컬 커밋으로 보존했다. 2026-09-03 사용자 승인에 따라 C-01~C-11을 완료했고, C-12는 이 문서와 작업공간 정본 문서를 함께 보존하는 커밋이다. push, merge, deploy는 실행하지 않았다. 학생·회원 데이터, Firebase Rules·Functions·Storage, 운영 설정, 유료·출처 미확인 에셋도 변경하지 않았다.

커밋 전에 발견한 `kbo-owner`의 홈·원정 팬 만족도 계산 오류는 수정하고 고정 검사를 추가했다. 그 밖의 즉시 커밋을 막는 코드 오류는 확인되지 않았다. 장기 설계가 필요한 KBO 계약 만료·다음 시즌 기대치 규칙은 `D-11`로 남겼다.

## 실행 결과

| 후보 | 저장소 | 로컬 커밋 |
| --- | --- | --- |
| C-01 | `battle-school` | `f8580b2` |
| C-02 | `kbo-owner` | `f82e362` |
| C-03 | `life-diary` | `e7d3564` |
| C-04 | `seoul-math-game` | `bcf0614` |
| C-05 | `market-game` | `bc9e010` |
| C-06 | `dream-class` | `bb4c06c` |
| C-07 | `special-storage` | `832d8b2` |
| C-08 | `seoul-heritage-main` | `054a3cf` |
| C-09 | `climb-typing` | `17e46b1` |
| C-10 | `math-escape` | `b250878` |
| C-11 | `black-design/detect-design` | `ad5de11` |
| C-12 | `gas-quiz-firebase` | 이 문서를 포함하는 `docs: complete workspace roadmap and preservation plan` 커밋 |

## 후보 C-01: battle-school 깊이 보강

- 저장소: `/Users/kdw/Projects/battle-school`
- 현재 브랜치: `main` (`origin/main`보다 기존 커밋 1개 앞섬)
- 제안 메시지: `feat: deepen battle jobs skills and monster strategy`
- 포함 파일:
  - `README.md`
  - `package.json`
  - `scripts/check-game.mjs`
  - `src/App.css`
  - `src/App.jsx`
  - `src/game/combat.js`
  - `src/game/data.js`
  - `src/game/storage.js`
  - `src/screens/BattleScreen.jsx`
  - `src/screens/HomeScreen.jsx`
  - `src/screens/ShopScreen.jsx`
- 검수: 구버전 저장 보완, 장비 ID 조회, 4직업 해금, 스킬 게이지, 과목 약점, 특수 패턴, 선택형 장비 흐름 확인
- 검사: `npm run check` 통과. 전용 게임 검사·Oxlint·Vite 빌드 성공

## 후보 C-02: kbo-owner 프런트 오피스 확장

- 저장소: `/Users/kdw/Projects/kbo-owner`
- 현재 브랜치: `main` (`origin/main`보다 기존 커밋 2개 앞섬)
- 제안 메시지: `feat: add front office and long-term club operations`
- 포함 파일:
  - `README.md`
  - `package.json`
  - `scripts/check-operations.js`
  - `scripts/simulate.js`
  - `src/App.jsx`
  - `src/components/ui.jsx`
  - `src/engine/constants.js`
  - `src/engine/league.js`
  - `src/engine/operations.js`
  - `src/engine/postseason.js`
  - `src/engine/view.js`
  - `src/index.css`
  - `src/save.js`
  - `src/screens/FrontOffice.jsx`
  - `src/screens/Home.jsx`
  - `src/screens/Offseason.jsx`
  - `src/screens/Postseason.jsx`
  - `src/screens/Roster.jsx`
  - `src/screens/SeriesView.jsx`
  - `src/screens/Standings.jsx`
  - `src/screens/Training.jsx`
- 검수 중 수정: 경기 결과에 `homeId`·`awayId`를 보존해 홈·원정 승리를 정확히 계산하고 무승부를 팬 만족도 패배로 세지 않도록 변경. 트레이드 성사 후 선택값도 현재 선수단으로 초기화
- 검사: 운영 시스템 고정 검사·Oxlint·Vite 빌드·120시즌 시뮬레이션 통과
- 비차단 후속: 계약 0년 선수 규칙과 다음 시즌 기대치 재산정은 `D-11`

## 후보 C-03: life-diary 콘텐츠 완성

- 저장소: `/Users/kdw/Projects/life-diary`
- 현재 브랜치: `main` (원격 없음)
- 제안 메시지: `feat: complete diary scenes endings sound and album`
- 포함 파일:
  - `ASSET_PROVENANCE.md`
  - `README.md`
  - `package.json`
  - `scripts/check-content.mjs`
  - `src/App.jsx`
  - `src/components/DiaryCard.jsx`
  - `src/components/EndingScreen.jsx`
  - `src/components/GameScreen.jsx`
  - `src/components/SceneIllustration.jsx`
  - `src/data/events.js`
  - `src/styles.css`
  - `src/utils/sfx.js`
- 검수: 기존 저장의 누락 앨범 필드 대체 표시, 23개 이벤트와 8개 엔딩 장면, 음소거 저장, 조합 엔딩 우선순위 확인
- 검사: 콘텐츠 고정 검사와 Vite 빌드 통과. 실제 브라우저 13학기 완주·조합 엔딩·앨범 13개·모바일 확인 완료
- 비차단 후속: 전용 이미지 28개 제작은 `D-09`, 원격·Vercel 관계는 `D-02`

## 후보 C-04~C-11: 프로젝트별 README

아래는 각기 다른 Git 저장소이므로 반드시 한 저장소씩 별도 커밋한다. 제안 메시지는 공통으로 `docs: document run deploy storage and safety`를 사용할 수 있다.

| 후보 | 저장소 | 파일 | 현재 브랜치 상태 |
| --- | --- | --- | --- |
| C-04 | `seoul-math-game` | 새 `README.md` | `main`은 `origin/main`과 같음 |
| C-05 | `market-game` | `README.md` | 기존 로컬 커밋 1개 앞섬 |
| C-06 | `dream-class` | `README.md` | 기존 로컬 커밋 1개 앞섬 |
| C-07 | `special-storage` | `README.md` | 기존 로컬 커밋 1개 앞섬 |
| C-08 | `seoul-heritage-main` | 새 `README.md` | 기존 로컬 커밋 1개 앞섬 |
| C-09 | `climb-typing` | `README.md` | 기존 로컬 커밋 1개 앞섬 |
| C-10 | `math-escape` | `README.md` | 기존 로컬 커밋 1개 앞섬 |
| C-11 | `black-design/detect-design` | `README.md` | `main`은 `origin/main`과 같음 |

README에는 게임 목적·대상, 로컬 실행·검증, 운영 주소·배포 방식, 저장 키·백엔드, 기준 소스·산출물, 저작권·외부 서비스, 알려진 제한을 기록했다. 확인되지 않은 Vercel 연결은 확정 사실로 쓰지 않고 `D-12`로 남겼다.

## 후보 C-12: 작업공간 정본 문서

- 저장소: `/Users/kdw/Projects/gas-quiz-firebase`
- 현재 브랜치: `codex/mathsurvivor-recovery`
- 브랜치 관계: C-12 실행 전 `main`보다 4개, `origin/main`보다 5개 앞섬. C-12 완료 후에는 각각 5개, 6개 앞섬
- 제안 메시지: `docs: complete workspace roadmap and preservation plan`
- 포함 파일:
  - `AGENTS.md`
  - `docs/README.md`
  - `docs/operations/COMMIT_CANDIDATES_AFTER_STEP_12_2026-09-03.md`
  - `docs/operations/DEFERRED_FOLLOWUPS_AFTER_STEP_12.md`
  - `docs/operations/PROJECTS_WORK_ROADMAP_2026-09-01.md`
  - `docs/operations/PROJECT_SAFETY_AUDIT_2026-09-02.md`
  - `docs/operations/WORKSPACE_STATUS_2026-09-01.md`
  - `docs/product/GAME_PROJECT_INVENTORY_2026-09-01.md`
- 검수: 퀴즈 서바이버의 과거 “미완료 로컬 diff” 설명을 실제 `44f4f8f` 완료 상태와 현재 브랜치 관계에 맞게 수정
- 주의: 이 커밋을 현재 복구 브랜치에 둘지, 이후 `main` 병합에 포함할지 사용자 결정 필요

## 커밋 전 검사 결과

- `battle-school`: `npm run check` 통과
- `kbo-owner`: `npm run check` 통과
- `life-diary`: `npm run check` 통과
- 2026-09-02 문서 정리 시 나머지 npm 프로젝트 6개도 각 `npm run check` 통과
- 관련 저장소의 추적 파일과 신규 파일 모두 `git diff --check` 통과
- 빌드 산출물 `dist/`와 `node_modules/`는 커밋 후보에 포함하지 않음

## 실행 순서와 남은 결정

1. C-01~C-03 기능 변경의 저장소별 로컬 커밋을 완료했다.
2. C-04~C-11 README의 저장소별 로컬 커밋을 완료했다.
3. C-12 작업공간 문서는 현재 복구 브랜치에 커밋한다.
4. 모든 작업 트리와 최종 커밋을 다시 확인한다.
5. `gas-quiz-firebase` 복구 브랜치의 `main` 병합과 각 저장소의 원격 백업·push는 별도 승인으로 진행한다.

commit 승인은 push·deploy 승인을 포함하지 않는다.
