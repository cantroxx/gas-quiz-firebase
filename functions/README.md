# Firebase Functions Scaffold

This directory prepares the next security migration phase.

## Callable functions

- `verifyMemberAccessCode`: validates school, grade, class, number, and a teacher-issued access code.
- `linkMemberAuthUid`: connects or relinks `users/{memberUserId}.authUid` after server verification.
- `purchaseShopItem`: validates shop purchases and writes economy, inventory, and purchase logs.
- `grantPracticeReward`: grants one DJ coin for a newly recorded practice correct answer.

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

## Issuing codes

Use the Admin SDK script from the project root:

```sh
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/generate-member-access-codes.js --dry-run --grade 4 --class 8
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/generate-member-access-codes.js --commit --grade 4 --class 8 --expires-days 30 --output private/member-access-codes-4-8.csv
```

The output CSV contains raw access codes and is ignored by git.

## Current status

- No Functions deploy has been performed.
- Existing Hosting and Firestore client flows remain active.
- Client member linking has not yet been switched to these callables.
