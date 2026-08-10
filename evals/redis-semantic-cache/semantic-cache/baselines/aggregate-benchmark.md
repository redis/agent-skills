# Skill Benchmark

Generated: 2026-08-06T09:51:04.380Z

Skill: redis-semantic-cache

Suite: semantic-cache

Input: `eval-workspaces/redis-semantic-cache/semantic-cache/iteration-1`

## Overall

- Models: 3
- Mean pass-rate delta: +32 points
- Mean token delta: -623
- Mean time delta: +7.4s
- Total eval cost: $27.0963
- Mean cost delta: +$0.1314
- Verdict counts: 3 improves, 0 neutral, 0 degrades



## By Model

| Model | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Total Cost | Cost Delta | Verdict |
|-------|---------------|------------|------------|-------------|------------|------------|------------|---------|
| claude-haiku-4-5-20251001 | 42% | 95% | +52 points | +75 | +18.0s | $5.2692 | +$0.1362 | improves |
| claude-opus-5 | 73% | 92% | +19 points | -1520 | -9.5s | $12.3457 | +$0.1455 | improves |
| claude-sonnet-5 | 71% | 94% | +23 points | -424 | +13.6s | $9.4814 | +$0.1125 | improves |

## By Eval

| Eval | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Model Pass Deltas |
|------|---------------|------------|------------|-------------|------------|-------------------|
| langcache-cache-aside-flow | 50% | 100% | +50 points | -307 | +1.6s | claude-haiku-4-5-20251001: +58 points<br>claude-opus-5: +42 points<br>claude-sonnet-5: +50 points |
| threshold-tuning-for-precision | 61% | 89% | +28 points | -1006 | +4.1s | claude-haiku-4-5-20251001: +33 points<br>claude-opus-5: +33 points<br>claude-sonnet-5: +17 points |
| separate-caches-per-task | 60% | 97% | +37 points | -102 | +22.8s | claude-haiku-4-5-20251001: +60 points<br>claude-opus-5: +10 points<br>claude-sonnet-5: +40 points |
| rest-api-without-sdk | 70% | 97% | +27 points | -502 | +11.7s | claude-haiku-4-5-20251001: +80 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +0 points |
| preview-status-and-fit | 70% | 87% | +17 points | -1197 | -3.3s | claude-haiku-4-5-20251001: +30 points<br>claude-opus-5: +10 points<br>claude-sonnet-5: +10 points |
