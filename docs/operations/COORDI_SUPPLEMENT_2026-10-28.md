# Windows 보완 델타 적용·Node 22 검증

후속 상태: 사용자 승인 후 [2026-10-29 운영 전환](COORDI_PRODUCTION_2026-10-29.md)을 완료했다. 아래의 운영 미반영 설명은 당시 이력이다.

기준 커밋 `2454d07dabe71499c84421977c447920701c514c`, 브랜치 `codex/coordi-local-runtime`.
코드·시험 커밋: `480273e77270677ed2aca9553d4deb7aecc2b0ff`.
저장소: https://github.com/cantroxx/gas-quiz-firebase . 이전 상태는 [로컬 런타임 보고서](COORDI_LOCAL_RUNTIME_2026-10-28.md)를 참조한다.

## 현재 결론

**31000 헤어와 1103400 망토의 데이터 보완을 적용·검증했다. 5개 아이템은 여전히 미지원이다. 운영 배포와 renderer mode 전환은 하지 않았다.**

MACBOOK-NEXT/README의 “2개 수정, 58정상/11거부”는 인계 측 설명으로 먼저 분리했다. 아래 숫자는 Mac에서 파일·Node·실제 HTTP·Chrome으로 다시 측정한 결과다. 문서가 가리키는 Windows 원본 위젯에 패치를 적용하거나 원본 WZ/기존 번들/학생 데이터를 수정하지 않았다.

## 조립 및 파일 무결성

- 입력 ZIP SHA256: `14d7087bdcc059157ebbfadf02f954d4d28b44d70e2090975f3049c63b97382d`.
- ZIP 399개 파일, 해제 크기19,868,196bytes. ZIP CRC/중복 경로/경로 이탈/심볼릭 링크를 검사했다. 적용·검증 스크립트를 읽은 후 실행했다.
- 별도 조립 폴더: `/tmp/quiztown-codi-supplement-assembled-20261028` (`/private/tmp/…`와 같은 경로).
- delta SHA256SUMS, 원본 web 전체, 변경 적용 후 web 전체, 최종 bundle 검증 통과. **64,283파일, 324,366,322bytes, catalog31,599, 실패0**.
- [독립 무결성 검사](coordi-supplement-2026-10-28/integrity.json): 실제 변경 web 파일7개, index에서 변경된 아이템은 정확히31000/1103400, 아이콘 변경0. 원래 정상26개 PNG의 원래 크기 RGBA 그대로.
- 망토1103400의 1×1 marker는 삭제하지 않았다. 6개 동작 모두 alpha17, numeric z0/pos0, 실제 효과와 함께 존재함을 디코드해 확인했다. raw-evidence PNG77개도 크기/디코드/해시를 확인했다.
- 원본 WZ 추출과 Windows 추출기 방어 검사8개를 Mac에서 재실행한 것은 아니다. 이 부분은 인계 측 근거로 남긴다.

새 snapshot: `1B0FD079043CC715E90E95376B2D3641B3E5DE3619C4156F0830C2B5362B1820`.
실제 **web manifest pin**: `bb9c34c995a3b8bf0f5663330650599b774483c21b33b30b4131380b5ed82195`.
source manifest hash `1c55ec2754b32b4cf348e338d20e3dec55cbd03e4bbaa82fdcd4f1c80f1e508b`와 구분한다.
상세 [version.json](coordi-supplement-2026-10-28/version.json).

## 코드·시험 변경

- 파일 reader가 사용자가 선택한 루트의 실제 경로를 기준으로 검증한다. macOS `/tmp → /private/tmp`나 정상 루트 별칭을 잘못 거부하던 문제를 수정했다. 하위 심볼릭 링크와 `../` 이탈은 계속 거부하며 자동 검사한다.
- 릴리스 설정 생성 시 `BUILD-INCOMPLETE`를 거부한다. supplement `version.json`이 있으면 실제 manifest snapshot/hash와 정확히 일치해야 한다. 운영의 `runtime-config.json`은 여전히 official이다.
- Node 기준 검사에 실제 HTTP 옵션을 추가했다. Chrome 기준 검사는 가짜 HTTP 응답 대신 메모리 미리보기 서버의 실제 버전 경로/JS를 읽는다. gzip의 Content-Type과 Content-Encoding, 해시·원시 bytes를 검증한다. 테스트 HTML/JS에 UTF-8을 명시했다.
- PNG 정답 비교는 메타데이터 SHA뿐 아니라 expected.png 디코드·실제 크기·RGBA가 맞아야 통과한다. 빈/중복/알 수 없는 기준 사례도 거부한다.
- 여성 기본 헤어 검사는 파일명 `unsupported-current-female-hair`를 보고 거부를 가정하지 않고, 해당 snapshot의 fixture 상태를 따른다. 원본 묶음의 기존 거부와 새 묶음의 정상 결과를 모두 검사했다.
- 기존 callable 입력으로 기본 여성/피부 프리즘359·20·58/망토1103400을 골든 픽셀과 비교했다. 나머지5개 API 입력의 정확한 거부도 확인했다. 원시 core, 가격 catalog, commerce, 구매/쿠폰/보유/장착 스키마, Firestore/Storage 규칙은 수정하지 않았다.

