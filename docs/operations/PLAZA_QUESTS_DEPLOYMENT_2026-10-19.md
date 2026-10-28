# 랭킹·퀘스트 운영 반영 — 2026-10-19

사용자의 “배포하고 운영데이터 반영” 지시에 따라 `dj48-quiztown-firebase`에 반영했다. 기능 사양은 [로컬 구현 보고서](PLAZA_QUESTS_LOCAL_2026-10-19.md)를 따른다.

## 배포 범위
- 기존 Functions 10개: getEventProgress, claimEventQuestReward, grantPracticeReward, grantRankingCompleteXp, ingestGrowthActivity, ingestPracticeGrowth, survivorQuestQuiz, wordBombAction, subjectQuizAction, popularQuizAction.
- 신규 Functions 2개: specialRewardAction, adminSpecialRewardAction.
- Hosting 22개 경로: 랭킹·이벤트·내 방 관련 화면과 번들, 인기퀴즈·서바이버·상태 화면 및 캐시 버전. 다른 4,650개 파일과 기존 Hosting 설정을 보존했다.
- 이전 Hosting 버전: `77560450f386c2f2`. 새 버전: `010192af06a97061`.
- 기존 함수마다 각자의 운영 소스를 내려받아 필요한 부분만 변경했다. 기존 함수의 런타임, 서비스 계정, 환경설정, 트리거는 유지했다. 관련 없는 기존 함수의 updateTime 변경은 없었다.
- Firestore/Storage 규칙 및 인덱스는 배포하지 않았다. Git 커밋·Push는 하지 않았다.

## 운영 데이터
- 랭킹·이벤트 기능은 이미 활성화되어 있었으므로 featureFlags는 변경하지 않았다.
- 없던 `appSettings/specialRewards`에 `{items: []}`를 최초 생성했다. 존재 여부를 전제조건으로 검사해 기존 설정 덮어쓰기를 방지했다.
- 실제 학생의 점수, XP, DJ코인, 기존 진행도, 수령 내역을 일괄 수정하거나 초기화하지 않았다. 테스트 보상도 지급하지 않았다.
- 새 퀘스트는 적용 후 활동을 `__v3_daily__`, `__v3_weekly__` 진행도로 집계한다. 이전 기록을 소급 변환하지 않는다. 말폭탄 우승 순위도 새로 완료되는 경기부터 누적한다.
- 특별 보상은 관리자 대시보드의 ‘특별한 보상 설정’에서 미션과 보상액을 게시하면 학생에게 나타난다. 실제 미션은 임의로 등록하지 않았다.

## 검증
- 로컬 `npm run check` 전체 통과 기록을 확인했다. 최종 캐시 버전 변경 후 `npm run check:static`도 통과했다(504 JS 파일).
- 실제 운영 소스로 만든 배포 후보를 Emulator에서 실행: 특별 보상 권한·동시 수령, 서바이버 세션·재전송, 성장 집계, 과목 연습 보상, 인기퀴즈 보상 미지급, 기존 진행도·한도 보존 검증 통과.
- 배포 후보의 390px/1440px 브라우저 검사: 일일/주간 토글, 랭킹 연결, 명예의 전당, 모드 제거, 새로고침 위치, 특별 보상 참여·수령 흐름 통과. 합성 계정만 사용했다.
- 운영 기존 함수 10개의 다운로드 소스 전체 해시, 런타임 및 트리거를 대조했다. 신규 2개 함수 소스도 대조했다.
- 운영 callable 10개에 비인증 요청을 보내 모두 HTTP 401 / UNAUTHENTICATED 반환을 확인했다. 실제 학생 계정으로 게임이나 보상 수령을 실행하지 않았다.
- Hosting 공개 후 전체 manifest와 변경 파일 22개의 HTTP 응답 해시 일치를 확인했다. 결과는 아래 배포 영수증과 임시 작업 기록에 보관했다.

서바이버 점수는 기존처럼 클라이언트 계산을 사용한다. 세션·시간·점수 범위·재전송 검사는 추가됐지만 서버가 전투 점수를 재계산하지는 않는다.

[배포 영수증과 파일 해시](PLAZA_QUESTS_DEPLOYMENT_2026-10-19.json). 운영 소스 백업·후보·검사 로그는 로컬 `/tmp/plaza-deploy-20261019`에 있으며 임시 디렉터리 정리 시 사라질 수 있다.
