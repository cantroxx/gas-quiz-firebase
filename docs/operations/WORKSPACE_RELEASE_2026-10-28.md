# 기본 코디와 미커밋 작업 통합 배포

사용자 요청: 기본 옷을 입히고 미커밋 사항을 포함해 커밋·배포한다. 운영 학생·구매·쿠폰·소유·장착·염색 원장은 보존한다. Git push 요청은 없으므로 원격 Push는 하지 않는다.

## 기본 옷

- 흰 티: `1042194`(화이트 피케T), 청반바지: `1062067`(썸머쿨 청반바지). 기존 카탈로그의 남녀 공용 상품이며 두 공급자에서 정상 합성 확인.
- 서버 렌더 공급자의 정규화 단계에서 **비어 있는 부위만** 보완한다. 상의가 있으면 유지하고 하의만 보완하며, 한벌옷에는 하의를 겹치지 않는다.
- 표시용 기본값이다. 구매·보유 목록과 저장 코디를 덮어쓰거나 무료 지급·자동 구매·코인 차감·쿠폰 차감·데이터 이전을 하지 않는다. 다른 옷을 선택하면 그대로 미리 보고 기존 장착 기능으로 저장한다.
- 동일 서버 경로를 쓰는 상점·광장·교실에 적용된다. 아직 코디가 전혀 저장되지 않아 광장에서 기존 위치 표시를 사용하는 정책은 유지한다.
- 자체 공급자도 같은 기본값을 적용하지만 운영 기본은 `meaegi-nexon`이다. Windows 7개 미지원 사항이 해결된 것으로 처리하지 않는다. raw core의 기준 비교 사례는 바꾸지 않는다.
- 상점 초기화 버튼은 ‘기본 코디로’로 바꾸고 자동 기본 옷 안내를 추가했다. 렌더 공급자 버전을 올려 이전 캐시와 구분했다.

## 미커밋 작업과 배포 경계

작업 시작 시 추적 변경 131개와 미추적 파일 약 6,250개(약 970MB)가 있었다. 상당수는 9~10월에 별도 릴리스 스크립트로 이미 운영에 반영한 소스·테스트·자산·문서다. 기존 파일을 되돌리지 않고 모두 Git에 보존한다. `exports/`, `private/`, 의존성·로그·비밀키 ignore는 유지한다. 자격 증명 패턴 검사의 유일한 일치는 검증 카탈로그 이미지 hash 문자열 내부의 `AKIA…` 우연 일치이며 실제 키가 아니다.

운영 대조의 기준:

- Hosting 버전: `8b3150d642e4164d`, 파일 4,672개. 최초 대조 시 로컬과 다른 기존 파일 19개, 로컬에만 있는 파일 196개, 운영에만 있는 파일 8개.
- 운영 Functions 132개, 로컬 export 134개. 새 함수는 `classroomBoardAction`, `classroomFollowupAction`. 기존 함수 이름 삭제는 없다. 기존 명시적 메모리·timeout·maxInstances·concurrency와 지역은 일치한다.
- Firestore·Storage Rules는 운영과 바이트 동일하다. 로컬에서 요구하는 인덱스 5개 모두 운영 READY다. 규칙/인덱스 재배포는 필요 없다.
- 최신 관리자 함수의 실제 소스와 현재 preview 함수 소스를 다운로드해 이력을 확인했다. 현재 루트는 이전의 개별 함수 릴리스들을 합친 소스와 수업 보드 후속 변경을 포함한다.

Firebase Hosting은 현재 버전을 복제한 후 변경 파일을 추가/교체한다. 운영에만 있는 과거 마블 번들과 Firebase 예약 파일, 현재 Hosting 설정을 보존한다. 별도 Vercel 게임 `fraction-world/`, 로컬 시안 `town-preview/`·`cozy-home-preview/`, 합성 fixture, 불완전 `.partial` 다운로드, `dev-assets/`는 새로 공개하지 않는다. 이 소스들은 커밋에서 제외하는 것이 아니다. Windows 약323MB 묶음과 reference 파일은 원본 위치에 유지한다.

## 검증

