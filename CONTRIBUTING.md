# Contributing

## Setup

```bash
npm install
```

This installs dependencies and sets up Git hooks (via Husky) that validate and build before each commit.

## Adding Rules (deprecated)

Note: We'll drop rules, in favor of [Agent Skills](https://agentskills.io) structure.

Rules live in `skills/<skill-name>/rules/`. See `skills/redis-development/` for an example.

To add a new rule:

1. Create a new file in `rules/` following the naming convention: `<prefix>-<name>.md`
2. Use the template in `rules/_template.md`
3. Run `npm run build` to regenerate `AGENTS.md`
4. Commit both the rule and the updated `AGENTS.md`

The pre-commit hook will fail if `AGENTS.md` is out of sync with the rules.

## Skill Structure

Skills should move toward the standard Agent Skills package structure described in the [Anthropic Agent Skills documentation](https://docs.claude.com/en/docs/agents-and-tools/agent-skills).

For published skill content, prefer:

```text
skills/<skill-name>/
  SKILL.md
  references/
  scripts/
  assets/
```

The PR workflow runs `skill-validator` in advisory mode and reports structure issues as warnings while we gradually move the repository toward the standard layout.

## Evaluating Skills

When adding a new skill, or making a meaningful behavior change to an existing
skill, include evals with the PR whenever possible. Evals help show whether the
skill improves model output, keeps behavior neutral, or introduces regressions.

Place eval suites next to the skill they exercise:

```text
skills/<skill-name>/evals/<suite-name>/
  evals.json
  model-matrix.json
```

Use the [Redis Development evals README](skills/redis-development/evals/README.md)
for the eval format, setup steps, grading flow, report structure, and baseline
workflow.

Before opening a PR, run the relevant evals:

```bash
npm run eval -- --skill <skill-name>
```

The full eval command generates the combined report automatically. If you need
to regenerate reports from existing benchmark output:

```bash
npm run eval:aggregate
npm run eval:aggregate -- --skill <skill-name> --suite <suite-name>
```

Generated raw outputs under `eval-workspaces/` should not be committed. If the
eval result should become a shared reference point, update the curated baseline:

```bash
npm run eval:baseline
npm run eval:baseline -- --skill <skill-name> --suite <suite-name>
```

In the PR description, include the eval command you ran and summarize the
combined report results. Prefer linking or attaching the generated markdown or
HTML report, and add screenshots when the HTML charts make the result easier to
review. If an eval cannot be run, explain why and describe the manual validation
you performed instead.

## Commands

```bash
npm run validate  # Check rule files for errors
npm run validate:skill-structure  # Report skill package structure issues
npm run build     # Regenerate AGENTS.md from rules
npm run eval      # Run configured skill eval suites
```
