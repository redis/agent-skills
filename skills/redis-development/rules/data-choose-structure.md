---
title: Choose the Right Data Structure
impact: HIGH
impactDescription: Optimal memory usage and operation performance
tags: data-structures, strings, hashes, sets, lists, sorted-sets, json, streams, vector-sets
---

## Choose the Right Data Structure

Selecting the appropriate Redis data type for your use case is fundamental to performance and memory efficiency.

| Use Case | Recommended Type | Why |
|----------|------------------|-----|
| Simple values, counters | String | Fast, atomic operations |
| Object with fields | Hash | Memory efficient, partial updates, field-level expiration |
| Queue, recent items | List | O(1) push/pop at ends |
| Unique items, membership | Set | O(1) add/remove/check |
| Rankings, ranges | Sorted Set | Score-based ordering |
| Nested/hierarchical data | JSON | Path queries, nested structures, geospatial indexing with RQE |
| Event logs, messaging | Stream | Persistent, consumer groups |
| Similarity search | Vector Set | Native vector storage with built-in HNSW indexing |

**Incorrect:** Using strings for everything.

```python
# Storing object as JSON string loses atomic field updates
redis.set("user:1001", json.dumps({"name": "Alice", "email": "alice@example.com"}))

# To update email, must fetch, parse, modify, and rewrite entire object
user = json.loads(redis.get("user:1001"))
user["email"] = "new@example.com"
redis.set("user:1001", json.dumps(user))
```

**Correct:** Use Hash for objects with fields.

```python
# Hash allows atomic field updates
redis.hset("user:1001", mapping={"name": "Alice", "email": "alice@example.com"})

# Update single field without touching others
redis.hset("user:1001", "email", "new@example.com")
```

Reference: [Choosing the Right Data Type](https://redis.io/docs/latest/develop/data-types/compare-data-types/)
