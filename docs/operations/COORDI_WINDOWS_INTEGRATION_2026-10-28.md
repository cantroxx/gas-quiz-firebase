# Windows 코디 인계 검증·자체 렌더러 연결

후속 HTTP 런타임·운영 데이터 대조·외부 차단 검증은 [최신 보고서](COORDI_LOCAL_RUNTIME_2026-10-28.md)를 따른다.

2026-10-28, 한국 시간. **로컬 구현·검증 완료, 운영 공급자 전환 및 배포 보류.**

후속 사용자 승인으로 기본 의상·상점 UI와 미커밋 작업의 통합 릴리스를 진행했다. 최신 커밋·배포 기록은 [통합 배포 보고서](WORKSPACE_RELEASE_2026-10-28.md)를 따른다. 아래는 Windows 연결 시점의 검사 기록이며 자체 공급자의 운영 전환은 계속 보류한다.

## 파일 검증

원본: `/Users/kdw/Downloads/quiztown-codi-windows-20261028`.
`MACBOOK-START-HERE.md` → README → DATA-CONTRACT / RENDERING-PORT / UI-HANDOFF 순으로 읽고, 검증 스크립트 내용을 확인한 뒤 실행했다. 원본 묶음은 수정하지 않았다.

- `python3 tools/verify_bundle.py .`: **64,064파일, 322,927,171 bytes, 31,599개 목록, 실패 0**.
- 모든 SHA256SUMS, 파츠/아이콘 descriptor 해시, 목록/인덱스 대응, base-index 확인.
- snapshot: `7B05F3B49BDF2B2DBD868F0C932BE1C9D8C5A22AD47A6CB8FE09F41A3A1EC1A3`.
- source manifest: `13454b0779708d87bb9c19ab356dad0fcee57c31509d3df5025fdb5676eba40a`.
- 결과 정본: [bundle-verification.json](coordi-windows-2026-10-28/bundle-verification.json).

## 구현

### 렌더러

`functions/coordi-shop/local-renderer/`를 정본으로 구현했다.

- `core.js`: Validate → DisplayLook → Variants → ARGB4444 파츠 믹스 → Compose → Blend → 최종 Normalize. ID 순서, slot ownership, zmap/smap, 전체 파츠 anchor, 고정 얼굴 표정, sprite effect, 가변 캔버스, 좌우 반전 유지.
- `pixels.js`: 프리즘/기존 색상 행렬, float32 순서, nibble-space floor, ties-to-even 및 최종 alpha round-trip 재현.
- `png.js`: PNG CRC 검증·압축/해제·raw RGBA. Canvas 디코드의 premultiplication/색관리로 인한 픽셀 변화를 피한다. 이미지/해제 크기 제한과 미지원 PNG 레이아웃 거부.
- `reader.js`: Node 파일 reader. 같은 묶음 내부 경로/실경로만 허용, descriptor byte length/SHA-256/해제 크기 검사. JSON 캐시 최대 128개·64MB.
- `browser-reader.js`: 동일 출처의 snapshot 버전 경로 reader. raw gzip + Content-Encoding 없음 계약, 압축 파일 해시 및 해제 크기 검사. 현재 코디에 필요한 파츠만 읽는다.
- `scripts/build-coordi-renderer.js`: png/pixels/core/browser-reader를 `public/coordi-shop/renderer/`에 바이트 그대로 복사한다. public 산출물을 직접 수정하지 않는다. `check:static`에서 일치 확인.

이식 근거는 인계본의 StudioLocalRenderer, StudioRenderer, StudioHairPartMix, StudioOutputPrecision, StudioPrismTransform, StudioColorTransform, StudioAppearanceRules, StudioModels, IoDressroom, StudioPrismSettings 소스다. 참고 코드/자산 출처는 인계 snapshot과 `reference/source-files.json`을 보존한다. 데이터의 공개 제공 권한은 인계본에서 확정되지 않았으며 이번에 원격 공개하지 않았다.

### 기존 API 어댑터

`functions/coordi-shop/local-provider.js`의 `createLocalProvider({bundleRoot})`를 기존 `createCoordiPreviewService({provider,...})`에 주입한다.

