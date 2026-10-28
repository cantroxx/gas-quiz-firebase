# 두근두근 마블 — 퀴즈타운 온라인·랭킹 연결

## 구현 상태

사용자 요청: “퀴즈타운에 연결해봐. 온라인 대전에 연결하고 랭킹에도 추가”. 로컬 구현·검증 후 2026-09-15 “배포 진행” 승인으로 Functions·Rules·Hosting 운영 반영 완료. 운영 학생 데이터·Storage 파일을 직접 수정하지 않았으며 commit·push는 실행하지 않았다.

- 학교 → 온라인 대전(`/battle/`)에 **두근두근 마블** 카드 추가. `/town-marble/?mode=online`으로 진입한다.
- 랭킹 광장 → 온라인 대전 → 두근두근 마블 하위 탭 추가. 기존 **특산물 마블**과 별개다.
- 퀴즈타운의 Firebase Auth 세션을 재사용하고 `authLinks`와 `users`의 활성 연결을 서버에서 확인한다. 이름은 서버 프로필에서 가져온다. 학생 문서는 갱신하지 않는다.
- 2~4명 방 코드 참가·전원 준비·방장 시작·재접속·항복·끊긴 대기실 방장 이관. 서버가 모든 주사위와 구매·통행료·파산·시간초과를 처리한다.
- Firebase 운영 경로는 HTTPS callable 명령 + Firestore 방 한 문서 구독이다. 매 프레임의 캐릭터 좌표를 보내지 않고, 같은 주사위·경로 정보를 각 기기의 Three.js 장면에서 재생한다.
- 주기 동기화는 기본 15초, 선택 마감 뒤에는 최대 약 2초 간격으로 시간초과 처리를 요청한다. 참가자 전원이 접속을 끊으면 다음 접속에서 경과 시간을 반영한다. 별도 상시 서버·예약 작업은 추가하지 않았다.

## 데이터와 권한

| 경로 | 내용 | 클라이언트 접근 |
| --- | --- | --- |
| `townMarbleRooms/{6자리코드}` | 상태·참가자·준비·턴·명령 중복 방지 | 활성 연결 계정 중 해당 방 참가자만 단일 문서 읽기; 목록·쓰기 금지 |
| `townMarblePlayers/{memberUserId}` | 계정당 진행 중인 방 | 읽기·쓰기 금지 |
| `townMarbleResults/{code}` | 서버 확정 최종 경기와 집계 여부 | 읽기·쓰기 금지 |
| `townMarbleRanking/town-v1/entries/{memberUserId}` | 이름·누적 점수·경기·단독 우승·공동 우승 | 활성 연결 계정만 읽기; 쓰기 금지 |

랭킹은 3분 이상 진행한 2~4인 온라인 경기만 집계한다. 단독 우승 3점, 공동 우승 1점, 나머지 0점. 동점은 같은 순위다. 연습·localhost WebSocket 개발 경기는 제외한다. 기존 공개 제외 회원 정책을 적용한다. 최종 결과와 참가자 랭킹 갱신은 한 Firestore 트랜잭션에서 정확히 한 번 확정한다. DJ코인·기존 `rankingRecords`, `userRankingSummary`, `quizKingSummary`, `marbleRanking`에는 쓰지 않는다.

대기실은 생성 후 30분, 기본 게임은 최대 6시간 제한이다. 시간 제한 이후 참가·진행은 제한하지만 문서를 삭제하지 않는다. 향후 보존 기간·청소 정책은 별도 승인 범위다.

## 파일과 검증

