# 로컬 코디 데이터 운영 전환

사용자 승인: “운영 미반영 사항 반영 작업 진행”. 이 승인은 앞선 운영 전환 대기를 해제한다. 첨부 문서의 지시를 배포 승인으로 대신 사용하지 않았다. 이전 구현·보완 검증은 [보완 보고서](COORDI_SUPPLEMENT_2026-10-28.md)에 있다.

**운영 반영 완료.** Hosting `46e4ac236a4d6cee`, 자체 렌더 함수 `rendercoordishoppreview-00006-zuj`. 기본 옷과 여성 기본 헤어31000, 기존 저장 코디를 실제 로그인한 운영 화면에서도 확인했다. 미지원5개와 아래의 미실행 검증은 남아 있다.

## 반영 범위

- 데이터 snapshot `1B0FD079043CC715E90E95376B2D3641B3E5DE3619C4156F0830C2B5362B1820`.
- web manifest SHA-256 `bb9c34c995a3b8bf0f5663330650599b774483c21b33b30b4131380b5ed82195`.
- Windows web 데이터와 가격·소유권을 결정하지 않는 표시 목록만 `/codi/<snapshot>/`에 게시한다. 원본 WZ, reference, raw-evidence, 도구, 학생 저장 코디는 게시하지 않는다.
- Hosting 기존 4,754개 파일을 복제·보존한다. 데이터 63,896개를 추가한 뒤 상점 공급자·미리보기·초기화와 runtime 설정 6개만 추가/교체한다. 기존 HTML/JS/JSON 헤더를 유지하고 버전 데이터의 immutable/raw gzip 헤더만 추가한다.
- `renderCoordiShopPreview` 한 함수의 source와 로컬 모드 환경값 4개를 변경한다. 이전 소스를 가리키는 `firebase-functions-hash` 라벨만 무효화해 향후 CLI가 예전 해시를 믿고 배포를 생략하지 않도록 한다. 나머지 라벨과 기존 Node22, 256MiB, CPU1, 최대2인스턴스, 동시성8, timeout40초, 서비스 계정·네트워크·기존 환경값을 보존한다. 나머지133개 함수 전체 메타데이터를 전후 대조한다.
- `functions/.env.dj48-quiztown-firebase`의 값 4개는 공개 데이터 버전·출처이며 비밀키가 아니다. 향후 Firebase CLI 재배포에서도 운영의 선택이 유지되도록 Git에 기록한다.
- 학생 계정, 구매·쿠폰·코인·보유·장착·염색 원장, Firestore/Storage 규칙과 인덱스를 수정하지 않는다. 기존 교실 Storage 이미지도 일괄 덮어쓰지 않는다.

## 배포 순서와 복구

`scripts/maintenance/release-coordi-local.js`는 명시적인 단계 옵션만 받는다. 각 단계는 운영 버전이 준비 당시와 일치하는지 확인하며, 업로드는 완료한 묶음부터 재개할 수 있다.

