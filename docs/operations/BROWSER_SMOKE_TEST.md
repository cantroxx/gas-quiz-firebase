# Browser Smoke Test

This test checks the deployed Firebase UI with a real browser.

## Setup

Install the local Node dependency:

```bash
npm install
```

The script uses the system Chrome binary by default:

```text
/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

Override it with `SMOKE_CHROME_PATH` if needed.

Run this from a normal terminal. Sandboxed agent sessions may not be able to launch or stop Chrome.

## Public Shell Check

Checks the login screen and core browser globals only.

```bash
SMOKE_PUBLIC_ONLY=1 npm run smoke:browser
```

## Authenticated Flow Check

Provide a test student account through environment variables. Do not commit real credentials.

```bash
SMOKE_GRADE=4 \
SMOKE_CLASS=8 \
SMOKE_NUMBER=1 \
SMOKE_PASSWORD='password-here' \
npm run smoke:browser
```

Optional variables:

- `SMOKE_BASE_URL`: target URL, default `https://dj48-quiztown-firebase.web.app`
- `SMOKE_SCHOOL`: default `동자`
- `SMOKE_QUIZ_ID`: default `spelling`
- `SMOKE_RANKING_MODE`: default `normal`
- `SMOKE_PROFILE_WRITE=1`: additionally saves and restores the profile ranking message
- `SMOKE_ADMIN_READ=1`: additionally checks read-only admin dashboard/member-list loading when the account opens the admin view
- `SMOKE_HEADLESS=0`: show Chrome while running

The authenticated flow writes practice/ranking progress for the supplied account. Use a dedicated smoke account. `SMOKE_PROFILE_WRITE=1` also writes the profile ranking message, then restores the original value.

## Admin Write Smoke Policy

Do not add always-on admin write smoke against production settings. Admin writes can change notice board content, feature flags, login settings, room catalog items, member permissions, or wallet balances.

Admin write smoke is allowed only when one of these safeguards exists:

- The target is a Firebase emulator or a disposable test project.
- The flow reads the original value, writes a smoke value, verifies it, and restores the exact original value in `finally`.
- The callable supports an explicit dry-run or validation-only mode.

Preferred first candidates are reversible setting writes such as notice board draft text or external quiz rows. Avoid member wallet, permission, password, and feature flag writes until a dedicated smoke account/project is available.

## Covered Flow

- Login shell and extracted browser globals
- Authenticated login
- Practice quiz start, answer submit, persistence status settle check, next question, completion card structure
- Ranking quiz start, wrong answer heart/result path, completion card structure, persistence status settle check
- Home/profile detail toggles
- Optional profile ranking-message write and restore when `SMOKE_PROFILE_WRITE=1`
- Optional read-only admin dashboard/member-list check when `SMOKE_ADMIN_READ=1` and the account is an admin
- Ranking plaza entry
- Shop entry
- Event plaza entry
- Classroom entry with unlocked gate