- Node 기본 의상 검사: 입력 불변, 이미 선택한 의상 보존, 한벌옷 중복 방지, 상의/하의 일부 선택, 인증 및 캐시 통과.
- Windows 실제 합성: 기본 옷 포함 상점/광장/교실 동일 PNG, 캐시 공유, native mix와 구형 HSL, 거래 원장 불변 통과.
- 기존 외부 공급자: 남녀 기본 아바타 PNG를 실제 요청해 옷 표시 확인.
- Chrome: Windows 상점과 기존 commerce/loading/광장 smoke 통과. 구매/쿠폰/장착/염색 코드는 변경하지 않았다.
- 전체 검사에서 기존 전자칠판 테스트의 날짜 의존성을 수정했다. 브라우저 날짜를 합성 서버와 같은 2026-10-21로 고정하고 타이머는 정상 진행시킨다. 운영 코드의 날짜 검증은 유지한다.
- 캐시 버전만 갱신한 최종 app shell도 별도 정적·공개 셸 검사한다.

전체 `npm run check` exit 0. 교과 49개 단원 834개 문제 × 3개 화면 폭(2,502화면)과 재개/자동 종료 검사를 포함한다. 최종 캐시 버전 변경 후 정적·공개 셸 검사도 exit 0. [검사 기록](workspace-release-2026-10-28/checks.json), [Hosting 반영 목록](workspace-release-2026-10-28/hosting-scope.json).

원본 작업 커밋: `c8da1b94` — 6,383개 파일. 운영 배포 결과·검증 도구는 별도 후속 커밋으로 보존한다.

첫 서버 배포 후 대조에서 기존에 서버 설정으로만 존재하던 최대 인스턴스 한도 109개가 SDK의 기본 reset 값으로 초기화된 것을 발견했다. 실제 배포 전 스냅샷의 20/100 한도를 각 함수의 `maxInstances`에 명시해 복원하고 재배포한다. 기존 132개 함수의 cap 전체가 원래 설정과 일치함을 검사했다. 코드의 거래/권한/보상 로직은 이 복원에서 바꾸지 않았다. 일부 과거 HTTP revision에 SDK가 `FUNCTION_SIGNATURE_TYPE=http`를 추가한 것만 프레임워크 메타데이터의 정상 차이로 분류하고, 다른 환경값·서비스 설정은 그대로 비교한다.

검사·배포 원 로그와 읽기 전용 스냅샷: `/tmp/quiztown-release-20261028/`, `/tmp/quiztown-release-check-20261028.log`.
## 완료 기록

- 최초 통합 커밋 `c8da1b94`, 기존 함수 한도 명시·검증 커밋 `c87cfbc7`.
- 기존 132개 + 신규 2개 = **134개 Functions ACTIVE**. 기존 최대 인스턴스 한도, 메모리·timeout·concurrency·서비스 계정·네트워크·환경 설정을 배포 전과 대조했다. 위의 예약 HTTP 서명 메타데이터 추가 외에는 유지됐다. 두 배포 모두 Google API 429 재시도가 있었으며 실제 운영 상태를 정본으로 확인했다.
- 배포된 preview 함수 소스에서 index, preview service, official provider, 기본 의상, commerce, classroom board/followup의 해시가 로컬과 동일하다. 이 검사는 학생 문서를 조회하지 않는다.
- `renderCoordiShopPreview`, `coordiShopAction`, `classroomBoardAction`, `classroomFollowupAction`의 비로그인 요청은 모두 HTTP 401.
- **Hosting 버전 `3ed3040023a7477d` 운영 반영 완료**. 변경/추가 101개, 기존 파일 4,653개 보존, 전체 4,754개 manifest와 기존 Hosting 설정 일치. 변경 101개 파일을 운영 URL에서 다시 받아 SHA-256 일치를 확인했다.
- 실제 운영 HTML/JS를 읽는 새 브라우저로 1360px·390px 로그인 화면, 새 번들 버전, 코디 직접 접근 차단을 확인했다. pageerror 0. 로그인/쓰기 요청은 차단했으며 운영 계정으로 거래 테스트를 하지 않았다.
- 운영 Firestore/Storage 직접 쓰기·데이터 이전·초기화·상품 무료 지급·구매 내역 변경·규칙 변경은 하지 않았다. Windows 자체 렌더러의 운영 전환과 별도 Vercel 앱 배포는 이번에 수행하지 않았다.

영수증: [Hosting](workspace-release-2026-10-28/hosting-receipt.json), [Hosting 해시 검증](workspace-release-2026-10-28/hosting-verified.json), [Functions 상태·설정·소스 검증](workspace-release-2026-10-28/functions-deployed.json), [운영 브라우저](workspace-release-2026-10-28/live-browser.json).
