# Contributing

## Setup

```bash
npm install
```

This installs dependencies and sets up the Husky pre-commit hook that runs `npm run validate` before every commit.

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

The PR workflow runs `skill-validator` automatically in **enforced** mode — any validator error fails CI and blocks the merge. Run `npm run validate` locally before opening a PR to catch issues early. Warnings remain advisory.

See [#20 — Restructure redis-core to follow the agentskills.io spec](https://github.com/redis/agent-skills/pull/20) for a worked example of a skill landed in the spec layout (and the PR-description shape reviewers expect).

## Evaluating Skills

When adding a new skill, or making a meaningful behavior change to an existing
skill, you **must** include evals with the PR. Evals are the only way reviewers
can tell whether the skill improves model output, keeps behavior neutral, or
introduces regressions.

For the eval framework — schema, grading flow, report structure, and baseline
workflow — see [#18 — Add Redis skills eval](https://github.com/redis/agent-skills/pull/18),
which introduced this system.

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

In the PR description, include the eval command you ran, summarize the combined
report's headline numbers (pass/token/time/cost deltas), and **attach
screenshots** of the HTML report's "Against Baseline" summary and per-model
table — the HTML charts and verdict pills don't reproduce in markdown and
screenshots make the result legible at a glance during review. See [#20](https://github.com/redis/agent-skills/pull/20)
for the format we expect. If an eval cannot be run, explain why and describe the
manual validation you performed instead.

## Commands

```bash
npm run validate                  # Plugin manifests + agentskills.io spec validation (what CI runs)
npm run validate:skill-structure  # Skill-structure validation only
npm run validate:plugins          # Claude + Cursor plugin manifests only
npm run eval                      # Run configured skill eval suites
```