- 기존 itemCode/itemPrism 입력 유지. skin은 manifest의 실제 `Id + 10000`과 base-index를 함께 확인해 매핑한다. 임의 번호에서 10000을 빼고 성공 처리하지 않는다.
- dress는 기존 서버 catalog의 top/overall category로 구분. 파츠의 실제 category/slot도 확인한다.
- native hair mix 0..99%는 색상 ID 존재 확인 후 MixId/MixPercent로 변환. 기존 HSL은 기존 공통 hair-prism 경로가 마스크 후처리하며 원장 형식은 변경하지 않는다.
- 부위/색상/옵션 미지원은 명시적 오류. 기본값을 다른 상품으로 바꾸지 않는다.
- 결과는 `{success, imageUrl, renderKey, renderer, includesEffects, size, sourceSnapshot}`. PNG data URL이며 외부 넥슨 hash를 위조하지 않는다. 이전 단계에서 준비한 hash 선택 계약을 사용한다.
- 자체 결과는 sprite effect 포함 PNG이므로 상점의 별도 overlay를 다시 더하지 않는다. 광장·교실도 같은 PNG를 사용한다.
- 현재 기존 API 어댑터는 stand1 정지 프레임이다. core의 6개 동작 첫 프레임 지원이 게임 전체 애니메이션/임의 표정 지원을 뜻하지 않는다. 입력 width/height/x/y를 이미지 확대 명령으로 바꾸지 않았다. PNG는 자체 가변 크기로 반환하고 UI에서 표시한다.
- 서버 거래 코드·카탈로그 가격·Firestore 스키마·규칙·쿠폰·영수증은 변경하지 않았다. 미리보기의 성공이 소유권을 부여하지 않는다.

**현재 활성화 범위:** 로컬 테스트 서버가 `COORDI_BUNDLE_ROOT`를 명시했을 때만 자체 provider를 주입한다. 실제 Functions export는 기존 외부 공급자를 그대로 사용한다. 전체 전환 조건이 충족되기 전에 이 경계를 바꾸지 않는다.

### 상점 UI

- 기존 판매 목록만 표시하며 새 데이터 31,599개를 판매 허용 목록으로 쓰지 않는다.
- 부위·성별·검색·보유 필터 유지, 48개씩 페이지 표시. 자체 묶음이 연결된 로컬 화면에서 현재 표시 상품의 index bucket과 아이콘만 읽는다. 원본 착용 썸네일은 기본 공급자/자료 부재 시 유지한다.
- 보유/입어보기/실제 장착 상태 구분, 미지원 메타데이터 표시. 파일 존재만으로 착용 성공을 보증하지 않는다.
- 큰 미리보기와 1/2/3/4배 확대, A/B 고정·복원·비교 종료, 최대 30개 입어보기 되돌리기/다시 실행, 저장 코디 불러오기.
- 이 조작들은 localStorage draft만 바꾸고 구매/장착/염색 callable을 호출하지 않는다. 저장된 염색과 draft가 다르면 별도 무료 적용이 필요함을 표시한다.
- A/B는 완료된 현재 이미지와 해당 draft를 함께 고정한다. 처리 중이거나 임시 프리즘 슬라이더 상태일 때 다른 코디의 이미지를 고정하지 않는다.
- 오류 시 이전 정상 이미지 유지, 실패한 선택 및 아이템 번호/이유 표시. 미지원 아이템을 조용히 숨기거나 교체하지 않는다.
- 구매·장착 버튼을 비교 도구보다 먼저 배치하고, 모바일에서 넓은 미리보기와 세로 배치를 사용한다. 무료 드레스룸의 거래 차단 유지.

## 정확도와 호환성 결과

