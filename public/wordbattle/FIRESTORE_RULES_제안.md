# 낱말 대전 — Firestore 보안 규칙 (✅ 적용·배포 완료)

> 이 문서는 원래 "적용 전 제안" 메모였고, 현재는 `firestore.rules` 에 **반영·배포된 상태**다.
> 실제 규칙은 `../../firestore.rules` 의 `wordbattleRooms` / `wordbattleRanking` 블록을 보라.
>
> **변경 이력(중요)**:
> 1. 처음엔 아래 제안대로 `secret/{doc}` 을 `read: if false` 로 배포했으나, 당시 뽑기가
>    **클라이언트 트랜잭션에서 봉지를 직접 읽는 구조**라 `Missing or insufficient permissions`
>    오류가 났다 → 임시로 `isSignedIn()` 으로 완화했었다.
> 2. 이후 **뽑기·시간초과를 서버 함수 `wbDraw`(functions/index.js)로 이전**하면서
>    `read: if false` 로 되돌렸다(서버 Admin SDK만 봉지를 읽음 — 공정성 확보, 현재 상태).
>    오래된 방 정리도 스케줄 함수 `wbCleanupOldRooms` 가 매일 자동 수행한다.

아래는 기록용 원본 제안이다(과거 시점).
(기존 학생 데이터 컬렉션은 건드리지 않고, `wordbattleRooms` 컬렉션만 새로 엽니다.)

## 추가할 규칙

```
// ── 낱말 대전 (자음·모음 루미큐브) ──────────────────────────
match /wordbattleRooms/{code} {
  // 로그인한(익명 포함) 학생이면 방 목록/상태를 읽고, 방을 만들 수 있음
  allow read: if request.auth != null;
  allow create, update: if request.auth != null;   // v1: 참가·진행을 클라이언트 트랜잭션으로 처리
  allow delete: if false;                            // 방 삭제는 막음(운영자만 콘솔에서)

  // 남은 봉지(deck): 존재는 하되 학생이 직접 들여다보지 못하게 읽기 차단
  match /secret/{doc} {
    allow read: if false;      // 미리 볼 수 없음(공정성). 트랜잭션 쓰기는 서버가 허용
    allow write: if request.auth != null;
  }

  // 각자 손패: 본인 것만 읽기 가능 (남의 패 못 봄)
  match /hands/{uid} {
    allow read: if request.auth != null && request.auth.uid == uid;
    allow write: if request.auth != null;   // 방장이 딜링, 본인이 갱신
  }
}
```

## 안전성 메모 (교실용 v1 수준)

- **손패 가림**: `hands/{uid}` 읽기를 본인으로 제한해, 일반적인 방법으로는 남의 패가 안 보입니다.
- **한계(정직하게)**: 진행·검증을 학생 브라우저(클라이언트 트랜잭션)에서 하므로, 마음먹고 콘솔을 파는 학생은 이론상 조작이 가능합니다.
  완전 방지는 **Cloud Functions 서버 검증**이 필요하고, 이는 배포가 필요해 다음 단계로 둡니다. 초등 교실 대전에는 v1로 충분합니다.
- **정리**: 오래된 방 문서가 쌓이면 나중에 자동 삭제(TTL) 또는 주간 청소 스크립트를 붙이면 됩니다.

## 적용 순서 (승인 후)

1. 위 블록을 `firestore.rules` 안에 추가
2. `npm run check` 통과 확인
3. `firebase deploy --only firestore:rules,hosting` (선생님 승인 하에)
