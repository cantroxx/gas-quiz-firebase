# 수학 서바이버 — firestore.rules 추가 제안

랭킹 기록(`mathsurvivorRanking`)을 위해 아래 블록을 `firestore.rules`에 추가해야 합니다.
낱말대전 `wordbattleRanking`, 마블 `marbleRanking`과 완전히 같은 방식입니다.

```
    // 수학 서바이버 랭크 점수 기록 (각자 자기 문서만 씀 — v1: 클라이언트 신뢰)
    match /mathsurvivorRanking/{uid} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && request.auth.uid == uid;
      allow delete: if false;
    }
```

- 읽기: 로그인한 사람 누구나 (명예의 전당 표시용)
- 쓰기: 자기 uid 문서만
- 삭제: 금지 (정리는 콘솔에서만)
- 인덱스: `bestScore` 단일 필드 정렬만 사용 → 추가 인덱스 불필요

⚠️ 이 파일은 제안서일 뿐이며, 실제 `firestore.rules` 수정과 배포는
사용자 확인 후에 진행한다. (Projects 공통 안전 규칙)