| 검사 | 결과 | 한계 |
| --- | --- | --- |
| Node 기준 사례 | 정상 26개 **RGBA 완전 일치**, 거부 4개 오류 일치 | 제공된 정적 사례 범위 |
| Chrome 기준 사례 | 정상 26개 **RGBA 완전 일치**, 거부 4개 오류 일치, 외부 요청 0 | CPU/브라우저별 모든 조합 성능 보증 아님 |
| Pillow 독립 디코더 | 정상 PNG 26개, changedPixels=0, maxChannelError=0 | PNG 파일 바이트 동일성을 요구하지 않음 |
| 서버 판매 목록 메타데이터 | 1,632개: candidate 1,622, 명시적 투명 5, 제한 4, 파츠 누락 1 | candidate는 합성 인증이 아님 |
| 실제 판매 단품 합성 | **1,626 성공 / 6 실패** | stand1, 피부2000, 무염색, 남 헤어30000 / 여 테스트 헤어61050; 전체 저장 코디 조합 검사가 아님 |
| 세 화면 연결 | 동일 저장 코디/native mix 입력 → 동일 PNG, 서버 캐시 1회 렌더 | 교실 자동 갱신은 여전히 별개; 기존 스냅샷 보존 |
| 구형 헤어 | 기존 HSL 마스크 경로로 자체 PNG 후처리 성공 | 임의의 모든 헤어 색 변형 geometry는 별도 확인 필요 |
| 로컬 상점 | A/B/undo 무거래, 구매·장착·염색, 실패 이미지 보존, 아이콘, 효과 한 번, 모바일, 드레스룸 통과 | 테스트 코인·메모리 저장만 사용 |
| 기존 공급자 회귀 | 기존 commerce/loading/광장 브라우저 통과 | 실제 외부 upstream 가용성 검사 아님 |

기계 결과: [Node](coordi-windows-2026-10-28/reference-node.json), [Chrome](coordi-windows-2026-10-28/reference-browser.json), [Pillow](coordi-windows-2026-10-28/reference-pillow.json), [목록 대응](coordi-windows-2026-10-28/catalog-compatibility.json), [실제 단품 합성](coordi-windows-2026-10-28/sale-render.json).

여성 테스트 헤어61050은 명시적으로 고른 검사 기준이다. 운영 기본31000을 변경하지 않았고, 실패를 피하기 위해 사용자 입력을 바꾼 것도 아니다. 실제 기본 여성 코디의 실패는 별도로 검증하고 로컬 화면에 그대로 알린다.

## Windows 보완 요청 — 이 절과 sale-render.json을 전달

학생 정보 없이 재현 가능하다. snapshot은 위 버전이며 다음 7개 보완이 필요하다.

공통 조건: action=`stand1`, widget skin=`2000`(API skin=`12000`), ears=`0`, prism/mix 없음, FlipX=false. 판매 단품은 남 기본 face20000/hair30000 + 해당 부위 하나이며, 다른 의상은 없다. 여성 기본 헤어 건은 face21000/hair31000 조합이다. 정확한 원 요청은 sale-render.json의 failed[].request에 있다.

| ID / slot | 확인된 오류 | 요청 자료 |
| --- | --- | --- |
| 31000 / Hair | `헤어 그림자 파츠 형식을 확인하세요.` | 기본 여성 헤어의 stand1 그림자/헤어 프레임 형식·정상 비교 PNG |
| 1032331 / Earrings (여름빛 쥬얼) | `기준점이 없습니다.` | 귀고리 프레임 anchor/mapOffset |
| 1073469 / Shoes (뭉게뭉게 무지개 신발) | 동작 데이터 없음 | stand1 frameBooks/effects 및 정상 PNG |
| 1103400 / Cape (밤 비단 두루마기) | `기준점이 없습니다.` | 망토 프레임 anchor/mapOffset |
| 1103862 / Cape (춤추는 빛) | 효과 이동 규칙 미지원, part=null | 실제 효과 이동·pos/z/origin 규칙과 정상 PNG |
| 1102039 / Cape (투명 망토) | 동작 데이터 없음 | 투명 여부의 명시적 근거/DisplayLook 규칙 또는 실제 프레임. 이름만 보고 제거하지 않았음 |
| 1703421 / Cash (주황토끼 팡팡) | 알 수 없는 position=`weaponBelowHand` | 같은 snapshot의 order/zmap에 대한 위치 정의와 정상 PNG. 임의 순서를 넣지 않았음 |

추가로 원래 장비 표시 1042483/1062323/1054818은 단순 투명 아이템과 다르다는 계약을 유지했다. 원래 장비 문맥이 없으면 거부한다. 이들은 현재 서버 판매 목록에는 없지만 참고 거부 사례로 검사했다.

