# 2026-10-07 진입 성능 개선 자료

[개선·검증 보고서](../PERFORMANCE_IMPROVEMENTS_2026-10-07.md)의 원자료다. **운영 성능 수치가 아니다.** 학생 데이터·토큰·실명·운영 요청 본문을 저장하지 않았다.

| 파일 | 의미 |
| --- | --- |
| before.json / after.json | 실제 로컬 UI + 합성 공급자 지연, 각 45개 주 진입. members/market은 별도 탭 측정. used source SHA-256 포함 |
| summary.json | 역할·방문별 3회 중앙값·최소·최대. shop renderMs=null은 미계측 |
| server-measurements.json | 실제 dashboard 핸들러와 합성 DB 40ms 지연. 전후 범위·통계 결과 동일성 검사 포함 |
| preview-auth-measurements.json | 실제 commerce의 full status 인증 준비와 최소 preview 인증의 합성 DB 비교. 외부 렌더 제외 |
| environment.json | 기기·브라우저·격리·Git 기준 |
| change-manifest.json | 시작 작업 트리 / 비교용 before / 최종 소스 해시, 보존한 다른 작업 |
| implementation.patch | 이번 기존 파일 변경만 되돌리기 위한 패치. 번들은 포함하지 않으며 정식 빌드로 재생성. 새 검사·진단 파일은 별도 목록 참조 |
| verification.json | 실제 실행한 검증과 운영 접근 관련 제한·안전 문제 기록 |

## 버전 고정

시작 스냅샷은 `/tmp/dj48-entry-improve-20261007/before/`에 있다. 비교용 쌍은 같은 임시 디렉터리의 `comparison-before/`, `comparison-after/`다. unrelated SVG 그림 함수·모바일 CSS 변경을 양쪽에 동일하게 반영했다. 원본 시작 스냅샷은 수정하지 않았다. 같은 계정 재진입과 계정 변경을 혼동하지 않는다.

측정 뒤 제품 소스의 차이는 classroom-form의 한 줄 후행 공백 제거 및 정식 bundle 재빌드뿐이다. raw measurement의 sourceHashes는 측정 스냅샷 해시, change-manifest의 finalSha256은 최종 파일 해시다. 되돌리기 패치는 다른 작업의 그림·CSS를 원복하지 않도록 비교용 before를 기준으로 만들었다. `git apply --reverse --check`로 확인했으며 실제 역적용은 하지 않았다. 공개 smoke 파일은 시작 스냅샷 대상에 없어서 이번에 추가한 guard 변경만 정확히 반대로 적용해 이전 내용을 재구성했으며 manifest에 구분했다. **성능 변경을 되돌려도 공개 검사의 오프라인 차단 보완은 유지한다.**

## 재현

운영 주소나 인증 세션을 넣지 않는다. 기준 버전은 별도 로컬 복사본에서 복원하고 전후를 **순차 실행**한다. 설치된 Chrome와 playwright-core를 사용한다. 임시 스냅샷이 없어졌다면 구현 패치를 별도 복사본에 역적용해 before를 만들고 번들을 정식 빌드한다. 현재 작업 트리에 바로 역적용하지 않는다.

```sh
ENTRY_PUBLIC_DIR=/absolute/before/public node scripts/audit/entry-performance-profile.cjs /absolute/before.json
ENTRY_PUBLIC_DIR=/absolute/after/public node scripts/audit/entry-performance-profile.cjs /absolute/after.json
ENTRY_BEFORE_FUNCTIONS=/absolute/before/functions/index.js ENTRY_SERVER_OUTPUT=/absolute/server.json node --test tests/application/entry-performance.test.js
ENTRY_BEFORE_COMMERCE=/absolute/before/functions/coordi-shop/commerce.js ENTRY_PREVIEW_OUTPUT=/absolute/preview.json node scripts/audit/entry-preview-auth-profile.cjs
npm run check
node scripts/smoke/coordi-loading-browser.js
```

- 실제 서버 인증/Firestore 지연은 UI 실험에 없다. dashboard 서버 실험도 인증 helper는 합성이고 콘텐츠 DB 호출에만 40ms를 준다.
- paintWatch는 두 rAF 근사다. 전체 INP/TBT/메인 스레드 점유 측정이 아니다.
- firstVisual/skeletonPaint: shell의 첫 표시. 학생 교실에서는 코드 입력 화면. corePaint/ready: 필요한 화면 데이터와 조작 상태. readyControlsEnabled 같은 raw 보조 관찰값은 도구 대기가 포함될 수 있어 최종 ready로 사용하지 않는다.
- UI providerCalls는 실제 HTTP 호출 수가 아니다. providerPayloadBytes는 합성 반환값의 UTF-8 JSON 크기다. shop browserRequests와 servedBodyBytes는 가로챈 브라우저 요청 수/공급한 무압축 본문 크기다. 실제 운영 wire bytes가 아니다.
- data-* 표시는 cache miss 공급자의 합성 응답 시점. 재진입에 없는 것이 정상이다. backgroundDependencies는 이번 진입에서 추적한 공급자와 핵심 표시만 포함한다. 아직 열지 않은 탭은 제외한다.
- 원자료의 renderCost는 계측한 동기 렌더 함수만 포함한다. iframe 내부 렌더는 미계측이다. DOM 수에는 숨은 공통 shell이 포함된다.
- extra admin 작업 제거와 dashboard 응답 단축을 합산하지 않는다. 마켓/회원의 첫 대기가 탭 진입으로 이동한 점을 함께 비교한다.

## 공개 검사 안전 문제

초기 3회 기존 check의 public smoke가 실제 운영 main/wordbattle 화면을 열어 자동 익명 Auth 계정 생성이 발생했을 가능성이 있다. 성공 여부·개수는 미확인이고 학생 로그인·거래는 수행하지 않았다. 보고서의 6절에 경로·대략적인 시간대·최소 추가 확인을 기록했다. 익명 계정을 임의 삭제하지 않았다.

이후 `SMOKE_PUBLIC_ONLY=1` 검사는 `public-shell-fixture.js`를 사용해 모든 파일을 로컬에서 제공하고 외부/API를 차단한다. 출력의 `.invalid` 주소는 가상 origin이다. SDK도 설치본을 사용하므로 운영 SDK 연결 시험이 아니다. Auth/Firestore 연결 차단에 따른 알려진 console 오류만 허용하며 나머지 UI 오류는 계속 검사한다.
