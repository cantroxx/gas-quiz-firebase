# 메이플 코디 상점: Windows → 웹/서버 인계 계약

작성일: 2026-10-28 (한국 시간). 상태: **조사·교체 경계 로컬 준비 완료, Windows 자료 대기, 미배포**.

이 문서를 Windows 분석 담당자에게 전달한다. 아래 JSON은 **기존 퀴즈타운 형식**이며 Windows 추출 데이터의 형식을 미리 정한 것이 아니다. Windows 측은 실제 분석 결과·지원 범위·미확인 사항을 보내고, 수신 후 어댑터 계약을 확정한다.

후속: Windows 묶음 수신·구현 결과는 [2026-10-28 통합 보고서](../operations/COORDI_WINDOWS_INTEGRATION_2026-10-28.md)를 따른다. 아래 자료 대기 상태는 수신 전 조사 기록이다.

## 1. 보존 기준과 조사 범위

- 기존 회원·DJ코인·구매 영수증·구매 쿠폰·보유품·장착·염색을 그대로 유지한다. 렌더러 교체는 상품 재등록이나 프로필 초기화 사유가 아니다.
- 이번 작업은 소스와 공개 정적 파일 조사, 로컬 코드 분리 및 합성 데이터 검사다. 운영 학생 문서·구매 내역·Storage 파일을 열람하거나 수정하지 않았다.
- Firestore 규칙·인덱스·운영 설정·가격·카탈로그·거래 함수는 이번 작업에서 변경하지 않았다. 배포·커밋·푸시하지 않았다.
- 작업 트리에 다른 작업의 미커밋 파일이 다수 있다. 아래 변경 파일만 이번 준비 범위이며, 전체 작업 트리를 운영에 배포하면 안 된다.
- 공개 Hosting의 7개 파일은 **수정 전** 로컬 파일과 SHA-256 일치 확인: `coordi-shop/index.html`, `dressing-room.js`, `town-bridge.js`, `hair-prism.js`, `data/verified-top50-display.json`, `js/town-avatar.js`, `js/features/classroom-portrait.js`. 수정 후에는 의도적으로 로컬이 앞선다.
- Functions 배포 소스는 이번에 다운로드하지 않았다. 서버 설명은 로컬 기준이다. 이전 `HAIR_MIX_DYE_2026-10-18.md`에는 운영/로컬 권한 도우미 차이가 기록되어 있다. 배포 전 현재 운영 소스를 다시 대조해야 한다.

## 2. 현재 진입점·상품·외부 의존성

| 영역 | 현재 정본/동작 |
| --- | --- |
| 상점 | `public/coordi-shop/index.html`, `dressing-room.js`; 부모 퀴즈타운 안의 iframe에서 이용 |
| 인증 연결 | `town-bridge.js`; 부모의 회원 세션과 Firebase Functions 사용. 직접 URL 진입은 로그인 후 상점에서 열라는 안내 |
| 거래 | `functions/index.js`의 `coordiShopAction` → `functions/coordi-shop/commerce.js` |
| 미리보기 | `renderCoordiShopPreview` → `functions/coordi-shop/service.js` → `official-provider.js` → `render.cjs` |
| 광장/홈 | `public/js/town-avatar.js`; status로 저장된 코디를 읽고 렌더. 구매 전 입어보기는 사용하지 않음 |
| 교실 | `functions/classroom/portrait.js`의 savedLookPayload + `public/js/features/classroom-portrait.js`; 렌더 후 사용자가 이미지를 저장 |

`coordiShopAction`과 `renderCoordiShopPreview`는 `asia-northeast3` callable이다. 프리뷰는 현재 maxInstances 2, concurrency 8, timeout 40초, 거래는 maxInstances 5다.

### 상품 데이터

