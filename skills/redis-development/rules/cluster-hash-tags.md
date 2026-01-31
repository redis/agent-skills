---
title: Use Hash Tags for Multi-Key Operations
impact: HIGH
impactDescription: Enables multi-key operations in Redis Cluster
tags: cluster, hash-tags, keys, sharding, multi-key
---

## Use Hash Tags for Multi-Key Operations

In Redis Cluster, keys are distributed across slots based on their hash. Use hash tags to ensure keys that must be used together in [multi-key operations](https://redis.io/docs/latest/operate/rs/databases/durability-ha/clustering/#multikey-operations) are on the same slot.

**Correct:** Use hash tags for keys used in multi-key operations.

```python
# These keys go to the same slot because {user:1001} is the hash tag
redis.set("{user:1001}:profile", "...")
redis.set("{user:1001}:settings", "...")
redis.set("{user:1001}:cart", "...")

# Now you can use transactions and pipelines
pipe = redis.pipeline()
pipe.get("{user:1001}:profile")
pipe.get("{user:1001}:settings")
pipe.execute()

# Multi-key commands also work
redis.lmove("{user:1001}:pending", "{user:1001}:processed", "LEFT", "RIGHT")
```

**Incorrect:** Keys without hash tags that need multi-key operations.

```python
# Bad: These may be on different slots
redis.set("user:1001:profile", "...")  # No hash tag
redis.set("user:1001:settings", "...")

# This will fail in cluster mode
pipe = redis.pipeline()
pipe.get("user:1001:profile")
pipe.get("user:1001:settings")
pipe.execute()  # CROSSSLOT error
```

**Hash tag rules:**
- Only the part between `{` and `}` is hashed for slot assignment
- Use meaningful identifiers like `{user:1001}` not just `{1001}` to avoid unrelated keys (e.g., `purchase:{1001}`, `employee:{1001}`) saturating the same slot
- Use hash tags only where multi-key operations are needed, not as a general habit

Reference: [Redis Cluster Key Distribution](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/#hash-tags)
