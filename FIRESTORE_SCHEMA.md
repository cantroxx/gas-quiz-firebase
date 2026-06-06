# Firestore 스키마 설계 초안

## 1. 설계 원칙

Firestore 연결은 정적 프로토타입이 충분히 점검된 뒤 단계적으로 진행한다.

핵심 원칙:

- 학생 데이터는 최소화한다.
- 클라이언트가 경제, 보상, 랭킹 값을 직접 조작하지 못하게 한다.
- 보상, 랭킹, 구매는 서버 검증이 필요하다.
- 초기에는 읽기 전용 카탈로그부터 연결한다.
- 사용자별 쓰기 작업은 중복 지급 방지와 하루 상한 검증이 준비된 뒤 제한적으로 테스트한다.
- 운영본 GAS 데이터와 Firebase 실험본 데이터를 섞지 않는다.

서버 검증 후보:

- Firebase Functions
- Apps Script 중간 API
- 교사용 관리자 도구에서만 실행되는 검증 로직

## 2. 컬렉션 설계 요약

| 컬렉션 | 목적 | 첫 연결 권장 |
| --- | --- | --- |
| `users` | 사용자 기본 프로필 | 낮음 |
| `userEconomy` | 사용자별 DJ코인/경험치 | 중간 |
| `rewardLogs` | 보상 지급 이력 | 중간 |
| `shopItems` | 상점 아이템 카탈로그 | 높음 |
| `userInventory` | 사용자별 보유 아이템 | 중간 |
| `quests` | 퀘스트 정의 카탈로그 | 높음 |
| `userQuests` | 사용자별 퀘스트 진행도 | 중간 |
| `classMissions` | 학급 공동 미션 | 중간 |
| `rankings` | 랭킹 집계 결과 | 낮음 |
| `assetCatalog` | 이미지/에셋 카탈로그 | 높음 |

## 3. 컬렉션별 필드 예시

### `users`

사용자 기본 프로필 문서.

문서 ID 전략:

- `users/{userId}`
- `userId`는 인증 사용자 ID 또는 운영본 학생 ID와 매핑되는 내부 ID

필수 필드:

- `userId`
- `nickname`
- `classId`
- `schoolName`
- `role`
- `createdAt`
- `updatedAt`

선택 필드:

- `avatarItemId`
- `mainTitleId`
- `mainBadgeId`
- `displayOptions`

시간 필드:

- `createdAt`: 최초 생성 시
- `updatedAt`: 프로필 수정 시

주의:

- 실명, 전화번호, 보호자 정보 등은 저장하지 않는다.
- 운영본 학생 정보와 연결이 필요하면 별도 매핑 설계를 먼저 둔다.

### `userEconomy`

사용자별 DJ코인, 경험치, 일일 획득량 문서.

문서 ID 전략:

- `userEconomy/{userId}`

필수 필드:

- `userId`
- `coin`
- `exp`
- `dailyEarnedCoin`
- `dailyCoinLimit`
- `dailyLimitDate`
- `updatedAt`

선택 필드:

- `lifetimeEarnedCoin`
- `lifetimeSpentCoin`
- `lastRewardAt`
- `manualAdjustmentNote`

시간 필드:

- `createdAt`: 선택
- `updatedAt`: DJ코인/경험치 변경 시 필수

주의:

- 클라이언트 직접 쓰기 금지.
- 보상 지급, 구매 차감은 검증된 서버 흐름에서만 처리한다.

### `rewardLogs`

보상 지급 이력과 중복 지급 방지 문서.

문서 ID 전략:

- `rewardLogs/{rewardLogId}`
- 또는 중복 방지를 위해 `rewardLogs/{dedupeKey}`

필수 필드:

- `userId`
- `rewardType`
- `sourceType`
- `sourceId`
- `coinDelta`
- `expDelta`
- `dedupeKey`
- `dailyLimitApplied`
- `serverVerified`
- `createdAt`

선택 필드:

