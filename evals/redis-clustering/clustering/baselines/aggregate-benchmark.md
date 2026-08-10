# Skill Benchmark

Generated: 2026-08-06T09:50:52.490Z

Skill: redis-clustering

Suite: clustering

Input: `eval-workspaces/redis-clustering/clustering/iteration-1`

## Overall

- Models: 3
- Mean pass-rate delta: +9 points
- Mean token delta: -191
- Mean time delta: +0.3s
- Total eval cost: $23.6366
- Mean cost delta: +$0.0767
- Verdict counts: 1 improves, 2 neutral, 0 degrades



## By Model

| Model | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Total Cost | Cost Delta | Verdict |
|-------|---------------|------------|------------|-------------|------------|------------|------------|---------|
| claude-haiku-4-5-20251001 | 78% | 98% | +20 points | -35 | +12.1s | $3.7448 | +$0.0344 | improves |
| claude-opus-5 | 100% | 100% | +0 points | -225 | -7.2s | $10.9760 | +$0.1313 | neutral |
| claude-sonnet-5 | 92% | 100% | +8 points | -313 | -3.9s | $8.9158 | +$0.0645 | neutral |

## By Eval

| Eval | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Model Pass Deltas |
|------|---------------|------------|------------|-------------|------------|-------------------|
| crossslot-on-pipeline | 100% | 100% | +0 points | +38 | -2.5s | claude-haiku-4-5-20251001: +0 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +0 points |
| hash-tag-scoping-collision | 53% | 100% | +47 points | -321 | -7.9s | claude-haiku-4-5-20251001: +100 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +40 points |
| over-tagging-hotspot | 100% | 100% | +0 points | -141 | +8.4s | claude-haiku-4-5-20251001: +0 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +0 points |
| replica-reads-consistency | 97% | 97% | +0 points | -75 | +3.7s | claude-haiku-4-5-20251001: +0 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +0 points |
| multi-key-lua-in-cluster | 100% | 100% | +0 points | -457 | +0.0s | claude-haiku-4-5-20251001: +0 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +0 points |
