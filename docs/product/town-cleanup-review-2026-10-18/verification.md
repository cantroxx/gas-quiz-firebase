# 맵 정리 검증 기록

## 노란 점 원인
현재 사용자가 열어 둔 Safari 퀴즈타운 계정의 상점을 UI로 조회했다. 보유 아이템 1개, 선택한 아이템 영역의 “아직 착용한 아이템이 없어요.”를 확인했다. 구매·장착·염색 버튼은 누르지 않고 원래 타운 화면으로 돌아왔다.
`public/coordi-shop/dressing-room.js`의 상점 초기화는 status 응답의 `profile.look.equipped`로 화면 상태를 설정한다. 따라서 이번 화면은 장착 코디가 없는 상태와 일치한다. 노란 점은 기본 위치 표시이며, 구매와 장착은 별개다.
새 상태 API는 미장착(empty), 읽기/이미지 로딩 실패(error), 로딩(loading), 표시 완료(ready)를 구분한다. 내 상태 창에서 미장착 안내/상점 연결 또는 오류 안내/재시도를 제공한다. 운영 코디 데이터는 수정하지 않는다.

## 기능 검사
- 실제 index의 새 정보 상태/갱신 함수와 소셜 카운터 함수를 추출하여 합성 데이터로 연결. 접속 숫자·쪽지 수의 접근성 이름, 확성기 강조/해제, 갱신 중 아이콘 보존, 갱신 완료 소식 열기 검증.
- 내 상태 토끼 버튼 → 기존 실제 상태 iframe 경로/대화상자, Escape·초점 복귀, 미장착 안내의 상점 이동 검증.
- 1440/390/320px에서 맵 내부 아이콘 경계, 상태 대화상자 경계, 화면 넘침 검사.
- 퀘스트 창 토글 제거, 입장 즉시 보상 카드 표시, 수령 위임 유지. 반복 과녁 장식 숨김. 명예 전당 중복 제목 숨김.
- 보유 아이템/하보 꾸미기 버튼 없음, 기존 프로필·랭킹·칭호·뱃지 유지. housing 폴더/데이터는 건드리지 않음.
- 기존 보상 드롭다운 0/1/마지막 수령/계정 전환, 학교 경로, 아바타 계정 분리/늦은 응답/로그아웃/실패 복구 검사 통과.
- 전체 검증은 full-check.log, 마지막 CSS 정리 뒤 정적 검사는 final-static-check.log 참조.

## 이미지
내장 image_gen 도구로 생성. 원본 PNG의 투명도를 보존하며 192px WebP로 인코딩했다.
- `/Users/kdw/Projects/gas-quiz-firebase/public/images/town-controls-20261018/people.webp`
- `/Users/kdw/Projects/gas-quiz-firebase/public/images/town-controls-20261018/news.webp`
- `/Users/kdw/Projects/gas-quiz-firebase/public/images/town-controls-20261018/status.webp`
프롬프트 전문: `docs/product/TOWN_CONTROLS_IMAGE_PROMPTS_2026-10-18.json`.
