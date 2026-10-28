# 타운 아바타·모바일·우체통 배포 보고

운영: https://dj48-quiztown-firebase.web.app
배포 버전: `0c9342e1af0bfaa8` (이전 `1bb4f18aeaecc7bf`)

## 아바타 확인 및 보완

요청 계정의 코디 문서 한 건을 읽기 전용 조회했다. 헤어는 보유 중이지만 저장된 `look.equipped`가 빈 객체였다. 옷이 필요해서 표시되지 않는 것이 아니다. 해당 계정에서 헤어를 선택한 다음 **내 코디로 장착**을 눌러야 마을에 적용된다. 실제 계정의 코디·재화는 수정하지 않았다.

상점에 입어보기/마을 적용 상태를 명시하고, 구매 완료 뒤 장착 저장 안내를 추가했다. 장착·염색 저장 성공 시 맵 아바타를 즉시 갱신한다. 이전 조회가 진행 중일 때 저장 갱신이 누락되던 경로도 보완했다.

헤어 단독 합성 코디를 실제 이미지 렌더러에 요청하여 캐릭터 생성 성공을 확인했다. 이 결과를 브라우저 검사에도 사용했다. 이는 실제 계정에 장착을 실행한 검사가 아니다.

## 화면 변경

- 맵 좌하단 우체통으로 기존 문의하기 버튼을 이동했다. 기존 문의 창 및 전송 기능을 그대로 연결하고 중복 버튼은 남기지 않았다.
- 모바일 320/390px에서 맵 아래 내 집·학교·상점·랭킹 광장·이벤트 광장 5개 이동 버튼을 유지했다. 넓은 화면에서는 맵 건물로 이동한다.
- 우체통 터치 영역은 모바일 46px, 데스크톱 56px이며 맵 확대/스크롤 영역 바깥에 고정했다.

[모바일 화면](town-avatar-mail-deploy-2026-10-18/town-390.png) · [320px 화면](town-avatar-mail-deploy-2026-10-18/town-320.png)

## 검증 및 배포 범위

- `npm run check` 성공: 정적/도메인/애플리케이션/에뮬레이터 규칙/화면 검사, 교과 퀴즈 1,584개 화면 등.
- 운영본으로 구성한 후보에서 맵 전체, 헤어 단독·빈 장착·계정 전환·늦은 응답·저장 시 갱신, 실제 상점 브리지, 무료 드레스룸 무거래, 문의 창, 공개 셸 검사 성공.
- 운영 공개 로그인 1440/390/320px, 이미지/모듈 로딩, 페이지 오류 없음 확인. 인증된 내부 화면 검증은 합성 계정으로 수행했다.
- 최신 운영본의 교과 퀴즈 후속 변경을 보존했다. Hosting 파일 8개만 변경하고 기존 3,991개 파일 및 Hosting 설정을 보존했다. Functions·보안 규칙·학생 데이터 변경 없음.
- 운영 버전 전체 파일 목록, 설정, 변경 파일 8개의 공개 응답 해시 일치 확인.

[배포 영수증](TOWN_AVATAR_MAIL_DEPLOY_2026-10-18.json) · [단계별 계획](../product/TOWN_AVATAR_MAIL_PLAN_2026-10-18.md) · [검증 기록](../product/town-avatar-mail-review-2026-10-18/verification.md)

## 이미지 제작

내장 `image_gen` 사용. 생성된 투명 PNG를 보존하고 192px WebP로 축소했다.

- 최종 파일: `/Users/kdw/Projects/gas-quiz-firebase/public/images/town-controls-20261018/mailbox.webp`
- 원본: `/Users/kdw/Projects/gas-quiz-firebase/docs/product/town-avatar-mail-review-2026-10-18/mailbox-original.png`
- 정확한 생성 프롬프트: [TOWN_MAILBOX_IMAGE_PROMPT_2026-10-18.json](../product/TOWN_MAILBOX_IMAGE_PROMPT_2026-10-18.json)
