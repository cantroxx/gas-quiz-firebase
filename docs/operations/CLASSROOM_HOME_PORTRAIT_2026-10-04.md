# 교실 홈과 학생 이미지 선택 — 2026-10-04

## 구현

- 교실 홈을 아이보리·그린 색상, 데스크톱 왼쪽 탐색, 모바일 메뉴, 오늘 할 일, 성장, 학급 목표, 소식으로 구성했다. 실제 데이터와 기존 동작을 유지한다.
- 교사 홈의 학생 목록, 학생 홈의 본인 이미지, 학생 카드에 같은 사진/아바타 선택을 적용한다. 미설정·이미지 오류 시 이름 첫 글자를 표시한다.
- 학생은 홈 또는 본인 학생 카드의 **이미지 바꾸기**에서 업로드한 사진과 마켓 아바타를 선택한다. 새 사진은 JPG/PNG/WebP, 최대 2MB이며 중앙을 정사각형으로 표시한다.
- 기존 프로필 사진과 자르기 설정을 초기값으로 이용한다. 선택은 교실 전용이다.
- 마켓 아바타는 `coordiProfiles`의 구매·저장한 코디 및 염색으로 만든 PNG를 저장한다. 미리 입어보기 조합은 사용하지 않는다. 코디를 변경한 뒤에는 **저장한 코디 불러오기**로 갱신한다.
- 사진과 아바타를 각각 보관해 다시 업로드하지 않고 전환한다. 설정을 취소하면 업로드하지 않는다. 저장 실패 후 재시도는 이미 업로드한 경로를 재사용한다.

## 데이터 및 서버

- 새 callable: `classroomPortraitAction` (`status`, `save`). 로그인 계정 연결과 학급 범위를 기존 서버 헬퍼로 확인한다.
- 저장 필드: `classrooms/{classId}/studentProfiles/{memberId}.portrait`에 `source`, `photo`, `avatar`. 기존 배지·키링 필드는 병합으로 보존한다.
- 이미지 파일은 기존 허용된 `profileImages/{authUid}/{memberId}_classroom_{source}_…` 경로를 사용한다. 서버에서 경로·회원·파일 종류·크기·메타데이터를 검증하고 다운로드 URL을 구성한다.
- `getClassroomStudentCards`의 프로필 이미지 반환 부분에만 선택 이미지를 연결했다. 보안 규칙, 포인트, DJ코인, 랭킹 및 기존 학생 데이터의 일괄 수정은 없다.
- 교실 저장 후 전체 프로필 사진이나 마켓 코디를 덮어쓰지 않는다.

## 검증

- `npm run check` 전체 통과: 정적 검사, 기존 도메인·애플리케이션·저장소·게임 테스트, Firebase demo 규칙 테스트, 공개 페이지 smoke, 교실 화면 테스트.
- `tests/classroom/portrait.test.js`: 계정·학급 범위, 다른 사용자 경로 거부, 파일 검증, 이미지 전환, 기존 자르기·배지 보존, 전체 프로필 격리, 소유 코디 및 염색 변환.
- `scripts/smoke/classroom-ui-browser.js`: 학생/교사 76개 화면·크기 조합, 이미지 선택창 1440/390/320px, 업로드·아바타·전환·저장 재시도·불러오기 재시도·계정 변경 거부·키보드 닫기·포커스 복원.
- 운영 소스를 기준으로 만든 최종 Hosting 후보에서도 같은 브라우저 검증 통과.
- 테스트는 합성 계정과 오프라인 응답을 이용했다. 운영 학생의 이미지 설정을 임의 변경하지 않았다.

## 배포 구성

- 로컬에 다른 기능의 미배포 변경이 있어 전체 배포하지 않았다.
- `scripts/maintenance/prepare-classroom-home.js`: 현재 `getClassroomStudentCards` 배포 소스를 내려받아 이미지 반환 한 곳과 새 callable만 추가. 인증 헬퍼 일치 확인. 마켓 카탈로그도 현재 배포본과 일치 확인.
- Functions 대상: `classroomPortraitAction`, `getClassroomStudentCards` 두 개.
- `scripts/maintenance/publish-classroom-home.js`: 현재 Hosting 버전을 복제하고 HTML의 이미지 편집 연결, 교실 모듈, 교실 CSS, 장식 이미지 두 개, 해당 모듈만 교체한 번들을 반영. 나머지 파일과 Hosting 설정 해시를 검증한다.
- 상세 후보·검사 로그·배포 영수증: `/tmp/classroom-home-20261004/`.
- 운영 배포 완료: Hosting `ba19063cc0197e83` (이전 `6a8063172b91962d`). 교실 관련 8개 파일만 변경하고 나머지 3,772개 파일과 Hosting 설정을 보존했다.
- 운영 주소에서 변경 파일 8개의 SHA-256 일치 확인. 두 함수 모두 `ACTIVE`, 비로그인 요청 모두 HTTP 401 확인.
- 새 이미지의 실제 운영 저장은 학생 본인이 선택할 때 수행한다. 로그인된 학생의 설정을 테스트 목적으로 변경하지 않았다.

## 이미지

- 내장 ImageGen으로 새싹 독서와 학급 목표용 책나무 그림을 생성했다. 학생 사진/아바타와 구분되는 장식용이다.
- 프로젝트 파일: [독서 새싹](/Users/kdw/Projects/gas-quiz-firebase/public/images/classroom/reading-sprout.png), [학급 책나무](/Users/kdw/Projects/gas-quiz-firebase/public/images/classroom/community-tree.png).
- 내장 ImageGen 생성 프롬프트: [home-art-prompts.json](/Users/kdw/Projects/gas-quiz-firebase/docs/product/classroom-ui-reference-2026-10-04/home-art-prompts.json).
- 합성 계정으로 촬영한 구현 화면: [미리보기](/Users/kdw/Projects/gas-quiz-firebase/docs/product/classroom-home-2026-10-04/index.html).
