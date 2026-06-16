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
- `SMOKE_HEADLESS=0`: show Chrome while running

## Covered Flow

- Login shell and extracted browser globals
- Authenticated login
- Practice quiz start, answer submit, persistence status settle check, next question, completion card structure
- Ranking quiz start, wrong answer heart/result path, completion card structure, persistence status settle check
- Home/profile detail toggles
- Ranking plaza entry
- Shop entry
- Event plaza entry
- Classroom entry with unlocked gate
