# 성장 퀘스트·공통 숏컷 운영 반영

2026-09-20. 사용자 요청: 시즌 이벤트에 온라인 게임 보상을 즉시 반영하고 이벤트를 열며, 공통 숏컷에서 퀘스트·보상·현재 성장 상황을 함께 확인.

## 운영 반영 완료

- 일일·주간·월간 시즌 퀘스트와 서버 승인 실적 집계/보상 수령을 공개했다.
- 월간: 스터디 타운 정답 100개, 서바이버 서버 문제 정답 100개, 마블 정상 완주 5회, 구름탑 문장 200개, 말폭탄 인정 낱말 100개. 각각 XP 50 + DJ코인 40, 월 1회.
- 기존 주간 XP 500 한도와 레벨업 보상 유지. 경기마다 즉시 입금하는 보상이 아니라 완료한 퀘스트의 보상 수령 방식이다.
- `eventPlazaEnabled`는 이미 true여서 열림 상태를 재확인했다. `shopEnabled:false`를 포함해 다른 운영 설정은 그대로 보존했다.
- 코디 상점 구매·유료 염색, 하보 연결 분리 등 이전에 로컬 구현한 별도 변경은 **이번 배포에 포함하지 않았다**. 이번 배포 범위는 퀘스트·성장·숏컷이다.

## 두 숏컷과 종합 현황

- `👤 내 상태`: 보유 DJ코인, 레벨, 누적 XP, 레벨 진행도, 출처별 보상 한도와 퀘스트 현황.
- `🎯 퀘스트`: 동일한 회원 상태와 함께 퀘스트 영역을 위로 배치. 오늘/이번 주/시즌 필터, 지금 받을 수 있는 기본 코인·XP 합계, 주간 XP 잔여 한도, 진행도, 보상 수령 버튼.
- 기본 보상 합계에는 일일·주간 각각 3개 수령 제한을 반영한다. 실제 XP는 한도와 최고 레벨에 영향을 받고, 레벨업 코인은 별도 지급임을 표시한다.
- 열릴 때 조회하며 열린 동안 30초마다 갱신한다. 닫으면 iframe과 갱신 타이머가 해제된다. 로그아웃/계정 전환 시 이전 회원 표시를 비운다.
- 퀴즈타운 내부는 모달, 외부 스터디 타운과 KBO는 퀴즈타운 상태 페이지 새 창. 외부 게임에 회원 토큰을 전달하지 않는다.
- KBO에는 상태·퀘스트 조회 버튼만 연결했다. KBO 게임 실적으로 새 보상을 주는 기능은 추가하지 않았다.

## 배포 범위와 영수증

운영 함수 8개의 기존 소스를 내려받아 필요한 export와 게임 활동 기록 부분만 교체했다. XP/인증/주간 한도 공통 함수는 운영본과 동일함을 확인했다.

함수 12개:
`getEventProgress`, `claimEventQuestReward`, `grantRankingCompleteXp`, `grantPracticeReward`, `startRankingQuestSession`, `ingestGrowthActivity`, `ingestPracticeGrowth`, `survivorQuestQuiz`, `studyTownAction`, `cloudTowerAction`, `townMarbleAction`, `wordBombAction`.

집계 트리거의 자동 재시도 정책은 자동 승인 검토에서 처음 거부됐고, 사용자가 **“자동 재시도 포함 배포 승인”**으로 최대 7일 재시도 및 추가 호출 비용을 명시적으로 승인한 뒤 진행했다. 첫 트리거 생성은 Eventarc 서비스 권한 전파 지연으로 실패했으며 별도 권한 확장 없이 재시도해 두 함수 생성에 성공했다.

Hosting:
- 이전 버전: `19aab1d26c080212`
- 새 버전: `8d3db159cd1b41d3`
- release: `1789899156677000`
- 운영 버전을 복제하고 관련 파일 18개만 추가/갱신했다. 나머지 1,954개 파일과 Hosting 설정은 보존했다.
- 마블 HTML은 소스 빌드 산출물을 사용하고 참조 JS/CSS가 운영본과 같은지 확인했다.

외부 배포:
- 스터디 타운: `dpl_7pDcX3xxGyau4GHJ8aST6Tuq1iYx` → https://dj48-fraction-world.vercel.app/
- KBO: `dpl_1pb7eqsR83NSEEFvfHXQicQHcVew` → https://kbo-owner.vercel.app/
- 스터디 타운 운영 소스 66개와 KBO 파일 16개를 해시로 대조했다. 각 index.html의 숏컷 연결만 바뀌었다. KBO는 소스를 임시 폴더에서 재빌드하고 JS/CSS/이미지가 운영본과 바이트 단위로 일치하는 것을 확인했다.

## 검증

- 최신 `npm run check` 전체 통과.
- 실제 배포용 서버 후보로 데모 Firestore 검사 통과: 일일/시즌 XP·코인 지급, 연계 레벨업 보상, 중복 활동, 동시 수령, 랭킹 시작 세션, 서버 문제 채점.
- 퀘스트/상태창 브라우저 검사 통과: 두 진입점, 기간 필터, 수령 가능 기본 보상 합계, 수령 후 갱신, 계정 전환, 부분 장애, 모바일 폭.
- 실제 Hosting 후보의 이벤트 광장 진입·캐시·중복 조회·오류 재시도 회귀 검사 통과.
- 운영 파일 18개 모두 배포 후보와 SHA-256 일치. 보상/조회 callable 4개의 비로그인 요청 HTTP 401 확인.
- 배포 후 관련 함수 12개 모두 ACTIVE 상태 확인.
- 운영 브라우저에서 두 숏컷 및 퀘스트 패널 로드 확인. 스터디 타운의 퀘스트 버튼 클릭으로 `/player-status/?view=quests` 새 창이 열리고 `나의 퀘스트` 제목이 표시되는 것까지 확인.
- 테스트를 위해 운영 학생 잔액/실적을 조작하거나 실제 보상을 청구하지 않았다. 관리자 세션이 만료되어 실제 회원 데이터가 채워진 화면의 최종 확인은 로그인 후 필요하다. 지급 동작 자체는 데모 Firestore로 검증했다.

## 재현 자료

- `scripts/maintenance/prepare-growth-functions.py`: 운영 함수 소스 기반 배포 후보 생성.
- `scripts/maintenance/publish-growth-quests.js`: 운영 Hosting 복제 및 한정 파일 배포, 해시/원본 버전/설정 불변 검사.
- `scripts/maintenance/open-growth-events.cjs`: 이벤트 광장 설정만 열고 나머지 설정 보존 확인.
- `scripts/maintenance/prepare-external-quest-shortcuts.cjs`: Vercel 운영 소스 해시 확인과 외부 숏컷 후보 준비.
- 임시 배포/검사 기록: `/tmp/growth-functions-deploy.log`, `/tmp/growth-triggers-deploy.log`, `/tmp/growth-hosting-release.log`, `/tmp/growth-launch-check.log`, `/tmp/growth-candidate-check.log`, `/tmp/growth-study-deploy.log`, `/tmp/growth-kbo-deploy.log`.

Vercel 소스 비교는 공식 [배포 파일 목록](https://vercel.com/docs/rest-api/deployments/list-deployment-files)과 [파일 내용 조회](https://vercel.com/docs/rest-api/deployments/get-deployment-file-contents) API를 사용했다.
