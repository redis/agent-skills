# Skill Benchmark

Generated: 2026-08-06T09:51:03.662Z

Skill: redis-security

Suite: security

Input: `eval-workspaces/redis-security/security/iteration-1`

## Overall

- Models: 3
- Mean pass-rate delta: +7 points
- Mean token delta: -517
- Mean time delta: +15.8s
- Total eval cost: $27.9748
- Mean cost delta: +$0.0998
- Verdict counts: 1 improves, 2 neutral, 0 degrades



## By Model

| Model | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Total Cost | Cost Delta | Verdict |
|-------|---------------|------------|------------|-------------|------------|------------|------------|---------|
| claude-haiku-4-5-20251001 | 72% | 88% | +16 points | -289 | +9.6s | $4.7612 | +$0.0241 | improves |
| claude-opus-5 | 98% | 100% | +2 points | -950 | +3.4s | $13.0102 | +$0.1157 | neutral |
| claude-sonnet-5 | 90% | 94% | +4 points | -311 | +34.4s | $10.2034 | +$0.1596 | neutral |

## By Eval

| Eval | Without Skill | With Skill | Pass Delta | Token Delta | Time Delta | Model Pass Deltas |
|------|---------------|------------|------------|-------------|------------|-------------------|
| acl-users-over-requirepass | 86% | 92% | +6 points | -580 | +1.5s | claude-haiku-4-5-20251001: +8 points<br>claude-opus-5: +8 points<br>claude-sonnet-5: +0 points |
| tls-certificate-verification | 83% | 100% | +17 points | -426 | +16.7s | claude-haiku-4-5-20251001: +33 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +17 points |
| least-privilege-acl-scoping | 90% | 87% | -3 points | +372 | +34.9s | claude-haiku-4-5-20251001: +0 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: -10 points |
| internet-exposed-instance | 86% | 94% | +8 points | +241 | +12.8s | claude-haiku-4-5-20251001: +17 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +8 points |
| security-audit-checklist | 88% | 98% | +10 points | -2191 | +13.3s | claude-haiku-4-5-20251001: +21 points<br>claude-opus-5: +0 points<br>claude-sonnet-5: +7 points |
