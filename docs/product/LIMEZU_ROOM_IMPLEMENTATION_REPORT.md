# LimeZu Room Implementation Report

## 1. 목적

LimeZu Modern Interiors 기반의 방꾸미기 기능은 먼저 독립 모듈로 완성하고, 이후 Firebase 퀴즈타운의 "내 방" 화면에 연결한다.

이번 단계의 목표는 운영 화면에 바로 섞는 것이 아니라 다음을 먼저 확정하는 것이다.

- LimeZu 에셋 기반 하우징 구현 방향
- 클린 아키텍처에 맞는 폴더와 책임 경계
- 독립 프로토타입에서 서비스 기능으로 이관하는 순서
- 추가 에셋이 필요한 시점
- Firebase 연결 전 데이터 모델 초안

## 2. 현재 상태

현재 LimeZu 실험본은 독립 페이지로 존재한다.

```text
public/prototypes/room-prototype-limezu.html
public/css/prototypes/room-prototype-limezu.css
public/js/prototypes/room-prototype-limezu.js
public/images/room-assets/limezu-modern-interiors/
```

Phase 1 진행 후에는 클린 아키텍처 경계를 반영한 새 독립 페이지도 추가했다.

```text
public/prototypes/room-limezu/index.html
public/prototypes/room-limezu/room-limezu.css
public/prototypes/room-limezu/room-limezu-demo.js
public/prototypes/room-limezu/fixtures/default-room.js
public/js/domain/room/
public/js/application/room/
public/js/features/room/
public/images/room-assets/limezu/
```

새 페이지는 기존 단일 JS 실험본과 같은 동작을 유지하되, 이동/충돌/렌더링/입력을 레이어별 파일로 분리한다.

확인된 동작:

- LimeZu `Generic Home 1` 완성 방 레이어 표시
- `Premade Character 20` 캐릭터 표시
- 방향키, WASD, 바닥 클릭 이동
- 일부 충돌 처리
- 동선 표시 토글
- 독립 페이지에서 정적 검사 통과

현재 한계:

- 방 전체가 완성 이미지 레이어 기반이다.
- 가구를 개별 배치/이동/삭제하는 편집기는 아직 아니다.
- 충돌맵은 수동 좌표 기반이다.
- 캐릭터 선택과 저장 기능은 아직 없다.
- Firebase 저장/불러오기는 연결하지 않았다.

따라서 지금 상태는 "하우징 느낌과 캐릭터 이동 검증용 1차 프로토타입"으로 본다.

## 3. 구현 원칙

### 3.1 독립 구현 우선

초기에는 퀴즈타운 운영 화면과 연결하지 않는다.

이유:

- 하우징 UI는 화면, 입력, 에셋, 저장 구조가 모두 크다.
- `public/index.html`은 아직 app shell이라 충돌 위험이 높다.
- 완성 전 운영 내비게이션에 붙이면 데이터 모델 변경 비용이 커진다.

따라서 먼저 독립 경로에서 완성한다.

```text
public/room/
```

또는 프로토타입 단계에서는 다음처럼 유지한다.

```text
public/prototypes/room-limezu/
```

최종적으로 운영 연결 시에는 `public/index.html`에 직접 로직을 넣지 않고, room bootstrap만 연결한다.

### 3.2 클린 아키텍처 유지

방꾸미기 기능은 다음 레이어로 나눈다.

| 레이어 | 책임 | Firebase/DOM 접근 |
| --- | --- | --- |
| Domain | 격자, 충돌, 배치 규칙, 에셋 타입 판정 | 없음 |
| Application | 방 로드, 저장, 배치 변경, 캐릭터 이동 usecase | 직접 접근 없음 |
| Infrastructure | Firestore/Storage/local fixture 읽기 | Firebase 가능 |
| Presentation | DOM 렌더링, 버튼, 포인터/키보드 입력 | DOM 가능 |
| Bootstrap | 독립 페이지 또는 퀴즈타운 app shell 연결 | 조립만 담당 |

## 4. 권장 폴더 구조

### 4.1 서비스 연결을 고려한 최종 구조

```text
public/js/domain/room/
  room-grid.js
  room-layout.js
  room-collision.js
  room-avatar.js

public/js/application/room/
  room-usecases.js
  room-editor-usecases.js
  room-avatar-usecases.js

public/js/infrastructure/room/
  room-repository.js
  room-asset-repository.js
  room-local-fixture-repository.js

public/js/features/room/
  room-state.js
  room-render.js
  room-controller.js
  room-input.js
  room-editor-panel.js
  room-asset-panel.js

public/js/app/
  room-bootstrap.js
```

설명:

