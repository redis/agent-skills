# Skill Benchmark

Generated: 2026-08-06T09:50:53.928Z

Skill: redis-observability

Suite: observability

Input: `eval-workspaces/redis-observability/observability/iteration-1`

## Overall

- Models: 3
- Mean pass-rate delta: +10 points
- Mean token delta: -338
- Mean time delta: +3.7s
- Total eval cost: $28.3802
- Mean cost delta: +$0.0669
- Verdict counts: 1 improves, 2 neutral, 0 degrades



## By Model

| Model | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Total Cost | Cost Delta | Verdict |
|-------|---------------|------------|------------|-------------|------------|------------|------------|---------|
| claude-haiku-4-5-20251001 | 71% | 89% | +19 points | +55 | +10.8s | $4.3160 | -$0.0109 | improves |
| claude-opus-5 | 93% | 93% | +0 points | -670 | -6.7s | $13.8008 | +$0.0987 | neutral |
| claude-sonnet-5 | 84% | 94% | +10 points | -400 | +7.2s | $10.2634 | +$0.1129 | neutral |

## By Eval

| Eval | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Model Pass Deltas |
|------|---------------|------------|------------|-------------|------------|-------------------|
| metrics-to-export-and-alert | 90% | 98% | +7 points | -1138 | -0.5s | claude-haiku-4-5-20251001: +14 points<br>claude-opus-5: -7 points<br>claude-sonnet-5: +14 points |
| rejected-connections-triage | 73% | 100% | +27 points | -246 | -0.0s | claude-haiku-4-5-20251001: +70 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +10 points |
| slowlog-triage | 67% | 81% | +14 points | +865 | +18.7s | claude-haiku-4-5-20251001: +8 points<br>claude-opus-5: +8 points<br>claude-sonnet-5: +25 points |
| profile-slow-search-query | 83% | 83% | +0 points | -393 | -2.2s | claude-haiku-4-5-20251001: +0 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +0 points |
| insight-vs-exported-metrics | 100% | 100% | +0 points | -780 | +2.7s | claude-haiku-4-5-20251001: +0 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +0 points |