- `functions/coordi-shop/catalog.json`: 판매 가능한 **1,632개 고유 상품**, 가격·부위·허용 성별의 서버 정본. `{[productId]: {id, code, name, category, price, genders}}`.
- `public/coordi-shop/data/verified-top50-display.json`: 실제 표시 목록 `itemsByCategoryGender[category][male|female]`, **2,689행**. 성별에 따라 같은 상품이 반복되며 별도 구매 상품이 아니다.
- 각 표시 행은 `code, name, category, slot, cash, gender, thumbnail` 및 인기·라벨·정렬 메타데이터를 가질 수 있다. 현재 모든 thumbnail은 `/coordi-shop/verified/{gender}-{code}.png` 로컬 경로다. **상품 아이콘과 단일 아이템 착용 썸네일을 혼동하지 말 것**: 현재 목록은 검증한 착용 이미지이며 원본 아이콘이 반드시 있는 것은 아니다.
- `maple-cosmetics-catalog.json`: 기초/병합 목록 8,721행. 판매 허용 목록이 아니다. 현재 source는 `nexon-character-cashitem-equipment-harvest`; GMS 관련 rendererSupport와 과거 출처도 포함한다.
- `maple-featured-hair-catalog.json`: 추천 헤어 98행. `maple-item-effects.json`: 효과 30개, 로컬 이미지와 `width,height,x,y,scale,z,vector,fixed,pos` 기록.
- 표시 목록은 `catalog-filter.js`의 제외·엄격한 cash 판정·정렬 정책을 다시 적용한다. `verified-top50.json`은 조사 원본, `scripts/build-coordi-display-catalog.js`가 hash/imageBytes만 제외하여 표시 파일을 만든다. 원본 및 `.partial` 보존.
- 현재 검색은 현재 부위·성별 표시 목록에서 이름/아이템 번호를 검색한다. 보유 필터·부위 선택·선택 착용 목록·프리즘 창이 이미 있다.

### 렌더 의존성과 제약

1. 메애기 `https://meaegi.com/dressing-room`의 Next Server Action POST → 대문자 코디 해시 추출. action ID와 router-state가 `render.cjs`에 고정되어 있어 upstream 변경에 영향받는다.
2. 넥슨 `https://avatar.maplestory.nexon.com/Character/180/{hash}.png` 조회 → 서버가 PNG data URL로 반환. 두 외부 요청은 각각 12초 timeout; 이미지 500,000 bytes 상한.
3. `hair-prism.js`는 구형 헤어 HSL만 색상 변형 3장의 차이 마스크로 브라우저에서 처리한다. 새 native mix `{baseColor,mixColor,mixRate}`는 그대로 upstream으로 전달한다.
4. `dressing-room.js`에 `maplestory.io` GMS 255 캐릭터 URL 생성 코드가 남아 있지만 현재 renderCharacter에서 호출하지 않는다. KMS 신규 아이템 누락 때문에 자동 대체 경로는 사용하지 않는다. 삭제하지 않았다.
5. `/api/maple/official-look`, `/api/maple/official-image`와 외부 hash 가져오기 잔존 코드가 있으나 현재 `firebase.json`에는 해당 rewrite가 없다. 현재 일반 미리보기는 callable의 data URL을 사용한다. 이 잔존 경로를 새 의존성으로 삼지 않는다.
6. 상점은 `maple-item-effects.json`의 효과 이미지를 DOM overlay로 추가한다. 광장/교실은 PNG만 사용한다. **동일 PNG라도 효과·크롭·배율 때문에 화면 결과는 아직 완전히 같지 않다.** 새 합성기에서 효과 포함 여부를 정하고 중복 overlay를 방지해야 한다.

## 3. 보존해야 하는 저장 형식

아래는 실사용자 데이터가 아닌 설명용 예다. 존재하지 않는 상품을 지급하라는 뜻이 아니다.

```json
{
  "owned": ["hair-66940"],
  "look": {"gender": "male", "equipped": {"hair": "hair-66940"}},
  "prisms": {
    "hair-66940": {"baseColor": 0, "mixColor": 7, "mixRate": 63},
    "skin-12000": {"palette": 0, "tone": 0, "chroma": 0, "brightness": -10, "blackInclusive": 0}
  },
  "purchaseCoupons": 3
}
```

