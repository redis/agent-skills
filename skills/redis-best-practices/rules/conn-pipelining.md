---
title: Use Pipelining for Bulk Operations
impact: HIGH
impactDescription: Reduces round trips, 5-10x faster for batch operations
tags: pipelining, batch, performance, round-trips
---

## Use Pipelining for Bulk Operations

Batch multiple commands into a single round trip to reduce network latency.

**Correct:** Use pipeline for multiple commands.

```python
# Good: Single round trip for multiple commands
pipe = redis.pipeline()
for user_id in user_ids:
    pipe.get(f"user:{user_id}")
results = pipe.execute()
```

**Incorrect:** Sequential commands in a loop.

```python
# Bad: N round trips
results = []
for user_id in user_ids:
    results.append(redis.get(f"user:{user_id}"))
```

Reference: [Redis Pipelining](https://redis.io/docs/latest/develop/use/pipelining/)

