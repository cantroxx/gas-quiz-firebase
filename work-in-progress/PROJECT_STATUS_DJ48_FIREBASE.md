# DJ48 퀴즈타운 Firebase 운영 현황

작성일: 2026-06-12  
최종 최신화: 2026-06-12  
기준 프로젝트: `dj48-quiztown-firebase`  
운영 URL: `https://dj48-quiztown-firebase.web.app`  
확인 기준: 현재 저장소의 Firebase 운영본 파일(`public/index.html`, `public/styles.css`, `functions/index.js`, `firebase.json`, `firestore.rules`, `storage.rules`)

> 참고: 이 문서는 현재 저장소에 있는 Firebase Hosting/Functions 기준으로 실제 동작 중인 구조와 기능만 정리한다. 이번 작성 과정에서 운영 배포, Firestore/Storage 데이터 수정, Git 커밋/푸시는 실행하지 않았다.

## 운영 파일 구조

- Firebase Hosting 공개 디렉터리: `public`
- 운영 메인 화면: `public/index.html`
- 전역 스타일: `public/styles.css`
- Firebase Functions: `functions/index.js`
- Hosting/Functions/Firestore/Storage 설정: `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`
- Firebase 프로젝트 alias: `.firebaserc`의 `default = dj48-quiztown-firebase`
- 레거시 Apps Script 파일인 루트 `index.html`, `Code.js`, `appsscript.json`은 현재 Firebase 운영본 기준 파일이 아니다.

## Hosting 구성

`firebase.json` 기준으로 Hosting은 `public` 디렉터리를 배포한다.

- `/`, `*.html`: `no-cache, no-store, must-revalidate`
- `*.css`: `no-cache, max-age=0`
- Firebase compat SDK는 Hosting 예약 경로를 사용한다.
  - `/__/firebase/10.12.2/firebase-app-compat.js`
  - `/__/firebase/10.12.2/firebase-auth-compat.js`
  - `/__/firebase/10.12.2/firebase-firestore-compat.js`
  - `/__/firebase/10.12.2/firebase-storage-compat.js`
  - `/__/firebase/10.12.2/firebase-functions-compat.js`
  - `/__/firebase/init.js`
- Functions region은 프런트와 백엔드 모두 `asia-northeast3`를 사용한다.

## 사이트 화면 구조

`public/index.html`의 주요 화면은 단일 HTML 안에서 `hidden` 상태를 전환하는 SPA 방식이다.

- `login-view`: 학생 로그인/신규가입/비밀번호 재설정 진입 화면
- `town-view`: 퀴즈타운 지도 메인 화면
- `home-view`: 내 집, 프로필, 칭호, 뱃지, 내 방 꾸미기
- `school-view`: 과목관 진입 화면
- `subject-view`: 과목별 퀴즈 목록
- `quiz-select-view`: 퀴즈별 모드 선택
- `quiz-play-view`: 실제 문제 풀이 화면
- `ranking-view`: 랭킹 광장
- `shop-view`: 상점
- `event-view`: 이벤트 광장
- `classroom-view`: 우리 교실
- `admin-view`: 관리자 화면

지도 장소는 알림판, 내 집, 학교, 우리 교실, 상점, 랭킹 광장, 이벤트 광장으로 구성되어 있다.

## 현재 연결된 사용자 기능

### 로그인/회원

- 학교, 학년, 반, 번호, 비밀번호 기반 로그인
- 신규가입
- 기존 학생의 초기 비밀번호 안내 및 변경 흐름
- 비밀번호 변경
- 닉네임 변경
- 프로필 이미지 후보 검색/선택
- 프로필 이미지 업로드 및 원형 표시 위치 조정
- 랭킹 한마디 저장
- Firebase Auth UID와 레거시 학생 ID(`G학년-C반-N번호`) 연결

### 퀴즈

과목관은 국어, 사회, 수학, 인기 퀴즈, 외부 퀴즈 허브로 나뉜다.

현재 카탈로그에 포함된 주요 퀴즈는 다음과 같다.

- 국어: 맞춤법, 다의어·동형이의어, 지엠오 아이, 독서, 시간가게
- 국어 준비 중: 속담, 사자성어
- 사회: 삼국지, 고대사, 역사 인물, 문화유산, 사회 개념
- 수학: 곱셈과 나눗셈, 계산 연습
- 인기: 아이돌, 애니, 아재개그, 티니핑, 포켓몬

