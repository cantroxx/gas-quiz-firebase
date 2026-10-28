# 과일종 온라인 대전·학생 랭킹 운영 배포

날짜: 2026-09-29

사용자 요청: “랭킹 저장 및 방 만들어서 온라인 대전도 생성되어야하고, 실제 학생 랭킹 저장까지 완성해서 온라인 배포본 생성”. 이 요청에 따라 과일종 서버 기능과 운영 공개를 진행했다. 기존 로컬 단계 문서 `FRUIT_BELL_LOCAL_2026-09-29.md`의 운영 보류 상태는 이 문서로 대체한다.

## 운영 주소와 동작

- 게임: https://dj48-quiztown-firebase.web.app/fruit-bell/
- 퀴즈타운 랭킹 연결: https://dj48-quiztown-firebase.web.app/?fruitBellRanking=1
- 학교 → 게임 아지트와 `/battle/`에 진입 카드가 있다.
- Firebase 로그인 후 서버가 `authLinks/{uid}`와 `users/{memberUserId}`를 교차 확인한다. 이름은 회원 프로필에서 가져오며 브라우저 별명이나 학생 ID 입력은 신뢰하지 않는다.
- 6자리 방 코드, 2~4인 입장, 준비 완료, 방장 시작, 90초 대전, 새로고침 복귀를 지원한다.
- 미공개 카드와 남은 덱은 서버에만 있다. 공개 상태만 참가자에게 보낸다. 터치·키보드 종 눌림과 소리는 로컬에서 즉시 반응한다.
- 진행 상태는 Firestore에 저장되어 함수 인스턴스가 바뀌어도 유지된다. 장시간 폴링으로 상태 변경을 전달하며, 관전성 조회는 쓰기 트랜잭션 없이 읽어 종 입력과의 경합을 줄인다.
- 35초 이상 연결이 끊기거나 경기 중 나가면 취소한다. 취소 결과도 서버에 한 번만 기록하고 랭킹에는 더하지 않는다.

## 학생 랭킹 저장

우승 3점, 공동 우승 1점, 나머지 0점. 같은 누적 점수는 공동 순위다. 45초 이상 진행하고 모든 참가자가 직접 뒤집기/종 입력을 한 번 이상 수행한 경기만 집계한다. 봇 연습은 클라이언트에서만 진행하며 서버에 결과 제출 API 자체가 없다.

서버만 쓰는 컬렉션:

| 경로 | 용도 |
| --- | --- |
| `fruitBellRooms/{code}` | 회원 연결, 대기실, 서버 카드 상태, 참여 확인, 종료·집계 상태 |
| `fruitBellPlayers/{uid}` | 진행 중인 방과 생성 제한 |
| `fruitBellMatches/{matchId}` | 경기별 완료 결과와 랭킹 반영 사유, 중복 방지 |
| `fruitBellRanking/fruit-bell-90-v1/entries/{memberUserId}` | 누적 점수, 경기 수, 승리·공동 우승, 성공·오종 수 |

경기 종료 문서, 플레이어별 집계, 방의 저장 상태를 동일 Firestore 트랜잭션으로 확정한다. 병렬 종료 요청이나 재시도는 중복 점수를 만들지 않는다. 종료 시 참가자의 회원 연결과 활성 상태를 다시 확인한다. 랭킹 조회도 활성 상태와 연결된 UID를 재확인하고 기존 비공개 회원 `G4-C8-N23` 제외 정책을 따른다.

랭킹은 인증된 `fruitBellAction`의 `list` 액션으로 읽는다. 퀴즈타운 아지트 탭은 기존 회원 프로필 렌더러와 연결했고, 게임 결과 저장 시 같은 브라우저의 열린 랭킹 탭에 캐시 무효화 신호를 보낸다.

`rankingRecords`, `userRankingSummary`, `quizKingSummary`, DJ코인·상점·학급경제 데이터는 변경하지 않는다.

## 보안과 운영 차이 관리

- 기존 운영 Firestore 규칙을 Rules API로 읽어 로컬 규칙과 바이트 동일함을 확인했다. 새 컬렉션은 기존 `match /{document=**} { allow read, write: if false; }`로 보호된다. Rules/인덱스 배포는 하지 않았다.
- 규칙 SHA-256: `47e59bf38bbab8780743cea2442868da0c1cb0ff6e1930bc6cc71aa52e7a5636`.
- 비로그인, 미연결, 비활성 계정, 다른 방 참가자의 호출을 거부한다. 클라이언트가 점수·승리 여부·다른 UID를 제출해도 사용하지 않는다.
- 운영 학생 데이터를 직접 수정하거나 테스트 계정을 생성하지 않았다. 저장 기능 검증은 별도 `demo-fruit-bell` 에뮬레이터의 합성 학생 계정으로 수행했다.
- 저장소에 이미 다수의 미커밋 변경이 있었다. Hosting은 운영본 복제로 시작해 과일종 관련 9개 경로만 변경하고, 나머지 기존 파일 1,977개와 Hosting 설정을 보존했다. `index.html`은 전체 로컬 파일을 올리지 않고 운영본의 관련 스크립트 캐시 키 두 개만 바꿨다.
- 새 함수만 들어 있는 독립 소스 패키지로 `--only functions:fruitBellAction`을 실행했다. 기존 함수를 재배포하지 않았다. commit/push는 하지 않았다.

