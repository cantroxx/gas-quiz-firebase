# 2026-10-07 성능 진단 자료

상위 [성능 진단 보고서](../PERFORMANCE_DIAGNOSIS_2026-10-07.md)의 원자료와 재현 스크립트다. 학생 로그인·데이터 쓰기·부하 테스트용 도구가 아니다. 측정은 설치된 Chrome의 임시 프로필에서 수행했고 제품 파일은 편집하지 않았다.

## 결과 선택

| 파일 | 용도 |
| --- | --- |
| `measurements.json` | 퀴즈타운 desktop cold/warm, 최초 mobile 실험, 독립 진입 화면 각 3회, 공개 파일/번들 모듈 대조 |
| `ground-measurements.json` | 그라운드 desktop cold/warm 각 3회. 여기의 mobile 결과는 다운로드 미완료로 최종 비교에서 제외 |
| `mobile-complete.json` | 두 사이트의 최종 mobile cold/warm 각 3회. load 후 12초, 양쪽 모든 정적 요청 완료 확인 |
| `catalog-network.json` | 실제 운영에서 사용하는 공개 JSON 4개만 다운로드·파싱한 3회 실험. 상점 전체 시간 아님 |
| `synthetic-data.json` | 기존 site-data-loading-profile.js의 합성 의존성 실행. 실제 학생 데이터·서버 지연 아님 |
| `navigation-probe.json` | 실제 공개 함수 본문 + mock 설정 대기. DOM 페인트/실제 API 지연 아님 |
| `ui-probe.json`, `ui-probe-mobile.json` | 별도 unthrottled 실행 커버리지·wheel/rAF 진단. desktop 퀴즈타운 scrollY=0은 스크롤 검사에서 제외 |
| `inline-comparison.json` | 로컬/공개 인라인 핵심 함수의 일치와 당시 줄 번호 |
| `final-production-hashes.json` | 진단 말미 다시 GET한 운영 주요 파일 해시 |
| `manifest.json` | 결과 해석·동시 작업 변경 사항 |
| `quiztown-public.png`, `ground-public.png` | 비로그인 공개 첫 화면. API 차단에 따른 안내/통계 기본값 가능 |

`summary.blockingExcess`는 관찰창 longtask의 `max(duration-50, 0)` 합계다. TTI 구간을 확정한 표준 TBT가 아니다. `eventToTwoRafMs`와 Event Timing은 이 클릭의 실험실 결과이며 서비스 INP가 아니다. CDP duration은 초, 보고서에서는 ms로 환산했다. raw ResourceTiming의 0 transferSize는 cross-origin Timing-Allow-Origin 제약일 수도 있으므로 네트워크 바이트 합계는 CDP의 완료 이벤트를 사용했다.

미완료 요청은 `network` 중 `wireBytes`가 없고 `failed`가 아닌 항목으로 찾을 수 있다. 최초 그라운드 mobile warm의 일부 `ERR_ABORTED`는 cold 다운로드가 끝나기 전에 재탐색한 실험 절차에서 발생했다. 이를 실제 서비스 장애로 계산하지 않는다. 최종 mobile 실험은 관찰창을 늘려 해결했다.

캐시 실험은 route interception 대신 CDP URL 차단을 사용했다. 공개 JSON 실험은 캐시가 없는 fetch를 조사하므로 별도 route allowlist를 사용한다. 기존 사용자 Chrome 데이터는 사용하지 않는다. Service Worker는 측정 컨텍스트에서 차단했다.

## 재현

