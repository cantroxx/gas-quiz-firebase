# 내 방 꾸미기 — 이식 가이드 v2 (운영 코드 대조 완료)

작성일: 2026-06-12
대조 기준: 업로드된 운영본 `public/index.html`, `functions/index.js`, `firestore.rules`
**가정(★) 5개 전부 해소 — room.js v2는 운영 스키마 기준으로 수정 완료**

## 확인된 사실 (수정 반영됨)

| 항목 | 확인 결과 | room.js 반영 |
|---|---|---|
| 코인 필드 | `userEconomy.djCoin` (폴백 `coin`) | `djCoin ?? coin` 폴백 적용 |
| 구매 callable | `purchaseShopItem({ memberUserId, itemId })` | memberUserId 전달 |
| 사용자 ID | `getCurrentDataOwnerId()` → memberUserId (`G학년-C반-N번호`) | init에서 연결 |
| 화면 전환 | 중앙 함수 없음, `show*View()`가 각자 전체 hidden 토글 | MutationObserver로 자동 close |
| shopItems 스키마 | `enabled:true` 필수, `priceType:'djCoin'`, `assetId` | 시딩 스크립트 수정 |
| **userRoomSettings 충돌** | **기존 selected* 필드 운영 중** | **`homeRoom` 맵에 격리 저장** |

## 파일 배치

| 패키지 파일 | 로컬 위치 |
|---|---|
| `public/room.js` | `public/room.js` (신규) |
| `public/room.css` | `public/room.css` (신규) |
| `snippets/room-view.partial.html` | `public/index.html`에 붙여넣기 |
| `tools/seed-room-catalog.js` | `tools/` (신규, 1회 실행) |
| `snippets/firestore-rules-room.txt` | 참고용 — **rules 수정 불필요** |

## index.html 수정 4곳

### (1) room-view 마크업 추가
`home-view` 섹션 닫는 태그 뒤에 `room-view.partial.html` 내용 붙여넣기.
`<head>`에 `<link rel="stylesheet" href="/room.css">`,
`</body>` 직전(기존 스크립트 뒤)에 `<script src="/room.js"></script>` 추가.

### (2) showRoomView 함수 추가 (코드베이스 스타일 그대로)
`showHomeView()` 함수(11667행 부근) 아래에 추가:

```js
function showRoomView() {
  leaveQuizPlaySession();
  closePlaceModal();
  document.getElementById('app-hero').hidden = true;
  document.getElementById('login-view').hidden = true;
  document.getElementById('admin-view').hidden = true;
  document.getElementById('ranking-view').hidden = true;
  document.getElementById('shop-view').hidden = true;
  document.getElementById('event-view').hidden = true;
  document.getElementById('quiz-play-view').hidden = true;
  document.getElementById('quiz-select-view').hidden = true;
  document.getElementById('subject-view').hidden = true;
  document.getElementById('school-view').hidden = true;
  document.getElementById('town-view').hidden = true;
  document.getElementById('home-view').hidden = true;
  document.getElementById('room-view').hidden = false;
  document.getElementById('room-view').scrollIntoView({ behavior: 'smooth', block: 'start' });
  RoomDecor.open();
}
```

### (3) 기존 show*View 함수들에 한 줄씩 추가
`showTownView`, `showHomeView`, `showLoginView`, `showAdminView`,
`showRankingView`, `showShopView`, `showSchoolView` 등 각 함수의
hidden 토글 목록에 추가:

```js
document.getElementById('room-view').hidden = true;
```

room.js의 MutationObserver가 이 hidden 전환을 감지해
리스너 해제 + 즉시 저장(close)을 자동 처리하므로 별도 호출 불필요.

### (4) 집꾸미기 버튼 연결 — **11926행 alert 교체**
현재:
```js
if(event.target.closest('[data-profile-decorate-home]')) {
  window.alert('집꾸미기 화면은 다음 단계에서 연결할 예정입니다.');
  return;
}
```
교체:
```js
if(event.target.closest('[data-profile-decorate-home]')) {
  showRoomView();
  return;
}
```

### RoomDecor 초기화 (앱 부팅부, Firebase 초기화 이후 1회)
```js
RoomDecor.init({
  getUserId: () => getCurrentDataOwnerId(),
  onBack: () => showHomeView(),
});
```
※ getCurrentDataOwnerId가 TEST_SHOP_USER_ID 폴백을 반환하는 환경이라면
  쓰기 권한이 없을 수 있으므로, 운영과 동일하게 로그인 상태에서 검증할 것.

## 시딩 실행

```bash
GOOGLE_APPLICATION_CREDENTIALS=경로/서비스계정.json node tools/seed-room-catalog.js
```
- `assetCatalog` 12건(type: 'roomFurniture'), `shopItems` 4건(피아노/TV/어항/트로피)
- shopItems의 `category: '방 가구'`는 기존 카테고리('배경','아바타','방 장식')와 구분됨.
  기존 상점 화면에도 노출되며 같은 함수로 구매되므로 의도된 동작.
  상점에서 숨기고 싶으면 상점 렌더링 필터에 `category !== '방 가구'` 추가.

## firebase.json

headers에 JS no-cache 추가 (html/css와 동일 정책):
```json
{ "source": "**/*.js", "headers": [{ "key": "Cache-Control", "value": "no-cache, max-age=0" }] }
```

## firestore.rules — 수정 불필요

기존 `canAccessUserScopedData(userId)` 규칙이 그대로 적용됨.
shape 검증을 추가하면 기존 selected* 쓰기가 깨지므로 넣지 말 것.
상세는 `snippets/firestore-rules-room.txt` 참고.

## 검증 체크리스트

1. 로그인 → 내 집 → 집꾸미기 → 방 진입, DJ코인 잔액 표시 확인
2. 가구 배치/이동/삭제 → 다른 화면 이동 → 재진입 시 유지 확인
3. Firestore에서 `userRoomSettings/{memberUserId}.homeRoom` 생성 +
   기존 selected* 필드 보존 확인
4. 잠긴 아이템 구매 → `userInventory` 생성 → 잠금 해제 확인
5. 기존 "내 집" 아이템 선택(배경/아바타) 흐름이 그대로 동작하는지 회귀 확인

## Claude Code 작업 프롬프트

```
public/room.js, public/room.css, tools/seed-room-catalog.js를 추가했어.
INTEGRATION.md의 "index.html 수정 4곳"을 그대로 적용해줘:
1. room-view 마크업/링크/스크립트 추가
2. showRoomView 함수 추가
3. 모든 show*View에 room-view hidden 한 줄 추가
4. 11926행 부근 집꾸미기 alert를 showRoomView()로 교체
5. 부팅부에 RoomDecor.init 연결
배포와 커밋은 하지 마. 끝나면 수정 지점 목록만 보고해줘.
```
