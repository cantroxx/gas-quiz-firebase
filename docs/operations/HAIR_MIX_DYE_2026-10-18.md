# 헤어 믹스염색 변경 · 2026-10-18

사용자 요청: 헤어만 메이플 방식의 믹스염색으로 수정하고 배포. 의상 프리즘은 유지.

## 구현

- 검정·빨강·주황·노랑·초록·파랑·보라·갈색 중 베이스와 믹스 색을 각각 선택한다.
- 믹스 비율 0~99%, 1% 단위. 베이스는 `100 - mixRate`로 표시한다. 숫자 입력과 비율 바가 동기화된다.
- 단색은 원하는 베이스 색과 믹스 0%로 설정한다. 메애기 실제 컨트롤의 상한이 99%이며, 100% 요청은 단색과 같은 결과를 보장하지 않으므로 허용하지 않는다.
- 메애기 드레스룸의 native `itemPrism.hair = {baseColor, mixColor, mixRate}` 형식을 사용한다. RGB/HSL 근사 합성을 추가하지 않는다.
- 헤어 선택 시 의상용 색조·채도·명도·원본색 컨트롤을 숨긴다. 의상과 스킨 컨트롤은 유지한다.
- 기존 `coordiProfiles.prisms[itemId]` 위치에 새 헤어 값을 저장한다. 기존 `hairColor` + HSL 값은 그대로 읽고 렌더링하며, 사용자가 새 염색을 적용할 때만 해당 헤어 값을 바꾼다.
- 무료 적용·미리보기 취소·원색 복원·재접속 유지·드레스룸 저장 차단을 유지한다.
- 마을과 교실의 기존 아바타 경로는 native 혼합값을 그대로 전달하므로 해당 코드를 변경하거나 재배포하지 않는다.

## 운영 차이와 배포 범위

점검 당시 상점 화면 4개 파일은 로컬과 운영이 일치했다. 앱 공통 index에는 다른 퀴즈·교실 작업 차이가 있어 배포 대상에서 제외했다. 상점 함수에는 로컬에만 있는 미리보기 권한 도우미 차이가 있어, 다운로드한 운영 함수 소스에서 헤어 정규화·원색 판별·버전 식별자만 이식했다.

- Hosting: `coordi-shop/index.html`, `dressing-room.js`, `dressing-room.css`, `town-bridge.js` 4개.
- Functions: `coordiShopAction` 1개. 다른 Functions·규칙·인덱스·설정은 변경하지 않는다.
- 학생 실데이터 직접 수정·마이그레이션은 하지 않는다.
- 운영 파일 해시와 설정을 보존하는 `scripts/maintenance/publish-hair-mix.js` 및 함수 한정 배포 `scripts/maintenance/deploy-hair-mix.js` 사용.

## 검증

- 메애기 공개 드레스룸 UI와 공개 소스에서 8색·`baseColor/mixColor/mixRate`·0~99% 확인: <https://meaegi.com/dressing-room>
- 합성 코디의 실제 렌더링으로 비율별 이미지 변화 및 0% 단색 일치 확인.
- 기존 HSL 렌더링 테스트와 native 혼합값의 마을/교실/미리보기 전달 테스트.
- 데모 Firestore에서 실제 배포 후보의 저장·재조회·잘못된 색/범위/소수/문자열 거부·미보유 거부·잔액/쿠폰 무차감·다른 부위 유지·원색 복원 검사.
- 실제 Hosting 후보 브라우저에서 8색 선택, 비율/숫자 동기화, 미리보기 무저장, 취소, 저장, 새로고침, 원색 복원, 기존 HSL 보존 후 명시적 적용, 모바일과 무료 드레스룸 검사.
- 실제 렌더러 연결 로컬 메모리 상점의 검정 37%·갈색 63% 미리보기 확인: `hair-mix-2026-10-18/preview.png`.
- 전체 `npm run check` 통과(exit 0). 기본 포트가 다른 작업과 충돌하여 별도 데모 포트 설정으로 실행했다. 마지막 교과 브라우저 검사 49개 단원·2,502개 화면까지 통과했다.

## 배포 결과

배포 완료.

- Hosting 버전: `sites/dj48-quiztown-firebase/versions/5a2cb873a4256a98`
- 이전 버전: `projects/584571538436/sites/dj48-quiztown-firebase/versions/a8ecb2fe3b34963e`
- 공개 release: `projects/584571538436/sites/dj48-quiztown-firebase/channels/live/releases/1792306040852000`
- 화면 파일 4개 반영, 다른 4,097개 파일과 Hosting 설정 보존.
- 함수: `coordiShopAction`, `coordishopaction-00006-god`, ACTIVE.
- 서비스 계정·메모리·타임아웃·동시성·환경 설정 보존 확인.
- 배포 소스를 다시 내려받아 검증된 commerce 소스와 바이트 일치 확인. index 진입점은 이전 운영본과 동일.
- 비로그인 함수 호출 HTTP 401 확인. 실제 학생 계정으로 거래하는 운영 테스트는 하지 않았다.
- 공개 Hosting의 전체 매니페스트·설정과 변경 파일 해시 일치 확인.
- 영수증: `hair-mix-2026-10-18/deployment.json`. 검사 로그와 테스트 화면을 같은 폴더에 보관.
- 열린 상점이 이전 UI를 표시하면 퀴즈타운을 새로고침한 뒤 상점을 다시 연다.

