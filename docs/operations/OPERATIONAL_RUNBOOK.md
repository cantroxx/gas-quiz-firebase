# DJ48 Quiz Town Operational Runbook

## Scope

This runbook covers Firebase production operation after MVP launch:

- Cloud Functions runtime and dependency maintenance
- Firestore backup/export procedure
- Basic operational metrics checks
- Security and cost review cadence

Student data exports and service account files must stay local and must not be committed.

## Runtime And Dependency Status

Current Functions runtime target:

- Node.js 22
- installed `firebase-functions` 7.3.2
- installed `firebase-admin` 14.3.0

Firebase deploy previously warned that Node.js 20 was deprecated. The Functions package now targets Node.js 22 to avoid the upcoming Node.js 20 deploy block.

Dependency audit note (upgraded and redeployed 2026-09-09):

- The direct dependencies were upgraded together to `firebase-functions@7.3.2` and `firebase-admin@14.3.0`. Static checks and all Functions definitions loaded in the emulator before the production deployment completed.
- `npm audit --omit=dev` now reports high 0, moderate 8, critical 0. The former high `form-data` finding is gone.
- The remaining findings are in the latest Admin SDK's Storage and Google client transitive paths. npm currently suggests incompatible old major versions as the full fix, so do not force-downgrade.

Recommended cadence:

- Re-run `npm audit --omit=dev` monthly.
- Re-check the selected versions and their release notes immediately before upgrading.
- Deploy Functions after dependency changes and confirm no runtime deprecation warning remains.

## Backup Procedure

Dry-run backup summary:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/audit/export-operational-backup.js --dry-run --sample 3
```

Write a local JSON backup:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/audit/export-operational-backup.js --commit --sample 0
```

Output path:

```text
private/backups/firestore-operational-backup-*.json
```

`private/` is ignored by git. Do not move generated backup files into tracked paths.

Included root collections:

- `users`
- `memberCredentials`
- `authSettings`
- `memberPasswordSetupState`
- `memberAccessCodes`
- `userEconomy`
- `userRoomSettings`
- `userPracticeSummary`
- `userTitleSummary`
- `practiceRecords`
- `rankingRecords`
- `userRankingSummary`
- `quizKingSummary`
- `rewardLogs`
- `purchaseLogs`
- `adminLogs`
- `noticeBoard`
- `shopItems`
- `assetCatalog`
- `profileImageCandidates`
- `quizzes`
- `titleCatalog`

Included subcollections:

- `userBadges/{memberUserId}/badges`
- `userTitles/{memberUserId}/titles`
- `userInventory/{memberUserId}/items`
- `quizQuestions/{quizId}/questions`

Recommended cadence:

- Before any data cleanup or correction: run a committed backup.
- During normal operation: run weekly or before major classroom use.
- Keep backup files outside git and restrict access to admin-only devices/accounts.

## Operational Metrics Check

Run:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/audit/inspect-operational-metrics.js --sample 5
```

This prints:

- total users
- active students without `authUid`
- total practice/ranking/reward/purchase records
- today practice updates
- today rankings
- today rewards
- today purchases
- sample unlinked active students

Recommended cadence:

- Daily during first launch week
- Weekly after stable operation
- Immediately after reports of missing records/rewards/logins

## Cost And Quota Watch Points

Primary Firestore write sources:

- practice correct answer progress
- practice reward logs/economy
- ranking records
- purchases/inventory
- profile image and room settings
- admin logs

Primary read-heavy screens:

- ranking tab
- home/profile
- admin dashboard/member detail
- quiz loading

Watch in Firebase Console:

- Firestore document reads/writes/deletes
- Cloud Functions invocations/errors
- Cloud Storage bandwidth and object count
- Hosting bandwidth after classroom-wide access

Early warning signs:

- repeated `resource-exhausted` / `Too Many Requests`
- ranking page triggering many repeated reads
- admin member detail overuse during class
- large profile image uploads

## Deploy Procedure

Use targeted deploys:

```bash
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage
```

Avoid full deploy unless multiple targets intentionally changed.

Before deploy:

```bash
git status --short
node --check functions/index.js
node -e "const fs=require('fs');const html=fs.readFileSync('public/index.html','utf8');const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());for(const s of scripts){new Function(s)};console.log('inline script syntax ok')"
git diff --check
```

After deploy:

- confirm Hosting URL loads
- check login
- check one practice answer write
- check one ranking page load
- check admin dashboard

## Do Not Commit

- `service-account.json`
- `exports/member-export.json`
- `exports/title-export.json`
- `exports/practice-export.json`
- `exports/ranking-export.json`
- `exports/quiz-*-export.json`
- `private/backups/*`
- any downloaded student data export