- `domain/room`은 순수 계산만 담당한다.
- `application/room`은 domain과 repository를 조합한다.
- `infrastructure/room`은 Firestore, Storage, 로컬 JSON fixture를 읽는다.
- `features/room`은 화면 조작과 DOM 업데이트를 담당한다.
- `app/room-bootstrap.js`는 독립 페이지와 운영 app shell 양쪽에서 조립할 수 있게 둔다.

기존 프로젝트는 `public/js/features/shop-data.js`처럼 flat 파일도 사용하지만, 방꾸미기는 파일 수가 많아질 가능성이 높으므로 `features/room/` 하위 폴더를 권장한다.

### 4.2 에셋 구조

```text
public/images/room-assets/limezu/
  interiors/
    homes/
      generic-home-1/
        layer-1.png
        layer-2.png
        preview.png
    atlases/
      interiors-32x32.png
      room-builder-32x32.png
  characters/
    premade/
      premade-20.png
    frames/
      premade-20/
        down-0.png
        down-1.png
        left-0.png
        right-0.png
        up-0.png
  manifest.json
```

원칙:

- 원본 LimeZu 파일 전체를 `public`에 다 넣지 않는다.
- 실제 서비스에서 쓰는 파일만 선별해 복사한다.
- 원본 보관은 `private/vendor-assets/room-sources/inbox/` 또는 정리된 `private/vendor-assets/room-sources/extracted/`에 둔다.
- `public/images/room-assets/limezu/manifest.json`에서 공개 에셋만 관리한다.

### 4.3 독립 페이지 구조

프로토타입이 커지면 현재 단일 파일 구조를 다음처럼 정리한다.

```text
public/prototypes/room-limezu/
  index.html
  room-limezu.css
  room-limezu-demo.js
  fixtures/
    default-room.json
    asset-catalog.json
    avatar-catalog.json
```

단, 공통 room 모듈은 `public/js/.../room/` 아래에서 가져오고, `room-limezu-demo.js`는 독립 페이지 bootstrap만 담당한다.

## 5. 데이터 모델 초안

### 5.1 에셋 카탈로그

```js
{
  assetId: "limezu_generic_home_1_layer_1",
  provider: "limezu",
  pack: "modern_interiors",
  type: "roomLayer",
  name: "Generic Home 1 Layer 1",
  imagePath: "/images/room-assets/limezu/interiors/homes/generic-home-1/layer-1.png",
  width: 448,
  height: 428,
  tileSize: 32,
  scale: 2,
  enabled: true
}
```

가구 개별 배치형으로 확장할 때:

```js
{
  assetId: "limezu_bed_bunk_01",
  provider: "limezu",
  pack: "modern_interiors",
  type: "furniture",
  category: "bed",
  imagePath: "/images/room-assets/limezu/interiors/furniture/bed-bunk-01.png",
  tileWidth: 3,
  tileHeight: 3,
  collision: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  sortOffsetY: 2
}
```

### 5.2 방 상태

```js
{
  roomId: "default",
  ownerId: "local-demo",
  baseSceneId: "limezu_generic_home_1",
  tileSize: 32,
  renderScale: 2,
  avatar: {
    avatarId: "limezu_premade_20",
    x: 4,
    y: 5,
    dir: "down"
  },
  placements: [
    {
      placementId: "rug_01",
      assetId: "limezu_rug_01",
      x: 5,
      y: 4,
      rotation: 0,
      locked: false
    }
  ],
  collisionOverrides: []
}
```

### 5.3 Firebase 연결 시 컬렉션 후보

```text
roomAssets/{assetId}
roomScenes/{sceneId}
users/{uid}/rooms/{roomId}
users/{uid}/ownedRoomAssets/{assetId}
users/{uid}/avatarSettings/default
```

초기에는 Firestore 없이 로컬 fixture JSON으로 같은 구조를 사용한다. 이후 repository만 교체하면 된다.

## 6. 구현 단계

### Phase 1. 독립 모듈 정리

목표:

- 기존 `room-prototype-limezu.*`를 유지하되, 핵심 로직을 room 모듈로 분리한다.
- Firebase와 운영 화면 연결은 하지 않는다.

작업:

1. `public/js/domain/room/` 생성
2. 격자, 충돌, 경로 탐색, 방향 계산 분리
3. `public/js/application/room/` 생성
4. 이동, 리셋, 배치 변경 usecase 분리
5. `public/js/features/room/` 생성
6. DOM 렌더링과 입력 처리 분리
7. `public/prototypes/room-limezu/index.html`에서 위 모듈을 조립

검증:

- `npm run check:static`
- 브라우저에서 방 표시, 방향키 이동, 클릭 이동, 충돌 확인

### Phase 2. 에셋 manifest와 fixture 도입

목표:

- JS 하드코딩을 줄이고 JSON으로 에셋/방 상태를 읽는다.

