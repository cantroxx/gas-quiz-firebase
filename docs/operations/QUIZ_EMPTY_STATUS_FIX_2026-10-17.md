# 퀴즈 빈 저장 안내칸 수정

2026-10-17. 오답 화면에서 다음 문제 버튼 옆에 남던 노란 빈 칸을 수정했다. 결과 카드가 빈 저장 상태 요소를 만들고, 공통 `quiz-progress` 스타일이 배경·테두리를 표시한 것이 원인이다.

`#practice-save-status:empty`, `#ranking-save-status:empty`에 `display:none`을 적용했다. 저장 문구가 들어오면 기존 스타일로 다시 표시된다. 문제 진행 표시, 기록 저장, 보상 계산, 다음 문제 동작은 유지한다.

## 검증

- `npm run check` 전체 통과.
- 운영의 실제 퀴즈 도메인·렌더러와 CSS로 빈 칸을 재현한 뒤 후보 CSS에서 숨김 확인.
- 정답의 저장 중, 보상 완료, 중복 정답, 저장 오류 문구 표시 확인.
- 랭킹 중 빈 연습 안내와 연습 완료의 빈 랭킹 안내 숨김, 랭킹 저장 문구 표시 확인.
- 문제 진행 표시와 다음 문제 버튼 유지, 브라우저 오류 없음. 합성 데이터와 차단된 네트워크로 검사했으며 학생 계정·운영 데이터 쓰기는 없음.
- `/tmp/quiz-status-release/wrong-fixed.png`에서 수정 화면 육안 확인.

## 배포 범위

현재 운영본을 복제하고 `/styles.css`에 위 CSS 규칙만 추가했다. `/index.html`은 해당 스타일 파일의 캐시 버전만 `quiz-status-20261017`로 변경한다. 기존 로컬의 다른 미배포 변경은 포함하지 않았다. Functions, 보안 규칙, 학생 기록, DJ코인, 랭킹 변경 없음.

- 배포 스크립트: `scripts/maintenance/publish-quiz-status.js`
- 후보·원본·검증·배포 영수증: `/tmp/quiz-status-release/`
- 전체 검사 로그: `/tmp/quiz-status-release/full-check.log`

Git commit·push는 수행하지 않았다.

## 운영 반영

- 이전 버전: `801c6b893f67c0e9`
- 새 버전: `a3a03926006dea91`
- Release: `1792216014925000`
- 변경한 2개 파일 외 3,791개 파일과 Hosting 설정 보존 확인.
- 배포 후 live 버전·전체 매니페스트·공개 파일 2개의 SHA-256이 후보와 일치함을 확인했다.