## 실측 검증 결과

운영과 같은 Node22 계열인 **v22.23.4**를 공식 nodejs.org 배포본에서 받아 공식 SHA256과 대조했다. 로컬 기본 Node26 결과와 별도로 아래 최종 검사는 Node22로 실행했다. 공식 바이너리는 `/tmp/coordi-supplement-node22/bin/node`에만 놓았다.

| 검사 | 결과 |
|---|---|
| Node 파일 합성 | 69/69: 정상58 원래 크기 RGBA 완전 일치 + 예상 거부11 |
| Node 실제 HTTP 합성 | 69/69, manifest pin 검증, 필요한73파일만 요청 |
| Chrome 실제 HTTP 합성 | 69/69, gzip 응답50개 Content-Type octet-stream / Content-Encoding 없음, 외부 요청0 |
| 독립 Pillow 비교 | 정상58 전부 변화픽셀0 / 최대채널오차0 |
| 원래 장비 표시1042483/1062323/1054818 | 원 장비 문맥 있음3개 정상, 없음3개 거부 |
| 실제 판매 목록 단품 | **1,627/1,632 통과**, 실패5 |
| 기존 저장 조합 | **10/10 통과**, 과거 헤어 HSL 포함 |
| 이전 공개 이슈132개 | **5통과/127실패**, 공개 목록과 판매 자격을 계속 구분 |
| 상점·광장·교실 브라우저 | 외부 차단, 동일 자체PNG, 기본 여성31000, 기본 옷, 구매/장착/염색/복원, 연속 선택·계정 전환 지연 응답 폐기,390px 통과 |

저장 조합은 직전 읽기 전용 운영 감사에서 확보한 소유자 없는 **고정10조합(159프로필, 빈 기본 코디 포함)**을 재검사했다. 새 실시간 운영 전체 재조회 또는 학생 계정에 쓰기를 수행한 결과가 아니다. 판매 목록도 해당 감사에서 서버 소스와 동일함을 확인한1,632개 기준이다. 공개 목록8,721이나 로컬catalog31,599를 판매 수량으로 세지 않았다.

기준 결과: [Node](coordi-supplement-2026-10-28/reference-node.json), [HTTP](coordi-supplement-2026-10-28/reference-http.json), [Chrome](coordi-supplement-2026-10-28/reference-browser.json), [Pillow](coordi-supplement-2026-10-28/reference-pillow.json), [판매](coordi-supplement-2026-10-28/sale-render.json), [저장/공개 이슈](coordi-supplement-2026-10-28/compatibility.json).

[성능 측정](coordi-supplement-2026-10-28/http-benchmark.json): 여성 기본 코디 첫100.5ms, 캐시1.3ms, 첫14파일/1,895,899bytes, 캐시 재사용 추가파일0, 동시8요청 성공. 프로세스 메모리는 요청 후 샘플이며 peak가 아니다. 이는 루프백 성능이며 Cloud Run cold start/CDN p95/실사용 유지비 측정으로 확대 해석하지 않는다.

[검증 실행 기록](coordi-supplement-2026-10-28/validation.json)에 전체 검사 결과를 남긴다. 첫 전체 검사에서는 코디와 무관한 classroom-board의 새 빈 페이지 `setContent`가30초 시간 초과했다. 다른 Chrome 작업 없이 전체 `npm run check`를 재실행했고 종료코드0으로 통과했다(교과 퀴즈2,502화면 포함). 해당 테스트 소스는 수정하지 않았다.

## 남은5개 — 파일 부재와 규칙 미지원 구분

| ID·부위 | 확인한 근거 | 현재 거부 / 추가 필요 |
|---|---|---|
| 1032331 귀걸이 | alpha17 marker와 실제 ItemEff PNG 존재, pos1/action1/actionExceptRotation1 | 현재 추출 파츠의 기준점 오류. marker+효과 결합 및 회전 제어 의미·골든 결과 필요 |
| 1073469 신발 | 일반 파츠 없음, 실제 ItemEff PNG 존재, fixed1/actionExceptRotation1, stand1 pos0/z2 | 동작 미지원. 효과 전용 장비·fixed/회전 규칙과 기준 결과 필요 |
| 1103862 망토 | marker와 실제 ItemEff, fixed0/action1/actionExceptRotation1 | 효과 이동 규칙 미지원. 1102621까지 일괄 허용하지 않음 |
| 1102039 망토 | info/noPrism1, ItemEff 없음 | 동작 미지원. 명시 appearance 허용 규칙과 회귀 기준 필요. 이름/빈 파츠만으로 투명 처리하지 않음 |
| 1703421 무기 | 실제 PNG/기준점 존재, weaponBelowHand가 제공된 Base/zmap에 없음 | 알 수 없는 겹침 순서. 레이어 순서 근거·비교 이미지 필요. 다른 z로 치환하지 않음 |