퀴즈 모드는 카탈로그별로 다르지만, 운영 화면은 연습전, 랭킹전, 원찬스, 기록 보기 흐름을 지원한다.

### 기록/보상

- 연습 기록은 `practiceRecords`에 저장된다.
- 연습 요약은 `userPracticeSummary`에 저장된다.
- 연습 정답 보상은 callable function `grantPracticeReward`가 처리한다.
- 보상 로그는 `rewardLogs`에 저장된다.
- 사용자 재화는 `userEconomy`에 저장된다.
- 뱃지는 `userBadges/{userId}/badges`에 저장된다.
- 칭호는 `titleCatalog`, `userTitles/{userId}/titles`, `userTitleSummary`를 사용한다.

### 랭킹

- 랭킹 기록은 `rankingRecords`에 저장된다.
- 사용자 랭킹 요약은 `userRankingSummary`에 저장된다.
- 퀴즈왕 요약은 `quizKingSummary`에 저장된다.
- 랭킹 광장은 퀴즈왕, 국어왕, 사회왕, 수학왕, 인기왕 카드와 세부 보드를 렌더링한다.
- 랭킹 데이터에는 닉네임, 프로필 이미지, 랭킹 한마디가 함께 표시된다.
- 기능 플래그에서 비활성화된 퀴즈는 랭킹 광장 표시에서도 제외된다.

### 인기 퀴즈 사용 제한

Functions에 인기 퀴즈 사용 시간 관리가 들어가 있다.

- `dailyUsage` 컬렉션을 사용한다.
- 기본 제한값은 하루 인기 퀴즈 10분 소프트 제한이다.
- 오후 4시 이후 사용량은 30분 하드 제한이 적용된다.
- 교육 퀴즈 정답 15개로 인기 퀴즈 추가 이용 잠금 해제를 처리한다.
- 관련 callable function:
  - `getPopularQuizUsageStatus`
  - `recordPopularQuizUsageSeconds`
  - `recordEducationCorrectForPopularUnlock`

### 상점/내 방

- 상점 아이템은 `shopItems`에서 읽는다.
- 구매는 callable function `purchaseShopItem`이 서버 트랜잭션으로 처리한다.
- 구매 후 `userInventory/{userId}/items`, `purchaseLogs`, `userEconomy`를 갱신한다.
- 내 방 설정은 `userRoomSettings`에 저장된다.
- 구매 재화는 DJ코인 기준이다.

### 이벤트 광장

- 이벤트 진행도는 callable function `getEventProgress`가 계산한다.
- 이벤트 보상 수령은 `claimEventQuestReward`가 처리한다.
- 현재 기본 이벤트 퀘스트 정의:
  - 맞춤법 연습전 1회 완료
  - 사회 퀴즈 3문제 풀기
  - 수학 연습전 도전하기

### 우리 교실

- 기본 교실 설정은 `G4-C8`, 이름은 `4학년 8반`, 입장 코드는 `4822`이다.
- 교실 화면은 퀘스트, 젬 진행도, 학생 카드, 교실 직업, 교실 상점, 성장루틴, 교실 전용 보상 흐름을 포함한다.
- 교실 퀘스트 저장: `saveClassroomQuest`
- 자동 완료형 퀘스트: `completeClassroomAutoQuest`
- 교사 검토형 퀘스트 승인/반려: `reviewClassroomQuestProgress`
- 퀘스트 보상은 교실 전용 화폐인 베리로 통일되어 있다.
- 퀘스트에는 연결 젬, 젬 경험치, 젬 목표 경험치, 젬 획득 보상을 설정할 수 있다.
- 젬 목표를 달성한 학생은 완료 젬을 대표 뱃지로 설정할 수 있다.
- 담임은 기준 젬과 지급 인원을 입력해 월간 뱃지 캠페인을 스캔하고 지급할 수 있다.
- 학생 카드 화면은 같은 반 학생의 번호, 닉네임, 프로필 이미지, 베리, 대표 뱃지를 보여준다.
- 교실 직업은 담임 생성, 학생 지원, 담임 배정/해제, 월급 지급 흐름을 가진다.
- 교실 상점은 담임이 베리 가격 상품을 만들고 학생이 베리로 구매하는 흐름을 가진다.
- 성장루틴은 학생이 직접 만들고, 지정 요일에 체크하며, 목표 횟수 달성 시 베리 보상을 받을 수 있다.
- 교실 데이터는 `classrooms/{classId}`와 하위 컬렉션을 사용한다.
  - `questProgress`
  - `studentWallets`
  - `berryLogs`
  - `studentGemProgress`
  - `studentProfiles`
  - `badgeCampaigns`
  - `studentBadges`
  - `jobs`
  - `jobApplications`
  - `jobAssignments`
  - `shopItems`
  - `shopPurchases`
  - `studentRoutines`
  - `routineCheckLogs`

