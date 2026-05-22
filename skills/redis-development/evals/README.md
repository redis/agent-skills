# Redis Development Evals

The goal is simple - run the same Redis task with and without a skill, grade both
answers against clear expectations, and report whether the skill improves,
degrades, or leaves the answer roughly unchanged.

## How This Works

Anthropic's Agent Skills eval guidance recommends comparing two conditions:

- `without_skill`: the model answers from its base context.
- `with_skill`: the model answers with the skill available.

In this repo, `with_skill` adds the Redis skill directory to the Claude run and
asks the model to use it when relevant. `without_skill` does not add the skill
directory and explicitly asks the model to answer without relying on it.

Each run writes a normal eval artifact tree with the model output, timing data,
grading data, and a per-model `benchmark.json` / `benchmark.md`.

This repo keeps that shape, uses Anthropic's `skill-creator`
`scripts.aggregate_benchmark` for the per-model benchmark, and adds a thin
wrapper around it so we can:

- run the same eval suite across multiple Claude models;
- run `with_skill` and `without_skill` for each model;
- repeat runs for less noisy results;
- grade outputs with an AI judge;
- combine all model benchmarks into one JSON, markdown, and HTML report;
- save curated baselines that can be committed to git.

## Eval Format

Each eval suite lives under:

```text
skills/<skill-name>/evals/<suite-name>/
  evals.json
  model-matrix.json
```

`evals.json` describes the tasks and grading expectations:

```json
{
  "skill_name": "redis-development",
  "eval_suite": "data-structures-key-naming",
  "evals": [
    {
      "id": 1,
      "name": "object-profile-cache",
      "prompt": "The user task given to the model.",
      "expected_output": "Short human-readable summary of the desired answer.",
      "covered_rules": ["data-choose-structure", "data-key-naming"],
      "expectations": [
        "The output recommends a Redis Hash.",
        "The output includes a colon-separated key example."
      ]
    }
  ]
}
```

Important fields:

- `prompt`: the actual task sent to the model.
- `expected_output`: a concise description of the ideal answer.
- `expectations`: objective pass/fail checks used by the AI judge. This follows
  Anthropic's local `skill-creator` schema.
- `covered_rules`: optional coverage metadata for humans and future reporting.
  It does not affect the prompt or grading by itself.

`model-matrix.json` is the run plan for this repo's wrapper. It records the
Claude model IDs, configurations, repetitions, judge model, and default
iteration name.

## Grading

For every model, eval, configuration, and repetition, the runner generates an
answer and then asks the judge model to grade that answer.

The judge receives:

- the original prompt;
- the `expected_output`;
- each expectation from `evals.json`;
- the candidate output.

It returns JSON with one pass/fail result per expectation. Those results become
`grading.json` and are later aggregated into pass rates.

AI grading is useful for repeatability, but it is still a judge model. Treat
large swings, ties, and surprising regressions as candidates for human review.

## Reports

The full eval command produces two report layers:

1. Per-model benchmark reports from Anthropic's `skill-creator`
   `aggregate_benchmark.py`.
2. One cross-model aggregate report from this repo.

The combined report reads:

```text
eval-workspaces/redis-development/data-structures-key-naming/iteration-1/*/benchmark.json
```

and writes:

```text
aggregate-benchmark.json
aggregate-benchmark.md
aggregate-benchmark.html
```

The HTML report includes model-level pass rates, pass deltas, token/time/cost
deltas, eval-level pass rates, eval-level token/time deltas, and eval-by-model
pass deltas. Positive pass-rate deltas are good. Positive token, time, or cost
deltas mean the skill path used more resources.

If a committed default baseline exists at
`skills/<skill-name>/evals/<suite-name>/baselines/aggregate-benchmark.json`, the
combined report also includes an **Against Baseline** section. That comparison
shows how the current run changed versus the baseline for overall pass delta,
token delta, time delta, total cost, cost delta, and per-model deltas.

## Setup

Install Anthropic's official `skill-creator` plugin once:

```bash
claude plugin install skill-creator@claude-plugins-official
```