## 배포 내역

- 신규 함수: `fruitBellAction`, `asia-northeast3`, Node.js 22 / 2세대, maxInstances 5, timeout 35초.
- 함수 배포 소스: `/tmp/fruit-bell-functions-release/functions`, 44.5KB 패키지. 서비스·공유 도메인·단일 export·package/lock만 포함.
- 신규 Hosting 버전: `sites/dj48-quiztown-firebase/versions/8745580fe255b98c`.
- 이전 Hosting 버전: `projects/584571538436/sites/dj48-quiztown-firebase/versions/c650be323c42b807`.
- Release: `projects/584571538436/sites/dj48-quiztown-firebase/channels/live/releases/1790673207316000`.
- 배포 스크립트: `scripts/maintenance/publish-fruit-bell.js`. 후보 파일 해시, 운영 기준 버전, 나머지 manifest와 설정을 검사하고 동시 운영 변경이 있으면 중단한다.
- `/tmp/fruit-bell-release/hosting-plan.json`, `receipt.json`, `/tmp/fruit-bell-functions-release/reviewed-hashes.json`에 해당 배포 검증 자료를 보관했다.

변경한 Hosting 경로: `/fruit-bell/{index.html,app.js,net.js,domain.js,style.css}`, `/battle/index.html`, `/js/school-rooms.js`, `/js/hideout-ranking-plaza.js`, `/index.html`.

롤백 필요 시 위 이전 Hosting 버전으로만 되돌린다. 사용자 승인 없이 저장된 경기·랭킹 문서나 배포 함수를 삭제하지 않는다.

## 검증

- `npm run check` 전체 통과. 다른 작업이 사용하는 기본 에뮬레이터 포트를 보존하기 위해 이 실행에서만 Firebase CLI에 `/tmp/fruit-bell-emulators.json`을 지정하는 임시 PATH 래퍼를 사용했다. 실제 npm 검사 목록은 그대로 실행했다. Firestore 18387, Storage 19387, hub 14487, logging 14587.
- `npm run check:fruit-bell-online` 통과. 에뮬레이터 서비스 검사: 회원 연결, 4인 초과 동시 입장 거부, 방 권한, 덱 비공개, 중복 입력, 한 번만 집계, 새 서비스 인스턴스의 영구 기록 조회, 비공개·비활성 제외, 방장 이관, 취소, 클라이언트 직접 읽기/쓰기 거부.
- 같은 명령의 실제 브라우저 검사: 합성 학생 4명이 Firebase 로그인 → 방 입장 → 준비 → **실제 90초** 입력/대전 → 4명 랭킹 저장 → 재접속/새로고침 영구 기록 확인 → 로그아웃 접근 차단. 종료 시각이나 결과를 브라우저 테스트에서 조작하지 않았다.
- `npm run smoke:fruit-bell` 통과: 기존 봇 연습·로컬 4인 대전·터치 즉시 응답·모바일·랭킹 렌더러 회귀.
- `node scripts/smoke/hideout-ranking-browser.js` 통과: 기존 아지트 4개 게임과 새 탭, 프로필 표시, 지연 읽기, 동률, XSS, 재시도, 로그아웃 경합.
- 운영 함수의 인증 없는 POST가 `401 UNAUTHENTICATED`로 거부됨을 확인했다.
- `node scripts/smoke/fruit-bell-production.js` 운영 읽기 전용 검사 통과: 공개된 9개 파일의 SHA-256이 검증 후보와 모두 일치, 비로그인 API 거부, 로그인 안내, 봇 연습, 데스크톱·390px 모바일, JavaScript pageerror 0건. 운영 학생 기록 쓰기 없음.
- 운영 화면을 Codex 브라우저에 열었다. 검증 로그: `/tmp/fruit-bell-production-smoke.log`, `/tmp/fruit-bell-online-check.log`, `/tmp/fruit-bell-production-check.log`.

## 판정 범위

반응시간은 서버에서 처리된 시점 기준이다. Firestore 처리·통신·화면 지연이 포함되므로 인간의 순수 반응시간이나 서로 다른 기기 사이의 완전한 동시성을 보장하는 값이 아니다. 짧은 접전 구간은 60ms이고, 클라이언트가 보내는 시각으로 순위를 조작할 수 없다. 반응시간은 참고 표시이며 랭킹은 경기 우승으로만 집계한다.

실제 교실의 네트워크 품질 측정은 이번 작업에 포함하지 않았다. 운영 기능은 활성화했고, 실제 학생 계정으로 시험 경기를 만들어 기존 기록을 오염시키는 검사는 하지 않았다.