작업:

1. `public/images/room-assets/limezu/manifest.json` 작성
2. `public/prototypes/room-limezu/fixtures/default-room.json` 작성
3. `room-local-fixture-repository.js` 작성
4. 방 상태와 에셋 목록을 fixture로부터 렌더링

검증:

- fixture만 바꿔도 방 구성이 바뀌는지 확인
- 없는 에셋 ID에 대한 fallback 확인

### Phase 3. 하우징 편집 모드

목표:

- 보기 전용 방에서 "방꾸미기" 기능으로 확장한다.

필수 기능:

- 에셋 목록 패널
- 가구 배치
- 가구 선택
- 이동
- 삭제
- 충돌 미리보기
- 저장 전 로컬 상태 변경
- 초기화

추가 기능 후보:

- 회전
- 레이어 순서 조정
- 방 템플릿 선택
- 캐릭터 선택

### Phase 4. Firebase 연결 준비

목표:

- 로컬 fixture repository를 Firestore repository로 교체할 수 있게 만든다.

작업:

1. `room-repository.js`에서 Firestore read/write adapter 작성
2. `room-asset-repository.js`에서 `roomAssets` 읽기
3. `room-usecases.js`는 repository 인터페이스만 사용
4. 저장 실패 시 로컬 상태 유지와 오류 표시 정책 작성

검증:

- emulator 또는 dry-run 테스트 우선
- 운영 Firestore 직접 쓰기는 별도 승인 전까지 금지

### Phase 5. 퀴즈타운 연결

목표:

- `public/index.html`에 최소 hook만 추가한다.
- 실제 room 로직은 room 모듈 내부에 둔다.

연결 방식:

```text
public/index.html
  -> 내 방 버튼/섹션 진입
  -> window.DJ48RoomBootstrap.startRoom(...)
  -> room controller/usecase/repository 조립
```

주의:

- `public/index.html`에 방 이동/배치/저장 로직을 직접 넣지 않는다.
- app shell은 진입점과 dependency assembly만 담당한다.
- 운영 연결 전에는 `npm run check`와 브라우저 smoke가 필요하다.

## 7. 추가 에셋 필요 여부

현재 받은 LimeZu Modern Interiors 유료판만으로 가능한 것:

- 실내 방 완성 이미지 기반 프로토타입
- 여러 완성 방 샘플 선택
- 프리메이드 캐릭터 이동
- 캐릭터 후보 선택
- 제한적인 방꾸미기 UI
- 개별 가구 일부 추출을 통한 배치형 편집기

추가 에셋이 필요한 경우:

| 목표 | 필요한 에셋 |
| --- | --- |
| 집 밖 마당까지 구현 | LimeZu Modern Farm |
| 마을/거리 이동까지 구현 | LimeZu Modern Exteriors |
| 농장형 플레이어 캐릭터 | Modern Farm의 Farmer Generator |
| 완전한 캐릭터 커스터마이징 | Character Generator 출력 캐릭터를 여러 벌 export |
| 가구를 전부 개별 배치 가능하게 만들기 | Modern Interiors의 single files 또는 atlas에서 가구 추출 작업 |

지금 단계에서는 추가 구매가 필수는 아니다.

먼저 Modern Interiors 안의 다음 자료를 더 활용한다.

```text
moderninteriors-win/1_Interiors/
moderninteriors-win/2_Characters/Character_Generator/0_Premade_Characters/
moderninteriors-win/6_Home_Designs/
```

추가 에셋 요청 기준:

1. 외부 공간이 필요해지면 Modern Exteriors 또는 Modern Farm 요청
2. 농장/작물/동물 루프가 필요해지면 Modern Farm 요청
3. 캐릭터 커스터마이징 결과물이 필요해지면 Character Generator에서 export한 PNG 요청

## 8. 다음 작업 제안

바로 다음 구현은 Phase 1로 제한한다.

작업 범위:

- 새 room 폴더 생성
- 기존 LimeZu 프로토타입의 이동/충돌/렌더링 로직을 모듈화
- 독립 페이지를 `public/prototypes/room-limezu/index.html`로 정리
- 기존 `room-prototype-limezu.html`은 비교용으로 잠시 유지
- Firebase 연결은 하지 않음

완료 기준:

- 기존 LimeZu 화면과 동일하게 보임
- 방향키/WASD/클릭 이동 유지
- 충돌 유지
- `npm run check:static` 통과
- 브라우저 직접 검증 완료

## 9. 보류 항목

다음은 보고서 작성 시점에서는 하지 않는다.

- 운영 `public/index.html` 연결
- Firestore write
- Storage 업로드
- 구매/보유 에셋 연동
- 배포
- 커밋
- 레거시 Apps Script 파일 수정