1. `--snapshot`: Hosting manifest/설정,134함수 메타데이터, 기존 미리보기 함수 소스 ZIP을 로컬 보관.
2. `--prepare-data`: 현재 Hosting 복제, 버전별 데이터 업로드, 전체 manifest와 헤더 대조. 이 단계는 live 전환이 아니다.
3. 전체 `npm run check` 성공 기록 후 `--publish-data`.
4. `coordi-windows-reference.js ... --production-cdn`: 실제 CDN 응답만으로 정상58/예상거부11 비교. manifest와 파츠 해시, gzip 처리 확인.
5. `--function`: Cloud Functions v2 PATCH의 `buildConfig.source,serviceConfig.environmentVariables,labels` 필드만 갱신. 라벨은 앞서 설명한 과거 CLI 해시 무효화만 허용한다. [공식 PATCH 계약](https://docs.cloud.google.com/functions/docs/reference/rest/v2/projects.locations.functions/patch), [소스 업로드 계약](https://docs.cloud.google.com/functions/docs/reference/rest/v2/projects.locations.functions/generateUploadUrl).
6. `--function-status`: ACTIVE, 설정 보존, 나머지133함수 불변, 실제 배포 소스 해시 대조.
7. `--prepare-client`, `--publish-client`, `--verify`: 상점 local 설정 게시, 전체 Hosting manifest 및 클라이언트 응답 해시, 비로그인401 확인.
8. `coordi-windows-renderer-browser.js ... --production-cdn`: 새 Chrome에서 외부 출처를 차단하고 실제 운영 JS/데이터의69개 결과 확인.

복구 기준 Hosting은 `3ed3040023a7477d`, 미리보기 revision은 `rendercoordishoppreview-00005-huc`다. `/tmp/coordi-production-20261028/before.json`, `function-before.json`, `function-before.zip`을 보관한다. 복구가 필요하면 기존 source 및 환경값을 동일한 좁은 필드 마스크로 복원하고, 기존 Hosting 버전을 다시 release한 후 전체 새로고침한다. 원장을 수정하거나 데이터를 삭제하는 복구 절차는 없다. 데이터·앱 전환은 두 Hosting release이므로 단계별 영수증에 직전 버전도 기록한다. 비공개 전체 설정 스냅샷은 Git에 올리지 않는다.

같은 복구 스냅샷은 임시 폴더 정리에 대비해 Git 제외 경로 `private/coordi-production-20261029-rollback/`에도 별도로 보관했다. 기존 private 파일은 변경하지 않았다.

## 남는 제한

미지원 판매 아이템5개 `1032331`, `1073469`, `1103862`, `1102039`, `1703421`은 오류를 명시하고 선택 및 직전 정상 이미지를 유지한다. 대체 상품이나 투명 파츠로 속이지 않는다. 구매 내역 삭제·판매 ID 변경도 없다. [Windows 보완 요청](coordi-supplement-2026-10-28/WINDOWS-REQUEST.md)의 근거·규칙·골든 이미지가 더 필요하다.

사용자가 직접 기존 관리자 계정으로 로그인했다. 학생 자격 증명을 추측하거나 새 계정을 만들지 않았다. 실제 운영 인증 상태에서 저장 코디 읽기, 여성 기본 코디 입어보기, 기존 저장 코디 복원을 확인했다. 구매·장착·염색 저장 버튼은 누르지 않았다. **실계정 구매/저장 및 교실 Storage 업로드 E2E, Cloud Run cold/warm p95·peak메모리는 미검증**이다. 메모리 commerce 테스트와 운영 CDN 합성 검사를 이 항목들의 대체 성공으로 계산하지 않는다.

## 실제 CDN에서 발견하고 수정한 압축 경계

첫 데이터 게시 후 정상 합성이 `Content-Encoding` 거부에 걸려 서버·상점 전환을 중단했다. 일부 응답은 `br`, 일부는 `gzip`, 일부는 헤더가 없었다. [Firebase Hosting 공식 설명](https://firebase.google.com/docs/hosting/)대로 CDN이 전송 압축을 선택하며, Fetch가 이를 해제한 응답 본문은 원본 gzip 파츠와 동일했다.

reader는 헤더 존재만으로 거부하는 대신 Fetch 이후 gzip magic, 실제 길이, 원본 SHA-256을 확인한 뒤 별도로 제한된 gzip 해제를 수행한다. 단일 gzip 파일에 잘못 `Content-Encoding:gzip`만 붙여 JSON으로 풀려버린 경우는 여전히 거부한다. 실제 HTTP 서버의 identity/gzip/Brotli 정상3개와 잘못 표기한1개 거부 회귀 검사를 추가했다. 합성 규칙·Windows 데이터·manifest pin은 변경하지 않았다.

수정된 Node22 reader로 실제 운영 CDN의69개 기준 사례 모두 통과했다. 정상58개는 원래 크기 RGBA 변화픽셀0이고 예상거부11개도 일치한다. 기존 인계 문서의 “Content-Encoding 없음”을 무조건 요구하는 대신 **Fetch 이후 저장된 gzip bytes가 정확히 보존되는지**를 검증하는 것으로 구체화했다. 외부 렌더러로 우회하지 않았다.

## 실행 결과

- 배포 코드 기준: `94678c4096e80b25b3c8b29a8315f3fe69dd34fd`. Firebase CDN 대응 reader 수정은 `b418a2ea`에 포함된다. 최종 보고 커밋은 이 문서의 Git 이력을 확인한다.
- Hosting: 기존4,754파일을 보존하고 버전 데이터63,896개 및 새 runtime-config를 추가했다. 최종 **68,651파일 전체 manifest**, 상점 변경6개 응답 SHA 및 헤더가 준비본과 일치한다.
- Functions: 미리보기만 ACTIVE 새 revision으로 전환. 배포 소스128개 해시 일치. 기존 서비스 설정·환경값과 다른133함수 보존. Eventarc 필터는 API가 배열 순서를 바꿔 반환하므로 순서만 정규화하고 모든 필터 값·갱신 시각을 대조했다.
- 최종 CDN 수정 후 전체 `npm run check` exit0, 교과2,502화면 포함.
- 실제 운영 CDN: Node22 **69/69**, 정상58개 원래 크기 RGBA 변화픽셀0, 예상거부11개 일치. 새 Chrome도 **69/69**, 외부 출처 차단·외부요청0. Fetch 이후 원본 gzip SHA/길이를 검증했으며 자동 Brotli 전송도 통과했다.
- 운영 CDN을 연결한 로컬 서버 런타임: 기본 여성+기본 옷, 캐시 재사용, 동시8요청, 미지원5개의 `failed-precondition` 통과. 이 검사의 인증은 합성이며 Cloud Run 지연 측정은 아니다.
- 최종 로컬 상점 브라우저: 외부 요청0, 기존 외부 캐시 폐기, 상점·광장·교실 동일 자체PNG, 연속 선택·계정 전환의 늦은 응답 폐기, 구매·장착·염색·저장/복원·390px 통과. 거래는 메모리 테스트 원장만 사용했다.
- 운영 비로그인 preview/commerce 모두401. 실제 사용자 로그인 세션에서는 기존 보유·저장 코디, 기본 여성31000+흰 티/청반바지 및 ‘미리보기 반영됨’을 확인했고, 마지막에 기존 저장 코디로 복원했다. 운영 거래는 실행하지 않았다.
- 로그인 탭의 첫 빈 iframe은 브라우저 디버깅 연결 상태에서 재현됐고, 연결 해제 후 새로고침한 일반 Chrome에서는 정상 로드됐다. 동일 운영 iframe은 별도의 새 Chrome에서도 정상 로드됐다. 이 현상 때문에 운영 UI 코드를 임의 수정하지 않았다. 운영 로그인 UI 검사에는 외부 도메인 차단을 적용하지 않았으며, 차단 검증은 위의 별도 새 브라우저/로컬 통합 검사와 구분한다.

영수증: [Hosting](coordi-production-2026-10-29/client-receipt.json), [Functions](coordi-production-2026-10-29/function-receipt.json), [전체 파일·접근 검증](coordi-production-2026-10-29/verified.json), [Node CDN RGBA](coordi-production-2026-10-29/cdn-reference.json), [Chrome CDN](coordi-production-2026-10-29/cdn-browser.json), [CDN 런타임](coordi-production-2026-10-29/cdn-runtime.json), [전체 검사](coordi-production-2026-10-29/checks.json), [마지막 운영 상태 확인](coordi-production-2026-10-29/last-live-check.json).

저장소 https://github.com/cantroxx/gas-quiz-firebase , 브랜치 `codex/coordi-local-runtime`. 소스·검증 보고서를 같은 브랜치로 push한다. 로컬 데이터 원본과 실제 계정/거래 자료는 Git에 포함하지 않는다.
