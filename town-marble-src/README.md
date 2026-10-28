# DJ48 두근두근 마블

생성한 하늘 배경과 실제 3D 동물 캐릭터가 있는 2~4인 턴제 보드게임의 로컬 개발 버전입니다. 기존 특산물 마블과 다른 게임입니다.

## 실행

Node 22.12 이상이 필요합니다. 현재 검증 환경은 Node 26 + macOS Chrome입니다.

```sh
cd town-marble-src
npm ci
npm run build
npm run server
```

`http://127.0.0.1:5188/town-marble/`에서 봇 3명과 연습하거나, 다른 브라우저 창에서 같은 주소와 방 코드로 참가합니다. 포트는 `PORT`, 바인드 주소는 `MARBLE_HOST` 환경변수로 정할 수 있습니다. 기본값은 이 컴퓨터에서만 접속 가능한 `127.0.0.1`입니다.

프런트엔드 개발 시 별도 터미널에서 `npm run dev`를 실행합니다. `http://127.0.0.1:5178/town-marble/`의 Vite 서버가 5188의 대전 서버로 WebSocket을 프록시합니다.

## 검사

```sh
npm test
npm run smoke
npm run smoke:layout
npm run format:check
node tests/visual-capture.js
```

- `npm test`: 순수 규칙·방 권한·실제 WebSocket·32명/8개 방 테스트. 임시 loopback 서버 포트가 필요합니다.
- `npm run smoke`: 빌드 후 실행합니다. 저장소 루트의 `playwright-core`와 macOS Chrome을 이용합니다. `SMOKE_CHROME_PATH`로 Chrome 경로를 지정할 수 있습니다.
- `npm run smoke:layout`: 6개 화면 크기에서 시작·이동·건설·회전·확대의 UI 영역과 32개 도시명 표면의 투영 다각형 겹침, 도시 안내와 직접 도시 선택을 검사합니다. 캡처 기본 경로는 `/tmp/town-marble-layout/`입니다.
- `node tests/visual-capture.js`: 고정 주사위를 사용하는 격리된 테스트 서버에서 실제 화면의 주사위·이동·호텔 건설·황금열쇠 영상을 `/tmp/town-marble-v2/`에 저장합니다. 게임 본체의 난수에는 영향을 주지 않습니다. `MARBLE_CAPTURE`로 출력 경로를 지정합니다. Playwright FFmpeg가 필요합니다.
- 스크린샷은 기본 `/tmp/town-marble-smoke`, `MARBLE_SCREENSHOTS`로 출력 위치를 바꿀 수 있습니다.
- 저장소 루트의 `npm run check:town-marble`로 빌드·게임 검사·브라우저 검사를 한 번에 실행합니다. 기존 서비스 전체 검사는 별도로 `npm run check`입니다.
- `npm run check:town-marble-online`은 저장소 루트에서 실행합니다. demo Firebase Auth·Functions·Firestore 에뮬레이터로 계정 연동, 접근 규칙, 서버 진행·랭킹, 두 브라우저 대전을 검증합니다. 운영 데이터는 사용하지 않습니다.

## 구조

| 위치 | 역할 |
| --- | --- |
| `shared/data.js` | 32칸 보드, 가격, 카드, 캐릭터, 명시적인 규칙 버전 |
| `shared/game.js` | 통신·화면에서 독립된 규칙, 부채·파산, 자동 턴 처리 |
| `server/rooms.js` | 방 코드, 참가 토큰, 준비, 권한, 요청 중복 방지 |
| `server/index.js` | WebSocket 대전 서버와 해당 게임 빌드만 제공하는 정적 서버 |
| `src/online.js` | 브라우저 연결·재접속·최신 상태 수신 |
| `src/firebase-online.js` | 퀴즈타운 인증·HTTPS callable·Firestore 실시간 구독·계정별 이어하기 |
| `../functions/town-marble/service.js` | 영속 온라인 방·서버 주사위·턴 처리·최종 랭킹 트랜잭션 |
| `../scripts/build-town-marble-domain.js` | 게임 규칙 엔진을 Functions 배포 폴더에 동기화; 테스트에서 바이트 일치 확인 |
| `src/Stage.jsx` | 3D 장면과 React HUD 연결, 이름표·카메라 조작·이벤트 연출 |
| `src/scene/world.js` | Three.js 렌더러, 주사위·경로 이동·카메라 추적·건설·파티클·품질 조절 |
| `src/scene/nameplates.js` | 보드 바깥쪽 전용 띠에 인쇄한 도시명 텍스처와 입체 표면 |
| `src/scene/models.js` | 팔·다리·귀가 분리된 동물 4종, 도시·성·연못·풍차 등 실제 3D 모델 |
| `src/cinematic.css` | 화면을 채우는 게임판과 플레이어 HUD, 하단 조작창, 대형 이벤트 카드 |
| `src/Board.jsx` | WebGL 불가/컨텍스트 손실 시 사용하는 2.5D 대체 화면 |
| `src/Effects.jsx` | 잔액 변화·통행료 동전 연출 |
| `public/art/` | 이미지 생성 원본 자산. 배경 2장 + 캐릭터·건물 아틀라스 각 1장. 3D 화면의 초기 프리로드는 새 하늘과 초상화만 사용 |
| `../public/town-marble/` | Vite 빌드 산출물. 직접 수정하지 않습니다. |