| 위치 | 필드/의미 |
| --- | --- |
| `authLinks/{authUid}` | `memberUserId`: 거래 대상은 이 연결로 결정. 클라이언트가 보낸 회원 ID를 거래 대상으로 신뢰하지 않음 |
| `users/{memberUserId}` | 활성 회원 여부 및 authUid 일치 검증 |
| `userEconomy/{memberUserId}` | `djCoin` 우선, 없으면 legacy `coin` 조회. 유료 구매는 djCoin 차감, totalSpent increment, updatedAt 갱신 |
| `coordiProfiles/{memberUserId}` | `owned: string[]`, `look: {gender, equipped: {[category]: productId}}`, `prisms: {[productId]: dye}`, purchaseCoupons, memberUserId, updatedAt |
| 같은 프로필의 legacy 필드 | `starterClaims`, `starterDyes`, `purchaseCouponGrant` 등 기존 필드를 보존. 현재 status의 starterCoupons.items는 빈 배열; dyeItems는 legacy claims에서 계산. 구매 쿠폰은 purchaseCoupons의 저장된 0 이상 정수만 인정하며 조회로 자동 충전하지 않음 |
| `coordiReceipts/{sha256(memberUserId + '|' + requestId)}` | memberUserId, action, fingerprint=sha256(JSON.stringify(payload)), result, createdAt. purchase/equip/dye 모두 영수증 생성. 재요청은 저장된 result에 duplicate:true 반환 |
| 브라우저 localStorage | `dj48.coordi.preview.{memberUserId}`; 입어보기 UI 상태. 소유권 증명이 아님. 접속 시 서버 look/prisms를 다시 적용 |
| 코디 파일 내보내기 | `{version:1, gender, equipped, background, prisms}`. 가져오기는 미리보기만 변경하고 구매/장착 저장은 별도 요청 |
| 교실 학생 프로필 | `classrooms/{classId}/studentProfiles/{memberUserId}.portrait`의 source/photo/avatar; avatar는 `{url,storagePath}`로 저장된 스냅샷. 기존 photo 및 전역 프로필 보존 |
| 교실 이미지 Storage | `profileImages/{authUid}/{memberUserId}_classroom_{avatar|photo}_{...}.{png|jpg|webp}`; 현재 브라우저 업로드 후 classroomPortraitAction이 경로·메타데이터·2MB 상한 검증 |

염색은 다음 두 헤어 형식을 모두 읽어야 한다. 새 렌더러가 구형 값을 임의로 새 값으로 덮어쓰면 안 된다.

- 의상/피부: `palette` 0..6, `tone` 0..359, `chroma/brightness` -99..99, `blackInclusive` 0 또는 1. 모두 정수. 피부의 blackInclusive는 서버에서 0으로 고정; 렌더 변환에서는 제외한다.
- 구형 헤어: 위 HSL 필드 + `hairColor` 0..7. 렌더 아이템 번호를 `floor(code/10)*10 + hairColor`로 바꾸며 itemPrism에서 hairColor를 제거한다. **저장 상품 ID는 바꾸지 않는다.**
- 새 헤어: `baseColor, mixColor` 0..7 및 `mixRate` 0..99 정수. 검정/빨강/주황/노랑/초록/파랑/보라/갈색 순서. base 비율은 100-mixRate. 원본 코드와 mix 값을 함께 전달한다.
- 얼굴은 현재 염색 저장 불가. 기본 `skin-12000`은 소유하지 않아도 염색할 수 있는 기존 예외다. 보유 의상 염색·복원은 무료이며 쿠폰도 쓰지 않는다.

## 4. 기존 API 입출력과 검증

### 거래 API: `coordiShopAction`

```js
// status 입력
{action: 'status'}
// status 출력 (success 필드에 의존하지 말 것)
{balance, profile, prices: catalog, version, purchaseCoupons, starterCoupons}

// 변경 요청은 status에서 받은 version과 UUID requestId를 사용
{action:'purchase', paymentMethod:'coin', items:['hair-66940'], version, requestId}
{action:'purchase', paymentMethod:'coupon', items:['hair-66940'], version, requestId}
{action:'equip', gender:'male', equipped:{hair:'hair-66940'}, version, requestId}
{action:'dye', itemId:'hair-66940', value:{baseColor:0,mixColor:7,mixRate:63}, version, requestId}
// 변경 성공 출력
{success:true, duplicate:false, cost, couponsUsed, purchaseCoupons, balance, profile, version, starterCoupons}
```