The eval wrapper auto-detects the plugin's local `skills/skill-creator`
directory and uses its scripts. If you keep the skill somewhere else, pass
`--skill-creator-path /path/to/skill-creator` directly or set
`ANTHROPIC_SKILL_CREATOR_PATH`.

## Running Evals

Run all eval suites across their configured models:

```bash
npm run eval
```

Or run only the Redis data structures and key naming POC:

```bash
npm run eval -- --skill redis-development --suite data-structures-key-naming
```

For a faster one-repetition pass:

```bash
npm run eval -- --smoke
npm run eval -- --skill redis-development --suite data-structures-key-naming --smoke
```

The eval wrapper runs eval tasks in parallel. The default concurrency is `3`.
Increase or decrease it based on Claude rate limits and local machine capacity:

```bash
npm run eval -- --smoke --concurrency 6
npm run eval -- --skill redis-development --suite data-structures-key-naming --smoke --concurrency 6
```

You can also set `EVAL_CONCURRENCY`.

To inspect the matrix without running Claude or requiring the skill-creator
path:

```bash
npm run eval -- --dry-run
npm run eval -- --skill redis-development --suite data-structures-key-naming --dry-run
```

Useful focused runs:

```bash
npm run eval -- --skill redis-development --suite data-structures-key-naming --only-model claude-sonnet-4-6 --smoke
npm run eval -- --skill redis-development --suite data-structures-key-naming --only-eval object-profile-cache --smoke
npm run eval -- --skill redis-development --suite data-structures-key-naming --only-eval 1 --smoke
```

Use `--force` to overwrite existing selected output files.

## Regenerating Reports

The full `npm run eval` command runs the combined report automatically. To
regenerate only the combined report after existing model folders already have
`benchmark.json`, run:

```bash
npm run eval:aggregate
npm run eval:aggregate -- --skill redis-development --suite data-structures-key-naming
```

## Baselines

Generated workspaces stay ignored under `eval-workspaces/`, but curated
baseline snapshots can be committed under each eval suite:

```text
skills/redis-development/evals/data-structures-key-naming/
  baselines/
    aggregate-benchmark.json
    aggregate-benchmark.md
    model-matrix.json
    baseline.json
    README.md
```

After a benchmark run, update the default baseline with:

```bash
npm run eval:baseline
npm run eval:baseline -- --skill redis-development --suite data-structures-key-naming
```

The baseline command refreshes the combined aggregate report from the selected
`eval-workspaces/` iteration, then copies only the curated aggregate artifacts
into `skills/.../baselines/`. It does not call Claude, create new model
generations, or copy raw per-run outputs.

Use a named historical baseline when useful:

```bash
npm run eval:baseline \
  -- --skill redis-development \
  --suite data-structures-key-naming \
  --iteration iteration-1 \
  --name baseline-2026-05-20
```

Named snapshots are written under `skills/.../baselines/<name>/`.

By default the baseline omits HTML to keep the committed snapshot smaller and
easier to diff. Add `--include-html` when you want to commit the visual report
too.

## Output Layout

The command creates one workspace folder per model:

```text
eval-workspaces/redis-development/data-structures-key-naming/iteration-1/
  anthropic__claude-opus-4-7/
  anthropic__claude-sonnet-4-6/
  anthropic__claude-haiku-4-5-20251001/
```

Each model workspace keeps Anthropic's default single-model shape:

```text
eval-workspaces/redis-development/data-structures-key-naming/iteration-1/
  anthropic__claude-sonnet-4-6/
    eval-1/
      eval_metadata.json
      with_skill/
        run-1/
          outputs/
            output.md
          timing.json
          grading.json
      without_skill/
        run-1/
          outputs/
            output.md
          timing.json
          grading.json
    benchmark.json
    benchmark.md
```

## Iterations

`iteration-1` is the default output bucket for a benchmark run. It is not
special; it keeps generated artifacts from one run together so future runs do
not overwrite the old snapshot.

Use a new iteration name whenever you want to compare before/after results:

```bash
npm run eval \
  -- --skill redis-development \
  --suite data-structures-key-naming \
  --iteration iteration-2
```

## References

- [Evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills)
  from Agent Skills.
- [Anthropic skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator).
