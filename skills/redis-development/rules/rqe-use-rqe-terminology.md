---
title: Use Redis Query Engine (RQE) Terminology for Search and JSON
impact: MEDIUM
impactDescription: Keeps guidance aligned with Redis 8 docs and naming
tags: rqe, search, json, terminology, redis-8
---

## Use Redis Query Engine (RQE) Terminology for Search and JSON

Redis 8 documentation refers to full-text search, vector search, and JSON indexing as part of the Redis Query Engine (RQE). Prefer `RQE` in guidance instead of the legacy module names unless you are explicitly discussing pre-8 deployments.

**Correct:** Describe search and JSON indexing as RQE features.

```bash
# RQE index on JSON documents
FT.CREATE idx:products ON JSON PREFIX 1 "product:" SCHEMA $.name AS name TEXT
FT.SEARCH idx:products "@name:camera"
```

**When to use:**
- When explaining search, vector search, or JSON indexing in Redis 8+.
- When pointing users to the official docs for search and query.

**When NOT needed:**
- Only use `RediSearch` or `RedisJSON` when the user is on Redis 7.x or a legacy module-based setup.

Reference: [Redis Query Engine docs](https://redis.io/docs/latest/develop/ai/search-and-query/), [Redis Open Source 8.0 release notes](https://redis.io/docs/latest/operate/rs/release-notes/redis-os-8-0-release-notes/)
