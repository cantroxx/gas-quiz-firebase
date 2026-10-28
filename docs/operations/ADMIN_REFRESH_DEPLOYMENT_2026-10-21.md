# 관리자 센터 최신화 배포 — 2026-10-21

## 승인과 범위

사용자 요청: “배포 진행”. [실행 계획](ADMIN_REFRESH_PLAN_2026-10-19.md)의 로컬 완료분을 운영본에 선별 적용한다. 증권 지갑·증권 바로가기는 학생 상세에 추가하지 않는다.

- 대상 함수 5개: adminGetMemberDetail, adminGetDashboard, adminGetOperationalAudit, adminSpecialRewardAction, specialRewardAction.
- Hosting 7개: index.html, styles.css, js/app.bundle.js, js/features/admin-render.js, js/features/admin-controller.js, js/infrastructure/admin-repository.js, js/special-rewards.js.
- 운영 데이터 직접 수정·보상 지급·마이그레이션·Rules/인덱스 배포·Git commit/push 없음.

## 운영본 대조 및 후보

- 시작 Hosting: `projects/584571538436/sites/dj48-quiztown-firebase/versions/aa8039091afca798`, 4,672개 파일.
- 관리자 standalone 모듈은 로컬 수정 전 보존본과 일치. index.html의 광장·증권 스크립트 참조 차이와 styles.css의 기존 블록 위치는 운영본대로 보존.
- 함수별 운영 소스를 별도 다운로드. 조회 함수 3개의 기존 callable 본문은 수정 전 기준과 일치. 해당 callable만 교체하고 admin-insights 및 필요한 읽기 전용 정의를 추가.
- 특별 보상 함수 2개는 기존 index.js 전체를 보존하고 growth/special-rewards.js만 교체.
- getMemberAchievements, subjectQuizAction, popularQuizAction 운영 소스를 읽기 전용으로 대조: achievements/catalog.js, subject-quiz/curriculum.js, popular-quiz/domain.js가 로컬 정의와 정확히 일치.
- 운영 번들 78개 모듈 중 관리자 관련 3개만 교체, 나머지 75개 보존 확인. index.html은 CSS·번들·특별 보상 스크립트 캐시 버전을 함께 변경.

## 후보 검증

- 각 실제 함수 후보를 개별 프로세스로 로드한 Firestore Emulator 검사 통과: 대상 권한·타 반 거부·무쓰기, 새 진행도/쿠폰/장식, 현재/과거 순위, 조회 실패/상한, 보상 실지급 합계, 게시/종료 이력, 종료 뒤 재요청, 기존 동시 수령/중복 지급 차단.
- 실제 Hosting 후보의 320/390/1440px Chrome 검사 통과: 5개 메뉴 묶음·바로가기·키보드·구 타이틀 분리·실패 표시·특별 보상 합계·권한 표시·가로 넘침 없음. 외부 네트워크 및 학생 API 차단.
- 후보 inline JavaScript 구문 검사, standalone/bundle 동일성 및 무관 번들 모듈 보존 통과.
- 전체 `npm run check`: 종료 코드 0. 과목 49단원 834문항 × 3폭(2,502화면), 자동 종료·재접속을 포함한 전체 회귀 검사 통과.

## 실행 상태

**운영 배포 완료.** [운영 사이트](https://dj48-quiztown-firebase.web.app)

- 최종 Hosting 버전: `sites/dj48-quiztown-firebase/versions/8b3150d642e4164d`.
- 변경 7개 실제 HTTP 응답 SHA-256 일치. 4,672개 전체 파일 목록/압축 해시 및 설정 검증, 나머지 4,665개 보존.
- 함수 5개 모두 ACTIVE. 배포된 소스를 다시 다운로드해 후보의 전체 파일 목록/해시 일치 확인. 서비스 설정·런타임·트리거 보존, 무관한 함수 수정 없음.
- 운영 함수 5개 비인증 요청이 모두 HTTP 401 / UNAUTHENTICATED를 반환함을 확인. 실제 학생 계정 또는 실제 보상 지급 검사는 하지 않음.
- Rules/인덱스 변경·배포, 운영 데이터 직접 수정, Git commit/push 없음.
- [배포 영수증](ADMIN_REFRESH_DEPLOY_RECEIPT_2026-10-21.json)에 버전·검사·변경 파일 해시를 보존.

## 증빙과 재실행 도구

- 스냅샷·후보·해시·배포 기록: `/tmp/admin-refresh-deploy-20261021/` (임시 보관).
- 전체 검사: `/tmp/admin-refresh-deploy-full-check.log`.
- 실제 함수 후보: `/tmp/admin-refresh-deploy-candidate-check.log`.
- 실제 Hosting 후보: `/tmp/admin-refresh-deploy-browser.log`.
- snapshot-admin-refresh-release.js, prepare-admin-refresh-release.py, deploy-admin-refresh-functions.js (`scripts/maintenance/`).
- 실제 후보 검증 runner: `scripts/smoke/admin-refresh-candidate.js`; Hosting 후보는 `ADMIN_PUBLIC_ROOT`를 지정한 `scripts/smoke/admin-refresh-browser.js`.
