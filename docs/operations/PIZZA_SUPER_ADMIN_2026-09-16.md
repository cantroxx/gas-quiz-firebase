# 피자 평가 총괄 관리자

## 진입과 권한

- 퀴즈타운 총관리자 대시보드의 **피자 평가 학급 관리** 링크
- 피자 게임 첫 화면 하단의 **총괄 관리자** 링크
- 전용 화면: `/pizza-assessment/admin.html`

동일 브라우저·동일 origin에서 퀴즈타운에 로그인하면 기본 Firebase 앱(`[DEFAULT]`)의 로그인 세션을 사용한다. 게임 교사/학생용 임의 토큰으로는 관리자 기능을 이용할 수 없다. 서버가 매 요청에서 기존 `getAdminMemberForAuth`와 `assertSuperAdmin`으로 권한을 다시 확인한다.

활성 admin 회원이며 `G9-C9-N99`이거나 `adminLevel`이 `superAdmin`/`fullAdmin`인 계정만 허용한다. 비로그인·학생·일반 교사·반 관리자·비활성 관리자·철회된 권한은 거부한다. 클라이언트가 전달한 관리자 플래그는 사용하지 않는다. 총관리자 인증/역할 정책 자체는 변경하지 않았다.

## 조회와 삭제

목록은 최근 개설 순으로 25개씩 표시하고 다음/이전 페이지로 모든 기존 회차를 확인한다. 학교·학년·반·개설시각·회차 ID·진행/채점/종료/시간 만료 상태를 표시한다. 목록에 학생 답안이나 교사 토큰은 포함하지 않는다.

삭제 버튼을 누르면 정확한 회차 ID, 입장 인원, 제출 인원, 저장 답안 수, 채점 결과 유무를 확인한다. 표시된 학교·학년·반 문자열을 그대로 입력해야 최종 삭제 버튼이 활성화된다.

영구 삭제 범위:

1. 선택한 `pizzaAssessmentSessions/{id}` 문서와 내부 확정 보고서
2. 해당 회차의 `students` 하위 문서 전체(번호·답안·제출 기록)
3. 활성 학급 디렉터리가 여전히 해당 회차를 가리킬 때만 그 디렉터리

위 변경은 하나의 트랜잭션으로 처리한다. 확인창을 연 후 학생 답안이나 회차 상태가 달라졌으면 삭제를 거부하고 재확인을 요청한다. 예전 회차를 지울 때 같은 반의 새 회차 디렉터리는 유지한다. 응답 유실 후 같은 삭제 요청을 다시 보내도 중복 삭제 오류 없이 완료된다.

`pizzaAssessmentDeletions/{id}`에 총관리자 회원 ID·삭제시각·학급 정보·삭제 개수만 남긴다. 학생 답안과 점수는 이 로그에 남기지 않는다. 이 기록은 삭제 증빙 및 예전 교사 토큰으로 삭제된 회차가 되살아나는 것을 막는 데 사용한다. 기존 보안 규칙의 최종 deny로 직접 클라이언트 접근은 차단되며, 보안 규칙 변경은 없다.

기존 학생/교사 화면은 다음 조회에서 회차가 없음을 확인하면 진행을 중지하고 새 입장을 안내한다. 기기에 남은 해당 회차의 이어하기·초안 정보도 정리한다. 이미 내려받은 PDF나 이미 표시된 결과를 원격 삭제하는 기능은 아니다.

퀴즈타운 회원, 코인, 랭킹, 다른 평가 회차에는 쓰기/삭제를 하지 않는다. 일반 교사의 기존 ‘학급 종료’는 여전히 결과를 보존하는 기능이다.

## 검증

```sh
firebase emulators:start --project demo-dj48-rules --only firestore,auth,functions
node scripts/smoke/serve-pizza-assessment.js
FIRESTORE_EMULATOR_HOST=127.0.0.1:8181 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9191 node tests/pizza-assessment/admin.test.js
FIRESTORE_EMULATOR_HOST=127.0.0.1:8181 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9191 node scripts/smoke/pizza-assessment-admin-browser.js
FIRESTORE_EMULATOR_HOST=127.0.0.1:8181 node tests/pizza-assessment/online.test.js
```

독립 서버 테스트 명령은 `npm run check:pizza-admin`이다(기존 에뮬레이터를 종료하고 실행).

합성 Auth 계정으로 실제 Callable을 호출하여 권한 거부·권한 철회·페이지 이동·확인 누락·변경된 답안 감지·원자적 삭제·삭제 로그·이전 토큰 차단·새 회차 보존을 검증했다. 브라우저에서는 기본 Firebase 앱 로그인 공유, 삭제창의 정확한 학급명 입력, 취소, 합성 회차 삭제, 목록 갱신, 로그아웃/반 관리자 차단을 확인했다. 기존 피자 교사·학생 서버 테스트도 통과했다.

추가로 접속 중인 학생 화면의 삭제 감지·진행 중단·해당 회차의 기기 기록 정리와 `G9-C9-N99` 기존 총관리자 판정도 검증했다. `npm run check` 전체 검사(정적 검사, 기존 기능·보안 규칙 테스트, 운영 공개 화면 읽기 smoke)를 통과했다. 로그: `/private/tmp/pizza-admin-full-check.log`.

## 반영 상태

아래 최초 검증은 로컬 구현 및 합성 데이터 기준이다. 이후 사용자 배포 승인에 따라 2026-09-16 운영 배포를 완료했다. 실제 운영 학급은 조회하거나 삭제하지 않았다. 운영 반영 대상은 피자 관리자 화면·모듈, 기존 `pizzaAssessmentAction` 라우팅, `public/js/features/admin-render.js` 링크 및 재생성한 앱 번들이다. 프로젝트의 다른 미커밋 변경을 함께 배포하지 않는다.


## 운영 배포 완료 (2026-09-16)

- 사용자 요청: 수학 퀴즈에 ‘분수 평가’ 추가 후 배포 승인.
- 함수: `pizzaAssessmentAction` (asia-northeast3)만 생성·배포.
- Hosting: `3582b1a7feb62673`, 이전 버전 `15916d9a0bda6ef2`.
- 변경 15개 파일: 피자 평가 폴더 전체, 수학 카탈로그, 퀴즈 카드 렌더러, 관리자 링크 렌더러, 운영 번들의 해당 모듈 및 HTML 번들 캐시 키.
- 최신 운영본을 복제해 다른 운영 파일 383개와 Hosting 설정을 보존했다. 준비 중 다른 배포가 감지되어 최신 버전으로 다시 준비 후 공개했다.
- `npm run check` 통과. 로그 `/private/tmp/pizza-deploy-check.log`.
- 운영 파일 15개가 검증한 배포본과 SHA-256 일치. 실제 브라우저에서 평가 첫 화면 → 총괄 관리자 로그인 안내 이동 및 페이지 오류 없음 확인.
- 비로그인 운영 `adminList` 요청이 `UNAUTHENTICATED`로 거부됨을 확인했다.
- 보안 규칙·인덱스·다른 Functions는 배포하지 않았다. 실제 학급과 학생 데이터는 수정하지 않았다.
- 평가: https://dj48-quiztown-firebase.web.app/pizza-assessment/
- 총괄 관리자: https://dj48-quiztown-firebase.web.app/pizza-assessment/admin.html
- 재현 도구: `scripts/maintenance/publish-pizza-assessment.js`. 영수증 `/private/tmp/pizza-release/receipt.json`.
