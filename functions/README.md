# Firebase Functions

This directory contains the server-verified Firebase MVP actions.

## Callable functions

- `startMemberPasswordSetup`: validates school, grade, class, number, and the existing nickname during the initial password setup window.
- `setMemberPassword`: stores the first password hash after a valid setup session.
- `loginMemberWithPassword`: validates school, grade, class, number, and password, then links/relinks `users/{memberUserId}.authUid`.
- `changeMemberPassword`: changes a linked member password, including forced changes after an admin reset.
- `purchaseShopItem`: validates shop purchases and writes economy, inventory, and purchase logs.
- `grantPracticeReward`: grants one DJ coin for a newly recorded practice correct answer.

## Password setup settings

Initial password setup is controlled by:

`authSettings/memberPasswordSetup`

Supported fields:

- `setupEnabled`: boolean
- `setupExpiresAt`: Firestore Timestamp
- `nicknameCheckEnabled`: boolean, currently expected true
- `minPasswordLength`: number, currently 4
- `maxFailedAttempts`: number
- `lockMinutes`: number

Use the Admin SDK script from the project root:

```sh
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed/seed-member-password-setup-settings.js --dry-run
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed/seed-member-password-setup-settings.js --commit --enable --expires-at 2026-06-17T23:59:59+09:00
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed/seed-member-password-setup-settings.js --commit --disable
```

## Password reset

Admin reset is intentionally script-only for the MVP. The reset writes a temporary password and sets `forcePasswordChange: true`.

```sh
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/maintenance/reset-member-password.js --dry-run --grade 4 --class 8 --number 22
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/maintenance/reset-member-password.js --commit --grade 4 --class 8 --number 22
```

Default temporary password format is `grade + class + number`, for example `4822`.

## Current status

- Password login functions are deployed.
- Client member linking uses password callables.
- Access-code callables may remain in code for backward compatibility, but the active UI no longer uses access codes.
