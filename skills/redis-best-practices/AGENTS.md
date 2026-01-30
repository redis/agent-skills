# Redis Best Practices

**Version 1.0.0**  
Redis, Inc.  
January 2026

> **Note:**  
> This document is mainly for agents and LLMs to follow when maintaining,  
> generating, or refactoring Redis applications. Humans  
> may also find it useful, but guidance here is optimized for automation  
> and consistency by AI-assisted workflows.

---

## Abstract

Best practices for Redis including data structures, memory management, Redis Query Engine (RQE), vector search with RedisVL, semantic caching with LangCache, and performance optimization. Optimized for AI agents and LLMs.

---

## Table of Contents

1. [Data Structures & Keys](#1-data-structures--keys) — **HIGH**
   - 1.1 [Choose the Right Data Structure](#11-choose-the-right-data-structure)
   - 1.2 [Use Consistent Key Naming Conventions](#12-use-consistent-key-naming-conventions)
2. [Memory & Expiration](#2-memory--expiration) — **HIGH**
   - 2.1 [Configure Memory Limits and Eviction Policies](#21-configure-memory-limits-and-eviction-policies)
   - 2.2 [Set TTL on Cache Keys](#22-set-ttl-on-cache-keys)
3. [Connection & Performance](#3-connection--performance) — **HIGH**
   - 3.1 [Avoid Slow Commands in Production](#31-avoid-slow-commands-in-production)
   - 3.2 [Configure Connection Timeouts](#32-configure-connection-timeouts)
   - 3.3 [Use Connection Pooling or Multiplexing](#33-use-connection-pooling-or-multiplexing)
   - 3.4 [Use Pipelining for Bulk Operations](#34-use-pipelining-for-bulk-operations)
4. [JSON Documents](#4-json-documents) — **MEDIUM**
   - 4.1 [Choose JSON vs Hash Appropriately](#41-choose-json-vs-hash-appropriately)
   - 4.2 [Use JSON Paths for Partial Updates](#42-use-json-paths-for-partial-updates)
5. [Redis Query Engine](#5-redis-query-engine) — **HIGH**
   - 5.1 [Choose the Correct Field Type](#51-choose-the-correct-field-type)
   - 5.2 [Index Only Fields You Query](#52-index-only-fields-you-query)
   - 5.3 [Manage Indexes for Zero-Downtime Updates](#53-manage-indexes-for-zero-downtime-updates)
   - 5.4 [Use DIALECT 2 for Query Syntax](#54-use-dialect-2-for-query-syntax)
   - 5.5 [Write Efficient Queries](#55-write-efficient-queries)
6. [Vector Search & RedisVL](#6-vector-search--redisvl) — **HIGH**
   - 6.1 [Choose HNSW vs FLAT Based on Requirements](#61-choose-hnsw-vs-flat-based-on-requirements)
   - 6.2 [Configure Vector Indexes Properly](#62-configure-vector-indexes-properly)
   - 6.3 [Implement RAG Pattern Correctly](#63-implement-rag-pattern-correctly)
   - 6.4 [Use Hybrid Search for Better Results](#64-use-hybrid-search-for-better-results)
7. [Semantic Caching](#7-semantic-caching) — **MEDIUM**
   - 7.1 [Configure Semantic Cache Properly](#71-configure-semantic-cache-properly)
   - 7.2 [Use LangCache for LLM Response Caching](#72-use-langcache-for-llm-response-caching)
8. [Streams & Pub/Sub](#8-streams--pub/sub) — **MEDIUM**
   - 8.1 [Choose Streams vs Pub/Sub Appropriately](#81-choose-streams-vs-pubsub-appropriately)
9. [Clustering & Replication](#9-clustering--replication) — **MEDIUM**
   - 9.1 [Use Hash Tags for Multi-Key Operations](#91-use-hash-tags-for-multi-key-operations)
   - 9.2 [Use Read Replicas for Read-Heavy Workloads](#92-use-read-replicas-for-read-heavy-workloads)
10. [Security](#10-security) — **HIGH**
   - 10.1 [Always Use Authentication in Production](#101-always-use-authentication-in-production)
   - 10.2 [Secure Network Access](#102-secure-network-access)
   - 10.3 [Use ACLs for Fine-Grained Access Control](#103-use-acls-for-fine-grained-access-control)
11. [Observability](#11-observability) — **MEDIUM**
   - 11.1 [Monitor Key Redis Metrics](#111-monitor-key-redis-metrics)
   - 11.2 [Use Observability Commands for Debugging](#112-use-observability-commands-for-debugging)

---

## 1. Data Structures & Keys

**Impact: HIGH**

Choosing the right Redis data type and key naming conventions. Foundation for efficient Redis usage.

### 1.1 Choose the Right Data Structure

**Impact: HIGH (Optimal memory usage and operation performance)**

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

**Incorrect: Using strings for everything.**

```python
# Storing object as JSON string loses atomic field updates
redis.set("user:1001", json.dumps({"name": "Alice", "email": "alice@example.com"}))

# To update email, must fetch, parse, modify, and rewrite entire object
user = json.loads(redis.get("user:1001"))
user["email"] = "new@example.com"
redis.set("user:1001", json.dumps(user))
```

**Correct: Use Hash for objects with fields.**

```python
# Hash allows atomic field updates
redis.hset("user:1001", mapping={"name": "Alice", "email": "alice@example.com"})

# Update single field without touching others
redis.hset("user:1001", "email", "new@example.com")
```

Reference: [https://redis.io/docs/latest/develop/data-types/compare-data-types/](https://redis.io/docs/latest/develop/data-types/compare-data-types/)

### 1.2 Use Consistent Key Naming Conventions

**Impact: MEDIUM (Improved maintainability and debugging)**

Well-structured key names improve code maintainability, debugging, and enable efficient key scanning.

**Correct: Use colons as separators with a consistent hierarchy.**

```python
# Pattern: service:entity:id:attribute
user:1001:profile
user:1001:settings
order:2024:items
cache:api:users:list
session:abc123
```

**Incorrect: Inconsistent naming, spaces, or very long keys.**

```python
# These cause confusion and waste memory
User_1001_Profile
my key with spaces
com.mycompany.myapp.production.users.profile.data.1001
```

**Key naming tips:**

- Keep keys short but readable—they consume memory

- Consider key prefixes for multi-tenant applications

- Extract short identifiers from URLs or long strings rather than using the whole thing

- For large binary values, consider using a hash digest as the key instead of the value itself

- Use consistent separators (colons are conventional)

Reference: [https://redis.io/docs/latest/develop/use/keyspace/](https://redis.io/docs/latest/develop/use/keyspace/)

---

## 2. Memory & Expiration

**Impact: HIGH**

Memory limits, eviction policies, TTL strategies, and memory optimization techniques.

### 2.1 Configure Memory Limits and Eviction Policies

**Impact: HIGH (Prevents out-of-memory crashes and unpredictable behavior)**

Always configure `maxmemory` and an eviction policy to prevent Redis from consuming all available memory.

**Correct: Set explicit memory limits.**

```python
maxmemory 2gb
maxmemory-policy allkeys-lru
```

| Policy | Use Case |

|--------|----------|

| `volatile-lru` | Evict keys with TTL, least recently used first |

| `allkeys-lru` | Evict any key, least recently used first |

| `volatile-ttl` | Evict keys closest to expiration |

| `noeviction` | Return errors when memory is full (use for critical data) |

**Incorrect: Running Redis without memory limits.**

```python
# No maxmemory set - Redis will use all available RAM
# Can cause OOM killer to terminate Redis or other processes
```

**Memory optimization tips:**

- Use Hashes for small objects (more memory-efficient than separate keys)

- Use `OBJECT ENCODING key` to check how Redis stores your data

- Use `MEMORY USAGE key` to check individual key memory consumption

- Enable compression in your client for large values

Reference: [https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/)

### 2.2 Set TTL on Cache Keys

**Impact: HIGH (Prevents unbounded memory growth)**

Always set expiration times on cache keys to prevent unbounded memory growth.

**Correct: Set TTL at write time.**

```python
# Good: TTL set atomically with the value
redis.setex("cache:user:1001", 3600, user_json)

# Good: For hashes, set TTL after
redis.hset("session:abc", mapping=session_data)
redis.expire("session:abc", 1800)
```

**Incorrect: Forgetting TTL on cache keys.**

```python
# Risk: This key may live forever
redis.set("cache:user:1001", user_json)
```

**TTL strategies:**

- Cache data: 1-24 hours depending on freshness requirements

- Sessions: 30 minutes to 24 hours

- Rate limiting: Seconds to minutes

- Temporary locks: Seconds with automatic release

Reference: [https://redis.io/commands/expire/](https://redis.io/commands/expire/)

---

## 3. Connection & Performance

**Impact: HIGH**

Connection pooling, pipelining, timeouts, and avoiding blocking commands.

### 3.1 Avoid Slow Commands in Production

**Impact: HIGH (Prevents Redis from becoming unresponsive)**

Some Redis commands are slow because they scan large datasets. Use incremental alternatives to avoid blocking the server.

| Avoid | Use Instead |

|-------|-------------|

| `KEYS *` | `SCAN` with cursor |

| `SMEMBERS` on large sets | `SSCAN` |

| `HGETALL` on large hashes | `HSCAN` |

| `LRANGE 0 -1` on large lists | Paginate with `LRANGE 0 100` |

**Correct: Use SCAN for iteration.**

```python
# Good: Non-blocking iteration
cursor = 0
while True:
    cursor, keys = redis.scan(cursor, match="user:*", count=100)
    for key in keys:
        process(key)
    if cursor == 0:
        break
```

**Incorrect: Using KEYS in production.**

```python
# Bad: Scans all keys, slow on large datasets
keys = redis.keys("user:*")
```

**Note: Truly blocking commands (like `BLPOP`, `BRPOP`, `BLMOVE`) that wait indefinitely for data are appropriate for some use cases like job queues, but should be used with timeouts.**

```python
# Blocking pop with timeout - appropriate for queue consumers
result = redis.blpop("task_queue", timeout=5)
```

Reference: [https://redis.io/docs/latest/commands/scan/](https://redis.io/docs/latest/commands/scan/)

### 3.2 Configure Connection Timeouts

**Impact: MEDIUM (Improves connection resilience and failure recovery)**

Configure appropriate timeout values to improve your application's connection resilience. While most Redis clients set default timeouts, choosing well-tuned values based on your application's usage patterns leads to better failure recovery.

**Correct: Set timeouts based on your application needs.**

```python
r = redis.Redis(
    host='localhost',
    socket_timeout=5.0,         # Read/write timeout - tune based on expected operation time
    socket_connect_timeout=2.0,  # Connection timeout - shorter for fast failure detection
    retry_on_timeout=True        # Automatic retry on timeout
)
```

**Incorrect: Relying solely on defaults without considering your use case.**

```python
# Not ideal: Default timeouts may not match your application's needs
r = redis.Redis(host='localhost')

# For example, if your app needs fast failure detection,
# the default timeouts might be too generous
```

**Considerations:**

- Set `socket_connect_timeout` shorter than `socket_timeout` for quick connection failure detection

- For latency-sensitive apps, use tighter timeouts with retry logic

- For batch operations, allow longer timeouts to complete large operations

- Consider using health checks alongside timeouts for robust failure handling

Reference: [https://redis.io/docs/latest/develop/clients/](https://redis.io/docs/latest/develop/clients/)

### 3.3 Use Connection Pooling or Multiplexing

**Impact: HIGH (Reduces connection overhead by 10x or more)**

Reuse connections via a pool or multiplexing instead of creating new connections per request.

**Correct: Use a connection pool (redis-py, Jedis, go-redis).**

```python
import redis

# Good: Connection pool - reuses existing connections
pool = redis.ConnectionPool(host='localhost', port=6379, max_connections=50)
r = redis.Redis(connection_pool=pool)
```

**Correct: Use multiplexing (Lettuce, NRedisStack).**

```java
// Lettuce uses multiplexing by default - single connection handles all traffic
RedisClient client = RedisClient.create("redis://localhost:6379");
StatefulRedisConnection<String, String> connection = client.connect();

// All commands share the single connection efficiently
connection.sync().set("key", "value");
```

**Incorrect: Creating new connections per request.**

```python
# Bad: New connection every time
def get_user(user_id):
    r = redis.Redis(host='localhost', port=6379)  # Don't do this
    return r.get(f"user:{user_id}")
```

**Pooling vs Multiplexing:**

- **Pooling**: Multiple connections shared across requests (redis-py, Jedis, go-redis)

- **Multiplexing**: Single connection handles all traffic (NRedisStack, Lettuce)

- Multiplexing cannot support blocking commands (BLPOP, etc.) as they would stall all callers

Reference: [https://redis.io/docs/latest/develop/clients/pools-and-muxing/](https://redis.io/docs/latest/develop/clients/pools-and-muxing/)

### 3.4 Use Pipelining for Bulk Operations

**Impact: HIGH (Reduces round trips, 5-10x faster for batch operations)**

Batch multiple commands into a single round trip to reduce network latency.

**Correct: Use pipeline for multiple commands.**

```python
# Good: Single round trip for multiple commands
pipe = redis.pipeline()
for user_id in user_ids:
    pipe.get(f"user:{user_id}")
results = pipe.execute()
```

**Incorrect: Sequential commands in a loop.**

```python
# Bad: N round trips
results = []
for user_id in user_ids:
    results.append(redis.get(f"user:{user_id}"))
```

Reference: [https://redis.io/docs/latest/develop/use/pipelining/](https://redis.io/docs/latest/develop/use/pipelining/)

---

## 4. JSON Documents

**Impact: MEDIUM**

Using Redis JSON for nested structures, partial updates, and integration with RQE.

### 4.1 Choose JSON vs Hash Appropriately

**Impact: MEDIUM (Optimal data model for your use case)**

Redis JSON and Hash serve different purposes. Choose based on your data structure and query needs.

| Feature | JSON | Hash |

|---------|------|------|

| **Structure** | Nested objects and arrays | Flat key-value pairs |

| **Path queries** | Yes (`$.preferences.theme`) | No (top-level fields only) |

| **Geospatial indexing** | Yes (with Redis Query Engine) | No |

| **Memory efficiency** | Higher overhead | More efficient |

| **Field-level expiration** | No | Yes (HEXPIRE) |

| **RQE indexing** | Yes | Yes |

**Correct: Use JSON for nested structures and path queries.**

```python
# JSON supports nested structures and deep updates
redis.json().set("user:1001", "$", {
    "name": "Alice",
    "address": {
        "city": "NYC",
        "location": {"lat": 40.7128, "lng": -74.0060}
    }
})

# Update nested field directly
redis.json().set("user:1001", "$.address.city", "Boston")
```

**Correct: Use Hash for flat objects or when you need field-level expiration.**

```python
# Hash is simpler and more memory-efficient for flat data
redis.hset("session:abc", mapping={
    "user_id": "1001",
    "created_at": "2024-01-01",
    "ip": "192.168.1.1"
})

# Field-level expiration (Redis 7.4+)
redis.hexpire("session:abc", 3600, "ip")  # Expire IP field in 1 hour
```

Reference: [https://redis.io/docs/latest/develop/data-types/compare-data-types/#documents](https://redis.io/docs/latest/develop/data-types/compare-data-types/#documents)

### 4.2 Use JSON Paths for Partial Updates

**Impact: MEDIUM (Avoids fetching and rewriting entire documents)**

Use JSON path syntax to update specific fields without fetching the entire document.

**Correct: Use JSON paths for targeted updates.**

```python
# Store JSON document
redis.json().set("user:1001", "$", {
    "name": "Alice",
    "email": "alice@example.com",
    "preferences": {"theme": "dark", "notifications": True}
})

# Update nested field without fetching entire document
redis.json().set("user:1001", "$.preferences.theme", "light")

# Get specific field
theme = redis.json().get("user:1001", "$.preferences.theme")

# Increment numeric field atomically
redis.json().numincrby("user:1001", "$.preferences.volume", 5)

# Append to array
redis.json().arrappend("user:1001", "$.tags", "premium")
```

**Incorrect: Storing JSON as a string and parsing client-side.**

```python
# Bad: Loses queryability and atomic updates
redis.set("user:1001", json.dumps(user_data))

# Must fetch, parse, modify, serialize, and rewrite
data = json.loads(redis.get("user:1001"))
data["preferences"]["theme"] = "light"
redis.set("user:1001", json.dumps(data))
```

Reference: [https://redis.io/docs/latest/develop/data-types/json/path/](https://redis.io/docs/latest/develop/data-types/json/path/)

---

## 5. Redis Query Engine

**Impact: HIGH**

FT.CREATE, FT.SEARCH, FT.AGGREGATE, index design, field types, and query optimization.

### 5.1 Choose the Correct Field Type

**Impact: HIGH (Use TAG instead of TEXT for filtering to improve query speed 10x)**

Each field type has different capabilities and performance characteristics.

| Field Type | Use When | Notes |

|------------|----------|-------|

| TEXT | Full-text search needed | Tokenized, stemmed |

| TAG | Exact match, filtering | Faster than TEXT for filtering |

| NUMERIC | Range queries, sorting | Use for prices, counts, timestamps |

| GEO | Point location queries | Lat/long coordinates (single points) |

| GEOSHAPE | Area/region queries | Polygons, circles, rectangles |

| VECTOR | Similarity search | HNSW or FLAT algorithm |

**Correct: Use TAG for exact matching.**

```python
# Good: TAG for exact category matching
FT.CREATE idx:products ON HASH PREFIX 1 product:
    SCHEMA
        category TAG SORTABLE
        status TAG
```

**Incorrect: Using TEXT when you don't need full-text features.**

```python
# Overkill: TEXT for category adds unnecessary tokenization
FT.CREATE idx:products ON HASH PREFIX 1 product:
    SCHEMA
        category TEXT
        status TEXT
```

**Correct: Use GEO for points, GEOSHAPE for areas.**

```python
# GEO for point locations (stores, users)
FT.CREATE idx:stores ON HASH PREFIX 1 store:
    SCHEMA
        location GEO

# GEOSHAPE for areas (delivery zones, boundaries)
FT.CREATE idx:zones ON JSON PREFIX 1 zone:
    SCHEMA
        $.boundary AS boundary GEOSHAPE
```

Reference: [https://redis.io/docs/latest/develop/interact/search-and-query/indexing/geoindex/](https://redis.io/docs/latest/develop/interact/search-and-query/indexing/geoindex/)

### 5.2 Index Only Fields You Query

**Impact: HIGH (Reduces index size and improves write performance)**

Create indexes with only the fields you need to search, filter, or sort on.

**Correct: Index specific fields.**

```python
FT.CREATE idx:products ON HASH PREFIX 1 product:
    SCHEMA
        name TEXT WEIGHT 2.0
        description TEXT
        category TAG SORTABLE
        price NUMERIC SORTABLE
        location GEO
```

**Incorrect: Over-indexing or indexing unused fields.**

```python
# Bad: Indexing every field "just in case"
FT.CREATE idx:products ON HASH PREFIX 1 product:
    SCHEMA
        name TEXT
        description TEXT
        category TEXT
        subcategory TEXT
        brand TEXT
        sku TEXT
        price NUMERIC
        cost NUMERIC
        margin NUMERIC
        ...
```

**Tips:**

- Start with the minimum required fields

- Add fields as query patterns emerge

- Use `FT.INFO` to monitor index size

Reference: [https://redis.io/docs/latest/develop/interact/search-and-query/indexing/](https://redis.io/docs/latest/develop/interact/search-and-query/indexing/)

### 5.3 Manage Indexes for Zero-Downtime Updates

**Impact: MEDIUM (Use aliases for seamless index updates)**

Use aliases to swap indexes without application changes.

**Correct: Use aliases for production indexes.**

```python
# Create versioned index
FT.CREATE idx:products_v2 ON HASH PREFIX 1 product:
    SCHEMA
        name TEXT
        category TAG SORTABLE
        price NUMERIC SORTABLE

# Point alias to new index
FT.ALIASADD products idx:products_v2

# Application queries use alias
FT.SEARCH products "@category:{electronics}"

# Later, swap to new version
FT.ALIASUPDATE products idx:products_v3
```

**Useful management commands:**

```python
# Check index info
FT.INFO idx:products

# Drop and recreate (non-blocking)
FT.DROPINDEX idx:products
FT.CREATE idx:products ...

# List all indexes
FT._LIST
```

Reference: [https://redis.io/docs/latest/develop/interact/search-and-query/administration/](https://redis.io/docs/latest/develop/interact/search-and-query/administration/)

### 5.4 Use DIALECT 2 for Query Syntax

**Impact: MEDIUM (Ensures consistent query behavior and access to modern features)**

Use DIALECT 2 for consistent query behavior. Many Redis client libraries now default to DIALECT 2, and other dialects (1, 3, 4) are deprecated as of Redis 8.

**Correct: Use DIALECT 2 explicitly or rely on modern client defaults.**

```python
# In raw commands, specify DIALECT 2
FT.SEARCH idx:products "@name:laptop" DIALECT 2

FT.AGGREGATE idx:products "@category:{electronics}"
    GROUPBY 1 @category
    REDUCE COUNT 0 AS count
    DIALECT 2
```

**Note: DIALECT 2 is required for vector search queries. Most modern client libraries (redis-py 6.0+, go-redis, Lettuce) now use DIALECT 2 by default.**

**Why DIALECT 2:**

- Consistent handling of special characters

- Better NULL value handling

- More predictable query parsing

- Required for vector search

Reference: [https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/dialects/](https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/dialects/)

### 5.5 Write Efficient Queries

**Impact: HIGH (Proper filtering reduces query time by orders of magnitude)**

Be specific and use filters to reduce the result set early.

**Correct: Use specific filters and limit results.**

```python
# Good: Specific query with filters
FT.SEARCH idx:products "@category:{electronics} @price:[100 500]"
    LIMIT 0 20
    RETURN 3 name price category

# Good: Use SORTBY and LIMIT
FT.SEARCH idx:products "@name:laptop"
    SORTBY price ASC
    LIMIT 0 10
```

**Incorrect: Broad queries returning large result sets.**

```python
# Bad: Wildcard prefix scans entire index
FT.SEARCH idx:products "*" LIMIT 0 10000

# Bad: Loading all fields from source document
FT.AGGREGATE idx:products "*" LOAD *
```

**Performance tips:**

```python
FT.PROFILE idx:products SEARCH QUERY "@category:{electronics}"
```

- Add `SORTABLE` to fields used in `SORTBY`

- Use `TAG SORTABLE UNF` for best performance on tag fields

- Use `NOSTEM` if you don't need stemming

- Profile queries with `FT.PROFILE`

Reference: [https://redis.io/docs/latest/develop/interact/search-and-query/query/](https://redis.io/docs/latest/develop/interact/search-and-query/query/)

---

## 6. Vector Search & RedisVL

**Impact: HIGH**

Vector indexes, HNSW vs FLAT, hybrid search, and RAG patterns with RedisVL.

### 6.1 Choose HNSW vs FLAT Based on Requirements

**Impact: HIGH (HNSW trades accuracy for speed, FLAT provides exact results)**

Select the right algorithm based on your accuracy requirements and dataset size.

| Algorithm | Speed | Accuracy | Memory | Best For |

|-----------|-------|----------|--------|----------|

| HNSW | Fast (approximate) | ~95%+ recall tunable | Higher | Large datasets (>10k vectors) |

| FLAT | Slower (exact) | 100% (exact) | Lower | Small datasets, accuracy-critical |

**Correct: Use HNSW for large-scale production workloads.**

```python
from redisvl.schema import IndexSchema

# HNSW - fast approximate search, tunable accuracy
schema = IndexSchema.from_dict({
    "index": {"name": "idx:docs", "prefix": "doc:"},
    "fields": [
        {"name": "embedding", "type": "vector", "attrs": {
            "dims": 1536,
            "algorithm": "HNSW",
            "distance_metric": "COSINE",
            "M": 16,                  # Higher = more accurate, more memory
            "EF_CONSTRUCTION": 200    # Higher = better index quality, slower build
        }}
    ]
})
```

**Correct: Use FLAT when exact results are required.**

```python
# FLAT - exact brute-force search, guaranteed accuracy
schema = IndexSchema.from_dict({
    "index": {"name": "idx:small", "prefix": "small:"},
    "fields": [
        {"name": "embedding", "type": "vector", "attrs": {
            "dims": 1536,
            "algorithm": "FLAT",
            "distance_metric": "COSINE"
        }}
    ]
})
```

**Tuning HNSW accuracy vs speed:**

- `M`: Connections per node (16-64). Higher = better recall, more memory

- `EF_CONSTRUCTION`: Build-time parameter (100-500). Higher = better graph quality

- `EF_RUNTIME`: Query-time parameter. Higher = better recall, slower queries

Reference: [https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/vectors/](https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/vectors/)

### 6.2 Configure Vector Indexes Properly

**Impact: HIGH (Correct configuration is essential for vector search accuracy)**

Set the correct dimensions, algorithm, and distance metric for your embeddings. Vector indexes can be created via CLI, Redis Insight, or any client library.

**Correct: Create index via Redis CLI or Insight.**

```python
FT.CREATE idx:docs ON HASH PREFIX 1 doc:
    SCHEMA
        content TEXT
        embedding VECTOR HNSW 6
            TYPE FLOAT32
            DIM 1536
            DISTANCE_METRIC COSINE
```

**Correct: Create index via Python (redis-py).**

```python
from redis import Redis
from redis.commands.search.field import TextField, VectorField

r = Redis()

# Define schema with vector field
schema = [
    TextField("content"),
    VectorField(
        "embedding",
        algorithm="HNSW",
        attributes={
            "TYPE": "FLOAT32",
            "DIM": 1536,  # Must match your embedding model
            "DISTANCE_METRIC": "COSINE"
        }
    )
]

r.ft("idx:docs").create_index(schema, definition=IndexDefinition(prefix=["doc:"]))
```

**Correct: Create index via RedisVL.**

```python
from redisvl.index import SearchIndex
from redisvl.schema import IndexSchema

schema = IndexSchema.from_dict({
    "index": {"name": "idx:docs", "prefix": "doc:"},
    "fields": [
        {"name": "content", "type": "text"},
        {"name": "embedding", "type": "vector", "attrs": {
            "dims": 1536,
            "algorithm": "HNSW",
            "distance_metric": "COSINE"
        }}
    ]
})

index = SearchIndex(schema)
index.create(overwrite=True)
```

**Incorrect: Mismatched dimensions or wrong distance metric.**

```python
# Bad: Wrong dimensions for your model
{"dims": 768}  # But using OpenAI which outputs 1536

# Bad: Wrong metric for normalized embeddings
{"distance_metric": "L2"}  # When embeddings are normalized for COSINE
```

Reference: [https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/vectors/](https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/vectors/)

### 6.3 Implement RAG Pattern Correctly

**Impact: HIGH (Proper RAG implementation improves LLM response quality)**

Store documents with embeddings, retrieve relevant context, and pass to LLM.

**Correct: Full RAG pipeline with RedisVL.**

```python
from redisvl.index import SearchIndex
from redisvl.query import VectorQuery

# 1. Store documents with embeddings
for doc in documents:
    embedding = embed_model.encode(doc["content"])
    index.load([{
        "content": doc["content"],
        "embedding": embedding.tolist(),
        "source": doc["source"]
    }])

# 2. Query with vector similarity
query_embedding = embed_model.encode(user_question)
results = index.search(VectorQuery(
    vector=query_embedding,
    vector_field_name="embedding",
    return_fields=["content", "source"],
    num_results=5
))

# 3. Pass context to LLM
context = "\n".join([r["content"] for r in results])
response = llm.generate(f"Context: {context}\n\nQuestion: {user_question}")
```

**Best practices:**

- Normalize vectors if using COSINE distance

- Batch inserts using `index.load()` with lists

- Set appropriate M and EF_CONSTRUCTION for HNSW based on dataset size

- Use filters to reduce the search space before vector comparison

- Consider chunking long documents for better retrieval

Reference: [https://redis.io/docs/latest/develop/get-started/rag/](https://redis.io/docs/latest/develop/get-started/rag/)

### 6.4 Use Hybrid Search for Better Results

**Impact: MEDIUM (Combining vector + filters improves relevance and reduces search space)**

Combine vector similarity with attribute filtering for more relevant results.

**Correct: Apply filters to reduce search space.**

```python
from redisvl.query import VectorQuery

query = VectorQuery(
    vector=query_embedding,
    vector_field_name="embedding",
    return_fields=["content", "category", "date"],
    num_results=10,
    filter_expression="@category:{technology} @date:[2024 2025]"
)

results = index.search(query)
```

**Incorrect: Searching entire vector space when filters apply.**

```python
# Bad: No filter - searches all vectors then filters client-side
results = index.search(VectorQuery(
    vector=query_embedding,
    vector_field_name="embedding",
    num_results=1000
))
# Client-side filtering - wasteful
filtered = [r for r in results if r["category"] == "technology"]
```

**Tips:**

- Use TAG fields for category filters

- Use NUMERIC fields for date/price ranges

- Filters are applied before vector search, reducing computation

Reference: [https://redis.io/docs/latest/develop/interact/search-and-query/query/combined/](https://redis.io/docs/latest/develop/interact/search-and-query/query/combined/)

---

## 7. Semantic Caching

**Impact: MEDIUM**

LangCache for LLM response caching, distance thresholds, and cache strategies.

### 7.1 Configure Semantic Cache Properly

**Impact: MEDIUM (Correct threshold tuning balances hit rate vs accuracy)**

> **Note:** LangCache is currently in preview on Redis Cloud. Features and behavior may change.

Tune similarity threshold and cache separation for optimal LangCache results.

**Correct: Tune similarity threshold for your use case.**

```python
from langcache import LangCache

lang_cache = LangCache(
    server_url=f"https://{os.getenv('HOST')}",
    cache_id=os.getenv("CACHE_ID"),
    api_key=os.getenv("API_KEY")
)

# Stricter matching - fewer false positives (0.95 = very similar)
result = lang_cache.search(
    prompt="What is Redis?",
    similarity_threshold=0.95
)

# Looser matching - higher hit rate (0.8 = somewhat similar)
result = lang_cache.search(
    prompt="What is Redis?",
    similarity_threshold=0.8
)
```

**Correct: Use separate caches for different use cases.**

```python
# Create different cache IDs in Redis Cloud for different LLM tasks
support_cache = LangCache(
    server_url=server_url,
    cache_id="support-cache-id",
    api_key=api_key
)

code_cache = LangCache(
    server_url=server_url,
    cache_id="code-cache-id",
    api_key=api_key
)
```

**Incorrect: Using a single cache for all LLM tasks.**

```python
# All tasks share one cache - responses may not be relevant
result = lang_cache.search(prompt="How do I reset my password?")
# Could return a code snippet if someone asked a similar coding question
```

**Best practices:**

- Start with threshold 0.9, adjust based on your use case

- Use custom attributes to filter results within a single cache

- Monitor cache hit rates to evaluate effectiveness

- Use separate cache IDs for fundamentally different LLM tasks

Reference: [https://redis.io/docs/latest/develop/ai/langcache/](https://redis.io/docs/latest/develop/ai/langcache/)

### 7.2 Use LangCache for LLM Response Caching

**Impact: HIGH (Reduces LLM API costs by 50-90% for similar queries)**

> **Note:** LangCache is currently in preview on Redis Cloud. Features and behavior may change.

LangCache is a fully-managed semantic caching service on Redis Cloud that reduces LLM costs and latency.

**How it works:**

1. Your app sends a prompt to LangCache via `POST /v1/caches/{cacheId}/entries/search`

2. LangCache generates an embedding and searches for similar cached responses

3. If found (cache hit), returns the cached response instantly

4. If not found (cache miss), your app calls the LLM and stores the response

**Correct: Use the LangCache Python SDK.**

```python
from langcache import LangCache
import os

lang_cache = LangCache(
    server_url=f"https://{os.getenv('HOST')}",
    cache_id=os.getenv("CACHE_ID"),
    api_key=os.getenv("API_KEY")
)

# Search for cached response
result = lang_cache.search(
    prompt="What is Redis?",
    similarity_threshold=0.9
)

if result:
    response = result[0]["response"]
else:
    response = llm.generate("What is Redis?")
    # Store for future queries
    lang_cache.set(
        prompt="What is Redis?",
        response=response
    )
```

**LangCache REST API:**

```bash
# Search cache
curl -X POST "https://$HOST/v1/caches/$CACHE_ID/entries/search" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is Redis?"}'

# Store a response
curl -X POST "https://$HOST/v1/caches/$CACHE_ID/entries" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is Redis?", "response": "Redis is an in-memory database..."}'
```

**With custom attributes for filtering:**

```python
# Store with attributes
lang_cache.set(
    prompt="What is Redis?",
    response="Redis is an in-memory database...",
    attributes={"category": "database", "version": "v1"}
)

# Search with attribute filter
result = lang_cache.search(
    prompt="Tell me about Redis",
    attributes={"category": "database"},
    similarity_threshold=0.9
)
```

Reference: [https://redis.io/docs/latest/develop/ai/langcache/](https://redis.io/docs/latest/develop/ai/langcache/)

---

## 8. Streams & Pub/Sub

**Impact: MEDIUM**

Choosing between Streams and Pub/Sub for messaging patterns.

### 8.1 Choose Streams vs Pub/Sub Appropriately

**Impact: MEDIUM (Wrong choice leads to lost messages or unnecessary complexity)**

Redis supports two messaging approaches for different use cases.

**Incorrect: Using Pub/Sub when messages must not be lost.**

```python
# Pub/Sub - messages lost if no subscribers connected
r.publish("orders", json.dumps(order))  # Fire and forget!
```

**Correct: Use Streams when message durability matters.**

```python
# Streams - messages persist and can be replayed
r.xadd("orders:stream", {"order": json.dumps(order)})

# Consumer group for reliable processing
r.xreadgroup("workers", "worker-1", {"orders:stream": ">"}, count=10)
r.xack("orders:stream", "workers", message_id)
```

| Requirement | Use |

|-------------|-----|

| Real-time notifications, OK to miss messages | Pub/Sub |

| Messages must not be lost | Streams |

| Need to replay/reprocess messages | Streams |

| Multiple workers processing same queue | Streams (consumer groups) |

| Simple broadcast to connected clients | Pub/Sub |

| Event sourcing or audit trail | Streams |

Reference: [https://redis.io/docs/latest/develop/data-types/streams/](https://redis.io/docs/latest/develop/data-types/streams/)

---

## 9. Clustering & Replication

**Impact: MEDIUM**

Hash tags for key colocation, read replicas, and cluster-aware patterns.

### 9.1 Use Hash Tags for Multi-Key Operations

**Impact: HIGH (Enables multi-key operations in Redis Cluster)**

In Redis Cluster, keys are distributed across slots based on their hash. Use hash tags to ensure keys that must be used together in [multi-key operations](https://redis.io/docs/latest/operate/rs/databases/durability-ha/clustering/#multikey-operations) are on the same slot.

**Correct: Use hash tags for keys used in multi-key operations.**

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

**Incorrect: Keys without hash tags that need multi-key operations.**

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

Reference: [https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/#hash-tags](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/#hash-tags)

### 9.2 Use Read Replicas for Read-Heavy Workloads

**Impact: MEDIUM (Scales read throughput without adding primary nodes)**

For read-heavy workloads, distribute reads across replicas to reduce load on primaries.

**Correct: Configure replica reads in Redis Cluster.**

```python
from redis.cluster import RedisCluster

rc = RedisCluster(
    host='localhost',
    port=6379,
    read_from_replicas=True  # Distribute reads to replicas
)

# Writes go to primary
rc.set("key", "value")

# Reads can be served by replicas (eventually consistent)
value = rc.get("key")
```

**Correct: Use replica reads in standalone replication setup.**

```python
from redis import Redis

# Connect to primary for writes
primary = Redis(host='primary-host', port=6379)

# Connect to replica for reads
replica = Redis(host='replica-host', port=6379)

# Write to primary
primary.set("key", "value")

# Read from replica (eventually consistent)
value = replica.get("key")
```

**Considerations:**

- Replica reads are eventually consistent

- Don't read from replicas for data that was just written

- Use for read-heavy, slightly-stale-OK workloads (caches, analytics, dashboards)

Reference: [https://redis.io/docs/latest/operate/oss_and_stack/management/replication/](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/)

---

## 10. Security

**Impact: HIGH**

Authentication, ACLs, TLS, and network security.

### 10.1 Always Use Authentication in Production

**Impact: HIGH (Prevents unauthorized access to your data)**

Never run Redis without authentication in production environments.

**Correct: Use password and TLS.**

```python
r = redis.Redis(
    host='localhost',
    port=6379,
    password='your-strong-password',
    ssl=True,
    ssl_cert_reqs='required'
)
```

**Incorrect: Connecting without authentication.**

```python
# Bad: No authentication
r = redis.Redis(host='localhost', port=6379)
```

**Configuration:**

```python
# redis.conf
requirepass your-strong-password
tls-port 6380
tls-cert-file /path/to/redis.crt
tls-key-file /path/to/redis.key
```

Reference: [https://redis.io/docs/latest/operate/oss_and_stack/management/security/](https://redis.io/docs/latest/operate/oss_and_stack/management/security/)

### 10.2 Secure Network Access

**Impact: HIGH (Reduces attack surface and prevents unauthorized access)**

Restrict network access to Redis to only trusted sources.

**Correct: Bind to specific interfaces.**

```python
# redis.conf
bind 127.0.0.1 192.168.1.100
protected-mode yes
```

**Correct: Use firewall rules.**

```bash
# Allow only application servers
iptables -A INPUT -p tcp --dport 6379 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 6379 -j DROP
```

**Incorrect: Exposing Redis to the internet.**

```python
# Bad: Binds to all interfaces
bind 0.0.0.0
protected-mode no
```

**Security checklist:**

```python
# Disable dangerous commands
rename-command FLUSHALL ""
rename-command DEBUG ""
rename-command CONFIG ""
```

- Use TLS for connections

- Bind to specific interfaces, not `0.0.0.0`

- Use firewall rules to restrict access

- Disable dangerous commands in production

Reference: [https://redis.io/docs/latest/operate/oss_and_stack/management/security/](https://redis.io/docs/latest/operate/oss_and_stack/management/security/)

### 10.3 Use ACLs for Fine-Grained Access Control

**Impact: HIGH (Limits blast radius if credentials are compromised)**

Create users with only the permissions they need (principle of least privilege).

**Correct: Create specific users with limited permissions.**

```python
# Read-only user for cache access
ACL SETUSER app_readonly on >password ~cache:* +get +mget +scan

# Writer that can't run dangerous commands
ACL SETUSER app_writer on >password ~* +@all -@dangerous

# Admin user (use sparingly)
ACL SETUSER admin on >strong-password ~* +@all
```

**Incorrect: Using the default user for everything.**

```python
# Bad: Single password for all access
requirepass shared-password
```

**ACL categories:**

- `@read` - Read commands

- `@write` - Write commands

- `@dangerous` - Commands like FLUSHALL, DEBUG

- `@admin` - Administrative commands

Reference: [https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/](https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/)

---

## 11. Observability

**Impact: MEDIUM**

SLOWLOG, INFO, MEMORY commands, monitoring metrics, and Redis Insight.

### 11.1 Monitor Key Redis Metrics

**Impact: MEDIUM (Early detection of performance and capacity issues)**

Track these metrics to catch issues before they impact users.

| Metric | What It Tells You | Alert When |

|--------|-------------------|------------|

| `used_memory` | Current memory usage | > 80% of maxmemory |

| `connected_clients` | Number of connections | Sudden spikes or drops |

| `blocked_clients` | Clients waiting on blocking ops | > 0 sustained |

| `instantaneous_ops_per_sec` | Current throughput | Significant drops |

| `keyspace_hits/misses` | Cache hit ratio | Hit ratio < 80% |

| `rejected_connections` | Connection limit issues | > 0 |

| `rdb_last_save_time` | Last persistence snapshot | Too old |

**Correct: Export metrics to your monitoring system.**

```python
# Get key metrics
info = redis.info()
print(f"Memory: {info['used_memory_human']}")
print(f"Connections: {info['connected_clients']}")
print(f"Ops/sec: {info['instantaneous_ops_per_sec']}")
print(f"Hit ratio: {info['keyspace_hits'] / (info['keyspace_hits'] + info['keyspace_misses']) * 100:.1f}%")
```

**Redis Insight:**

Use Redis Insight for visual monitoring, query profiling, and debugging. It includes Redis Copilot for natural language queries.

Reference: [https://redis.io/insight/](https://redis.io/insight/)

### 11.2 Use Observability Commands for Debugging

**Impact: MEDIUM (Enables quick diagnosis of performance issues)**

Redis provides built-in commands for monitoring and debugging.

**Key commands:**

```python
# Slow query log - find slow commands
SLOWLOG GET 10
SLOWLOG LEN
SLOWLOG RESET

# Server info - comprehensive stats
INFO all
INFO memory
INFO stats
INFO replication
INFO clients

# Memory analysis
MEMORY DOCTOR
MEMORY STATS
MEMORY USAGE mykey

# Client connections
CLIENT LIST
CLIENT INFO

# Index info (RQE)
FT.INFO idx:products
FT.PROFILE idx:products SEARCH QUERY "@name:laptop"
```

**Correct: Check SLOWLOG regularly.**

```python
# Get recent slow queries
slow_queries = redis.slowlog_get(10)
for query in slow_queries:
    print(f"Duration: {query['duration']}μs, Command: {query['command']}")
```

Reference: [https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/)

---

## References

1. [https://redis.io/docs/](https://redis.io/docs/)
2. [https://redis.io/docs/latest/develop/interact/search-and-query/](https://redis.io/docs/latest/develop/interact/search-and-query/)
3. [https://redis.io/docs/latest/develop/clients/redisvl/](https://redis.io/docs/latest/develop/clients/redisvl/)
4. [https://redis.io/docs/latest/develop/ai/langcache/](https://redis.io/docs/latest/develop/ai/langcache/)
5. [https://redis.io/commands/](https://redis.io/commands/)
