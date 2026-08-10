# Skill Benchmark

Generated: 2026-08-06T09:51:02.956Z

Skill: redis-search

Suite: search

Input: `eval-workspaces/redis-search/search/iteration-1`

## Overall

- Models: 3
- Mean pass-rate delta: +16 points
- Mean token delta: -30
- Mean time delta: +13.2s
- Total eval cost: $43.7199
- Mean cost delta: +$0.2079
- Verdict counts: 1 improves, 2 neutral, 0 degrades



## By Model

| Model | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Total Cost | Cost Delta | Verdict |
|-------|---------------|------------|------------|-------------|------------|------------|------------|---------|
| claude-haiku-4-5-20251001 | 40% | 71% | +31 points | -39 | +9.3s | $6.4297 | +$0.0286 | improves |
| claude-opus-5 | 85% | 97% | +12 points | -66 | -1.6s | $20.8113 | +$0.3182 | neutral |
| claude-sonnet-5 | 80% | 84% | +4 points | +16 | +32.0s | $16.4789 | +$0.2769 | neutral |

## By Eval

| Eval | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Model Pass Deltas |
|------|---------------|------------|------------|-------------|------------|-------------------|
| field-type-selection | 85% | 100% | +15 points | +233 | +10.1s | claude-haiku-4-5-20251001: +44 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +0 points |
| hybrid-version-gate | 36% | 62% | +26 points | -412 | +24.7s | claude-haiku-4-5-20251001: +50 points<br>claude-opus-5: +29 points<br>claude-sonnet-5: +0 points |
| vector-config-matches-embedding-model | 73% | 85% | +13 points | +167 | +7.0s | claude-haiku-4-5-20251001: +6 points<br>claude-opus-5: +25 points<br>claude-sonnet-5: +6 points |
| prefilter-instead-of-client-side-filtering | 81% | 90% | +10 points | -88 | -3.5s | claude-haiku-4-5-20251001: +29 points<br>claude-opus-5: +7 points<br>claude-sonnet-5: -7 points |
| aggregate-stage-order | 64% | 79% | +14 points | -49 | +18.9s | claude-haiku-4-5-20251001: +7 points<br>claude-opus-5: +14 points<br>claude-sonnet-5: +21 points |
| zero-downtime-schema-change | 76% | 100% | +24 points | -213 | +26.7s | claude-haiku-4-5-20251001: +71 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +0 points |
| debug-empty-results | 64% | 72% | +8 points | +155 | +8.5s | claude-haiku-4-5-20251001: +8 points<br>claude-opus-5: +8 points<br>claude-sonnet-5: +8 points |