- `quizId`
- `modeId`
- `correctCount`
- `classId`
- `note`

시간 필드:

- `createdAt`: 지급 시 필수
- `updatedAt`: 보통 불필요. 보정 로그가 필요하면 별도 문서로 남긴다.

중복 키 예시:

- `practice:{userId}:{quizId}:{yyyyMMdd}:complete`
- `practice-correct:{userId}:{quizId}:{yyyyMMdd}:{questionId}`
- `ranking:{userId}:{yyyyMMdd}:{attemptIndex}`
- `quest:{userId}:{questId}:{periodKey}`

### `shopItems`

상점 아이템 카탈로그.

문서 ID 전략:

- `shopItems/{itemId}`

필수 필드:

- `itemId`
- `category`
- `name`
- `desc`
- `price`
- `priceType`
- `enabled`
- `sortOrder`
- `createdAt`
- `updatedAt`

선택 필드:

- `imageUrl`
- `assetId`
- `rarity`
- `seasonId`
- `limitedUntil`

시간 필드:

- `createdAt`: 아이템 등록 시
- `updatedAt`: 가격, 노출 상태, 설명 변경 시

주의:

- 초기 연결은 읽기 전용으로 시작한다.
- 가격 변경은 관리자만 가능해야 한다.

### `userInventory`

사용자별 보유 아이템.

문서 ID 전략:

- `userInventory/{userId}_{itemId}`
- 또는 `users/{userId}/inventory/{itemId}`

필수 필드:

- `userId`
- `itemId`
- `acquiredAt`
- `source`
- `equipped`

선택 필드:

- `purchaseLogId`
- `giftedBy`
- `expiresAt`
- `metadata`

시간 필드:

- `acquiredAt`: 획득 시 필수
- `updatedAt`: 장착 상태 변경 시

주의:

- 중복 구매 가능 여부를 아이템별 정책으로 결정해야 한다.
- 첫 구현에서는 중복 보유를 허용하지 않는 편이 단순하다.

### `quests`

퀘스트 정의 카탈로그.

문서 ID 전략:

- `quests/{questId}`

필수 필드:

- `questId`
- `questType`
- `title`
- `desc`
- `condition`
- `reward`
- `difficulty`
- `period`
- `enabled`
- `sortOrder`
- `createdAt`
- `updatedAt`

선택 필드:

- `subjectId`
- `quizId`
- `modeId`
- `seasonId`
- `classOnly`

시간 필드:

- `createdAt`: 퀘스트 등록 시
- `updatedAt`: 조건/보상/노출 상태 변경 시

주의:

- 초기 연결은 읽기 전용으로 시작한다.
- 보상 수령은 `userQuests`와 `rewardLogs`를 함께 검증해야 한다.

### `userQuests`

사용자별 퀘스트 진행도.

문서 ID 전략:

- `userQuests/{userId}_{questId}_{periodKey}`
- 또는 `users/{userId}/quests/{questId_periodKey}`

필수 필드:

- `userId`
- `questId`
- `periodKey`
- `current`
- `target`
- `status`
- `rewardClaimed`
- `updatedAt`

선택 필드:

- `completedAt`
- `claimedAt`
- `sourceEvents`

시간 필드:

- `createdAt`: 진행도 문서 생성 시
- `updatedAt`: 진행도 변경 시
- `completedAt`: 완료 가능 상태 도달 시
- `claimedAt`: 보상 수령 시

상태 후보:

- `inProgress`
- `claimable`
- `claimed`
- `expired`

### `classMissions`

학급 공동 미션.

문서 ID 전략:

- `classMissions/{classId}_{missionId}_{periodKey}`

필수 필드:

- `classId`
- `missionId`
- `periodKey`
- `title`
- `current`
- `target`
- `reward`
- `status`
- `updatedAt`

선택 필드:

- `seasonId`
- `participantCount`
- `completedAt`
- `rewardDistributedAt`

시간 필드:

- `createdAt`: 미션 시작 시
- `updatedAt`: 진행도 변경 시
- `completedAt`: 목표 달성 시
- `rewardDistributedAt`: 보상 지급 시

주의:

- 학급 미션 진행도는 개인 클라이언트가 직접 증가시키지 않는다.
- 퀴즈 완료 이벤트를 검증한 뒤 서버에서 누적한다.

### `rankings`

랭킹 집계 결과.

문서 ID 전략:

- `rankings/{rankingType}_{periodKey}`
- 예: `rankings/korean_week_2026-W23`

필수 필드:

- `rankingType`
- `periodKey`
- `entries`
- `updatedAt`

`entries` 예시:

- `rank`
- `userId`
- `nickname`
- `score`
- `title`

선택 필드:

- `classId`
- `subjectId`
- `quizId`
- `modeId`
- `generatedBy`

시간 필드:

- `createdAt`: 집계 문서 최초 생성 시
- `updatedAt`: 재집계 시

주의:

- 실제 랭킹 저장은 아직 하지 않는다.
- 첫 구현에서는 읽기 전용 더미 또는 관리자 생성 집계만 고려한다.

### `assetCatalog`

이미지와 UI 에셋 카탈로그.

문서 ID 전략:

- `assetCatalog/{assetId}`

필수 필드:

- `assetId`
- `assetType`
- `name`
- `url`
- `enabled`
- `createdAt`
- `updatedAt`

선택 필드:

- `storagePath`
- `thumbnailUrl`
- `linkedItemId`
- `width`
- `height`
- `tags`

시간 필드:

- `createdAt`: 에셋 등록 시
- `updatedAt`: URL, 노출 상태 변경 시

주의:

- 초기에는 읽기 전용 연결만 한다.
- Storage 연결 전에는 정적 URL 또는 더미 URL로 시작할 수 있다.

## 4. 보상 지급 흐름

보상 지급은 클라이언트 표시와 실제 저장을 분리한다.

흐름:

1. 퀴즈 완료
   - 클라이언트가 `quizId`, `modeId`, 정답 수, 완료 상태를 서버 검증 흐름에 전달한다.

2. 보상 계산
   - 서버가 `ECONOMY_DAILY_COIN_LIMIT`, 모드별 보상 정책, 정답 수 제한을 적용한다.

3. 중복 지급 확인
   - `dedupeKey`로 같은 퀴즈 완료 보상, 같은 문제 정답 보상, 같은 퀘스트 보상 중복 여부를 확인한다.

4. 하루 상한 확인
   - `userEconomy.dailyEarnedCoin`과 `dailyCoinLimit`을 확인한다.
   - 상한 초과 시 기본 보상은 지급하지 않고 안내 상태만 반환한다.

5. `rewardLogs` 기록
   - 지급 또는 미지급 판단을 로그로 남긴다.
   - 중복 지급 방지를 위해 로그 생성과 경제 갱신은 같은 검증 흐름에서 처리한다.

6. `userEconomy` 갱신
   - DJ코인, 경험치, 하루 누적 획득량을 갱신한다.

주의:

- 클라이언트에서 계산한 보상값은 신뢰하지 않는다.
- 클라이언트는 결과 표시만 담당한다.

## 5. 상점 구매 흐름

상점 구매는 DJ코인 차감과 인벤토리 지급이 동시에 처리되어야 한다.

흐름:

1. `shopItems` 조회
   - 활성화된 아이템만 표시한다.

2. `userEconomy` 잔액 확인
   - 현재 DJ코인이 가격 이상인지 확인한다.

3. `userInventory` 중복 확인
   - 중복 구매 불가 아이템이면 이미 보유 중인지 확인한다.

4. 코인 차감
   - 서버 검증 흐름에서 `userEconomy.coin`을 차감한다.

5. 구매 기록 저장
   - `userInventory`에 아이템을 추가한다.
   - 필요하면 `rewardLogs`와 별도의 `purchaseLogs` 설계를 추가한다.

