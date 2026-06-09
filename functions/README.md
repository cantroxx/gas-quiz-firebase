# Firebase Functions Scaffold

This directory prepares the next security migration phase.

## Callable functions

- `verifyMemberAccessCode`: validates school, grade, class, number, and a teacher-issued access code.
- `linkMemberAuthUid`: connects or relinks `users/{memberUserId}.authUid` after server verification.
- `purchaseShopItem`: move shop purchase validation and inventory writes to server code.
- `grantPracticeReward`: move practice reward economy writes to server code.

`purchaseShopItem` and `grantPracticeReward` are intentionally still `unimplemented`.

## Access code documents

The member verification functions expect server-managed documents at:

`memberAccessCodes/{memberUserId}`

Supported fields:

- `active`: boolean
- `salt`: string
- `codeHash`: SHA-256 hex of `salt + ":" + accessCode`
- `expiresAt`: optional Firestore Timestamp
- `failedAttempts`: optional number
- `maxFailedAttempts`: optional number
- `oneTime` or `consumeOnUse`: optional boolean

Do not store raw access codes in Firestore.

## Current status

- No Functions deploy has been performed.
- Existing Hosting and Firestore client flows remain active.
- Client member linking has not yet been switched to these callables.
