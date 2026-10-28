# 말폭탄 캐릭터 16종

사용자 요청에 따라 기존 8종에 남학생 4명·여학생 4명을 추가 생성했다. 최대 참가 인원은 8명을 유지한다.

- 기존 이미지: `public/word-bomb/assets/people-v3.png` (캐릭터 ID 0~7).
- 추가 이미지: `public/word-bomb/assets/people-extra-v4.png` (캐릭터 ID 8~15).
- builtin 이미지 생성 및 프롬프트: `docs/product/WORD_BOMB_EXTRA_HUMANS_V4.json`.
- 기존 그림을 참고해 동일한 한 줄 착석 경기장에서 사용할 4×2 투명 PNG를 생성했다. 두 시트는 CSS 배경으로 표시하며 원본 이미지를 가공하지 않았다.
- 선택 화면 16종, 서버 선택 범위 0~15, 경기 상태의 캐릭터 보존, 연습 봇의 중복 없는 배정을 확장했다.
- 정원 8명과 캐릭터 개수 16개는 서로 독립적이다. 실제 참가 인원 수대로 한 줄에 표시한다.

검증: 도메인 15개 통과, Chrome 16종 선택·신규 캐릭터 경기 반영·모바일 스크롤·폭탄 바운스 통과. 독립 Firebase 에뮬레이터에서 새 ID의 중복 선택 방지, 캐릭터 선택→준비→경기→복귀 및 투표 검사 통과.

이전 랭킹 테스트 실패는 현재 작업본에서 해소되어 있었다. 해당 파일을 이 작업에서 수정하지 않고 직접 재검증했다. 동일 소스를 복사한 `/tmp/word-bomb-v4-check-uTnlJK`에서 검사 포트만 분리해 `npm run check` 전체 통과. 로그 `/tmp/word-bomb-v4-full-check.log`, 온라인 로그 `/tmp/word-bomb-v4-online.log`.

배포는 말폭탄 함수 1개와 게임 관련 Hosting 파일만 대상으로 하며 학생 데이터·보안 규칙·다른 게임은 변경하지 않는다.

## 운영 반영 완료

- `wordBombAction` 서울 리전 Node.js 22 업데이트 성공.
- Hosting `8b82b545d3811c89` 공개, 이전 버전 `65419bd99c258f76`. 말폭탄 관련 7개 파일 반영, 기존 다른 파일 394개와 설정 보존.
- 운영 Chrome 검사 통과: 16종 선택 버튼, 신규 ID 13 선택 유지, 8인 봇 경기, 실제 단어 전달, 새 이미지 로딩, 비로그인 서버 요청 거절. 학생 계정 간 대전은 독립 에뮬레이터에서 검증했으며 운영 학생 데이터에 쓰지 않았다.
- 운영: https://dj48-quiztown-firebase.web.app/word-bomb/
- 배포 이력: `release-16-characters-2026-09-16.json`.
