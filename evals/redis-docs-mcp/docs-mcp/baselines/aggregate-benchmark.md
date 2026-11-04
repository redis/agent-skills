# Skill Benchmark

Generated: 2026-11-04T15:38:24.292Z

Skill: redis-docs-mcp

Suite: docs-mcp

Input: `eval-workspaces/redis-docs-mcp/docs-mcp/iteration-1`

## Overall

- Models: 3
- Mean pass-rate delta: +27 points
- Mean token delta: -102
- Mean time delta: +1.4s
- Total eval cost: $11.5799
- Mean cost delta: +$0.0519
- Verdict counts: 3 improves, 0 neutral, 0 degrades

## Against Baseline

Baseline: `evals/redis-docs-mcp/docs-mcp/baselines/aggregate-benchmark.json`

Baseline generated: 2026-11-04T14:23:36.791Z

| Metric | Baseline | Current | Change |
|--------|----------|---------|--------|
| Mean pass delta | +29 points | +27 points | -2 points |
| Mean token delta | -75 | -102 | -27 |
| Mean time delta | +14.7s | +1.4s | -13.3s |
| Mean cost delta | +$0.0493 | +$0.0519 | +$0.0026 |

### By Model Against Baseline

| Model | Pass Delta Change | Token Delta Change | Time Delta Change | Cost Delta Change | Verdict |
|-------|-------------------|--------------------|-------------------|-------------------|---------|
| claude-haiku-4-5-20251001 | -13 points | -70 | -41.6s | -$0.0190 | improves -> improves |
| claude-opus-5-5 | -2 points | +42 | +0.1s | +$0.0227 | improves -> improves |
| claude-sonnet-5-5 | +8 points | -52 | +1.6s | +$0.0041 | improves -> improves |

## By Model

| Model | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Total Cost | Cost Delta | Verdict |
|-------|---------------|------------|------------|-------------|------------|------------|------------|---------|
| claude-haiku-4-5-20251001 | 52% | 73% | +22 points | -135 | +3.3s | $2.3908 | +$0.0222 | improves |
| claude-opus-5-5 | 73% | 95% | +22 points | -36 | +0.8s | $6.1187 | +$0.0941 | improves |
| claude-sonnet-5-5 | 60% | 98% | +38 points | -136 | +0.0s | $3.0704 | +$0.0394 | improves |

## By Eval

| Eval | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Model Pass Deltas |
|------|---------------|------------|------------|-------------|------------|-------------------|
| sections-not-pages | 50% | 83% | +33 points | -103 | +3.6s | claude-haiku-4-5-20251001: +50 points<br>claude-opus-5-5: +8 points<br>claude-sonnet-5-5: +42 points |
| never-construct-ids | 50% | 97% | +47 points | -43 | +0.6s | claude-haiku-4-5-20251001: +42 points<br>claude-opus-5-5: +33 points<br>claude-sonnet-5-5: +67 points |
| version-metadata-trap | 72% | 94% | +22 points | -251 | +1.7s | claude-haiku-4-5-20251001: +17 points<br>claude-opus-5-5: +17 points<br>claude-sonnet-5-5: +33 points |
| corpus-boundary-miss | 75% | 83% | +8 points | -23 | +1.5s | claude-haiku-4-5-20251001: -8 points<br>claude-opus-5-5: +17 points<br>claude-sonnet-5-5: +17 points |
| ask-economics | 61% | 86% | +25 points | -92 | -0.6s | claude-haiku-4-5-20251001: +8 points<br>claude-opus-5-5: +33 points<br>claude-sonnet-5-5: +33 points |