- 서버 트랜잭션 내부에서 연결·회원 활성·상점 열림을 확인한다. 닫힌 상점은 학생의 status/구매/장착/염색/렌더를 막으며 admin 예외가 있다.
- 거래 version은 `sha256('hair-mix-v5|' + JSON.stringify(catalog)).slice(0,16)`; 렌더 자산 버전과 다른 개념이다. 렌더러만 교체할 때 상거래 version을 바꿀 이유가 없다.
- 가격은 서버 카탈로그에서 합산; 클라이언트가 보내는 가격으로 결제하지 않는다. 상품은 1..15개, 중복 ID 불가. 이미 보유한 상품은 다시 차감하지 않는다. 상품당 구매 쿠폰 1장, coin/coupon 중 명시적 선택, 부족하면 전체 실패.
- 장착은 보유·서버 부위·허용 성별 일치 검사. 한벌옷과 상의/하의 동시 장착 거부. 구매 시점에는 성별 제한을 검사하지 않고 장착 시 검사한다.
- 영수증·프로필·지갑은 한 트랜잭션. 같은 requestId/같은 요청은 중복 차감하지 않으며 다른 내용은 거부. 브리지도 미완료 동일 요청에 같은 requestId를 재사용한다.
- 렌더는 무료 미보유 입어보기가 의도된 기능이므로 상품 소유권을 강제하지 않는다. **렌더 성공이 구매·장착 권한을 부여하지 않는다.**
- Firestore의 coordiProfiles/coordiReceipts 직접 클라이언트 접근 허용 match는 없으며 최종 deny 규칙 대상이다. Admin SDK callable이 쓰기 경로다.

### 미리보기 API: `renderCoordiShopPreview`

```json
{
  "look": {
    "gender": 0, "earType": 0, "weaponMotion": 0,
    "variation": 0, "variationType": 0,
    "weaponBaseEffect": 1, "weaponJumpEffect": 1, "weaponSpecialEffect": 1,
    "capeEffect": 1, "hideWeaponOnSkill": 1, "capEffect": 1, "floatEffect": 1,
    "width": 220, "height": 180, "x": 110, "y": 140,
    "itemCode": {"skin": 12000, "face": 20000, "hair": 66940},
    "itemPrism": {"hair": {"baseColor": 0, "mixColor": 7, "mixRate": 63}}
  }
}
```

현재 응답: `{success:true, hash:"외부 코디 해시", imageUrl:"data:image/png;base64,..."}`. 구형 헤어 브라우저 합성 후에는 renderer:`quiztown-hair-prism`이 추가될 수 있다. 해시는 아이템 번호나 상품 ID가 아니며, 구형 HSL 후처리된 PNG 전체의 식별자도 아니다.

현재 서버 normalize는 skin/face/hair 필수, 아이템 번호는 양의 정수 ≤99,999,999, 허용 slot만 유지한다. gender 0/1, earType 0..3, weaponMotion 0..4, variation/variationType 0..20, effect flag 0/1로 정규화한다. **width/height/x/y는 현재 서버 normalize 결과에서 제외되어 외부 렌더 크기를 바꾸지 않는다.** 현재 UI의 stand/표정과 Windows 애니메이션 지원을 같은 계약으로 가정하면 안 된다.

itemPrism은 현재 미리보기에서 객체 전달·크기 제한만 적용하고, 저장 시에는 commerce가 별도로 범위를 검증한다. 자체 합성기가 파일 경로나 리소스를 선택하게 될 때는 adapter에서 slot/code/asset allowlist와 계산량 제한을 추가해야 한다. 이번 단계에서 저장 검증 정책은 바꾸지 않았다.

## 5. Windows에 요구하는 ID 대응