저장소 루트에서 실행한다. 기존 `playwright-core`와 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`을 사용하며 패키지 설치는 하지 않는다. macOS 보안/샌드박스 환경에서는 Chrome 시작과 공개 네트워크 접근의 별도 승인이 필요할 수 있다. 실측 작업들은 네트워크/CPU 경쟁을 막기 위해 **순차 실행**한다.

```sh
mkdir -p /tmp/dj48-perf-20261007
node docs/operations/performance-2026-10-07/measure.cjs
node docs/operations/performance-2026-10-07/measure-ground.cjs
node docs/operations/performance-2026-10-07/measure-mobile-complete.cjs
node docs/operations/performance-2026-10-07/catalog.cjs
node docs/operations/performance-2026-10-07/ui-probe.cjs
node docs/operations/performance-2026-10-07/ui-probe-mobile.cjs
node docs/operations/performance-2026-10-07/navigation-probe.cjs
SITE_DATA_PROFILE_OUTPUT=/tmp/dj48-perf-20261007/synthetic-data.json node scripts/audit/site-data-loading-profile.js
```

재현 출력은 `/tmp/dj48-perf-20261007/`에 생기며 이 폴더의 확정 JSON을 덮어쓰지 않는다. `measure.cjs`의 버전 비교는 실행 시점 로컬/운영을 대조한다. navigation fixture는 2026-10-07에 읽은 운영 함수이며 향후 버전 비교에는 갱신이 필요하다. 페이지 구조·API 호스트가 바뀌면 먼저 코드를 검토하고 차단 목록을 확인한 뒤 재현한다.

원래 실행한 main probe는 공개 소스의 임시 스냅샷을 만들었으나, 개인정보/토큰 등이 측정 자료에 섞이지 않도록 전문을 해시 메타데이터로 대체했다. 보존한 main probe는 공개 소스를 메모리에서 비교하고 전문을 저장하지 않도록 정리했다. 학생 필드 없는 화면 전환 함수 두 개만 `navigation-functions.fixture.txt`에 남겼다. 이 정리는 측정 경로나 계산식에 영향을 주지 않는다.

## 수행한 검증과 제외

공개 화면/카탈로그 반복 측정, 합성 실행, 공개 화면 캡처, 운영 파일 해시 비교, 산출물 JSON 파싱 및 진단 JS 구문 검사를 수행했다. 제품 테스트·Lighthouse·실사용 INP·인증된 운영 데이터 성능은 실행하지 않았다. 보고서의 회귀검증 제안과 실제 실행한 검사를 구분한다.

## 관리자·교실·상점 후속 진단

- `entry-probe.cjs`: 실제 로컬 진입 함수·UI 모듈, 합성 데이터와 고정 공급 지연. 모든 네트워크는 로컬 응답으로 처리한다. 제품 파일은 읽기만 한다. 기존 사용자 브라우저 세션은 사용하지 않는다.
- `entry-measurements.json`: 최종 성공 실행 45개 표본, 조건별 3회. 단계별 ms, 공급자·합성 요청 수, 동기 렌더 비용, 읽은 파일 해시. 운영 서버 지연이 아니다.
- `entry-summary.json`: 화면·역할·진입 조건별 중앙값·최소·최대.
- `entry-version.json`: 공개 HTML·번들·코디 JS 4개 GET의 해시 및 13개 모듈·8개 함수 일치 여부. 원문이나 학생 데이터는 저장하지 않는다.

재현(현재 워킹트리 코드 사용):

```sh
node docs/operations/performance-2026-10-07/entry-probe.cjs /tmp/dj48-entry-result.json
```

설치된 Chrome 및 playwright-core가 필요하다. 스크립트는 로그인이 완료되었다는 합성 전제에서 시작한다. 왕복 시 타 화면 데이터 로더를 실행하지 않으며 HTTP 캐시는 라우팅 도구 특성상 재현하지 않는다. 실제 인증·서버 시간, 장시간 혼합 사용, 데이터 쓰기 동작, 전송 캐시, 실사용 INP 검증은 아니다. 같은 화면의 앱 메모리·iframe 재사용을 확인한다.

상점 첫 방문은 성별 선택창이 없어진 뒤 조작 준비로 판정한다. 도구가 성별 버튼을 누르기까지의 대기를 순수 시스템 지연으로 계산하지 않는다. backgroundPreview는 디코딩된 미리보기 준비 시각이며 단순 is-ready CSS(로딩 중에도 사용됨)로 판정하지 않는다. 외부 미리보기는 1px 합성 이미지다. 최종 실행에서 구매·장착·염색 요청은 0이었다. 관리자 회원 탭, 교실 마켓·오늘 탭, 상점 보유상품 필터 동작을 확인했다.

렌더 표본은 동기 함수 비용이고 레이아웃·paint 전체가 아니다. 교실 backgroundDependencies의 재진입 시각은 후속 조작 검증 뒤의 관찰값으로, 별도 백그라운드 요청이 생겼다는 뜻이 아니다. 보고서에서는 교실 후속 데이터 작업 없음을 표기했다.
