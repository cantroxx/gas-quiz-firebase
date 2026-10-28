# 코디룸 자체 데이터 런타임 후속 검증

후속 Windows 보완 델타의 최신 결과는 [보완 검증 보고서](COORDI_SUPPLEMENT_2026-10-28.md)를 따른다.

2026-10-28. 기준 `509687040e7afe5998daa8c919d83c75e6a31e1e`, 브랜치 `codex/coordi-local-runtime`.
저장소: https://github.com/cantroxx/gas-quiz-firebase . 구현 커밋: `0ece356f6dfd439be58398479b2fcf4a73c970a8`. 이 문서는 이전 `COORDI_WINDOWS_INTEGRATION_2026-10-28.md`의 후속 상태다. 최종 전체 커밋 SHA와 push 결과는 최종 인계 메시지에 기록한다.

## 결론과 운영 관계

실제 RGBA 합성기는 이미 50968704에 있었고, 외부 렌더러를 감싼 함수만 있었던 상태는 아니다. 하지만 기본 공급자가 외부였고 `/codi/` 데이터와 활성 설정이 배포되지 않았으며, 기본 헤어/판매 파츠 실패 때문에 전환을 보류했다. 이번 변경은 기존 합성기에 **운영 구조에 맞는 HTTP 공급 경로·명시적 설정·캐시·용량 제한·실제 소비 화면 검증**을 더한다. 기존 원본 코어의 합성 수학을 임의로 수정하지 않았다.

읽기 전용 운영 감사 결과([원본 보고](coordi-local-2026-10-28/production-audit.json)):

- Hosting live `3ed3040023a7477d`, `/codi/` 공개 파일 0개, 해당 snapshot manifest HTTP404.
- 공개 index/data-provider/preview-renderer/dressing-room과 다운로드한 두 서버 함수의 index/catalog/commerce/service/providers 비교 파일은 모두 50968704와 일치한다. 전체 저장소 모든 파일의 배포 동일성을 주장하는 검사는 아니다.
- `renderCoordiShopPreview` revision `rendercoordishoppreview-00005-huc`, `coordiShopAction` revision `coordishopaction-00009-heb`, 둘 다 ACTIVE.
- 기존 index는 외부 service를 직접 선택하고 공개 초기화에 로컬 설정이 없었다. Windows의 관찰은 맞다.
- 운영 `coordiProfiles` 159개에서 owned/look/prisms만 읽었다. 학생 식별자는 출력·커밋하지 않았고, 실제 저장 조합은 소유자를 제거한 뒤 로컬 `/tmp`에만 두었다. Firestore/Storage/쿠폰/구매 내역 쓰기 0회.

**운영 미반영**: 배포·규칙 변경·마이그레이션·외부 경로 삭제를 하지 않았다. 저장소 기본 설정도 `official`이다. 로컬 전환은 아래 데이터 보완과 원격 환경 검증 결과를 바탕으로 별도 승인해야 한다.

## 공급·합성·캐시 구조

`functions/coordi-shop/runtime.js`는 `COORDI_RENDERER_MODE`로 공급자를 고른다. local 모드는 허용한 Firebase Hosting HTTPS 출처, 정확한 `/codi/<64자리 snapshot>/`, **실제 web/manifest.json SHA256**을 모두 요구한다. 루프백 허용은 메모리 미리보기 서버만 명시적으로 전달한다. 실패 시 외부로 되돌아가지 않는다.