| 기존 상품 category | 렌더 itemCode/itemPrism slot | 주의 |
| --- | --- | --- |
| skin | skin | 기본 12000, 몸통/머리 sprite 번호와 동일하다고 가정 금지 |
| face | face | 남 기본 20000, 여 기본 21000; 얼굴 색/표정 규칙 별도 |
| hair | hair | 남 기본 30000, 여 기본 31000; 8색 코드군·믹스염색 |
| hat | cap | 모자 유형별 헤어 가림 |
| faceAccessory | faceDeco | 얼굴 장식 |
| eyeAccessory | eyeDeco | 눈 장식 |
| earring | earring | 귀 유형·가림 |
| overall | dress | top/bottom보다 우선 |
| top | dress | overall과 같은 렌더 slot이므로 product category 함께 보존 |
| bottom | pants | overall이면 제외 |
| shoes | shoes | 신발 |
| glove | glove | 손·팔 앞뒤 레이어 |
| cape | cape | effect와 sprite 구분 |
| weapon | weapon | 실제 무기 종류·모션·캐시 무기 기준 |

서버 normalize에는 `subWeapon`도 있지만 현 판매 카탈로그에는 shield가 없고 상점 상태 정규화도 shield를 제거한다. Windows에 방패가 있어도 임의 판매/보유 변환하지 않는다. 투명 탭은 별도 category가 아니라 실제 부위의 투명 아이템 8종을 모은 화면이다. ‘아이템 없음’과 ‘투명 아이템 장착’은 구분한다.

Windows 측 대응표는 **현재 catalog.json의 1,632개 productId 전부**를 기준으로 만들어 달라. 최소 정보:

- 기존 productId, category, Maple code를 정확히 유지하고 Windows asset ID/경로·게임 region/version·지원 성별과 연결.
- `supported / missing / unsupported / ambiguous`를 명시하고 이유 기록. 이름 유사성만으로 자동 매칭하지 않기.
- 여러 상품이 같은 리소스를 쓰거나 한 상품이 색/프레임별 여러 리소스를 쓰는 관계를 표현하기.
- 머리/피부/몸통 코드 변환, 헤어 원형과 8색 번호, 메이플 파일의 leading zero 이름을 정수 code와 연결하는 규칙 제공.
- 현재 카탈로그 밖 신규 아이템은 별도 목록으로 제안. 기존 가격/ID/구매 내역을 변경하거나 누락품을 삭제하지 않기.
- 기본 남녀 코디와 기본 피부도 실제 리소스로 해석 가능해야 함. 지원되지 않는 기존 보유품은 명시적으로 표시하고 기존 공급자로 확인할 수 있어야 함.

## 6. Windows에서 보내 줄 자료

파일 이름·JSON 구조를 지금 강제하지 않는다. 실제 추출 구조를 보여 주는 작은 샘플과 설명을 먼저 받고 importer를 작성한다.

| 자료 | 필요한 내용 |
| --- | --- |
| manifest/README | 추출 도구와 버전, 게임 region/build/version, 생성일, 전체 파일 수·크기·SHA-256, 인코딩·경로 대소문자, 재현 명령, 빠진 항목 |
| 아이템 메타데이터/대응표 | 위 1,632개 기존 ID 매핑, 이름·부위·성별·투명 여부, 아이콘과 착용 썸네일 구분, 검색 별칭. 가격은 웹 서버 정본 사용 |
| 이미지 자산 | 웹에서 읽을 수 있는 무손실 투명 이미지와 실제 크기. atlas면 rect/회전/trim/original-size/anchor 포함. 원본 WZ 등을 브라우저에 그대로 배포하는 것으로 가정하지 않음 |
| 합성 규칙 | zmap/smap 또는 동등 레이어 순서, origin/map/navel/neck/brow/hand 등 anchor, 프레임 정렬, UOL/링크 해석, 몸통·머리·팔·손 분리, 모자별 hair 가림, 무기 앞뒤, 전체복 상하의 배제, 투명품 처리 |
| 동작/표정/효과 | 지원 action/emotion/frame/delay/flip, 귀 타입, 무기 모션, effect의 위치·별도 레이어·프레임. 정지 화면만 지원해도 그 범위를 정확히 표시 |
| 염색 규칙 | 피부/의상 palette·tone·chroma·brightness·blackInclusive 의미와 연산 순서, 색 공간·alpha 처리·반올림, 헤어 8색과 native mix 수식/마스크. 위젯 방식과 기존 메애기 방식의 차이도 기록 |
| 참고 소스 | 실제 위젯 검색/부위 선택/큰 미리보기/착용 목록/비교 UI의 파일과 함수, renderer의 핵심 소스·버전/커밋·필요 의존성·실행법. 참고만 하는 코드와 재사용 가능한 코드 구분 |
| 출처/배포 범위 | 이미지·도구·참고 코드 각각의 출처·라이선스/공개 배포 가능 범위. 재배포 불명 항목은 별도 표시, 비공개 키/토큰/계정 자료 제외 |
| 비교 자료 | 각 case의 입력 코디/ID·염색·action/frame/flags와 raw 투명 PNG, width/height/anchor 및 기대 결과 설명. 화면 캡처는 보조 자료, 픽셀 비교 정본은 확대·압축 전 PNG |

