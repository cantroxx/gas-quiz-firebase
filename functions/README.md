# Firebase Functions Scaffold

This directory prepares the next security migration phase. The functions are intentionally scaffold-only and return `unimplemented`.

## Planned callable functions

- `verifyMemberAccessCode`: validate school, grade, class, number, and a teacher-issued access code.
- `linkMemberAuthUid`: connect or relink `users/{memberUserId}.authUid` after server verification.
- `purchaseShopItem`: move shop purchase validation and inventory writes to server code.
- `grantPracticeReward`: move practice reward economy writes to server code.

## Current status

- No Functions deploy has been performed.
- Existing Hosting and Firestore client flows remain active.
- Do not enable these functions for production until access code storage, expiry, retry limits, and audit logging are implemented.
