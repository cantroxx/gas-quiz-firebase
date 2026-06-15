# Project Documentation Map

This directory groups project documents by ownership so parallel work can stay scoped.

## Folders

- `architecture/`: Firebase schema, rules, integration notes, and refactor status.
- `migration/`: member, title, badge, quiz, ranking, and login migration plans.
- `operations/`: runbooks, opening checklist, and browser smoke-test instructions.
- `product/`: economy, asset catalog, classroom prototype, and user-facing design notes.
- `seeding/`: Firestore seed and test-seed documents.
- `snippets/`: reference-only code, rules, and markup snippets.

## Script Folders

- `../scripts/audit/`: operational inspection, backup, preview, and analysis scripts.
- `../scripts/maintenance/`: cleanup, restore, reset, and other maintenance scripts.
- `../scripts/migration/`: import, backfill, normalize, and migration scripts.
- `../scripts/seed/`: seed, grant, and initial data creation scripts.
- `../scripts/smoke/`: browser smoke tests and verification scripts.

## Data Folders

- `../fixtures/`: committed sample data used by scripts or docs.
- `../exports/`: ignored local export data.
- `../private/`: ignored private operational data.

## Root Files Kept Intentionally

- `AGENTS.md`: Codex working rules.
- `Code.js`, `index.html`, `appsscript.json`: legacy Apps Script reference files.
- Firebase config files and `public/`, `functions/`: active runtime sources/configuration.
