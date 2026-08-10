# Skill Benchmark

Generated: 2026-08-06T09:50:40.713Z

Skill: iris-development

Suite: agent-memory

Input: `eval-workspaces/iris-development/agent-memory/iteration-1`

## Overall

- Models: 3
- Mean pass-rate delta: +45 points
- Mean token delta: +240
- Mean time delta: +19.6s
- Total eval cost: $31.7696
- Mean cost delta: +$0.1457
- Verdict counts: 3 improves, 0 neutral, 0 degrades



## By Model

| Model | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Total Cost | Cost Delta | Verdict |
|-------|---------------|------------|------------|-------------|------------|------------|------------|---------|
| claude-haiku-4-5-20251001 | 30% | 89% | +59 points | +9 | +27.3s | $6.0392 | +$0.0632 | improves |
| claude-opus-5 | 67% | 97% | +31 points | +608 | +6.7s | $13.1826 | +$0.1797 | improves |
| claude-sonnet-5 | 49% | 94% | +46 points | +105 | +24.9s | $12.5478 | +$0.1942 | improves |

## By Eval

| Eval | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Model Pass Deltas |
|------|---------------|------------|------------|-------------|------------|-------------------|
| sdk-setup-and-auth | 38% | 100% | +62 points | -249 | +2.7s | claude-haiku-4-5-20251001: +86 points<br>claude-opus-5: +50 points<br>claude-sonnet-5: +50 points |
| session-events-vs-direct-ltm | 64% | 94% | +31 points | +538 | +12.3s | claude-haiku-4-5-20251001: +58 points<br>claude-opus-5: +17 points<br>claude-sonnet-5: +17 points |
| async-promotion-contract | 64% | 89% | +25 points | +553 | +50.7s | claude-haiku-4-5-20251001: +42 points<br>claude-opus-5: +8 points<br>claude-sonnet-5: +25 points |
| bulk-create-idempotency-and-cap | 33% | 92% | +58 points | +329 | +21.6s | claude-haiku-4-5-20251001: +92 points<br>claude-opus-5: +42 points<br>claude-sonnet-5: +42 points |
| organize-and-scope-search | 44% | 97% | +53 points | +238 | +10.7s | claude-haiku-4-5-20251001: +67 points<br>claude-opus-5: +33 points<br>claude-sonnet-5: +58 points |
| typescript-session-retrieval | 47% | 89% | +42 points | +33 | +19.8s | claude-haiku-4-5-20251001: +8 points<br>claude-opus-5: +33 points<br>claude-sonnet-5: +83 points |