비교 case에는 최소한 남녀 기본, 헤어만, 모자 가림 유형별, 전체복 vs 상하의, 무기/장갑/망토 겹침, 투명 부위, 액세서리, 피부 염색, 의상 palette·검정 포함, 구형 HSL, native mix 0/1/50/63/99%, 같은 색 혼합, 대형 효과/화면 밖 잘림을 포함한다. 가능하면 동일 입력을 위젯·현 외부 렌더 각각으로 제공하고 기대 결과의 기준을 명시한다. 현재 번호 66940, 기본 코드들, 투명 무기 1703129, 신규 KMS 헤어 67680 등 실제 카탈로그 샘플을 포함하면 호환성 확인에 도움이 된다.

## 7. 이번에 준비한 교체 경계와 공통 캐시

구현된 경로:

```text
상점 UI → data-provider.load / thumbnail → 기존 공개 JSON·이미지
상점·광장·교실 → preview-renderer.createRenderer
             → 기존 hair-prism 호환 처리 → 인증된 renderCoordiShopPreview
             → authorize → normalize → 공통 cache/pending
             → 서버가 선택한 provider.render → PNG
구매·장착·염색 → 기존 coordiShopAction (렌더 경로와 분리)
```

- `public/coordi-shop/data-provider.js`: 기존 4개 JSON과 thumbnail 선택을 분리. UI의 표시 필터/가격 검증을 공급자 안에 숨기지 않는다.
- `public/coordi-shop/preview-renderer.js`: 세 화면이 쓰는 단일 미리보기 경계. authenticated transport 주입, 요청 전/후 및 HSL 캐시 후 세션 검사. native mix·구형 HSL 유지.
- `functions/coordi-shop/official-provider.js`: 기존 외부 호출·PNG 조회만 분리. 기본 공급자 유지. 서비스에 `provider:{id,version,normalize,render}`를 서버에서 주입할 수 있다. 브라우저 payload로 공급자/외부 URL을 지정할 수 없다.
- 자체 공급자도 기존 look 입력을 어댑터에서 해석하고 `{success:true,imageUrl}`로 반환할 수 있다. hash는 선택 필드이며 상점도 hash 없는 PNG를 받아들인다. 가짜 넥슨 해시를 만들 필요가 없다.
- 서버 cache key는 stable serialization of `[provider.id, provider.version, normalizedLook]`. 최대 100개 완료 결과, 실행 중 동일 요청 병합, 실패는 보관하지 않음. **cache/pending 조회보다 매 요청 인증·회원·상점 검사가 먼저**다. 인스턴스 로컬이며 재시작/여러 인스턴스 사이에는 공유하지 않는다.
- 현재 브라우저: HSL 마스크는 renderer 인스턴스당 최대 24개, 광장은 회원 identity/generation 및 look signature 기반 최근 이미지 보관. 공통 모듈에 별도 영구 이미지 캐시를 추가하지 않았다. 사용자 자료가 localStorage/CDN 공유 캐시로 확산되지 않게 한다.
- 자체 공급자 `version`에는 자산 묶음·레이어 규칙·염색 엔진 버전을 포함한다. 향후 프레임/출력 크기/anchor/효과 설정이 결과에 영향을 주면 normalized request와 cache key에도 포함한다. 현재 버리던 치수를 무심코 새 렌더에 적용하지 말고 비교 기준으로 확정한다.

