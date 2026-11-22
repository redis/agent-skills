# Skill Benchmark

Generated: 2026-11-22T18:44:02.177Z

Skill: redis-core

Suite: modern-patterns

Input: `eval-workspaces/redis-core/modern-patterns/iteration-1`

## Overall

- Models: 1
- Mean pass-rate delta: +5 points
- Mean token delta: +25
- Mean time delta: +0.8s
- Total eval cost: $3.5997
- Mean cost delta: +$0.0926
- Verdict counts: 0 improves, 1 neutral, 0 degrades



## By Model

| Model | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Total Cost | Cost Delta | Verdict |
|-------|---------------|------------|------------|-------------|------------|------------|------------|---------|
| claude-sonnet-5 | 95% | 100% | +5 points | +25 | +0.8s | $3.5997 | +$0.0926 | neutral |

## By Eval

| Eval | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Model Pass Deltas |
|------|---------------|------------|------------|-------------|------------|-------------------|
| new-service-modern-defaults | 80% | 100% | +20 points | -945 | -6.7s | claude-sonnet-5: +20 points |
| preserve-legitimate-primitives | 100% | 100% | +0 points | +656 | +5.5s | claude-sonnet-5: +0 points |
| explicit-legacy-deployment | 100% | 100% | +0 points | +703 | +6.1s | claude-sonnet-5: +0 points |
| strict-functions-unknown-write | 100% | 100% | +0 points | -314 | -1.5s | claude-sonnet-5: +0 points |
