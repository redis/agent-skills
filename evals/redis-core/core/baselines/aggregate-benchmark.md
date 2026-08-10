# Skill Benchmark

Generated: 2026-08-06T09:51:24.842Z

Skill: redis-core

Suite: core

Input: `eval-workspaces/redis-core/core/iteration-1`

## Overall

- Models: 3
- Mean pass-rate delta: +1 points
- Mean token delta: -120
- Mean time delta: +7.3s
- Total eval cost: $17.6372
- Mean cost delta: +$0.0750
- Verdict counts: 0 improves, 3 neutral, 0 degrades

## Against Baseline

Baseline: `skills/redis-core/evals/core/baselines/aggregate-benchmark.json`

Baseline generated: 2026-05-22T10:36:23.032Z

| Metric | Baseline | Current | Change |
|--------|----------|---------|--------|
| Mean pass delta | +2 points | +1 points | -1 points |
| Mean token delta | -309 | -120 | +189 |
| Mean time delta | +4.6s | +7.3s | +2.7s |
| Mean cost delta | +$0.0361 | +$0.0750 | +$0.0389 |

### By Model Against Baseline

| Model | Pass Delta Change | Token Delta Change | Time Delta Change | Cost Delta Change | Verdict |
|-------|-------------------|--------------------|-------------------|-------------------|---------|
| claude-haiku-4-5-20251001 | +3 points | -43 | +1.2s | -$0.0275 | neutral -> neutral |
| claude-opus-5 | New model | n/a | n/a | n/a | neutral |
| claude-sonnet-5 | New model | n/a | n/a | n/a | neutral |

Missing baseline models in this run: claude-opus-4-7, claude-sonnet-4-6


## By Model

| Model | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Total Cost | Cost Delta | Verdict |
|-------|---------------|------------|------------|-------------|------------|------------|------------|---------|
| claude-haiku-4-5-20251001 | 95% | 98% | +3 points | -118 | +10.4s | $2.9765 | +$0.0141 | neutral |
| claude-opus-5 | 98% | 98% | +0 points | -125 | +0.9s | $8.0839 | +$0.1287 | neutral |
| claude-sonnet-5 | 100% | 100% | +0 points | -117 | +10.7s | $6.5768 | +$0.0821 | neutral |

## By Eval

| Eval | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Model Pass Deltas |
|------|---------------|------------|------------|-------------|------------|-------------------|
| object-profile-cache | 97% | 100% | +3 points | +111 | +4.8s | claude-haiku-4-5-20251001: +10 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +0 points |
| unique-membership | 97% | 97% | +0 points | +61 | +7.4s | claude-haiku-4-5-20251001: +0 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +0 points |
| leaderboard-ranking | 100% | 100% | +0 points | -306 | +14.0s | claude-haiku-4-5-20251001: +0 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +0 points |
| key-naming-cleanup | 97% | 97% | +0 points | -346 | +3.1s | claude-haiku-4-5-20251001: +0 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +0 points |