Node22 Firebase callable에서 기존 portable core를 실행하도록 선택했다. 인증/응답 계약과 교실 PNG 저장을 유지하고 학생 기기의 합성 부담을 줄이며, 323MB 원본 전체를 Functions 패키지에 넣지 않는다. 브라우저와 Node는 동일 코어를 공유하고 브라우저도 기준 픽셀 검증을 통과했다. 정적 버전 파일은 기존 Hosting으로 공급하므로 별도 렌더 서비스가 필요 없다. Hosting은 배포 버전 저장량과 전송량에 비용이 발생하므로 무료라고 가정하지 않는다([공식 사용량 설명](https://firebase.google.com/docs/hosting/usage-quotas-pricing)).

- HTTP reader: 필요 버킷/파츠/공통 body/head/order/slots만 읽는다. 전체 catalog/page 프리로드 없음. 카테고리별 `catalogPage` API도 제공한다.
- 정확한 snapshot 및 manifest hash 고정, 상대 경로 이탈/redirect 거부, 요청 15초, 압축·해제 byte 길이와 SHA256 확인. `.gz`는 raw bytes, `Content-Encoding`이 있으면 거부한다.
- 파츠/JSON LRU 128개, JSON 문자열 환산 64MiB 상한(프로세스 전체 heap 제한과는 다름). 진행 중 동일 요청 합치기, 실패 캐시 제거. 합성 동시 2개, 대기 8개 상한.
- 완성 PNG 캐시 100개, key는 공급자/스냅샷/manifest/코어·기본옷 규칙 버전 + 정규화한 전체 코디/염색. 모든 캐시/진행 중 결과 조회 전에 기존 서버 인증 검사를 다시 실행한다.
- 기존 `renderCoordiShopPreview({look})` 성공 PNG data URL 응답을 유지한다. 로컬 응답은 `renderer`, `sourceSnapshot`, `renderKey`, `includesEffects`, `size`를 포함한다. 외부 전용 Nexon hash를 위조하지 않는다. 50968704의 공통 클라이언트는 이미 hash 없이 PNG를 소비한다.
- `runtime-config.json`과 버전별 `quiztown-display.json`을 클라이언트가 읽는다. 기존 판매/표시 순서 유지, 1,632개 고유 항목. 원본 31,599개를 판매 목록으로 확장하지 않는다. 아이콘은 화면에 표시된 항목의 index bucket에서만 읽는다. 로컬 모드에 과거 thumbnail 또는 외부 icon fallback 없음.
- 기존 effects JSON을 로컬에서 읽지 않고 PNG에 합성된 효과를 한 번만 표시한다. 로컬 모드의 외부 캐릭터 불러오기 경로는 거부한다. 저장/공유 코디의 과거 이미지 URL은 폐기하고 선택·염색만 복원한다. 클라이언트/서버 snapshot 불일치도 오류로 표시한다.

원시 core의 anchor·slot/z 가림·한벌옷·피부·귀·헤어/성형 믹스·프리즘/EffectPrism·알파/반올림은 그대로 유지한다. **6가지 동작의 첫 프레임** 합성이지 전체 애니메이션이 아니다. 기존 상점 callable은 stand1과 기존 효과 옵션만 허용한다. 원시 위젯의 face mix0..100 지원과 기존 상점의 face dye 저장 거부/hair mix0..99 계약은 구분한다. 새 저장 형식이나 소유권 규칙은 만들지 않았다.

상점·광장·교실의 신규 아바타 불러오기는 같은 callable과 공통 헤어 HSL 처리기를 사용한다. 교실이 이미 Storage에 저장한 사진/아바타는 기존 스냅샷으로 보존한다. 새 코디를 반영하려면 기존 ‘저장한 코디 불러오기/저장’을 사용하며 이번 작업에서 학생 파일을 일괄 갱신하지 않았다.

## 외부 의존성 대조

| 영역 | 운영 50968704 | local 후보 |
|---|---|---|
| 상품/표시 목록 | Hosting 정적 JSON(과거 외부 수집), 가격은 서버 catalog | snapshot 표시 JSON, 서버 가격 목록 그대로 |
| 아이콘 | 과거 verified PNG/thumbnail 자료 | 전달받은 icons PNG, 화면의 index bucket만 읽음 |
| 캐릭터 파츠 | 외부 서비스 내부 | snapshot gzip JSON + base/order/slots |
| 미리보기 | meaegi hash 요청 → Nexon character PNG | Node 자체 RGBA 합성 → PNG data URL |
| 기본/장비·피부 프리즘 | 외부 요청 | 자체 pixels/core |
| 헤어 native mix / 과거 HSL | 외부 원본 PNG + 공통 HSL | 자체 원본 PNG + 같은 공통 HSL |
| 효과 | 외부 원본과 로컬 effects 자료 | 전달 Sprite 규칙으로 합성, 중복 overlay 없음 |
| 예전 직접 입력/GMS URL 생성 | 코드에 남아 있는 외부 경로 | 로컬 직접 입력 거부, GMS 생성 함수는 호출하지 않음 |

로컬 후보에 과거 `/verified/` 이미지나 `/coordi-shop/data/`·`/api/` 경로 요청이 없는지도 자동 검사한다. 기존 공식 공급자 코드는 이번 전환 준비에서 삭제하지 않았다.

## 실제 호환성 검사

- 원본 verifier: **64,064파일 / 322,927,171 bytes / 31,599개**, 실패0. 원본 묶음 수정 없음.
- [정상26 + 예상거부4](coordi-local-2026-10-28/reference-node.json): Node와 Chrome 모두 30/30, Pillow 독립 비교도 정상26 모두 원래 크기 RGBA 변화픽셀0·최대채널오차0. 예상거부를 정상으로 바꾸지 않았다.
- [실제 서버 판매 목록](coordi-local-2026-10-28/sale-render.json): 1,632개 단품 실제 합성, 1,626통과/6실패. 피부2000·귀0·stand1·무염색 기준이다. 여성 테스트용 hair61050은 합성 테스트에서 **명시적으로 선택한 기준**이며 실제 여성 기본31000의 자동 대체가 아니다.
- 실패: earring1032331, shoes1073469, cape1103400/1103862/1102039, weapon1703421. 기본 hair31000도 별도 실패한다.
- [공개 목록 재검사](coordi-local-2026-10-28/compatibility.json): 누락72 + 추가확인60 =132개 모두 실제 합성. 3통과/129실패. 누락72 중 실제 판매0개. 추가확인60 중 판매7개(그중 명시적 invisible3개 통과). 공개 목록 총8,721을 판매 개수로 간주하지 않았다.
- 보유117종은 모두 현재 서버 catalog ID에 대응. 저장 코디는 기본 빈 코디 포함 10개 고유 정규화 조합 중 8통과/2실패. 실패2는 hair31000이며 하나는 기본빈코디150프로필, 다른 하나는 피부프리즘이 있는1프로필이다. 이는 “151명이 현재 광장에서 잘못된 이미지를 본다”는 뜻이 아니다. 빈 장착 광장은 기존 중립 위치 표시를 사용한다. 기존 헤어 HSL 저장 조합도 실제 합성했다.
- 전체 아이템×동작×피부×귀×믹스의 조합 전수검사는 아니다. 판매 단품/저장 코디 성공에도 Windows 기준 이미지가 없는 조합은 픽셀 정답까지 인증한 것으로 간주하지 않는다.

재추출에 필요한 정확한 ID/부위/동작/피부/귀/염색/믹스/오류와 raw look/callable 입력을 **[WINDOWS-REQUEST.md](coordi-local-2026-10-28/WINDOWS-REQUEST.md)** 한 문서와 연결 JSON에 정리했다. 우선7개 실패 ID 및 공개132개 전부 포함한다. 아이템 대체·판매 삭제·구매/장착 내역 삭제는 하지 않았다.

## 화면·서버 검증

`coordi-windows-shop-browser.js`는 새 Chrome context에서 HTTP/HTTPS 외부 요청을 모두 차단한다. 미리보기 서버의 파츠 fetch도 자기 루프백 출처만 허용한다. 기존 외부 PNG URL을 localStorage에 주입해 캐시 성공 오판을 방지한다.

검증: 여성31000 명시적 오류, 직접 남성 선택 후 기본 티/바지, 로컬 아이콘, 검색·부위 선택·큰 미리보기·착용 목록·A/B·undo/redo, 코인 구매·장착·염색·저장/복원, 미지원 항목 선택 보존 및 이전 실제 이미지 유지, 390px 폭, 계정 전환 뒤 지연 응답 폐기. 광장과 교실의 **실제 프런트 모듈**을 로드해 동일한 자체 PNG를 확인했다. 교실 status와 계정은 테스트용이며 PNG는 실제 HTTP 합성 결과만 쓴다. Firebase 운영 인증/Storage 업로드 E2E를 완료했다고 주장하지 않는다.

[HTTP 측정](coordi-local-2026-10-28/http-benchmark.json): 루프백 첫125ms/재사용1ms, 첫14개 파일·1,829,991bytes, 재사용 추가파일0, 동시8요청 성공. Cloud Run cold start나 CDN 지연 수치는 아니다. [브라우저 시나리오](coordi-local-2026-10-28/http-browser-metrics.json)는 외부요청0, 동일PNG/계정응답폐기 확인, 전체 묶음을 내려받지 않았다.

`tests/coordi-shop/http-reader.test.js`: 버전·출처 고정, hash/raw-gzip/path, 필요한 페이지, 중복/실패 재시도, 인증 전 데이터 접근 금지. 기존 provider 경계 테스트도 통과한다.
`access-emulator`, `starter-emulator`, `coupon-reset-emulator`는 demo 프로젝트에서 인증/상점닫힘/관리자 예외/캐시 인증/가격/중복구매/쿠폰경합/소유권/장착/무료염색/복원을 검증했다. 운영 데이터에 이 테스트를 실행하지 않았다.

전체 `npm run check`와 최종 회귀 실행 결과는 [검증 실행 기록](coordi-local-2026-10-28/validation.json)에 기록한다.

## Windows에서 재현·다음 승인 단계

원본 폴더를 유지하고 Node 의존성을 설치한 뒤 PowerShell에서:

```powershell
$env:COORDI_BUNDLE_ROOT = 'C:\path\quiztown-codi-windows-20261028'
node scripts/smoke/serve-coordi-shop.js
```

출력된 `http://127.0.0.1:<port>/`로 접속한다. 데이터는 실제 `/codi/<snapshot>/manifest.json` 경로에서 제공되며 `runtime-config.json`은 local로 표시된다. 구매는 메모리의 가상 계정만 바꾸고 서버 종료 시 사라진다. Node 원본 비교는 `node scripts/audit/coordi-windows-reference.js <bundle> <output>`로 재현할 수 있다. Chrome 자동 검사는 현재 Mac Chrome 실행 경로를 사용한다.

`node scripts/build-coordi-local-release.js <bundle> <새 출력폴더>`는 원본 전체 검증 후 **web/만** 버전 경로로 복사하고 표시 목록·클라이언트 설정·Functions env 예시·Hosting header 조각을 만든다. 검증용 릴리스 후보는 로컬 `/tmp/coordi-local-phase2/release`에 생성했다. 이 출력은 단독 전체 사이트 배포본이 아니며 기존 Hosting 내용에 합칠 overlay다. 원본 323MB를 Git/Functions 패키지에 넣지 않는다.

실제 web manifest SHA256: `170e2cc0d4e68209947770f141809f17ceaa5723e52020da188527fe39344a35`.
source manifest SHA256 `13454b...`와 혼동하지 않는다.

운영 승인 전 남은 단계:

1. Windows 자료/규칙 보완 후 실패7개 ID, 공개129개 미지원 중 필요한 범위와 저장 코디2조합을 다시 검증한다. 미지원 유지를 허용할 범위는 별도로 결정한다.
2. 원격 preview에서 Hosting 실제 raw gzip 헤더/경로/전체 파일 업로드, Functions Node22 cold start·메모리·동시성·실계정 인증과 교실 Storage 저장/복원을 확인한다. 현재는 로컬 HTTP 환경 검증까지다.
3. 기존 운영 파일을 보존한 Hosting overlay와 서버 env의 snapshot을 함께 검토하고 승인받는다. 로컬 성공만으로 전체 운영 전환하지 않는다. 데이터가 먼저 준비된 뒤 함수/클라이언트를 맞추고, 되돌릴 경우 이전 env/config/Hosting 버전만 복원하며 학생 기록은 건드리지 않는다.
4. 외부 API 경로 삭제는 통합·운영 검증 이후 별도 변경으로 진행한다. 현재 official 코드는 복구 경로로 보존한다.
