# Contributing

## Setup

```bash
npm install
```

This installs dependencies and sets up Git hooks (via Husky) that validate and build before each commit.

## Adding Rules

Rules live in `skills/<skill-name>/rules/`. See `skills/redis-development/` for an example.

To add a new rule:

1. Create a new file in `rules/` following the naming convention: `<prefix>-<name>.md`
2. Use the template in `rules/_template.md`
3. Run `npm run build` to regenerate `AGENTS.md`
4. Commit both the rule and the updated `AGENTS.md`

The pre-commit hook will fail if `AGENTS.md` is out of sync with the rules.

## Commands

```bash
npm run validate  # Check rule files for errors
npm run build     # Regenerate AGENTS.md from rules
```