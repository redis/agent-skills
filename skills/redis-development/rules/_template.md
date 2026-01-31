---
title: Clear, Action-Oriented Title (e.g., "Use Connection Pooling")
impact: MEDIUM
impactDescription: Brief quantified benefit (e.g., "Reduces connection overhead by 10x")
tags: relevant, keywords, here
---

## [Rule Title]

[1-2 sentence explanation of the problem and why it matters. Focus on practical impact.]

**Correct:** Description of the good approach.

```python
# Comment explaining why this is better
pool = ConnectionPool(host='localhost', max_connections=50)
redis = Redis(connection_pool=pool)  # Reuse connections
result = redis.get('key')
```

**Incorrect:** Description of the problematic approach.

```python
# Comment explaining what makes this problematic
redis = Redis(host='localhost')  # New connection per request
result = redis.get('key')
```

[Optional: Additional context, edge cases, or trade-offs]

Reference: [Redis Docs](https://redis.io/docs/)
