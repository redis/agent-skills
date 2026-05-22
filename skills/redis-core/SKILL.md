---
name: redis-core
description: Core Redis modeling guidance covering data-structure selection (Hash vs JSON vs String, Sorted Set, Stream, etc.), consistent key naming, memory limits and TTL configuration, and atomic primitives like INCR, MULTI/EXEC, and HEXPIRE. Use when designing a Redis data model, caching objects, building counters or leaderboards, choosing between Hash and JSON for structured data, configuring maxmemory or eviction policies, or deciding between Streams and Pub/Sub for messaging.
license: MIT
metadata:
  author: Redis, Inc.
  version: "0.2.0"
---

# Redis Core

Foundational guidance for modeling data in Redis. Covers data-type selection, key naming, memory + expiration, atomic primitives, JSON vs Hash, and Streams vs Pub/Sub — the decisions that most directly drive correctness, memory, and performance.

## When to apply

- Caching objects, sessions, or per-user state.
- Counters, leaderboards, recent-items lists, unique-membership sets.
- Reviewing or refactoring Redis key names.
- Deciding between a Redis Hash, JSON document, or serialized string.
- Configuring memory limits, eviction policy, or TTLs.
- Implementing atomic counters or multi-command operations.
- Choosing between Streams and Pub/Sub for messaging.

## 1. Choose the right data structure

Pick the type that matches the *access pattern*, not just the shape of the data.

| Use case | Recommended type | Why |
|---|---|---|
| Simple values, counters | String | Atomic `INCR`/`DECR`, `SET`/`GET` |
| Object with independently updated fields | Hash | Per-field reads/writes, no whole-object rewrite; per-field TTL via `HEXPIRE` |
| Queue, recent-N items | List | O(1) push/pop at ends |
| Unique items, membership checks | Set | O(1) `SADD`/`SISMEMBER`/`SCARD` |
| Rankings, score-based ranges | Sorted Set | Score-ordered; `ZADD`/`ZRANGE`/`ZRANK` |
| Nested / hierarchical data | JSON | Path-level updates, nested arrays, RQE indexing |
| Durable messaging, event log | Stream | Persistent, consumer groups, replayable |
| Fire-and-forget broadcast | Pub/Sub | Real-time, no persistence |
| Vector similarity | Vector Set | Native vector storage with HNSW |

**Common anti-pattern:** stuffing a flat object into a serialized string. Updating one field means fetch + parse + mutate + rewrite. Use a Hash (or JSON if nested) instead.

See [references/choose-data-structure.md](references/choose-data-structure.md) for full Python and Java examples.

## 2. JSON vs Hash vs String

For structured data, the choice comes down to nesting, partial-update needs, and indexing:

| | JSON | Hash | String |
|---|---|---|---|
| Nested objects/arrays | ✅ | ❌ | ✅ (opaque) |
| Atomic partial read/write | ✅ (`$.field`) | ✅ (`HGET`/`HSET`) | ❌ |
| RQE / geospatial indexing | ✅ | ✅ | ❌ |
| Field-level expiration | ❌ | ✅ (`HEXPIRE`) | ❌ |
| Memory efficiency | Lowest | Better | Best |

- **JSON** — nested structures with atomic partial updates (use `JSON.SET $.field` to avoid read-modify-write).
- **Hash** — flat objects with atomic field access; needs per-field TTL.
- **String** — caching where you always read/write the entire object and don't index.

See [references/json-vs-hash.md](references/json-vs-hash.md) and [references/json-partial-updates.md](references/json-partial-updates.md).

## 3. Use consistent key names

Use `colon-separated` segments with a stable hierarchy:

```
{entity}:{id}:{attribute}
user:1001:profile
order:2024:items
session:abc123
article:987:likes
game:space-invaders:leaderboard
```

Rules of thumb:

- **Lowercase, colon-separated.** No spaces, no mixed casing (`User_1001_Profile` is bad).
- **Keep keys short but readable** — keys live in memory and appear in every command.
- **Don't use full URLs or long strings as keys.** Extract a short identifier, or use a hash digest of the URL.
- **Prefix for multi-tenancy** (`tenant:42:user:7:cart`) so scans and ACLs can target a tenant cleanly.
- **Be consistent.** Pick one convention per service and apply it across all keys.

See [references/key-naming.md](references/key-naming.md) for cleanup examples and edge cases.

## 4. Memory & expiration

Two settings every Redis deployment should make explicit:

- **`maxmemory` + an eviction policy** — never run unbounded. `allkeys-lru` is a safe default for caches; `noeviction` for critical data that must not be evicted.
- **TTL on every cache key** — set at write time (`SETEX`, `SET ... EX`, or `EXPIRE` after `HSET`) so cache keys can't accumulate forever.

```
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

```python
# TTL at write time
redis.setex("cache:user:1001", 3600, user_json)
redis.set("session:abc", token, ex=1800)
```

For per-field expiration inside a Hash (Redis 7.4+), use `HEXPIRE`:

```python
redis.hexpire("sensor:sensor1", 60, "air_quality", "battery_level")
```

See [references/memory-limits.md](references/memory-limits.md), [references/ttl.md](references/ttl.md), and [references/hash-field-expiry.md](references/hash-field-expiry.md).

## 5. Atomic primitives

Use Redis's built-in atomicity instead of read-modify-write loops.

- **Counters** — `INCR` / `INCRBY` are atomic and return the new value. Don't do `GET` + parse + `SET`.
- **Multi-key updates that must be all-or-nothing** — wrap in a `MULTI`/`EXEC` transaction (or `pipeline(transaction=True)` in redis-py). Transactions block other clients during execution and keep the keys consistent.
- **Pipelining for performance only** — if you don't need atomicity, use a non-transactional pipeline (`pipeline(transaction=False)`) to batch commands without the locking overhead.

```python
# Atomic counter
redis.incr("page:views")
redis.incrby("user:1001:credits", -5)

# Atomic multi-key update
pipe = redis.pipeline(transaction=True)
pipe.set("person:1:name", "Alex")
pipe.set("person:1:rank", "Captain")
pipe.execute()
```

See [references/atomic-counters.md](references/atomic-counters.md) and [references/transactions.md](references/transactions.md).

## 6. Streams vs Pub/Sub

For messaging, pick based on whether messages can be lost:

| Requirement | Use |
|---|---|
| Messages must not be lost / replayable | **Streams** (`XADD`/`XREADGROUP`/`XACK`) |
| Need consumer groups for load balancing | **Streams** |
| Real-time broadcast, OK to miss messages | **Pub/Sub** (`PUBLISH`/`SUBSCRIBE`) |
| Event sourcing / audit trail | **Streams** |

`PUBLISH` is fire-and-forget — messages vanish if no subscriber is connected. Streams persist and support consumer groups for reliable, parallel processing.

See [references/streams-vs-pubsub.md](references/streams-vs-pubsub.md).

## References

- [Redis: Choosing the right data type](https://redis.io/docs/latest/develop/data-types/compare-data-types/)
- [Redis: Keys](https://redis.io/docs/latest/develop/use/keyspace/)
- [Redis: Memory optimization](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/)
- [Redis: Transactions](https://redis.io/docs/latest/develop/interact/transactions/)
- [Redis: Streams](https://redis.io/docs/latest/develop/data-types/streams/)
