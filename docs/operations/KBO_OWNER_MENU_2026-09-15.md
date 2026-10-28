# KBO Owner 온라인 대전 메뉴 연결

- 요청: “kbo owner 게임도 온라인 대전에 연결해봐. 배포까지 진행”.
- 학교 → 온라인 대전(`/battle/`)에 **프로야구 구단주** 카드를 추가했다. 기존 운영 주소 <https://kbo-owner.vercel.app/>로 이동한다.
- 카드에 `1인 구단 운영 · KBO Owner`를 표시했다. 이번 연결은 게임 진입 링크이며 실시간 멀티플레이나 퀴즈타운 계정·랭킹 연동을 추가하지 않았다. 독립 게임의 localStorage 저장과 운영 도메인을 유지한다.
- 변경 소스: `public/battle/index.html`. KBO 게임 소스·학생 데이터·Functions·Rules 수정 없음. commit·push 없음.

## 검증과 배포

- `npm run check` 전체 통과: 정적·도메인·애플리케이션·인프라·분수·Emulator Rules·운영 공개 화면.
- 배포 준비본의 데스크톱 1280px·모바일 390px 카드 표시·가로 넘침 없음·링크 클릭·실제 게임 시작 버튼·pageerror 없음 확인.
- 작업 시작 당시 온라인 대전 메뉴의 로컬 안내 문구 한 줄이 운영과 달랐다. 기존 미배포 문구를 포함하지 않고 운영 메뉴에 KBO 카드만 추가했다. 다른 작업의 미커밋 변경은 보존했다.
- Hosting 360개 파일 중 `/battle/index.html`만 교체하고 나머지 359개 파일 해시를 보존했다. 릴리스 직전 운영 버전이 바뀌지 않았는지 검사했다.
- 배포 시각: 2026-09-15 13:34 KST. 이전 버전 `1784c66404e13ca8` → 새 버전 `4f384d3e54a2930f`.
- 배포 영수증: `/tmp/kbo-entry-release.json`. 배포된 메뉴와 준비본 바이트 일치 확인.
- 배포 후 운영 메뉴에서도 PC·모바일 표시, KBO 카드 클릭 후 게임 시작 버튼 표시, pageerror 없음 재확인. 캡처: `/tmp/kbo-entry-live-1280.png`, `/tmp/kbo-entry-live-390.png`.