### 수신 후 완성할 동일 결과 경로

1. 저장 profile→render look 변환은 현재 광장 JS와 교실 서버에 같은 구현이 중복되고 parity 테스트가 있다. Windows 자료 수신 후 공용 순수 변환 코드를 한 정본으로 빌드/배포할 구조로 합친다. 소유권 검증은 서버에 남긴다.
2. 자체 compositor는 웹/서버에서 동일 코드·자산 버전·입력·프레임으로 같은 RGBA 결과를 생성하도록 구현한다. 서버 전용 파일 경로나 학생 ID가 이미지 cache key에 섞이지 않도록 한다.
3. 효과 포함 완료 PNG를 공통 결과로 정하고 UI의 crop/scale은 표시 단계로 분리한다. 상점 추가 effect overlay의 제거는 비교 검증 후에만 한다.
4. 교실은 현재 ‘불러오기→확인→저장’ 스냅샷 방식이다. 이번 공통 렌더 연결은 자동 동기화가 아니다. 향후 저장 코디와 자동 연동할 때도 기존 portrait.avatar URL·photo를 보존하고, 새 render key 참조/재생성 경로를 별도 승인·검증한다. 기존 이미지를 일괄 덮어쓰지 않는다.
5. 새 렌더가 legacy HSL까지 자체 처리하면 브라우저 HSL 후처리를 함께 비활성화해야 이중 염색을 막는다. 공급자 전환 시 세 화면을 함께 검증한다. 현재는 기존 처리를 유지한다.

## 8. 수신 후 UI 통합·검증·배포 순서

- 먼저 manifest/ID 매핑 누락·중복·경로 무결성을 확인하고 작은 대표 corpus로 importer와 compositor를 구현한다. 누락 레이어를 임의 대체해서 성공 처리하지 않는다.
- raw PNG의 canvas/anchor/alpha/겹침과 RGBA diff를 비교한다. 동일 엔진이면 byte/pixel 일치를 기대하되 다른 엔진 간 허용 오차는 비교 결과를 보고 합의한다. 임의 허용치를 지금 정하지 않는다.
- 검색·부위 선택은 기존 상품 ID를 유지하고 위젯 메타데이터를 보강한다. 큰 미리보기, 착용 목록, A/B 비교는 별도 draft 두 개를 사용한다. 둘 다 무료이며 구매 요청은 사용자가 선택한 draft의 미보유 상품만, 장착 저장은 서버 보유품만 통과한다.
- 비교/검색/렌더 실패 시 결제·장착을 자동 호출하지 않는다. 보유·쿠폰 결제·무료 드레스룸·염색 취소·복원·구형 저장·재로그인·모바일·교실 사진 전환을 함께 회귀 검사한다.
- 통합 검증 후 사용자 승인으로 외부 경로 제거 및 한정 운영 배포를 진행한다. 현재 운영 함수 소스와 Hosting manifest를 다시 읽어 관련 변경만 반영하고 기존 파일/설정/거래 데이터를 보존한다. 전체 작업 트리 배포 금지.

## 9. 로컬 검증 및 다음 담당자 재개

검증 결과는 아래에 기록한다. 합성 테스트는 렌더러 분리의 호환성을 확인하는 것이며 아직 Windows 합성 품질을 입증하지 않는다.

