# Skill Benchmark

Generated: 2026-08-06T09:50:53.218Z

Skill: redis-connections

Suite: connections

Input: `eval-workspaces/redis-connections/connections/iteration-1`

## Overall

- Models: 3
- Mean pass-rate delta: +6 points
- Mean token delta: -358
- Mean time delta: +13.3s
- Total eval cost: $36.5230
- Mean cost delta: +$0.1257
- Verdict counts: 0 improves, 3 neutral, 0 degrades



## By Model

| Model | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Total Cost | Cost Delta | Verdict |
|-------|---------------|------------|------------|-------------|------------|------------|------------|---------|
| claude-haiku-4-5-20251001 | 80% | 92% | +12 points | -177 | +8.7s | $7.3778 | -$0.0641 | neutral |
| claude-opus-5 | 90% | 98% | +8 points | -889 | -0.9s | $14.8801 | +$0.1376 | neutral |
| claude-sonnet-5 | 92% | 90% | -2 points | -8 | +32.1s | $14.2651 | +$0.3036 | neutral |

## By Eval

| Eval | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Model Pass Deltas |
|------|---------------|------------|------------|-------------|------------|-------------------|
| blocking-command-on-multiplexed-connection | 90% | 100% | +10 points | -76 | +6.4s | claude-haiku-4-5-20251001: +30 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +0 points |
| client-side-cache-requires-resp3 | 87% | 97% | +10 points | -486 | +9.5s | claude-haiku-4-5-20251001: +20 points<br>claude-opus-5: +10 points<br>claude-sonnet-5: +0 points |
| client-side-cache-wrong-fit | 96% | 100% | +4 points | -1298 | -7.4s | claude-haiku-4-5-20251001: +13 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +0 points |
| pipeline-is-not-atomic | 83% | 77% | -7 points | -137 | +60.7s | claude-haiku-4-5-20251001: -10 points<br>claude-opus-5: +10 points<br>claude-sonnet-5: -20 points |
| scan-loop-termination | 97% | 100% | +3 points | +37 | +9.8s | claude-haiku-4-5-20251001: +8 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +0 points |
| timeout-tuning | 70% | 87% | +17 points | -190 | +0.8s | claude-haiku-4-5-20251001: +10 points<br>claude-opus-5: +30 points<br>claude-sonnet-5: +10 points |
