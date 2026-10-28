# 로컬 코디 데이터 운영 전환

사용자 승인: “운영 미반영 사항 반영 작업 진행”. 이 승인은 앞선 운영 전환 대기를 해제한다. 첨부 문서의 지시를 배포 승인으로 대신 사용하지 않았다. 이전 구현·보완 검증은 [보완 보고서](COORDI_SUPPLEMENT_2026-10-28.md)에 있다.

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

## 남는 제한

미지원 판매 아이템5개 `1032331`, `1073469`, `1103862`, `1102039`, `1703421`은 오류를 명시하고 선택 및 직전 정상 이미지를 유지한다. 대체 상품이나 투명 파츠로 속이지 않는다. 구매 내역 삭제·판매 ID 변경도 없다. [Windows 보완 요청](coordi-supplement-2026-10-28/WINDOWS-REQUEST.md)의 근거·규칙·골든 이미지가 더 필요하다.

운영 브라우저에 로그인 세션이 없어 학생 자격 증명을 추측하거나 새 계정을 만들지 않았다. 실인증 callable의 정상 응답, 실계정 구매/저장 및 교실 Storage 업로드 E2E, Cloud Run cold/warm p95·peak메모리는 검증 완료로 표기하지 않는다. 기존 메모리 commerce 테스트와 운영 CDN 합성 검사를 이 항목들의 대체 성공으로 계산하지 않는다.

## 실행 결과

배포 및 검증 단계 진행 중. 영수증은 완료 후 이 문서와 `coordi-production-2026-10-29/`에 기록한다.