- `node tests/coordi-shop/provider-boundary.test.js`: 권한 검사 후 캐시/진행 요청 재사용, key 순서 독립성, 공급자 버전 변경, 실패 재시도, 외부 hash 비의존, native mix 보존, 계정 변경 응답 차단 통과.
- 기존 preview/hair-prism/catalog/display-catalog 및 classroom portrait 테스트 통과. 서버 상품 1,632개·표시 2,689행·가격 정본 유지.
- 로컬 코디 commerce/loading 브라우저 검사 통과: 남녀 부위 순서, 실패 재시도, 구매·장착, native/legacy 염색, 무료 드레스룸 무거래, 모바일, 병렬 조회 완료 게이트.
- 광장 브라우저 검사 통과: 교실 서버와 look 일치, 보유품만 렌더, 계정 교체·지연 응답·로그아웃·재시도·저장 중 갱신.
- hash 없는 PNG를 반환하도록 `COORDI_HASHLESS_PREVIEW=1 node scripts/smoke/coordi-commerce-browser.js` 실행: 상점 전체 흐름 통과. 기존 hash 포함 응답 검사도 통과.
- `firebase emulators:exec --project demo-dj48-rules --only firestore "node tests/coordi-shop/access-emulator.test.js && node tests/coordi-shop/starter-emulator.test.js"`: exit 0. 로컬 callable 접근, 닫힘/관리자 예외, 캐시 전 권한 검사, 무료 미리보기 무쓰기, 동시 중복 구매, 제외 상품 거부, 쿠폰 부족/재충전 없음, native/legacy 염색 보존 검증. 운영 배포 후보를 새로 내려받아 검증한 것은 아님.
- `npm run check`: **exit 1, 전체 통과 아님**. 정적 검사(534 JS), 도메인/애플리케이션/인프라/성장 등 선행 검사, Firestore/Storage 규칙, 공개 셸, 교실 이미지 UI·로딩·일기 검사는 통과. `scripts/smoke/classroom-board-browser.js:19`의 학생 카드 대기에서 30초 timeout. 뒤의 교실 후속/교과 브라우저 검사는 이 실행에서 수행되지 않음.
- 전자칠판 단독 재실행도 동일 실패. 이 테스트는 이번 변경 파일을 로드하지 않고 board-domain/board만 로드한다. `tests/classroom/board-memory.js`의 서버 now는 2026-10-21 고정, 보드 UI는 실제 현재 날짜 2026-10-28을 전송한다. 동일 합성 서비스에 2026-10-28 list를 보내 `invalid-argument: 오늘까지의 날짜를 선택해 주세요.` 재현. 이번 범위 밖이므로 미수정; 배포 전 전체 검사 통과 조건은 여전히 남음.
- 전체 `git diff --check`에는 작업 시작 전부터 있던 `public/index.html`, `public/js/features/admin-render.js` 및 해당 생성 번들의 trailing whitespace가 나타남. 이번 범위 밖이라 고치지 않음.

로그(이 Mac의 임시 자료): `/tmp/coordi-prep-full-check-20261028.log`, `/tmp/coordi-prep-commerce-20261028.log`, `/tmp/coordi-prep-hashless-20261028.log`, `/tmp/coordi-prep-board-recheck-20261028.log`.

이번 준비 변경 파일:

- 신규: `functions/coordi-shop/official-provider.js`, `public/coordi-shop/data-provider.js`, `public/coordi-shop/preview-renderer.js`, `tests/coordi-shop/provider-boundary.test.js`, 이 문서.
- 수정: `functions/coordi-shop/service.js`; `public/coordi-shop/index.html`, `town-bridge.js`, `dressing-room.js`; `public/js/town-avatar.js`, `public/js/features/classroom-portrait.js`.
- 검사/안내: package.json의 test:growth에 경계 검사 추가; `scripts/smoke/town-avatar-browser.js`의 모듈 로드; `scripts/smoke/coordi-commerce-browser.js`의 hash 없는 합성 응답 선택; `docs/README.md` 링크. `public/js/app.bundle.js`는 기존 빌더로 재생성.

운영 반영 시 신규 의존 JS와 변경 호출자를 함께 포함하고, 루트 town-avatar/앱 번들의 기존 캐시 버전도 실제 릴리스 기준으로 갱신해야 한다. 이번에는 공유 app shell인 public/index.html을 수정하지 않았다.

재개 시 이 문서와 `COORDI_DRESSROOM_DEPLOY_2026-09-29.md`, `HAIR_MIX_DYE_2026-10-18.md`를 함께 확인한다. Windows에서 자료가 도착하기 전에는 추측한 레이어 규칙·파일 포맷·새 상품 목록을 구현하지 않는다.
