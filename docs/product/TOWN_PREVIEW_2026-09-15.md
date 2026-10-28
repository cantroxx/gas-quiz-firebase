# 퀴즈타운 마을 UI 체험판

## 확인 방법

프로젝트 루트에서 `python3 -m http.server 5328 --bind 127.0.0.1 --directory public` 실행 후 <http://127.0.0.1:5328/town-preview/> 접속.

- A: 선명하고 발랄한 마을, B: 부드러운 그림책 마을
- 건물 클릭 → 짧은 이동 연출 → 장소 진입
- 학교 퀴즈 → 체험 코인 획득 → 상점 소품 구매 → 내 집 선반 배치
- 모바일 가로 스크롤 지도, 빠른 장소 이동, 움직임 줄이기 설정 지원

## 적용 범위

`public/town-preview/`에 분리한 디자인·상호작용 검토용 체험판이다. 운영 메뉴에 연결하거나 배포하지 않았다. Firebase에 접근하지 않으며, 체험 기록은 브라우저 localStorage의 `dj48-village-design-preview-v1`에만 저장한다.

전체 마을 그림에 HTML 버튼을 겹치는 구조라 기존 퀴즈타운의 장소 이동과 연결할 수 있다. 운영 적용 시 장소별 기존 진입 함수를 연결하고, 실제 사용자 정보와 접근 권한을 기존 흐름으로 유지해야 한다. 현재 가구 배치는 선반의 소품 표시로 동작하며 기존 방 꾸미기 기능을 대체하지 않는다.

다음 단계에서는 그림체를 확정하고 건물·캐릭터를 개별 이미지로 분리해 움직임과 계절 장식을 확장한다. 운영 적용 전에 이미지 용량 최적화, 실제 장소 연결, 로그인·뒤로 가기·모바일 검증 및 전체 `npm run check`가 필요하다.

## 이미지와 생성 기록

이미지 5장은 built-in image_gen으로 생성했다. 최종 프롬프트 및 원본 경로는 [생성 기록](TOWN_PREVIEW_IMAGE_PROMPTS_2026-09-15.json)에 있다.

- [A 마을](../../public/town-preview/assets/village-a.png)
- [B 마을](../../public/town-preview/assets/village-b.png)
- [학교](../../public/town-preview/assets/school.png)
- [상점](../../public/town-preview/assets/shop.png)
- [내 집](../../public/town-preview/assets/home.png)

## 검증

`node scripts/smoke/town-preview-browser.js`로 이미지 로드, 장소 이동, 퀴즈 정답 보상 중복 방지, 구매·배치·저장, 모바일 지도, 움직임 줄이기 및 Firebase 요청이 없음을 확인했다.