주의:

- 클라이언트 직접 구매 쓰기 금지.
- 가격은 클라이언트가 보낸 값을 신뢰하지 않고 `shopItems`의 서버 조회값을 사용한다.

## 6. 퀘스트 진행 흐름

퀘스트는 퀴즈 완료 이벤트를 기반으로 진행도를 갱신한다.

흐름:

1. 퀴즈 완료 이벤트
   - `quizId`, `subjectId`, `modeId`, 정답 수, 완료 여부를 서버 검증 흐름에 전달한다.

2. `userQuests` 진행도 갱신
   - 활성화된 `quests` 조건과 완료 이벤트를 비교한다.
   - 조건에 맞으면 `current`를 증가시킨다.

3. 완료 가능 상태
   - `current >= target`이면 `status`를 `claimable`로 변경한다.

4. 보상 지급
   - 사용자가 보상을 받으면 `rewardLogs`에 기록하고 `userEconomy`를 갱신한다.
   - `userQuests.rewardClaimed`를 `true`로 변경한다.

주의:

- 퀘스트 진행도와 보상 수령은 분리할 수 있다.
- 첫 구현에서는 자동 지급보다 `완료 가능` 상태를 표시한 뒤 수령하는 방식이 검증하기 쉽다.

## 7. 보안 규칙 방향

보안 규칙은 학생 클라이언트가 조작 가능한 영역을 최소화하는 방향으로 둔다.

학생 권한:

- 자기 프로필 일부만 읽기
- 자기 표시용 데이터 일부만 읽기
- 경제, 보상, 랭킹 쓰기는 직접 허용하지 않기

읽기 위주 카탈로그:

- `shopItems`
- `quests`
- `assetCatalog`
- 시즌 이벤트성 정의 데이터

관리자 권한:

- 정의 데이터 수정
- 상점 가격 수정
- 퀘스트 조건 수정
- 에셋 등록/비활성화
- 보상 보정

직접 쓰기 금지 후보:

- `userEconomy`
- `rewardLogs`
- `rankings`
- `classMissions.current`
- 구매 처리와 관련된 `userInventory`

## 8. 단계별 연결 순서

1. `shopItems` 읽기
   - 상점 카탈로그를 Firestore 읽기 전용으로 전환한다.

2. `assetCatalog` 읽기
   - 이미지 URL과 아이템 에셋을 읽기 전용으로 연결한다.

3. `quests` 읽기
   - 오늘의 퀘스트와 시즌 이벤트 정의를 읽기 전용으로 연결한다.

4. `userEconomy` 읽기
   - 내 집과 상점에 보유 DJ코인/경험치를 표시한다.

5. `rewardLogs` 제한 저장 테스트
   - 테스트 사용자에게만 퀴즈 완료 보상 로그를 저장한다.
   - 중복 지급 방지와 하루 상한을 먼저 확인한다.

6. 구매 처리 테스트
   - 테스트 아이템 1~2개만 대상으로 DJ코인 차감과 `userInventory` 지급을 검증한다.

## 9. 아직 하지 않을 것

이번 설계 단계에서는 다음을 하지 않는다.

- 실제 랭킹 저장
- 학생 간 거래
- 복권
- 은행
- 전체 회원 마이그레이션
- 운영본 데이터 일괄 이전
- 모든 퀴즈 기록 저장
- 교사용 관리자 화면 구현

## 10. 첫 연결 추천

가장 먼저 연결할 컬렉션은 **`shopItems`** 이다.

추천 이유:

- 사용자 개인정보가 없다.
- 읽기 전용으로 시작할 수 있다.
- 현재 정적 `SHOP_ITEMS` 구조와 매핑하기 쉽다.
- 구매 처리 없이도 UI 검증이 가능하다.

그 다음 순서는 `assetCatalog`, `quests`, `userEconomy` 읽기 연결이 적절하다.
