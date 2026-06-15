# Firebase Site Opening Checklist

## 목적

Firebase 배포본을 실제 학생 사용으로 열기 직전에 확인할 항목을 고정한다.

기준일: 2026-06-09

## 현재 오픈 가능 상태

- Firebase Hosting 배포 완료
- Firestore Rules 배포 완료
- Cloud Functions 배포 완료
- 비밀번호 기반 회원 로그인 적용 완료
- 최초 비밀번호 설정 기간 설정 완료
  - `authSettings/memberPasswordSetup.setupEnabled: true`
  - `setupExpiresAt: 2026-06-17 23:59:59 KST`
- 학생 비밀번호 초기화 운영 스크립트 준비 완료
  - `scripts/reset-member-password.js`
- Firestore 이관 데이터 기반 화면/플레이 연결 완료

## 배포 URL

```text
https://dj48-quiztown-firebase.web.app
```

## 오픈 직전 필수 확인

1. 로그인
   - 학교/학년/반/번호/비밀번호로 로그인
   - 새로고침 후 자동 복구
   - 연결 해제 후 다른 학생 로그인

2. 최초 비밀번호 설정
   - 비밀번호 미등록 학생으로 학교/학년/반/번호/기존 닉네임 입력
   - 새 비밀번호 등록
   - 재로그인 확인

3. 비밀번호 초기화
   - 운영자 스크립트 dry-run 확인
   - 필요한 학생만 reset 실행
   - 임시 비밀번호 로그인 후 강제 변경 확인

4. 연습전
   - 4지선다 정답 처리
   - 이미지형 정답 처리
   - `practiceRecords` 갱신
   - `userPracticeSummary` 갱신
   - `userBadges` 갱신
   - `userEconomy` DJ코인 증가

5. 랭킹전
   - 하트 기반 종료
   - 랭킹 기록 저장
   - 같은 분야/같은 닉네임은 최고 기록만 표시
   - 랭킹 광장 Firestore 표시

6. 상점
   - 보유 코인 표시
   - 구매 가능/코인 부족/보유중 상태 표시
   - 구매 후 DJ코인 차감
   - `userInventory` 생성 또는 갱신

7. 내 집
   - 보유 아이템 표시
   - 아이템 장착
   - 장착 해제
   - 새로고침 후 적용 상태 유지

8. 홈/프로필
   - 닉네임 표시
   - 대표 칭호 표시
   - 대표 뱃지 표시
   - 보유 코인 표시

## 콘솔 오류 기준

오픈 직전 확인에서 아래 오류가 반복되면 오픈 보류:

- `permission-denied`
- `progress save failed`
- `quiz load failed`
- `ranking plaza read failed`
- `purchase failed`
- `member auth link failed`
- `member password change failed`

Safari에서만 발생하는 일회성 Firestore transport 경고는 기능이 정상 작동하면 오픈 차단 사유로 보지 않는다.

## 운영 명령

초기 비밀번호 설정 상태 확인:

```sh
node scripts/seed-member-password-setup-settings.js --dry-run
```

초기 비밀번호 설정 기간 유지 또는 연장:

```sh
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed-member-password-setup-settings.js --commit --enable --expires-at 2026-06-17T23:59:59+09:00
```

초기 비밀번호 설정 종료:

```sh
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed-member-password-setup-settings.js --commit --disable
```

특정 학생 비밀번호 초기화 dry-run:

```sh
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/reset-member-password.js --dry-run --grade 4 --class 8 --number 22
```

특정 학생 비밀번호 초기화 실행:

```sh
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/reset-member-password.js --commit --grade 4 --class 8 --number 22
```

## 오픈 이후로 넘기는 항목

- 관리자 UI
- 이벤트/퀘스트/학급미션 실제 진행도 연결
- Safari Firestore transport 경고 추가 완화
- 미세 UI 다듬기
- 접속 통계/운영 로그 대시보드
