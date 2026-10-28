# 퀴즈타운 온라인 배포 · 2026-10-15

## 접속

학교 → 게임 아지트 → 숨빛 → 맵 선택. 직접 주소: https://dj48-quiztown-firebase.web.app/sumbit/

- 과자 숲: https://sumbit-candy-lvgwneybea-du.a.run.app/
- 창작 정원: https://sumbit-workshop-lvgwneybea-du.a.run.app/

교사가 맵에서 새 교실을 만들고 학생에게 해당 맵의 QR 또는 코드 제공. 학생 2명 이상 준비 후 시작. 맥의 로컬 서버는 필요 없다. 다른 맵의 코드는 사용할 수 없다. 퀴즈타운 로그인/랭킹/코인과는 별도이며 이름·번호로 입장한다.

## 배포 구성

기존 dj48-quiztown-firebase 프로젝트, Cloud Run 서울 asia-northeast3. sumbit-candy와 sumbit-workshop 각각 1 vCPU / 1GiB, 최소 0·최대 1 인스턴스(서비스 및 revision 설정), 동시 요청 1000, 연결 제한 시간 3600초. HTTPS/WSS 사용. 전용 sumbit-runtime 계정은 새로 생성하고 프로젝트 역할을 부여하지 않았다. 공개 invoker 권한은 두 게임 서비스에만 적용했다.

방은 메모리에 보관한다. 서버 재시작·축소·새 배포 시 방과 점수/그림이 사라진다. 최대 1 설정은 다중 서버 영속 저장을 대신하지 않으며 플랫폼 교체 중 연속성도 보장하지 않는다. 장시간 학급 플레이와 실제 태블릿 22대의 성능은 현장 검증 대상이다. 연결이 열려 있으면 Cloud Run 사용 비용이 발생할 수 있다. [Cloud Run WebSocket 운영 문서](https://docs.cloud.google.com/run/docs/triggering/websockets).

빌드: d49525bf-45ff-4adf-8e95-de7c3af3c6e3, SUCCESS.
이미지: asia-northeast3-docker.pkg.dev/dj48-quiztown-firebase/sumbit/game:20261015
Digest: sha256:23e680a01177737150bf2d0a2a7da30563830d9c60ac054bf6495e8bae127076
전용 비공개 소스 버킷 dj48-quiztown-firebase-sumbit-build는 7일 수명 정책. 소스 tar는 Dockerfile, package 파일, 루트 mjs, public만 포함한다. 첫 빌드는 바이너리 업로드 방식 오류로 실패했고 스트림 전송으로 수정 후 성공했다.

scripts/deploy-cloud.cjs는 이번 최초 배포의 실행 기록이다. 준비/빌드/상태/서비스 생성/공개 단계가 분리되어 있으며 다음 배포 시 새 이미지 태그와 기존 서비스 revision 업데이트 방식으로 수정해야 한다. 기존 서비스에 deploy 모드를 다시 실행하면 이름 충돌한다.

## 퀴즈타운 부분 배포

운영본을 복제하고 아래 3개 파일만 변경했다. 다른 운영 파일 3,780개와 Hosting 설정은 보존했다. 로컬 저장소의 관련 없는 미배포 변경을 함께 배포하지 않았다.

- /js/school-rooms.js: 함께 하기 분류에 숨빛 카드 추가.
- /index.html: school-rooms.js의 캐시 버전만 sumbit-20261015로 변경.
- /sumbit/index.html: 두 맵 선택과 입장/조작 안내.

새 버전 sites/dj48-quiztown-firebase/versions/4b5f27e716ba7c70. 직전 버전 projects/584571538436/sites/dj48-quiztown-firebase/versions/94c428f45c154e41. 배포 영수증은 hosting-release-2026-10-15.json. 롤백 시 이 사이 다른 배포가 있었는지 먼저 확인하고 필요한 변경만 되돌린다.

scripts/publish-quiztown.cjs는 기존 운영 manifest 복제·부분 업로드·전체 파일 및 설정 보존 검증·운영 버전 변경 감지 후 공개한다. 배포 후보와 계획은 /tmp/sumbit-hosting에 저장했다. 임시 폴더는 영구 보관소가 아니다.

## 검증

- 숨빛 npm test: 66개 통과.
- 퀴즈타운 npm run check: 수정 전후 전체 통과(정적/도메인/애플리케이션/인프라/게임/규칙 에뮬레이터/공개 화면/교실 UI).
- 실제 배포 주소에서 두 맵 각각 합성 학생 22명과 교사: WSS 입장, HTTPS QR 주소, 색칠 전파, 22개 이동 응답, 재접속 그림 복원, 라운드 시작/종료 통과. online-smoke-2026-10-15.jsonl 참조. 한 Mac에서 실행한 짧은 프로토콜 검사이며 실제 22대 장시간 부하 인증이 아니다.
- 브라우저에서 두 맵 준비 완료, 맵 선택 링크 이동 확인. 창작 정원 페이지 오류 없음.
- 배포 후보 school-rooms.js를 사용하는 격리 화면에서 전체/함께 하기 필터와 숨빛 카드 확인. 운영 로그인 세션으로 학교 내부를 직접 탐색한 검증은 하지 않았다.
- 공개 뒤 3개 파일을 HTTPS로 다시 받아 후보 SHA-256과 일치 확인. 운영 맵 선택 페이지 화면은 quiztown-online-2026-10-15.png.

원본 게임·배포 스크립트·시험 결과·화면은 ../meccha 저장소에 보관되어 있습니다. 이 문서의 scripts/ 및 단순 파일명은 meccha 저장소 기준입니다.
