# Contributing

## Setup

```bash
npm install
```

This installs dependencies and sets up the Husky pre-commit hook, which validates
the Codex, Claude, and Cursor plugin manifests and eval baselines before every commit. Skill-structure
validation runs in CI, not in the hook.

Skill-structure validation additionally needs `skill-validator`, a Go binary that
is not an npm dependency:

```bash
go install github.com/agent-ecosystem/skill-validator/cmd/skill-validator@v1.5.6
```

Make sure `$(go env GOPATH)/bin` is on your `PATH`. Without the binary, commits
still succeed — structure validation prints the install command and skips — but
CI enforces it, so install it before opening a PR. CI reads the version from the
`skillValidatorVersion` field in `package.json`; keep the command above in sync
with it.

## Source of Truth

`skills/` is where you edit. `plugins/redis-development/skills/` is generated from it: real copies, committed for the ChatGPT, Codex, and Claude Code package because plugin installers may drop symlinks that escape a plugin root, and because the Claude Code directory only notices an update when that subdirectory itself changes.

Editing a skill therefore touches two paths, and the hook handles the second one:

```bash
npm run sync:plugins            # regenerate the copies (the hook runs this and stages it)
npm run validate:plugin-skills  # what CI runs; fails on drift or on any symlink
```

Never hand-edit anything under `plugins/redis-development/skills/` — the next sync overwrites it. Full rationale in [AGENTS.md](AGENTS.md#where-skills-live).

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

Eval suites live at the repo root, keyed by the skill they exercise:

```text
evals/<skill-name>/<suite-name>/
  evals.json
  model-matrix.json
  baselines/
```

They are deliberately **not** inside `skills/`. A `with_skill` run gives the model
read access to `skills/<skill-name>/`, and `evals.json` holds `expected_output`
and the grading `expectations` — inside the skill directory, that is the answer
sheet. Everything under `skills/` is also what the marketplaces publish. See
[AGENTS.md](AGENTS.md#running-evals).

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

### Every suite needs a current baseline

`npm run validate` enforces that each eval suite has a committed baseline under
`evals/<skill-name>/<suite-name>/baselines/`, and that the baseline still describes the suite
next to it. It fails when:

- the baseline is missing,
- the suite's `model-matrix.json` no longer matches the one the baseline was run
  with (models, configurations, repetitions, or judge model), or
- `evals.json` defines evals the baseline does not cover, or the baseline covers
  evals that no longer exist.

Without this, the "Against Baseline" section of a report silently compares unlike
runs rather than failing — a stale baseline looks like a valid one. So adding or
editing an eval, or changing the model matrix, means re-running the suite and
promoting the result. Reordering the `models` list is not a change and does not
trip the check.

In the PR description, include the eval command you ran, summarize the combined
report's headline numbers (pass/token/time/cost deltas), and **attach
screenshots** of the HTML report's "Against Baseline" summary and per-model
table — the HTML charts and verdict pills don't reproduce in markdown and
screenshots make the result legible at a glance during review. See [#20](https://github.com/redis/agent-skills/pull/20)
for the format we expect. If an eval cannot be run, explain why and describe the
manual validation you performed instead.

## Commands

```bash
npm run validate                  # Plugin manifests + vendored copies + eval baselines + agentskills.io spec (what CI runs)
npm run validate:eval-baselines   # Every eval suite has a baseline, and it is not stale
npm run validate:skill-structure  # Skill-structure validation only
npm run validate:plugins          # Claude + Cursor plugin manifests + vendored copies
npm run validate:plugin-skills    # Vendored plugin copies match skills/, with no symlinks
npm run sync:plugins              # Regenerate the vendored plugin copies
npm run eval                      # Run configured skill eval suites
```

`npm run validate` checks every external link in a skill by making a live request,
so it needs network access and reports errors when a documentation host is
unreachable. The pre-commit hook deliberately skips it for that reason.