## 후속: 경쾌한 종소리 (2026-09-29)

- 종 입력에 즉시 반응하는 밝은 타격음과 약 0.9초의 감쇠음을 합성한다. 첫 입력에서 AudioContext를 재개하며, 오래 막혀 있던 소리는 뒤늦게 재생하지 않는다. 소리 처리는 서버 판정 요청을 기다리게 하지 않는다.
- 변경한 운영 파일은 `/fruit-bell/app.js`, `/fruit-bell/index.html` 두 개다. 운영 기준 파일과 로컬 일치를 확인한 뒤 최신 live를 복제하여 다른 3,773개 파일과 Hosting 설정을 보존했다.
- Hosting 버전: `sites/dj48-quiztown-firebase/versions/51b1221d863f4cef`. 이전 버전: `projects/584571538436/sites/dj48-quiztown-firebase/versions/efde6220ada964b8`.
- Release: `projects/584571538436/sites/dj48-quiztown-firebase/channels/live/releases/1790686410619000`. 검증 후보·해시·배포 영수증: `/tmp/fruit-bell-sound-release/`.
- `npm run check`, `npm run smoke:fruit-bell`, 운영 파일 해시 및 화면 검사를 통과했다. 로컬과 운영 Chrome에서 첫 소리 활성화, 종 포인터 입력, 음소거 상태의 키보드 입력, 중단된 오디오 재개를 검사했다. 학생 기록 쓰기 없음.
- 배포 및 운영 검사 스크립트에 `FRUIT_BELL_RELEASE_STAGE`를 추가하여 이전 배포 자료와 후속 배포 자료를 분리한다.

## 후속: 감정표현 및 승패 표시 (2026-09-29)

- 경기 중 `🤣 ㅋㅋ`, `😜 메롱`, `😱 헉`, `👏 짝짝` 네 버튼을 제공한다. 보낸 참가자의 아바타 위에 2.5초 동안 표시하며 카드와 종을 가리지 않는다. 서버가 발신자를 로그인 계정으로 결정하고 허용된 종류 및 참가 여부를 확인하며, 참가자마다 3초 간격을 트랜잭션으로 강제한다.
- 기존 방의 참가자 필드에 마지막 `{ kind, at }`만 보관한다. 접속 복구 시 만료한 표현은 다시 표시하지 않는다. 경기 결과·랭킹에는 감정표현을 저장하지 않으며, 직접 경기 참여 횟수에도 포함하지 않는다.
- 게임 내 랭킹과 아지트 랭킹에서 `전체 판 수 · 승 패 · 공동 우승`을 표시한다. 패배는 `max(0, games - wins - draws)`로 계산한다. 기존 점수·저장 구조·집계 조건·게임 버전·보안 규칙을 유지한다.
- 검증: `npm run check`, `npm run smoke:fruit-bell`, `npm run check:fruit-bell-online`, 아지트 랭킹 브라우저 검사를 통과했다. 합성 Firebase 계정 4명에게 이모티콘 전달·자동 소멸을 확인하고 실제 90초 경기를 완주하여 영구 랭킹을 확인했다. 서버 검사에는 동시 연타, 타인 사칭, 임의 문자열, 방 외부 참가자 거부와 카드·타이머·랭킹 참여 횟수 불변을 추가했다.
- 운영 함수의 소스 ZIP을 내려받아 이전 격리 배포본과 일치함을 확인했다. 이번 후보는 기존 함수 진입점과 패키지를 보존하고 `fruit-bell/service.js`, `fruit-bell/domain.js`만 갱신했다. 공개 후보는 `/fruit-bell/{app.js,domain.js,index.html,style.css}`, `/js/hideout-ranking-plaza.js`, `/index.html` 6개다. 공유 index는 운영 원본에서 랭킹 스크립트 캐시 키만 교체했다.
- 검증 자료: `/tmp/fruit-bell-reactions-release/`; 로그: `/tmp/fruit-bell-emotes-{check,online,browser,plaza,function-deploy}.log`; 모바일 스크린샷: `/tmp/fruit-bell-emotes-mobile.png`.
- 배포 완료: `fruitBellAction(asia-northeast3)` 단독 업데이트 성공. Hosting 버전 `sites/dj48-quiztown-firebase/versions/2015a0cb0f5d3f4c`, release `projects/584571538436/sites/dj48-quiztown-firebase/channels/live/releases/1790687114507000`. 이전 Hosting 버전 `51b1221d863f4cef`. 다른 3,769개 파일과 Hosting 설정 보존.
- 운영 읽기 전용 최종 검사 통과: 6개 파일 해시 일치, 인증 없는 함수 호출 거부, 연습의 감정표현 키보드 입력·대기시간·모바일, JavaScript 오류 없음. 운영 학생 기록을 생성하거나 수정하지 않았다. 로그: `/tmp/fruit-bell-emotes-production.log`.
