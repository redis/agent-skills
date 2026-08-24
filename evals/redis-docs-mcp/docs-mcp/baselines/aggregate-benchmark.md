# Skill Benchmark

Generated: 2026-08-24T08:30:10.454Z

Skill: redis-docs-mcp

Suite: docs-mcp

Input: `eval-workspaces/redis-docs-mcp/docs-mcp/iteration-1`

## Overall

- Models: 3
- Mean pass-rate delta: +33 points
- Mean token delta: -363
- Mean time delta: -0.6s
- Total eval cost: $22.6538
- Mean cost delta: +$0.0420
- Verdict counts: 3 improves, 0 neutral, 0 degrades



## By Model

| Model | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Total Cost | Cost Delta | Verdict |
|-------|---------------|------------|------------|-------------|------------|------------|------------|---------|
| claude-haiku-4-5-20251001 | 45% | 77% | +32 points | -96 | +5.7s | $4.1594 | +$0.0254 | improves |
| claude-opus-5 | 70% | 95% | +25 points | -301 | -6.2s | $9.9912 | +$0.0420 | improves |
| claude-sonnet-5 | 53% | 95% | +42 points | -691 | -1.2s | $8.5032 | +$0.0586 | improves |

## By Eval

| Eval | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Model Pass Deltas |
|------|---------------|------------|------------|-------------|------------|-------------------|
| sections-not-pages | 47% | 86% | +39 points | -9 | -5.4s | claude-haiku-4-5-20251001: +33 points<br>claude-opus-5: +8 points<br>claude-sonnet-5: +75 points |
| never-construct-ids | 42% | 100% | +58 points | -335 | -1.9s | claude-haiku-4-5-20251001: +75 points<br>claude-opus-5: +67 points<br>claude-sonnet-5: +33 points |
| version-metadata-trap | 81% | 86% | +6 points | -594 | -1.7s | claude-haiku-4-5-20251001: -17 points<br>claude-opus-5: +17 points<br>claude-sonnet-5: +17 points |
| corpus-boundary-miss | 61% | 89% | +28 points | -512 | +6.5s | claude-haiku-4-5-20251001: +33 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +50 points |
| ask-economics | 50% | 83% | +33 points | -365 | -0.4s | claude-haiku-4-5-20251001: +33 points<br>claude-opus-5: +33 points<br>claude-sonnet-5: +33 points |