### 알림판/외부 퀴즈/기능 플래그

- 알림판은 `noticeBoard/current`를 사용한다.
- 외부 퀴즈 링크는 `appSettings/externalQuizzes`를 사용한다.
- 기능 플래그는 `appSettings/featureFlags`를 사용한다.
- 기본 기능 플래그는 연습 보상, 상점, 이벤트 광장, 랭킹을 활성 상태로 둔다.
- 비활성 퀴즈 ID 목록(`disabledQuizIds`)으로 퀴즈 카드, 랭킹, 뱃지 표시를 제어한다.

## 관리자 기능

`admin-view`와 callable functions 기준으로 다음 기능이 연결되어 있다.

- 운영 대시보드 조회: `adminGetDashboard`
- 운영 점검 조회: `adminGetOperationalAudit`
- 퀴즈 품질 점검: `adminGetQuizQualityAudit`
- 회원 목록 조회: `adminListMembers`
- 회원 상세 조회: `adminGetMemberDetail`
- 회원 임시 비밀번호 초기화: `adminResetMemberPassword`
- 회원 상태 변경: `adminUpdateMemberStatus`
- 회원 Auth 연결 해제: `adminUnlinkMemberAuth`
- 학급 관리자 권한 부여/해제: `adminSetClassAdmin`
- 비밀번호 설정 기간/정책 조회 및 저장: `adminGetPasswordSetupSettings`, `adminUpdatePasswordSetupSettings`
- 관리자 로그 조회: `adminListLogs`
- 알림판 조회/저장: `adminGetNoticeBoard`, `adminUpdateNoticeBoard`
- 기능 플래그 조회/저장: `adminGetFeatureFlags`, `adminUpdateFeatureFlags`
- 외부 퀴즈 링크 조회/저장: `adminGetExternalQuizzes`, `adminUpdateExternalQuizzes`
- 교실 퀘스트 검토 화면
- 교실 퀘스트 생성 및 교사 검토형 보상 승인/반려
- 교실 월간 뱃지 캠페인 지급: `awardClassroomBadgeCampaign`
- 교실 직업 생성/배정/해제/월급 지급: `saveClassroomJob`, `assignClassroomJob`, `releaseClassroomJob`, `claimClassroomJobSalary`
- 교실 상점 상품 생성: `saveClassroomShopItem`

관리자 판별은 `users` 컬렉션의 admin role, admin scope, super admin 설정을 기준으로 한다.

## Firestore 보안 규칙 요약

주요 규칙은 다음 방향으로 구성되어 있다.

- `shopItems`, `assetCatalog`: 공개 읽기 허용
- `quizzes`, `quizQuestions`: 로그인 사용자 읽기 허용
- `users`: 본인 제한 프로필 수정 또는 관리자 수정 허용
- `memberCredentials`, `memberPasswordSetupState`, `memberPasswordSetupSessions`, `memberAuthLogs`, `authSettings`: 클라이언트 직접 읽기/쓰기 차단
- `appSettings/featureFlags`, `appSettings/externalQuizzes`: 로그인 사용자 읽기 허용, 쓰기는 Functions 경유
- `userEconomy`, `userInventory`, `userRoomSettings`: 본인 또는 연결된 사용자 범위
- `practiceRecords`, `userPracticeSummary`, `userBadges`: 사용자별 shape 검증 후 생성/수정 허용
- `rankingRecords`: 로그인 사용자 읽기, 유효한 랭킹 기록 생성만 허용
- `quizKingSummary`: 로그인 사용자 읽기, 유효한 요약 생성/수정만 허용
- `classrooms`: 로그인 사용자 읽기, 퀘스트 진행/검토는 사용자 또는 관리자 범위 검증
- `classrooms/{classId}/studentWallets`: 본인 또는 관리자 읽기, 직접 쓰기 차단
- `classrooms/{classId}/berryLogs`: 관리자 읽기, 직접 쓰기 차단
- `classrooms/{classId}/studentGemProgress`: 본인 또는 관리자 읽기, 직접 쓰기 차단
- 교실 직업, 교실 상점, 루틴, 뱃지 캠페인 등 최근 추가된 교실 경제 데이터는 클라이언트 직접 쓰기가 아니라 callable Functions를 통해 Admin SDK로 처리된다.
- 기타 모든 문서는 기본 차단