새 자료는 기존 압축 파츠를 직접 바꿔 이름/버전을 재사용하지 말고 새 snapshot/manifest/checksum으로 전달해 달라. 변경 파츠, order/slots, 영향을 받는 비교 사례, 26개 기존 사례의 회귀 결과를 함께 포함하면 된다.

## 로컬 재현

프로젝트 루트에서 실행한다. 배포 명령이 아니며 거래는 메모리에서만 처리한다.

```sh
COORDI_BUNDLE_ROOT=/Users/kdw/Downloads/quiztown-codi-windows-20261028 \
PORT=5374 node scripts/smoke/serve-coordi-shop.js
```

브라우저: `http://127.0.0.1:5374/`. 기본 여성31000의 오류는 의도된 가시적 미지원 상태다. 사용자가 직접 남자 아바타 또는 지원 헤어를 골라 테스트할 수 있다. 테스트 코인10,000개이며 서버를 다시 시작하면 테스트 거래가 초기화된다.

```sh
node scripts/build-coordi-renderer.js --check
node tests/coordi-shop/local-renderer.test.js
node tests/coordi-shop/windows-integration.test.js /Users/kdw/Downloads/quiztown-codi-windows-20261028
node scripts/audit/coordi-windows-reference.js /Users/kdw/Downloads/quiztown-codi-windows-20261028 /tmp/coordi-windows-render-results
node scripts/smoke/coordi-windows-renderer-browser.js /Users/kdw/Downloads/quiztown-codi-windows-20261028
COORDI_BUNDLE_ROOT=/Users/kdw/Downloads/quiztown-codi-windows-20261028 node scripts/smoke/coordi-windows-shop-browser.js
```

로컬 서버는 `/codi/<snapshot>/` 아래에 **web/만** 제공한다. `.json.gz`는 application/octet-stream, Content-Encoding 없이 전달하고 각 reader가 한 번 해제한다. 원본/reference/reports/tools는 정적 공개 대상에 복사하지 않았다. 약323MB를 public/이나 Functions 배포 소스에 복제하지 않았다.

## 전체 검사와 전환 게이트

`npm run check`는 새 정적/렌더 단위 테스트 및 기존 도메인·규칙·공개 셸·교실 초상화/UI 등을 통과했지만, 이전 조사와 같은 기존 전자칠판 브라우저 테스트 날짜 불일치로 exit 1이다. `classroom-board-browser.js:19`에서 30초 timeout. fixture 서버는 2026-10-21 고정, 브라우저는 2026-10-28을 보내 미래 날짜로 거부된다. 이 파일은 이번 작업 범위가 아니어서 수정하지 않았다. 뒤의 교실 후속/교과 브라우저 검사는 이 전체 실행에서 미실행이다.

로그: `/tmp/coordi-windows-full-check-20261028.log`. 관련 브라우저 로그와 스크린샷은 `/tmp/coordi-windows-shop-browser.log`, `/tmp/coordi-windows-shop-desktop.png`, `/tmp/coordi-windows-shop-mobile.png`.

남은 전환 조건:

1. 위 7개 제한 보완 또는 명시적 전환 정책. 현 기본/보유품을 조용히 대체하지 않는다.
2. 필요한 장비 조합·염색·효과 추가 corpus, 모바일 성능/서버 비용 확인. 제공 사례와 단품 성공을 전체 조합 성공으로 확대하지 않는다.
3. 실제 배포 함수 소스와 현재 카탈로그 재대조. 운영 프로필/구매 내역은 이번에 읽지 않았으며 기존 보유 코디 검사는 사용자 승인 범위에서 최소 자료로 수행해야 한다.
4. 버전 web 자산의 배포 가능 범위·실제 Hosting/Storage header/배치 정책 확정, 전체 검사 통과 후 한정 배포 승인.
5. 기존 외부 provider 삭제는 이 조건 이후. 지금은 운영 기본 공급자 유지.

운영 데이터·구매 내역·쿠폰·장착·염색·보안 규칙에 대한 쓰기, git commit/push, firebase deploy는 하지 않았다.
