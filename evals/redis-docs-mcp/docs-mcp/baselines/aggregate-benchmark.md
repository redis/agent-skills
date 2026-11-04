# Skill Benchmark

Generated: 2026-11-04T14:23:36.791Z

Skill: redis-docs-mcp

Suite: docs-mcp

Input: `eval-workspaces/redis-docs-mcp/docs-mcp/iteration-1`

## Overall

- Models: 3
- Mean pass-rate delta: +29 points
- Mean token delta: -75
- Mean time delta: +14.7s
- Total eval cost: $11.2799
- Mean cost delta: +$0.0493
- Verdict counts: 3 improves, 0 neutral, 0 degrades

## Against Baseline

Baseline: `evals/redis-docs-mcp/docs-mcp/baselines/aggregate-benchmark.json`

Baseline generated: 2026-08-24T08:30:10.454Z

| Metric | Baseline | Current | Change |
|--------|----------|---------|--------|
| Mean pass delta | +33 points | +29 points | -3 points |
| Mean token delta | -363 | -75 | +287 |
| Mean time delta | -0.6s | +14.7s | +15.3s |
| Mean cost delta | +$0.0420 | +$0.0493 | +$0.0073 |

### By Model Against Baseline

| Model | Pass Delta Change | Token Delta Change | Time Delta Change | Cost Delta Change | Verdict |
|-------|-------------------|--------------------|-------------------|-------------------|---------|
| claude-haiku-4-5-20251001 | +3 points | +32 | +39.2s | +$0.0158 | improves -> improves |
| claude-opus-5-5 | New model | n/a | n/a | n/a | improves |
| claude-sonnet-5-5 | New model | n/a | n/a | n/a | improves |

Missing baseline models in this run: claude-opus-5, claude-sonnet-5


## By Model

| Model | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Total Cost | Cost Delta | Verdict |
|-------|---------------|------------|------------|-------------|------------|------------|------------|---------|
| claude-haiku-4-5-20251001 | 48% | 83% | +35 points | -65 | +44.9s | $2.5199 | +$0.0412 | improves |
| claude-opus-5-5 | 72% | 95% | +23 points | -78 | +0.8s | $5.5487 | +$0.0715 | improves |
| claude-sonnet-5-5 | 67% | 97% | +30 points | -83 | -1.6s | $3.2113 | +$0.0353 | improves |

## By Eval

| Eval | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Model Pass Deltas |
|------|---------------|------------|------------|-------------|------------|-------------------|
| sections-not-pages | 56% | 86% | +31 points | +92 | +66.2s | claude-haiku-4-5-20251001: +50 points<br>claude-opus-5-5: +25 points<br>claude-sonnet-5-5: +17 points |
| never-construct-ids | 47% | 94% | +47 points | +122 | +4.6s | claude-haiku-4-5-20251001: +67 points<br>claude-opus-5-5: +33 points<br>claude-sonnet-5-5: +42 points |
| version-metadata-trap | 89% | 94% | +6 points | -410 | +1.3s | claude-haiku-4-5-20251001: +0 points<br>claude-opus-5-5: +0 points<br>claude-sonnet-5-5: +17 points |
| corpus-boundary-miss | 75% | 89% | +14 points | -265 | +0.6s | claude-haiku-4-5-20251001: +8 points<br>claude-opus-5-5: +17 points<br>claude-sonnet-5-5: +17 points |
| ask-economics | 44% | 94% | +50 points | +85 | +0.7s | claude-haiku-4-5-20251001: +50 points<br>claude-opus-5-5: +42 points<br>claude-sonnet-5-5: +58 points |