## Storage 보안 규칙 요약

- `profileImages/{authUid}/{fileName}`만 로그인 사용자 범위에서 접근 가능하다.
- 프로필 이미지는 이미지 파일, 최대 5MB 제한을 둔다.
- 그 외 Storage 경로는 읽기/쓰기 모두 차단한다.

## 현재 진행상황

- Firebase Hosting 기반 운영본은 `public/index.html` 중심의 단일 페이지 앱으로 정리되어 있다.
- 학생 로그인/신규가입/비밀번호 기반 인증 흐름이 Functions와 연결되어 있다.
- 퀴즈 선택, 문제 풀이, 연습 기록, 랭킹 기록, 보상, 칭호/뱃지 표시 흐름이 연결되어 있다.
- 상점 구매는 서버 검증 트랜잭션으로 처리되며, 구매 로그와 인벤토리를 남긴다.
- 관리자 화면은 회원/운영/퀴즈 품질/공지/기능 플래그/외부 퀴즈/권한 관리 기능을 포함한다.
- 우리 교실 기능은 4학년 8반 기본 설정, 퀘스트/검토/교실 보상, 젬 진행도, 대표 뱃지, 학생 카드, 교실 직업, 교실 상점, 성장루틴까지 확장되어 있다.
- 인기 퀴즈 시간 제한과 교육 정답 기반 잠금 해제 로직이 Functions에 구현되어 있다.

## 최근 반영된 작업

가장 최근 커밋 기준으로 다음 작업이 반영되어 있다.

- `77013e0 Refine home profile toggles and classroom cards`
  - 홈 프로필 토글 UI와 교실 카드 스타일/표시를 개선했다.
- `d3b1092 Add classroom economy routines and teacher salary flow`
  - 교실 직업, 지원/배정/해제, 담임 월급 지급, 교실 상점, 성장루틴 저장/체크 흐름을 추가했다.
  - 관련 callable functions: `getClassroomEconomyBoard`, `saveClassroomJob`, `applyClassroomJob`, `assignClassroomJob`, `releaseClassroomJob`, `claimClassroomJobSalary`, `saveClassroomShopItem`, `purchaseClassroomShopItem`, `saveClassroomRoutine`, `checkClassroomRoutine`
- `5a74d3e Add classroom badge campaign awards`
  - 담임이 기준 젬을 선택해 상위 학생에게 월간 뱃지를 지급하는 흐름을 추가했다.
  - 관련 callable function: `awardClassroomBadgeCampaign`
- `17c9c7a Allow selecting classroom gem badges`
  - 학생이 완료한 젬을 대표 뱃지로 선택할 수 있게 했다.
  - 관련 callable function: `setClassroomSelectedBadge`
- `d2033b1 Add classroom student card view`
  - 같은 반 학생 카드 목록을 불러와 프로필, 베리, 대표 뱃지를 표시한다.
  - 관련 callable function: `getClassroomStudentCards`
- `d50faa3 Add classroom gemstone quest progress`
  - 교실 퀘스트 완료 시 연결 젬 경험치를 누적하고, 목표 달성 시 베리 보상을 지급하는 흐름을 추가했다.
- `e1df63e Unify classroom rewards as berry`
  - 교실 보상을 DJ코인이 아니라 베리로 통일했다.
- `e23a756 Pay classroom rewards on teacher review`
  - 담임 승인형 퀘스트의 보상을 승인 시점에 지급하도록 연결했다.

## 이번 문서 작성에서 실행하지 않은 작업

- `firebase deploy` 실행 안 함
- `git commit` 실행 안 함
- `git push` 실행 안 함
- 운영 Firestore/Storage 데이터 직접 수정 안 함
- 레거시 Apps Script 파일 수정 안 함
- 전체 리팩터링 또는 코드 포맷팅 안 함
- 운영 URL 응답과 로컬 파일의 바이트 단위 비교는 수행하지 않음