## 현재 서비스 경계

- 2026-09-17 운영 반영: 게임 상단의 **1× / 1.5× / 2×** 버튼으로 연출 배속을 순환 선택합니다. 연습에서는 봇 대기도 빨라집니다. 온라인에서는 각자 보는 연출만 바뀌고 45초 선택 시간·20/30분 경기 시간·랭킹 판정은 같습니다. 설정은 이 기기에 저장합니다. 사용자 승인 후 운영 Hosting에 배포했습니다.

- 퀴즈타운 메뉴·랭킹과 Firebase 온라인 경로를 구현했으며 **2026-09-15 운영 배포를 완료했습니다.** Hosting, `townMarbleAction` 함수, 마블 전용 Rules를 적용했습니다. 운영 주소는 <https://dj48-quiztown-firebase.web.app/town-marble/?mode=online>입니다.
- localhost 기본 모드는 기존 메모리 WebSocket 개발 서버입니다. 운영 호스트는 Firebase를 자동 선택하고 `?emulator=1`은 localhost에서만 demo 에뮬레이터를 사용합니다.
- Firebase 방은 Firestore에 영속 저장하며, 게임 진행과 최종 랭킹은 서버 트랜잭션으로 처리합니다. 같은 계정의 복수 방 참가, 주사위 조작, 직접 점수 쓰기, 결과 중복 집계를 차단합니다.
- 한 학생의 브라우저가 서버가 되는 구조가 아닙니다. 참가자가 한 명이라도 연결되어 있으면 서버 시간초과 처리가 이어집니다. 모두 닫은 경우 다음 접속 때 만료 시간을 적용합니다. 대기실은 연결된 친구에게 방장 권한을 넘깁니다.
- Firebase 대기실은 생성 후 30분, 게임은 최대 6시간입니다. 종료 문서를 자동 삭제하지 않으며 만료는 참가·진행 제한입니다.
- 온라인은 45초 선택 시간, 연습은 일반 턴 제한 없음. 20/30분 시간제 모드의 전체 종료 시각은 둘 다 적용합니다.
- 입체 화면은 GPU로 렌더링합니다. 정적 모델과 재질을 공유/병합하고 DPR을 최대 1.5로 제한합니다. 평균 프레임 시간이 32ms를 넘으면 그림자·파티클·해상도를 낮추고 30fps 모드로 전환합니다. 수동 효과 조절과 모션 감소도 있습니다. 실제 학교 기기의 무지연을 보장하는 수치는 아닙니다.
- 퀴즈타운 활성 연결 계정만 온라인에 참가할 수 있습니다. 학생 프로필은 읽기만 하고 DJ코인·기존 퀴즈 랭킹은 갱신하지 않습니다. 마블 전용 방·참가 상태·최종 결과·랭킹 컬렉션을 사용합니다.
- 온라인 랭킹은 3분 이상 경기의 단독 우승 3점·공동 우승 1점입니다. 연습과 localhost 개발 대전은 제외됩니다. 퀴즈타운 랭킹 광장의 온라인 대전 → 두근두근 마블에서 확인합니다.
- 운영 대전은 HTTPS 기반이므로 기기 간 직접 통신과 학교 내부 서버가 필요 없습니다. 실제 학교 Wi-Fi에서의 지연·기기 성능과 Functions 첫 호출 지연은 배포 후 측정해야 합니다.

전체 구현 범위와 후속 운영 조건은 `../docs/product/TOWN_MARBLE_2026-09-14.md`, 이미지 생성 프롬프트는 `../docs/product/town-marble-art/PROMPTS_2026-09-14.json`에 기록합니다.