정확한 기존 callable 요청/실제 오류/원본 PNG 경로와 효과 제어값은 [remaining-evidence.json](coordi-supplement-2026-10-28/remaining-evidence.json)에 있다. 과거 요청서의 “파츠 누락”만으로 설명하지 않는다. raw-evidence는 진단 자료이며 이5개를 성공 처리하는 새 계약이나 정답PNG로 간주하지 않는다. 기존 예상 거부11개를 임의로 정상으로 바꾸지 않았다.

## 재현 명령

프로젝트 루트에서 `<BASE>`, `<DELTA>`, `<NEW>`, `<OUT>`을 실제 경로로 바꾼다. `<NEW>`는 존재하지 않는 새 폴더여야 한다.

```sh
python3 <DELTA>/apply_delta.py <BASE> <NEW>
python3 <NEW>/tools/verify_bundle.py <NEW>
node scripts/audit/coordi-supplement-integrity.js <BASE> <NEW> <DELTA> <OUT>/integrity.json
node scripts/audit/coordi-windows-reference.js <NEW> <OUT>/reference-node
node scripts/audit/coordi-windows-reference.js <NEW> <OUT>/reference-http --http
node scripts/smoke/coordi-windows-renderer-browser.js <NEW> <OUT>/reference-browser.json
python3 <NEW>/tools/compare_reference.py <NEW> <OUT>/reference-node
node scripts/audit/coordi-windows-sale-render.js <NEW> <OUT>/sale-render.json
node tests/coordi-shop/windows-integration.test.js <NEW>
node tests/coordi-shop/bundle-paths.test.js
```

Chrome 도구는 `CHROME_PATH`로 설치 경로를 지정할 수 있다. 로컬 상점/브라우저 검증은 다음과 같다. Windows PowerShell에서는 같은 이름의 `$env:COORDI_BUNDLE_ROOT`, `$env:COORDI_OUTPUT_DIR`를 설정한다.

```sh
COORDI_BUNDLE_ROOT=<NEW> node scripts/smoke/serve-coordi-shop.js
COORDI_BUNDLE_ROOT=<NEW> COORDI_OUTPUT_DIR=<OUT> node scripts/smoke/coordi-windows-shop-browser.js
COORDI_BUNDLE_ROOT=<NEW> COORDI_OUTPUT_DIR=<OUT> node scripts/smoke/coordi-local-http-benchmark.js --female
npm run check
```

저장 코디 재검사는 비공개 로컬 입력이 필요하다. `node scripts/audit/coordi-local-compatibility.js <NEW> <PRIVATE-SAVED-INPUT> <OUT>/compatibility.json <BASE>/reports/public-catalog-compatibility.json`. 학생별 원본을 Git이나 인계 ZIP에 넣지 않는다.

## 배포 후보와 원격 검증 경계

`node scripts/build-coordi-local-release.js <NEW> <새 릴리스 폴더>`를 실행해 `/tmp/coordi-supplement-results-20261028/release`를 생성했다. **기존 사이트 전체를 대체하는 폴더가 아니라 overlay**다. web/만 버전 경로에 포함하며 reference/raw-evidence/reports/tools는 Hosting 대상에서 제외한다. 클라이언트 local 설정, Functions env 예시, immutable/Content-Type 헤더 조각이 포함된다. repository의 운영 기본 설정은 바꾸지 않았다.

승인 후 배포 대상은 기존 Hosting 파일을 보존한 새 버전 데이터/상점 파일과 `asia-northeast3/renderCoordiShopPreview`다. commerce 함수·보안 규칙·다른 함수를 함께 배포할 이유는 없다. 이전 Hosting manifest와 합친 파일 목록을 검토해야 하며 단순히 overlay 폴더만 deploy하면 안 된다.

[원격 검증 계획](coordi-supplement-2026-10-28/remote-validation-plan.json): 별도 승인한 staging 프로젝트/테스트 계정/Storage 영역에서 CDN 헤더·cold/warm cache·Node22 동시성/peak메모리·실인증·Storage 저장/복원을 확인해야 한다. 현재 runtime은 두 운영 Firebase 데이터 출처만 허용하므로 staging의 실제 출처도 확인·설정해야 한다. 임의 URL 허용으로 우회하지 않는다. 이번에는 새 원격 리소스나 공개 preview를 만들지 않았다.

운영 전환 조건은 미지원5개의 해결 또는 제한 범위에 대한 명시적 결정, 원격 통합 검증, Hosting/Functions snapshot 일치 검토, 별도 배포 승인이다. 롤백도 env/config/Hosting 버전으로 처리하며 학생 기록을 변경하지 않는다.