- 소스: `town-marble-src/src/firebase-online.js`, `functions/town-marble/service.js`, `public/js/tm-ranking-plaza.js`.
- 공유 규칙은 `town-marble-src/shared/` 정본. Vite 빌드 시 `scripts/build-town-marble-domain.js`가 Functions 배포 폴더에 복사하며, 테스트가 양쪽 바이트 일치를 확인한다.
- `functions/index.js`에 `townMarbleAction` 한 함수만 추가. 리전 `asia-northeast3`, 최대 인스턴스 10, 상시 유료 인스턴스 설정 없음.
- `firestore.rules`의 마블 전용 컬렉션 블록만 추가. 복합 인덱스 추가 불필요.
- `npm run check:town-marble-online`: demo Auth/Functions/Firestore로 서버 규칙·직접 쓰기 차단·4인 동시 참가·중복 요청·최종 집계 경쟁·두 브라우저 실제 대전·재접속·오프라인 복구·랭킹 렌더링·XSS·로그아웃 검증.
- `npm --prefix town-marble-src test`: 17개 검사, 100개 완주 시뮬레이션, 32 WebSocket 연결/8방 검사 통과. 학교망 벤치마크가 아니다.
- `npm --prefix town-marble-src run smoke`: 기존 연습·4인 대전·구매·건설·WebGL 대체·태블릿/모바일 흐름 통과.
- `npm --prefix town-marble-src run smoke:layout`: 6개 화면 크기·54개 상태에서 HUD·조작창·도시명 겹침 검사 통과.
- `npm run check`: 퀴즈타운 전체 정적·도메인·애플리케이션·인프라·분수·Rules·공개 화면 검사 통과.
- 실제 온라인 UI 캡처: `/tmp/town-marble-firebase-online.png`. 테스트 데이터는 모두 `demo-dj48-rules`의 합성 계정이다.

## 운영 반영 범위

이 작업 트리에는 구름탑, 하우징 쿠폰, 시즌 랭킹, 워드배틀 등 다른 작업도 있다. 사용자 승인 뒤 운영본을 읽어 마블에 필요한 Functions export·Rules 블록·Hosting 산출물/메뉴/랭킹 어댑터만 반영하는 별도 배포본을 `/tmp/town-marble-production`에 준비했다. 배포 직전과 릴리스 직전에 원격 변경 여부를 검사했다.

필수 운영 적용물은 `townMarbleAction`, 마블 Rules 블록, `public/town-marble/`, `/battle/index.html`의 마블 카드, `/index.html`의 어댑터 포함, `/js/tm-ranking-plaza.js`다. 별도 인덱스·기존 학생 데이터 마이그레이션은 없다.

배포 후 학교 기기에서 이미지 동시 로딩, 프레임 시간, 입력 확정 지연, 끊김·복구를 측정해야 한다. 현재 테스트는 같은 컴퓨터의 에뮬레이터이며 학교 Wi-Fi의 무지연을 보장하지 않는다. Functions 첫 호출 지연도 아직 운영 측정 전이다.

## 운영 배포 결과 — 2026-09-15 13:23 KST

- 게임: <https://dj48-quiztown-firebase.web.app/town-marble/?mode=online>
- 진입: 학교 → 온라인 대전 → 두근두근 마블.
- 랭킹: 랭킹 광장 → 온라인 대전 → 두근두근 마블.
- Functions: `townMarbleAction`만 서울 리전 `asia-northeast3`, Node 22 2세대로 생성 성공. 별도 배포 폴더에 마블 모듈과 해당 export만 담아 `--only functions:townMarbleAction`을 실행했다.
- Rules: 기존 `534b02ef-ef52-42ba-9fe6-22d57724cf38` → `af061ed4-4c36-4db0-9046-662c55811730`. 운영 규칙에 마블 블록만 추가하고 원격 컴파일·릴리스 후 내용 일치를 확인했다. 인덱스 배포 없음.
- Hosting: 운영 버전 `68e8865997a61310` 복제 → `1784c66404e13ca8`. 릴리스 `projects/584571538436/sites/dj48-quiztown-firebase/channels/live/releases/1789446173553000`.
- 교체·추가 11개 경로: 게임 산출물 8개, 마블 랭킹 어댑터, 메인 어댑터 포함 1줄, 온라인 대전 마블 카드. 나머지 기존 349개 파일 해시 보존.
- 2026-09-15 배포 직전 `npm run check` 전체 재통과. 배포 구성·결과 영수증은 `/tmp/town-marble-production/`에 보관했다.
- 배포 후 운영 11개 파일의 바이트 일치, 비인증 callable `401 UNAUTHENTICATED`, 온라인 대전 카드 이동, 운영 Firebase SDK 초기화, 로그인 안내·참가 버튼 차단, 연습 주사위·4개 캐릭터 이동, 모바일 가로 넘침 없음, 메인 랭킹 어댑터 포함, pageerror 없음 확인. 실제 학생 계정의 대전·랭킹 쓰기는 운영에서 시험하지 않았으며 해당 흐름은 앞서 demo 에뮬레이터의 두 계정 검증을 따른다.
- 운영 캡처: `/tmp/town-marble-production-home.png`, `/tmp/town-marble-production-desktop.png`, `/tmp/town-marble-production-mobile.png`.
